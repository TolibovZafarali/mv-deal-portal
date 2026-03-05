import { useEffect, useMemo, useRef, useState } from "react";
import { getInquiryByInvestor } from "@/api/modules/inquiryApi";
import { getInvestorById, updateInvestor } from "@/api/modules/investorApi";
import { getPropertyId } from "@/api/modules/propertyApi";
import "@/features/investor/modals/InvestorAccountCenterModal.css";

const PROFILE_VIEW = "profile";
const SECURITY_VIEW = "security";
const NOTIFICATIONS_VIEW = "notifications";
const MESSAGES_VIEW = "messages";
const ACCOUNT_SECTIONS = [
  { key: PROFILE_VIEW, label: "Profile" },
  { key: SECURITY_VIEW, label: "Security" },
  { key: NOTIFICATIONS_VIEW, label: "Notifications" },
];

function normalizePropertyId(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return numeric;
}

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
  onViewPropertyDetails,
  restorePropertyListScrollTop = null,
  preferredPropertyId = null,
  onChangeView,
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
  const [threadSearchOpen, setThreadSearchOpen] = useState(false);
  const [threadSearchQuery, setThreadSearchQuery] = useState("");
  const [mobileThreadPanelOpen, setMobileThreadPanelOpen] = useState(false);
  const propertyListRef = useRef(null);
  const threadSearchInputRef = useRef(null);

  const isProfileView = view === PROFILE_VIEW;
  const isSecurityView = view === SECURITY_VIEW;
  const isNotificationsView = view === NOTIFICATIONS_VIEW;
  const isMessagesView = view === MESSAGES_VIEW;
  const normalizedPreferredPropertyId = normalizePropertyId(preferredPropertyId);

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
                askingPrice: property?.askingPrice ?? null,
                beds: property?.beds ?? null,
                baths: property?.baths ?? null,
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

  useEffect(() => {
    if (!open || !isMessagesView) return;
    if (normalizedPreferredPropertyId === null) return;
    setSelectedPropertyId(normalizedPreferredPropertyId);
  }, [open, isMessagesView, normalizedPreferredPropertyId]);

  useEffect(() => {
    if (!open || !isMessagesView) {
      setMobileThreadPanelOpen(false);
      return;
    }

    setMobileThreadPanelOpen(false);
  }, [open, isMessagesView]);

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
      setMobileThreadPanelOpen(false);
      return;
    }

    const stillExists = propertyThreads.some((thread) => thread.propertyId === selectedPropertyId);
    if (!stillExists) {
      setSelectedPropertyId(propertyThreads[0].propertyId);
    }
  }, [isMessagesView, propertyThreads, selectedPropertyId]);

  useEffect(() => {
    if (isMessagesView) return;
    setThreadSearchOpen(false);
    setThreadSearchQuery("");
  }, [isMessagesView]);

  useEffect(() => {
    if (!threadSearchOpen) return undefined;
    const rafId = window.requestAnimationFrame(() => {
      threadSearchInputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(rafId);
  }, [threadSearchOpen]);

  useEffect(() => {
    if (!open || !isMessagesView) return undefined;
    if (inquiryLoading || inquiryError) return;

    const list = propertyListRef.current;
    if (!list) return undefined;

    const targetScrollTop = Number(restorePropertyListScrollTop);
    if (!Number.isFinite(targetScrollTop) || targetScrollTop < 0) return undefined;

    let rafIdOne = 0;
    let rafIdTwo = 0;

    function applyScrollRestore() {
      const max = Math.max(list.scrollHeight - list.clientHeight, 0);
      list.scrollTop = Math.min(targetScrollTop, max);
    }

    rafIdOne = window.requestAnimationFrame(() => {
      applyScrollRestore();
      rafIdTwo = window.requestAnimationFrame(() => {
        applyScrollRestore();
      });
    });

    return () => {
      if (rafIdOne) window.cancelAnimationFrame(rafIdOne);
      if (rafIdTwo) window.cancelAnimationFrame(rafIdTwo);
    };
  }, [
    open,
    isMessagesView,
    inquiryLoading,
    inquiryError,
    propertyThreads.length,
    restorePropertyListScrollTop,
  ]);

  const selectedThread = useMemo(
    () => propertyThreads.find((thread) => thread.propertyId === selectedPropertyId) ?? null,
    [propertyThreads, selectedPropertyId],
  );
  const normalizedThreadSearch = cleanString(threadSearchQuery).toLowerCase();
  const filteredPropertyThreads = useMemo(() => {
    if (!normalizedThreadSearch) return propertyThreads;

    return propertyThreads.filter((thread) => {
      const rawAddress = propertyMetaById[thread.propertyId]?.address || `Property #${thread.propertyId ?? "—"}`;
      return String(rawAddress).toLowerCase().includes(normalizedThreadSearch);
    });
  }, [normalizedThreadSearch, propertyThreads, propertyMetaById]);

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

  const missingInvestor = !investorId;

  function resolvePropertyAddress(propertyId) {
    return propertyMetaById[propertyId]?.address || `Property #${propertyId ?? "—"}`;
  }

  function resolvePropertyPhoto(propertyId) {
    return propertyMetaById[propertyId]?.photoUrl || "";
  }

  return (
    <div
      className={`invAccountBackdrop ${open ? "invAccountBackdrop--open" : "invAccountBackdrop--closed"}`.trim()}
      role="dialog"
      aria-modal="true"
      aria-label={isMessagesView ? "Messages" : "Account"}
      aria-hidden={!open}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        className={`invAccountModal ${isMessagesView ? "invAccountModal--messagesView" : ""} ${
          mobileThreadPanelOpen ? "invAccountModal--mobileThreadPanelOpen" : ""
        }`.trim()}
      >
        <div className="invAccountModal__left">
          {isMessagesView ? (
            <>
              <div
                className={`invAccountModal__titleRow ${
                  threadSearchOpen ? "invAccountModal__titleRow--searchOpen" : ""
                }`.trim()}
              >
                <div className="invAccountModal__titleTrack">
                  <h2 className="invAccountModal__title">Messages</h2>
                </div>

                <div
                  className={`invAccountModal__titleSearch ${
                    threadSearchOpen ? "invAccountModal__titleSearch--open" : ""
                  }`.trim()}
                >
                  <button
                    type="button"
                    className="invAccountModal__titleSearchToggle"
                    aria-label={threadSearchOpen ? "Close search" : "Open search"}
                    onClick={() => {
                      setThreadSearchOpen((prev) => {
                        const next = !prev;
                        if (!next) setThreadSearchQuery("");
                        return next;
                      });
                    }}
                  >
                    <span className="material-symbols-outlined invAccountModal__titleSearchIcon" aria-hidden="true">
                      search
                    </span>
                  </button>
                  <input
                    ref={threadSearchInputRef}
                    type="search"
                    className="invAccountModal__titleSearchInput"
                    placeholder="Search"
                    value={threadSearchQuery}
                    onChange={(event) => setThreadSearchQuery(event.target.value)}
                    onFocus={() => setThreadSearchOpen(true)}
                    onKeyDown={(event) => {
                      if (event.key !== "Escape") return;
                      event.stopPropagation();
                      setThreadSearchOpen(false);
                      setThreadSearchQuery("");
                    }}
                  />
                  <button
                    type="button"
                    className="invAccountModal__titleSearchClose"
                    aria-label="Close search"
                    onClick={() => {
                      setThreadSearchOpen(false);
                      setThreadSearchQuery("");
                    }}
                  >
                    <span className="material-symbols-outlined invAccountModal__titleSearchCloseIcon" aria-hidden="true">
                      close
                    </span>
                  </button>
                </div>

                <button
                  type="button"
                  className="invAccountModal__mobileExit"
                  aria-label="Close messages"
                  onClick={onClose}
                >
                  <span className="material-symbols-outlined invAccountModal__mobileExitIcon" aria-hidden="true">
                    close
                  </span>
                </button>
              </div>
              <p className="invAccountModal__subcopy">Select a property conversation.</p>

              {!missingInvestor && !inquiryLoading && !inquiryError ? (
                <div
                  className="invAccountModal__propertyList"
                  aria-label="Properties with inquiries"
                  ref={propertyListRef}
                >
                  {filteredPropertyThreads.length === 0 ? (
                    <div className="invAccountModal__empty invAccountModal__empty--rail">
                      {normalizedThreadSearch ? "No matching conversations." : "No property conversations yet."}
                    </div>
                  ) : (
                    filteredPropertyThreads.map((thread) => {
                      const isActive = thread.propertyId === selectedPropertyId;
                      const activeClass = isActive ? "invAccountModal__propertyItem--active" : "";
                      const pendingClass = thread.pendingCount > 0
                        ? "invAccountModal__propertyMetaBadge invAccountModal__propertyMetaBadge--pending"
                        : "invAccountModal__propertyMetaBadge invAccountModal__propertyMetaBadge--delivered";
                      const photoUrl = resolvePropertyPhoto(thread.propertyId);
                      const address = resolvePropertyAddress(thread.propertyId);
                      const propertyMeta = propertyMetaById[thread.propertyId] || {};
                      const bedLabel = propertyMeta.beds ?? "—";
                      const bathLabel = propertyMeta.baths ?? "—";

                      return (
                        <div
                          key={thread.propertyId}
                          className={`invAccountModal__propertyItem ${activeClass}`.trim()}
                        >
                          <div
                            className="invAccountModal__propertyCard"
                            onClick={() => setSelectedPropertyId(thread.propertyId)}
                            onKeyDown={(event) => {
                              if (event.key !== "Enter" && event.key !== " ") return;
                              event.preventDefault();
                              setSelectedPropertyId(thread.propertyId);
                            }}
                            role="button"
                            tabIndex={0}
                            aria-pressed={isActive}
                          >
                            {photoUrl ? (
                              <img className="invAccountModal__propertyPhoto" src={photoUrl} alt={address} />
                            ) : (
                              <div className="invAccountModal__propertyPhoto invAccountModal__propertyPhoto--placeholder">
                                <span>No photo</span>
                              </div>
                            )}

                            <span className="invAccountModal__propertyAddress">{address}</span>
                            <span className="invAccountModal__propertyQuickFacts">
                              <strong>{money(propertyMeta.askingPrice)}</strong>
                              <span>{bedLabel} bd • {bathLabel} ba</span>
                            </span>
                            <span className={pendingClass}>
                              {thread.pendingCount > 0
                                ? `${thread.pendingCount} pending`
                                : `Updated ${prettyDate(thread.latest?.createdAt)}`}
                            </span>
                            <div className="invAccountModal__propertyActions">
                              <button
                                type="button"
                                className="invAccountModal__propertyViewBtn"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setSelectedPropertyId(thread.propertyId);
                                  onViewPropertyDetails?.({
                                    propertyId: thread.propertyId,
                                    propertyListScrollTop: Math.max(propertyListRef.current?.scrollTop ?? 0, 0),
                                  });
                                }}
                              >
                                View
                              </button>
                              <button
                                type="button"
                                className="invAccountModal__propertyOpenThreadBtn"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setSelectedPropertyId(thread.propertyId);
                                  setMobileThreadPanelOpen(true);
                                }}
                              >
                                Messages
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : null}
            </>
          ) : (
            <>
              <h2 className="invAccountModal__title">Account</h2>
              <p className="invAccountModal__subcopy">Manage your profile, security, and notification settings.</p>
              <nav className="invAccountModal__accountNav" aria-label="Account sections">
                {ACCOUNT_SECTIONS.map((section) => {
                  const active = view === section.key;
                  return (
                    <button
                      key={section.key}
                      type="button"
                      className={`invAccountModal__accountNavBtn ${
                        active ? "invAccountModal__accountNavBtn--active" : ""
                      }`.trim()}
                      aria-current={active ? "page" : undefined}
                      onClick={() => onChangeView?.(section.key)}
                    >
                      {section.label}
                    </button>
                  );
                })}
              </nav>
            </>
          )}

        </div>

        <div className="invAccountModal__right">
          {isMessagesView ? (
            <button
              className="invAccountModal__mobileThreadBack"
              type="button"
              aria-label="Back to properties"
              onClick={() => setMobileThreadPanelOpen(false)}
            >
              <span className="material-symbols-outlined invAccountModal__mobileThreadBackIcon" aria-hidden="true">
                arrow_back
              </span>
            </button>
          ) : null}
          <button
            className="invAccountModal__close"
            type="button"
            aria-label={isMessagesView ? "Close messages" : "Close account"}
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

          {!missingInvestor && isSecurityView ? (
            <section className="invAccountModal__panel" aria-label="Security">
              <h3 className="invAccountModal__panelTitle">Security</h3>
              <p className="invAccountModal__panelSubcopy">
                Account security controls will be available in a future update.
              </p>
              <div className="invAccountModal__settingsList">
                <div className="invAccountModal__settingRow">
                  <div className="invAccountModal__settingMeta">
                    <h4 className="invAccountModal__settingTitle">Password</h4>
                    <p className="invAccountModal__settingText">Protected by your current sign-in password.</p>
                  </div>
                  <button className="invAccountModal__settingAction" type="button" disabled>
                    Change password (Coming soon)
                  </button>
                </div>
                <div className="invAccountModal__settingRow">
                  <div className="invAccountModal__settingMeta">
                    <h4 className="invAccountModal__settingTitle">2FA</h4>
                    <p className="invAccountModal__settingText">Two-factor authentication is not configured yet.</p>
                  </div>
                  <button className="invAccountModal__settingAction" type="button" disabled>
                    Set up 2FA (Coming soon)
                  </button>
                </div>
              </div>
            </section>
          ) : null}

          {!missingInvestor && isNotificationsView ? (
            <section className="invAccountModal__panel" aria-label="Notifications">
              <h3 className="invAccountModal__panelTitle">Notifications</h3>
              <p className="invAccountModal__panelSubcopy">
                Notification preferences will be available in a future update.
              </p>
              <div className="invAccountModal__settingsList">
                <label className="invAccountModal__toggleRow">
                  <span className="invAccountModal__settingMeta">
                    <span className="invAccountModal__settingTitle">Email notifications</span>
                    <span className="invAccountModal__settingText">Coming soon</span>
                  </span>
                  <span className="invAccountModal__toggleWrap">
                    <input
                      className="invAccountModal__toggleInput"
                      type="checkbox"
                      aria-label="Email notifications"
                      disabled
                    />
                    <span className="invAccountModal__toggleTrack" aria-hidden="true">
                      <span className="invAccountModal__toggleThumb" />
                    </span>
                  </span>
                </label>
              </div>
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
                      Track your inquiry thread here and wait for a response from Megna Team.
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

                  {selectedThread ? (
                    <div className="invAccountModal__chatState" role="status" aria-live="polite">
                      <span className="invAccountModal__chatStateBadge">
                        {selectedThread.pendingCount > 0 ? "Message sent" : "Inbox received"}
                      </span>
                      <p className="invAccountModal__chatStateText">
                        {selectedThread.pendingCount > 0
                          ? "Your message was sent successfully. Please wait for a response from Megna Team."
                          : "Your inquiry is in the Megna Team inbox. Please wait for their follow-up response."}
                      </p>
                    </div>
                  ) : (
                    <div className="invAccountModal__chatState invAccountModal__chatState--empty" aria-hidden="true">
                      Select a property to see message status.
                    </div>
                  )}
                </>
              ) : null}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
