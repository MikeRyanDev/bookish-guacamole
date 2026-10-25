disposition: fix

Review uses the shipped finish-reviewer contract as an independent delegated review, not its inline fallback. No QUALITY BAR card was supplied; the established PRODUCT.md/DESIGN.md system is the finish authority. This is a user-directed local code-led redesign: no approved comp, concept roll, or comp-diff gate applies. The state study is critique reference only. No browser actions or implementation edits were performed.

## persistence

Pass for review inputs. PRODUCT.md, DESIGN.md, direction contract, state study, detector report, source targets, and usability report exist. All required named captures were opened and are valid: both themes at 390 and 1440 for the long reader; desktop evidence; loading, settings error, empty, and pending review; actual shell at dark 390 and light 1512; actual shell dialog at light 1512. The additional actual-shell dark 390 dialog validly shows proposal loading. The named captures supply the desktop/mobile set; no generic desktop.png/mobile.png substitutions are required.

DESIGN.md preserves the incumbent flat Manrope/IBM Plex system. Its Learning-specific documentation and PRODUCT.md's old inspector-oriented tasks still need the planned documenter pass before delivery; the direction contract currently carries the new surface. Detector font-size and modal-radius advisories reflect the intentional larger reader and require that documentation pass. Unrelated color-picker advisories are outside this surface.

## fidelity

| Element or promise                  | Result                       | Evidence                                                                                                                                                                                                                                    |
| ----------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workspace entry and title           | match                        | Actual shell captures place Learning immediately beside the workspace selector. Open title names that workspace. Files remains separate.                                                                                                    |
| THESIS: protected document reading  | match                        | Broad desktop dialog, compact left rail, independent reader, persistent decision footer. Mobile gives the document the entire available width.                                                                                              |
| TYPE                                | match                        | Manrope hierarchy stays compact in controls, while 15px prose and larger document headings provide the requested reading expansion. Code uses the incumbent monospace treatment.                                                            |
| MATERIAL                            | match                        | Flat application surfaces, functional Lucide icons, and quiet code blocks; no imitated physical materials or decorative raster obligations.                                                                                                 |
| GROUND / OWN-WORLD                  | match                        | Dark captures show neutral charcoal fields with only a slight cool trace; green is confined to the configured accent. Light keeps the incumbent warm neutral surfaces. No new ground was invented from the illustrative study.              |
| STORY: assignment to review         | match                        | Saved assignment, Change space, Learn/status, review/published navigation, Instructions/evidence, and named publishing destination have distinct positions.                                                                                 |
| FIRST VIEWPORT: empty review        | contradicted                 | shell-dialog-light-1512.png says Review skills (0) and No Skills need review, while the main reader instructs Choose a proposal. The available action and central instruction disagree.                                                     |
| FORM: responsive reader             | match                        | At 390px the rail and assignment recede while reading; Back to skills, content tabs, title, and decision footer remain visible. Code and table are contained. This follows the surface brief's responsive promise.                          |
| Pending decision finish             | contradicted                 | dialog-review-pending.png places Saving review as a third flex item, moving the disabled action pair from the right edge into the middle. Source confirms space-between redistribution.                                                     |
| Loading/error/empty/disabled states | match within capture scope   | Required captures show explicit loading, local Retry, no-space recovery guidance, disabled saves, and disabled decisions. Uncaptured variants are not approved by analogy.                                                                  |
| Focus and motion                    | match at source/report scope | Native dialog focuses the heading; usability report records trigger restoration and visible tab focus. The surface suppresses dialog animation. Still captures cannot independently establish keyboard behavior, hover behavior, or motion. |

The illustrative study's useful ambition—protected long-form reading with persistent decisions—is present. Its outlined framing, stripes, and decorative tab treatment do not become requirements. Fixture text is synthetic as documented by the usability report; these captures do not prove backend state, persistence, or model behavior. No commercial claims or shipped raster assets were introduced.

## ceiling

Reached for the established local product world apart from the two state-specific fixes below. Density, typography, neutral surfaces, functional table rules, and mobile composition serve the task without decorative cards. Further depth, ornament, or animation would not improve this brief. Screenshot inspection supports visual legibility, not measured contrast or full accessibility certification; the supplied usability and technical checks remain separate verdicts.

## material_fixes

1. Truth and empty-state promise: in src/client/components/learning-panel.tsx, the unselected reader at lines 400–408 must distinguish loading, failed, empty, and populated lists. When there are zero review proposals, remove the instruction to choose one; use truthful empty guidance or a quiet empty reader. Apply the same rule to the published list. Recheck the actual-shell desktop empty state.
2. Pending-state finish: in src/client/components/learning-panel.tsx around lines 497–528 and src/client/styles.css .learning-decision, keep the decision pair anchored while Saving review appears. Reserve a status location or place the status within a stable footer group; preserve the mobile full-width controls. Re-capture pending review at desktop and mobile widths.

## keep

Keep Learning beside the workspace name, the broad Markdown reader, the compact flat rail, the neutral charcoal surfaces, explicit publishing destination, and persistent mobile decisions.

---

## verdict

Post-fix scoring pass, 2026-10-24. The original review above is retained as history. This pass scores only its two material fixes. The three supplied recaptures were opened and are valid; no browser actions or implementation edits were performed.

1. **Resolved — truthful unselected reader.** The refreshed actual-shell capture `shell-dialog-light-1512.png` now says “No Skills to review” and directs the developer to run Learning, consistent with the empty review list. Inspected `LearningPlaceholder` source selects loading, unavailable, empty, and populated guidance separately for both review and published lists. Loading/error/published variants were source-inspected in this scoring pass, not independently exercised or recaptured.
2. **Resolved — stable pending decisions.** `dialog-review-pending-1440.png` shows the disabled decision pair anchored at the right edge; `dialog-review-pending-390.png` retains both full-width mobile actions in the bottom footer. “Saving review…” occupies the existing contextual text position. Source confirms the status replaces that text instead of introducing a third flex item. Parent reports all 18 `learning-dialog.spec` tests pass, including action-position assertions at both widths; these tests were not independently rerun by the finish reviewer.

No regressions from this fix batch are visible in the supplied scoring evidence. Ship covers the scored fixes, not the whole surface.

## remaining

Clear. The original review's evidence limits remain; technical, usability, documentation completion, and backend proof are separate delivery responsibilities.

disposition: ship
