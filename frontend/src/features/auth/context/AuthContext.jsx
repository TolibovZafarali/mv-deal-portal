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
const PROFILE_LOAD_ATTEMPTS = 2
const PROFILE_RETRY_DELAY_MS = 250

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

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

  const isUnauthorizedError = useCallback((error) => {
    return Number(error?.status) === 401
  }, [])

  const revokeServerSession = useCallback(async () => {
    try {
      await logout()
    } catch {
      clearAccessToken()
    }
  }, [])

  const loadProfile = useCallback(async (token) => {
    let lastError = null

    for (let attempt = 0; attempt < PROFILE_LOAD_ATTEMPTS; attempt += 1) {
      try {
        return await me(token)
      } catch (error) {
        lastError = error

        if (isUnauthorizedError(error) || attempt === PROFILE_LOAD_ATTEMPTS - 1) {
          throw error
        }

        await wait(PROFILE_RETRY_DELAY_MS * (attempt + 1))
      }
    }

    throw lastError ?? new Error("Failed to load profile")
  }, [isUnauthorizedError])

  const resolveAuthenticatedProfile = useCallback(async (token) => {
    const profile = await loadProfile(token)
    const investorStatus = String(profile?.status ?? "").trim().toUpperCase()

    if (profile?.role === "INVESTOR" && investorStatus.startsWith("PENDING")) {
      await revokeServerSession()
      clearLocalSession()

      const err = new Error(
        "Your account is in review. Please wait for our team to reach out.",
      )
      err.code = "ACCOUNT_PENDING"
      throw err
    }

    suppressExpiredRedirectRef.current = false
    setUser(profile)
    return profile
  }, [clearLocalSession, loadProfile, revokeServerSession])

  const handleSessionExpired = useCallback(() => {
    suppressExpiredRedirectRef.current = false
    clearLocalSession()
    openLoginOnHome()
  }, [clearLocalSession, openLoginOnHome])

  const bootstrap = useCallback(async () => {
    setBootstrapping(true)

    try {
      const session = await refreshSession()
      return await resolveAuthenticatedProfile(session?.accessToken)
    } catch (error) {
      if (isUnauthorizedError(error)) {
        clearLocalSession()
      }

      return null
    } finally {
      setBootstrapping(false)
    }
  }, [clearLocalSession, isUnauthorizedError, resolveAuthenticatedProfile])

  useEffect(() => {
    bootstrap()
  }, [bootstrap])

  useEffect(() => {
    function onExpired() {
      if (suppressExpiredRedirectRef.current) return
      handleSessionExpired()
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
        handleSessionExpired()
      }
    })
  }, [clearLocalSession, handleSessionExpired, navigate])

  const signIn = useCallback(async (email, password) => {
    suppressExpiredRedirectRef.current = false
    const session = await login({ email, password })

    try {
      return await resolveAuthenticatedProfile(session?.accessToken)
    } catch (error) {
      if (error?.code === "ACCOUNT_PENDING") {
        throw error
      }

      if (isUnauthorizedError(error)) {
        await revokeServerSession()
        clearLocalSession()
        throw error
      }

      const recoveredProfile = await bootstrap()

      if (recoveredProfile) {
        return recoveredProfile
      }

      throw error
    }
  }, [bootstrap, clearLocalSession, isUnauthorizedError, resolveAuthenticatedProfile, revokeServerSession])

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
