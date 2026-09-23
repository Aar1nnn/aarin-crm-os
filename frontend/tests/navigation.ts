import { expect, type Page } from "@playwright/test";

export type CustomerOutcome = "open" | "won";

export function viewNavigationButton(page: Page, view: string, customerOutcome: CustomerOutcome = "open") {
  const outcomeSelector = view === "customers" ? `[data-customer-outcome="${customerOutcome}"]` : "";
  return page.locator(`.nav button[data-view="${view}"]${outcomeSelector}`);
}

export async function openView(page: Page, view: string, customerOutcome: CustomerOutcome = "open") {
  const button = viewNavigationButton(page, view, customerOutcome);
  if (!(await button.isVisible())) {
    const section = button.locator("xpath=ancestor::details[1]");
    if (await section.count()) {
      await section.locator("summary").click();
    }
  }
  await button.click();
  await expect(page.locator(`#${view}`)).toHaveClass(/active/u);
}
