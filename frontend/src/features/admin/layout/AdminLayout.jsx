import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth";
import useAdminQueue from "@/features/admin/hooks/useAdminQueue";
import "@/features/admin/layout/AdminLayout.css";

const ADMIN_SIDEBAR_COLLAPSED_KEY = "adminSidebarCollapsed";

export default function AdminLayout() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { counts } = useAdminQueue({ includeItems: false });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(ADMIN_SIDEBAR_COLLAPSED_KEY) === "1";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ADMIN_SIDEBAR_COLLAPSED_KEY, sidebarCollapsed ? "1" : "0");
  }, [sidebarCollapsed]);

  const badges = {
    queue: counts.submittedProperties + counts.openChangeRequests + counts.pendingInvestors,
    properties: counts.submittedProperties + counts.openChangeRequests,
    investors: counts.pendingInvestors,
    inquiries: counts.failedInquiries,
  };

  function handleLogout() {
    signOut();
    navigate("/", { replace: true })
  }

  return (
    <div className={`adminShell ${sidebarCollapsed ? "adminShell--collapsed" : ""}`}>
      <aside className={`adminSidebar ${sidebarCollapsed ? "adminSidebar--collapsed" : ""}`}>
        <div className="adminBrand">
          <button
            className="adminBrand__collapse"
            type="button"
            onClick={() => setSidebarCollapsed((prev) => !prev)}
            aria-label={sidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
            title={sidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
          >
            <span className="material-symbols-outlined">
              {sidebarCollapsed ? "chevron_right" : "chevron_left"}
            </span>
          </button>
        </div>

        <nav className="adminNav" aria-label="Admin navigation">
          <NavLink
            to="queue"
            className={({ isActive }) =>
              `adminNav__link ${isActive ? "adminNav__link--active" : ""}`
            }
            aria-label="Queue"
          >
            <span className="adminNav__content">
              <span className="adminNav__label">Queue</span>
              <span className="adminNav__icon material-symbols-outlined" aria-hidden="true">task_alt</span>
            </span>
            {badges.queue > 0 ? <span className="adminNav__badge">{badges.queue}</span> : null}
          </NavLink>
          <NavLink
            to="properties"
            className={({ isActive }) =>
              `adminNav__link ${isActive ? "adminNav__link--active" : ""}`
            }
            aria-label="Properties"
          >
            <span className="adminNav__content">
              <span className="adminNav__label">Properties</span>
              <span className="adminNav__icon material-symbols-outlined" aria-hidden="true">home_work</span>
            </span>
            {badges.properties > 0 ? <span className="adminNav__badge">{badges.properties}</span> : null}
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
              <span className="adminNav__icon material-symbols-outlined" aria-hidden="true">groups</span>
            </span>
            {badges.investors > 0 ? <span className="adminNav__badge">{badges.investors}</span> : null}
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
              <span className="adminNav__icon material-symbols-outlined" aria-hidden="true">mail</span>
            </span>
            {badges.inquiries > 0 ? <span className="adminNav__badge">{badges.inquiries}</span> : null}
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
        <Outlet context={{ sidebarCollapsed }} />
      </main>
    </div>
  );
}
