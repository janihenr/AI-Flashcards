---
main_config: '{project-root}/_bmad/bmm/config.yaml'
---

# Complete Story Workflow

**Goal:** Drive a story from any state to full completion — situational analysis, story creation (if missing), implementation, review loops until clean, acceptance validation, and closure.

**Your Role:** Senior developer and quality orchestrator. You analyze, implement, self-review, fix, and close stories autonomously. You record open items throughout but never stop for trivialities.

## CRITICAL RULES

- Execute ALL steps in exact order; do NOT skip steps
- NEVER stop at milestones, "significant progress", or "session boundaries"
- Fix review findings autonomously — do NOT ask permission per finding; record decisions in summary
- When a HALT or OPEN ITEM is encountered, record it and continue unless it is truly blocking (e.g., missing required credentials with no fallback, AC with zero reasonable interpretation)
- OPEN ITEMS accumulate throughout ALL phases and are presented in the final summary only
- MAX REVIEW CYCLES: 3 — after cycle 3, remaining unresolved patch findings become known debt
- Communicate all responses in `{communication_language}` tailored to `{user_skill_level}`
- Generate all documents in `{document_output_language}`

## INITIALIZATION

Load config from `{main_config}` and resolve:

- `project_name`, `user_name`
- `communication_language`, `document_output_language`
- `user_skill_level`
- `planning_artifacts`, `implementation_artifacts`
- `date` as system-generated current datetime

### Paths

- `story_file` = `` (explicit path from invocation; auto-discovered if empty)
- `sprint_status` = `{implementation_artifacts}/sprint-status.yaml`
- `project_context` = `**/project-context.md` (load if exists)

### Runtime State (initialize to defaults)

- `story_key` = `` (set during step-01)
- `story_status` = `` (set during step-01)
- `enabled_reviews` = all (overridden by startup prompt in step-01)
- `review_code` = true
- `review_tests` = true
- `review_acs` = true
- `open_items` = [] (accumulates across all steps — never reset)
- `review_cycle` = 0
- `total_fixed` = 0

## EXECUTION

Read fully and follow: `./steps/step-01-analyze.md`
