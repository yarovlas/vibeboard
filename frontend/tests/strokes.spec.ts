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

async function drawLine(
  page: Page,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
) {
  await page.mouse.move(fromX, fromY)
  await page.mouse.down()
  await page.mouse.move(toX, toY, { steps: 10 })
  await page.mouse.up()
}

test.describe("Tekenen", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("tekent een lijn en bewaart deze via de API", async ({ page }) => {
    await createLoggedInBoard(page)
    const boardId = getBoardId(page)
    const stage = page.getByTestId("whiteboard-stage")
    const box = await stage.boundingBox()
    if (!box) throw new Error("Whiteboard stage has no bounding box")

    await page.getByTestId("drawing-toggle").click()
    await page.getByLabel("Pen color").fill("#ff0000")
    await page.getByLabel("Pen width").selectOption("8")

    const responsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().includes(`/api/v1/boards/${boardId}/strokes`) &&
        !response.url().includes("/bulk"),
    )
    await drawLine(
      page,
      box.x + 100,
      box.y + 300,
      box.x + 300,
      box.y + 400,
    )
    const response = await responsePromise
    expect(response.status()).toBe(200)
    const body = response.request().postDataJSON()
    expect(body.points.length).toBeGreaterThanOrEqual(4)
    expect(body.color).toBe("#ff0000")
    expect(body.width).toBe(8)

    const saved = await response.json()
    expect(saved.id).toBeDefined()

    const getResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "GET" &&
        response.url().includes(`/api/v1/boards/${boardId}/strokes`),
    )
    await page.reload()
    const getResponse = await getResponsePromise
    expect(getResponse.status()).toBe(200)
    const strokes = await getResponse.json()
    expect(strokes).toHaveLength(1)
    expect(strokes[0].id).toBe(saved.id)
    expect(strokes[0].points).toEqual(saved.points)
  })

  test("tekenlaag verstoort het slepen van post-its niet", async ({ page }) => {
    await createLoggedInBoard(page)
    const boardId = getBoardId(page)

    await page.getByRole("button", { name: "Add post-it" }).click()
    const editor = page.getByRole("textbox", { name: "Post-it text" })
    await editor.fill("Blijft op zijn plek")
    await expect(editor).toHaveValue("Blijft op zijn plek")
    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().includes(`/api/v1/boards/${boardId}/postits`),
    )
    await editor.blur()
    const createResponse = await createResponsePromise
    expect(createResponse.status()).toBe(200)
    await expect(editor).toHaveCount(0)

    await page.getByTestId("drawing-toggle").click()

    const stage = page.getByTestId("whiteboard-stage")
    const box = await stage.boundingBox()
    if (!box) throw new Error("Whiteboard stage has no bounding box")

    let patchCount = 0
    page.on("request", (request) => {
      if (
        request.method() === "PATCH" &&
        request.url().includes(`/api/v1/boards/${boardId}/postits`)
      ) {
        patchCount += 1
      }
    })

    // Sleep over het midden van de post-it (x=40, y=40, 220x180).
    await drawLine(
      page,
      box.x + 40 + 110,
      box.y + 40 + 90,
      box.x + 40 + 260,
      box.y + 40 + 190,
    )
    await page.waitForTimeout(500)
    expect(patchCount).toBe(0)

    const postitList = page.getByRole("list", {
      name: "Post-its on this whiteboard",
    })
    await expect(postitList).toContainText("Blijft op zijn plek")
  })

  test("dubbelklik maakt geen post-it in tekenmodus", async ({ page }) => {
    await createLoggedInBoard(page)

    await page.getByTestId("drawing-toggle").click()

    const stage = page.getByTestId("whiteboard-stage")
    const box = await stage.boundingBox()
    if (!box) throw new Error("Whiteboard stage has no bounding box")
    await page.mouse.dblclick(box.x + 360, box.y + 240)

    await expect(
      page.getByRole("textbox", { name: "Post-it text" }),
    ).toHaveCount(0)
    const postitList = page.getByRole("list", {
      name: "Post-its on this whiteboard",
    })
    await expect(postitList.locator("li")).toHaveCount(0)
  })
})
