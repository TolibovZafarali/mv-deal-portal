import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { login, logout, me, refreshSession } from "@/api"
import {
  AUTH_SYNC_EXPIRED,
  AUTH_SYNC_LOGOUT,
  clearAccessToken,
  publishAuthSync,
  subscribeToAuthSync,
} from "@/api/core/tokenStorage"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [bootstrapping, setBootstrapping] = useState(true)
  const suppressExpiredRedirectRef = useRef(false)

  const navigate = useNavigate()

  const openLoginOnHome = useCallback(() => {
    const homeBg = {
      pathname: "/",
      search: "",
      hash: "",
      state: null,
      key: "home-bg",
    }

    navigate("/login", {
      replace: true,
      state: {
        modal: true,
        backgroundLocation: homeBg,
        from: "/app",
        forceHomeOnClose: true,
      },
    })
  }, [navigate])

  const clearLocalSession = useCallback(() => {
    clearAccessToken()
    setUser(null)
  }, [])

  const handleSessionExpired = useCallback((shouldBroadcast) => {
    suppressExpiredRedirectRef.current = false
    clearLocalSession()

    if (shouldBroadcast) {
      publishAuthSync(AUTH_SYNC_EXPIRED)
    }

    openLoginOnHome()
  }, [clearLocalSession, openLoginOnHome])

  const bootstrap = useCallback(async () => {
    setBootstrapping(true)
    let recoveredSession = false

    try {
      const session = await refreshSession()
      recoveredSession = Boolean(session?.accessToken)
      const profile = await me(session?.accessToken)
      const investorStatus = String(profile?.status ?? "").trim().toUpperCase()

      if (profile?.role === "INVESTOR" && investorStatus.startsWith("PENDING")) {
        try {
          await logout()
        } catch {
          // Clear local auth even if cookie revocation fails.
        }

        clearLocalSession()
        return
      }

      suppressExpiredRedirectRef.current = false
      setUser(profile)
    } catch {
      if (recoveredSession) {
        try {
          await logout()
        } catch {
          // Clear local auth even if cookie revocation fails.
        }
      }

      clearLocalSession()
    } finally {
      setBootstrapping(false)
    }
  }, [clearLocalSession])

  useEffect(() => {
    bootstrap()
  }, [bootstrap])

  useEffect(() => {
    function onExpired() {
      if (suppressExpiredRedirectRef.current) return
      handleSessionExpired(true)
    }

    window.addEventListener("mv:auth:expired", onExpired)
    return () => window.removeEventListener("mv:auth:expired", onExpired)
  }, [handleSessionExpired])

  useEffect(() => {
    return subscribeToAuthSync((payload) => {
      const type = String(payload?.type ?? "").trim().toLowerCase()

      if (type === AUTH_SYNC_LOGOUT) {
        suppressExpiredRedirectRef.current = true
        clearLocalSession()
        navigate("/", { replace: true })
        return
      }

      if (type === AUTH_SYNC_EXPIRED) {
        if (suppressExpiredRedirectRef.current) return
        handleSessionExpired(false)
      }
    })
  }, [clearLocalSession, handleSessionExpired, navigate])

  const signIn = useCallback(async (email, password) => {
    suppressExpiredRedirectRef.current = false
    const session = await login({ email, password })
    try {
      const profile = await me(session?.accessToken)
      const investorStatus = String(profile?.status ?? "").trim().toUpperCase()

      if (profile?.role === "INVESTOR" && investorStatus.startsWith("PENDING")) {
        try {
          await logout()
        } catch {
          // Clear local auth even if cookie revocation fails.
        }

        clearLocalSession()

        const err = new Error(
          "Your account is in review. Please wait for our team to reach out.",
        )
        err.code = "ACCOUNT_PENDING"
        throw err
      }

      setUser(profile)
      return profile
    } catch (error) {
      if (error?.code !== "ACCOUNT_PENDING") {
        try {
          await logout()
        } catch {
          // Clear local auth even if cookie revocation fails.
        }
      }

      clearLocalSession()
      throw error
    }
  }, [clearLocalSession])

  const signOut = useCallback(async () => {
    suppressExpiredRedirectRef.current = true
    try {
      await logout()
    } catch {
      // Clear local auth even if cookie revocation fails.
    } finally {
      clearLocalSession()
      publishAuthSync(AUTH_SYNC_LOGOUT)
      navigate("/", { replace: true })
    }
  }, [clearLocalSession, navigate])

  const value = useMemo(
    () => ({
      user,
      bootstrapping,
      bootstrap,
      isAuthed: !!user,
      signIn,
      signOut,
      refresh: bootstrap,
    }),
    [bootstrapping, bootstrap, signIn, signOut, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside <AuthProfile />")
  return ctx
}
