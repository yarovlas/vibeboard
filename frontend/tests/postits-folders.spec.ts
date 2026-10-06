import { expect, type Page, test } from "@playwright/test"

import { createUser } from "./utils/privateApi"
import { randomEmail, randomPassword } from "./utils/random"
import { logInUser } from "./utils/user"

type ApiPostIt = {
  id: string
  content: string
  x: number
  y: number
  color: string
}

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
  return box
}

async function recolorPostIt(
  page: Page,
  boardId: string,
  center: { x: number; y: number },
  colorTestId: string,
  colorHex: string,
): Promise<ApiPostIt> {
  await page.mouse.click(center.x, center.y)
  const colorButton = page.getByTestId(colorTestId)
  await expect(colorButton).toBeEnabled()
  const patchResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "PATCH" &&
      response.url().includes(`/api/v1/boards/${boardId}/postits/`) &&
      !response.url().includes("/bulk"),
  )
  await colorButton.click()
  const patchResponse = await patchResponsePromise
  expect(patchResponse.status()).toBe(200)
  expect(patchResponse.request().postDataJSON().color).toBe(colorHex)
  return (await patchResponse.json()) as ApiPostIt
}

async function collapseByColor(page: Page, boardId: string, colors: string[]) {
  const groupButton = page.getByTestId("group-postits")
  await expect(groupButton).toBeEnabled()
  const responsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "PATCH" &&
      response.url().endsWith(`/api/v1/boards/${boardId}`),
  )
  await groupButton.click()
  const response = await responsePromise
  expect(response.status()).toBe(200)
  expect(response.request().postDataJSON().collapsed_colors).toEqual(colors)
}

async function createPinkPair(
  page: Page,
  boardId: string,
  first: string,
  second: string,
): Promise<{
  first: ApiPostIt
  second: ApiPostIt
  box: { x: number; y: number }
}> {
  await createPostIt(page, boardId, first)
  const box = await createSecondPostIt(page, boardId, second)
  const firstSaved = await recolorPostIt(
    page,
    boardId,
    { x: box.x + 40 + 110, y: box.y + 40 + 90 },
    "postit-color-pink",
    "#FBCFE8",
  )
  const secondSaved = await recolorPostIt(
    page,
    boardId,
    { x: box.x + 450, y: box.y + 120 },
    "postit-color-pink",
    "#FBCFE8",
  )
  return { first: firstSaved, second: secondSaved, box }
}

const FOLDER_SLOT_X = 40
const FOLDER_SLOT_Y = 40

function folderSlotCenter() {
  // First folder slot: top-left (40, 40), size 220x180.
  return { x: FOLDER_SLOT_X + 110, y: FOLDER_SLOT_Y + 90 }
}

function folderDeleteButton(box: { x: number; y: number }) {
  // The × sits 22px inside the folder's bottom-right corner.
  return {
    x: box.x + FOLDER_SLOT_X + 220 - 22,
    y: box.y + FOLDER_SLOT_Y + 180 - 22,
  }
}

test.describe("Post-its groeperen in mappen", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("groepeert per kleur in een map en vouwt uit met een klik", async ({
    page,
  }) => {
    await createLoggedInBoard(page)
    const boardId = getBoardId(page)
    await createPinkPair(
      page,
      boardId,
      "Eerste roze notitie",
      "Tweede roze notitie",
    )
    await collapseByColor(page, boardId, ["#FBCFE8"])

    const folderList = page.getByRole("list", {
      name: "Post-it folders on this whiteboard",
    })
    await expect(folderList).toContainText("Map met 2 post-its")

    // Reload: the collapsed folder must persist.
    const boardGetPromise = page.waitForResponse(
      (response) =>
        response.request().method() === "GET" &&
        response.url().endsWith(`/api/v1/boards/${boardId}`),
    )
    await page.reload()
    const boardGet = await boardGetPromise
    expect(boardGet.status()).toBe(200)
    expect((await boardGet.json()).collapsed_colors).toEqual(["#FBCFE8"])
    await expect(
      page.getByRole("list", {
        name: "Post-it folders on this whiteboard",
      }),
    ).toContainText("Map met 2 post-its")

    // Click the folder to expand it again (first slot of the folder row).
    const center = folderSlotCenter()
    const stageAfter = page.getByTestId("whiteboard-stage")
    const boxAfter = await stageAfter.boundingBox()
    if (!boxAfter) throw new Error("Whiteboard stage has no bounding box")
    const expandPromise = page.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        response.url().endsWith(`/api/v1/boards/${boardId}`),
    )
    await page.mouse.click(boxAfter.x + center.x, boxAfter.y + center.y)
    const expandResponse = await expandPromise
    expect(expandResponse.status()).toBe(200)
    expect(expandResponse.request().postDataJSON().collapsed_colors).toEqual([])
    await expect(folderList.locator("li")).toHaveCount(0)
  })

  test("verwijdert een map met bevestiging", async ({ page }) => {
    await createLoggedInBoard(page)
    const boardId = getBoardId(page)
    await createPinkPair(
      page,
      boardId,
      "Eerste mapnotitie",
      "Tweede mapnotitie",
    )
    await collapseByColor(page, boardId, ["#FBCFE8"])
    await expect(
      page.getByRole("list", {
        name: "Post-it folders on this whiteboard",
      }),
    ).toContainText("Map met 2 post-its")

    // Delete the folder via its × button (first slot of the folder row).
    const folderBox = await page.getByTestId("whiteboard-stage").boundingBox()
    if (!folderBox) throw new Error("Whiteboard stage has no bounding box")
    const deleteAt = folderDeleteButton(folderBox)
    await page.mouse.click(deleteAt.x, deleteAt.y)

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText("Map verwijderen")
    await expect(dialog).toContainText("2 post-its")

    const deletes: Array<number> = []
    page.on("response", (response) => {
      if (
        response.request().method() === "DELETE" &&
        response.url().includes(`/api/v1/boards/${boardId}/postits/`)
      ) {
        deletes.push(response.status())
      }
    })
    await page.getByRole("button", { name: "Verwijderen" }).click()
    await expect.poll(async () => deletes.length, { timeout: 5000 }).toBe(2)
    expect(deletes).toEqual([200, 200])

    const afterGetPromise = page.waitForResponse(
      (response) =>
        response.request().method() === "GET" &&
        response.url().includes(`/api/v1/boards/${boardId}/postits`),
    )
    await page.reload()
    const afterGet = await afterGetPromise
    expect(afterGet.status()).toBe(200)
    expect(await afterGet.json()).toHaveLength(0)
  })

  test("vouwt alle mappen uit via de degroepeer-knop", async ({ page }) => {
    await createLoggedInBoard(page)
    const boardId = getBoardId(page)
    await createPinkPair(
      page,
      boardId,
      "Eerste degroepeer-notitie",
      "Tweede degroepeer-notitie",
    )
    await collapseByColor(page, boardId, ["#FBCFE8"])
    const folderList = page.getByRole("list", {
      name: "Post-it folders on this whiteboard",
    })
    await expect(folderList).toContainText("Map met 2 post-its")

    const ungroupButton = page.getByTestId("ungroup-postits")
    await expect(ungroupButton).toBeEnabled()
    const ungroupPromise = page.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        response.url().endsWith(`/api/v1/boards/${boardId}`),
    )
    await ungroupButton.click()
    const ungroupResponse = await ungroupPromise
    expect(ungroupResponse.status()).toBe(200)
    expect(ungroupResponse.request().postDataJSON().collapsed_colors).toEqual(
      [],
    )
    await expect(folderList.locator("li")).toHaveCount(0)
  })
})
