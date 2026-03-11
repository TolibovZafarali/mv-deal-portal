import { useCallback, useEffect, useMemo, useState } from "react";
import { searchProperties } from "@/api/modules/propertyApi";
import { searchAdminInvestors } from "@/api/modules/adminInvestorApi";
import { getAdminQueueItems, getAdminQueueSummary } from "@/api/modules/adminQueueApi";
import {
  ADMIN_QUEUE_REFRESH_CHANNEL,
  trackAdminEvent,
} from "@/features/admin/utils/adminTelemetry";
import {
  PROPERTY_STATUS,
  SELLER_WORKFLOW_STATUS,
} from "@/shared/constants/propertyWorkflow";

const DEFAULT_QUEUE_PAGE_SIZE = 8;

function toDateMs(value) {
  const parsed = new Date(value ?? "").getTime();
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

function formatPropertyTitle(property) {
  const line1 = [property?.street1, property?.street2].filter(Boolean).join(", ");
  const stateZip = [property?.state, property?.zip].filter(Boolean).join(" ");
  const line2 = [property?.city, stateZip].filter(Boolean).join(", ");
  const joined = [line1, line2].filter(Boolean).join(" ");
  if (joined) return joined;
  return `Property #${property?.id ?? "—"}`;
}

function formatInvestorName(investor) {
  const full = [investor?.firstName, investor?.lastName].filter(Boolean).join(" ").trim();
  return full || investor?.email || `Investor #${investor?.id ?? "—"}`;
}

function toQueueItems({ submittedListings, pendingInvestors }) {
  const submitted = submittedListings.map((property) => ({
    key: `property-${property.id}`,
    type: "SUBMITTED_LISTING",
    entityId: property.id,
    title: formatPropertyTitle(property),
    subtitle: "Listing under review",
    createdAt: property?.submittedAt || property?.updatedAt || property?.createdAt || null,
    priority: 1,
    primaryAction: "Review listing",
    payload: property,
  }));

  const investors = pendingInvestors.map((investor) => ({
    key: `investor-${investor.id}`,
    type: "PENDING_INVESTOR",
    entityId: investor.id,
    title: formatInvestorName(investor),
    subtitle: investor?.companyName || investor?.email || "Pending investor approval",
    createdAt: investor?.createdAt || investor?.updatedAt || null,
    priority: 2,
    primaryAction: "Review investor",
    payload: investor,
  }));

  return [...submitted, ...investors].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return toDateMs(a.createdAt) - toDateMs(b.createdAt);
  });
}

function toSectionsFromQueueItems(items) {
  const sections = {
    submittedListings: [],
    pendingInvestors: [],
  };

  items.forEach((item) => {
    if (!item) return;

    if (item.type === "SUBMITTED_LISTING") {
      sections.submittedListings.push({
        id: item.entityId,
        title: item.details || item.subtitle || item.title,
        street1: item.title,
        street2: null,
        city: "",
        state: "",
        zip: "",
        sellerWorkflowStatus: SELLER_WORKFLOW_STATUS.SUBMITTED,
        submittedAt: item.createdAt,
        updatedAt: item.createdAt,
        createdAt: item.createdAt,
      });
      return;
    }

    if (item.type === "PENDING_INVESTOR") {
      sections.pendingInvestors.push({
        id: item.entityId,
        firstName: item.title,
        lastName: "",
        companyName: item.subtitle || "",
        email: item.details || "",
        status: "PENDING",
        createdAt: item.createdAt,
        updatedAt: item.createdAt,
      });
    }
  });

  return sections;
}

export default function useAdminQueue({ includeItems = true, pageSize = DEFAULT_QUEUE_PAGE_SIZE } = {}) {
  const [counts, setCounts] = useState({
    draftProperties: 0,
    submittedProperties: 0,
    pendingInvestors: 0,
    failedInquiries: 0,
    unrepliedInquiries: 0,
  });
  const [sections, setSections] = useState({
    submittedListings: [],
    pendingInvestors: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [partialErrors, setPartialErrors] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    function onQueueRefresh() {
      setRefreshKey((prev) => prev + 1);
    }

    if (typeof window === "undefined") return undefined;
    window.addEventListener(ADMIN_QUEUE_REFRESH_CHANNEL, onQueueRefresh);
    return () => window.removeEventListener(ADMIN_QUEUE_REFRESH_CHANNEL, onQueueRefresh);
  }, []);

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    const requestConfig = { signal: controller.signal };

    async function loadQueue() {
      setLoading(true);
      setError("");
      setPartialErrors([]);
      trackAdminEvent("admin.queue.load.start", { includeItems });

      if (!includeItems) {
        try {
          const [summary, draftByStatusPage] = await Promise.all([
            getAdminQueueSummary(requestConfig),
            searchProperties(
              { status: PROPERTY_STATUS.DRAFT },
              { page: 0, size: 1, sort: "updatedAt,desc" },
              requestConfig,
            ),
          ]);
          if (!alive) return;

          const nextCounts = {
            draftProperties: Math.max(
              summary?.draftProperties ?? 0,
              draftByStatusPage?.totalElements ?? 0,
            ),
            submittedProperties: summary?.submittedProperties ?? 0,
            pendingInvestors: summary?.pendingInvestors ?? 0,
            failedInquiries: summary?.failedInquiries ?? 0,
            unrepliedInquiries: summary?.unrepliedInquiries ?? 0,
          };

          setCounts(nextCounts);
          setSections({
            submittedListings: [],
            pendingInvestors: [],
          });
          setLoading(false);
          trackAdminEvent("admin.queue.load.success", {
            includeItems,
            failures: 0,
            counts: nextCounts,
          });
          return;
        } catch (error) {
          if (error?.code === "ERR_CANCELED") {
            return;
          }
          // fallback to the multi-call aggregator for counts if summary endpoint is unavailable
        }
      }

      if (includeItems) {
        try {
          const [summary, items, draftByStatusPage] = await Promise.all([
            getAdminQueueSummary(requestConfig),
            getAdminQueueItems({}, { page: 0, size: pageSize, sort: "createdAt,asc" }, requestConfig),
            searchProperties(
              { status: PROPERTY_STATUS.DRAFT },
              { page: 0, size: 1, sort: "updatedAt,desc" },
              requestConfig,
            ),
          ]);

          if (!alive) return;

          const nextCounts = {
            draftProperties: Math.max(
              summary?.draftProperties ?? 0,
              draftByStatusPage?.totalElements ?? 0,
            ),
            submittedProperties: summary?.submittedProperties ?? 0,
            pendingInvestors: summary?.pendingInvestors ?? 0,
            failedInquiries: summary?.failedInquiries ?? 0,
            unrepliedInquiries: summary?.unrepliedInquiries ?? 0,
          };

          setCounts(nextCounts);
          setSections(toSectionsFromQueueItems(items?.content ?? []));
          setLoading(false);
          trackAdminEvent("admin.queue.load.success", {
            includeItems,
            failures: 0,
            counts: nextCounts,
            source: "queue-api",
          });
          return;
        } catch (error) {
          if (error?.code === "ERR_CANCELED") {
            return;
          }
          // fallback to multi-call aggregation when queue items endpoint is unavailable
        }
      }

      const [draftByStatusRes, submittedRes, pendingRes] = await Promise.allSettled([
        searchProperties(
          { status: PROPERTY_STATUS.DRAFT },
          { page: 0, size: 1, sort: "updatedAt,desc" },
          requestConfig,
        ),
        searchProperties(
          { sellerWorkflowStatus: SELLER_WORKFLOW_STATUS.SUBMITTED },
          { page: 0, size: includeItems ? pageSize : 1, sort: "submittedAt,asc" },
          requestConfig,
        ),
        searchAdminInvestors(
          { status: "PENDING" },
          { page: 0, size: includeItems ? pageSize : 1, sort: "createdAt,asc" },
          requestConfig,
        ),
      ]);

      if (!alive) return;

      const nextPartialErrors = [];

      const draftByStatusData = draftByStatusRes.status === "fulfilled" ? draftByStatusRes.value : null;
      if (draftByStatusRes.status === "rejected") {
        nextPartialErrors.push("Draft properties are temporarily unavailable.");
      }

      const submittedData = submittedRes.status === "fulfilled" ? submittedRes.value : null;
      if (submittedRes.status === "rejected") {
        nextPartialErrors.push("Under review listings are temporarily unavailable.");
      }

      const pendingData = pendingRes.status === "fulfilled" ? pendingRes.value : null;
      if (pendingRes.status === "rejected") {
        nextPartialErrors.push("Pending investors are temporarily unavailable.");
      }

      const nextCounts = {
        draftProperties: draftByStatusData?.totalElements ?? 0,
        submittedProperties: submittedData?.totalElements ?? 0,
        pendingInvestors: pendingData?.totalElements ?? 0,
        failedInquiries: 0,
        unrepliedInquiries: 0,
      };

      setCounts(nextCounts);
      setSections({
        submittedListings: includeItems ? submittedData?.content ?? [] : [],
        pendingInvestors: includeItems ? pendingData?.content ?? [] : [],
      });
      setPartialErrors(nextPartialErrors);

      const allFailed = nextPartialErrors.length === 3;
      if (allFailed) {
        setError("Unable to load admin queue right now.");
        trackAdminEvent("admin.queue.load.error", { includeItems, failures: nextPartialErrors.length });
      } else {
        trackAdminEvent("admin.queue.load.success", {
          includeItems,
          failures: nextPartialErrors.length,
          counts: nextCounts,
        });
      }

      setLoading(false);
    }

    loadQueue().catch(() => {
      if (controller.signal.aborted) return;
      if (!alive) return;
      setError("Unable to load admin queue right now.");
      setLoading(false);
      trackAdminEvent("admin.queue.load.error", { includeItems, failures: 3 });
    });

    return () => {
      alive = false;
      controller.abort();
    };
  }, [includeItems, pageSize, refreshKey]);

  const queueItems = useMemo(() => {
    if (!includeItems) return [];
    return toQueueItems(sections);
  }, [includeItems, sections]);

  return {
    counts,
    sections,
    queueItems,
    loading,
    error,
    partialErrors,
    refresh,
  };
}
