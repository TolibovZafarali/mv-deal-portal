import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { getAccessToken, login, logout, me } from "../api"

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

  const bootstrap = useCallback(async () => {
    const token = getAccessToken()

    if (!token) {
      setUser(null)
      setBootstrapping(false)
      return
    }

    try {
      const profile = await me()
      suppressExpiredRedirectRef.current = false
      setUser(profile)
    } catch {
      logout()
      setUser(null)
      openLoginOnHome()
    } finally {
      setBootstrapping(false)
    }
  }, [openLoginOnHome])

  useEffect(() => {
    bootstrap()
  }, [bootstrap])

  useEffect(() => {
    function onExpired() {
      if (suppressExpiredRedirectRef.current) return
      setUser(null)
      openLoginOnHome()
    }

    window.addEventListener("mv:auth:expired", onExpired)
    return () => window.removeEventListener("mv:auth:expired", onExpired)
  }, [openLoginOnHome])

  const signIn = useCallback(async (email, password) => {
    suppressExpiredRedirectRef.current = false
    await login({ email, password })

    const profile = await me()

    if (profile?.role === "INVESTOR" && profile?.status === "PENDING") {
      logout()
      setUser(null)

      const err = new Error(
        "Your account is in review. Please wait for our team to reach out.",
      )
      err.code = "ACCOUNT_PENDING"
      throw err
    }

    setUser(profile)
    return profile
  }, [])

  const signOut = useCallback(() => {
    suppressExpiredRedirectRef.current = true
    logout()
    setUser(null)
    navigate("/", { replace: true })
  }, [navigate])

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
