# Settings categories and states

## Direction

Replace the long settings form with a fixed left category menu: Appearance, Models, Permissions. This is an Operate surface inside the incumbent workspace identity. Use one aligned content area, short labels, functional icons, soft surface changes and no enclosing cards or dividers. The desktop dialog remains the same size across categories so the menu and close action stay put. At 390px and 320px, the labeled menu remains on the left and only the content pane scrolls.

The [generated concept](concept.png) explores the category structure and state treatments before implementation. It is a critique reference, not an approved pixel specification. Its invented model names, permission names and Add rule control are not product requirements. The implementation uses configured model labels, the native permission choices and existing rule removal only. Appearance reads are synchronous and do not need the generated appearance-loading screen.

## Interaction contract

| Entry        | Action                         | Result                                                                | Recovery                                                |
| ------------ | ------------------------------ | --------------------------------------------------------------------- | ------------------------------------------------------- |
| Settings     | Open                           | Appearance selected; close control remains fixed                      | Close or Escape                                         |
| Category tab | Click / Up / Down / Home / End | Select one pane and preserve other panes' drafts                      | Choose another category                                 |
| Appearance   | Theme or accent                | Apply immediately                                                     | Choose another value                                    |
| Add color    | Open editor                    | Focus HEX entry; numeric formats and sliders share one color          | Cancel returns focus to Add color                       |
| Models       | Default model                  | Save only that field for future conversations                         | Failed write keeps saved value; Retry repeats the write |
| Permissions  | Default permissions            | Save native preference for future conversations                       | Failed write keeps saved value; Retry repeats the write |
| Saved rules  | Refresh / Remove               | Refresh preserves existing rows; remove waits for server confirmation | Failed removal retains row; Retry repeats removal       |

Closing discards an uncommitted color draft. Switching categories keeps it. Closing during a remote save does not cancel the save. Existing conversations and stored rules retain their established semantics.

## Control-state inventory

| Control                                 | Rest / hover / focus / selected                               | Busy / disabled                                                                        | Empty / error / recovery                                                                                                                |
| --------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Category menu                           | Icon + short label; soft selected fill; roving keyboard focus | Navigation stays enabled during requests                                               | Failed categories remain reachable for retry                                                                                            |
| Close                                   | Named X; hover surface; visible focus                         | Always enabled                                                                         | Escape closes; focus returns to Settings                                                                                                |
| Theme radios                            | Light / Dark / System; selected fill; native arrows           | Synchronous: no fabricated loading state                                               | Storage failure keeps session appearance; Retry storage persists current choice                                                         |
| Preset accents                          | Swatch, selected check + outline, hover scale, native arrows  | Synchronous                                                                            | Invalid stored values fall back to Moss                                                                                                 |
| Saved custom accents                    | Checkerboard alpha; pressed selection; named remove action    | Synchronous                                                                            | Empty palette needs only Add color; failed writes keep session values and Retry colors                                                  |
| Add color                               | Named plus action; visible focus                              | Disabled at 24 saved colors, with concise limit text                                   | Removing one restores capacity                                                                                                          |
| Color plane                             | Visible cursor; direct pointer drag                           | Pointer capture keeps drag stable                                                      | Labeled sliders provide keyboard equivalents                                                                                            |
| Hue / saturation / brightness / opacity | Native ranges, keyboard arrows, focus ring; spectrum on hue   | Synchronous                                                                            | Bounded numeric values; alpha survives format switches                                                                                  |
| Color format                            | Named native select; all four formats                         | Synchronous                                                                            | Changing format restores the valid color after an invalid draft                                                                         |
| HEX / RGBA / HSV / CMYK fields          | Visible short labels and aligned numeric widths               | Add disabled while draft invalid                                                       | Inline range/HEX errors preserve unfinished input                                                                                       |
| Add / Cancel in editor                  | Primary add, neutral cancel; keyboard focus                   | Add disabled for invalid values                                                        | Cancel discards draft and restores trigger focus; Add saves, selects and restores focus                                                 |
| Default model                           | Named select; current confirmed selection                     | Stable skeleton on first read; spinner during save; shared save disables both defaults | No-model state is explicit and disabled; read error offers Retry; save error restores confirmed value and Retry repeats attempted value |
| Default permissions                     | Named select; concise explicit YOLO label                     | Same read/save states as model                                                         | Same retry behavior; no fabricated empty permission catalog                                                                             |
| Refresh rules                           | Named refresh icon, hover/focus                               | Disabled and spinner during refresh; prior rows remain visible                         | Read failure is distinct from no saved rules; Retry re-reads                                                                            |
| Remove rule                             | Named trash action, hover/focus                               | Removal disables rule actions and shows Removing                                       | Row remains until confirmed; failed deletion can retry; completion restores focus within the pane                                       |
| Error retry actions                     | Short visible Retry labels in local error region              | Disabled while retrying                                                                | Error clears only after successful recovery                                                                                             |

Theme-dependent colors change immediately to avoid transient contrast loss. Spinners honor reduced motion. Neutral text on selected tabs remains readable for arbitrary custom accents. No fake loading or success delay is added to synchronous browser operations. Selection is the durable success indication; idle saved messages are omitted.

## Review and verification

**Usability: pass.** A fresh reviewer completed theme/color/default/rule tasks at desktop and 390px, then checked loading, failed saves, read retries, deletion retries, draft preservation, keyboard category changes and close/reopen during a pending save. A scoped follow-up confirmed that custom-color deletion moves focus to the next swatch or Add color, and delayed rule deletion does not steal focus from another control.

**Visual: ship.** The independent finish reviewer inspected all category/editor captures in light/dark at 1440px and 390px, integrated shell captures, loading/saving/error/removing/empty states. No material visual fixes were required. The mobile editor scrolls to its focused control; lower actions remain reachable. This was screenshot review, with interaction and axe evidence separate.

**Technical:**

```sh
pnpm check
node --test example/greet.test.js
SETTINGS_APP_URL=http://127.0.0.1:4213 FILE_VIEWER_APP_URL=http://127.0.0.1:4213 FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4212 pnpm test:e2e e2e/settings-navigation.spec.ts e2e/settings-visual.spec.ts e2e/settings.spec.ts e2e/appearance.spec.ts e2e/permissions.spec.ts --output=.data/navigation-delivery
FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4212 pnpm design:browser --output=.data/navigation-design-results
FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4212 pnpm test:e2e e2e/settings-navigation.spec.ts e2e/permissions.spec.ts --output=.data/navigation-focus-final
git diff --check
```

The full check passed lint, source design checks, both TypeScript checks, 177 unit tests (47 declared skips) and production builds. The greeting passed. All 24 affected browser scenarios passed; all 16 focused state/permission scenarios passed again after the final focus fix. Rendered design checks passed. Axe covers all categories and the editor in both themes/sizes. The category navigation test additionally checks 320px. The existing large-chunk build warning remains.

Regressions first failed for the absent tabs and lost focus after swatch removal. Browser verification also caught a transient theme-switch contrast failure; removing background interpolation fixed it. All final captures and raw logs remain ignored.

The application integration uses real local HTTP/native settings with an isolated backend configuration. Model/permission persistence and new-thread inheritance pass through the new navigation. No model or Learning calls were made; live model suites are not required for these UI-only changes. The live-permission test path was updated for the new category and empty label but was not executed. Existing production/shared environments and dependency previews are unchanged.

PRODUCT.md, DESIGN.md and the related sidecar narrative now describe the new category structure and states. Unrelated pre-existing sidecar specimens were preserved. Repository-wide formatting has pre-existing issues in the Monday checklist and older verification studies; changed-file formatting is checked separately.

## Merged-tree verification

Implementation merged to local `main` as `360f970` (feature `f03b1c0`). Against that merged source:

```sh
pnpm check
node --test example/greet.test.js
SETTINGS_APP_URL=http://127.0.0.1:4215 FILE_VIEWER_APP_URL=http://127.0.0.1:4215 FILE_VIEWER_FIXTURE_URL=http://127.0.0.1:4217 pnpm test:e2e e2e/settings-navigation.spec.ts e2e/settings.spec.ts e2e/appearance.spec.ts --output=.data/settings-navigation-merged-browser
git diff --check
```

All check stages passed, with 177 unit tests and 47 declared skips. The greeting and all 10 merged-tree browser scenarios passed. The final documentation commit changes no application source. The unrelated local Monday checklist edit remains untouched. Temporary review servers were stopped; the user's running development server was not interrupted.
