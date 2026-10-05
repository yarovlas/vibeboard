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

test.describe("Post-it creation", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("creates a post-it from the toolbar and persists its text", async ({
    page,
  }) => {
    await createLoggedInBoard(page)
    const boardId = getBoardId(page)

    await page.getByRole("button", { name: "Add post-it" }).click()
    const editor = page.getByRole("textbox", { name: "Post-it text" })
    await expect(editor).toBeFocused()
    await editor.fill("A thought worth keeping")

    const responsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().includes(`/api/v1/boards/${boardId}/postits`),
    )
    await editor.blur()
    const response = await responsePromise
    expect(response.status()).toBe(200)
    await expect(editor).toHaveCount(0)

    const postitList = page.getByRole("list", {
      name: "Post-its on this whiteboard",
    })
    await expect(postitList).toContainText("A thought worth keeping")

    await page.reload()
    await expect(
      page.getByRole("list", { name: "Post-its on this whiteboard" }),
    ).toContainText("A thought worth keeping")
  })

  test("creates a post-it at the double-click position", async ({ page }) => {
    await createLoggedInBoard(page)
    const boardId = getBoardId(page)
    const stage = page.getByTestId("whiteboard-stage")
    const box = await stage.boundingBox()
    if (!box) throw new Error("Whiteboard stage has no bounding box")

    await page.mouse.dblclick(box.x + 360, box.y + 240)
    const editor = page.getByRole("textbox", { name: "Post-it text" })
    await expect(editor).toBeVisible()
    await editor.fill("Created by double-click")
    await expect(editor).toHaveValue("Created by double-click")

    const requestPromise = page.waitForRequest(
      (request) =>
        request.method() === "POST" &&
        request.url().includes(`/api/v1/boards/${boardId}/postits`),
    )
    await page.keyboard.press("Control+Enter")
    const request = await requestPromise
    const body = request.postDataJSON()
    expect(body.x).toBeGreaterThan(0)
    expect(body.y).toBeGreaterThan(0)
    expect(body.content).toBe("Created by double-click")
    await expect(editor).toHaveCount(0)
  })

  test("does not create a second post-it when an existing one is double-clicked", async ({
    page,
  }) => {
    await createLoggedInBoard(page)
    const boardId = getBoardId(page)

    await page.getByRole("button", { name: "Add post-it" }).click()
    const editor = page.getByRole("textbox", { name: "Post-it text" })
    await editor.fill("Only one note")
    await expect(editor).toHaveValue("Only one note")

    const responsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().includes(`/api/v1/boards/${boardId}/postits`),
    )
    await editor.blur()
    const response = await responsePromise
    expect(response.status()).toBe(200)
    await expect(editor).toHaveCount(0)

    const stage = page.getByTestId("whiteboard-stage")
    const box = await stage.boundingBox()
    if (!box) throw new Error("Whiteboard stage has no bounding box")
    await page.mouse.dblclick(box.x + 120, box.y + 120)

    // Double-clicking an existing post-it opens it for editing,
    // it must not create a second (empty) draft.
    const editEditor = page.getByRole("textbox", { name: "Post-it text" })
    await expect(editEditor).toBeVisible()
    await expect(editEditor).toHaveValue("Only one note")
    const postitList = page.getByRole("list", {
      name: "Post-its on this whiteboard",
    })
    await expect(postitList.locator("li")).toHaveCount(1)
    await expect(postitList).toContainText("Only one note")
  })
})

test.describe("Post-it bewerken", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("bewerkt een bestaande post-it via dubbelklik", async ({ page }) => {
    await createLoggedInBoard(page)
    const boardId = getBoardId(page)

    // Create a post-it
    await page.getByRole("button", { name: "Add post-it" }).click()
    const editor = page.getByRole("textbox", { name: "Post-it text" })
    await editor.fill("Oude tekst")
    await editor.blur()
    await expect(editor).toHaveCount(0)

    // Double-click the post-it to edit
    const stage = page.getByTestId("whiteboard-stage")
    const box = await stage.boundingBox()
    if (!box) throw new Error("Whiteboard stage has no bounding box")
    await page.mouse.dblclick(box.x + 150, box.y + 130)

    const editEditor = page.getByRole("textbox", { name: "Post-it text" })
    await expect(editEditor).toBeVisible()
    await expect(editEditor).toHaveValue("Oude tekst")
    await editEditor.fill("Nieuwe tekst")

    const responsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        response.url().includes(`/api/v1/boards/${boardId}/postits/`),
    )
    await editEditor.blur()
    const response = await responsePromise
    expect(response.status()).toBe(200)

    const postitList = page.getByRole("list", {
      name: "Post-its on this whiteboard",
    })
    await expect(postitList).toContainText("Nieuwe tekst")
    await expect(postitList).not.toContainText("Oude tekst")
  })
})

test.describe("Post-it verwijderen", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("verwijdert een post-it met bevestiging", async ({ page }) => {
    await createLoggedInBoard(page)
    const boardId = getBoardId(page)

    // Create a post-it
    await page.getByRole("button", { name: "Add post-it" }).click()
    const editor = page.getByRole("textbox", { name: "Post-it text" })
    await editor.fill("Te verwijderen")
    await editor.blur()
    await expect(editor).toHaveCount(0)

    // Click the delete button on the post-it
    const stage = page.getByTestId("whiteboard-stage")
    const box = await stage.boundingBox()
    if (!box) throw new Error("Whiteboard stage has no bounding box")
    // The delete button is at the top-right of the post-it (POSTIT_WIDTH=220, POSTIT_HEIGHT=180)
    // Post-it is at x=40, y=40 (default addDraft position), so delete button is around x=40+220-22, y=40+22
    await page.mouse.click(box.x + 40 + 220 - 22, box.y + 40 + 22)

    // Confirmation dialog should appear
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText("Post-it verwijderen")

    // Confirm deletion
    const responsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "DELETE" &&
        response.url().includes(`/api/v1/boards/${boardId}/postits/`),
    )
    await page.getByRole("button", { name: "Verwijderen" }).click()
    const response = await responsePromise
    expect(response.status()).toBe(200)

    // Post-it should be gone
    const postitList = page.getByRole("list", {
      name: "Post-its on this whiteboard",
    })
    await expect(postitList).not.toContainText("Te verwijderen")
  })

  test("annuleert verwijderen via de Annuleren-knop", async ({ page }) => {
    await createLoggedInBoard(page)

    // Create a post-it
    await page.getByRole("button", { name: "Add post-it" }).click()
    const editor = page.getByRole("textbox", { name: "Post-it text" })
    await editor.fill("Blijft bestaan")
    await editor.blur()
    await expect(editor).toHaveCount(0)

    // Click the delete button
    const stage = page.getByTestId("whiteboard-stage")
    const box = await stage.boundingBox()
    if (!box) throw new Error("Whiteboard stage has no bounding box")
    await page.mouse.click(box.x + 40 + 220 - 22, box.y + 40 + 22)

    // Confirmation dialog should appear
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()

    // Cancel deletion
    await page.getByRole("button", { name: "Annuleren" }).click()
    await expect(dialog).toHaveCount(0)

    // Post-it should still be there
    const postitList = page.getByRole("list", {
      name: "Post-its on this whiteboard",
    })
    await expect(postitList).toContainText("Blijft bestaan")
  })
})

test.describe("Post-it verslepen", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("sleept een post-it naar een nieuwe positie en behoudt deze na herladen", async ({
    page,
  }) => {
    await createLoggedInBoard(page)
    const boardId = getBoardId(page)

    // Create a post-it (default position x=40, y=40)
    await page.getByRole("button", { name: "Add post-it" }).click()
    const editor = page.getByRole("textbox", { name: "Post-it text" })
    await editor.fill("Versleepbare notitie")
    await expect(editor).toHaveValue("Versleepbare notitie")
    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().includes(`/api/v1/boards/${boardId}/postits`),
    )
    await editor.blur()
    const createResponse = await createResponsePromise
    expect(createResponse.status()).toBe(200)
    await expect(editor).toHaveCount(0)

    const stage = page.getByTestId("whiteboard-stage")
    const box = await stage.boundingBox()
    if (!box) throw new Error("Whiteboard stage has no bounding box")
    // Center of the post-it (POSTIT_WIDTH=220, POSTIT_HEIGHT=180 at x=40, y=40)
    const startX = box.x + 40 + 110
    const startY = box.y + 40 + 90
    const deltaX = 150
    const deltaY = 100

    const patchBodies: Array<Record<string, unknown>> = []
    page.on("request", (request) => {
      if (
        request.method() === "PATCH" &&
        request.url().includes(`/api/v1/boards/${boardId}/postits`)
      ) {
        patchBodies.push(request.postDataJSON() ?? {})
      }
    })
    const patchResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        response.url().includes(`/api/v1/boards/${boardId}/postits/`),
    )

    await page.mouse.move(startX, startY)
    await page.mouse.down()
    await page.mouse.move(startX + deltaX, startY + deltaY, { steps: 10 })
    await page.mouse.up()

    const patchResponse = await patchResponsePromise
    expect(patchResponse.status()).toBe(200)
    const savedBody = patchResponse.request().postDataJSON()
    expect(savedBody.x).toBeGreaterThan(40)
    expect(savedBody.y).toBeGreaterThan(40)

    // Exactly one PATCH for the whole drag (no API-call per mousemove)
    await page.waitForTimeout(500)
    expect(patchBodies).toHaveLength(1)

    // Reload: position must persist
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
    expect(postits[0].x).toBeCloseTo(savedBody.x, 1)
    expect(postits[0].y).toBeCloseTo(savedBody.y, 1)

    const postitList = page.getByRole("list", {
      name: "Post-its on this whiteboard",
    })
    await expect(postitList).toContainText("Versleepbare notitie")
  })
})
