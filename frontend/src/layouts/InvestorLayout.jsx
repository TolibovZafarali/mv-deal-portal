import { useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../auth";
import InvestorAccountCenterModal from "../modals/InvestorAccountCenterModal";
import "./InvestorLayout.css";

const PROFILE_TAB = "profile";
const INQUIRIES_TAB = "inquiries";

export default function InvestorLayout() {
  const { user } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(PROFILE_TAB);

  function openAccount(tab) {
    setActiveTab(tab);
    setAccountOpen(true);
  }

  return (
    <div className="investorShell">
      <header className="investorHeader">
        <Link to="/investor" className="investorBrand" aria-label="Megna Investor Dashboard">
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
        investorId={user?.investorId}
      />
    </div>
  );
}
