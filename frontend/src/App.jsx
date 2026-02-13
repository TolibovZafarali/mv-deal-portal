import { Link, Route, Routes, useLocation } from "react-router-dom"
import ApiSmokeTest from "./pages/ApiSmokeTest"
import { ProtectedRoute } from "./auth";
import LoginModal from "./modals/LoginModal";

function Home() {
  const location = useLocation();
  
  return (
    <div style={{ padding: "28px 18px" }}>
      <h1>Megna Real Estate</h1>

      <p>
        <Link to="/login" state={{ backgroundLocation: location }}>
          Login
        </Link>
      </p>

      <p>
        Dev tools: {" "}
        <Link to="/_dev/api" state={{ backgroundLocation: location }}>
          API Smoke Test
        </Link>
      </p>
    </div>    
  )
}

export default function App() {
  const location = useLocation();
  const backgroundLocation = location.state?.backgroundLocation;
  
  return (
    <>
      <Routes location={backgroundLocation || location}>
        <Route path="/" element={<Home />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/_dev/api" element={<ApiSmokeTest />} />
        </Route>
      </Routes>

      {backgroundLocation && (
        <Routes>
          <Route path="/login" element={<LoginModal />} />
        </Routes>)}
    </>
  );
}
