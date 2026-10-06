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

test.describe("Post-it kleur", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("wijzigt de kleur via het palet en behoudt deze na herladen", async ({
    page,
  }) => {
    await createLoggedInBoard(page)
    const boardId = getBoardId(page)
    await createPostIt(page, boardId, "Kleurrijke notitie")

    const stage = page.getByTestId("whiteboard-stage")
    const box = await stage.boundingBox()
    if (!box) throw new Error("Whiteboard stage has no bounding box")

    // Palette is disabled without a selection; click the post-it to select it.
    await page.mouse.click(box.x + 40 + 110, box.y + 40 + 90)
    const pinkButton = page.getByTestId("postit-color-pink")
    await expect(pinkButton).toBeEnabled()

    const patchResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        response.url().includes(`/api/v1/boards/${boardId}/postits/`),
    )
    await pinkButton.click()
    const patchResponse = await patchResponsePromise
    expect(patchResponse.status()).toBe(200)
    expect(patchResponse.request().postDataJSON().color).toBe("#FBCFE8")

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
    expect(postits[0].color).toBe("#FBCFE8")

    await expect(
      page.getByRole("list", { name: "Post-its on this whiteboard" }),
    ).toContainText("Kleurrijke notitie")
  })
})

test.describe("Post-its groeperen", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("groepeert post-its, verplaatst ze samen en deelt ze weer op", async ({
    page,
  }) => {
    await createLoggedInBoard(page)
    const boardId = getBoardId(page)
    await createPostIt(page, boardId, "Eerste groepsnotitie")

    // Second post-it at a non-overlapping position via double-click.
    const stage = page.getByTestId("whiteboard-stage")
    const box = await stage.boundingBox()
    if (!box) throw new Error("Whiteboard stage has no bounding box")
    await page.mouse.dblclick(box.x + 450, box.y + 120)
    const secondEditor = page.getByRole("textbox", { name: "Post-it text" })
    await expect(secondEditor).toBeVisible()
    await secondEditor.fill("Tweede groepsnotitie")
    await expect(secondEditor).toHaveValue("Tweede groepsnotitie")
    const secondCreatePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().includes(`/api/v1/boards/${boardId}/postits`),
    )
    await page.keyboard.press("Control+Enter")
    const secondCreate = await secondCreatePromise
    expect(secondCreate.status()).toBe(200)
    await expect(secondEditor).toHaveCount(0)

    // Multi-select with Shift-click: first note, then add the second one.
    await page.mouse.click(box.x + 40 + 110, box.y + 40 + 90)
    await page.keyboard.down("Shift")
    await page.mouse.click(box.x + 450, box.y + 120)
    await page.keyboard.up("Shift")

    const groupButton = page.getByTestId("group-postits")
    await expect(groupButton).toBeEnabled()
    const groupResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        response.url().includes(`/api/v1/boards/${boardId}/postits/bulk`),
    )
    await groupButton.click()
    const groupResponse = await groupResponsePromise
    expect(groupResponse.status()).toBe(200)
    const grouped = await groupResponse.json()
    expect(grouped).toHaveLength(2)
    expect(grouped[0].group_id).toBeTruthy()
    expect(grouped[0].group_id).toBe(grouped[1].group_id)
    const groupId = grouped[0].group_id as string

    // Reload: the group relation must persist.
    const reloadGetPromise = page.waitForResponse(
      (response) =>
        response.request().method() === "GET" &&
        response.url().includes(`/api/v1/boards/${boardId}/postits`),
    )
    await page.reload()
    const reloadGet = await reloadGetPromise
    expect(reloadGet.status()).toBe(200)
    const reloaded = await reloadGet.json()
    expect(reloaded).toHaveLength(2)
    expect(reloaded[0].group_id).toBe(groupId)
    expect(reloaded[1].group_id).toBe(groupId)
    const before = new Map<string, { x: number; y: number }>(
      reloaded.map(
        (postit: { id: string; x: number; y: number }) =>
          [postit.id, { x: postit.x, y: postit.y }] as const,
      ),
    )

    // Drag one group member: all members move along via a single bulk PATCH.
    const stageAfter = page.getByTestId("whiteboard-stage")
    const boxAfter = await stageAfter.boundingBox()
    if (!boxAfter) throw new Error("Whiteboard stage has no bounding box")
    const first = reloaded.find(
      (postit: { content: string }) =>
        postit.content === "Eerste groepsnotitie",
    )
    if (!first) throw new Error("First grouped post-it not found")
    const startX = first.x + 110
    const startY = first.y + 90
    const deltaX = 100
    const deltaY = 60

    const bulkBodies: Array<Record<string, unknown>> = []
    page.on("request", (request) => {
      if (
        request.method() === "PATCH" &&
        request.url().includes(`/api/v1/boards/${boardId}/postits/bulk`)
      ) {
        bulkBodies.push(request.postDataJSON() ?? {})
      }
    })
    const dragResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        response.url().includes(`/api/v1/boards/${boardId}/postits/bulk`),
    )
    // Playwright mouse coordinates are page-relative; the canvas starts at the box origin.
    await page.mouse.move(boxAfter.x + startX, boxAfter.y + startY)
    await page.mouse.down()
    await page.mouse.move(
      boxAfter.x + startX + deltaX,
      boxAfter.y + startY + deltaY,
      { steps: 10 },
    )
    await page.mouse.up()
    const dragResponse = await dragResponsePromise
    expect(dragResponse.status()).toBe(200)
    await page.waitForTimeout(500)
    expect(bulkBodies).toHaveLength(1)

    const movedGetPromise = page.waitForResponse(
      (response) =>
        response.request().method() === "GET" &&
        response.url().includes(`/api/v1/boards/${boardId}/postits`),
    )
    await page.reload()
    const movedGet = await movedGetPromise
    expect(movedGet.status()).toBe(200)
    const moved = await movedGet.json()
    expect(moved).toHaveLength(2)
    for (const postit of moved) {
      const origin = before.get(postit.id)
      if (!origin) throw new Error("Post-it missing from before snapshot")
      expect(postit.x).toBeCloseTo(origin.x + deltaX, 0)
      expect(postit.y).toBeCloseTo(origin.y + deltaY, 0)
      expect(postit.group_id).toBe(groupId)
    }

    // Ungroup again via multi-select.
    const ungroupBox = await page.getByTestId("whiteboard-stage").boundingBox()
    if (!ungroupBox) throw new Error("Whiteboard stage has no bounding box")
    const firstMoved = moved.find(
      (postit: { content: string }) =>
        postit.content === "Eerste groepsnotitie",
    )
    const secondMoved = moved.find(
      (postit: { content: string }) =>
        postit.content === "Tweede groepsnotitie",
    )
    if (!firstMoved || !secondMoved)
      throw new Error("Grouped post-its not found after move")
    await page.mouse.click(
      ungroupBox.x + firstMoved.x + 110,
      ungroupBox.y + firstMoved.y + 90,
    )
    await page.keyboard.down("Shift")
    await page.mouse.click(
      ungroupBox.x + secondMoved.x + 110,
      ungroupBox.y + secondMoved.y + 90,
    )
    await page.keyboard.up("Shift")

    const ungroupButton = page.getByTestId("ungroup-postits")
    await expect(ungroupButton).toBeEnabled()
    const ungroupResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        response.url().includes(`/api/v1/boards/${boardId}/postits/bulk`),
    )
    await ungroupButton.click()
    const ungroupResponse = await ungroupResponsePromise
    expect(ungroupResponse.status()).toBe(200)
    const ungrouped = await ungroupResponse.json()
    expect(
      ungrouped.every(
        (postit: { group_id: unknown }) => postit.group_id === null,
      ),
    ).toBe(true)
  })
})
