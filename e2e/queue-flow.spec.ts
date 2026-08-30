import { expect, test, type Browser, type Page } from "@playwright/test";

import { ADMIN_NAME } from "./global-setup";

/**
 * Covers the parts of the guild's written policy that are easy to get wrong:
 * Gear Rating ordering, the one-item-per-week limit, requested quantities,
 * settlement decisions and bid bans.
 *
 * Requires the dev server running with ALLOW_DEV_LOGIN=true.
 */

const stamp = Date.now().toString().slice(-6);
const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

async function openSession(browser: Browser, name: string): Promise<Page> {
  const context = await browser.newContext();
  // Pin the interface to English so the assertions below are stable.
  await context.addCookies([
    { name: "moonshade_locale", value: "en", url: baseUrl },
  ]);
  const page = await context.newPage();
  await page.goto("/login");
  await page.fill('input[name="name"]', name);
  await page.getByRole("button", { name: "Sign in locally" }).click();
  await page.waitForURL("**/");
  return page;
}

async function completeProfile(page: Page, gearRating: number) {
  await page.goto("/profile");
  await page.fill("#gearRating", String(gearRating));
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Profile saved.")).toBeVisible();
}

async function createItem(
  admin: Page,
  {
    name,
    wishlistType,
    category,
  }: {
    name: string;
    wishlistType: string;
    category: string;
  },
) {
  await admin.goto("/admin/items/new");
  await admin.fill("#nameEn", name);
  await admin.selectOption("#category", category);
  const queueCheckboxes = admin.locator('input[name="queueTypes"]');
  for (let index = 0; index < (await queueCheckboxes.count()); index += 1) {
    const checkbox = queueCheckboxes.nth(index);
    const value = await checkbox.getAttribute("value");
    if (value === wishlistType) await checkbox.check();
    else await checkbox.uncheck();
  }
  await admin.getByRole("button", { name: "Create" }).click();
  await admin.waitForURL("**/admin/items");
  await expect(admin.getByText(name, { exact: false }).first()).toBeVisible();
}

/** The manage page has several Save buttons, so target the round's own form. */
function roundForm(admin: Page) {
  return admin.locator("form").filter({ has: admin.locator("#status") });
}

/** Only one round may take registrations, so clear any that are already open. */
async function closeOpenRounds(admin: Page) {
  await admin.goto("/admin/events");
  const openRows = admin
    .getByRole("listitem")
    .filter({ hasText: "Open for registration" });

  for (let remaining = await openRows.count(); remaining > 0; remaining -= 1) {
    await openRows.first().getByRole("link", { name: "Manage" }).click();
    await admin.waitForURL(/\/admin\/events\/[0-9a-f-]+$/);
    await admin.selectOption("#status", "locked");
    await roundForm(admin).getByRole("button", { name: "Save" }).click();
    await expect(admin.getByText("Round updated.")).toBeVisible();
    await admin.goto("/admin/events");
  }
}

/** Creates a round that is open for registration and returns its manage URL. */
async function createOpenRound(admin: Page): Promise<string> {
  await closeOpenRounds(admin);
  await admin.goto("/admin/events/new");
  await admin.getByRole("button", { name: "Create" }).click();
  await admin.waitForURL("**/admin/events");

  await admin
    .getByRole("listitem")
    .filter({ hasText: "Open for registration" })
    .first()
    .getByRole("link", { name: "Manage" })
    .click();
  await admin.waitForURL(/\/admin\/events\/[0-9a-f-]+$/);
  return admin.url();
}

async function expectItemInRound(admin: Page, item: string) {
  await expect(admin.getByText(item, { exact: false }).first()).toBeVisible();
}

function wishlistCard(page: Page, item: string) {
  return page.getByRole("listitem").filter({ hasText: item });
}

async function register(page: Page, item: string, quantity?: number) {
  await page.goto("/wishlist");
  if (quantity != null) {
    await page.getByRole("tab", { name: /Random queue/ }).click();
  }
  const card = wishlistCard(page, item);
  if (quantity != null) {
    await card.locator('input[name="quantity"]').fill(String(quantity));
  }
  await card.getByRole("button", { name: "Queue up" }).click();
  await expect(card.getByRole("button", { name: "Withdraw" })).toBeVisible();
}

test("Gear Rating decides queue order and managers settle the results", async ({
  browser,
}) => {
  const item = `E2E GR Relic ${stamp}`;
  const secondItem = `E2E GR Charm ${stamp}`;
  const low = `LowGear${stamp}`;
  const high = `HighGear${stamp}`;

  const admin = await openSession(browser, ADMIN_NAME);

  await test.step("manager sets up two Gear Rating queue items", async () => {
    await createItem(admin, {
      name: item,
      wishlistType: "gear_queue",
      category: "accessory",
    });
    await createItem(admin, {
      name: secondItem,
      wishlistType: "gear_queue",
      category: "card",
    });
  });

  const roundUrl = await createOpenRound(admin);
  await expectItemInRound(admin, item);
  await expectItemInRound(admin, secondItem);

  const lowMember = await openSession(browser, low);
  const highMember = await openSession(browser, high);

  await test.step("the lower Gear Rating registers first, the higher one second", async () => {
    await completeProfile(lowMember, 12_000);
    await register(lowMember, item);

    await completeProfile(highMember, 34_000);
    await register(highMember, item);
  });

  await test.step("the higher Gear Rating leads the queue despite registering later", async () => {
    await highMember.goto("/wishlist");
    await expect(wishlistCard(highMember, item)).toContainText(
      "Position 1 of 2",
    );

    await lowMember.goto("/wishlist");
    await expect(wishlistCard(lowMember, item)).toContainText("Position 2 of 2");
  });

  await test.step("a second Gear Rating item is refused in the same week", async () => {
    const card = wishlistCard(highMember, secondItem);
    await expect(card).toContainText(
      "You may only queue for one Gear Rating item per round",
    );
    await expect(card.getByRole("button", { name: "Queue up" })).toHaveCount(0);
  });

  await test.step("the draw orders every request for manager review", async () => {
    await admin.goto(roundUrl);
    await admin.getByRole("button", { name: "Draw round" }).click();
    await expect(admin.getByText("Round drawn.")).toBeVisible();

    const announcement = admin.locator("pre");
    await expect(announcement).toContainText(`1. ${high}`);
    await expect(announcement).toContainText(`2. ${low}`);
  });

  await test.step("the manager can settle either outcome", async () => {
    const highRow = admin.locator("li").filter({ hasText: high }).last();
    await highRow.getByRole("button", { name: "Mark as received" }).click();
    await expect(highRow.getByText("Received")).toBeVisible();

    const lowRow = admin.locator("li").filter({ hasText: low }).last();
    await lowRow
      .getByRole("button", { name: "Mark as forfeited" })
      .click();
    await expect(lowRow.getByText("Forfeited")).toBeVisible();
  });

});

test("requested quantities are proposed without entering stock", async ({
  browser,
}) => {
  const item = "Advanced Gem Box";
  const first = `CrateOne${stamp}`;
  const second = `CrateTwo${stamp}`;

  const admin = await openSession(browser, ADMIN_NAME);

  const roundUrl = await createOpenRound(admin);
  await expectItemInRound(admin, item);

  const memberOne = await openSession(browser, first);
  const memberTwo = await openSession(browser, second);

  await completeProfile(memberOne, 22_000);
  await register(memberOne, item, 3);

  await completeProfile(memberTwo, 21_000);
  await register(memberTwo, item, 3);

  await test.step("the draw keeps each requested quantity", async () => {
    await admin.goto(roundUrl);
    await admin.getByRole("button", { name: "Draw round" }).click();
    await expect(admin.getByText("Round drawn.")).toBeVisible();

    const announcement = admin.locator("pre");
    await expect(announcement).toHaveCount(1);
    await expect(announcement).toContainText("×3");
    await expect(announcement).not.toContainText("only 1 of 3 requested");
  });
});

test("a bid ban blocks registration", async ({ browser }) => {
  const item = `E2E Banned Relic ${stamp}`;
  const member = `BannedOne${stamp}`;

  const admin = await openSession(browser, ADMIN_NAME);
  await createItem(admin, {
    name: item,
    wishlistType: "random_queue",
    category: "accessory",
  });
  await createOpenRound(admin);
  await expectItemInRound(admin, item);

  const banned = await openSession(browser, member);
  await completeProfile(banned, 20_000);

  await test.step("manager issues a bid ban", async () => {
    await admin.goto("/admin/members");
    const row = admin.getByRole("listitem").filter({ hasText: member });
    await row.getByRole("button", { name: "Bid ban" }).click();
    await row.getByRole("button", { name: "Issue ban" }).click();
    await expect(row.getByRole("button", { name: "Lift" })).toBeVisible();
  });

  await test.step("the banned member cannot queue up", async () => {
    await banned.goto("/wishlist");
    await expect(
      banned.getByText("You are serving a bid ban", { exact: false }),
    ).toBeVisible();
    await expect(
      wishlistCard(banned, item).getByRole("button", { name: "Queue up" }),
    ).toHaveCount(0);
  });
});
