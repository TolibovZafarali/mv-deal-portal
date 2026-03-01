import { useEffect, useState } from "react";
import { getSellerById, updateSeller } from "@/api/modules/sellerApi";
import { useAuth } from "@/features/auth";
import "@/features/seller/pages/SellerProfilePage.css";

export default function SellerProfilePage() {
  const { user } = useAuth();
  const sellerId = user?.sellerId;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

  useEffect(() => {
    if (!sellerId) return;

    let alive = true;

    async function load() {
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
        setError(nextError?.message || "Failed to load profile.");
        setProfile(null);
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, [sellerId]);

  async function save() {
    if (!sellerId) return;

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
      setSaveSuccess("Profile updated.");
    } catch (nextError) {
      setSaveError(nextError?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="sellerProfile">
      <header>
        <h2>Seller Profile</h2>
      </header>

      {!sellerId ? <div className="sellerProfile__notice">Missing seller identity. Log in again.</div> : null}
      {loading ? <div className="sellerProfile__notice">Loading profile...</div> : null}
      {error ? <div className="sellerProfile__error">{error}</div> : null}

      {!loading && !error && profile ? (
        <div className="sellerProfile__card">
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
            <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </label>

          <label>
            Phone
            <input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>

          {saveError ? <div className="sellerProfile__error">{saveError}</div> : null}
          {saveSuccess ? <div className="sellerProfile__success">{saveSuccess}</div> : null}

          <div className="sellerProfile__actions">
            <button type="button" onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
