import { useEffect, useMemo, useState } from "react";
import { getSellerInquiries } from "@/api/modules/inquiryApi";
import { getSellerPropertyById } from "@/api/modules/sellerPropertyApi";
import {
  createSellerThreadMessage,
  getSellerThreadMessages,
  getSellerThreads,
  markSellerThreadRead,
} from "@/api/modules/sellerThreadApi";
import { startSellerTimer, trackSellerEvent } from "@/features/seller/utils/sellerTelemetry";
import "@/features/seller/pages/SellerInboxPage.css";

const PAGE_SIZE = 20;
const THREADS_ENABLED = String(import.meta.env.VITE_FEATURE_SELLER_PORTAL_V2 ?? "false").toLowerCase() === "true";
const SUPPORTED_THREAD_TOPICS = new Set(["WORKFLOW"]);

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function prettyEnum(value) {
  if (!value) return "—";
  return String(value)
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function compactAddress(property) {
  if (!property) return "";
  const line1 = [property.street1, property.street2].filter(Boolean).join(", ");
  const stateZip = [property.state, property.zip].filter(Boolean).join(" ");
  const line2 = [property.city, stateZip].filter(Boolean).join(", ");
  return [line1, line2].filter(Boolean).join(" • ");
}

export default function SellerInboxPage() {
  const [inquiries, setInquiries] = useState([]);
  const [propertyContextById, setPropertyContextById] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [threads, setThreads] = useState([]);
  const [threadsAvailable, setThreadsAvailable] = useState(THREADS_ENABLED);
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [threadMessages, setThreadMessages] = useState([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState("");
  const [newMessageBody, setNewMessageBody] = useState("");
  const [messageSending, setMessageSending] = useState(false);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const inquiriesPage = await getSellerInquiries({ page: 0, size: PAGE_SIZE, sort: "createdAt,desc" });

        if (!alive) return;
        setInquiries(Array.isArray(inquiriesPage?.content) ? inquiriesPage.content : []);
      } catch (nextError) {
        if (!alive) return;
        setInquiries([]);
        setError(nextError?.message || "Failed to load conversations.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const missingPropertyIds = [...new Set(inquiries.map((row) => row?.propertyId).filter(Boolean))]
      .filter((propertyId) => !propertyContextById[propertyId]);

    if (!missingPropertyIds.length) return undefined;

    (async () => {
      const pairs = await Promise.all(
        missingPropertyIds.map(async (propertyId) => {
          try {
            const property = await getSellerPropertyById(propertyId);
            return [
              propertyId,
              {
                title: compactAddress(property) || `Property #${propertyId}`,
                address: compactAddress(property),
              },
            ];
          } catch {
            return [propertyId, { title: `Property #${propertyId}`, address: "" }];
          }
        }),
      );

      if (!alive) return;
      setPropertyContextById((prev) => {
        const next = { ...prev };
        pairs.forEach(([propertyId, context]) => {
          next[propertyId] = context;
        });
        return next;
      });
    })();

    return () => {
      alive = false;
    };
  }, [inquiries, propertyContextById]);

  useEffect(() => {
    if (!THREADS_ENABLED) return undefined;

    let alive = true;

    async function loadThreads() {
      try {
        const data = await getSellerThreads({ page: 0, size: 40, sort: "updatedAt,desc" });
        if (!alive) return;

        setThreadsAvailable(true);
        const rows = (Array.isArray(data?.content) ? data.content : [])
          .filter((thread) => SUPPORTED_THREAD_TOPICS.has(String(thread?.topicType ?? "").trim().toUpperCase()));
        setThreads(rows);
        if (!rows.length) {
          setSelectedThreadId(null);
          return;
        }
        if (!selectedThreadId || !rows.some((thread) => thread.id === selectedThreadId)) {
          setSelectedThreadId(rows[0].id);
        }
      } catch (nextError) {
        if (!alive) return;
        if (Number(nextError?.status) === 404) {
          setThreadsAvailable(false);
          setThreads([]);
          setSelectedThreadId(null);
          setThreadMessages([]);
          setThreadError("");
          return;
        }
        setThreadError(nextError?.message || "Failed to load thread list.");
      }
    }

    loadThreads();
    return () => {
      alive = false;
    };
  }, [selectedThreadId]);

  useEffect(() => {
    if (!THREADS_ENABLED || !threadsAvailable || !selectedThreadId) return undefined;

    let alive = true;

    async function loadMessages() {
      setThreadLoading(true);
      setThreadError("");
      try {
        const data = await getSellerThreadMessages(selectedThreadId, { page: 0, size: 100, sort: "createdAt,asc" });
        if (!alive) return;

        const rows = Array.isArray(data?.content) ? data.content : [];
        setThreadMessages(rows);

        const lastMessageId = rows.length ? rows[rows.length - 1].id : null;
        await markSellerThreadRead(selectedThreadId, lastMessageId);
      } catch (nextError) {
        if (!alive) return;
        if (Number(nextError?.status) === 404) {
          setThreadsAvailable(false);
          setThreads([]);
          setSelectedThreadId(null);
          setThreadMessages([]);
          setThreadError("");
          return;
        }
        setThreadMessages([]);
        setThreadError(nextError?.message || "Failed to load thread messages.");
      } finally {
        if (alive) setThreadLoading(false);
      }
    }

    loadMessages();
    const poll = window.setInterval(loadMessages, 20000);

    return () => {
      alive = false;
      window.clearInterval(poll);
    };
  }, [selectedThreadId, threadsAvailable]);

  const timeline = useMemo(() => {
    return inquiries.map((inquiry) => ({
      id: `inquiry-${inquiry.id}`,
      type: "Investor Inquiry",
      title: propertyContextById[inquiry.propertyId]?.title || `Property #${inquiry.propertyId}`,
      detail: inquiry.messageBody,
      meta: [
        inquiry.contactName,
        inquiry.companyName,
        inquiry.contactEmail,
        inquiry.contactPhone,
      ].filter(Boolean).join(" • "),
      timestamp: inquiry.createdAt,
    })).sort((left, right) => {
      const leftTime = new Date(left.timestamp ?? 0).getTime() || 0;
      const rightTime = new Date(right.timestamp ?? 0).getTime() || 0;
      return rightTime - leftTime;
    });
  }, [inquiries, propertyContextById]);

  async function sendThreadMessage() {
    if (!selectedThreadId) return;
    const body = String(newMessageBody ?? "").trim();
    if (!body) return;

    const stopTimer = startSellerTimer("seller.thread.message.send", {
      threadId: selectedThreadId,
    });

    setMessageSending(true);
    try {
      await createSellerThreadMessage(selectedThreadId, body);
      setNewMessageBody("");
      stopTimer("success");
      trackSellerEvent("seller.thread.message.send.success", { threadId: selectedThreadId });

      const data = await getSellerThreadMessages(selectedThreadId, { page: 0, size: 100, sort: "createdAt,asc" });
      const rows = Array.isArray(data?.content) ? data.content : [];
      setThreadMessages(rows);
      const lastMessageId = rows.length ? rows[rows.length - 1].id : null;
      await markSellerThreadRead(selectedThreadId, lastMessageId);
    } catch (nextError) {
      if (Number(nextError?.status) === 404) {
        setThreadsAvailable(false);
        setThreads([]);
        setSelectedThreadId(null);
        setThreadMessages([]);
        setThreadError("");
        return;
      }
      stopTimer("error", { message: nextError?.message || "unknown" });
      setThreadError(nextError?.message || "Failed to send message.");
    } finally {
      setMessageSending(false);
    }
  }

  return (
    <section className="sellerConvo">
      <header className="sellerConvo__header">
        <h2>Conversations</h2>
        <p>
          {loading
            ? "Loading conversation history..."
            : `${timeline.length.toLocaleString("en-US")} recent conversation events`}
        </p>
      </header>

      {error ? <div className="sellerConvo__error">{error}</div> : null}

      {THREADS_ENABLED && threadsAvailable ? (
        <section className="sellerConvoThreads">
          <aside className="sellerConvoThreads__listPane">
            <header className="sellerConvoThreads__paneHead">Seller ↔ Admin Threads</header>
            <ul className="sellerConvoThreads__list">
              {threads.length === 0 ? <li className="sellerConvoThreads__empty">No active threads yet.</li> : null}
              {threads.map((thread) => (
                <li key={thread.id}>
                  <button
                    type="button"
                    className={`sellerConvoThreads__threadBtn ${selectedThreadId === thread.id ? "sellerConvoThreads__threadBtn--active" : ""}`}
                    onClick={() => setSelectedThreadId(thread.id)}
                  >
                    <div>{thread.topicType} • Property #{thread.propertyId}</div>
                    <div className="sellerConvoThreads__threadMeta">{formatDateTime(thread.lastMessageAt)} • {thread.unreadCount} unread</div>
                    {thread.lastMessagePreview ? <div className="sellerConvoThreads__threadPreview">{thread.lastMessagePreview}</div> : null}
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <div className="sellerConvoThreads__messagePane">
            <header className="sellerConvoThreads__paneHead">Thread Messages</header>
            {threadError ? <div className="sellerConvo__error">{threadError}</div> : null}
            {threadLoading ? <div className="sellerConvoThreads__empty">Loading thread...</div> : null}

            <div className="sellerConvoThreads__messages">
              {threadMessages.length === 0 ? <div className="sellerConvoThreads__empty">No messages yet.</div> : null}
              {threadMessages.map((message) => (
                <article
                  key={message.id}
                  className={`sellerConvoThreads__message sellerConvoThreads__message--${String(message.senderRole || "SYSTEM").toLowerCase()}`}
                >
                  <div className="sellerConvoThreads__messageMeta">
                    {prettyEnum(message.senderRole)} • {formatDateTime(message.createdAt)}
                  </div>
                  <div>{message.body}</div>
                </article>
              ))}
            </div>

            <div className="sellerConvoThreads__composer">
              <textarea
                value={newMessageBody}
                onChange={(event) => setNewMessageBody(event.target.value)}
                placeholder="Write to the Megna admin team"
              />
              <button type="button" onClick={sendThreadMessage} disabled={messageSending || !selectedThreadId}>
                {messageSending ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </section>
      ) : (
        <div className="sellerConvo__notice">Thread collaboration is unavailable. Legacy conversation timeline is shown below.</div>
      )}

      <section className="sellerConvoTimeline">
        <header className="sellerConvoTimeline__head">Legacy Timeline</header>

        {timeline.length === 0 ? <div className="sellerConvoTimeline__empty">No conversation activity yet.</div> : null}

        <ul className="sellerConvoTimeline__list">
          {timeline.map((item) => (
            <li key={item.id} className="sellerConvoTimeline__event">
              <div className="sellerConvoTimeline__type">{item.type}</div>
              <div className="sellerConvoTimeline__title">{item.title}</div>
              <div className="sellerConvoTimeline__time">{formatDateTime(item.timestamp)}</div>
              {item.detail ? <div className="sellerConvoTimeline__detail">{item.detail}</div> : null}
              {item.meta ? <div className="sellerConvoTimeline__meta">{item.meta}</div> : null}
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
