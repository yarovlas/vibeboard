import { expect, type Page, test } from "@playwright/test"

import { createUser } from "./utils/privateApi"
import { randomEmail, randomPassword } from "./utils/random"
import { logInUser } from "./utils/user"

async function createLoggedInBoard(page: Page) {
  const email = randomEmail()
  const password = randomPassword()
  await createUser({ email, password })
  await logInUser(page, email, password)
  await expect(page.getByTestId("whiteboard-stage")).toBeVisible()
}

function getBoardId(page: Page) {
  const match = page.url().match(/\/boards\/([^/?#]+)/)
  if (!match) throw new Error("Could not find board id in URL")
  return match[1]
}

async function createPostIt(page: Page, boardId: string, text: string) {
  await page.getByRole("button", { name: "Add post-it" }).click()
  const editor = page.getByRole("textbox", { name: "Post-it text" })
  await editor.fill(text)
  await expect(editor).toHaveValue(text)
  const responsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().includes(`/api/v1/boards/${boardId}/postits`),
  )
  await editor.blur()
  const response = await responsePromise
  expect(response.status()).toBe(200)
  await expect(editor).toHaveCount(0)
}

async function createSecondPostIt(page: Page, boardId: string, text: string) {
  const stage = page.getByTestId("whiteboard-stage")
  const box = await stage.boundingBox()
  if (!box) throw new Error("Whiteboard stage has no bounding box")
  await page.mouse.dblclick(box.x + 450, box.y + 120)
  const editor = page.getByRole("textbox", { name: "Post-it text" })
  await expect(editor).toBeVisible()
  await editor.fill(text)
  await expect(editor).toHaveValue(text)
  const responsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().includes(`/api/v1/boards/${boardId}/postits`),
  )
  await page.keyboard.press("Control+Enter")
  const response = await responsePromise
  expect(response.status()).toBe(200)
  await expect(editor).toHaveCount(0)
}

test.describe("UI-polish feedback", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("toont een toast en de lege toestand na het verwijderen van een post-it", async ({
    page,
  }) => {
    await createLoggedInBoard(page)
    const boardId = getBoardId(page)
    await createPostIt(page, boardId, "Op te ruimen")

    const stage = page.getByTestId("whiteboard-stage")
    const box = await stage.boundingBox()
    if (!box) throw new Error("Whiteboard stage has no bounding box")
    // Delete button at the top-right of the 220x180 card at (40, 40).
    await page.mouse.click(box.x + 40 + 220 - 22, box.y + 40 + 22)
    await expect(page.getByRole("dialog")).toBeVisible()

    const deletePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "DELETE" &&
        response.url().includes(`/api/v1/boards/${boardId}/postits/`),
    )
    await page.getByRole("button", { name: "Verwijderen" }).click()
    expect((await deletePromise).status()).toBe(200)

    await expect(page.getByText("Post-it deleted")).toBeVisible()
    const emptyState = page.getByTestId("whiteboard-empty-state")
    await expect(emptyState).toBeVisible()
    await expect(emptyState.getByText("Empty workspace")).toBeVisible()
    await expect(emptyState.locator("svg")).toBeVisible()
  })

  test("toont een toast na het bewerken van een post-it in Kanban", async ({
    page,
  }) => {
    await createLoggedInBoard(page)
    const boardId = getBoardId(page)
    await createPostIt(page, boardId, "Oude inhoud")
    await page.getByRole("button", { name: "Kanban view" }).click()

    await page.getByTestId("kanban-card-edit").click()
    await expect(page.getByTestId("kanban-postit-dialog")).toBeVisible()
    await page.getByTestId("kanban-postit-content").fill("Nieuwe inhoud")

    const patchPromise = page.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        response.url().includes(`/api/v1/boards/${boardId}/postits/`),
    )
    await page.getByTestId("kanban-postit-save").click()
    expect((await patchPromise).status()).toBe(200)

    await expect(page.getByText("Post-it updated")).toBeVisible()
    await expect(page.getByTestId("kanban-card")).toContainText("Nieuwe inhoud")
  })

  test("toont een toast na het verwijderen van een post-it in Kanban", async ({
    page,
  }) => {
    await createLoggedInBoard(page)
    const boardId = getBoardId(page)
    await createPostIt(page, boardId, "Te verwijderen kaart")
    await page.getByRole("button", { name: "Kanban view" }).click()

    await page.getByTestId("kanban-card-edit").click()
    await page.getByTestId("kanban-postit-delete").click()
    await expect(page.getByTestId("kanban-delete-dialog")).toBeVisible()

    const deletePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "DELETE" &&
        response.url().includes(`/api/v1/boards/${boardId}/postits/`),
    )
    await page.getByTestId("kanban-delete-confirm").click()
    expect((await deletePromise).status()).toBe(200)

    await expect(page.getByText("Post-it deleted")).toBeVisible()
    await expect(page.getByTestId("kanban-card")).toHaveCount(0)
  })

  test("toont een toast bij groeperen en uitklappen", async ({ page }) => {
    await createLoggedInBoard(page)
    const boardId = getBoardId(page)
    await createPostIt(page, boardId, "Geel een")
    await createSecondPostIt(page, boardId, "Geel twee")

    await expect(page.getByTestId("group-postits")).toBeEnabled()
    await page.getByTestId("group-postits").click()
    await expect(page.getByText("Post-its grouped by color")).toBeVisible()

    await expect(page.getByTestId("ungroup-postits")).toBeEnabled()
    await page.getByTestId("ungroup-postits").click()
    await expect(page.getByText("Folders expanded")).toBeVisible()
  })
})
