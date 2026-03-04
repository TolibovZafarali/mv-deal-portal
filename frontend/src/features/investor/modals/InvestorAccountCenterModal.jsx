import { useEffect, useMemo, useState } from "react";
import { getInquiryByInvestor } from "@/api/modules/inquiryApi";
import { getInvestorById, updateInvestor } from "@/api/modules/investorApi";
import { getPropertyId } from "@/api/modules/propertyApi";
import "@/features/investor/modals/InvestorAccountCenterModal.css";

const PROFILE_VIEW = "profile";
const MESSAGES_VIEW = "messages";

function cleanString(value) {
  return String(value ?? "").trim();
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
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

function prettyDate(value) {
  const date = parseDate(value);
  if (!date) return "—";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
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

function profileFromInvestor(investor) {
  return {
    firstName: investor?.firstName ?? "",
    lastName: investor?.lastName ?? "",
    email: investor?.email ?? "",
    phone: investor?.phone ?? "",
    companyName: investor?.companyName ?? "",
  };
}

export default function InvestorAccountCenterModal({
  open,
  view,
  onClose,
  investorId,
}) {
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    companyName: "",
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState("");
  const [profileSaveOk, setProfileSaveOk] = useState("");

  const [inquiries, setInquiries] = useState([]);
  const [inquiryLoading, setInquiryLoading] = useState(false);
  const [inquiryError, setInquiryError] = useState("");
  const [propertyMetaById, setPropertyMetaById] = useState({});
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);

  const isProfileView = view === PROFILE_VIEW;
  const isMessagesView = view === MESSAGES_VIEW;

  useEffect(() => {
    if (!open) return undefined;

    function onKeyDown(event) {
      if (event.key === "Escape") onClose?.();
    }

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !isProfileView || !investorId) return;
    let alive = true;

    async function loadProfile() {
      setProfileLoading(true);
      setProfileError("");
      setProfileSaveError("");
      setProfileSaveOk("");

      try {
        const investor = await getInvestorById(investorId);
        if (!alive) return;
        setProfile(profileFromInvestor(investor));
      } catch (error) {
        if (!alive) return;
        setProfileError(error?.message || "Failed to load profile.");
      } finally {
        if (alive) setProfileLoading(false);
      }
    }

    loadProfile();
    return () => {
      alive = false;
    };
  }, [open, isProfileView, investorId]);

  useEffect(() => {
    if (!open || !isMessagesView || !investorId) return;
    let alive = true;

    async function loadInquiries() {
      setInquiryLoading(true);
      setInquiryError("");
      setPropertyMetaById({});

      try {
        const response = await getInquiryByInvestor(investorId, {
          page: 0,
          size: 200,
          sort: "createdAt,desc",
        });

        if (!alive) return;

        const allInquiries = Array.isArray(response?.content) ? response.content : [];
        const propertyIds = [...new Set(allInquiries.map((inquiry) => inquiry?.propertyId).filter(Boolean))];

        if (!propertyIds.length) {
          setInquiries([]);
          setPropertyMetaById({});
          return;
        }

        const details = await Promise.allSettled(
          propertyIds.map(async (id) => {
            const property = await getPropertyId(id);
            return [
              id,
              {
                address: cleanString(propertyAddress(property)) || `Property #${id}`,
                photoUrl: propertyLeadPhoto(property),
              },
            ];
          }),
        );

        if (!alive) return;

        const nextMetaById = {};
        const visiblePropertyIds = new Set();

        details.forEach((entry) => {
          if (entry.status === "fulfilled") {
            const [id, meta] = entry.value;
            visiblePropertyIds.add(id);
            nextMetaById[id] = meta;
          }
        });

        const visibleInquiries = allInquiries.filter((inquiry) => visiblePropertyIds.has(inquiry?.propertyId));
        setInquiries(visibleInquiries);
        setPropertyMetaById(nextMetaById);
      } catch (error) {
        if (!alive) return;
        setInquiries([]);
        setPropertyMetaById({});
        setInquiryError(error?.message || "Failed to load messages.");
      } finally {
        if (alive) setInquiryLoading(false);
      }
    }

    loadInquiries();
    return () => {
      alive = false;
    };
  }, [open, isMessagesView, investorId]);

  const propertyThreads = useMemo(() => {
    const grouped = new Map();

    inquiries.forEach((inquiry) => {
      const propertyId = inquiry?.propertyId;
      if (!propertyId) return;

      if (!grouped.has(propertyId)) {
        grouped.set(propertyId, []);
      }

      grouped.get(propertyId).push(inquiry);
    });

    return [...grouped.entries()]
      .map(([propertyId, threadInquiries]) => {
        const messages = [...threadInquiries].sort((a, b) => {
          const dateA = parseDate(a?.createdAt);
          const dateB = parseDate(b?.createdAt);
          const timeA = dateA ? dateA.getTime() : 0;
          const timeB = dateB ? dateB.getTime() : 0;
          return timeA - timeB;
        });

        const latest = messages[messages.length - 1] ?? null;
        const pendingCount = messages.filter((item) => item?.emailStatus !== "SENT").length;

        return {
          propertyId,
          messages,
          latest,
          pendingCount,
          totalCount: messages.length,
        };
      })
      .sort((a, b) => {
        const dateA = parseDate(a.latest?.createdAt);
        const dateB = parseDate(b.latest?.createdAt);
        const timeA = dateA ? dateA.getTime() : 0;
        const timeB = dateB ? dateB.getTime() : 0;
        return timeB - timeA;
      });
  }, [inquiries]);

  useEffect(() => {
    if (!isMessagesView) return;

    if (!propertyThreads.length) {
      setSelectedPropertyId(null);
      return;
    }

    const stillExists = propertyThreads.some((thread) => thread.propertyId === selectedPropertyId);
    if (!stillExists) {
      setSelectedPropertyId(propertyThreads[0].propertyId);
    }
  }, [isMessagesView, propertyThreads, selectedPropertyId]);

  const selectedThread = useMemo(
    () => propertyThreads.find((thread) => thread.propertyId === selectedPropertyId) ?? null,
    [propertyThreads, selectedPropertyId],
  );

  async function handleProfileSave(event) {
    event.preventDefault();
    if (!investorId) return;

    const companyName = cleanString(profile.companyName);
    const phone = cleanString(profile.phone);

    if (!companyName || !phone) {
      setProfileSaveError("Company and phone are required.");
      setProfileSaveOk("");
      return;
    }

    setProfileSaving(true);
    setProfileSaveError("");
    setProfileSaveOk("");

    try {
      const updated = await updateInvestor(investorId, { companyName, phone });
      setProfile(profileFromInvestor(updated));
      setProfileSaveOk("Profile updated.");
    } catch (error) {
      setProfileSaveError(error?.message || "Failed to save profile.");
    } finally {
      setProfileSaving(false);
    }
  }

  if (!open) return null;

  const missingInvestor = !investorId;

  function resolvePropertyAddress(propertyId) {
    return propertyMetaById[propertyId]?.address || `Property #${propertyId ?? "—"}`;
  }

  function resolvePropertyPhoto(propertyId) {
    return propertyMetaById[propertyId]?.photoUrl || "";
  }

  return (
    <div
      className="invAccountBackdrop"
      role="dialog"
      aria-modal="true"
      aria-label={isMessagesView ? "Messages" : "Profile"}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div className="invAccountModal">
        <div className="invAccountModal__left">
          {isMessagesView ? (
            <>
              <h2 className="invAccountModal__title">Messages</h2>
              <p className="invAccountModal__subcopy">Select a property conversation.</p>

              {!missingInvestor && !inquiryLoading && !inquiryError ? (
                <div
                  className="invAccountModal__propertyList"
                  aria-label="Properties with inquiries"
                  role="listbox"
                >
                  {propertyThreads.length === 0 ? (
                    <div className="invAccountModal__empty invAccountModal__empty--rail">
                      No property conversations yet.
                    </div>
                  ) : (
                    propertyThreads.map((thread) => {
                      const isActive = thread.propertyId === selectedPropertyId;
                      const activeClass = isActive ? "invAccountModal__propertyCard--active" : "";
                      const pendingClass = thread.pendingCount > 0
                        ? "invAccountModal__propertyMetaBadge invAccountModal__propertyMetaBadge--pending"
                        : "invAccountModal__propertyMetaBadge invAccountModal__propertyMetaBadge--delivered";
                      const photoUrl = resolvePropertyPhoto(thread.propertyId);
                      const address = resolvePropertyAddress(thread.propertyId);

                      return (
                        <button
                          type="button"
                          key={thread.propertyId}
                          className={`invAccountModal__propertyCard ${activeClass}`.trim()}
                          onClick={() => setSelectedPropertyId(thread.propertyId)}
                          role="option"
                          aria-selected={isActive}
                        >
                          {photoUrl ? (
                            <img className="invAccountModal__propertyPhoto" src={photoUrl} alt={address} />
                          ) : (
                            <div className="invAccountModal__propertyPhoto invAccountModal__propertyPhoto--placeholder">
                              <span>No photo</span>
                            </div>
                          )}

                          <span className="invAccountModal__propertyAddress">{address}</span>
                          <span className="invAccountModal__propertyMetaLine">
                            {thread.totalCount} message{thread.totalCount === 1 ? "" : "s"}
                          </span>
                          <span className="invAccountModal__propertyMetaLine">
                            Last update {prettyDate(thread.latest?.createdAt)}
                          </span>
                          <span className={pendingClass}>
                            {thread.pendingCount > 0
                              ? `${thread.pendingCount} pending`
                              : "All delivered"}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              ) : null}
            </>
          ) : (
            <>
              <h2 className="invAccountModal__title">Profile</h2>
              <p className="invAccountModal__subcopy">Update your contact details used for inquiry follow-up.</p>
            </>
          )}

        </div>

        <div className="invAccountModal__right">
          <button
            className="invAccountModal__close"
            type="button"
            aria-label={isMessagesView ? "Close messages" : "Close profile"}
            onClick={onClose}
          >
            ✕
          </button>

          {missingInvestor ? (
            <div className="invAccountModal__notice invAccountModal__notice--error">
              Missing investor identity. Please log out and log in again.
            </div>
          ) : null}

          {!missingInvestor && isProfileView ? (
            <section className="invAccountModal__panel" aria-label="Profile">
              <h3 className="invAccountModal__panelTitle">Profile</h3>

              {profileLoading ? (
                <div className="invAccountModal__notice">Loading profile...</div>
              ) : null}
              {!profileLoading && profileError ? (
                <div className="invAccountModal__notice invAccountModal__notice--error">
                  {profileError}
                </div>
              ) : null}

              {!profileLoading && !profileError ? (
                <form className="invAccountModal__profileForm" onSubmit={handleProfileSave}>
                  <label className="invAccountModal__field">
                    <span>First Name</span>
                    <input value={profile.firstName} disabled />
                  </label>
                  <label className="invAccountModal__field">
                    <span>Last Name</span>
                    <input value={profile.lastName} disabled />
                  </label>
                  <label className="invAccountModal__field">
                    <span>Email</span>
                    <input value={profile.email} disabled />
                  </label>
                  <label className="invAccountModal__field">
                    <span>Phone Number</span>
                    <input
                      value={profile.phone}
                      onChange={(event) =>
                        setProfile((prev) => ({ ...prev, phone: event.target.value }))
                      }
                    />
                  </label>
                  <label className="invAccountModal__field">
                    <span>Company Name</span>
                    <input
                      value={profile.companyName}
                      onChange={(event) =>
                        setProfile((prev) => ({ ...prev, companyName: event.target.value }))
                      }
                    />
                  </label>

                  {profileSaveError ? (
                    <div className="invAccountModal__formMsg invAccountModal__formMsg--error">
                      {profileSaveError}
                    </div>
                  ) : null}
                  {profileSaveOk ? (
                    <div className="invAccountModal__formMsg invAccountModal__formMsg--ok">
                      {profileSaveOk}
                    </div>
                  ) : null}

                  <button
                    className="invAccountModal__save"
                    type="submit"
                    disabled={profileSaving}
                  >
                    {profileSaving ? "Saving..." : "Edit"}
                  </button>
                </form>
              ) : null}
            </section>
          ) : null}

          {!missingInvestor && isMessagesView ? (
            <section className="invAccountModal__panel invAccountModal__panel--messages" aria-label="Messages">
              {inquiryLoading ? <div className="invAccountModal__notice">Loading messages...</div> : null}
              {!inquiryLoading && inquiryError ? (
                <div className="invAccountModal__notice invAccountModal__notice--error">
                  {inquiryError}
                </div>
              ) : null}

              {!inquiryLoading && !inquiryError ? (
                <>
                  <div className="invAccountModal__chatHead">
                    <h3 className="invAccountModal__panelTitle">
                      {selectedThread ? resolvePropertyAddress(selectedThread.propertyId) : "Messages"}
                    </h3>
                    <p className="invAccountModal__chatHint">
                      Your inquiry messages go to Megna team at contact@megna-realestate.com
                    </p>
                  </div>

                  <div className="invAccountModal__chatBodyWrap">
                    {selectedThread ? (
                      <div className="invAccountModal__chatTimeline">
                        {selectedThread.messages.map((message) => {
                          const delivered = message?.emailStatus === "SENT";

                          return (
                            <div className="invAccountModal__chatExchange" key={message.id}>
                              <article className="invAccountModal__chatBubble invAccountModal__chatBubble--outgoing">
                                <div className="invAccountModal__chatBubbleHead">
                                  <span className="invAccountModal__chatAuthor">You</span>
                                  <span className="invAccountModal__chatTime">{prettyDateTime(message.createdAt)}</span>
                                </div>

                                <p className="invAccountModal__chatBody">{cleanString(message.messageBody) || "—"}</p>
                              </article>

                              <article className="invAccountModal__chatBubble invAccountModal__chatBubble--incoming">
                                <div className="invAccountModal__chatBubbleHead">
                                  <span className="invAccountModal__chatAuthor">Megna Team</span>
                                  <span className="invAccountModal__statusText">
                                    {delivered ? "Inbox received" : "Delivery pending"}
                                  </span>
                                </div>
                                <p className="invAccountModal__chatBody">
                                  {delivered
                                    ? "We received your inquiry and a team member will follow up by email."
                                    : "We are routing your inquiry to the Megna admin inbox now."}
                                </p>
                              </article>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="invAccountModal__empty">Select a property to view messages.</div>
                    )}
                  </div>

                  <div className="invAccountModal__chatComposer" aria-hidden="true">
                    <input disabled value="Replies from Megna team are sent to your email." readOnly />
                    <button type="button" disabled>Send</button>
                  </div>
                </>
              ) : null}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
