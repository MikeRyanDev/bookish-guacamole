# Learning refinement documentation

This pass reconciles the Workspace Learning subsection of [DESIGN.md](../../../DESIGN.md#workspace-learning) with the implemented local refinement. Global tokens, other design sections, and `.impeccable/design.json` remain unchanged. The existing sidecar drift is outside this delivery boundary.

## Source evidence

- [Learning styles](../../../src/client/styles.css), lines 3112–3573: the desktop dialog retains its 1200px/900px caps, neutral surfaces, overlay shadow, and independent scrolling. The library is 280px wide. Reader title, switches, document, and footer share a 32px desktop inset. Row descriptions have a two-line clamp; titles wrap.
- The same stylesheet, lines 3317–3365 and 3438–3524: document titles use 22px on desktop, 20px in the single-pane layout, and 18px at heights of 600px or below. Markdown headings use 19px, 17px, and 16px. Markdown body remains 15px; paragraph line height remains 1.6. Widths of 700px or below **or** heights of 600px or below use one full-viewport pane and 16px side insets. Short viewports reduce vertical spacing further.
- [LearningPanel](../../../src/client/components/learning-panel.tsx), `SpaceLearning`: Learn and its live status share a row. One Refresh skills control beside list navigation invalidates workspace Learning and Skill queries, including run status, and resets the failed-start mutation. It disables during relevant reads or a pending start. Failed reads retain local Retry controls.
- [Description normalization](../../../src/client/learning-description.ts): repeated leading `Use when Use when` and `Use when When`, and repeated `Do not use for`, are normalized for display. `SpaceLearning` and `CandidateReview` apply this to descriptions only. Stored Skill source, Markdown, and metadata are unchanged.
- [LearningPanel](../../../src/client/components/learning-panel.tsx), `CandidateReview`: decisions remain disabled while a review or state refresh is pending, or the proposal read has failed. A successful proposal Retry resets the stale review mutation error. Confirmed outcomes replace the action pair.
- [LearningDialog](../../../src/client/components/learning-dialog.tsx) retains the native modal, workspace title, initial heading focus, and Close action. `ReaderHeading` focuses a selected document; the responsive Back control restores list focus. `SkillMarkdown` retains complete source with frontmatter in a native metadata disclosure.

These are component rules within the incumbent Manrope, IBM Plex Mono, neutral surfaces, configurable accent, and visible-focus system. They introduce no new global palette or type scale.

## Review and capture evidence

The [plan](PLAN.md) records the approved interaction contract and pre-build studies. The [usability review](USABILITY.md) records completed tasks and the successful recovery recheck. Its initial failure concerned a stale mutation error after Retry; the source now resets that error after a successful proposal read.

The supplied visual review matched the implemented controls and layout. Its remaining fix concerned stale documentation: a 260px rail, 28px reader inset, and separate Refresh status action. This documentation pass corrects those descriptions and the Markdown heading sizes. It does not issue a new browser or visual-review verdict.

Existing captures are recorded below as review artifacts; this documentation pass did not recapture or independently inspect their pixels:

| Capture                                           | Recorded context                            |
| ------------------------------------------------- | ------------------------------------------- |
| `.impeccable/refinement/reader-dark-1512.png`     | Dark desktop reader                         |
| `.impeccable/refinement/reader-light-1440.png`    | Light desktop reader                        |
| `.impeccable/refinement/reader-dark-390.png`      | Dark narrow reader                          |
| `.impeccable/refinement/reader-light-320.png`     | Light narrow reader                         |
| `.impeccable/refinement/real-published-light.jpg` | Existing published Skill in the running app |
| `.impeccable/refinement/browser-zoom-200.jpg`     | Browser zoom at 200 percent                 |

Fixture captures and usability writes are synthetic. The published-Skill capture records an existing document; it does not establish a fresh Learning run or model validation. The generated state study remains illustrative, with no authority to introduce global tokens or controls. No application code, detector, or sidecar was changed in this documentation pass.
