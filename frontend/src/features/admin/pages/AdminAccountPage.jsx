import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { updateAdminCredentials } from "@/api";
import { useAuth } from "@/features/auth";
import { getPasswordStrength } from "@/shared/utils/passwordStrength";
import "@/features/admin/pages/AdminAccountPage.css";

const SIGN_OUT_DELAY_MS = 1400;

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export default function AdminAccountPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: user?.email ?? "",
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const email = form.email.trim().toLowerCase();
    const currentEmail = String(user?.email ?? "").trim().toLowerCase();
    const currentPassword = form.currentPassword;
    const newPassword = form.newPassword;

    if (!email) {
      setError("Enter the admin login email.");
      return;
    }

    if (currentPassword.length < 8) {
      setError("Current password must be at least 8 characters.");
      return;
    }

    if (!newPassword && email === currentEmail) {
      setError("Enter a new email or password.");
      return;
    }

    if (newPassword && newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword && newPassword === currentPassword) {
      setError("New password must be different from the current password.");
      return;
    }

    if (newPassword !== form.confirmNewPassword) {
      setError("New password and confirmation must match.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await updateAdminCredentials({
        email,
        currentPassword,
        newPassword: newPassword || null,
      });
      setForm((current) => ({
        ...current,
        email,
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      }));
      setSuccess("Credentials updated. Signing you out so you can use the new login.");
      await wait(SIGN_OUT_DELAY_MS);
      await signOut();
      navigate("/login", { replace: true });
    } catch (requestError) {
      setError(requestError?.message || "Failed to update admin credentials.");
    } finally {
      setSaving(false);
    }
  }

  const passwordStrength = getPasswordStrength(form.newPassword);

  return (
    <section className="adminAccount">
      <header className="adminAccount__header">
        <p className="adminAccount__eyebrow">Security</p>
        <h1 className="adminAccount__title">Admin account</h1>
        <p className="adminAccount__intro">
          Change the email used to sign in and optionally set a new password.
        </p>
      </header>

      <div className="adminAccount__grid">
        <form className="adminAccount__card" onSubmit={handleSubmit}>
          <div className="adminAccount__cardHeader">
            <div>
              <h2 className="adminAccount__cardTitle">Login credentials</h2>
              <p className="adminAccount__cardText">
                Confirm this change with the current admin password.
              </p>
            </div>
            <span className="material-symbols-outlined adminAccount__cardIcon" aria-hidden="true">
              shield_lock
            </span>
          </div>

          <div className="adminAccount__fields">
            <label className="adminAccount__field">
              <span>Admin email</span>
              <input
                type="email"
                autoComplete="username"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                maxLength={255}
                required
                disabled={saving || Boolean(success)}
              />
            </label>

            <label className="adminAccount__field">
              <span>Current password</span>
              <input
                type="password"
                autoComplete="current-password"
                value={form.currentPassword}
                onChange={(event) => updateField("currentPassword", event.target.value)}
                minLength={8}
                maxLength={255}
                required
                disabled={saving || Boolean(success)}
              />
            </label>

            <label className="adminAccount__field">
              <span>New password <small>Optional</small></span>
              <input
                type="password"
                autoComplete="new-password"
                value={form.newPassword}
                onChange={(event) => updateField("newPassword", event.target.value)}
                minLength={8}
                maxLength={255}
                placeholder="Leave blank to keep the current password"
                disabled={saving || Boolean(success)}
              />
            </label>

            {passwordStrength ? (
              <p className={`adminAccount__strength adminAccount__strength--${passwordStrength}`}>
                Password strength: {passwordStrength}
              </p>
            ) : null}

            <label className="adminAccount__field">
              <span>Confirm new password</span>
              <input
                type="password"
                autoComplete="new-password"
                value={form.confirmNewPassword}
                onChange={(event) => updateField("confirmNewPassword", event.target.value)}
                minLength={form.newPassword ? 8 : undefined}
                maxLength={255}
                disabled={saving || Boolean(success) || !form.newPassword}
              />
            </label>
          </div>

          {error ? (
            <p className="adminAccount__message adminAccount__message--error" role="alert">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="adminAccount__message adminAccount__message--success" role="status">
              {success}
            </p>
          ) : null}

          <button
            className="adminAccount__submit"
            type="submit"
            disabled={saving || Boolean(success)}
          >
            {saving ? "Updating credentials..." : "Update credentials"}
          </button>
        </form>

        <aside className="adminAccount__notice">
          <span className="material-symbols-outlined" aria-hidden="true">devices</span>
          <div>
            <h2>All sessions will end</h2>
            <p>
              Saving revokes every active admin session on every device. Sign in again with the
              updated email and password.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
