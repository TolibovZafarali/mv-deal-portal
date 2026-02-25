import { Navigate, Route, Routes, useLocation } from "react-router-dom"
import { ProtectedRoute, useAuth } from "@/features/auth"
import AdminLayout from "@/features/admin/layout/AdminLayout"
import InvestorLayout from "@/features/investor/layout/InvestorLayout"
import LoginModal from "@/features/auth/modals/LoginModal"
import SignUpModal from "@/features/auth/modals/SignUpModal"
import ApiSmokeTest from "@/features/dev/pages/ApiSmokeTest"
import AppRedirect from "@/app/routing/AppRedirect"
import HomePage from "@/features/home/pages/HomePage"
import AdminInquiriesPage from "@/features/admin/pages/AdminInquiriesPage"
import AdminInvestorsPage from "@/features/admin/pages/AdminInvestorsPage"
import AdminPropertiesPage from "@/features/admin/pages/AdminPropertiesPage"
import InvestorDashboard from "@/features/investor/pages/InvestorDashboard"
import InvestorPending from "@/features/investor/pages/InvestorPending"

function Home() {
  const location = useLocation()
  const { isAuthed, bootstrapping } = useAuth()

  return (
    <HomePage
      location={location}
      isAuthed={isAuthed}
      bootstrapping={bootstrapping}
    />
  )
}

export default function App() {
  const location = useLocation()
  const backgroundLocation = location.state?.modal
    ? location.state.backgroundLocation
    : null

  return (
    <>
      <Routes location={backgroundLocation || location}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginModal />} />
        <Route path="/signup" element={<SignUpModal />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/app" element={<AppRedirect />} />
          <Route path="/_dev/api" element={<ApiSmokeTest />} />
        </Route>

        <Route element={<ProtectedRoute roles={["ADMIN"]} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="properties" replace />} />
            <Route path="properties" element={<AdminPropertiesPage />} />
            <Route path="investors" element={<AdminInvestorsPage />} />
            <Route path="inquiries" element={<AdminInquiriesPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={["INVESTOR"]} />}>
          <Route path="/investor" element={<InvestorLayout />}>
            <Route index element={<InvestorDashboard />} />
            <Route path="pending" element={<InvestorPending />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {backgroundLocation && (
        <Routes>
          <Route path="/login" element={<LoginModal />} />
          <Route path="/signup" element={<SignUpModal />} />
        </Routes>
      )}
    </>
  )
}
