import { useCallback, useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { getSellerDashboardSummary } from "@/api/modules/sellerDashboardApi";
import SellerAccountCenterModal from "@/features/seller/modals/SellerAccountCenterModal";
import "@/features/seller/layout/SellerLayout.css";

const PROFILE_VIEW = "profile";
const SECURITY_VIEW = "security";
const NOTIFICATION_VIEW = "notification";
const ACCOUNT_VIEWS = new Set([PROFILE_VIEW, SECURITY_VIEW, NOTIFICATION_VIEW]);

export default function SellerLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isListingsRoute = /^\/seller\/listings\/?$/.test(location.pathname);

  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountView, setAccountView] = useState(PROFILE_VIEW);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const next = await getSellerDashboardSummary();
      setSummary(next || null);
    } catch {
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary, location.pathname]);

  const statusRail = useMemo(() => {
    const drafts = Number(summary?.drafts ?? 0);
    const underReview = Number(summary?.submitted ?? 0);
    const published = Number(summary?.published ?? 0);

    return {
      drafts,
      underReview,
      published,
    };
  }, [summary]);

  function openAccount(view = PROFILE_VIEW) {
    if (ACCOUNT_VIEWS.has(view)) {
      setAccountView(view);
    } else {
      setAccountView(PROFILE_VIEW);
    }
    setAccountOpen(true);
  }

  function closeAccount() {
    setAccountOpen(false);
  }

  return (
    <div className="sellerShellV2">
      <header className="sellerTop">
        <div className="sellerTop__bar">
          <div className="sellerTop__left">
            <img src="/white-logo.svg" alt="Megna" className="sellerBrand__logo" />
          </div>

          <div className="sellerTop__center">
            <span className="sellerBrand__label">SELLER PORTAL</span>
          </div>

          <div className="sellerTop__right">
            <button
              type="button"
              className="sellerTop__addBtn"
              onClick={() => navigate("/seller/listings?new=1")}
            >
              <span className="material-symbols-outlined sellerTop__addIcon" aria-hidden="true">add_home</span>
              <span className="sellerTop__addLabel">Add Property</span>
            </button>
            <button
              type="button"
              className="sellerTop__accountBtn"
              aria-label="Account"
              onClick={() => openAccount(PROFILE_VIEW)}
            >
              <span className="material-symbols-outlined sellerTop__accountIcon" aria-hidden="true">person</span>
              <span className="sellerTop__accountLabel">Account</span>
            </button>
          </div>
        </div>

        <div className="sellerRail" aria-live="polite">
          <div className="sellerRail__item">
            <span className="sellerRail__label">Draft</span>
            <span className="sellerRail__value">{summaryLoading ? "…" : statusRail.drafts}</span>
          </div>
          <div className="sellerRail__item">
            <span className="sellerRail__label">Under Review</span>
            <span className="sellerRail__value">{summaryLoading ? "…" : statusRail.underReview}</span>
          </div>
          <div className="sellerRail__item">
            <span className="sellerRail__label">Published</span>
            <span className="sellerRail__value">{summaryLoading ? "…" : statusRail.published}</span>
          </div>
        </div>
      </header>

      <main className={`sellerMainV2${isListingsRoute ? " sellerMainV2--lists" : ""}`}>
        <Outlet context={{ dashboardSummary: summary, refreshDashboardSummary: loadSummary, summaryLoading }} />
      </main>

      <SellerAccountCenterModal
        open={accountOpen}
        view={accountView}
        onClose={closeAccount}
        onChangeView={(nextView) => {
          if (!ACCOUNT_VIEWS.has(nextView)) return;
          setAccountView(nextView);
        }}
      />
    </div>
  );
}
