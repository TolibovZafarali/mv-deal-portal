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
const PROACTIVE_REFRESH_LEEWAY_MS = 90_000
const PROACTIVE_REFRESH_MIN_DELAY_MS = 15_000
const PROACTIVE_REFRESH_RETRY_DELAY_MS = 30_000
const PROACTIVE_REFRESH_LOCK_TTL_MS = 20_000
const PROACTIVE_REFRESH_LOCK_KEY = "mv:auth:proactive-refresh-lock"

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function getProactiveRefreshDelay(session) {
  const expiresInSeconds = Number(session?.expiresInSeconds)

  if (!Number.isFinite(expiresInSeconds) || expiresInSeconds <= 0) {
    return null
  }

  const expiresInMs = expiresInSeconds * 1000
  return Math.max(expiresInMs - PROACTIVE_REFRESH_LEEWAY_MS, PROACTIVE_REFRESH_MIN_DELAY_MS)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [bootstrapping, setBootstrapping] = useState(true)
  const suppressExpiredRedirectRef = useRef(false)
  const proactiveRefreshTimerRef = useRef(0)
  const proactiveRefreshInFlightRef = useRef(false)
  const activeUserRef = useRef(null)
  const refreshLockOwnerRef = useRef(
    `tab-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  )

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

  const clearProactiveRefreshTimer = useCallback(() => {
    if (proactiveRefreshTimerRef.current) {
      clearTimeout(proactiveRefreshTimerRef.current)
      proactiveRefreshTimerRef.current = 0
    }
  }, [])

  const releaseProactiveRefreshLock = useCallback(() => {
    if (typeof window === "undefined") return

    try {
      const raw = window.localStorage.getItem(PROACTIVE_REFRESH_LOCK_KEY)
      if (!raw) return

      const parsed = JSON.parse(raw)
      if (parsed?.owner === refreshLockOwnerRef.current) {
        window.localStorage.removeItem(PROACTIVE_REFRESH_LOCK_KEY)
      }
    } catch {
      // Ignore storage parsing/permission errors.
    }
  }, [])

  const tryAcquireProactiveRefreshLock = useCallback(() => {
    if (typeof window === "undefined") return true

    const now = Date.now()
    const nextLock = {
      owner: refreshLockOwnerRef.current,
      expiresAt: now + PROACTIVE_REFRESH_LOCK_TTL_MS,
    }

    try {
      const raw = window.localStorage.getItem(PROACTIVE_REFRESH_LOCK_KEY)
      if (raw) {
        const currentLock = JSON.parse(raw)
        if (
          currentLock?.owner &&
          currentLock.owner !== refreshLockOwnerRef.current &&
          Number(currentLock.expiresAt) > now
        ) {
          return false
        }
      }

      window.localStorage.setItem(PROACTIVE_REFRESH_LOCK_KEY, JSON.stringify(nextLock))
      const confirmedRaw = window.localStorage.getItem(PROACTIVE_REFRESH_LOCK_KEY)
      if (!confirmedRaw) return false

      const confirmedLock = JSON.parse(confirmedRaw)
      return confirmedLock?.owner === refreshLockOwnerRef.current
    } catch {
      // If storage is unavailable, avoid blocking refresh.
      return true
    }
  }, [])

  const scheduleProactiveRefresh = useCallback((session, delayOverrideMs = null) => {
    if (typeof window === "undefined") return

    clearProactiveRefreshTimer()

    const delayMs = delayOverrideMs ?? getProactiveRefreshDelay(session)
    if (!Number.isFinite(delayMs) || delayMs <= 0) return

    proactiveRefreshTimerRef.current = window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("mv:auth:proactive-refresh"))
    }, delayMs)
  }, [clearProactiveRefreshTimer])

  const clearLocalSession = useCallback(() => {
    clearProactiveRefreshTimer()
    proactiveRefreshInFlightRef.current = false
    releaseProactiveRefreshLock()
    clearAccessToken()
    setUser(null)
  }, [clearProactiveRefreshTimer, releaseProactiveRefreshLock])

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

  const resolveAuthenticatedProfile = useCallback(async (session) => {
    const profile = session?.user ?? await loadProfile(session?.accessToken)
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
    scheduleProactiveRefresh(session)
    return profile
  }, [clearLocalSession, loadProfile, revokeServerSession, scheduleProactiveRefresh])

  const handleSessionExpired = useCallback(() => {
    suppressExpiredRedirectRef.current = false
    clearLocalSession()
    openLoginOnHome()
  }, [clearLocalSession, openLoginOnHome])

  const runProactiveRefresh = useCallback(async () => {
    if (proactiveRefreshInFlightRef.current) return
    if (!activeUserRef.current) return
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      scheduleProactiveRefresh(null, PROACTIVE_REFRESH_RETRY_DELAY_MS)
      return
    }
    if (!tryAcquireProactiveRefreshLock()) {
      scheduleProactiveRefresh(null, PROACTIVE_REFRESH_RETRY_DELAY_MS)
      return
    }

    proactiveRefreshInFlightRef.current = true

    try {
      const session = await refreshSession()
      await resolveAuthenticatedProfile(session)
    } catch (error) {
      if (isUnauthorizedError(error)) {
        handleSessionExpired()
        return
      }

      scheduleProactiveRefresh(null, PROACTIVE_REFRESH_RETRY_DELAY_MS)
    } finally {
      proactiveRefreshInFlightRef.current = false
      releaseProactiveRefreshLock()
    }
  }, [
    handleSessionExpired,
    isUnauthorizedError,
    releaseProactiveRefreshLock,
    resolveAuthenticatedProfile,
    scheduleProactiveRefresh,
    tryAcquireProactiveRefreshLock,
  ])

  const bootstrap = useCallback(async () => {
    setBootstrapping(true)

    try {
      const session = await refreshSession()
      return await resolveAuthenticatedProfile(session)
    } catch {
      clearLocalSession()
      return null
    } finally {
      setBootstrapping(false)
    }
  }, [clearLocalSession, resolveAuthenticatedProfile])

  useEffect(() => {
    bootstrap()
  }, [bootstrap])

  useEffect(() => {
    activeUserRef.current = user
  }, [user])

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return undefined
    }

    function onProactiveRefresh() {
      runProactiveRefresh()
    }

    function onVisibilityChange() {
      if (document.visibilityState !== "visible") return
      if (!activeUserRef.current) return
      runProactiveRefresh()
    }

    window.addEventListener("mv:auth:proactive-refresh", onProactiveRefresh)
    document.addEventListener("visibilitychange", onVisibilityChange)

    return () => {
      window.removeEventListener("mv:auth:proactive-refresh", onProactiveRefresh)
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [runProactiveRefresh])

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

  useEffect(() => {
    return () => {
      clearProactiveRefreshTimer()
      releaseProactiveRefreshLock()
    }
  }, [clearProactiveRefreshTimer, releaseProactiveRefreshLock])

  const signIn = useCallback(async (email, password) => {
    suppressExpiredRedirectRef.current = false
    const session = await login({ email, password })

    try {
      return await resolveAuthenticatedProfile(session)
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
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider />")
  return ctx
}
