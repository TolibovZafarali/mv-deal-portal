import { useCallback, useState } from "react";
import { Link, Outlet, useSearchParams } from "react-router-dom";
import { useAuth } from "@/features/auth";
import InvestorAccountCenterModal from "@/features/investor/modals/InvestorAccountCenterModal";
import "@/features/investor/layout/InvestorLayout.css";

const PROFILE_VIEW = "profile";
const MESSAGES_VIEW = "messages";

function normalizePropertyId(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return numeric;
}

export default function InvestorLayout() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const accountParam = searchParams.get("account");
  const accountOpen = accountParam === PROFILE_VIEW || accountParam === MESSAGES_VIEW;
  const accountView = accountParam === MESSAGES_VIEW ? MESSAGES_VIEW : PROFILE_VIEW;
  const [propertyDetailsOpener, setPropertyDetailsOpener] = useState(null);
  const [messagesListScrollTop, setMessagesListScrollTop] = useState(null);
  const [messagesSelectedPropertyId, setMessagesSelectedPropertyId] = useState(null);

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
    if (view === MESSAGES_VIEW) {
      setMessagesListScrollTop(null);
      setMessagesSelectedPropertyId(null);
    }
    setAccountQuery(view);
  }

  const openMessagesModal = useCallback((payload = null) => {
    const propertyId = typeof payload === "object" && payload !== null
      ? normalizePropertyId(payload.propertyId)
      : normalizePropertyId(payload);
    setMessagesSelectedPropertyId(propertyId);
    setAccountQuery(MESSAGES_VIEW);
  }, [setAccountQuery]);

  const closeAccount = useCallback(() => {
    setMessagesSelectedPropertyId(null);
    setAccountQuery(null);
  }, [setAccountQuery]);

  const handleViewPropertyDetails = useCallback(
    (payload) => {
      const propertyId = typeof payload === "object" && payload !== null
        ? payload.propertyId
        : payload;
      const normalizedPropertyId = normalizePropertyId(propertyId);
      const propertyListScrollTop = typeof payload === "object" && payload !== null
        ? Number(payload.propertyListScrollTop)
        : null;

      if (Number.isFinite(propertyListScrollTop) && propertyListScrollTop >= 0) {
        setMessagesListScrollTop(propertyListScrollTop);
      }
      if (normalizedPropertyId !== null) {
        setMessagesSelectedPropertyId(normalizedPropertyId);
      }
      if (typeof propertyDetailsOpener !== "function") return;
      propertyDetailsOpener(normalizedPropertyId ?? propertyId);
      setAccountQuery(null);
    },
    [propertyDetailsOpener, setAccountQuery],
  );

  return (
    <div className="investorShell">
      <header className="investorHeader">
        <Link to="/" className="investorBrand" aria-label="Megna homepage">
          <img src="/white-logo.svg" alt="Megna" className="investorBrand__logo" />
        </Link>

        <div className="investorHeader__actions">
          <button
            className="investorHeader__actionBtn"
            type="button"
            aria-label="Messages"
            onClick={() => openAccount(MESSAGES_VIEW)}
          >
            <span className="material-symbols-outlined investorHeader__actionIcon" aria-hidden="true">
              forum
            </span>
            <span className="investorHeader__actionLabel">Messages</span>
          </button>
          <button
            className="investorHeader__actionBtn"
            type="button"
            aria-label="Profile"
            onClick={() => openAccount(PROFILE_VIEW)}
          >
            <span className="material-symbols-outlined investorHeader__actionIcon" aria-hidden="true">
              person
            </span>
            <span className="investorHeader__actionLabel">Profile</span>
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
        preferredPropertyId={messagesSelectedPropertyId}
      />
    </div>
  );
}
