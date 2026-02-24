import { useEffect, useMemo, useState } from "react";
import { getInquiryByInvestor } from "../api/inquiryApi";
import { getInvestorById, updateInvestor } from "../api/investorApi";
import { getPropertyId } from "../api/propertyApi";
import "./InvestorAccountCenterModal.css";

const PROFILE_TAB = "profile";
const INQUIRIES_TAB = "inquiries";

function cleanString(value) {
  return String(value ?? "").trim();
}

function prettyDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}

function messagePreview(value) {
  const text = cleanString(value);
  if (!text) return "—";
  if (text.length <= 72) return text;
  return `${text.slice(0, 69)}...`;
}

function propertyAddress(property) {
  if (!property) return "";
  const line1 = [property.street1, property.street2].filter(Boolean).join(", ");
  return [line1, property.city, property.state, property.zip].filter(Boolean).join(", ");
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
  activeTab,
  onTabChange,
  onClose,
  onLogout,
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
  const [propertyAddressById, setPropertyAddressById] = useState({});

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
    if (!open || !investorId) return;
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
  }, [open, investorId]);

  useEffect(() => {
    if (!open || activeTab !== INQUIRIES_TAB || !investorId) return;
    let alive = true;

    async function loadInquiries() {
      setInquiryLoading(true);
      setInquiryError("");
      setPropertyAddressById({});

      try {
        const response = await getInquiryByInvestor(investorId, {
          page: 0,
          size: 100,
          sort: "createdAt,desc",
        });

        if (!alive) return;

        const nextInquiries = Array.isArray(response?.content) ? response.content : [];
        setInquiries(nextInquiries);

        const ids = [...new Set(nextInquiries.map((inquiry) => inquiry.propertyId).filter(Boolean))];
        if (!ids.length) return;

        const addressEntries = await Promise.allSettled(
          ids.map(async (id) => {
            const property = await getPropertyId(id);
            return [id, propertyAddress(property)];
          }),
        );

        if (!alive) return;

        const nextAddressById = {};
        addressEntries.forEach((entry) => {
          if (entry.status === "fulfilled") {
            const [id, address] = entry.value;
            nextAddressById[id] = cleanString(address) || `Property #${id}`;
          }
        });
        setPropertyAddressById(nextAddressById);
      } catch (error) {
        if (!alive) return;
        setInquiries([]);
        setPropertyAddressById({});
        setInquiryError(error?.message || "Failed to load inquiries.");
      } finally {
        if (alive) setInquiryLoading(false);
      }
    }

    loadInquiries();
    return () => {
      alive = false;
    };
  }, [open, activeTab, investorId]);

  const activeInquiries = useMemo(
    () => inquiries.filter((inquiry) => inquiry.emailStatus !== "SENT"),
    [inquiries],
  );
  const respondedInquiries = useMemo(
    () => inquiries.filter((inquiry) => inquiry.emailStatus === "SENT"),
    [inquiries],
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

  function resolveInquiryAddress(inquiry) {
    const id = inquiry?.propertyId;
    return propertyAddressById[id] || `Property #${id ?? "—"}`;
  }

  return (
    <div
      className="invAccountBackdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Account Center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div className="invAccountModal">
        <div className="invAccountModal__left">
          <h2 className="invAccountModal__title">Account Center</h2>

          <div className="invAccountModal__tabs" role="tablist" aria-label="Account tabs">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === PROFILE_TAB}
              className={`invAccountModal__tab ${
                activeTab === PROFILE_TAB ? "invAccountModal__tab--active" : ""
              }`}
              onClick={() => onTabChange(PROFILE_TAB)}
            >
              Profile
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === INQUIRIES_TAB}
              className={`invAccountModal__tab ${
                activeTab === INQUIRIES_TAB ? "invAccountModal__tab--active" : ""
              }`}
              onClick={() => onTabChange(INQUIRIES_TAB)}
            >
              Inquiries
            </button>
          </div>

          <div className="invAccountModal__leftBottom">
            <button type="button" className="invAccountModal__logout" onClick={onLogout}>
              Log Out
            </button>
          </div>
        </div>

        <div className="invAccountModal__right">
          <button
            className="invAccountModal__close"
            type="button"
            aria-label="Close account center"
            onClick={onClose}
          >
            ✕
          </button>

          {missingInvestor ? (
            <div className="invAccountModal__notice invAccountModal__notice--error">
              Missing investor identity. Please log out and log in again.
            </div>
          ) : null}

          {!missingInvestor && activeTab === PROFILE_TAB ? (
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

          {!missingInvestor && activeTab === INQUIRIES_TAB ? (
            <section className="invAccountModal__panel" aria-label="Inquiries">
              <h3 className="invAccountModal__panelTitle">Inquiries</h3>

              {inquiryLoading ? <div className="invAccountModal__notice">Loading inquiries...</div> : null}
              {!inquiryLoading && inquiryError ? (
                <div className="invAccountModal__notice invAccountModal__notice--error">
                  {inquiryError}
                </div>
              ) : null}

              {!inquiryLoading && !inquiryError ? (
                <div className="invAccountModal__inquiries">
                  <div className="invAccountModal__group">
                    <h4>Active</h4>
                    {activeInquiries.length === 0 ? (
                      <div className="invAccountModal__empty">No active inquiries.</div>
                    ) : (
                      <div className="invAccountModal__rows">
                        <div className="invAccountModal__row invAccountModal__row--head">
                          <span>Property Address</span>
                          <span>Subject</span>
                          <span>Message</span>
                          <span>Time</span>
                        </div>
                        {activeInquiries.map((inquiry) => (
                          <div className="invAccountModal__row" key={inquiry.id}>
                            <span>{resolveInquiryAddress(inquiry)}</span>
                            <span>{cleanString(inquiry.subject) || "—"}</span>
                            <span>{messagePreview(inquiry.messageBody)}</span>
                            <span>{prettyDateTime(inquiry.createdAt)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="invAccountModal__group">
                    <h4>Responded (check email)</h4>
                    {respondedInquiries.length === 0 ? (
                      <div className="invAccountModal__empty">No responded inquiries.</div>
                    ) : (
                      <div className="invAccountModal__rows">
                        <div className="invAccountModal__row invAccountModal__row--head">
                          <span>Property Address</span>
                          <span>Subject</span>
                          <span>Message</span>
                          <span>Time</span>
                        </div>
                        {respondedInquiries.map((inquiry) => (
                          <div className="invAccountModal__row" key={inquiry.id}>
                            <span>{resolveInquiryAddress(inquiry)}</span>
                            <span>{cleanString(inquiry.subject) || "—"}</span>
                            <span>{messagePreview(inquiry.messageBody)}</span>
                            <span>{prettyDateTime(inquiry.createdAt)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
