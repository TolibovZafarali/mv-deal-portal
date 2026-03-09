import { Link, Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuth } from "@/features/auth/context/AuthContext"
import "@/features/auth/routing/ProtectedRoute.css"

export default function ProtectedRoute({ roles }) {
  const { user, bootstrapping, isAuthed, refresh, sessionRestoreError, signOut } = useAuth()
  const location = useLocation()

  if (bootstrapping) {
    return <div className="route-guard">Loading session...</div>
  }

  if (!isAuthed && sessionRestoreError) {
    return (
      <div className="route-guard route-guard--recoverable">
        <h2>Session unavailable</h2>
        <p>{sessionRestoreError}</p>
        <div className="route-guard__actions">
          <button type="button" className="route-guard__btn" onClick={() => refresh()}>
            Retry session
          </button>
          <button type="button" className="route-guard__btn route-guard__btn--ghost" onClick={() => signOut()}>
            Log out
          </button>
          <Link to="/" replace className="route-guard__btn route-guard__btn--ghost">
            Go home
          </Link>
        </div>
      </div>
    )
  }

  if (!isAuthed) {
    if (
      location.pathname.startsWith("/admin") ||
      location.pathname.startsWith("/investor") ||
      location.pathname.startsWith("/seller")
    ) {
      return <Navigate to="/" replace />
    }
    
    const redirectTo = `${location.pathname}${location.search}${location.hash}`

    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: redirectTo,
          backgroundLocation: location,
          modal: true,
        }}
      />
    )
  }

  if (roles?.length && !roles.includes(user?.role)) {
    return (
      <div className="route-guard route-guard--forbidden">
        <h2>403 - Not allowed</h2>
        <p>
          Your role is <b>{user?.role || "unknown"}</b>. Required: <b>{roles.join(", ")}</b>.
        </p>
      </div>
    )
  }

  return <Outlet />
}
