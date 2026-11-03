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

/** Set the priority and/or status of a card through the kanban edit dialog. */
async function setCardMeta(
  page: Page,
  text: string,
  meta: { priority?: string; status?: string },
) {
  const card = page.getByTestId("kanban-card").filter({ hasText: text })
  await card.getByTestId("kanban-card-edit").click()
  const dialog = page.getByTestId("kanban-postit-dialog")
  await expect(dialog).toBeVisible()

  if (meta.priority) {
    await page.getByTestId("kanban-postit-priority-select").click()
    await page.getByRole("option", { name: meta.priority }).click()
  }
  if (meta.status) {
    await page.getByTestId("kanban-postit-status-select").click()
    await page.getByRole("option", { name: meta.status }).click()
  }

  await page.getByTestId("kanban-postit-save").click()
  await expect(dialog).toHaveCount(0)
}

function cardsIn(page: Page, status: string) {
  return page
    .getByTestId(`kanban-column-${status}`)
    .getByTestId("kanban-card")
}

test.describe("Kanban filteren", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("verbergt een kolom met de statusfilter en bewaart dit na herladen", async ({
    page,
  }) => {
    await createLoggedInBoard(page)
    const boardId = getBoardId(page)
    await createPostIt(page, boardId, "Blijft zichtbaar")
    await openKanban(page)

    await page.getByTestId("kanban-filter-status-IN_PROGRESS").click()
    await expect(page.getByTestId("kanban-column-IN_PROGRESS")).toHaveCount(0)
    await expect(page.getByTestId("kanban-column-TODO")).toBeVisible()
    await expect(
      page.getByTestId("kanban-filter-status-IN_PROGRESS"),
    ).toHaveAttribute("aria-pressed", "false")
    await expect(page).toHaveURL(/status=/)

    await page.reload()
    await openKanban(page)
    await expect(page.getByTestId("kanban-column-IN_PROGRESS")).toHaveCount(0)
    await expect(
      page.getByTestId("kanban-filter-status-IN_PROGRESS"),
    ).toHaveAttribute("aria-pressed", "false")

    // Turning the last hidden column back on restores a clean URL.
    await page.getByTestId("kanban-filter-status-IN_PROGRESS").click()
    await expect(page.getByTestId("kanban-column-IN_PROGRESS")).toBeVisible()
    await expect(page).not.toHaveURL(/status=/)
  })

  test("filtert kaarten op prioriteit en bewaart dit na herladen", async ({
    page,
  }) => {
    await createLoggedInBoard(page)
    const boardId = getBoardId(page)
    await createPostIt(page, boardId, "Hoge prioriteit")
    await createPostIt(page, boardId, "Zonder prioriteit")
    await openKanban(page)

    await setCardMeta(page, "Hoge prioriteit", { priority: "HIGH" })
    await expect(cardsIn(page, "TODO")).toHaveCount(2)

    await page.getByTestId("kanban-filter-priority-NONE").click()
    await expect(cardsIn(page, "TODO")).toHaveCount(1)
    await expect(cardsIn(page, "TODO")).toContainText(["Hoge prioriteit"])
    await expect(page).toHaveURL(/priority=/)

    await page.reload()
    await openKanban(page)
    await expect(cardsIn(page, "TODO")).toHaveCount(1)
    await expect(cardsIn(page, "TODO")).toContainText(["Hoge prioriteit"])

    await page.getByTestId("kanban-filter-priority-NONE").click()
    await expect(cardsIn(page, "TODO")).toHaveCount(2)
  })

  test("combineert het status- en prioriteitsfilter", async ({ page }) => {
    await createLoggedInBoard(page)
    const boardId = getBoardId(page)
    await createPostIt(page, boardId, "Todo hoog")
    await createPostIt(page, boardId, "Todo laag")
    await createPostIt(page, boardId, "Bezig hoog")
    await openKanban(page)

    await setCardMeta(page, "Todo hoog", { priority: "HIGH" })
    await setCardMeta(page, "Todo laag", { priority: "LOW" })
    await setCardMeta(page, "Bezig hoog", {
      priority: "HIGH",
      status: "IN PROGRESS",
    })
    await expect(cardsIn(page, "TODO")).toHaveCount(2)
    await expect(cardsIn(page, "IN_PROGRESS")).toContainText(["Bezig hoog"])

    await page.getByTestId("kanban-filter-status-IN_PROGRESS").click()
    await page.getByTestId("kanban-filter-priority-LOW").click()

    await expect(page.getByTestId("kanban-column-IN_PROGRESS")).toHaveCount(0)
    await expect(cardsIn(page, "TODO")).toHaveCount(1)
    await expect(cardsIn(page, "TODO")).toContainText(["Todo hoog"])

    // Both filters survive a reload because they live in the URL.
    await page.reload()
    await openKanban(page)
    await expect(page.getByTestId("kanban-column-IN_PROGRESS")).toHaveCount(0)
    await expect(cardsIn(page, "TODO")).toHaveCount(1)
    await expect(cardsIn(page, "TODO")).toContainText(["Todo hoog"])
  })

  test("toont een melding als alle kolommen zijn verborgen", async ({
    page,
  }) => {
    await createLoggedInBoard(page)
    const boardId = getBoardId(page)
    await createPostIt(page, boardId, "Kaart")
    await openKanban(page)

    for (const status of ["TODO", "IN_PROGRESS", "DONE"]) {
      await page.getByTestId(`kanban-filter-status-${status}`).click()
    }

    await expect(page.getByTestId("kanban-no-columns")).toBeVisible()
    await expect(page.getByTestId("kanban-column-TODO")).toHaveCount(0)

    await page.reload()
    await openKanban(page)
    await expect(page.getByTestId("kanban-no-columns")).toBeVisible()
  })
})
