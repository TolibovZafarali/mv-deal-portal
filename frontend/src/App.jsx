import { Link, Route, Routes } from "react-router-dom"
import ApiSmokeTest from "./pages/ApiSmokeTest"

function Home() {
  return (
    <div style={{ padding: "28px 18px" }}>
      <h1>Megna Real Estate</h1>
      <p>Frontend starter is clean. Next: base CSS.</p>
      <p>
        Dev tools: <Link to="/_dev/api">API Smoke Test</Link>
      </p>
    </div>    
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/_dev/api" element={<ApiSmokeTest />} />
    </Routes>
  )
}
