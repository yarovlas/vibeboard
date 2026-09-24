import { expect, test } from "@playwright/test"
import { createUser } from "./utils/privateApi"
import { randomBoardName, randomEmail, randomPassword } from "./utils/random"
import { logInUser } from "./utils/user"

test("Boards page is accessible and shows correct title", async ({ page }) => {
  await page.goto("/boards")
  await expect(page.getByRole("heading", { name: "Whiteboards" })).toBeVisible()
  await expect(
    page.getByText("Create and manage your whiteboards"),
  ).toBeVisible()
})

test("New whiteboard button is visible", async ({ page }) => {
  await page.goto("/boards")
  await expect(
    page.getByRole("button", { name: "New whiteboard" }),
  ).toBeVisible()
})

test.describe("Whiteboard management", () => {
  test.use({ storageState: { cookies: [], origins: [] } })
  let email: string
  const password = randomPassword()

  test.beforeAll(async () => {
    email = randomEmail()
    await createUser({ email, password })
  })

  test.beforeEach(async ({ page }) => {
    await logInUser(page, email, password)
    await page.goto("/boards")
  })

  test("Create a new whiteboard and open it", async ({ page }) => {
    const name = randomBoardName()

    await page.getByRole("button", { name: "New whiteboard" }).click()
    await page.getByLabel("Name").fill(name)
    await page.getByRole("button", { name: "Create whiteboard" }).click()

    await expect(
      page.getByText("Whiteboard created successfully"),
    ).toBeVisible()
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible()
    await expect(page.getByText("Empty workspace")).toBeVisible()
  })

  test("Open an existing whiteboard from the list", async ({ page }) => {
    const name = randomBoardName()

    await page.getByRole("button", { name: "New whiteboard" }).click()
    await page.getByLabel("Name").fill(name)
    await page.getByRole("button", { name: "Create whiteboard" }).click()
    await expect(
      page.getByText("Whiteboard created successfully"),
    ).toBeVisible()

    await page.goto("/boards")
    await page.getByRole("link", { name: new RegExp(name) }).click()

    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible()
    await expect(page.getByText("Empty workspace")).toBeVisible()
  })

  test("Cancel whiteboard creation", async ({ page }) => {
    await page.getByRole("button", { name: "New whiteboard" }).click()
    await page.getByLabel("Name").fill("Cancelled board")
    await page.getByRole("button", { name: "Cancel" }).click()

    await expect(page.getByRole("dialog")).not.toBeVisible()
  })
})

test.describe("Whiteboard as home", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("Home creates a first whiteboard when none exist", async ({ page }) => {
    const email = randomEmail()
    const password = randomPassword()
    await createUser({ email, password })
    await logInUser(page, email, password)

    // A fresh user lands on "/" after login, which creates their first board
    await page.waitForURL(/\/boards\/[0-9a-f-]+/)
    await expect(page.getByText("Empty workspace")).toBeVisible()

    await page.goto("/boards")
    await expect(
      page.getByRole("link", { name: "My whiteboard" }),
    ).toBeVisible()
  })

  test("Home opens the last saved whiteboard", async ({ page }) => {
    const email = randomEmail()
    const password = randomPassword()
    await createUser({ email, password })
    await logInUser(page, email, password) // creates the first board

    // Create a second, newer board — it becomes the last saved one
    const name = randomBoardName()
    await page.goto("/boards")
    await page.getByRole("button", { name: "New whiteboard" }).click()
    await page.getByLabel("Name").fill(name)
    await page.getByRole("button", { name: "Create whiteboard" }).click()
    await expect(
      page.getByText("Whiteboard created successfully"),
    ).toBeVisible()

    await page.goto("/")
    await page.waitForURL(/\/boards\/[0-9a-f-]+/)
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible()
    await expect(page.getByText("Empty workspace")).toBeVisible()
  })
})
