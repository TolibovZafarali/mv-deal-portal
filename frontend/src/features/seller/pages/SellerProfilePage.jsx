import { useEffect, useState } from "react";
import { getSellerById, updateSeller } from "@/api/modules/sellerApi";
import { useAuth } from "@/features/auth";
import { startSellerTimer, trackSellerEvent } from "@/features/seller/utils/sellerTelemetry";
import "@/features/seller/pages/SellerProfilePage.css";

export default function SellerProfilePage() {
  const { user } = useAuth();
  const sellerId = user?.sellerId;

  const [profile, setProfile] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

  useEffect(() => {
    if (!sellerId) return;

    let alive = true;

    async function loadProfile() {
      setLoading(true);
      setError("");
      try {
        const data = await getSellerById(sellerId);
        if (!alive) return;

        setProfile(data);
        setCompanyName(data?.companyName ?? "");
        setPhone(data?.phone ?? "");
      } catch (nextError) {
        if (!alive) return;
        setError(nextError?.message || "Failed to load seller profile.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadProfile();
    return () => {
      alive = false;
    };
  }, [sellerId]);

  async function saveProfile() {
    if (!sellerId) return;

    const stopTimer = startSellerTimer("seller.profile.save", { sellerId });

    setSaving(true);
    setSaveError("");
    setSaveSuccess("");

    try {
      const updated = await updateSeller(sellerId, {
        companyName: String(companyName ?? "").trim(),
        phone: String(phone ?? "").trim(),
      });

      setProfile(updated);
      setCompanyName(updated?.companyName ?? "");
      setPhone(updated?.phone ?? "");
      setSaveSuccess("Business profile updated.");
      stopTimer("success");
      trackSellerEvent("seller.profile.save.success", { sellerId });
    } catch (nextError) {
      setSaveError(nextError?.message || "Failed to save profile.");
      stopTimer("error", { message: nextError?.message || "unknown" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="sellerProfileV2">
      <header className="sellerProfileV2__header">
        <h2>Profile</h2>
        <p>Manage your seller business identity and contact settings.</p>
      </header>

      {!sellerId ? <div className="sellerProfileV2__notice">Missing seller identity. Log in again.</div> : null}
      {loading ? <div className="sellerProfileV2__notice">Loading profile...</div> : null}
      {error ? <div className="sellerProfileV2__error">{error}</div> : null}

      {!loading && !error && profile ? (
        <>
          <section className="sellerProfileCard">
            <header className="sellerProfileCard__head">Business Profile</header>

            <div className="sellerProfileCard__grid">
              <label>
                First Name
                <input value={profile.firstName || ""} readOnly />
              </label>
              <label>
                Last Name
                <input value={profile.lastName || ""} readOnly />
              </label>
              <label>
                Email
                <input value={profile.email || ""} readOnly />
              </label>
              <label>
                Company Name
                <input value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
              </label>
              <label>
                Phone
                <input value={phone} onChange={(event) => setPhone(event.target.value)} />
              </label>
            </div>

            {saveError ? <div className="sellerProfileV2__error">{saveError}</div> : null}
            {saveSuccess ? <div className="sellerProfileV2__success">{saveSuccess}</div> : null}

            <div className="sellerProfileCard__actions">
              <button type="button" onClick={saveProfile} disabled={saving}>
                {saving ? "Saving..." : "Save Business Profile"}
              </button>
            </div>
          </section>

          <section className="sellerProfileCard">
            <header className="sellerProfileCard__head">Notification Preferences</header>
            <div className="sellerProfileCard__placeholder">
              Notification routing controls are reserved for the next release.
            </div>
          </section>

          <section className="sellerProfileCard">
            <header className="sellerProfileCard__head">Security</header>
            <div className="sellerProfileCard__placeholder">
              Password and security controls are available in the account flow and will move here in a future release.
            </div>
          </section>
        </>
      ) : null}
    </section>
  );
}
