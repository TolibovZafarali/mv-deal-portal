import { useEffect, useMemo, useRef, useState } from "react";
import { getInquiries } from "@/api/modules/inquiryApi";
import {
  createAdminInquiryReply,
  getAdminInquiryReplies,
} from "@/api/modules/inquiryReplyApi";
import { getInvestorById } from "@/api/modules/investorApi";
import {
  createPropertyPhotoFromUrl,
  deleteProperty,
  deletePropertyPhotoUpload,
  getPropertyById,
  updateProperty,
  uploadPropertyPhoto,
} from "@/api/modules/propertyApi";
import { assignPropertySeller } from "@/api/modules/sellerPropertyApi";
import PropertyUpsertModal from "@/features/admin/modals/PropertyUpsertModal";
import { buildPropertyUpsertPayloadWithStatus } from "@/shared/utils/propertyUpsertMapping";
import { PROPERTY_STATUS } from "@/shared/constants/propertyWorkflow";
import "@/features/admin/pages/AdminInquiriesPage.css";

const LOAD_CAP = 500;

function cleanString(value) {
  return String(value ?? "").trim();
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function dateValue(value) {
  const date = parseDate(value);
  return date ? date.getTime() : 0;
}

function prettyDateTime(value) {
  const date = parseDate(value);
  if (!date) return "—";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function money(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "—";
  return numeric.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function propertyAddress(property) {
  if (!property) return "";
  const line1 = [property.street1, property.street2].filter(Boolean).join(", ");
  const stateZip = [property.state, property.zip].filter(Boolean).join(" ");
  return [line1, property.city, stateZip].filter(Boolean).join(", ");
}

function propertyLeadPhoto(property) {
  const photos = Array.isArray(property?.photos) ? property.photos : [];
  const first = photos.find((photo) => cleanString(photo?.thumbnailUrl) || cleanString(photo?.url));
  if (!first) return "";
  return cleanString(first.thumbnailUrl) || cleanString(first.url);
}

function investorNameFromModel(investor) {
  const full = [cleanString(investor?.firstName), cleanString(investor?.lastName)]
    .filter(Boolean)
    .join(" ")
    .trim();
  return full || cleanString(investor?.email) || "Unknown Investor";
}

export default function AdminInquiriesPage() {
  const [inquiries, setInquiries] = useState([]);
  const [replies, setReplies] = useState([]);
  const [investorMetaById, setInvestorMetaById] = useState({});
  const [propertyMetaById, setPropertyMetaById] = useState({});
  const [selectedInvestorId, setSelectedInvestorId] = useState(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editInitial, setEditInitial] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");
  const [editLoadError, setEditLoadError] = useState("");
  const [editDeleting, setEditDeleting] = useState(false);
  const [editDeleteError, setEditDeleteError] = useState("");
  const replyInputRef = useRef(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError("");
      setSendError("");

      try {
        const [inquiryPage, replyPage] = await Promise.all([
          getInquiries({ page: 0, size: LOAD_CAP, sort: "createdAt,desc" }),
          getAdminInquiryReplies({ page: 0, size: LOAD_CAP, sort: "createdAt,desc" }),
        ]);

        if (!alive) return;

        const inquiryRows = Array.isArray(inquiryPage?.content) ? inquiryPage.content : [];
        const replyRows = Array.isArray(replyPage?.content) ? replyPage.content : [];

        setInquiries(inquiryRows);
        setReplies(replyRows);

        const fallbackInvestorById = {};
        inquiryRows.forEach((inquiry) => {
          const investorId = inquiry?.investorId;
          if (!investorId) return;
          const nextStamp = dateValue(inquiry?.createdAt);
          const prevStamp = fallbackInvestorById[investorId]?.stamp ?? 0;
          if (nextStamp < prevStamp) return;

          fallbackInvestorById[investorId] = {
            stamp: nextStamp,
            name: cleanString(inquiry?.contactName) || `Investor #${investorId}`,
            companyName: cleanString(inquiry?.companyName),
            email: cleanString(inquiry?.contactEmail),
          };
        });

        const investorIds = [...new Set(
          [...inquiryRows.map((inquiry) => inquiry?.investorId), ...replyRows.map((reply) => reply?.investorId)]
            .filter(Boolean),
        )];
        const investorEntries = await Promise.all(
          investorIds.map(async (investorId) => {
            const fallback = fallbackInvestorById[investorId] ?? {};
            try {
              const investor = await getInvestorById(investorId);
              return [
                investorId,
                {
                  name: investorNameFromModel(investor) || fallback.name || `Investor #${investorId}`,
                  companyName: cleanString(investor?.companyName) || fallback.companyName || "",
                  email: cleanString(investor?.email) || fallback.email || "",
                },
              ];
            } catch {
              return [
                investorId,
                {
                  name: fallback.name || `Investor #${investorId}`,
                  companyName: fallback.companyName || "",
                  email: fallback.email || "",
                },
              ];
            }
          }),
        );

        if (!alive) return;
        const nextInvestorMeta = {};
        investorEntries.forEach(([investorId, meta]) => {
          nextInvestorMeta[investorId] = meta;
        });
        setInvestorMetaById(nextInvestorMeta);

        const propertyIds = [...new Set(
          [...inquiryRows.map((inquiry) => inquiry?.propertyId), ...replyRows.map((reply) => reply?.propertyId)]
            .filter(Boolean),
        )];
        const propertyEntries = await Promise.all(
          propertyIds.map(async (propertyId) => {
            try {
              const property = await getPropertyById(propertyId);
              return [
                propertyId,
                {
                  address: cleanString(propertyAddress(property)) || `Property #${propertyId}`,
                  photoUrl: propertyLeadPhoto(property),
                  status: cleanString(property?.status).toUpperCase(),
                  askingPrice: property?.askingPrice ?? null,
                  beds: property?.beds ?? null,
                  baths: property?.baths ?? null,
                },
              ];
            } catch {
              return [
                propertyId,
                {
                  address: `Property #${propertyId}`,
                  photoUrl: "",
                  status: "",
                  askingPrice: null,
                  beds: null,
                  baths: null,
                },
              ];
            }
          }),
        );

        if (!alive) return;
        const nextPropertyMeta = {};
        propertyEntries.forEach(([propertyId, meta]) => {
          nextPropertyMeta[propertyId] = meta;
        });
        setPropertyMetaById(nextPropertyMeta);
      } catch (nextError) {
        if (!alive) return;
        setInquiries([]);
        setReplies([]);
        setInvestorMetaById({});
        setPropertyMetaById({});
        setError(nextError?.message || "Failed to load inquiries.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [refreshKey]);

  const investorThreads = useMemo(() => {
    const byInvestor = new Map();
    const threadMap = new Map();

    inquiries.forEach((inquiry) => {
      const investorId = inquiry?.investorId;
      const propertyId = inquiry?.propertyId;
      if (!investorId || !propertyId) return;

      const key = `${investorId}:${propertyId}`;
      const nextMessage = {
        key: `inq-${inquiry.id}`,
        id: inquiry.id,
        kind: "INQUIRY",
        body: cleanString(inquiry?.messageBody) || "—",
        createdAt: inquiry?.createdAt,
        emailStatus: inquiry?.emailStatus,
        authorName: cleanString(inquiry?.contactName) || "Investor",
      };

      if (!threadMap.has(key)) {
        threadMap.set(key, {
          investorId,
          propertyId,
          messages: [],
        });
      }

      threadMap.get(key).messages.push(nextMessage);
    });

    replies.forEach((reply) => {
      const investorId = reply?.investorId;
      const propertyId = reply?.propertyId;
      if (!investorId || !propertyId) return;

      const key = `${investorId}:${propertyId}`;
      const nextMessage = {
        key: `reply-${reply.id}`,
        id: reply.id,
        kind: "REPLY",
        body: cleanString(reply?.body) || "—",
        createdAt: reply?.createdAt,
        emailStatus: reply?.emailStatus,
        authorName: "Megna Team",
      };

      if (!threadMap.has(key)) {
        threadMap.set(key, {
          investorId,
          propertyId,
          messages: [],
        });
      }

      threadMap.get(key).messages.push(nextMessage);
    });

    threadMap.forEach((thread) => {
      const propertyStatus = cleanString(propertyMetaById?.[thread.propertyId]?.status).toUpperCase();
      if (propertyStatus !== PROPERTY_STATUS.ACTIVE) return;

      const messages = [...thread.messages].sort((left, right) => {
        const diff = dateValue(left.createdAt) - dateValue(right.createdAt);
        if (diff !== 0) return diff;
        return String(left.key).localeCompare(String(right.key));
      });

      const latest = messages[messages.length - 1] ?? null;
      let pendingCount = 0;
      let hasReplyAfter = false;
      for (let index = messages.length - 1; index >= 0; index -= 1) {
        const message = messages[index];
        if (message.kind === "REPLY") {
          hasReplyAfter = true;
          continue;
        }
        if (!hasReplyAfter && message.kind === "INQUIRY") {
          pendingCount += 1;
        }
      }

      const normalizedThread = {
        investorId: thread.investorId,
        propertyId: thread.propertyId,
        messages,
        latest,
        latestAt: latest?.createdAt ?? null,
        pendingCount,
      };

      if (!byInvestor.has(thread.investorId)) {
        byInvestor.set(thread.investorId, {
          investorId: thread.investorId,
          propertyThreads: [],
          latestAt: null,
        });
      }

      const investor = byInvestor.get(thread.investorId);
      investor.propertyThreads.push(normalizedThread);

      if (!investor.latestAt || dateValue(normalizedThread.latestAt) > dateValue(investor.latestAt)) {
        investor.latestAt = normalizedThread.latestAt;
      }
    });

    return [...byInvestor.values()]
      .map((investor) => ({
        ...investor,
        propertyThreads: [...investor.propertyThreads].sort(
          (left, right) => dateValue(right.latestAt) - dateValue(left.latestAt),
        ),
      }))
      .sort((left, right) => dateValue(right.latestAt) - dateValue(left.latestAt));
  }, [inquiries, replies, propertyMetaById]);

  useEffect(() => {
    if (!investorThreads.length) {
      setSelectedInvestorId(null);
      setSelectedPropertyId(null);
      return;
    }

    const exists = investorThreads.some((investor) => investor.investorId === selectedInvestorId);
    if (!exists) {
      setSelectedInvestorId(investorThreads[0].investorId);
    }
  }, [investorThreads, selectedInvestorId]);

  const selectedInvestor = useMemo(
    () => investorThreads.find((investor) => investor.investorId === selectedInvestorId) ?? null,
    [investorThreads, selectedInvestorId],
  );

  useEffect(() => {
    const propertyThreads = selectedInvestor?.propertyThreads ?? [];
    if (!propertyThreads.length) {
      setSelectedPropertyId(null);
      return;
    }

    const exists = propertyThreads.some((thread) => thread.propertyId === selectedPropertyId);
    if (!exists) {
      setSelectedPropertyId(propertyThreads[0].propertyId);
    }
  }, [selectedInvestor, selectedPropertyId]);

  const selectedThread = useMemo(
    () => selectedInvestor?.propertyThreads?.find((thread) => thread.propertyId === selectedPropertyId) ?? null,
    [selectedInvestor, selectedPropertyId],
  );

  useEffect(() => {
    const textarea = replyInputRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${Math.max(46, textarea.scrollHeight)}px`;
  }, [replyBody, selectedThread]);

  async function handleSendReply(event) {
    event.preventDefault();
    if (!selectedInvestorId || !selectedPropertyId) return;

    const body = cleanString(replyBody);
    if (!body) {
      setSendError("Reply message is required.");
      return;
    }

    setSending(true);
    setSendError("");

    try {
      const created = await createAdminInquiryReply({
        investorId: selectedInvestorId,
        propertyId: selectedPropertyId,
        body,
      });

      setReplies((prev) => [created, ...prev]);
      setReplyBody("");
    } catch (nextError) {
      setSendError(nextError?.message || "Failed to send reply.");
    } finally {
      setSending(false);
    }
  }

  async function syncPropertyOwner(propertyId, sellerId) {
    if (!propertyId) return;
    const normalizedSellerId = sellerId === "" || sellerId === null || sellerId === undefined
      ? null
      : Number(sellerId);
    const safeSellerId = Number.isFinite(normalizedSellerId) ? normalizedSellerId : null;
    await assignPropertySeller(propertyId, safeSellerId);
  }

  async function openEditModal(id) {
    setEditLoadError("");
    setEditError("");
    setEditSubmitting(false);

    try {
      const full = await getPropertyById(id);
      setEditId(id);
      setEditInitial(full);
      setEditOpen(true);
    } catch (nextError) {
      setEditLoadError(nextError?.message || "Failed to load property details.");
    }
  }

  async function handlePhotoUpload(file) {
    return uploadPropertyPhoto(file);
  }

  async function handlePhotoUrlAdd(url) {
    return createPropertyPhotoFromUrl(url);
  }

  async function handlePhotoUploadDelete(uploadId) {
    if (!uploadId) return;
    try {
      await deletePropertyPhotoUpload(uploadId);
    } catch {
      // best-effort staged upload cleanup
    }
  }

  async function handleEditSubmit(form) {
    if (!editId) return;

    setEditSubmitting(true);
    setEditError("");

    try {
      const dto = buildPropertyUpsertPayloadWithStatus(form);
      await updateProperty(editId, dto);
      const currentSellerId = editInitial?.sellerId ?? null;
      const nextSellerId = form?.sellerId === "" || form?.sellerId === null || form?.sellerId === undefined
        ? null
        : Number(form.sellerId);
      const normalizedNextSellerId = Number.isFinite(nextSellerId) ? nextSellerId : null;
      if (currentSellerId !== normalizedNextSellerId) {
        await syncPropertyOwner(editId, normalizedNextSellerId);
      }

      setEditOpen(false);
      setEditId(null);
      setEditInitial(null);
      setRefreshKey((prev) => prev + 1);
    } catch (nextError) {
      setEditError(nextError?.message || "Failed to update property.");
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleEditDelete() {
    if (!editId) return;

    setEditDeleting(true);
    setEditDeleteError("");

    try {
      await deleteProperty(editId);

      setEditOpen(false);
      setEditId(null);
      setEditInitial(null);
      setEditError("");
      setEditLoadError("");

      setRefreshKey((prev) => prev + 1);
    } catch (nextError) {
      setEditDeleteError(nextError?.message || "Failed to delete property.");
    } finally {
      setEditDeleting(false);
    }
  }

  function resolveInvestorMeta(investorId) {
    return investorMetaById[investorId] || {
      name: `Investor #${investorId ?? "—"}`,
      companyName: "",
      email: "",
    };
  }

  function resolvePropertyMeta(propertyId) {
    return propertyMetaById[propertyId] || {
      address: `Property #${propertyId ?? "—"}`,
      photoUrl: "",
      status: "",
      askingPrice: null,
      beds: null,
      baths: null,
    };
  }

  return (
    <section className="adminInqThreads">
      {loading ? <div className="adminInqThreads__notice">Loading inquiry threads...</div> : null}
      {!loading && error ? <div className="adminInqThreads__notice adminInqThreads__notice--error">{error}</div> : null}

      {!loading && !error ? (
        <div className="adminInqThreads__shell">
          <aside className="adminInqThreads__col adminInqThreads__col--investors" aria-label="Investors">
            <h3 className="adminInqThreads__railTitle">Investors</h3>
            <div className="adminInqThreads__investorList">
              {investorThreads.length === 0 ? (
                <div className="adminInqThreads__empty adminInqThreads__empty--rail">
                  No investor conversations yet.
                </div>
              ) : null}

              {investorThreads.map((investor) => {
                const meta = resolveInvestorMeta(investor.investorId);
                const active = investor.investorId === selectedInvestorId;
                const pendingPropertyCount = investor.propertyThreads.filter(
                  (thread) => thread.pendingCount > 0,
                ).length;
                return (
                  <button
                    key={investor.investorId}
                    type="button"
                    className={`adminInqThreads__investorBtn ${active ? "adminInqThreads__investorBtn--active" : ""}`.trim()}
                    onClick={() => {
                      setSelectedInvestorId(investor.investorId);
                      setReplyBody("");
                      setSendError("");
                    }}
                  >
                    <span className="adminInqThreads__investorNameRow">
                      <span className="adminInqThreads__investorName">{meta.name}</span>
                      {pendingPropertyCount > 0 ? (
                        <span className="adminInqThreads__investorPendingBadge">
                          {pendingPropertyCount}
                        </span>
                      ) : null}
                    </span>
                    <span className="adminInqThreads__investorSub">{meta.companyName || "—"}</span>
                    <span className="adminInqThreads__investorSub">{meta.email || "—"}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          <aside className="adminInqThreads__col adminInqThreads__col--properties" aria-label="Properties">
            <h3 className="adminInqThreads__railTitle">Properties</h3>
            <div className="adminInqThreads__propertyList">
              {!selectedInvestor || selectedInvestor.propertyThreads.length === 0 ? (
                <div className="adminInqThreads__empty adminInqThreads__empty--rail">
                  Select an investor to view properties.
                </div>
              ) : null}

              {selectedInvestor?.propertyThreads?.map((thread) => {
                const propertyMeta = resolvePropertyMeta(thread.propertyId);
                const active = thread.propertyId === selectedPropertyId;
                const pendingClass = thread.pendingCount > 0
                  ? "adminInqThreads__propertyMetaBadge adminInqThreads__propertyMetaBadge--pending"
                  : "adminInqThreads__propertyMetaBadge adminInqThreads__propertyMetaBadge--delivered";

                return (
                  <div
                    key={thread.propertyId}
                    className={`adminInqThreads__propertyItem ${
                      active ? "adminInqThreads__propertyItem--active" : ""
                    }`.trim()}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      className={`adminInqThreads__propertyCard ${active ? "adminInqThreads__propertyCard--active" : ""}`.trim()}
                      onClick={() => {
                        setSelectedPropertyId(thread.propertyId);
                        setReplyBody("");
                        setSendError("");
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedPropertyId(thread.propertyId);
                          setReplyBody("");
                          setSendError("");
                        }
                      }}
                    >
                      {propertyMeta.photoUrl ? (
                        <img
                          className="adminInqThreads__propertyPhoto"
                          src={propertyMeta.photoUrl}
                          alt={propertyMeta.address}
                        />
                      ) : (
                        <div className="adminInqThreads__propertyPhoto adminInqThreads__propertyPhoto--placeholder">
                          <span>No photo</span>
                        </div>
                      )}

                      <span className="adminInqThreads__propertyAddress">{propertyMeta.address}</span>
                      <span className="adminInqThreads__propertyQuickFacts">
                        <strong>{money(propertyMeta.askingPrice)}</strong>
                        <span>{propertyMeta.beds ?? "—"} bd • {propertyMeta.baths ?? "—"} ba</span>
                      </span>
                      <span className="adminInqThreads__propertyMetaRow">
                        <span className={pendingClass}>
                          {thread.pendingCount > 0 ? "Awaiting response" : "Responded"}
                        </span>
                        {active ? (
                          <button
                            type="button"
                            className="adminInqThreads__propertyViewBtn"
                            onClick={(event) => {
                              event.stopPropagation();
                              openEditModal(thread.propertyId);
                            }}
                          >
                            View
                          </button>
                        ) : null}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          <section className="adminInqThreads__col adminInqThreads__col--chat" aria-label="Conversation">
            <div className="adminInqThreads__chatHead">
              <h3 className="adminInqThreads__chatTitle">
                {selectedThread ? resolvePropertyMeta(selectedThread.propertyId).address : "Conversation"}
              </h3>
              <p className="adminInqThreads__chatHint">
                Review inquiry history and reply as Megna Team.
              </p>
            </div>

            <div className="adminInqThreads__chatBodyWrap">
              {selectedThread ? (
                <div className="adminInqThreads__chatTimeline">
                  {selectedThread.messages.map((message) => {
                    const outgoing = message.kind === "REPLY";
                    return (
                      <article
                        key={message.key}
                        className={`adminInqThreads__chatBubble ${
                          outgoing
                            ? "adminInqThreads__chatBubble--outgoing"
                            : "adminInqThreads__chatBubble--incoming"
                        }`.trim()}
                      >
                        <div className="adminInqThreads__chatBubbleHead">
                          <span className="adminInqThreads__chatAuthor">{message.authorName}</span>
                          <span className="adminInqThreads__chatTime">{prettyDateTime(message.createdAt)}</span>
                        </div>
                        <p className="adminInqThreads__chatBody">{message.body}</p>
                        <span className="adminInqThreads__chatStatus">
                          {message.emailStatus === "SENT" ? "Inbox received" : "Delivery pending"}
                        </span>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="adminInqThreads__empty">Select a property to view the thread.</div>
              )}
            </div>

            <form className="adminInqThreads__composer" onSubmit={handleSendReply}>
              <textarea
                ref={replyInputRef}
                className="adminInqThreads__composerInput"
                placeholder="Write a reply as Megna Team"
                value={replyBody}
                onChange={(event) => {
                  setReplyBody(event.target.value);
                  if (sendError) setSendError("");
                }}
                disabled={!selectedThread || sending}
                rows={1}
              />
              <button
                type="submit"
                className="adminInqThreads__composerBtn"
                disabled={!selectedThread || sending || !cleanString(replyBody)}
              >
                {sending ? "Sending..." : "Send Reply"}
              </button>
            </form>

            {sendError ? <div className="adminInqThreads__sendError">{sendError}</div> : null}
          </section>
        </div>
      ) : null}

      {editLoadError ? (
        <div className="adminInqThreads__notice adminInqThreads__notice--error">
          {editLoadError}
        </div>
      ) : null}

      <PropertyUpsertModal
        open={editOpen}
        mode="edit"
        initialValue={editInitial}
        onClose={() => {
          if (editSubmitting || editDeleting) return;
          setEditOpen(false);
          setEditId(null);
          setEditInitial(null);
          setEditError("");
          setEditDeleteError("");
        }}
        onSubmit={handleEditSubmit}
        onUploadPhoto={handlePhotoUpload}
        onAddPhotoByUrl={handlePhotoUrlAdd}
        onDeleteUploadedPhoto={handlePhotoUploadDelete}
        submitting={editSubmitting}
        submitError={editError}
        onDelete={handleEditDelete}
        deleting={editDeleting}
        deleteError={editDeleteError}
      />
    </section>
  );
}
