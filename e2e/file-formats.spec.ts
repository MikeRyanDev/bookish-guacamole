import { mockFileDiscovery } from "./mock-file-discovery";
import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { officeFixture } from "../tests/fixtures/office";
const origin = process.env.FILE_VIEWER_FIXTURE_URL ?? "http://127.0.0.1:4174";
const files = [
  "image.svg",
  "document.docx",
  "workbook.xlsx",
  "slides.pptx",
  "legacy.doc",
  "sample.pdf",
  "script.py",
];
async function captureFormat(page: Page, name: string) {
  await page.getByRole("button", { name: "Expand file viewer" }).click();
  for (const theme of ["light", "dark"]) {
    await page.evaluate((theme) => (document.documentElement.dataset.theme = theme), theme);
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.mouse.move(0, 0);
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(
        document
          .getAnimations()
          .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
          .map((animation) => animation.finished.catch(() => {})),
      );
    });
    expect(
      (await new AxeBuilder({ page }).include(".starter-files-inspector").analyze()).violations,
    ).toEqual([]);
    if (name === "pdf")
      await expect(page.getByText("Rendering page…", { exact: true })).toHaveCount(0);
    await page.screenshot({
      path: `docs/proof/file-viewer-${name}-${theme}.png`,
      animations: "disabled",
    });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(
      (await new AxeBuilder({ page }).include(".starter-files-inspector").analyze()).violations,
    ).toEqual([]);
    if (name === "pdf")
      await expect(page.getByText("Rendering page…", { exact: true })).toHaveCount(0);
    await page.screenshot({
      path: `docs/proof/file-viewer-${name}-mobile-${theme}.png`,
      animations: "disabled",
    });
  }
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.getByRole("button", { name: "Collapse file viewer" }).click();
}
function pdfFixture(width = 400, height = 500) {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  const stream = "BT /F1 20 Tf 40 440 Td (PDF preview works) Tj ET";
  objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf +=
    `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` +
    offsets
      .slice(1)
      .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
      .join("") +
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return pdf;
}
test.beforeEach(async ({ page }) => {
  await mockFileDiscovery(page, files);
  await page.route("**/api/skills", (route) => route.fulfill({ json: { skills: [] } }));
  await page.route("**/api/workspace/file?*", (route) =>
    route.fulfill({
      json: { path: "script.py", content: 'def greet(name):\n    return "Hello " + name\n' },
    }),
  );
  await page.route("**/api/workspace/asset?*", (route) => {
    const path = new URL(route.request().url()).searchParams.get("path");
    const body =
      path === "image.svg"
        ? '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240"><rect width="400" height="240" fill="#c88073"/><text x="30" y="80" font-size="24">Image preview</text></svg>'
        : path === "sample.pdf"
          ? pdfFixture()
          : path === "document.docx"
            ? Buffer.from(officeFixture("document"))
            : path === "workbook.xlsx"
              ? Buffer.from(officeFixture("spreadsheet"))
              : path === "slides.pptx"
                ? Buffer.from(officeFixture("presentation"))
                : "legacy";
    return route.fulfill({ body, contentType: "application/octet-stream" });
  });
  await page.goto(`${origin}/inspector.html`);
});
test("lazy syntax worker highlights Python without changing its source", async ({ page }) => {
  await page.getByRole("button", { name: "Open script.py", exact: true }).click();
  await expect(page.locator(".starter-files-source-token").first()).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole("region", { name: "File contents" })).toContainText(
    "def greet(name):",
  );
});
test("images support zoom, rotation and download", async ({ page }) => {
  await page.getByRole("button", { name: "Open image.svg", exact: true }).click();
  await expect(page.getByRole("img", { name: "image.svg" })).toBeVisible();
  await expect(page.getByText("400 × 240")).toBeVisible();
  const fittedWidth = (await page.getByRole("img", { name: "image.svg" }).boundingBox())!.width;
  await page.getByRole("button", { name: "Zoom in" }).click();
  await expect
    .poll(async () => (await page.getByRole("img", { name: "image.svg" }).boundingBox())!.width)
    .toBeGreaterThan(fittedWidth);
  await page.getByRole("button", { name: "Rotate image" }).click();
  await page.getByRole("button", { name: "Fit image" }).click();
  await expect(page.getByRole("link", { name: "Download", exact: true })).toBeVisible();
  await captureFormat(page, "image");
});
test("Word, Excel and PowerPoint content is rendered locally", async ({ page }) => {
  await page.getByRole("button", { name: "Open document.docx", exact: true }).click();
  await expect(page.getByText("Quarterly report & review", { exact: true })).toBeVisible();
  await captureFormat(page, "word");
  await page.getByRole("button", { name: "Back to files" }).click();
  await page.getByRole("button", { name: "Open workbook.xlsx", exact: true }).click();
  await expect(page.getByRole("cell", { name: "120", exact: true })).toBeVisible();
  await captureFormat(page, "sheet");
  await page.getByRole("combobox", { name: "Sheet" }).selectOption("1");
  await expect(page.getByRole("cell", { name: "42", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Back to files" }).click();
  await page.getByRole("button", { name: "Open slides.pptx", exact: true }).click();
  await expect(page.getByText("Project overview", { exact: true }).first()).toBeVisible();
  await captureFormat(page, "slides");
  await page.getByRole("combobox", { name: "Slide" }).selectOption("1");
  await expect(page.getByText("Next steps", { exact: true })).toBeVisible();
});
test("PDF renders a page and exposes its text", async ({ page }) => {
  await page.getByRole("button", { name: "Open sample.pdf", exact: true }).click();
  await page.getByText("Page text", { exact: true }).click();
  await expect(page.getByText("PDF preview works", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Next page" })).toBeDisabled();
  await captureFormat(page, "pdf");
  await expect(
    page.getByRole("region", { name: "PDF page", exact: true }).locator("canvas"),
  ).toBeVisible();
});
test("unsupported and corrupt formats keep an honest download path", async ({ page }) => {
  await page.getByRole("button", { name: "Open legacy.doc", exact: true }).click();
  await expect(page.getByText(/No preview for this format/)).toBeVisible();
  await page.getByRole("button", { name: "Back to files" }).click();
  await page.route("**/api/workspace/asset?*", (route) => route.fulfill({ body: "not a zip" }));
  await page.getByRole("button", { name: "Open document.docx", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("link", { name: "Download", exact: true })).toBeVisible();
});

for (const kind of ["image", "pdf"]) {
  test(`zoom out shrinks a large fitted ${kind} on mobile`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route("**/api/workspace/asset?*", (route) =>
      route.fulfill({
        body:
          kind === "image"
            ? '<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="2400"><rect width="4000" height="2400" fill="#c88073"/></svg>'
            : pdfFixture(4000, 5000),
        contentType: "application/octet-stream",
      }),
    );
    await page
      .getByRole("button", {
        name: `Open ${kind === "image" ? "image.svg" : "sample.pdf"}`,
        exact: true,
      })
      .click();
    const visual =
      kind === "image"
        ? page.getByRole("img", { name: "image.svg" })
        : page.locator(".starter-files-pdf-canvas canvas");
    if (kind === "image") await expect(page.getByText("4000 × 2400")).toBeVisible();
    else await expect(page.getByText("Page text", { exact: true })).toBeVisible();
    const before = (await visual.boundingBox())!.width;
    await page.screenshot({
      path: `docs/proof/file-viewer-${kind}-fit-before.png`,
      animations: "disabled",
    });
    await page.getByRole("button", { name: "Zoom out", exact: true }).click();
    await expect.poll(async () => (await visual.boundingBox())!.width).toBeLessThan(before);
    await page.screenshot({
      path: `docs/proof/file-viewer-${kind}-zoom-after.png`,
      animations: "disabled",
    });
  });
}
