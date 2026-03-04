import { useCallback, useEffect, useState } from "react";
import { Link, Outlet, useSearchParams } from "react-router-dom";
import { useAuth } from "@/features/auth";
import InvestorAccountCenterModal from "@/features/investor/modals/InvestorAccountCenterModal";
import "@/features/investor/layout/InvestorLayout.css";

const PROFILE_VIEW = "profile";
const MESSAGES_VIEW = "messages";

export default function InvestorLayout() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialAccountParam = searchParams.get("account");
  const initialAccountOpen = initialAccountParam === PROFILE_VIEW || initialAccountParam === MESSAGES_VIEW;
  const initialAccountView = initialAccountParam === MESSAGES_VIEW ? MESSAGES_VIEW : PROFILE_VIEW;

  const [accountOpen, setAccountOpen] = useState(initialAccountOpen);
  const [accountView, setAccountView] = useState(initialAccountView);
  const [propertyDetailsOpener, setPropertyDetailsOpener] = useState(null);
  const [messagesListScrollTop, setMessagesListScrollTop] = useState(null);

  useEffect(() => {
    const accountParam = searchParams.get("account");
    if (accountParam === PROFILE_VIEW || accountParam === MESSAGES_VIEW) {
      setAccountView(accountParam === MESSAGES_VIEW ? MESSAGES_VIEW : PROFILE_VIEW);
      setAccountOpen(true);
      return;
    }
    setAccountOpen(false);
  }, [searchParams]);

  const setAccountQuery = useCallback(
    (nextView) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (nextView === PROFILE_VIEW || nextView === MESSAGES_VIEW) {
          next.set("account", nextView);
        } else {
          next.delete("account");
        }
        return next;
      }, { replace: true });
    },
    [setSearchParams],
  );

  function openAccount(view) {
    setAccountView(view);
    if (view === MESSAGES_VIEW) {
      setMessagesListScrollTop(null);
    }
    setAccountOpen(true);
    setAccountQuery(view);
  }

  const openMessagesModal = useCallback(() => {
    setAccountView(MESSAGES_VIEW);
    setAccountOpen(true);
    setAccountQuery(MESSAGES_VIEW);
  }, [setAccountQuery]);

  const closeAccount = useCallback(() => {
    setAccountOpen(false);
    setAccountQuery(null);
  }, [setAccountQuery]);

  const handleViewPropertyDetails = useCallback(
    (payload) => {
      const propertyId = typeof payload === "object" && payload !== null
        ? payload.propertyId
        : payload;
      const propertyListScrollTop = typeof payload === "object" && payload !== null
        ? Number(payload.propertyListScrollTop)
        : null;

      if (Number.isFinite(propertyListScrollTop) && propertyListScrollTop >= 0) {
        setMessagesListScrollTop(propertyListScrollTop);
      }
      if (typeof propertyDetailsOpener !== "function") return;
      propertyDetailsOpener(propertyId);
      setAccountOpen(false);
      setAccountQuery(null);
    },
    [propertyDetailsOpener, setAccountQuery],
  );

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
            onClick={() => openAccount(MESSAGES_VIEW)}
          >
            <span className="material-symbols-outlined investorHeader__actionIcon" aria-hidden="true">
              forum
            </span>
            Messages
          </button>
          <button
            className="investorHeader__actionBtn"
            type="button"
            onClick={() => openAccount(PROFILE_VIEW)}
          >
            <span className="material-symbols-outlined investorHeader__actionIcon" aria-hidden="true">
              person
            </span>
            Profile
          </button>
        </div>
      </header>

      <main className="investorMain">
        <Outlet context={{ setPropertyDetailsOpener, openMessagesModal }} />
      </main>

      <InvestorAccountCenterModal
        open={accountOpen}
        view={accountView}
        onClose={closeAccount}
        investorId={user?.investorId}
        onViewPropertyDetails={handleViewPropertyDetails}
        restorePropertyListScrollTop={messagesListScrollTop}
      />
    </div>
  );
}
