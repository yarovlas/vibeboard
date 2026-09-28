import { isAxiosError } from "axios"

const INVALID_TOKEN_DETAIL = "Could not validate credentials"

let isRedirectingToLogin = false

function getTokenPayload(token: string): Record<string, unknown> | null {
  const payload = token.split(".")[1]
  if (!payload) return null

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/")
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")
    const decoded = JSON.parse(atob(padded)) as unknown
    return typeof decoded === "object" && decoded !== null
      ? (decoded as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

export function isAccessTokenExpired(token: string) {
  const expiresAt = getTokenPayload(token)?.exp
  return typeof expiresAt === "number" && expiresAt * 1000 <= Date.now()
}

export function clearAccessToken() {
  localStorage.removeItem("access_token")
}

export function isLoggedIn() {
  const token = localStorage.getItem("access_token")
  if (!token) return false
  if (isAccessTokenExpired(token)) {
    clearAccessToken()
    return false
  }
  return true
}

function hasInvalidTokenDetail(error: unknown) {
  if (!isAxiosError(error)) return false
  const data = error.response?.data
  return (
    typeof data === "object" &&
    data !== null &&
    "detail" in data &&
    data.detail === INVALID_TOKEN_DETAIL
  )
}

export function isInvalidAccessTokenError(error: unknown) {
  if (!isAxiosError(error)) return false
  const status = error.response?.status
  return status === 401 || (status === 403 && hasInvalidTokenDetail(error))
}

export function handleInvalidAccessToken(error: unknown) {
  if (!isInvalidAccessTokenError(error)) return false

  clearAccessToken()
  if (!isRedirectingToLogin && window.location.pathname !== "/login") {
    isRedirectingToLogin = true
    window.location.assign("/login")
  }
  return true
}
