import { expect, type Locator, type Page, test } from "@playwright/test"

import { createUser } from "./utils/privateApi"
import { randomEmail, randomPassword } from "./utils/random"
import { logInUser } from "./utils/user"

const KANBAN_COLUMNS = ["TODO", "IN_PROGRESS", "DONE"] as const

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
  // Wait until the new card is in the shared React Query cache before
  // switching views, otherwise the kanban can mount a tick too early.
  await expect(
    page.getByRole("list", { name: "Post-its on this whiteboard" }),
  ).toContainText(text)
}

/** Open the editor of the single post-it created by createPostIt. */
async function openEditor(page: Page) {
  const stage = page.getByTestId("whiteboard-stage")
  const box = await stage.boundingBox()
  if (!box) throw new Error("Whiteboard stage has no bounding box")
  // The card sits at the top-left dock slot (40, 40) and is 220x180.
  await page.mouse.dblclick(box.x + 40 + 110, box.y + 40 + 90)
  await expect(page.getByTestId("post-it-editor")).toBeVisible()
}

/**
 * Sleep een kaart met de muis naar het midden van een kolom. De eerste
 * muisbeweging is groter dan de activeringsafstand (6px), zodat de sleep
 * echt begint; daarna volgt de kaart de muis in kleine stappen.
 */
async function dragCardToColumn(
  page: Page,
  card: Locator,
  columnTestId: string,
) {
  const cardBox = await card.boundingBox()
  const columnBox = await page.getByTestId(columnTestId).boundingBox()
  if (!cardBox || !columnBox) {
    throw new Error("Kaart of kolom heeft geen bounding box")
  }

  const startX = cardBox.x + cardBox.width / 2
  const startY = cardBox.y + cardBox.height / 2
  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(startX + 10, startY + 10, { steps: 3 })
  // Pas zodra de sensor actief is, verschijnt de sleepweergave.
  await expect(page.getByTestId("kanban-drag-overlay")).toBeVisible()
  await page.mouse.move(
    columnBox.x + columnBox.width / 2,
    columnBox.y + columnBox.height / 2,
    { steps: 10 },
  )
  await page.mouse.up()
  // dnd-kit blokkeert kort na een sleep nog klik-events (om een klik na het
  // neerzetten te negeren). Wacht tot de sleepweergave weg is voordat de test
  // weer op de pagina klikt.
  await expect(page.getByTestId("kanban-drag-overlay")).toHaveCount(0)
}

/**
 * Maakt een post-it op het whiteboard en schakelt daarna naar de
 * kanban-weergave, waar de kaart direct zichtbaar is.
 */
async function openKanbanWithPostIt(page: Page, boardId: string, text: string) {
  await createPostIt(page, boardId, text)
  await page.getByRole("button", { name: "Kanban view" }).click()
  await expect(page.getByTestId("kanban-board")).toBeVisible()
  await expect(page.getByTestId("kanban-card")).toHaveCount(1)
}

test.describe("Kanban-weergave", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("toont drie kolommen en plaatst een post-it in TODO", async ({
    page,
  }) => {
    await createLoggedInBoard(page)
    const boardId = getBoardId(page)
    await createPostIt(page, boardId, "Kaart in de todo-kolom")

    await page.getByRole("button", { name: "Kanban view" }).click()

    await expect(page.getByTestId("kanban-board")).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Kanban view" }),
    ).toHaveAttribute("aria-pressed", "true")
    await expect(
      page.getByRole("button", { name: "Whiteboard view" }),
    ).toHaveAttribute("aria-pressed", "false")
    const headings = { TODO: "TODO", IN_PROGRESS: "IN PROGRESS", DONE: "DONE" }
    for (const status of KANBAN_COLUMNS) {
      const column = page.getByTestId(`kanban-column-${status}`)
      await expect(column).toBeVisible()
      await expect(
        column.getByRole("heading", { name: headings[status] }),
      ).toBeVisible()
    }

    // The whiteboard toolbar does not belong to the kanban view.
    await expect(page.getByRole("button", { name: "Add post-it" })).toHaveCount(
      0,
    )

    const todoColumn = page.getByTestId("kanban-column-TODO")
    await expect(todoColumn.getByTestId("kanban-card")).toHaveCount(1)
    await expect(todoColumn).toContainText("Kaart in de todo-kolom")
    await expect(page.getByTestId("kanban-count-TODO")).toHaveText("1")
    await expect(page.getByTestId("kanban-count-IN_PROGRESS")).toHaveText("0")
    await expect(page.getByTestId("kanban-count-DONE")).toHaveText("0")
    await expect(page.getByTestId("kanban-empty-TODO")).toHaveCount(0)
    await expect(page.getByTestId("kanban-empty-IN_PROGRESS")).toBeVisible()
    await expect(page.getByTestId("kanban-empty-DONE")).toBeVisible()
  })

  test("plaatst een post-it in de kolom van de gewijzigde status", async ({
    page,
  }) => {
    await createLoggedInBoard(page)
    const boardId = getBoardId(page)
    await createPostIt(page, boardId, "Taak om af te ronden")

    await openEditor(page)
    const statusResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        response.url().includes(`/api/v1/boards/${boardId}/postits/`),
    )
    await page.getByTestId("postit-status-select").click()
    await page.getByRole("option", { name: "DONE" }).click()
    const statusResponse = await statusResponsePromise
    expect(statusResponse.status()).toBe(200)

    const priorityResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        response.url().includes(`/api/v1/boards/${boardId}/postits/`),
    )
    await page.getByTestId("postit-priority-select").click()
    await page.getByRole("option", { name: "HIGH" }).click()
    const priorityResponse = await priorityResponsePromise
    expect(priorityResponse.status()).toBe(200)

    await page.getByRole("button", { name: "Kanban view" }).click()

    const doneColumn = page.getByTestId("kanban-column-DONE")
    await expect(doneColumn.getByTestId("kanban-card")).toHaveCount(1)
    await expect(doneColumn).toContainText("Taak om af te ronden")
    await expect(doneColumn).toContainText("HIGH")
    await expect(page.getByTestId("kanban-count-DONE")).toHaveText("1")

    const todoColumn = page.getByTestId("kanban-column-TODO")
    await expect(todoColumn.getByTestId("kanban-card")).toHaveCount(0)
    await expect(page.getByTestId("kanban-empty-TODO")).toBeVisible()
  })

  test("toont een lege toestand in alle kolommen zonder post-its", async ({
    page,
  }) => {
    await createLoggedInBoard(page)
    await page.getByRole("button", { name: "Kanban view" }).click()

    await expect(page.getByTestId("kanban-board")).toBeVisible()
    for (const status of KANBAN_COLUMNS) {
      await expect(page.getByTestId(`kanban-empty-${status}`)).toBeVisible()
      await expect(page.getByTestId(`kanban-count-${status}`)).toHaveText("0")
      await expect(
        page.getByTestId(`kanban-column-${status}`).getByTestId("kanban-card"),
      ).toHaveCount(0)
    }
  })

  test("zet de kolommen naast elkaar en scrollt horizontaal op smalle schermen", async ({
    page,
  }) => {
    await createLoggedInBoard(page)
    await page.getByRole("button", { name: "Kanban view" }).click()
    await expect(page.getByTestId("kanban-board")).toBeVisible()

    // Wide screens: the three columns sit side by side, top-aligned.
    const todoBox = await page.getByTestId("kanban-column-TODO").boundingBox()
    const progressBox = await page
      .getByTestId("kanban-column-IN_PROGRESS")
      .boundingBox()
    const doneBox = await page.getByTestId("kanban-column-DONE").boundingBox()
    if (!todoBox || !progressBox || !doneBox) {
      throw new Error("Kanban columns have no bounding box")
    }
    expect(todoBox.x).toBeLessThan(progressBox.x)
    expect(progressBox.x).toBeLessThan(doneBox.x)
    expect(Math.abs(todoBox.y - doneBox.y)).toBeLessThan(1)

    await page.setViewportSize({ width: 420, height: 800 })

    // Narrow screens: the columns keep their width and scroll inside the
    // board instead of pushing the page wider.
    const columns = page.getByTestId("kanban-columns")
    const { scrollWidth, clientWidth } = await columns.evaluate((element) => ({
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
    }))
    expect(scrollWidth).toBeGreaterThan(clientWidth)
    const pageOverflows = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    )
    expect(pageOverflows).toBe(false)
  })

  test("behoudt de post-it bij terugschakelen naar het whiteboard", async ({
    page,
  }) => {
    await createLoggedInBoard(page)
    const boardId = getBoardId(page)
    await createPostIt(page, boardId, "Gedeelde kaart")

    await page.getByRole("button", { name: "Kanban view" }).click()
    await expect(
      page.getByTestId("kanban-column-TODO").getByTestId("kanban-card"),
    ).toBeVisible()

    await page.getByRole("button", { name: "Whiteboard view" }).click()
    await expect(page.getByTestId("whiteboard-stage")).toBeVisible()
    await expect(
      page.getByRole("list", { name: "Post-its on this whiteboard" }),
    ).toContainText("Gedeelde kaart")
  })

  test("versleept een kaart van TODO naar DONE en slaat alleen de status op", async ({
    page,
  }) => {
    await createLoggedInBoard(page)
    const boardId = getBoardId(page)
    await createPostIt(page, boardId, "Kaart om te verslepen")

    await page.getByRole("button", { name: "Kanban view" }).click()
    const todoColumn = page.getByTestId("kanban-column-TODO")
    const card = todoColumn.getByTestId("kanban-card")
    await expect(card).toBeVisible()

    const patchResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        response.url().includes(`/api/v1/boards/${boardId}/postits/`),
    )
    await dragCardToColumn(page, card, "kanban-column-DONE")
    const patchResponse = await patchResponsePromise
    expect(patchResponse.status()).toBe(200)
    // Alleen de status gaat mee, niet de rest van de post-it.
    expect(patchResponse.request().postDataJSON()).toEqual({ status: "DONE" })

    const doneColumn = page.getByTestId("kanban-column-DONE")
    await expect(doneColumn.getByTestId("kanban-card")).toHaveCount(1)
    await expect(doneColumn).toContainText("Kaart om te verslepen")
    await expect(page.getByTestId("kanban-count-DONE")).toHaveText("1")
    await expect(page.getByTestId("kanban-count-TODO")).toHaveText("0")
    await expect(page.getByTestId("kanban-empty-TODO")).toBeVisible()
    await expect(page.getByTestId("kanban-empty-DONE")).toHaveCount(0)
  })

  test("behoudt de versleepte kaart in DONE na herladen", async ({ page }) => {
    await createLoggedInBoard(page)
    const boardId = getBoardId(page)
    await createPostIt(page, boardId, "Blijft in done")

    await page.getByRole("button", { name: "Kanban view" }).click()
    const card = page
      .getByTestId("kanban-column-TODO")
      .getByTestId("kanban-card")
    await expect(card).toBeVisible()

    const patchResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        response.url().includes(`/api/v1/boards/${boardId}/postits/`),
    )
    await dragCardToColumn(page, card, "kanban-column-DONE")
    expect((await patchResponsePromise).status()).toBe(200)
    await expect(
      page.getByTestId("kanban-column-DONE").getByTestId("kanban-card"),
    ).toHaveCount(1)

    const getResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "GET" &&
        response.url().includes(`/api/v1/boards/${boardId}/postits`),
    )
    await page.reload()
    expect((await getResponsePromise).status()).toBe(200)
    await expect(page.getByTestId("whiteboard-stage")).toBeVisible()

    await page.getByRole("button", { name: "Kanban view" }).click()
    const doneColumn = page.getByTestId("kanban-column-DONE")
    await expect(doneColumn.getByTestId("kanban-card")).toHaveCount(1)
    await expect(doneColumn).toContainText("Blijft in done")
    await expect(page.getByTestId("kanban-count-DONE")).toHaveText("1")
    await expect(page.getByTestId("kanban-empty-TODO")).toBeVisible()
  })

  test("deelt de nieuwe status met het whiteboard", async ({ page }) => {
    await createLoggedInBoard(page)
    const boardId = getBoardId(page)
    await createPostIt(page, boardId, "Gedeelde status")

    await page.getByRole("button", { name: "Kanban view" }).click()
    const card = page
      .getByTestId("kanban-column-TODO")
      .getByTestId("kanban-card")
    await expect(card).toBeVisible()

    const patchResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        response.url().includes(`/api/v1/boards/${boardId}/postits/`),
    )
    await dragCardToColumn(page, card, "kanban-column-DONE")
    expect((await patchResponsePromise).status()).toBe(200)
    await expect(
      page.getByTestId("kanban-column-DONE").getByTestId("kanban-card"),
    ).toHaveCount(1)

    await page.getByRole("button", { name: "Whiteboard view" }).click()
    await expect(page.getByTestId("whiteboard-stage")).toBeVisible()
    const accessibleList = page.getByRole("list", {
      name: "Post-its on this whiteboard",
    })
    await expect(accessibleList).toContainText("Gedeelde status")
    // De gedeelde query-cache is bijgewerkt: het whiteboard leest DONE.
    await expect(accessibleList).toContainText("(status: DONE)")
  })

  test("verstuurt geen PATCH bij neerzetten in dezelfde kolom", async ({
    page,
  }) => {
    await createLoggedInBoard(page)
    const boardId = getBoardId(page)
    await createPostIt(page, boardId, "Blijft in todo")

    await page.getByRole("button", { name: "Kanban view" }).click()
    const card = page
      .getByTestId("kanban-column-TODO")
      .getByTestId("kanban-card")
    await expect(card).toBeVisible()

    let patchRequests = 0
    page.on("request", (request) => {
      if (
        request.method() === "PATCH" &&
        request.url().includes(`/api/v1/boards/${boardId}/postits/`)
      ) {
        patchRequests += 1
      }
    })

    const box = await card.boundingBox()
    if (!box) throw new Error("Kaart heeft geen bounding box")
    const startX = box.x + box.width / 2
    const startY = box.y + box.height / 2
    await page.mouse.move(startX, startY)
    await page.mouse.down()
    await page.mouse.move(startX + 10, startY + 10, { steps: 3 })
    await expect(page.getByTestId("kanban-drag-overlay")).toBeVisible()
    // Binnen dezelfde kolom laten vallen.
    await page.mouse.move(startX + 10, startY + 70, { steps: 6 })
    await page.mouse.up()
    // Wacht tot de sleepweergave klaar is voordat we de afwezigheid van een
    // PATCH controleren.
    await expect(page.getByTestId("kanban-drag-overlay")).toHaveCount(0)

    await expect(
      page.getByTestId("kanban-column-TODO").getByTestId("kanban-card"),
    ).toHaveCount(1)
    await expect(page.getByTestId("kanban-count-TODO")).toHaveText("1")
    expect(patchRequests).toBe(0)
  })
})

test.describe("Kanban post-it bewerken", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("opent de bewerkdialoog met de bewerkknop en met een dubbelklik", async ({
    page,
  }) => {
    await createLoggedInBoard(page)
    const boardId = getBoardId(page)
    await openKanbanWithPostIt(page, boardId, "Te bewerken kaart")

    const dialog = page.getByTestId("kanban-postit-dialog")
    await page.getByTestId("kanban-card-edit").click()
    await expect(dialog).toBeVisible()
    await expect(page.getByTestId("kanban-postit-content")).toHaveValue(
      "Te bewerken kaart",
    )
    await page.keyboard.press("Escape")
    await expect(dialog).toHaveCount(0)

    // Een dubbelklik op de kaart opent dezelfde dialoog.
    await page.getByTestId("kanban-card").dblclick()
    await expect(dialog).toBeVisible()
    await expect(page.getByTestId("kanban-postit-content")).toHaveValue(
      "Te bewerken kaart",
    )
  })

  test("bewerkt alle velden en behoudt de wijzigingen na herladen", async ({
    page,
  }) => {
    await createLoggedInBoard(page)
    const boardId = getBoardId(page)
    await openKanbanWithPostIt(page, boardId, "Oude inhoud")

    const dialog = page.getByTestId("kanban-postit-dialog")
    await page.getByTestId("kanban-card-edit").click()
    await expect(dialog).toBeVisible()

    await page.getByTestId("kanban-postit-content").fill("Bijgewerkte kaart")

    await page.getByTestId("kanban-postit-status-select").click()
    await page.getByRole("option", { name: "DONE" }).click()
    await expect(page.getByTestId("kanban-postit-status-select")).toContainText(
      "DONE",
    )

    await page.getByTestId("kanban-postit-priority-select").click()
    await page.getByRole("option", { name: "HIGH" }).click()
    await expect(
      page.getByTestId("kanban-postit-priority-select"),
    ).toContainText("HIGH")

    await page.getByTestId("kanban-postit-due-date").fill("2026-12-31")

    const blueSwatch = page.getByTestId("kanban-postit-color-blue")
    await blueSwatch.click()
    await expect(blueSwatch).toHaveAttribute("aria-pressed", "true")
    await expect(
      page.getByTestId("kanban-postit-color-yellow"),
    ).toHaveAttribute("aria-pressed", "false")

    const patchResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        response.url().includes(`/api/v1/boards/${boardId}/postits/`),
    )
    await page.getByTestId("kanban-postit-save").click()
    const patchResponse = await patchResponsePromise
    expect(patchResponse.status()).toBe(200)
    // Precies de bewerkte velden gaan mee, zonder de positie op het whiteboard.
    expect(patchResponse.request().postDataJSON()).toEqual({
      content: "Bijgewerkte kaart",
      color: "#BFDBFE",
      status: "DONE",
      priority: "HIGH",
      due_date: "2026-12-31",
    })
    await expect(dialog).toHaveCount(0)

    // De kaart staat meteen in de kolom van de nieuwe status.
    const doneColumn = page.getByTestId("kanban-column-DONE")
    await expect(doneColumn.getByTestId("kanban-card")).toHaveCount(1)
    await expect(doneColumn).toContainText("Bijgewerkte kaart")
    await expect(doneColumn).toContainText("HIGH")
    await expect(doneColumn).toContainText("31 Dec")
    await expect(doneColumn.getByTestId("kanban-card-surface")).toHaveCSS(
      "background-color",
      "rgb(191, 219, 254)",
    )
    await expect(page.getByTestId("kanban-count-DONE")).toHaveText("1")
    await expect(page.getByTestId("kanban-count-TODO")).toHaveText("0")
    await expect(page.getByTestId("kanban-empty-TODO")).toBeVisible()

    // Na herladen komen alle wijzigingen terug uit de backend.
    const getResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "GET" &&
        response.url().includes(`/api/v1/boards/${boardId}/postits`),
    )
    await page.reload()
    expect((await getResponsePromise).status()).toBe(200)
    await expect(page.getByTestId("whiteboard-stage")).toBeVisible()
    await page.getByRole("button", { name: "Kanban view" }).click()

    const reloadedColumn = page.getByTestId("kanban-column-DONE")
    await expect(reloadedColumn.getByTestId("kanban-card")).toHaveCount(1)
    await expect(reloadedColumn).toContainText("Bijgewerkte kaart")
    await expect(reloadedColumn).toContainText("HIGH")
    await expect(reloadedColumn).toContainText("31 Dec")
    await expect(reloadedColumn.getByTestId("kanban-card-surface")).toHaveCSS(
      "background-color",
      "rgb(191, 219, 254)",
    )
    await expect(page.getByTestId("kanban-count-DONE")).toHaveText("1")
  })

  test("annuleert bewerken zonder PATCH te versturen", async ({ page }) => {
    await createLoggedInBoard(page)
    const boardId = getBoardId(page)
    await openKanbanWithPostIt(page, boardId, "Blijft ongewijzigd")

    let patchRequests = 0
    page.on("request", (request) => {
      if (
        request.method() === "PATCH" &&
        request.url().includes(`/api/v1/boards/${boardId}/postits/`)
      ) {
        patchRequests += 1
      }
    })

    const dialog = page.getByTestId("kanban-postit-dialog")
    await page.getByTestId("kanban-card-edit").click()
    await expect(dialog).toBeVisible()
    await page.getByTestId("kanban-postit-content").fill("Niet opgeslagen")
    await page.getByRole("button", { name: "Cancel" }).click()
    await expect(dialog).toHaveCount(0)
    await expect(page.getByTestId("kanban-card")).not.toContainText(
      "Niet opgeslagen",
    )

    // Escape gooit de wijzigingen ook weg en toont weer de oorspronkelijke
    // waarden bij een volgend bezoek.
    await page.getByTestId("kanban-card-edit").click()
    await expect(dialog).toBeVisible()
    await page.getByTestId("kanban-postit-content").fill("Ook niet opgeslagen")
    await page.keyboard.press("Escape")
    await expect(dialog).toHaveCount(0)
    await expect(page.getByTestId("kanban-card")).toContainText(
      "Blijft ongewijzigd",
    )
    await expect(page.getByTestId("kanban-count-TODO")).toHaveText("1")

    expect(patchRequests).toBe(0)
  })

  test("verwijdert een post-it vanuit de bewerkdialoog met bevestiging", async ({
    page,
  }) => {
    await createLoggedInBoard(page)
    const boardId = getBoardId(page)
    await openKanbanWithPostIt(page, boardId, "Te verwijderen kaart")

    let deleteRequests = 0
    page.on("request", (request) => {
      if (
        request.method() === "DELETE" &&
        request.url().includes(`/api/v1/boards/${boardId}/postits/`)
      ) {
        deleteRequests += 1
      }
    })

    const editDialog = page.getByTestId("kanban-postit-dialog")
    await page.getByTestId("kanban-card-edit").click()
    await expect(editDialog).toBeVisible()
    await page.getByTestId("kanban-postit-delete").click()

    // De bewerkdialoog sluit en de bevestiging opent in een eigen dialoog.
    await expect(editDialog).toHaveCount(0)
    const deleteDialog = page.getByTestId("kanban-delete-dialog")
    await expect(deleteDialog).toBeVisible()
    await expect(deleteDialog).toContainText("Delete post-it")
    await expect(deleteDialog).toContainText("This action cannot be undone.")

    // Annuleren laat de post-it staan.
    await deleteDialog.getByRole("button", { name: "Cancel" }).click()
    await expect(deleteDialog).toHaveCount(0)
    await expect(page.getByTestId("kanban-card")).toHaveCount(1)
    expect(deleteRequests).toBe(0)

    await page.getByTestId("kanban-card-edit").click()
    await page.getByTestId("kanban-postit-delete").click()
    await expect(deleteDialog).toBeVisible()

    const deleteResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "DELETE" &&
        response.url().includes(`/api/v1/boards/${boardId}/postits/`),
    )
    await page.getByTestId("kanban-delete-confirm").click()
    expect((await deleteResponsePromise).status()).toBe(200)

    await expect(deleteDialog).toHaveCount(0)
    await expect(page.getByTestId("kanban-card")).toHaveCount(0)
    await expect(page.getByTestId("kanban-count-TODO")).toHaveText("0")
    await expect(page.getByTestId("kanban-empty-TODO")).toBeVisible()

    // Na herladen blijft de post-it verwijderd.
    const getResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "GET" &&
        response.url().includes(`/api/v1/boards/${boardId}/postits`),
    )
    await page.reload()
    expect((await getResponsePromise).status()).toBe(200)
    await expect(page.getByTestId("whiteboard-stage")).toBeVisible()
    await page.getByRole("button", { name: "Kanban view" }).click()
    await expect(page.getByTestId("kanban-card")).toHaveCount(0)
    await expect(page.getByTestId("kanban-count-TODO")).toHaveText("0")
    await expect(page.getByTestId("kanban-empty-TODO")).toBeVisible()
  })
})
