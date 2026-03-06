import { useEffect, useMemo, useRef, useState } from "react";
import { getInquiryByInvestor } from "@/api/modules/inquiryApi";
import { getInquiryRepliesByInvestor } from "@/api/modules/inquiryReplyApi";
import { getInvestorById, updateInvestor } from "@/api/modules/investorApi";
import { getPropertyId } from "@/api/modules/propertyApi";
import { changePassword } from "@/api/modules/authApi";
import { useAuth } from "@/features/auth";
import "@/features/investor/modals/InvestorAccountCenterModal.css";
import { getPasswordStrength } from "@/shared/utils/passwordStrength";

const PROFILE_VIEW = "profile";
const SECURITY_VIEW = "security";
const NOTIFICATIONS_VIEW = "notifications";
const MESSAGES_VIEW = "messages";
const EMPTY_PROFILE = {
  firstName: "",
  lastName: "",
  email: "",
  notificationEmail: "",
  phone: "",
  companyName: "",
};
const ACCOUNT_SECTIONS = [
  { key: PROFILE_VIEW, label: "Profile", icon: "person" },
  { key: SECURITY_VIEW, label: "Security", icon: "lock" },
  { key: NOTIFICATIONS_VIEW, label: "Notifications", icon: "notifications" },
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
  const email = investor?.email ?? "";
  return {
    firstName: investor?.firstName ?? "",
    lastName: investor?.lastName ?? "",
    email,
    notificationEmail: investor?.notificationEmail ?? email,
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
  const { signOut } = useAuth();
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [savedProfile, setSavedProfile] = useState(EMPTY_PROFILE);
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState("");
  const [profileSaveOk, setProfileSaveOk] = useState("");
  const [notificationEditing, setNotificationEditing] = useState(false);
  const [notificationSaving, setNotificationSaving] = useState(false);
  const [notificationSaveError, setNotificationSaveError] = useState("");
  const [notificationSaveOk, setNotificationSaveOk] = useState("");
  const [securityForm, setSecurityForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [securityEditing, setSecurityEditing] = useState(false);
  const [securitySaving, setSecuritySaving] = useState(false);
  const [securityError, setSecurityError] = useState("");
  const [securityOk, setSecurityOk] = useState("");

  const [inquiries, setInquiries] = useState([]);
  const [replies, setReplies] = useState([]);
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
  const securityPasswordStrength = useMemo(
    () => getPasswordStrength(securityForm.newPassword),
    [securityForm.newPassword],
  );

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
    if (!open || isMessagesView || !investorId) return;
    let alive = true;

    async function loadProfile() {
      setProfileLoading(true);
      setProfileError("");
      setProfileSaveError("");
      setProfileSaveOk("");
      setNotificationSaveError("");
      setNotificationSaveOk("");

      try {
        const investor = await getInvestorById(investorId);
        if (!alive) return;
        const nextProfile = profileFromInvestor(investor);
        setProfile(nextProfile);
        setSavedProfile(nextProfile);
        setProfileEditing(false);
        setNotificationEditing(false);
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
  }, [open, isMessagesView, investorId]);

  useEffect(() => {
    if (!open || !isMessagesView || !investorId) return;
    let alive = true;

    async function loadInquiries() {
      setInquiryLoading(true);
      setInquiryError("");
      setPropertyMetaById({});
      setReplies([]);

      try {
        const [inquiryResponse, replyResponse] = await Promise.all([
          getInquiryByInvestor(investorId, {
            page: 0,
            size: 500,
            sort: "createdAt,desc",
          }),
          getInquiryRepliesByInvestor(investorId, {
            page: 0,
            size: 500,
            sort: "createdAt,desc",
          }),
        ]);

        if (!alive) return;

        const allInquiries = Array.isArray(inquiryResponse?.content) ? inquiryResponse.content : [];
        const allReplies = Array.isArray(replyResponse?.content) ? replyResponse.content : [];
        const propertyIds = [...new Set(
          [...allInquiries.map((inquiry) => inquiry?.propertyId), ...allReplies.map((reply) => reply?.propertyId)]
            .filter(Boolean),
        )];

        if (!propertyIds.length) {
          setInquiries([]);
          setReplies([]);
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
        const visibleReplies = allReplies.filter((reply) => visiblePropertyIds.has(reply?.propertyId));
        setInquiries(visibleInquiries);
        setReplies(visibleReplies);
        setPropertyMetaById(nextMetaById);
      } catch (error) {
        if (!alive) return;
        setInquiries([]);
        setReplies([]);
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
    if (open) return;
    setSecurityForm({
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    });
    setSecurityEditing(false);
    setSecuritySaving(false);
    setSecurityError("");
    setSecurityOk("");
  }, [open]);

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

      grouped.get(propertyId).push({
        key: `inquiry-${inquiry.id}`,
        kind: "INQUIRY",
        id: inquiry.id,
        createdAt: inquiry.createdAt,
        body: cleanString(inquiry.messageBody) || "—",
        emailStatus: inquiry.emailStatus,
      });
    });

    replies.forEach((reply) => {
      const propertyId = reply?.propertyId;
      if (!propertyId) return;

      if (!grouped.has(propertyId)) {
        grouped.set(propertyId, []);
      }

      grouped.get(propertyId).push({
        key: `reply-${reply.id}`,
        kind: "REPLY",
        id: reply.id,
        createdAt: reply.createdAt,
        body: cleanString(reply.body) || "—",
        emailStatus: reply.emailStatus,
      });
    });

    return [...grouped.entries()]
      .map(([propertyId, threadMessages]) => {
        const messages = [...threadMessages].sort((a, b) => {
          const dateA = parseDate(a?.createdAt);
          const dateB = parseDate(b?.createdAt);
          const timeA = dateA ? dateA.getTime() : 0;
          const timeB = dateB ? dateB.getTime() : 0;
          if (timeA !== timeB) return timeA - timeB;
          return String(a?.key ?? "").localeCompare(String(b?.key ?? ""));
        });

        const latest = messages[messages.length - 1] ?? null;
        const pendingCount = messages.filter(
          (item) => item?.kind === "INQUIRY" && item?.emailStatus !== "SENT",
        ).length;

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
  }, [inquiries, replies]);

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
    const notificationEmail = cleanString(profile.notificationEmail || profile.email).toLowerCase();

    if (!companyName || !phone) {
      setProfileSaveError("Company and phone are required.");
      setProfileSaveOk("");
      return;
    }

    setProfileSaving(true);
    setProfileSaveError("");
    setProfileSaveOk("");

    try {
      const updated = await updateInvestor(investorId, { companyName, phone, notificationEmail });
      const nextProfile = profileFromInvestor(updated);
      setProfile(nextProfile);
      setSavedProfile(nextProfile);
      setProfileEditing(false);
      setProfileSaveOk("Profile updated.");
    } catch (error) {
      setProfileSaveError(error?.message || "Failed to save profile.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleNotificationSave(event) {
    event.preventDefault();
    if (!investorId) return;

    const companyName = cleanString(profile.companyName);
    const phone = cleanString(profile.phone);
    const notificationEmail = cleanString(profile.notificationEmail).toLowerCase();

    if (!notificationEmail) {
      setNotificationSaveError("Notification email is required.");
      setNotificationSaveOk("");
      return;
    }

    setNotificationSaving(true);
    setNotificationSaveError("");
    setNotificationSaveOk("");

    try {
      const updated = await updateInvestor(investorId, { companyName, phone, notificationEmail });
      const nextProfile = profileFromInvestor(updated);
      setProfile(nextProfile);
      setSavedProfile(nextProfile);
      setNotificationEditing(false);
      setNotificationSaveOk("Notification email updated.");
    } catch (error) {
      setNotificationSaveError(error?.message || "Failed to save notification email.");
    } finally {
      setNotificationSaving(false);
    }
  }

  async function handleSecuritySave(event) {
    event.preventDefault();

    const currentPassword = securityForm.currentPassword;
    const newPassword = securityForm.newPassword;
    const confirmNewPassword = securityForm.confirmNewPassword;

    if (currentPassword.length < 8) {
      setSecurityError("Current password must be at least 8 characters.");
      setSecurityOk("");
      return;
    }

    if (newPassword.length < 8) {
      setSecurityError("New password must be at least 8 characters.");
      setSecurityOk("");
      return;
    }

    if (newPassword === currentPassword) {
      setSecurityError("New password must be different from current password.");
      setSecurityOk("");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setSecurityError("New password and confirm password must match.");
      setSecurityOk("");
      return;
    }

    setSecuritySaving(true);
    setSecurityError("");
    setSecurityOk("");

    try {
      await changePassword({ currentPassword, newPassword });
      setSecurityForm({
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      });
      setSecurityEditing(false);
      setSecurityOk("Password updated.");
    } catch (error) {
      setSecurityError(error?.message || "Failed to change password.");
    } finally {
      setSecuritySaving(false);
    }
  }

  function handleSecurityEditStart() {
    setSecurityEditing(true);
    setSecurityError("");
    setSecurityOk("");
  }

  function handleSecurityCancel() {
    setSecurityForm({
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    });
    setSecurityEditing(false);
    setSecurityError("");
    setSecurityOk("");
  }

  function handleProfileEditStart() {
    setProfileSaveError("");
    setProfileSaveOk("");
    setProfileEditing(true);
  }

  function handleProfileCancel() {
    setProfile((prev) => ({
      ...prev,
      companyName: savedProfile.companyName,
      phone: savedProfile.phone,
    }));
    setProfileSaveError("");
    setProfileSaveOk("");
    setProfileEditing(false);
  }

  function handleNotificationEditStart() {
    setNotificationSaveError("");
    setNotificationSaveOk("");
    setNotificationEditing(true);
  }

  function handleNotificationCancel() {
    setProfile((prev) => ({
      ...prev,
      notificationEmail: savedProfile.notificationEmail,
    }));
    setNotificationSaveError("");
    setNotificationSaveOk("");
    setNotificationEditing(false);
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
              <div className="invAccountModal__accountHead">
                <h2 className="invAccountModal__title">Account</h2>
                <button
                  type="button"
                  className="invAccountModal__accountHeadClose"
                  aria-label="Close account"
                  onClick={onClose}
                >
                  <span className="material-symbols-outlined invAccountModal__accountHeadCloseIcon" aria-hidden="true">
                    close
                  </span>
                </button>
                <p className="invAccountModal__subcopy">Manage your profile, security, and notification settings.</p>
              </div>
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
                      aria-label={section.label}
                      aria-current={active ? "page" : undefined}
                      onClick={() => onChangeView?.(section.key)}
                    >
                      <span className="material-symbols-outlined invAccountModal__accountNavIcon" aria-hidden="true">
                        {section.icon}
                      </span>
                      <span className="invAccountModal__accountNavLabel">{section.label}</span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  className="invAccountModal__accountNavBtn invAccountModal__accountNavLogoutBtn"
                  aria-label="Log out"
                  onClick={() => {
                    onClose?.();
                    signOut?.();
                  }}
                >
                  <span className="material-symbols-outlined invAccountModal__accountNavIcon" aria-hidden="true">
                    logout
                  </span>
                  <span className="invAccountModal__accountNavLabel">Log out</span>
                </button>
              </nav>
              <button
                type="button"
                className="invAccountModal__logoutBtn"
                onClick={() => {
                  onClose?.();
                  signOut?.();
                }}
              >
                <span className="material-symbols-outlined invAccountModal__logoutIcon" aria-hidden="true">
                  logout
                </span>
                <span>Log out</span>
              </button>
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
                      disabled={!profileEditing || profileSaving}
                      value={profile.phone}
                      onChange={(event) =>
                        setProfile((prev) => ({ ...prev, phone: event.target.value }))
                      }
                    />
                  </label>
                  <label className="invAccountModal__field">
                    <span>Company Name</span>
                    <input
                      disabled={!profileEditing || profileSaving}
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

                  <div className="invAccountModal__profileActions">
                    {!profileEditing ? (
                      <button
                        className="invAccountModal__save"
                        type="button"
                        onClick={handleProfileEditStart}
                      >
                        Edit
                      </button>
                    ) : (
                      <>
                        <button
                          className="invAccountModal__save invAccountModal__save--secondary"
                          type="button"
                          disabled={profileSaving}
                          onClick={handleProfileCancel}
                        >
                          Cancel
                        </button>
                        <button
                          className="invAccountModal__save"
                          type="submit"
                          disabled={profileSaving}
                        >
                          {profileSaving ? "Saving..." : "Save"}
                        </button>
                      </>
                    )}
                  </div>
                </form>
              ) : null}
            </section>
          ) : null}

          {!missingInvestor && isSecurityView ? (
            <section className="invAccountModal__panel" aria-label="Security">
              <h3 className="invAccountModal__panelTitle">Security</h3>
              <p className="invAccountModal__panelSubcopy">
                Change your sign-in password.
              </p>
              {!securityEditing ? (
                <div className="invAccountModal__settingsList">
                  <div className="invAccountModal__settingRow">
                    <div className="invAccountModal__settingMeta">
                      <h4 className="invAccountModal__settingTitle">Password</h4>
                      <p className="invAccountModal__settingText">Protected by your current sign-in password.</p>
                    </div>
                    <button className="invAccountModal__settingAction" type="button" onClick={handleSecurityEditStart}>
                      Change Password
                    </button>
                  </div>
                </div>
              ) : (
                <form className="invAccountModal__profileForm" onSubmit={handleSecuritySave}>
                  <label className="invAccountModal__field">
                    <span>Current Password</span>
                    <input
                      type="password"
                      autoComplete="current-password"
                      disabled={securitySaving}
                      value={securityForm.currentPassword}
                      onChange={(event) => {
                        setSecurityError("");
                        setSecurityOk("");
                        setSecurityForm((prev) => ({ ...prev, currentPassword: event.target.value }));
                      }}
                    />
                  </label>
                  <label className="invAccountModal__field">
                    <span>New Password</span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      disabled={securitySaving}
                      value={securityForm.newPassword}
                      onChange={(event) => {
                        setSecurityError("");
                        setSecurityOk("");
                        setSecurityForm((prev) => ({ ...prev, newPassword: event.target.value }));
                      }}
                    />
                  </label>
                  {securityPasswordStrength ? (
                    <div
                      className={`invAccountModal__passwordStrength invAccountModal__passwordStrength--${securityPasswordStrength}`}
                      aria-live="polite"
                    >
                      Password strength: {securityPasswordStrength === "strong" ? "Strong" : "Weak"}
                    </div>
                  ) : null}
                  <label className="invAccountModal__field">
                    <span>Confirm New Password</span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      disabled={securitySaving}
                      value={securityForm.confirmNewPassword}
                      onChange={(event) => {
                        setSecurityError("");
                        setSecurityOk("");
                        setSecurityForm((prev) => ({ ...prev, confirmNewPassword: event.target.value }));
                      }}
                    />
                  </label>
                  <div className="invAccountModal__settingNote">
                    Use at least 8 characters. You will stay signed in on this device after changing it.
                  </div>

                  {securityError ? (
                    <div className="invAccountModal__formMsg invAccountModal__formMsg--error">
                      {securityError}
                    </div>
                  ) : null}
                  <div className="invAccountModal__profileActions">
                    <button
                      className="invAccountModal__save invAccountModal__save--secondary"
                      type="button"
                      disabled={securitySaving}
                      onClick={handleSecurityCancel}
                    >
                      Cancel
                    </button>
                    <button className="invAccountModal__save" type="submit" disabled={securitySaving}>
                      {securitySaving ? "Saving..." : "Save Password"}
                    </button>
                  </div>
                </form>
              )}
              {securityOk ? (
                <div className="invAccountModal__formMsg invAccountModal__formMsg--ok">
                  {securityOk}
                </div>
              ) : null}
            </section>
          ) : null}

          {!missingInvestor && isNotificationsView ? (
            <section className="invAccountModal__panel" aria-label="Notifications">
              <h3 className="invAccountModal__panelTitle">Notifications</h3>
              <p className="invAccountModal__panelSubcopy">
                Set a notification email for deal and platform updates.
              </p>
              {profileLoading ? <div className="invAccountModal__notice">Loading account settings...</div> : null}
              {!profileLoading && profileError ? (
                <div className="invAccountModal__notice invAccountModal__notice--error">
                  {profileError}
                </div>
              ) : null}
              {!profileLoading && !profileError ? (
                <form className="invAccountModal__profileForm" onSubmit={handleNotificationSave}>
                  <label className="invAccountModal__field">
                    <span>Notification Email</span>
                    <input
                      type="email"
                      disabled={!notificationEditing || notificationSaving}
                      value={profile.notificationEmail}
                      onChange={(event) =>
                        setProfile((prev) => ({ ...prev, notificationEmail: event.target.value }))
                      }
                    />
                  </label>
                  <div className="invAccountModal__settingNote">
                    Separate from your login email. Used for notifications only.
                  </div>
                  {notificationSaveError ? (
                    <div className="invAccountModal__formMsg invAccountModal__formMsg--error">
                      {notificationSaveError}
                    </div>
                  ) : null}
                  {notificationSaveOk ? (
                    <div className="invAccountModal__formMsg invAccountModal__formMsg--ok">
                      {notificationSaveOk}
                    </div>
                  ) : null}
                  <div className="invAccountModal__profileActions">
                    {!notificationEditing ? (
                      <button
                        className="invAccountModal__save"
                        type="button"
                        onClick={handleNotificationEditStart}
                      >
                        Edit
                      </button>
                    ) : (
                      <>
                        <button
                          className="invAccountModal__save invAccountModal__save--secondary"
                          type="button"
                          disabled={notificationSaving}
                          onClick={handleNotificationCancel}
                        >
                          Cancel
                        </button>
                        <button className="invAccountModal__save" type="submit" disabled={notificationSaving}>
                          {notificationSaving ? "Saving..." : "Save"}
                        </button>
                      </>
                    )}
                  </div>
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
                      Track your inquiry thread here and wait for a response from Megna Team.
                    </p>
                  </div>

                  <div className="invAccountModal__chatBodyWrap">
                    {selectedThread ? (
                      <div className="invAccountModal__chatTimeline">
                        {selectedThread.messages.map((message) => {
                          const delivered = message?.emailStatus === "SENT";
                          const isReply = message?.kind === "REPLY";

                          return (
                            <div className="invAccountModal__chatExchange" key={message.key}>
                              <article
                                className={`invAccountModal__chatBubble ${
                                  isReply
                                    ? "invAccountModal__chatBubble--incoming"
                                    : "invAccountModal__chatBubble--outgoing"
                                }`.trim()}
                              >
                                <div className="invAccountModal__chatBubbleHead">
                                  <span className="invAccountModal__chatAuthor">{isReply ? "Megna Team" : "You"}</span>
                                  <span className="invAccountModal__chatTime">{prettyDateTime(message.createdAt)}</span>
                                </div>

                                <p className="invAccountModal__chatBody">{message.body || "—"}</p>
                                <span className="invAccountModal__statusText">
                                  {delivered ? "Inbox received" : "Delivery pending"}
                                </span>
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
                        {selectedThread.messages.some((message) => message.kind === "REPLY")
                          ? "Reply received"
                          : selectedThread.pendingCount > 0
                            ? "Message sent"
                            : "Inbox received"}
                      </span>
                      <p className="invAccountModal__chatStateText">
                        {selectedThread.messages.some((message) => message.kind === "REPLY")
                          ? "Megna Team replied in this thread. Keep the conversation here for follow-up."
                          : selectedThread.pendingCount > 0
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
