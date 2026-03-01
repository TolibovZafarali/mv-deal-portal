import { Suspense, lazy } from "react"
import { Navigate, Route, Routes, useLocation } from "react-router-dom"
import { ProtectedRoute, useAuth } from "@/features/auth"

const AdminLayout = lazy(() => import("@/features/admin/layout/AdminLayout"))
const InvestorLayout = lazy(() => import("@/features/investor/layout/InvestorLayout"))
const SellerLayout = lazy(() => import("@/features/seller/layout/SellerLayout"))
const LoginModal = lazy(() => import("@/features/auth/modals/LoginModal"))
const SignUpModal = lazy(() => import("@/features/auth/modals/SignUpModal"))
const ApiSmokeTest = lazy(() => import("@/features/dev/pages/ApiSmokeTest"))
const AppRedirect = lazy(() => import("@/app/routing/AppRedirect"))
const HomePage = lazy(() => import("@/features/home/pages/HomePage"))
const AdminQueuePage = lazy(() => import("@/features/admin/pages/AdminQueuePage"))
const AdminInquiriesPage = lazy(() => import("@/features/admin/pages/AdminInquiriesPage"))
const AdminInvestorsPage = lazy(() => import("@/features/admin/pages/AdminInvestorsPage"))
const AdminPropertiesPage = lazy(() => import("@/features/admin/pages/AdminPropertiesPage"))
const InvestorDashboard = lazy(() => import("@/features/investor/pages/InvestorDashboard"))
const InvestorPending = lazy(() => import("@/features/investor/pages/InvestorPending"))
const SellerListingsPage = lazy(() => import("@/features/seller/pages/SellerListingsPage"))
const SellerInboxPage = lazy(() => import("@/features/seller/pages/SellerInboxPage"))
const SellerProfilePage = lazy(() => import("@/features/seller/pages/SellerProfilePage"))

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
      <Suspense fallback={<div className="appRouteFallback">Loading page...</div>}>
        <Routes location={backgroundLocation || location}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<LoginModal />} />
          <Route path="/signup" element={<SignUpModal />} />
          <Route path="/signup/seller" element={<SignUpModal />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/app" element={<AppRedirect />} />
            <Route path="/_dev/api" element={<ApiSmokeTest />} />
          </Route>

          <Route element={<ProtectedRoute roles={["ADMIN"]} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="queue" replace />} />
              <Route path="queue" element={<AdminQueuePage />} />
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

          <Route element={<ProtectedRoute roles={["SELLER"]} />}>
            <Route path="/seller" element={<SellerLayout />}>
              <Route index element={<Navigate to="listings" replace />} />
              <Route path="listings" element={<SellerListingsPage />} />
              <Route path="inbox" element={<SellerInboxPage />} />
              <Route path="profile" element={<SellerProfilePage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>

      {backgroundLocation && (
        <Suspense fallback={null}>
          <Routes>
            <Route path="/login" element={<LoginModal />} />
            <Route path="/signup" element={<SignUpModal />} />
            <Route path="/signup/seller" element={<SignUpModal />} />
          </Routes>
        </Suspense>
      )}
    </>
  )
}
