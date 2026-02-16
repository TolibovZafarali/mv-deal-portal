import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuth } from "./AuthContext"
import "./ProtectedRoute.css"

export default function ProtectedRoute({ roles }) {
  const { user, bootstrapping, isAuthed } = useAuth()
  const location = useLocation()

  if (bootstrapping) {
    return <div className="route-guard">Loading session...</div>
  }

  if (!isAuthed) {
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
