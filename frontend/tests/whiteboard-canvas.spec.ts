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

interface Viewport {
  zoom: number
  x: number
  y: number
}

async function readViewport(page: Page): Promise<Viewport> {
  const stage = page.getByTestId("whiteboard-stage")
  return {
    zoom: Number(await stage.getAttribute("data-zoom")),
    x: Number(await stage.getAttribute("data-pan-x")),
    y: Number(await stage.getAttribute("data-pan-y")),
  }
}

function expectClose(actual: number, expected: number, tolerance = 2) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance)
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

test.describe("Whiteboard onbegrensd canvas", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("pant met de linkermuisknop op een lege plek", async ({ page }) => {
    await createLoggedInBoard(page)
    const stage = page.getByTestId("whiteboard-stage")
    const box = await stage.boundingBox()
    if (!box) throw new Error("Whiteboard stage has no bounding box")

    // Start well clear of the toolbar and the empty-state hint.
    const startX = box.x + box.width - 120
    const startY = box.y + box.height - 100
    await page.mouse.move(startX, startY)
    await page.mouse.down()
    await page.mouse.move(startX - 70, startY - 50, { steps: 8 })
    await page.mouse.up()

    const viewport = await readViewport(page)
    expectClose(viewport.x, -70)
    expectClose(viewport.y, -50)
    // Panning must not create a post-it.
    await expect(
      page
        .getByRole("list", { name: "Post-its on this whiteboard" })
        .getByRole("listitem"),
    ).toHaveCount(0)
  })

  test("een klik zonder slepen opent nog steeds de post-it-editor", async ({
    page,
  }) => {
    await createLoggedInBoard(page)
    const stage = page.getByTestId("whiteboard-stage")
    const box = await stage.boundingBox()
    if (!box) throw new Error("Whiteboard stage has no bounding box")

    await page.mouse.dblclick(box.x + 400, box.y + 200)
    await expect(page.getByTestId("post-it-editor")).toBeVisible()
  })

  test("sleept een post-it voorbij de oude canvasgrens", async ({ page }) => {
    // A small viewport makes the old hardcoded boundary easy to cross.
    await page.setViewportSize({ width: 800, height: 600 })
    await createLoggedInBoard(page)
    const boardId = getBoardId(page)
    await createPostIt(page, boardId, "Voorbij de rand")

    const stage = page.getByTestId("whiteboard-stage")
    const box = await stage.boundingBox()
    if (!box) throw new Error("Whiteboard stage has no bounding box")

    // The card sits at dock slot (40, 40), size 220x180.
    const cardX = box.x + 40 + 110
    const cardY = box.y + 40 + 90
    const delta = { x: 550, y: 0 }
    const patchPromise = page.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        response.url().includes(`/api/v1/boards/${boardId}/postits/`),
    )
    await page.mouse.move(cardX, cardY)
    await page.mouse.down()
    await page.mouse.move(cardX + delta.x, cardY + delta.y, { steps: 12 })
    await page.mouse.up()
    const response = await patchPromise
    expect(response.status()).toBe(200)

    const body = response.request().postDataJSON() as { x: number; y: number }
    expectClose(body.x, 40 + delta.x)
    // The old canvas clamp would have stopped the card at width - 220.
    expect(body.x).toBeGreaterThan(box.width - 220)
  })

  test("sleept een post-it na het pannen naar de juiste boardpositie", async ({
    page,
  }) => {
    await createLoggedInBoard(page)
    const boardId = getBoardId(page)
    await createPostIt(page, boardId, "Na het pannen")

    const stage = page.getByTestId("whiteboard-stage")
    const box = await stage.boundingBox()
    if (!box) throw new Error("Whiteboard stage has no bounding box")

    // Pan the board a little first.
    await page.mouse.move(box.x + box.width - 120, box.y + box.height - 100)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width - 150, box.y + box.height - 130, {
      steps: 6,
    })
    await page.mouse.up()

    const viewport = await readViewport(page)
    const cardX = box.x + 40 + 110 + viewport.x
    const cardY = box.y + 40 + 90 + viewport.y
    const delta = { x: 60, y: 40 }
    const patchPromise = page.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        response.url().includes(`/api/v1/boards/${boardId}/postits/`),
    )
    await page.mouse.move(cardX, cardY)
    await page.mouse.down()
    await page.mouse.move(cardX + delta.x, cardY + delta.y, { steps: 10 })
    await page.mouse.up()
    const response = await patchPromise
    expect(response.status()).toBe(200)

    const body = response.request().postDataJSON() as { x: number; y: number }
    expectClose(body.x, 40 + delta.x)
    expectClose(body.y, 40 + delta.y)
  })
})
