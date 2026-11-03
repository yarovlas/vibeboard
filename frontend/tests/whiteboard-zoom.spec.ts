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

/** Read the camera state exposed on the canvas for the assertions. */
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

test.describe("Whiteboard zoomen en pannen", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("zoomt met de knoppen en herstelt met reset", async ({ page }) => {
    await createLoggedInBoard(page)
    const zoomLevel = page.getByTestId("zoom-level")

    await expect(zoomLevel).toHaveText("100%")
    await page.getByTestId("zoom-in").click()
    await expect(zoomLevel).toHaveText("120%")
    await page.getByTestId("zoom-in").click()
    await expect(zoomLevel).toHaveText("144%")
    await page.getByTestId("zoom-out").click()
    await expect(zoomLevel).toHaveText("120%")

    await page.getByTestId("zoom-in").click()
    await page.getByTestId("zoom-reset").click()
    await expect(zoomLevel).toHaveText("100%")
    const viewport = await readViewport(page)
    expect(viewport).toEqual({ zoom: 1, x: 0, y: 0 })
  })

  test("zoomt met het muiswiel rond de cursor en begrenst tussen 25% en 400%", async ({
    page,
  }) => {
    await createLoggedInBoard(page)
    const stage = page.getByTestId("whiteboard-stage")
    const box = await stage.locator("canvas").first().boundingBox()
    if (!box) throw new Error("Whiteboard canvas has no bounding box")

    const anchor = { x: box.width * 0.7, y: box.height * 0.45 }
    await page.mouse.move(box.x + anchor.x, box.y + anchor.y)

    for (let step = 0; step < 30; step++) {
      await page.mouse.wheel(0, -100)
    }

    // The zoom clamps at 400% and the point under the cursor stays put.
    await expect(page.getByTestId("zoom-level")).toHaveText("400%")
    const zoomed = await readViewport(page)
    expect(zoomed.zoom).toBe(4)
    expectClose(zoomed.x, anchor.x - anchor.x * 4)
    expectClose(zoomed.y, anchor.y - anchor.y * 4)

    for (let step = 0; step < 45; step++) {
      await page.mouse.wheel(0, 100)
    }
    await expect(page.getByTestId("zoom-level")).toHaveText("25%")
    const zoomedOut = await readViewport(page)
    expect(zoomedOut.zoom).toBe(0.25)
  })

  test("pant met de middelste muisknop", async ({ page }) => {
    await createLoggedInBoard(page)
    const stage = page.getByTestId("whiteboard-stage")
    const box = await stage.boundingBox()
    if (!box) throw new Error("Whiteboard stage has no bounding box")

    const startX = box.x + box.width / 2
    const startY = box.y + box.height / 2
    await page.mouse.move(startX, startY)
    await page.mouse.down({ button: "middle" })
    await page.mouse.move(startX + 80, startY + 40, { steps: 8 })
    await page.mouse.up({ button: "middle" })

    const viewport = await readViewport(page)
    expectClose(viewport.x, 80)
    expectClose(viewport.y, 40)
    expect(viewport.zoom).toBe(1)
  })

  test("pant met spatie en de linkermuisknop", async ({ page }) => {
    await createLoggedInBoard(page)
    const stage = page.getByTestId("whiteboard-stage")
    const box = await stage.boundingBox()
    if (!box) throw new Error("Whiteboard stage has no bounding box")

    await page.keyboard.down("Space")
    const startX = box.x + box.width / 2
    const startY = box.y + box.height / 2
    await page.mouse.move(startX, startY)
    await page.mouse.down()
    await page.mouse.move(startX + 60, startY + 30, { steps: 8 })
    await page.mouse.up()
    await page.keyboard.up("Space")

    const viewport = await readViewport(page)
    expectClose(viewport.x, 60)
    expectClose(viewport.y, 30)
    // Panning must not create a post-it.
    await expect(
      page
        .getByRole("list", { name: "Post-its on this whiteboard" })
        .getByRole("listitem"),
    ).toHaveCount(0)
  })

  test("dubbelklik na zoomen plaatst de post-it op de juiste boardpositie", async ({
    page,
  }) => {
    await createLoggedInBoard(page)
    const boardId = getBoardId(page)
    const stage = page.getByTestId("whiteboard-stage")
    const box = await stage.boundingBox()
    if (!box) throw new Error("Whiteboard stage has no bounding box")

    // Zoom in once via the toolbar, then click on a known canvas point.
    await page.getByTestId("zoom-in").click()
    await expect(page.getByTestId("zoom-level")).toHaveText("120%")
    const viewport = await readViewport(page)

    const screen = { x: 300, y: 200 }
    await page.mouse.dblclick(box.x + screen.x, box.y + screen.y)
    // The draft only turns into a POST once it is committed.
    const editor = page.getByTestId("post-it-editor")
    await expect(editor).toBeVisible()
    await editor.fill("Zoomdraft")
    const postPromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().includes(`/api/v1/boards/${boardId}/postits`),
    )
    await editor.blur()
    const response = await postPromise
    expect(response.status()).toBe(200)

    const body = response.request().postDataJSON() as { x: number; y: number }
    // The draft is centred on the pointer: subtract half a post-it.
    expectClose(body.x, (screen.x - viewport.x) / viewport.zoom - 110)
    expectClose(body.y, (screen.y - viewport.y) / viewport.zoom - 90)
  })

  test("sleept een post-it naar de juiste boardpositie bij zoom", async ({
    page,
  }) => {
    await createLoggedInBoard(page)
    const boardId = getBoardId(page)
    await createPostIt(page, boardId, "Versleep mij")

    const stage = page.getByTestId("whiteboard-stage")
    const box = await stage.boundingBox()
    if (!box) throw new Error("Whiteboard stage has no bounding box")

    // The card is docked at (40, 40); zoom in around its centre so the whole
    // drag stays on screen.
    const cardX = box.x + 40 + 110
    const cardY = box.y + 40 + 90
    await page.mouse.move(cardX, cardY)
    for (let step = 0; step < 3; step++) {
      await page.mouse.wheel(0, -100)
    }
    const viewport = await readViewport(page)
    expect(viewport.zoom).toBeGreaterThan(1)

    const screenDelta = { x: 60, y: 60 }
    const patchPromise = page.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        response.url().includes(`/api/v1/boards/${boardId}/postits/`),
    )
    await page.mouse.move(cardX, cardY)
    await page.mouse.down()
    await page.mouse.move(cardX + screenDelta.x, cardY + screenDelta.y, {
      steps: 10,
    })
    await page.mouse.up()
    const response = await patchPromise
    expect(response.status()).toBe(200)

    const body = response.request().postDataJSON() as { x: number; y: number }
    // Screen movement is divided by the zoom factor to get board movement.
    expectClose(body.x, 40 + screenDelta.x / viewport.zoom)
    expectClose(body.y, 40 + screenDelta.y / viewport.zoom)
  })
})
