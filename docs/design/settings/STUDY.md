# Settings study

## Task and direction

Developers need to choose a comfortable appearance, add a precise accent, and decide how future conversations start. Keep the existing compact workspace, Manrope type, charcoal dark surfaces and eight warm presets. This is an Operate surface. The generated [concept study](concept.png) explores light, dark, mobile and invalid input before implementation; it is a concept, not an approved pixel specification. The implementation omits its decorative outlines and rules.

Settings opens from the existing header control. Appearance comes first, followed by new-conversation defaults and existing saved workspace rules. The color editor expands inline so the palette stays in context. On narrow screens, numeric entry moves below the color field. The dialog scrolls when needed.

## Interaction contract

| Task                         | Initial control                     | Outcome                                               | Recovery                                               |
| ---------------------------- | ----------------------------------- | ----------------------------------------------------- | ------------------------------------------------------ |
| Follow OS appearance         | Light / Dark / System radios        | Immediate theme change; System listens for OS changes | Select another mode                                    |
| Add a precise color          | Add color                           | Expand draft editor with HEX initially selected       | Cancel discards draft                                  |
| Enter another representation | Color format selector               | RGBA, HSV, CMYK or HEX fields for the same color      | Switch formats without resetting color                 |
| Save a color                 | Add color in editor                 | Save browser swatch and select it                     | Select preset or remove custom swatch                  |
| Set future behavior          | Default permissions / Default model | Persist workspace defaults for future conversations   | Choose another value; existing threads retain settings |

Native radios keep the familiar arrow-key interaction. Visible labels identify numeric and selection controls. These choices follow [WAI labeling guidance](https://www.w3.org/WAI/tutorials/forms/labels/) and the [radio-group keyboard pattern](https://www.w3.org/WAI/ARIA/apg/patterns/radio/).

## Color decisions

Use one sRGB color with independent alpha. HEX accepts 3/4/6/8 digits. RGBA uses RGB 0–255 and alpha 0–1. HSV uses degrees 0–360 and percentages 0–100. CMYK uses percentages 0–100. Opacity remains available in every format. Numeric fields preserve incomplete drafts and show errors rather than silently accepting invalid values. Add is disabled until the draft is valid.

CMYK is an approximate screen conversion. Accurate print rendering depends on a device profile, as described in [CSS Color 5](https://www.w3.org/TR/2026/WD-css-color-5-20260324/). This editor does not claim print fidelity.

The color plane provides fast pointer selection; labeled hue, saturation and brightness sliders provide keyboard equivalents. A checkerboard exposes transparency. Saved swatches retain alpha; UI foregrounds and buttons derive opaque shades tested for contrast on the workspace surfaces. This distinction is explained beside the preview. Preset colors remain unchanged. There are 24 custom slots; removal restores space. Restricted storage permits session use with an explicit persistence message.

## Defaults ownership

Defaults belong to the selected workspace's private metadata. The server validates configured model IDs and the two permission preferences. New native sessions receive both settings once. Existing logs keep their model, planning state and permission preference. Default changes do not resolve pending approvals or modify saved rules. Planning starts off in new conversations.

## Verification

The built-in image generator produced the concept before UI implementation. The exact [prompt and provenance](concept.png.json) accompany it.

**Usability: pass.** A fresh reviewer, without implementation context, completed all formats, invalid-input recovery, default selection, keyboard navigation and the 390px layout. The reviewer and browser regression independently found rapid sequential default changes could lose the first choice. Partial PATCH requests and serialized metadata updates fixed it; the fresh recheck retained both choices. “YOLO” remains the incumbent permission term; its selected-state description explains the consequences.

**Visual: ship.** The fresh finish reviewer checked eight light/dark desktop/mobile captures and found the layout, type, surfaces, custom editor and defaults matched the compact workspace brief. Its only material finding was stale appearance documentation. The documenter updated PRODUCT.md, DESIGN.md and the related sidecar narrative; the reviewer scored that fix resolved. The hue slider could optionally use a spectrum track; this was not a blocker. No unrelated sidecar specimen drift was repaired.

**Technical:** `pnpm check` passed lint, source design checks, both TypeScript checks, 177 tests (47 declared skips), and both production builds. The existing large-chunk build warning remains. `node --test example/greet.test.js` passed. `FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4202 pnpm design:browser --output=.data/settings-design-results` passed rendered tools and approval checks. `FILE_VIEWER_APP_URL=http://127.0.0.1:4203 FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4202 pnpm test:e2e e2e/appearance.spec.ts e2e/models.spec.ts e2e/permissions.spec.ts --output=.data/settings-affected-results` passed 18 tests. `SETTINGS_APP_URL=http://127.0.0.1:4203 FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4202 pnpm test:e2e e2e/settings.spec.ts` passed both settings scenarios.

The settings browser suite covers live OS theme changes, persistence, validation, format switching, custom removal, both themes at 1440px and 390px, axe, and Escape. The isolated application test uses the real Hono API, native harness settings and SQLite metadata: browser changes survive reload, new threads inherit both defaults, and existing threads retain their settings. Unit tests additionally reopen the store, exercise concurrent initialization/updates, and verify custom accent contrast. HTTP tests cover authentication, strict input and workspace isolation.

Fixtures use synthetic model labels. The isolated application intentionally has no Intelligence connection, so its background session list reports unavailable. No model or Learning calls were made. This is local settings persistence and rendering evidence, not live model or Learning proof. Captures and raw logs are ignored. One initial parallel Playwright invocation failed because separate runs shared the output directory; isolated output paths fixed the verification harness.
