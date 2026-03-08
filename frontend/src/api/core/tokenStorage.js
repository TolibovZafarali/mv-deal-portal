let accessToken = null

const accessTokenListeners = new Set()
const authSyncListeners = new Set()

const AUTH_SYNC_CHANNEL = "mv-auth-session"
export const AUTH_SYNC_LOGOUT = "logout"
export const AUTH_SYNC_EXPIRED = "expired"

let authSyncChannel = null

function emitAccessTokenChange() {
  accessTokenListeners.forEach((listener) => listener(accessToken))
}

function ensureAuthSyncChannel() {
  if (typeof window === "undefined" || typeof window.BroadcastChannel !== "function") {
    return null
  }

  if (!authSyncChannel) {
    authSyncChannel = new window.BroadcastChannel(AUTH_SYNC_CHANNEL)
    authSyncChannel.addEventListener("message", (event) => {
      authSyncListeners.forEach((listener) => listener(event?.data || null))
    })
  }

  return authSyncChannel
}

function normalizeToken(token) {
  if (typeof token !== "string") return null
  const trimmed = token.trim()
  return trimmed ? trimmed : null
}

export function setAccessToken(token) {
  accessToken = normalizeToken(token)
  emitAccessTokenChange()
}

export function getAccessToken() {
  return accessToken
}

export function clearAccessToken() {
  accessToken = null
  emitAccessTokenChange()
}

export function subscribeToAccessToken(listener) {
  accessTokenListeners.add(listener)
  return () => {
    accessTokenListeners.delete(listener)
  }
}

export function publishAuthSync(type) {
  const channel = ensureAuthSyncChannel()
  if (!channel) return
  channel.postMessage({ type })
}

export function subscribeToAuthSync(listener) {
  authSyncListeners.add(listener)
  ensureAuthSyncChannel()

  return () => {
    authSyncListeners.delete(listener)
  }
}
