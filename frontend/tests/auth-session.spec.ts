import { expect, test } from "@playwright/test"

test.use({ storageState: { cookies: [], origins: [] } })

test("Clears an expired access token before loading protected routes", async ({
  page,
}) => {
  await page.goto("/login")
  await page.evaluate(() => {
    const payload = btoa(
      JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 60 }),
    )
    localStorage.setItem("access_token", `expired.${payload}.signature`)
  })

  await page.goto("/settings")
  await page.waitForURL("/login")
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("access_token")))
    .toBeNull()
})

test("Redirects to /login when token is wrong", async ({ page }) => {
  await page.goto("/settings")
  await page.evaluate(() => {
    localStorage.setItem("access_token", "invalid_token")
  })
  await page.goto("/settings")
  await page.waitForURL("/login")
  await expect(page).toHaveURL("/login")
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("access_token")))
    .toBeNull()
})
