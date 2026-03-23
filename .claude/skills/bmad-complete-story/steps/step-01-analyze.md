# Step 1: Situational Analysis + Startup Configuration

## RULES

- This step is primarily read-only — do not modify any files
- Extract `story_file` from the invocation prompt if a path was provided
- Speak output in `{communication_language}` at `{user_skill_level}` level

## INSTRUCTIONS

### 1. Find the Story

<check if="story_file was provided in the invocation">
  - Use `{story_file}` directly
  - Extract `story_key` from filename (e.g., `1-4-anonymous-cold-start-deck-study`)
  - Read the COMPLETE story file
  - Extract `story_status` from the Status field
  - Skip to instruction 3
</check>

<check if="no story_file provided">
  - Read `{sprint_status}` if it exists
  - Find the FIRST story (top-to-bottom in sprint-status.yaml) where status is `in-progress`
  - If none, find the FIRST where status is `ready-for-dev`
  - If sprint-status does not exist or has no matching stories:
    - Scan `{implementation_artifacts}` for files matching `*-*-*.md`
    - Read each and check the Status field
    - Use the first with `Status: in-progress` or `Status: ready-for-dev`
  - If still nothing found: set `story_status` = `missing`
</check>

### 2. Detect Story State

If story file found, read it and extract:
- `story_key` — from filename
- `story_status` — from Status field in file
- `acceptance_criteria_count` — count of ACs listed
- `tasks_total` / `tasks_done` — count [ ] vs [x] in Tasks/Subtasks
- `review_section_exists` — whether "Senior Developer Review (AI)" section is present
- `sprint_status_state` — what sprint-status.yaml shows for this story (if it exists)

Map to phase entry point:

| story_status | Phase Entry |
|---|---|
| missing | Step 2 — create story |
| backlog | Step 2 — create story |
| ready-for-dev | Step 3 — implement |
| in-progress | Step 3 — implement (resume) |
| review | Step 4 — review loop |
| done | Step 5 — already complete |

### 3. Startup Configuration Prompt

HALT. Present the situation report and ask for review configuration:

```
╔══════════════════════════════════════════════════════╗
  COMPLETE STORY — SITUATION REPORT
╚══════════════════════════════════════════════════════╝

Story:   {story_key | "not found"}
Status:  {story_status}
Tasks:   {tasks_done}/{tasks_total} complete
ACs:     {acceptance_criteria_count} defined

Phase entry: {phase_entry_point}

──────────────────────────────────────────────────────
REVIEW CONFIGURATION  (press Enter to accept defaults)
──────────────────────────────────────────────────────

Which review types should run in the quality loop?

  [1] ✅ Code Review
         Adversarial (Blind Hunter) + Edge Case Hunter + Acceptance Auditor
  [2] ✅ Test Quality Review
         Test coverage, naming, structure, missing edge cases
  [3] ✅ Acceptance Criteria Deep Validation
         Verify each AC has implementation + passing test

Max review cycles: 3  (unresolved findings after cycle 3 → known debt)

Type numbers to disable, e.g., "2" disables test review.
Press Enter to accept all enabled.
```

Wait for user response. Based on response:
- Toggle any disabled review types to false in `{review_code}`, `{review_tests}`, `{review_acs}`
- Accept defaults (all true) if user presses Enter or says nothing

### 4. Route Based on State

<check if="story_status == 'done'">
  Output:
  ```
  ✅ Story {story_key} is already marked done.
  Run /bmad-sprint-status to check overall sprint health.
  ```
  HALT — workflow complete, nothing to do.
</check>

<check if="story_status == 'missing'">
  Output:
  ```
  ⚠️  NO STORY FILE FOUND

  No story in in-progress or ready-for-dev status was found.
  Sprint status: {sprint_status}
  Implementation artifacts: {implementation_artifacts}

  A story file is required to proceed. I can create one using
  your planning artifacts (epics, PRD, architecture, UX).

  Options:
  [1] Create next story now from epics
  [2] Provide a story file path manually
  [3] Exit — I will create the story separately
  ```

  HALT. Wait for user choice.

  If [1]: set story_status = 'create', proceed to step-02
  If [2]: ask for path, set story_file, re-read and detect state, continue
  If [3]: output "Run /bmad-create-story to create your next story." and stop
</check>

## NEXT

Read fully and follow `./step-02-story-setup.md`
