# Step 5: Finalize and Close

## RULES

- Fix any remaining DoD failures that are fixable before updating status
- Status is `done` only if NO blocking open items exist
- Status is `review` if open items require user action before the story is shippable
- The open items report is the primary deliverable — make it actionable and complete

## INSTRUCTIONS

### 1. Definition of Done Checklist

Verify each item against the actual story file and codebase:

| # | Check | Status |
|---|---|---|
| 1 | All story tasks marked [x] | pass/fail |
| 2 | Every AC has corresponding implementation | pass/fail |
| 3 | Every AC has a corresponding test that asserts its outcome | pass/fail |
| 4 | Full test suite passes (no regressions) | pass/fail |
| 5 | File List updated with all changed files | pass/fail |
| 6 | Dev Agent Record updated with implementation notes | pass/fail |
| 7 | Change Log updated | pass/fail |
| 8 | Only permitted story sections were modified | pass/fail |

For each failing item:
- If fixable now: fix it
- If blocked by external dependency or human decision: add to `open_items` as `🔴 DoD blocked: {item} — {reason}`

### 2. Determine Final Status

<check if="no open_items entries are in category 🔴 DoD blocked OR ⚙️ Manual testing required OR 🎯 AC not fully testable">
  Set final_status = `done`
  Update story file Status → `done`
  Update `{sprint_status}`: set `{story_key}` → `done`
</check>

<check if="any open_items entries are 🔴 OR ⚙️ OR 🎯">
  Set final_status = `review`
  Update story file Status → `review`
  Update `{sprint_status}`: set `{story_key}` → `review`
  Add note to Dev Agent Record: "Marked review — {count} open items require user action before done"
</check>

### 3. Final Summary Report

Output the complete report:

```
╔══════════════════════════════════════════════════════════════╗
  COMPLETE STORY — FINAL REPORT
  Story: {story_key}
  Date:  {date}
╚══════════════════════════════════════════════════════════════╝

STATUS: {✅ DONE | ⏸ REVIEW — action required}

──────────────────────────────────────────────────────────────
EXECUTION SUMMARY
──────────────────────────────────────────────────────────────
  Story created:      {yes/no (skipped — already existed)}
  Tasks completed:    {tasks_done}/{tasks_total}
  Files changed:      {file_count}
  Review cycles run:  {review_cycle}
  Findings fixed:     {total_fixed} (auto)
  Tests passing:      {pass_count}
  Tests failing:      {fail_count}

  Reviews run:
    Code Review (Blind + Edge Case + Auditor): {enabled/skipped}
    Test Quality Review:                       {enabled/skipped}
    AC Deep Validation:                        {enabled/skipped}
```

Then, for each open item category (only show categories that have items):

```
══════════════════════════════════════════════════════════════
⚙️  MANUAL TESTING REQUIRED — {count} items
   These tests could not run automatically. You must run them.
══════════════════════════════════════════════════════════════
  1. {description}
     What to do: {specific action — command, env var, URL, etc.}
  2. ...

══════════════════════════════════════════════════════════════
🔴  DOD BLOCKERS — {count} items
   Story cannot be marked done until these are resolved.
══════════════════════════════════════════════════════════════
  1. {description} — {reason}
  ...

══════════════════════════════════════════════════════════════
🎯  ACCEPTANCE CRITERIA GAPS — {count} items
   These ACs could not be fully validated automatically.
══════════════════════════════════════════════════════════════
  1. AC: "{ac text}"
     Gap: {what's missing or untestable}
     Action: {what user should do}
  ...

══════════════════════════════════════════════════════════════
❓  DECISIONS / ASSUMPTIONS — {count} items
   Implemented with a reasonable assumption. Confirm before ship.
══════════════════════════════════════════════════════════════
  1. {description}
     Assumption made: {what was assumed}
     Confirm or correct: {how to validate}
  ...

══════════════════════════════════════════════════════════════
📋  SPEC AMBIGUITIES — {count} items
   Story spec was unclear; no code fix possible without clarification.
══════════════════════════════════════════════════════════════
  1. {description}
     Recommended action: Update story spec then re-run /bmad-complete-story
  ...

══════════════════════════════════════════════════════════════
⚖️  KNOWN DEBT — {count} items
   Real issues that could not be auto-fixed within 3 review cycles.
══════════════════════════════════════════════════════════════
  1. {title} — {location}
     Why deferred: max review cycles reached
  ...

══════════════════════════════════════════════════════════════
📌  DEFERRED — {count} items
   Pre-existing issues not introduced by this story. Not blocking.
══════════════════════════════════════════════════════════════
  1. {title} — {location}
  ...
```

Then close with next steps:

```
──────────────────────────────────────────────────────────────
NEXT STEPS
──────────────────────────────────────────────────────────────
```

If `final_status` = `done` AND no open items:
```
  Story {story_key} is complete with no open items. 🎉
  Suggested: /bmad-sprint-status to check next story.
```

If `final_status` = `done` AND open items exist (non-blocking only):
```
  Story {story_key} is marked done. Address open items above at your discretion.
  Suggested: /bmad-sprint-status to check next story.
```

If `final_status` = `review`:
```
  Story {story_key} requires your attention before it can be marked done.

  Priority order:
  1. Fix 🔴 DoD blockers
  2. Run ⚙️ manual tests and confirm results
  3. Resolve 🎯 AC gaps
  4. Confirm ❓ decisions/assumptions

  Once resolved: re-run /bmad-complete-story {story_file} to finish.
```

## END

Workflow complete.
