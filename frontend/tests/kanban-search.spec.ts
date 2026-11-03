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
  await expect(
    page.getByRole("list", { name: "Post-its on this whiteboard" }),
  ).toContainText(text)
}

async function openKanban(page: Page) {
  await page.getByRole("button", { name: "Kanban view" }).click()
  await expect(page.getByTestId("kanban-board")).toBeVisible()
}

/** Set the priority of a card through the kanban edit dialog. */
async function setCardPriority(page: Page, text: string, priority: string) {
  const card = page.getByTestId("kanban-card").filter({ hasText: text })
  await card.getByTestId("kanban-card-edit").click()
  const dialog = page.getByTestId("kanban-postit-dialog")
  await expect(dialog).toBeVisible()
  await page.getByTestId("kanban-postit-priority-select").click()
  await page.getByRole("option", { name: priority }).click()
  await page.getByTestId("kanban-postit-save").click()
  await expect(dialog).toHaveCount(0)
}

function cardsIn(page: Page, status: string) {
  return page.getByTestId(`kanban-column-${status}`).getByTestId("kanban-card")
}

function searchField(page: Page) {
  return page.getByTestId("kanban-search")
}

test.describe("Kanban zoeken", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("doorzoekt de tekst van kaarten, ongeacht hoofdletters", async ({
    page,
  }) => {
    await createLoggedInBoard(page)
    const boardId = getBoardId(page)
    await createPostIt(page, boardId, "Boodschappen doen")
    await createPostIt(page, boardId, "Rapport schrijven")
    await createPostIt(page, boardId, "Belasting betalen")
    await openKanban(page)
    await expect(cardsIn(page, "TODO")).toHaveCount(3)

    await searchField(page).fill("boodschappen")
    await expect(cardsIn(page, "TODO")).toHaveCount(1)
    await expect(cardsIn(page, "TODO")).toContainText(["Boodschappen doen"])

    await searchField(page).fill("BETALEN")
    await expect(cardsIn(page, "TODO")).toHaveCount(1)
    await expect(cardsIn(page, "TODO")).toContainText(["Belasting betalen"])

    await searchField(page).fill("schrijven")
    await expect(cardsIn(page, "TODO")).toHaveCount(1)
    await expect(cardsIn(page, "TODO")).toContainText(["Rapport schrijven"])

    await searchField(page).fill("")
    await expect(cardsIn(page, "TODO")).toHaveCount(3)
  })

  test("bewaart de zoekopdracht in de URL en na herladen", async ({ page }) => {
    await createLoggedInBoard(page)
    const boardId = getBoardId(page)
    await createPostIt(page, boardId, "Boodschappen doen")
    await createPostIt(page, boardId, "Rapport schrijven")
    await openKanban(page)

    await searchField(page).fill("boodschappen")
    await expect(page).toHaveURL(/q=boodschappen/)
    await expect(cardsIn(page, "TODO")).toHaveCount(1)

    await page.reload()
    // The board view itself is not persisted, so switch back to kanban; the
    // search query is still in the URL.
    await openKanban(page)
    await expect(searchField(page)).toHaveValue("boodschappen")
    await expect(cardsIn(page, "TODO")).toHaveCount(1)
    await expect(cardsIn(page, "TODO")).toContainText(["Boodschappen doen"])
  })

  test("combineert zoeken met het prioriteitsfilter", async ({ page }) => {
    await createLoggedInBoard(page)
    const boardId = getBoardId(page)
    await createPostIt(page, boardId, "Hoge boodschappen")
    await createPostIt(page, boardId, "Lage boodschappen")
    await openKanban(page)

    await setCardPriority(page, "Hoge boodschappen", "HIGH")
    await setCardPriority(page, "Lage boodschappen", "LOW")
    await page.getByTestId("kanban-filter-priority-LOW").click()

    await searchField(page).fill("boodschappen")
    await expect(cardsIn(page, "TODO")).toHaveCount(1)
    await expect(cardsIn(page, "TODO")).toContainText(["Hoge boodschappen"])

    // A term that only matches the filtered-out card yields no results.
    await searchField(page).fill("lage")
    await expect(cardsIn(page, "TODO")).toHaveCount(0)

    // Clearing the query brings back the card that passes the filter.
    await searchField(page).fill("")
    await expect(cardsIn(page, "TODO")).toHaveCount(1)
    await expect(cardsIn(page, "TODO")).toContainText(["Hoge boodschappen"])
  })
})
