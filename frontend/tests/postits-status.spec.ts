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

/** Open the editor of the single post-it created by createPostIt. */
async function openEditor(page: Page) {
  const stage = page.getByTestId("whiteboard-stage")
  const box = await stage.boundingBox()
  if (!box) throw new Error("Whiteboard stage has no bounding box")
  // The card sits at the top-left dock slot (40, 40) and is 220x180.
  await page.mouse.dblclick(box.x + 40 + 110, box.y + 40 + 90)
  await expect(page.getByTestId("post-it-editor")).toBeVisible()
}

test.describe("Post-it status", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("wijzigt de status via het bedieningspaneel en behoudt deze na herladen", async ({
    page,
  }) => {
    await createLoggedInBoard(page)
    const boardId = getBoardId(page)
    await createPostIt(page, boardId, "Taak om af te ronden")

    await openEditor(page)
    const statusSelect = page.getByTestId("postit-status-select")
    await expect(statusSelect).toBeVisible()

    const patchResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        response.url().includes(`/api/v1/boards/${boardId}/postits/`),
    )
    await statusSelect.click()
    await page.getByRole("option", { name: "DONE" }).click()
    const patchResponse = await patchResponsePromise
    expect(patchResponse.status()).toBe(200)
    expect(patchResponse.request().postDataJSON().status).toBe("DONE")

    const getResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "GET" &&
        response.url().includes(`/api/v1/boards/${boardId}/postits`),
    )
    await page.reload()
    const getResponse = await getResponsePromise
    expect(getResponse.status()).toBe(200)
    const postits = await getResponse.json()
    expect(postits).toHaveLength(1)
    expect(postits[0].status).toBe("DONE")
  })

  test("stelt prioriteit en vervaldatum in en behoudt deze na herladen", async ({
    page,
  }) => {
    await createLoggedInBoard(page)
    const boardId = getBoardId(page)
    await createPostIt(page, boardId, "Taak met deadline")

    await openEditor(page)
    const patchResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        response.url().includes(`/api/v1/boards/${boardId}/postits/`),
    )
    await page.getByTestId("postit-priority-select").click()
    await page.getByRole("option", { name: "HIGH" }).click()
    const priorityResponse = await patchResponsePromise
    expect(priorityResponse.status()).toBe(200)
    expect(priorityResponse.request().postDataJSON().priority).toBe("HIGH")

    const dueDatePatchPromise = page.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        response.url().includes(`/api/v1/boards/${boardId}/postits/`),
    )
    await page.getByTestId("postit-due-date").fill("2026-11-30")
    const dueDateResponse = await dueDatePatchPromise
    expect(dueDateResponse.status()).toBe(200)
    expect(dueDateResponse.request().postDataJSON().due_date).toBe(
      "2026-11-30",
    )

    const getResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "GET" &&
        response.url().includes(`/api/v1/boards/${boardId}/postits`),
    )
    await page.reload()
    const getResponse = await getResponsePromise
    expect(getResponse.status()).toBe(200)
    const postits = await getResponse.json()
    expect(postits).toHaveLength(1)
    expect(postits[0].priority).toBe("HIGH")
    expect(postits[0].due_date).toBe("2026-11-30")
  })
})
