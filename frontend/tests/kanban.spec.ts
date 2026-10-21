import { expect, type Page, test } from "@playwright/test"

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
})
