import { useCallback, useEffect, useMemo, useState } from "react";
import { searchProperties } from "@/api/modules/propertyApi";
import { getAdminPropertyChangeRequests } from "@/api/modules/sellerPropertyApi";
import { searchAdminInvestors } from "@/api/modules/adminInvestorApi";
import { getAdminQueueItems, getAdminQueueSummary } from "@/api/modules/adminQueueApi";
import {
  ADMIN_QUEUE_REFRESH_CHANNEL,
  trackAdminEvent,
} from "@/features/admin/utils/adminTelemetry";

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

function toQueueItems({ submittedListings, openChangeRequests, pendingInvestors }) {
  const submitted = submittedListings.map((property) => ({
    key: `property-${property.id}`,
    type: "SUBMITTED_LISTING",
    entityId: property.id,
    title: formatPropertyTitle(property),
    subtitle: "Listing submitted by seller",
    createdAt: property?.submittedAt || property?.updatedAt || property?.createdAt || null,
    priority: 1,
    primaryAction: "Review listing",
    payload: property,
  }));

  const changeRequests = openChangeRequests.map((request) => ({
    key: `change-request-${request.id}`,
    type: "CHANGE_REQUEST",
    entityId: request.id,
    title: `Change request #${request.id}`,
    subtitle: `Property #${request.propertyId} • Seller #${request.sellerId}`,
    createdAt: request?.createdAt || request?.updatedAt || null,
    priority: 1,
    primaryAction: "Resolve request",
    payload: request,
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

  return [...submitted, ...changeRequests, ...investors].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return toDateMs(a.createdAt) - toDateMs(b.createdAt);
  });
}

function toSectionsFromQueueItems(items) {
  const sections = {
    submittedListings: [],
    openChangeRequests: [],
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
        sellerWorkflowStatus: "SUBMITTED",
        submittedAt: item.createdAt,
        updatedAt: item.createdAt,
        createdAt: item.createdAt,
      });
      return;
    }

    if (item.type === "CHANGE_REQUEST") {
      const propertyMatch = /Property #(\d+)/i.exec(item.subtitle ?? "");
      const sellerMatch = /Seller #(\d+)/i.exec(item.subtitle ?? "");

      sections.openChangeRequests.push({
        id: item.entityId,
        propertyId: propertyMatch ? Number(propertyMatch[1]) : null,
        sellerId: sellerMatch ? Number(sellerMatch[1]) : null,
        requestedChanges: item.details || item.subtitle || "",
        status: "OPEN",
        createdAt: item.createdAt,
        updatedAt: item.createdAt,
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
    openChangeRequests: 0,
    pendingInvestors: 0,
    failedInquiries: 0,
  });
  const [sections, setSections] = useState({
    submittedListings: [],
    openChangeRequests: [],
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

    async function loadQueue() {
      setLoading(true);
      setError("");
      setPartialErrors([]);
      trackAdminEvent("admin.queue.load.start", { includeItems });

      if (!includeItems) {
        try {
          const [summary, draftByStatusPage, draftByWorkflowPage] = await Promise.all([
            getAdminQueueSummary(),
            searchProperties(
              { status: "DRAFT" },
              { page: 0, size: 1, sort: "updatedAt,desc" },
            ),
            searchProperties(
              { sellerWorkflowStatus: "DRAFT" },
              { page: 0, size: 1, sort: "updatedAt,desc" },
            ),
          ]);
          if (!alive) return;

          const nextCounts = {
            draftProperties: Math.max(
              summary?.draftProperties ?? 0,
              draftByStatusPage?.totalElements ?? 0,
              draftByWorkflowPage?.totalElements ?? 0,
            ),
            submittedProperties: summary?.submittedProperties ?? 0,
            openChangeRequests: summary?.openChangeRequests ?? 0,
            pendingInvestors: summary?.pendingInvestors ?? 0,
            failedInquiries: summary?.failedInquiries ?? 0,
          };

          setCounts(nextCounts);
          setSections({
            submittedListings: [],
            openChangeRequests: [],
            pendingInvestors: [],
          });
          setLoading(false);
          trackAdminEvent("admin.queue.load.success", {
            includeItems,
            failures: 0,
            counts: nextCounts,
          });
          return;
        } catch {
          // fallback to the multi-call aggregator for counts if summary endpoint is unavailable
        }
      }

      if (includeItems) {
        try {
          const [summary, items, draftByStatusPage, draftByWorkflowPage] = await Promise.all([
            getAdminQueueSummary(),
            getAdminQueueItems({}, { page: 0, size: pageSize, sort: "createdAt,asc" }),
            searchProperties(
              { status: "DRAFT" },
              { page: 0, size: 1, sort: "updatedAt,desc" },
            ),
            searchProperties(
              { sellerWorkflowStatus: "DRAFT" },
              { page: 0, size: 1, sort: "updatedAt,desc" },
            ),
          ]);

          if (!alive) return;

          const nextCounts = {
            draftProperties: Math.max(
              summary?.draftProperties ?? 0,
              draftByStatusPage?.totalElements ?? 0,
              draftByWorkflowPage?.totalElements ?? 0,
            ),
            submittedProperties: summary?.submittedProperties ?? 0,
            openChangeRequests: summary?.openChangeRequests ?? 0,
            pendingInvestors: summary?.pendingInvestors ?? 0,
            failedInquiries: summary?.failedInquiries ?? 0,
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
        } catch {
          // fallback to multi-call aggregation when queue items endpoint is unavailable
        }
      }

      const [draftByStatusRes, draftByWorkflowRes, submittedRes, changeReqRes, pendingRes] = await Promise.allSettled([
        searchProperties(
          { status: "DRAFT" },
          { page: 0, size: 1, sort: "updatedAt,desc" },
        ),
        searchProperties(
          { sellerWorkflowStatus: "DRAFT" },
          { page: 0, size: 1, sort: "updatedAt,desc" },
        ),
        searchProperties(
          { sellerWorkflowStatus: "SUBMITTED" },
          { page: 0, size: includeItems ? pageSize : 1, sort: "submittedAt,asc" },
        ),
        getAdminPropertyChangeRequests(
          { status: "OPEN" },
          { page: 0, size: includeItems ? pageSize : 1, sort: "createdAt,asc" },
        ),
        searchAdminInvestors(
          { status: "PENDING" },
          { page: 0, size: includeItems ? pageSize : 1, sort: "createdAt,asc" },
        ),
      ]);

      if (!alive) return;

      const nextPartialErrors = [];

      const draftByStatusData = draftByStatusRes.status === "fulfilled" ? draftByStatusRes.value : null;
      const draftByWorkflowData = draftByWorkflowRes.status === "fulfilled" ? draftByWorkflowRes.value : null;
      const bothDraftCallsFailed = draftByStatusRes.status === "rejected" && draftByWorkflowRes.status === "rejected";
      if (bothDraftCallsFailed) {
        nextPartialErrors.push("Draft properties are temporarily unavailable.");
      }

      const submittedData = submittedRes.status === "fulfilled" ? submittedRes.value : null;
      if (submittedRes.status === "rejected") {
        nextPartialErrors.push("Submitted listings are temporarily unavailable.");
      }

      const changeReqData = changeReqRes.status === "fulfilled" ? changeReqRes.value : null;
      if (changeReqRes.status === "rejected") {
        nextPartialErrors.push("Open change requests are temporarily unavailable.");
      }

      const pendingData = pendingRes.status === "fulfilled" ? pendingRes.value : null;
      if (pendingRes.status === "rejected") {
        nextPartialErrors.push("Pending investors are temporarily unavailable.");
      }

      const nextCounts = {
        draftProperties: Math.max(
          draftByStatusData?.totalElements ?? 0,
          draftByWorkflowData?.totalElements ?? 0,
        ),
        submittedProperties: submittedData?.totalElements ?? 0,
        openChangeRequests: changeReqData?.totalElements ?? 0,
        pendingInvestors: pendingData?.totalElements ?? 0,
        failedInquiries: 0,
      };

      setCounts(nextCounts);

      setSections({
        submittedListings: includeItems ? submittedData?.content ?? [] : [],
        openChangeRequests: includeItems ? changeReqData?.content ?? [] : [],
        pendingInvestors: includeItems ? pendingData?.content ?? [] : [],
      });

      setPartialErrors(nextPartialErrors);

      const allFailed = nextPartialErrors.length === 4;
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
      if (!alive) return;
      setError("Unable to load admin queue right now.");
      setLoading(false);
      trackAdminEvent("admin.queue.load.error", { includeItems, failures: 5 });
    });

    return () => {
      alive = false;
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
