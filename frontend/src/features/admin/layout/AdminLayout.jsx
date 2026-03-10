import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/features/auth";
import useAdminQueue from "@/features/admin/hooks/useAdminQueue";
import "@/features/admin/layout/AdminLayout.css";

const ADMIN_SIDEBAR_COLLAPSED_KEY = "adminSidebarCollapsed";
const ADMIN_SIDEBAR_WIDTH_EXPANDED = "320px";
const ADMIN_SIDEBAR_WIDTH_COLLAPSED = "88px";
const ADMIN_MOBILE_BREAKPOINT_QUERY = "(max-width: 980px)";

export default function AdminLayout() {
  const { signOut } = useAuth();
  const { counts } = useAdminQueue({ includeItems: false });
  const [isMobileView, setIsMobileView] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(ADMIN_MOBILE_BREAKPOINT_QUERY).matches;
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(ADMIN_SIDEBAR_COLLAPSED_KEY) === "1";
  });
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const effectiveSidebarCollapsed = !isMobileView && sidebarCollapsed;

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const media = window.matchMedia(ADMIN_MOBILE_BREAKPOINT_QUERY);
    const handleMediaChange = (event) => setIsMobileView(event.matches);
    const supportsModernListener = typeof media.addEventListener === "function";

    if (supportsModernListener) {
      media.addEventListener("change", handleMediaChange);
    } else {
      media.addListener(handleMediaChange);
    }

    return () => {
      if (supportsModernListener) {
        media.removeEventListener("change", handleMediaChange);
        return;
      }
      media.removeListener(handleMediaChange);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isMobileView) return;
    window.localStorage.setItem(ADMIN_SIDEBAR_COLLAPSED_KEY, sidebarCollapsed ? "1" : "0");
  }, [isMobileView, sidebarCollapsed]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    document.body.classList.add("mv-admin-layout");
    document.body.style.setProperty(
      "--mv-admin-sidebar-width",
      isMobileView
        ? "0px"
        : effectiveSidebarCollapsed
          ? ADMIN_SIDEBAR_WIDTH_COLLAPSED
          : ADMIN_SIDEBAR_WIDTH_EXPANDED,
    );

    return () => {
      document.body.classList.remove("mv-admin-layout");
      document.body.style.removeProperty("--mv-admin-sidebar-width");
    };
  }, [effectiveSidebarCollapsed, isMobileView]);

  const badges = {
    properties: counts.draftProperties,
    investors: counts.pendingInvestors,
    inquiries: counts.unrepliedInquiries,
  };

  function handleLogoutIntent() {
    setLogoutConfirmOpen(true);
  }

  function handleLogoutCancel() {
    setLogoutConfirmOpen(false);
  }

  function handleLogoutConfirm() {
    setLogoutConfirmOpen(false);
    signOut();
  }

  useEffect(() => {
    if (!logoutConfirmOpen) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") setLogoutConfirmOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [logoutConfirmOpen]);

  return (
    <div className={`adminShell ${effectiveSidebarCollapsed ? "adminShell--collapsed" : ""}`}>
      <aside className={`adminSidebar ${effectiveSidebarCollapsed ? "adminSidebar--collapsed" : ""}`}>
        <div className="adminBrand">
          <Link className="adminBrand__home" to="/" aria-label="Go to homepage">
            <img className="adminBrand__logo" src="/white-logo.svg" alt="Admin Portal" />
          </Link>
          <button
            className="adminBrand__collapse"
            type="button"
            disabled={isMobileView}
            onClick={() => setSidebarCollapsed((prev) => !prev)}
            aria-label={effectiveSidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
            title={effectiveSidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
          >
            <span className="material-symbols-outlined">
              {effectiveSidebarCollapsed ? "chevron_right" : "chevron_left"}
            </span>
          </button>
        </div>

        <nav className="adminNav" aria-label="Admin navigation">
          <NavLink
            to="properties"
            className={({ isActive }) =>
              `adminNav__link ${isActive ? "adminNav__link--active" : ""}`
            }
            aria-label="Properties"
          >
            <span className="adminNav__content">
              <span className="adminNav__label">Properties</span>
              {badges.properties > 0 ? <span className="adminNav__badge">{badges.properties}</span> : null}
              <span className="adminNav__icon material-symbols-outlined" aria-hidden="true">home_work</span>
            </span>
          </NavLink>
          <NavLink
            to="investors"
            className={({ isActive }) =>
              `adminNav__link ${isActive ? "adminNav__link--active" : ""}`
            }
            aria-label="Investors"
          >
            <span className="adminNav__content">
              <span className="adminNav__label">Investors</span>
              {badges.investors > 0 ? <span className="adminNav__badge">{badges.investors}</span> : null}
              <span className="adminNav__icon material-symbols-outlined" aria-hidden="true">groups</span>
            </span>
          </NavLink>
          <NavLink
            to="sellers"
            className={({ isActive }) =>
              `adminNav__link ${isActive ? "adminNav__link--active" : ""}`
            }
            aria-label="Sellers"
          >
            <span className="adminNav__content">
              <span className="adminNav__label">Sellers</span>
              <span className="adminNav__icon material-symbols-outlined" aria-hidden="true">storefront</span>
            </span>
          </NavLink>
          <NavLink
            to="inquiries"
            className={({ isActive }) =>
              `adminNav__link ${isActive ? "adminNav__link--active" : ""}`
            }
            aria-label="Inquiries"
          >
            <span className="adminNav__content">
              <span className="adminNav__label">Inquiries</span>
              {badges.inquiries > 0 ? <span className="adminNav__badge">{badges.inquiries}</span> : null}
              <span className="adminNav__icon material-symbols-outlined" aria-hidden="true">mail</span>
            </span>
          </NavLink>
        </nav>

        <div className="adminSidebar__spacer" />

        <button className="adminLogout" type="button" onClick={handleLogoutIntent} aria-label="Log out">
          <span className="adminLogout__content">
            <span className="adminLogout__label">Log out</span>
            <span className="adminLogout__icon material-symbols-outlined" aria-hidden="true">logout</span>
          </span>
        </button>
      </aside>

      <main className="adminMain">
        <Outlet context={{ sidebarCollapsed: effectiveSidebarCollapsed }} />
      </main>

      {logoutConfirmOpen ? (
        <div className="adminLogoutAuthOverlay" onMouseDown={handleLogoutCancel}>
          <div
            className="adminLogoutAuthModal"
            role="dialog"
            aria-modal="true"
            aria-label="Log out dialog"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="adminLogoutAuthModal__header">
              <h2 className="adminLogoutAuthModal__title">Log out</h2>
              <button
                type="button"
                className="adminLogoutAuthModal__close"
                onClick={handleLogoutCancel}
                aria-label="Close log out dialog"
              >
                ✕
              </button>
            </div>

            <div className="adminLogoutAuthModal__body">
              <p className="adminLogoutAuthModal__text">
                Are you sure you want to log out?
              </p>

              <div className="adminLogoutAuthModal__actions">
                <button
                  type="button"
                  className="adminLogoutAuthModal__btn adminLogoutAuthModal__btn--secondary"
                  onClick={handleLogoutCancel}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="adminLogoutAuthModal__btn adminLogoutAuthModal__btn--danger"
                  onClick={handleLogoutConfirm}
                >
                  Log out
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
