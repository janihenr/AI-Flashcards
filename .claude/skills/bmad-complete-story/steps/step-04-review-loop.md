# Step 4: Review Loop

## RULES

- Fix ALL `patch` findings autonomously — no permission needed per finding
- Record every fix decision in the cycle summary (visible in final report)
- `intent_gap`, `bad_spec`, `defer` findings → add to `open_items`, do NOT attempt to fix
- Run up to 3 cycles; after cycle 3, remaining unfixed `patch` findings → known debt in `open_items`
- After EACH cycle run the full test suite to verify fixes did not break anything
- If a reviewer is disabled (false), skip that block entirely
- Do NOT ask for input between cycles — loop is fully autonomous

## INSTRUCTIONS

### Initialize Loop State

Collect the initial diff:
- If on a feature branch: `git diff main...HEAD`
- If on main with uncommitted changes: `git diff HEAD`
- Verify diff is non-empty

<check if="diff is empty">
  Output: `ℹ️ No diff detected — skipping review loop (nothing changed since last review)`
  Proceed to step-05-complete.md
</check>

Set `review_cycle` = 0
Set `loop_clean` = false

---

### LOOP — repeat while `loop_clean` = false AND `review_cycle` < 3

---

#### A. Cycle Start

`review_cycle` += 1
Set `cycle_clean` = true (will flip to false if any patch findings are fixed)
Set `cycle_fixed` = 0
Set `cycle_open` = 0

Output: `🔄 Review Cycle {review_cycle}/3 — collecting fresh diff...`

Re-collect full diff (picks up fixes from previous cycle).

---

#### B. Code Review (skip if `review_code` = false)

Launch parallel subagents. Each receives NO conversation history:

**Blind Hunter** — Invoke `bmad-review-adversarial-general` skill as a subagent.
- Pass `content` = diff only. No spec, no project access.
- Collect markdown list of findings.

**Edge Case Hunter** — Invoke `bmad-review-edge-case-hunter` skill as a subagent.
- Pass `content` = diff. Has read access to project.
- Collect JSON array of findings.

**Acceptance Auditor** — A subagent that receives diff + full story file content.
- Prompt:
  > You are an Acceptance Auditor. Review this diff against the story spec. Check for: violations of acceptance criteria, missing implementation of specified behavior, deviations from spec intent, contradictions between constraints and actual code. Output as a markdown list. Each finding: one-line title, which AC it violates, evidence from the diff.
- Collect markdown list of findings.

**Fallback if subagents unavailable:**
Generate prompt files in `{implementation_artifacts}`:
- `{story_key}-review-cycle{review_cycle}-blind.md`
- `{story_key}-review-cycle{review_cycle}-edge.md`
- `{story_key}-review-cycle{review_cycle}-auditor.md`

Add to `open_items`: `⚠️ Subagents unavailable — manual review files saved to {implementation_artifacts}. Run each and paste results back.`
Set `loop_clean` = true (break loop — cannot continue without review results)
Proceed to step-05-complete.md

**Normalize and Deduplicate:**

Convert all findings to unified format:
- `id` — sequential integer
- `source` — `blind`, `edge`, or `auditor`
- `title` — one-line summary
- `detail` — full description
- `location` — file:line if available

Merge findings that describe the same issue (keep most specific, merge detail).

**Classify each finding:**

| Class | Action |
|---|---|
| `patch` — code-fixable without human input | Fix autonomously |
| `intent_gap` — spec is incomplete or ambiguous | Add to `open_items` as `📋 Spec ambiguity: {title}` |
| `bad_spec` — spec is wrong/contradictory | Add to `open_items` as `📋 Spec issue: {title}` |
| `defer` — pre-existing issue, not introduced here | Add to `open_items` as `📌 Deferred: {title}` |
| `reject` — false positive or handled elsewhere | Drop silently |

For each `patch` finding: apply fix. Increment `cycle_fixed`. Set `cycle_clean` = false.

---

#### C. Test Quality Review (skip if `review_tests` = false)

Examine ALL test files that were added or modified in the diff.

For each test file, check:
- Coverage: does it test all new/changed functions and branches?
- Edge cases: are boundary conditions exercised?
- Naming: are test names descriptive (describes scenario + expected outcome)?
- Structure: follows project test patterns from `{project_context}`
- Assertions: are assertions specific (not just checking truthiness)?
- No test file modification beyond what the story requires

For each gap found:
- If fixable (add missing test, improve assertion): fix autonomously; increment `cycle_fixed`; set `cycle_clean` = false
- If requires external service/env var: add to `open_items` as `⚙️ Manual testing required: {description}`

---

#### D. Acceptance Criteria Deep Validation (skip if `review_acs` = false)

Load the full AC list from the story file.

For each AC:
1. Find the code that implements this AC (search by AC keywords in changed files)
2. Verify implementation is complete and handles all stated conditions
3. Find the test(s) that exercise this AC
4. Verify the test(s) actually assert the AC outcome (not just that code runs)

For each AC gap:

| Gap Type | Action |
|---|---|
| AC implemented but no test | Add test; increment `cycle_fixed`; set `cycle_clean` = false |
| AC partially implemented | Fix implementation; increment `cycle_fixed`; set `cycle_clean` = false |
| AC requires external service to test fully | Add to `open_items` as `🎯 AC not fully testable: "{AC}" — needs {service/env}` |
| AC genuinely ambiguous | Add to `open_items` as `❓ AC ambiguity: "{AC}" — implemented as: {assumption}` |

---

#### E. Post-Cycle Test Run

Run the full test suite.

If failures:
- Fix each failure unless it requires unavailable external dependencies
- Increment `cycle_fixed` for each fix; set `cycle_clean` = false
- For unavailable dependencies: add to `open_items` as `⚙️ Manual testing required: {test} — needs {dependency}`
- If a failure cannot be resolved without external input: set `cycle_clean` = true for this test (do not loop forever)

---

#### F. Cycle Summary

Accumulate `total_fixed` += `cycle_fixed`
Set `cycle_open` = new open_items count added this cycle

Output:
```
📊 Cycle {review_cycle} Complete
   Fixed:      {cycle_fixed} findings
   Open items: +{cycle_open} added
   Tests:      {pass_count} passing, {fail_count} failing
   Reviewers:  {clean/needs-another-cycle}
```

If `cycle_clean` = true: set `loop_clean` = true → exit loop

---

### After Loop Exits

<check if="loop_clean == true">
  Output: `✅ All reviewers clean after {review_cycle} cycle(s)`
</check>

<check if="review_cycle >= 3 AND loop_clean == false">
  Collect all remaining unfixed patch findings.
  For each: add to `open_items` as `⚖️ Known debt (max cycles reached): {title} — {location}`
  Output: `⚠️ Max review cycles reached. {count} remaining finding(s) accepted as known debt.`
</check>

## NEXT

Read fully and follow `./step-05-complete.md`
