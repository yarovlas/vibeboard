import { test as setup } from "@playwright/test"
import { firstUser, firstUserPassword } from "./config.ts"

const authFile = "playwright/.auth/user.json"

setup("authenticate", async ({ page }) => {
  await page.goto("/login")
  await page.getByTestId("email-input").fill(firstUser)
  await page.getByTestId("password-input").fill(firstUserPassword)
  await page.getByRole("button", { name: "Log In" }).click()
  await page.waitForURL(/\/boards\/[0-9a-f-]+/)
  await page.context().storageState({ path: authFile })
})
