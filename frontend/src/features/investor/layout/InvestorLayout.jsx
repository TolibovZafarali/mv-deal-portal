import { useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth";
import InvestorAccountCenterModal from "@/features/investor/modals/InvestorAccountCenterModal";
import "@/features/investor/layout/InvestorLayout.css";

const PROFILE_TAB = "profile";
const INQUIRIES_TAB = "inquiries";

export default function InvestorLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [accountOpen, setAccountOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(PROFILE_TAB);

  function openAccount(tab) {
    setActiveTab(tab);
    setAccountOpen(true);
  }

  function handleLogout() {
    signOut();
    setAccountOpen(false);
    navigate("/", { replace: true });
  }

  return (
    <div className="investorShell">
      <header className="investorHeader">
        <Link to="/" className="investorBrand" aria-label="Megna homepage">
          <img src="/favicon.svg" alt="Megna" className="investorBrand__logo" />
        </Link>

        <div className="investorHeader__actions">
          <button
            className="investorHeader__actionBtn"
            type="button"
            onClick={() => openAccount(INQUIRIES_TAB)}
          >
            Inquiries
          </button>
          <button
            className="investorHeader__actionBtn"
            type="button"
            onClick={() => openAccount(PROFILE_TAB)}
          >
            Profile
          </button>
        </div>
      </header>

      <main className="investorMain">
        <Outlet />
      </main>

      <InvestorAccountCenterModal
        open={accountOpen}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onClose={() => setAccountOpen(false)}
        onLogout={handleLogout}
        investorId={user?.investorId}
      />
    </div>
  );
}
