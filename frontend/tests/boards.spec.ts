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

test.describe("Whiteboards empty state", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("Shows empty state message when no whiteboards exist", async ({
    page,
  }) => {
    const email = randomEmail()
    const password = randomPassword()
    await createUser({ email, password })
    await logInUser(page, email, password)

    await page.goto("/boards")

    await expect(
      page.getByText("You don't have any whiteboards yet"),
    ).toBeVisible()
    await expect(
      page.getByText("Create a new whiteboard to get started"),
    ).toBeVisible()
  })
})
