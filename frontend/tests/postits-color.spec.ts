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
