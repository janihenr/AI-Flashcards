# Step 3: Implementation

## RULES

- Skip this step if `story_status` is `review` or `done` — jump to step-04-review-loop.md
- Only modify the story file in: Tasks/Subtasks checkboxes, Dev Agent Record, File List, Change Log, Status
- NEVER stop at milestones or "significant progress" — implement ALL tasks before proceeding
- When tests require external env vars or unavailable services: add to `open_items` and continue
- Use Context7 MCP before implementing code that uses any third-party library

## INSTRUCTIONS

<check if="story_status == 'review' or story_status == 'done'">
  Skip this step — implementation already done.
  Proceed to step-04-review-loop.md
</check>

### 1. Load Implementation Context

Load the COMPLETE story file from `{story_file}`.

Parse and hold in memory:
- Full Acceptance Criteria list
- All Tasks/Subtasks with current checked state
- Dev Notes section (architecture, technical specs, file structure, testing requirements)
- Previous Story Learnings

Load `{project_context}` for coding standards and project-wide patterns.

### 2. Detect Resume State

<check if="'Senior Developer Review (AI)' section exists in story file">
  Set `resume_mode` = true
  Extract pending review follow-up items (unchecked [ ] in "Review Follow-ups (AI)" subsection)
  Add each to front of work queue — these are addressed FIRST before regular tasks
  Output: `⏯️ Resuming after code review — {count} review follow-ups to address first`
</check>

<check if="'Senior Developer Review (AI)' section does NOT exist">
  Set `resume_mode` = false
  Output: `🚀 Starting fresh implementation — {tasks_done}/{tasks_total} tasks done`
</check>

### 3. Mark In-Progress

Update story file Status → `in-progress`
Update `{sprint_status}`: set `{story_key}` → `in-progress`

### 4. Third-Party Library Documentation

Before writing any code that uses third-party libraries:
1. Call `mcp__context7__resolve-library-id` for each relevant library
2. Call `mcp__context7__query-docs` to get current API patterns
3. Implement based on fetched docs — do not rely on training-data knowledge

### 5. Implement All Tasks

For each incomplete task [ ] in order (review follow-ups first if resume_mode):

a. **Understand**: Read the task and all relevant Dev Notes context
b. **Write test first** (TDD): Write a failing test that validates the task
c. **Implement**: Write the minimal code to make the test pass
d. **Refactor**: Clean up while keeping tests green
e. **Check [x]**: Mark task and all subtasks done in the story file
f. **Continue immediately** to the next task — do not pause

**Open item detection during implementation:**

If a task requires something unavailable:
- Missing env variable: add `⚙️ Manual testing required: Set {VAR_NAME}={description} — needed for {test_name}` to `open_items`
- External service/API not available: add `⚙️ Manual testing required: {service} credentials needed for {test}` to `open_items`
- Ambiguous AC with no reasonable interpretation: add `❓ AC ambiguity: "{AC text}" — implementation assumed {what you chose}; confirm this is correct` to `open_items`
- Architecture decision with no clear answer: add `❓ Decision needed: {description} — implemented as {choice}; review before shipping` to `open_items`

In all cases: continue with the best reasonable implementation, document the assumption.

### 6. Regression Check

After all tasks complete, run the full test suite.

If failures:
- Fix each failing test unless it requires external dependencies
- For tests requiring unavailable external dependencies: add to `open_items` as `⚙️ Manual testing required: {test_name} — needs {dependency}`

### 7. Finalize Story File

Update in story file:
- File List: add EVERY new, modified, or deleted file (paths relative to repo root)
- Dev Agent Record → Implementation Notes: brief summary of what was done
- Dev Agent Record → Debug Log: notable decisions or issues encountered
- Change Log: summary of changes and why
- Status → `review`

Update `{sprint_status}`: set `{story_key}` → `review`

Output:
```
✅ IMPLEMENTATION COMPLETE

  Story:   {story_key}
  Tasks:   {tasks_done}/{tasks_total}
  Files:   {file_count} changed
  Tests:   {pass_count} passing, {fail_count} failing
  Open items so far: {open_items_count}
```

## NEXT

Read fully and follow `./step-04-review-loop.md`
