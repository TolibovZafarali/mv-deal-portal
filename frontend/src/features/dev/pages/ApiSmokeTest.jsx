import { useEffect, useState } from "react"
import {
  getAccessToken,
  getPendingInvestors,
  login,
  logout,
  me,
  refreshSession,
  subscribeToAccessToken,
} from "@/api"
import "@/features/dev/pages/ApiSmokeTest.css"

function pretty(value) {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export default function ApiSmokeTest() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [statusLine, setStatusLine] = useState("")
  const [output, setOutput] = useState("")
  const [loading, setLoading] = useState(false)
  const [token, setToken] = useState(() => getAccessToken())

  useEffect(() => {
    return subscribeToAccessToken((nextToken) => {
      setToken(nextToken)
    })
  }, [])

  async function run(label, fn) {
    setLoading(true)
    setStatusLine(`⏳ ${label}...`)
    setOutput("")

    try {
      const data = await fn()
      setStatusLine(`✅ ${label} OK`)
      setOutput(pretty(data))
    } catch (err) {
      const status = err?.status ?? "unknown"
      const message = err?.message ?? "Request failed"
      setStatusLine(`❌ ${label} FAILED (${status})`)
      setOutput(pretty({ status, message, raw: err }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="api-smoke">
      <h2 className="api-smoke__title">API Smoke Test</h2>
      <p className="api-smoke__subtitle">
        Goal: prove refresh-cookie session recovery and in-memory Bearer auth work end-to-end.
      </p>

      <div className="api-smoke__card">
        <div className="api-smoke__grid">
          <label className="api-smoke__label">
            Email
            <input
              className="api-smoke__input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@email.com"
              autoComplete="email"
            />
          </label>

          <label className="api-smoke__label">
            Password
            <input
              className="api-smoke__input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              type="password"
              autoComplete="current-password"
            />
          </label>
        </div>

        <div className="api-smoke__buttons">
          <button
            className="api-smoke__btn"
            disabled={loading || !email || !password}
            onClick={() => run("Login", () => login({ email, password }))}
          >
            Login
          </button>

          <button
            className="api-smoke__btn"
            disabled={loading}
            onClick={() => run("Refresh Session", () => refreshSession())}
          >
            /auth/refresh
          </button>

          <button
            className="api-smoke__btn"
            disabled={loading}
            onClick={() => run("Me", () => me())}
          >
            /auth/me
          </button>

          <button
            className="api-smoke__btn"
            disabled={loading}
            onClick={() =>
              run("Admin Pending Investors", () =>
                getPendingInvestors({ page: 0, size: 10, sort: "id,desc" }),
              )
            }
          >
            /admin/investors/pending
          </button>

          <button
            className="api-smoke__btn api-smoke__btn--danger"
            disabled={loading}
            onClick={() =>
              run("Logout", async () => {
                await logout()
                return { session: "cleared" }
              })
            }
          >
            Logout
          </button>
        </div>

        <div className="api-smoke__token">
          <span className="api-smoke__tokenLabel">Access token (memory)</span>
          <span className="api-smoke__tokenValue">
            {token ? `${token.slice(0, 20)}...` : "(none)"}
          </span>
        </div>

        <div className="api-smoke__hint">
          Refresh token lives in an HttpOnly cookie and is not readable from JavaScript.
        </div>
      </div>

      <div className="api-smoke__status">{statusLine}</div>

      <pre className="api-smoke__output">{output || "// output..."}</pre>
    </div>
  )
}
