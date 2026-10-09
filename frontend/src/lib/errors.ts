import { isAxiosError } from "axios"

import { handleInvalidAccessToken } from "@/lib/auth"

function extractErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const errDetail = (err.response?.data as { detail?: unknown } | undefined)
      ?.detail
    if (Array.isArray(errDetail) && errDetail.length > 0) {
      const first = errDetail[0] as { msg?: unknown }
      if (typeof first?.msg === "string") return first.msg
    }
    if (typeof errDetail === "string") return errDetail
    if (typeof err.message === "string" && err.message) return err.message
  }
  if (err instanceof Error && err.message) return err.message
  return "Something went wrong."
}

/**
 * Report an API error via toast. Invalid-token errors are handled globally
 * (redirect in `main.tsx`) so no toast is shown for them.
 */
export function handleError(
  err: unknown,
  showErrorToast: (msg: string) => void,
): void {
  if (handleInvalidAccessToken(err)) return
  showErrorToast(extractErrorMessage(err))
}

export { extractErrorMessage }
