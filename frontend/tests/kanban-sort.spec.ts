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

/** Set the priority and/or due date of a card through the kanban edit dialog. */
async function setCardMeta(
  page: Page,
  text: string,
  meta: { priority?: string; dueDate?: string },
) {
  const card = page.getByTestId("kanban-card").filter({ hasText: text })
  await card.getByTestId("kanban-card-edit").click()
  const dialog = page.getByTestId("kanban-postit-dialog")
  await expect(dialog).toBeVisible()

  if (meta.priority) {
    await page.getByTestId("kanban-postit-priority-select").click()
    await page.getByRole("option", { name: meta.priority }).click()
  }
  if (meta.dueDate) {
    await page.getByTestId("kanban-postit-due-date").fill(meta.dueDate)
  }

  await page.getByTestId("kanban-postit-save").click()
  await expect(dialog).toHaveCount(0)
}

function cardsIn(page: Page, status: string) {
  return page.getByTestId(`kanban-column-${status}`).getByTestId("kanban-card")
}

async function chooseSortKey(page: Page, name: string) {
  await page.getByTestId("kanban-sort-key").click()
  await page.getByRole("option", { name }).click()
}

test.describe("Kanban sorteren", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("sorteert op prioriteit in beide richtingen", async ({ page }) => {
    await createLoggedInBoard(page)
    const boardId = getBoardId(page)
    await createPostIt(page, boardId, "Lage prioriteit")
    await createPostIt(page, boardId, "Middel prioriteit")
    await createPostIt(page, boardId, "Hoge prioriteit")
    await openKanban(page)

    await setCardMeta(page, "Lage prioriteit", { priority: "LOW" })
    await setCardMeta(page, "Middel prioriteit", { priority: "MEDIUM" })
    await setCardMeta(page, "Hoge prioriteit", { priority: "HIGH" })

    // Manual order keeps the order in which the post-its were created.
    await expect(cardsIn(page, "TODO")).toContainText([
      "Lage prioriteit",
      "Middel prioriteit",
      "Hoge prioriteit",
    ])

    await chooseSortKey(page, "Priority")
    await expect(cardsIn(page, "TODO")).toContainText([
      "Lage prioriteit",
      "Middel prioriteit",
      "Hoge prioriteit",
    ])

    await page.getByTestId("kanban-sort-order").click()
    await expect(cardsIn(page, "TODO")).toContainText([
      "Hoge prioriteit",
      "Middel prioriteit",
      "Lage prioriteit",
    ])

    await page.getByTestId("kanban-sort-order").click()
    await expect(cardsIn(page, "TODO")).toContainText([
      "Lage prioriteit",
      "Middel prioriteit",
      "Hoge prioriteit",
    ])
  })

  test("sorteert op vervaldatum en houdt kaarten zonder datum onderaan", async ({
    page,
  }) => {
    await createLoggedInBoard(page)
    const boardId = getBoardId(page)
    await createPostIt(page, boardId, "Late deadline")
    await createPostIt(page, boardId, "Vroege deadline")
    await createPostIt(page, boardId, "Geen deadline")
    await openKanban(page)

    await setCardMeta(page, "Late deadline", { dueDate: "2026-12-01" })
    await setCardMeta(page, "Vroege deadline", { dueDate: "2026-11-01" })

    await chooseSortKey(page, "Due date")
    await expect(cardsIn(page, "TODO")).toContainText([
      "Vroege deadline",
      "Late deadline",
      "Geen deadline",
    ])

    await page.getByTestId("kanban-sort-order").click()
    await expect(cardsIn(page, "TODO")).toContainText([
      "Late deadline",
      "Vroege deadline",
      "Geen deadline",
    ])
  })

  test("terug naar handmatige volgorde herstelt de aanmaakvolgorde", async ({
    page,
  }) => {
    await createLoggedInBoard(page)
    const boardId = getBoardId(page)
    await createPostIt(page, boardId, "Eerste kaart")
    await createPostIt(page, boardId, "Tweede kaart")
    await openKanban(page)

    await setCardMeta(page, "Eerste kaart", { priority: "LOW" })
    await setCardMeta(page, "Tweede kaart", { priority: "HIGH" })

    await chooseSortKey(page, "Priority")
    await expect(cardsIn(page, "TODO")).toContainText([
      "Eerste kaart",
      "Tweede kaart",
    ])

    await chooseSortKey(page, "Manual order")
    await expect(cardsIn(page, "TODO")).toContainText([
      "Eerste kaart",
      "Tweede kaart",
    ])
  })
})
