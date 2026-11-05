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

async function expectNoHorizontalOverflow(page: Page) {
  const overflows = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  )
  expect(overflows).toBe(false)
}

test.describe("Responsieve UI", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("houdt de header bruikbaar op een telefoon", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await createLoggedInBoard(page)

    // The view toggle used to be hidden below `sm`, which made it impossible
    // to switch views on a phone.
    const toggle = page.getByTestId("view-toggle")
    await expect(toggle).toBeVisible()
    const toggleBox = await toggle.boundingBox()
    if (!toggleBox) throw new Error("View toggle has no bounding box")
    expect(toggleBox.x).toBeGreaterThanOrEqual(0)
    expect(toggleBox.x + toggleBox.width).toBeLessThanOrEqual(375)
    await expectNoHorizontalOverflow(page)

    await page.getByRole("button", { name: "Kanban view" }).click()
    await expect(page.getByTestId("kanban-board")).toBeVisible()
    await page.getByRole("button", { name: "Whiteboard view" }).click()
    await expect(page.getByTestId("whiteboard-stage")).toBeVisible()
  })

  test("wrapt de whiteboard-toolbar op een telefoon", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await createLoggedInBoard(page)

    // The long instruction text is hidden on narrow screens so the controls
    // keep the available room.
    await expect(page.getByTestId("board-toolbar-help")).toBeHidden()

    const toolbar = page.getByRole("toolbar", { name: "Whiteboard tools" })
    const toolbarBox = await toolbar.boundingBox()
    if (!toolbarBox) throw new Error("Toolbar has no bounding box")
    expect(toolbarBox.x + toolbarBox.width).toBeLessThanOrEqual(375)

    // Every control stays reachable; only the labels are dropped.
    await expect(
      page.getByRole("button", { name: "Add post-it" }),
    ).toBeVisible()
    await expect(page.getByRole("button", { name: "Draw" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Zoom in" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Zoom out" })).toBeVisible()
    await expect(page.getByTestId("group-postits")).toBeVisible()

    await expectNoHorizontalOverflow(page)
  })

  test("houdt de Kanban-toolbar en kolommen hanteerbaar op een telefoon", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await createLoggedInBoard(page)
    await page.getByRole("button", { name: "Kanban view" }).click()
    await expect(page.getByTestId("kanban-board")).toBeVisible()

    await expect(page.getByTestId("kanban-search")).toBeVisible()
    await expect(page.getByTestId("kanban-sort-key")).toBeVisible()
    for (const status of ["TODO", "IN_PROGRESS", "DONE"]) {
      await expect(
        page.getByTestId(`kanban-filter-status-${status}`),
      ).toBeVisible()
    }

    // Columns keep their width and scroll inside the board; the page itself
    // never grows wider than the viewport.
    const columns = page.getByTestId("kanban-columns")
    const { scrollWidth, clientWidth } = await columns.evaluate((element) => ({
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
    }))
    expect(scrollWidth).toBeGreaterThan(clientWidth)
    await expectNoHorizontalOverflow(page)
  })

  test("houdt het whiteboard bruikbaar op tabletformaat", async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 1180 })
    await createLoggedInBoard(page)

    await expect(page.getByTestId("view-toggle")).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Add post-it" }),
    ).toBeVisible()

    const stage = page.getByTestId("whiteboard-stage")
    const box = await stage.boundingBox()
    if (!box) throw new Error("Whiteboard stage has no bounding box")
    expect(box.width).toBeGreaterThan(600)
    expect(box.height).toBeGreaterThan(300)
    await expectNoHorizontalOverflow(page)
  })

  test("toont het boards-overzicht zonder overlap op een telefoon", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await createLoggedInBoard(page)
    await page.goto("/boards")

    const heading = page.getByRole("heading", { name: "Whiteboards" })
    const button = page.getByRole("button", { name: "New whiteboard" })
    await expect(heading).toBeVisible()
    await expect(button).toBeVisible()

    const headingBox = await heading.boundingBox()
    const buttonBox = await button.boundingBox()
    if (!headingBox || !buttonBox) {
      throw new Error("Heading or button has no bounding box")
    }
    // When they no longer fit side by side, the button wraps below the
    // heading instead of squeezing the title.
    const sameRow = Math.abs(headingBox.y - buttonBox.y) < 8
    if (sameRow) {
      expect(headingBox.x + headingBox.width).toBeLessThanOrEqual(buttonBox.x)
    } else {
      expect(buttonBox.y).toBeGreaterThan(headingBox.y + headingBox.height)
    }
    await expectNoHorizontalOverflow(page)
  })
})
