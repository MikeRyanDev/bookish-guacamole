import { fixtureUrl } from "./fixture-url";
import { test, expect } from "@playwright/test";

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`approval motion respects ${reducedMotion} without delaying a decision`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion });
    await page.goto(`${fixtureUrl}/?approval=bash`);
    const permission = page.getByRole("region", { name: "Permission request" });
    const duration = await permission.evaluate((element) =>
      parseFloat(getComputedStyle(element).animationDuration),
    );
    if (reducedMotion === "reduce") expect(duration).toBe(0);
    else expect(duration).toBeGreaterThan(0);
    await permission.getByRole("button", { name: "Allow once" }).click();
    await expect(page.getByLabel("Decision")).toHaveText("once");
  });
}
