# Task-first usability review

The independent reviewer used the isolated browser fixture without reading implementation or builder documentation.
Initial predictions: Learning opens workspace Skills; the two list controls filter content; rows open instructions; Supporting evidence shows justification; decisions publish or reject; Change space opens Save and Cancel.

The reviewer completed long-document reading through section 12, evidence inspection, approval, published Skill reading, space cancellation, and space saving. Predictions matched these controls.
At 390px, Back to skills restored the list and focus. Tab and Space switched to evidence. A failed space save retained the draft, and Cancel restored the saved space.

Initial verdict: **usability: fix**. A successful retry after an uncertain review left the old red mutation error beside enabled decisions.
The regression failed before the fix. A successful proposal retry now clears that stale mutation error.

The same reviewer repeated the recovery task. Failed approval disabled both decisions and showed Retry. Successful Retry removed both errors and restored the destination explanation. A later Reject completed with the correct outcome.
Recheck verdict: **usability: pass**, limited to the recovery task. The original completed tasks and this correction form the usability evidence.

Limits: synthetic browser-local writes, no backend or model validation, no full assistive-technology audit. The original review covered dark desktop and narrow reading, plus light narrow errors. The recovery recheck used light theme. An early HMR reset occurred during source edits; edits then paused during review.
