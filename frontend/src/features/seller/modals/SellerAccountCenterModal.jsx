import { useCallback, useEffect, useMemo, useState } from "react";
import { changePassword } from "@/api/modules/authApi";
import { getSellerById, updateSeller } from "@/api/modules/sellerApi";
import { useAuth } from "@/features/auth";
import { getPasswordStrength } from "@/shared/utils/passwordStrength";
import "@/features/investor/modals/InvestorAccountCenterModal.css";

const PROFILE_VIEW = "profile";
const SECURITY_VIEW = "security";
const NOTIFICATION_VIEW = "notification";
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
  { key: NOTIFICATION_VIEW, label: "Notification", icon: "notifications" },
];

function cleanString(value) {
  return String(value ?? "").trim();
}

function profileFromSeller(seller) {
  const email = seller?.email ?? "";
  return {
    firstName: seller?.firstName ?? "",
    lastName: seller?.lastName ?? "",
    email,
    notificationEmail: seller?.notificationEmail ?? email,
    phone: seller?.phone ?? "",
    companyName: seller?.companyName ?? "",
  };
}

export default function SellerAccountCenterModal({
  open,
  view,
  onClose,
  onChangeView,
}) {
  const { user, signOut } = useAuth();
  const sellerId = user?.sellerId;
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

  const isProfileView = view === PROFILE_VIEW;
  const isSecurityView = view === SECURITY_VIEW;
  const isNotificationView = view === NOTIFICATION_VIEW;
  const securityPasswordStrength = useMemo(
    () => getPasswordStrength(securityForm.newPassword),
    [securityForm.newPassword],
  );
  const missingSeller = !sellerId;

  const resetModalState = useCallback(() => {
    setProfileEditing(false);
    setProfileSaveError("");
    setProfileSaveOk("");
    setNotificationEditing(false);
    setNotificationSaveError("");
    setNotificationSaveOk("");
    setSecurityForm({
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    });
    setSecurityEditing(false);
    setSecuritySaving(false);
    setSecurityError("");
    setSecurityOk("");
  }, []);

  const handleClose = useCallback(() => {
    resetModalState();
    onClose?.();
  }, [onClose, resetModalState]);

  useEffect(() => {
    if (!open) return undefined;

    function onKeyDown(event) {
      if (event.key === "Escape") handleClose();
    }

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, handleClose]);

  useEffect(() => {
    if (!open || !sellerId) return;
    let alive = true;

    async function loadProfile() {
      setProfileLoading(true);
      setProfileError("");
      setProfileSaveError("");
      setProfileSaveOk("");
      setNotificationSaveError("");
      setNotificationSaveOk("");

      try {
        const seller = await getSellerById(sellerId);
        if (!alive) return;
        const nextProfile = profileFromSeller(seller);
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
  }, [open, sellerId]);

  async function handleProfileSave(event) {
    event.preventDefault();
    if (!sellerId) return;

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
      const updated = await updateSeller(sellerId, { companyName, phone, notificationEmail });
      const nextProfile = profileFromSeller(updated);
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
    if (!sellerId) return;

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
      const updated = await updateSeller(sellerId, { companyName, phone, notificationEmail });
      const nextProfile = profileFromSeller(updated);
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

  return (
    <div
      className={`invAccountBackdrop ${open ? "invAccountBackdrop--open" : "invAccountBackdrop--closed"}`.trim()}
      role="dialog"
      aria-modal="true"
      aria-label="Account"
      aria-hidden={!open}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) handleClose();
      }}
    >
      <div className="invAccountModal">
        <div className="invAccountModal__left">
          <div className="invAccountModal__accountHead">
            <h2 className="invAccountModal__title">Account</h2>
            <button
              type="button"
              className="invAccountModal__accountHeadClose"
              aria-label="Close account"
              onClick={handleClose}
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
                handleClose();
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
              handleClose();
              signOut?.();
            }}
          >
            <span className="material-symbols-outlined invAccountModal__logoutIcon" aria-hidden="true">
              logout
            </span>
            <span>Log out</span>
          </button>
        </div>

        <div className="invAccountModal__right">
          <button
            className="invAccountModal__close"
            type="button"
            aria-label="Close account"
            onClick={handleClose}
          >
            ✕
          </button>

          {missingSeller ? (
            <div className="invAccountModal__notice invAccountModal__notice--error">
              Missing seller identity. Please log out and log in again.
            </div>
          ) : null}

          {!missingSeller && isProfileView ? (
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

          {!missingSeller && isSecurityView ? (
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

          {!missingSeller && isNotificationView ? (
            <section className="invAccountModal__panel" aria-label="Notification">
              <h3 className="invAccountModal__panelTitle">Notification</h3>
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
        </div>
      </div>
    </div>
  );
}
