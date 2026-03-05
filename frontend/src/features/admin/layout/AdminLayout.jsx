import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth";
import useAdminQueue from "@/features/admin/hooks/useAdminQueue";
import "@/features/admin/layout/AdminLayout.css";

const ADMIN_SIDEBAR_COLLAPSED_KEY = "adminSidebarCollapsed";
const ADMIN_SIDEBAR_WIDTH_EXPANDED = "320px";
const ADMIN_SIDEBAR_WIDTH_COLLAPSED = "88px";
const ADMIN_MOBILE_BREAKPOINT_QUERY = "(max-width: 980px)";

export default function AdminLayout() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { counts } = useAdminQueue({ includeItems: false });
  const [isMobileView, setIsMobileView] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(ADMIN_MOBILE_BREAKPOINT_QUERY).matches;
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(ADMIN_SIDEBAR_COLLAPSED_KEY) === "1";
  });
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
    inquiries: counts.failedInquiries,
  };

  function handleLogout() {
    signOut();
    navigate("/", { replace: true })
  }

  return (
    <div className={`adminShell ${effectiveSidebarCollapsed ? "adminShell--collapsed" : ""}`}>
      <aside className={`adminSidebar ${effectiveSidebarCollapsed ? "adminSidebar--collapsed" : ""}`}>
        <div className="adminBrand">
          <span className="adminBrand__label">ADMIN PORTAL</span>
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

        <button className="adminLogout" type="button" onClick={handleLogout} aria-label="Log Out">
          <span className="adminLogout__content">
            <span className="adminLogout__label">Log Out</span>
            <span className="adminLogout__icon material-symbols-outlined" aria-hidden="true">logout</span>
          </span>
        </button>
      </aside>

      <main className="adminMain">
        <Outlet context={{ sidebarCollapsed: effectiveSidebarCollapsed }} />
      </main>
    </div>
  );
}
