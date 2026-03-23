# Step 2: Story Setup

## RULES

- Only execute the create-story block if `story_status` is `missing`, `backlog`, or `create`
- If `story_status` is `ready-for-dev`, `in-progress`, or `review`: skip this step immediately
- Use Context7 MCP for third-party library documentation before writing story Dev Notes
- Zero user intervention during story creation except the initial epic/story confirmation

## INSTRUCTIONS

<check if="story_status is 'ready-for-dev' or 'in-progress' or 'review'">
  Skip this step — story already exists.
  Proceed to step-03-implement.md
</check>

### Create Story from Planning Artifacts

Output: `📝 Creating story from planning artifacts...`

#### 1. Load Planning Artifacts

Load selectively — read tables of contents or headers first, then pull relevant sections:

| Artifact | Path Pattern |
|---|---|
| Epics | `{planning_artifacts}/*epic*.md` or `{planning_artifacts}/*epic*/*.md` |
| PRD | `{planning_artifacts}/*prd*.md` or `{planning_artifacts}/*prd*/*.md` |
| Architecture | `{planning_artifacts}/*architecture*.md` or `{planning_artifacts}/*architecture*/*.md` |
| UX Design | `{planning_artifacts}/*ux*.md` or `{planning_artifacts}/*ux*/*.md` |
| Previous Stories | `{implementation_artifacts}/*-*-*.md` — scan for patterns and learnings |

If any critical artifact (epics) is missing:
- Add to `open_items`: `⚠️ Missing artifact: {artifact} at {expected_path} — story created with reduced context`
- Continue with available artifacts

#### 2. Identify Next Story

Scan epics for stories where:
- Status = `backlog`
- All story dependencies are done (or no dependencies)

If multiple candidates: list them and ask user to confirm which one.
If exactly one: announce it and proceed without asking.

Set `story_key` from the identified story (e.g., `1-5-user-registration`).

#### 3. Load Third-Party Library Docs via Context7 MCP

For each third-party library relevant to this story's implementation:
1. Call `mcp__context7__resolve-library-id` to find the library ID
2. Call `mcp__context7__query-docs` to retrieve relevant documentation sections
3. Store key API patterns, configuration options, and current SDK usage

Common libraries to check based on project context:
- Supabase (auth, RLS, storage)
- Drizzle ORM (queries, migrations)
- Next.js (App Router, server actions)
- Relevant testing frameworks (Vitest, Playwright)

Add to open_items if Context7 is unavailable: `⚠️ Context7 unavailable — story Dev Notes use training-data knowledge for {libraries}`

#### 4. Analyze Previous Stories for Learnings

Read all existing story files in `{implementation_artifacts}`. Extract:
- Patterns used (file structure, naming, architecture decisions)
- Gotchas noted in Dev Agent Record / Debug Log
- Libraries and versions in use
- Test patterns and frameworks

Use these to populate the "Previous Story Learnings" section of the new story.

#### 5. Generate Story File

Create a comprehensive story file at `{implementation_artifacts}/{story_key}.md` following the standard story structure:

```markdown
# Story {story_key}: {title}

**Status:** ready-for-dev
**Epic:** {epic_key}

## Story

{user story in Given/When/Then or As a / I want / So that format}

## Acceptance Criteria

{numbered list of ACs, each testable and unambiguous}

## Tasks / Subtasks

- [ ] Task 1: {description}
  - [ ] Subtask 1.1
  - [ ] Subtask 1.2
- [ ] Task 2: {description}
  ...

## Dev Notes

### Architecture Requirements
{key architectural constraints from architecture doc}

### Technical Specifications
{libraries, versions, patterns to use — sourced from Context7}

### File Structure
{which files to create/modify and why}

### Testing Requirements
{required test types, coverage expectations, test patterns}

### Previous Story Learnings
{extracted patterns and gotchas from prior stories}

### API / Integration Notes
{external services, env vars required, third-party API notes}

## Dev Agent Record

### Implementation Notes
(populated during development)

### Debug Log
(populated during development)

## File List

(populated during development)

## Change Log

(populated during development)
```

#### 6. Update Sprint Status

Update `{sprint_status}`:
- Set `{story_key}` status to `ready-for-dev`

If sprint-status.yaml does not exist:
- Add to `open_items`: `⚠️ No sprint-status.yaml found — story created but not tracked in sprint`

#### 7. Confirm

Output:
```
✅ Story Created

  Key:    {story_key}
  Path:   {implementation_artifacts}/{story_key}.md
  ACs:    {acceptance_criteria_count}
  Tasks:  {task_count}
  Status: ready-for-dev
```

Set `story_status` = `ready-for-dev`

## NEXT

Read fully and follow `./step-03-implement.md`
