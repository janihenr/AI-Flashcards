---
stepsCompleted: [1, 2, 3, 4]
status: complete
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
---

# Flashcards - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Flashcards, decomposing the requirements from the PRD and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Anonymous users can access and study a pre-built cold start deck without creating an account
FR2: Anonymous users can initiate account creation directly from within the cold start deck experience
FR3: Users can sign up using Google OAuth or email/password
FR4: Users invited to a team workspace can sign up using their work email via an invite link
FR5: Users can create, log in to, and log out of their account
FR6: Users can update their profile information
FR7: Users can request deletion of their account and all associated personal data
FR8: Users can review a summary of their stored personal data on request (GDPR)
FR9: New visitors can accept, decline, or adjust cookie consent preferences
FR10: Admin can simulate any subscription role (Free, Pro, Team Member, Team Admin) on their own account for testing purposes without requiring actual payment
FR11: Users can view all active sessions and revoke individual sessions
FR12: Users can change their password
FR13: Users can export their personal data in a portable format (GDPR right to data portability)
FR14: Authenticated users can create a new flashcard deck with a title and subject
FR15: Users can add cards to a deck manually with text (front/back) and an optional image
FR16: Users can edit and delete individual cards within a deck they own
FR17: Users can delete a deck they own
FR18: Users can share a deck via an invite link (recipients must be authenticated to study)
FR19: Users can view all their decks in a personal library
FR20: Users can start a study session for any deck they have access to
FR21: The system schedules card reviews using the FSRS-6 spaced repetition algorithm
FR22: Users can rate their recall confidence after each card, which drives FSRS-6 scheduling
FR23: Users can view their Depth Score — a cumulative measure of retention quality — per deck
FR24: Users can identify and study weak cards (low retention) in isolation within a deck
FR25: The system presents card content in adaptive formats (text, image, contextual narrative) based on the user's Learning Fingerprint
FR26: Study session progress is persisted automatically on session completion
FR27: Authenticated users can generate a deck from a topic prompt using AI
FR28: Authenticated users can generate cards from pasted text using AI
FR29: Users can review, edit, and delete AI-generated cards before saving to a deck
FR30: The system silently builds a Learning Fingerprint for each user based on study behavior and response patterns
FR31: The Learning Fingerprint influences card format selection and content presentation style over time
FR32: AI card generation for free-tier users is subject to a monthly usage limit
FR33: AI card generation for free-tier users requires an admin spend-approval flag to be enabled
FR34: The system sanitizes and validates all user-supplied content before passing it to AI generation
FR35: Before AI deck generation, the system prompts users to specify their learning goal and personal context; AI-generated card content is framed through that stated goal
FR36: The system measures and logs response hesitation time as a Learning Fingerprint signal; sustained hesitation on nominally mastered cards automatically schedules them for deeper review
FR37: Users can upgrade from Free to Pro tier via a subscription checkout flow
FR38: Team admins can purchase and manage a Team subscription
FR39: Users can view their current subscription tier, remaining usage limits, and billing history
FR40: Users can cancel their subscription at any time
FR41: The system automatically grants and revokes feature access based on the user's active subscription tier
FR42: Authenticated users can create a named team workspace
FR43: Team admins can invite members by providing a list of email addresses
FR44: The system validates each email address in the invite list and flags invalid entries before sending invitations
FR45: Invited users receive an email invitation with a link to sign up or log in and join the workspace
FR46: Team admins can assign a deck to all or selected team members
FR47: Team members can view and study all decks assigned to them
FR48: Team admins can view aggregate study progress per assigned deck (completion rate, average retention)
FR49: Team admins can send a reminder to members who have not started an assigned deck
FR50: Admin can toggle the global AI free-tier spend approval flag without a code deployment
FR51: The system presents a cookie consent banner to new visitors and applies their preference
FR52: The system rate-limits team invite sends to prevent abuse
FR53: All core user-facing screens conform to WCAG 2.1 AA accessibility standards
FR54: The system logs errors, AI generation failures, and payment events in structured, machine-readable format
FR55: Admin can access error logs and system health indicators to investigate and debug production issues
FR56: Admin can query, filter, and export error logs by type, time range, and severity
FR57: The system groups and deduplicates recurring errors to surface patterns rather than noise
FR58: The system tracks key product events (cold start viewed, signup, deck created, AI generation used, study session completed, paywall hit, upgrade, team created, deck assigned, session started)
FR59: Admin can view a business metrics dashboard covering active users, retention cohorts (D1/D7/D30), freemium-to-paid conversion rate, and MRR
FR60: Admin can view funnel analytics from cold start → signup → first deck → first study session → upgrade
FR61: Admin can view AI usage metrics (generations per day, free vs. paid split, cost estimate)
FR62: The system enforces rate limiting on authentication attempts to prevent brute-force attacks

### NonFunctional Requirements

NFR-PERF1: Largest Contentful Paint (LCP) < 2s on 4G mobile
NFR-PERF2: API response time (p95) < 500ms for all non-AI endpoints
NFR-PERF3: AI card generation (end-to-end) < 5s for a single card; < 15s for a full deck (20 cards)
NFR-PERF4: Study session first card load < 1s after session start
NFR-PERF5: Time to interactive (TTI) < 3s on desktop
NFR-PERF6: Core Web Vitals all green in Vercel Analytics
NFR-SEC1: TLS 1.2+ enforced on all connections
NFR-SEC2: AES-256 encryption at rest (Supabase managed)
NFR-SEC3: Short-lived JWTs with refresh token rotation enabled
NFR-SEC4: Supabase RLS enforced on all tables — no client-side trust
NFR-SEC5: API keys never exposed to client; all AI/payment calls server-side only
NFR-SEC6: AI prompt inputs sanitized before passing to LLM; no PII in prompts
NFR-SEC7: Auth attempts rate-limited at 10 attempts/15 min per IP
NFR-SEC8: Payment data never stored locally; Stripe handles all card data (PCI DSS delegated)
NFR-GDPR1: Data deletion requests fulfilled within 30 days
NFR-GDPR2: Data export requests fulfilled within 72 hours
NFR-GDPR3: Functional cookies only until consent granted; analytics blocked until opt-in
NFR-GDPR4: All user data stored in EU region (Supabase Frankfurt; Azure OpenAI Sweden Central)
NFR-GDPR5: No user PII sent to Azure OpenAI; prompt content not used for model training
NFR-SCALE1: Support 500 concurrent users without degradation at MVP launch
NFR-SCALE2: Queue AI requests if concurrent demand spikes; graceful degradation to manual creation
NFR-SCALE3: Support teams up to 200 members (MVP ceiling)
NFR-REL1: Uptime ≥ 99.5% monthly
NFR-REL2: Structured JSON logs retained minimum 30 days
NFR-REL3: Critical errors (payment failures, auth failures) alert within 5 minutes
NFR-REL4: Automatic failover to gpt-4o fallback if primary Azure deployment unavailable
NFR-REL5: Zero tolerance for study session data loss — persisted before UI confirms completion
NFR-REL6: Idempotent Stripe webhook handlers with dead-letter queue for failed events
NFR-ACC1: WCAG 2.1 AA on all core flows (study session, deck creation, onboarding, team management)
NFR-ACC2: Full keyboard accessibility on all interactive elements
NFR-ACC3: Semantic HTML; ARIA labels on dynamic content
NFR-ACC4: Minimum 4.5:1 color contrast for normal text; 3:1 for large text
NFR-ACC5: Visible focus indicators; logical tab order throughout app
NFR-INT1: Azure OpenAI timeout after 10s; retry once; fallback to gpt-4o; user notified if both fail
NFR-INT2: Stripe webhook signature validation on all events; idempotency keys on all payment operations
NFR-INT3: Supabase connection pooling via Supabase Pooler
NFR-INT4: Transactional emails (Resend) delivered within 60s; bounce handling logged
NFR-INT5: App remains functional (read-only study mode) if Stripe or Resend temporarily unavailable

### Additional Requirements

**From Architecture — Technical Setup:**
- ARCH1: Project scaffolded via `npx create-next-app@latest flashcards --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --turbopack`
- ARCH2: Supabase project created in Frankfurt (EU) region with anonymous sign-ins enabled and `max_slot_wal_keep_size` configured
- ARCH3: Azure OpenAI resource created in Sweden Central (EU Data Zone) with three deployments: gpt-4o-mini (FAST), gpt-5.4-mini (LARGE), gpt-4o (FALLBACK)
- ARCH4: Drizzle ORM configured with `casing: 'camelCase'` in `drizzle.config.ts`
- ARCH5: All DB interactions through typed DAL wrapper functions in `src/server/db/queries/` — no raw Drizzle in components or route handlers
- ARCH6: Supabase RLS policies defined as SQL files in `supabase/migrations/rls/` (version-controlled)
- ARCH7: Vercel KV + `@upstash/ratelimit` for rate limiting (auth brute-force, AI generation, team invites)
- ARCH8: Sentry integrated for error capture and critical alerting (payment failures, auth failures within 5 min)
- ARCH9: Structured JSON logging via typed `log()` wrapper in `src/lib/logger.ts`
- ARCH10: All Server Actions return `Result<T>` type — no thrown exceptions across boundaries
- ARCH11: Supabase anonymous sign-in on cold start; `supabase.auth.linkIdentity()` for signup upgrade — spike required before Sprint 1 to validate race condition behavior
- ARCH12: Stripe webhook idempotency via `processed_webhook_events` table check before processing
- ARCH13: `profiles.tier` column synced by Stripe webhook — single source of truth for RBAC
- ARCH14: Cursor-based pagination from day one for all list queries: `{ limit, cursor? }` in, `{ items, nextCursor }` out
- ARCH15: Anonymous user GDPR cleanup — Supabase Edge Function cron job to purge unconverted anonymous sessions
- ARCH16: `axe-playwright` added to E2E suite for automated WCAG 2.1 AA checks
- ARCH17: AI model routing in `src/server/ai/index.ts`: short generation → gpt-4o-mini, large doc → gpt-5.4-mini, fallback → gpt-4o

### UX Design Requirements

No UX Design document exists for this project. UX requirements are embedded in the PRD user journeys (Sofia, Marcus, Priya, James) and the Shapeshifter Cards / Learning Fingerprint features defined in FR25, FR30, FR31.

### FR Coverage Map

FR1 → Epic 1 — Anonymous cold start deck access
FR2 → Epic 1 — In-deck signup conversion flow
FR3 → Epic 1 — Google OAuth + email/password signup
FR4 → Epic 1 — Team invite link signup path
FR5 → Epic 1 — Login / logout
FR6 → Epic 2 — Profile update
FR7 → Epic 2 — Account deletion request (GDPR)
FR8 → Epic 2 — Personal data summary request (GDPR)
FR9 → Epic 1 — Cookie consent banner
FR10 → Epic 9 — Admin role simulation
FR11 → Epic 2 — Session list + revocation
FR12 → Epic 2 — Password change
FR13 → Epic 2 — Personal data export (GDPR portability)
FR14 → Epic 3 — Create deck with title + subject
FR15 → Epic 3 — Add cards manually (text + optional image)
FR16 → Epic 3 — Edit and delete individual cards
FR17 → Epic 3 — Delete a deck
FR18 → Epic 3 — Share deck via invite link
FR19 → Epic 3 — Personal deck library view
FR20 → Epic 4 — Start a study session
FR21 → Epic 4 — FSRS-6 scheduling
FR22 → Epic 4 — Recall confidence rating
FR23 → Epic 4 — Depth Score per deck
FR24 → Epic 4 — Weak-card isolation study mode
FR25 → Epic 6 — Shapeshifter Cards adaptive format presentation
FR26 → Epic 4 — Automatic session progress persistence
FR27 → Epic 5 — AI deck generation from topic prompt
FR28 → Epic 5 — AI card generation from pasted text
FR29 → Epic 5 — Review / edit / delete AI-generated cards before save
FR30 → Epic 6 — Silent Learning Fingerprint build
FR31 → Epic 6 — Learning Fingerprint influences card format selection
FR32 → Epic 5 — Free-tier monthly AI generation limit
FR33 → Epic 5 — Admin spend-approval gate for free-tier AI
FR34 → Epic 5 — Sanitize + validate content before AI
FR35 → Epic 5 — Learning goal prompt before AI deck generation
FR36 → Epic 6 — Hesitation time signal → automatic deeper review scheduling
FR37 → Epic 7 — Free → Pro upgrade via Stripe checkout
FR38 → Epic 7 — Team subscription purchase and management
FR39 → Epic 7 — Subscription tier, usage limits, billing history view
FR40 → Epic 7 — Subscription cancellation
FR41 → Epic 7 — Automatic feature access grant/revoke by tier
FR42 → Epic 8 — Create named team workspace
FR43 → Epic 8 — Invite team members by email list
FR44 → Epic 8 — Invite email validation before send
FR45 → Epic 8 — Email invitation delivery with signup/login link
FR46 → Epic 8 — Assign deck to all or selected team members
FR47 → Epic 8 — Team member view + study of assigned decks
FR48 → Epic 8 — Aggregate study progress per assigned deck
FR49 → Epic 8 — Send reminder to members who haven't started
FR50 → Epic 9 — Admin global AI spend-approval flag toggle
FR51 → Epic 1 — Cookie consent banner presentation + storage
FR52 → Epic 8 — Rate-limit team invite sends
FR53 → Epic 9 — WCAG 2.1 AA conformance on all core screens
FR54 → Epic 9 — Structured error, AI failure, and payment event logging
FR55 → Epic 9 — Admin error log access + system health view
FR56 → Epic 9 — Admin error log query, filter, and export
FR57 → Epic 9 — Error grouping and deduplication
FR58 → Epic 9 — Product event tracking (cold start, signup, deck created, AI used, session started, session completed, paywall hit, upgrade, team created, deck assigned)
FR59 → Epic 9 — Business metrics dashboard (DAU/WAU, retention cohorts D1/D7/D30, conversion, MRR)
FR60 → Epic 9 — Funnel analytics (cold start → signup → first deck → first study → upgrade)
FR61 → Epic 9 — AI usage metrics (generations/day, free vs paid, cost estimate)
FR62 → Epic 1 — Auth rate limiting (brute-force protection)

## Epic List

### Epic 1: Foundation & Cold Start Experience
Any visitor can discover the product value through a pre-built cold start deck, accept cookie preferences, sign up via Google or email, and resume their progress as a registered user — with rate-limited auth to prevent abuse.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR9, FR51, FR62
**ARCH covered:** ARCH1, ARCH2, ARCH3, ARCH4, ARCH5, ARCH6, ARCH7, ARCH8, ARCH9, ARCH10, ARCH11, ARCH12, ARCH13, ARCH14, ARCH15, ARCH16, ARCH17

### Epic 2: Account Management & GDPR
Authenticated users can maintain their account security (password change, session revocation), update their profile, and fully exercise their GDPR rights (data export, personal data summary, account deletion).
**FRs covered:** FR6, FR7, FR8, FR11, FR12, FR13

### Epic 3: Deck & Card Library
Users can build a personal flashcard library — creating, editing, and deleting decks and individual cards, sharing decks via invite links, and browsing all their decks from a personal library view.
**FRs covered:** FR14, FR15, FR16, FR17, FR18, FR19

### Epic 4: Study Sessions & Spaced Repetition
Users can study any accessible deck with FSRS-6 scheduling, rate recall confidence after each card, track their Depth Score, target weak cards in isolation, and have all session progress persisted automatically.
**FRs covered:** FR20, FR21, FR22, FR23, FR24, FR26

### Epic 5: AI-Powered Card Generation
Users can instantly generate decks from a topic prompt or cards from pasted text using AI, specify their learning goal before generation, review and edit generated cards before saving, within enforced free-tier usage limits.
**FRs covered:** FR27, FR28, FR29, FR32, FR33, FR34, FR35

### Epic 6: Adaptive Learning Engine
The app silently builds a Learning Fingerprint from each user's study behavior (response patterns, hesitation time), and uses it to adaptively present card content in the most effective format for that user (Shapeshifter Cards).
**FRs covered:** FR25, FR30, FR31, FR36

### Epic 7: Subscriptions & Billing
Users can upgrade from Free to Pro or purchase a Team subscription via Stripe checkout, view billing history and remaining usage, cancel at any time, with automatic feature access enforcement across all tiers.
**FRs covered:** FR37, FR38, FR39, FR40, FR41

### Epic 8: Team Workspaces
Team admins can create a workspace, invite members by email (with validation + rate limiting), assign decks to selected members, monitor aggregate study progress, and send targeted reminders to members who haven't started.
**FRs covered:** FR42, FR43, FR44, FR45, FR46, FR47, FR48, FR49, FR52

### Epic 9: Admin, Observability & Analytics
Admins have full visibility into structured error logs (with grouping, filtering, export), product event tracking, business metrics (retention cohorts, MRR, conversion funnel, AI usage), and operational controls (role simulation, AI spend-approval flag toggle), with all core screens meeting WCAG 2.1 AA.
**FRs covered:** FR10, FR50, FR53, FR54, FR55, FR56, FR57, FR58, FR59, FR60, FR61

---

## Story Definition of Done

Every story is considered complete when ALL of the following are true:

1. All acceptance criteria pass (verified by the implementing developer)
2. Unit/integration tests written and passing for new logic
3. No raw Drizzle queries in components or route handlers (all via DAL wrappers)
4. All Server Actions return `Result<T>` — no thrown exceptions across boundaries
5. RLS policy reviewed and/or SQL migration file added to `supabase/migrations/rls/`
6. WCAG 2.1 AA verified on any new UI (keyboard navigation, focus indicators, contrast, ARIA labels)

---

## Epic 1: Foundation & Cold Start Experience

Any visitor can discover the product value through a pre-built cold start deck, accept cookie preferences, sign up via Google or email, and resume their progress as a registered user.

### Story 1.1: Project Scaffold & Core Infrastructure Setup

As a solo developer building the Flashcards SaaS,
I want the project fully scaffolded with Next.js, TypeScript, Tailwind, Drizzle ORM, core lib utilities, Sentry, and a production-ready config,
So that all subsequent development has a consistent, zero-tech-debt foundation.

**Acceptance Criteria:**

**Given** the repository is empty
**When** the scaffold is complete
**Then** the project is bootstrapped via `npx create-next-app@latest flashcards --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --turbopack`
**And** Drizzle ORM is installed and configured with `casing: 'camelCase'` in `drizzle.config.ts`
**And** `src/types/index.ts` exports the `Result<T>` type: `{ data: T; error: null } | { data: null; error: { message: string; code?: string } }`
**And** `src/lib/logger.ts` exports a typed `log(entry: LogEntry)` function that writes structured JSON to stdout
**And** all Server Actions are typed to return `Result<T>` — no thrown exceptions across boundaries
**And** Sentry is integrated with critical alert rules for payment and auth failures (within 5 min threshold)
**And** `axe-playwright` is added to the E2E test suite for automated WCAG 2.1 AA checks
**And** `.env.example` documents all required environment variables with comments
**And** `src/server/ai/index.ts` exports the AI model routing logic (fast → gpt-4o-mini, large → gpt-5.4-mini, fallback → gpt-4o) via `@ai-sdk/azure`

### Story 1.2: Supabase Foundation & Auth Infrastructure

As a developer,
I want Supabase connected with anonymous sign-in enabled, the client split by trust level, RLS policies versioned as SQL files, cursor-based pagination implemented, and the linkIdentity() upgrade path spiked,
So that the app has a secure, EU-resident, GDPR-compliant data layer ready for all features.

**Acceptance Criteria:**

**Given** the Supabase project is created in the Frankfurt (EU) region
**When** the setup is complete
**Then** the Supabase client is split: `createServerClient()` (service role, admin only) and `createUserClient(session)` (anon key, all DAL calls)
**And** all DB interactions go through typed DAL wrapper functions in `src/server/db/queries/` — no raw Drizzle in components or route handlers
**And** anonymous sign-ins are enabled in Supabase Auth settings
**And** RLS policy SQL files are versioned under `supabase/migrations/rls/`
**And** a cursor-based pagination helper is implemented (`{ limit, cursor? }` → `{ items, nextCursor }`)
**And** a Supabase Edge Function cron job is defined for purging unconverted anonymous sessions
**And** the `supabase.auth.linkIdentity()` anonymous-to-auth upgrade path is spiked: race condition behavior documented in ADR, with a mitigation strategy confirmed before Sprint 1 development proceeds
**And** Supabase connection pooling is configured via Supabase Pooler

### Story 1.3: Cookie Consent Banner & GDPR Consent Storage

As a new visitor to the Flashcards app,
I want to see a cookie consent banner where I can accept, decline, or customize my preferences,
So that my privacy choices are respected and only consented cookies/analytics are activated.

**Acceptance Criteria:**

**Given** I am a new visitor who has not previously set a consent preference
**When** I land on any page
**Then** a cookie consent banner is displayed and blocks analytics loading
**And** the banner offers three actions: Accept All, Decline All, Customize

**Given** I click "Accept All"
**When** my preference is stored
**Then** analytics cookies are activated and the banner is dismissed
**And** my preference is persisted in the Zustand cookie consent store (localStorage-backed)

**Given** I click "Decline All"
**When** my preference is stored
**Then** only strictly functional cookies are set and all analytics remain blocked

**Given** I have previously set a preference
**When** I return to the site
**Then** the banner is not shown and my stored preference is applied on load

**Given** the banner is visible
**When** I interact with it using only the keyboard
**Then** I can tab to each action and activate it — meeting WCAG 2.1 AA keyboard accessibility (FR53)
**And** the banner has minimum 4.5:1 color contrast for all text (NFR-ACC4)

### Story 1.4: Anonymous Cold Start Deck Study

As an anonymous visitor,
I want to access and study a pre-built cold start deck without creating an account,
So that I experience the product's core value before deciding to sign up.

**Acceptance Criteria:**

**Given** I land on the app homepage as a new anonymous visitor
**When** the page loads
**Then** an anonymous Supabase session is created automatically (no login required)
**And** the pre-built cold start deck is visible and accessible

**Given** I click into the cold start deck
**When** the study session starts
**Then** the first card loads within 1 second (NFR-PERF4)
**And** cards are presented one at a time with front/back flip interaction
**And** my progress within the session is tracked against my anonymous session ID

**Given** I complete the cold start deck
**When** the session ends
**Then** a completion summary screen is shown
**And** a clear CTA prompts me to sign up to save my progress and explore more

### Story 1.5: User Registration — Google OAuth & Email/Password

As a new user,
I want to sign up using Google OAuth or email/password,
So that I can create a permanent account and access the full product.

**Acceptance Criteria:**

**Given** I am on the signup page and click "Sign up with Google"
**When** I complete Google OAuth consent
**Then** I am redirected back to the app and signed in
**And** a `profiles` record is created with `tier = 'free'`

**Given** I choose email/password signup and submit a valid email and password (min 8 characters)
**When** the form is submitted
**Then** a verification email is sent via Resend within 60 seconds (NFR-INT4)
**And** upon email verification, I am redirected to my personal library

**Given** I submit a password with fewer than 8 characters
**When** I try to submit
**Then** a validation error is shown client-side before any server call is made

**Given** an IP makes more than 10 auth attempts within 15 minutes (NFR-SEC7)
**When** the 11th attempt is made
**Then** a 429 rate-limited response is returned via Vercel KV + Upstash rate limiter (FR62)

### Story 1.6: Anonymous Session Upgrade to Registered Account

As an anonymous user who has studied the cold start deck,
I want to sign up from within the cold start experience and have my anonymous session progress carried over,
So that I don't lose my study history when I convert to a registered account.

**Acceptance Criteria:**

**Given** I am an anonymous user who has rated cards in the cold start session
**When** I click the signup CTA at the end of the cold start session
**Then** I am shown the signup form (Google or email/password) without leaving the app context

**Given** I complete signup
**When** `supabase.auth.linkIdentity()` is called
**Then** my anonymous session is upgraded to an authenticated account
**And** all FSRS review history from the anonymous session is transferred to my new account
**And** I am redirected to my personal library
**And** the anonymous session is invalidated

**Given** the `linkIdentity()` upgrade encounters a concurrent auth conflict
**When** the conflict is detected
**Then** it is resolved without data loss
**And** the event is logged via `log()` for investigation (spike mitigation from Story 1.2)

### Story 1.7: Team Invite Link Signup

As a person who received a team workspace invite email,
I want to sign up or log in using the invite link,
So that I can join the team workspace and access my assigned decks.

**Acceptance Criteria:**

**Given** I receive a team invite email with a unique invite link
**When** I click the link
**Then** I am directed to a signup/login page pre-populated with my work email

**Given** I am a new user and complete signup
**When** signup succeeds
**Then** my account is created with `tier = 'team_member'` and linked to the inviting workspace
**And** I am redirected to the workspace where any already-assigned decks are visible

**Given** I already have an account
**When** I click the invite link and log in
**Then** I am joined to the workspace automatically without re-signup

**Given** the invite link has expired or been revoked
**When** I click it
**Then** I see a clear error message explaining why the link is invalid and what to do next

### Story 1.8: User Login & Logout

As a registered user,
I want to log in to my account and log out when I am done,
So that I can securely access my personal data and end my session when needed.

**Acceptance Criteria:**

**Given** I am on the login page and submit valid credentials (email/password or Google)
**When** authentication succeeds
**Then** I am redirected to my personal library
**And** a JWT with refresh token rotation is issued (NFR-SEC3)

**Given** I submit incorrect credentials
**When** authentication fails
**Then** an error message is displayed that does not reveal whether the email or password is wrong

**Given** I am logged in and click "Log out"
**When** the action is confirmed
**Then** my session is invalidated server-side
**And** I am redirected to the homepage (cold start experience)
**And** the JWT cannot be used after logout

---

## Epic 2: Account Management & GDPR

Authenticated users can maintain their account security, update their profile, and fully exercise their GDPR rights.

### Story 2.1: Profile Information Update

As a registered user,
I want to update my display name and avatar,
So that my profile reflects my current identity.

**Acceptance Criteria:**

**Given** I am on my profile settings page
**When** I update my display name and save
**Then** the new name is reflected immediately across the app
**And** the update is persisted in the `profiles` table via the DAL

**Given** I upload a new avatar image
**When** the upload completes
**Then** the image is stored in Supabase Storage and linked to my profile
**And** my avatar is updated everywhere it appears

**Given** I submit a display name that exceeds the maximum length (50 characters)
**When** I try to save
**Then** a validation error is shown and no update is made
**And** the error is shown before any server call is made

### Story 2.2: Password Change

As a registered user with an email/password account,
I want to change my password,
So that I can maintain account security.

**Acceptance Criteria:**

**Given** I am on the security settings page
**When** I submit my correct current password and a new valid password (min 8 characters)
**Then** my password is updated via Supabase Auth
**And** all existing sessions except the current one are invalidated
**And** I see a success confirmation

**Given** I submit an incorrect current password
**When** I try to change my password
**Then** an error is displayed and no change is made

**Given** I am a Google OAuth user without a password set
**When** I visit the password change section
**Then** the password form is not shown, replaced with a message explaining that my account uses Google sign-in

### Story 2.3: Active Session View & Revocation

As a registered user,
I want to view all my active sessions and revoke individual ones,
So that I can detect and remove unauthorized access.

**Acceptance Criteria:**

**Given** I am on the security settings page
**When** I view the Active Sessions section
**Then** I see a list of all active sessions with: device/browser hint, last active time
**And** my current session is labeled "Current session"

**Given** I click "Revoke" on a non-current session
**When** the action is confirmed
**Then** that session is invalidated immediately and removed from the list
**And** the revoked session cannot be used to authenticate

**Given** I click "Revoke all other sessions"
**When** I confirm
**Then** all sessions except the current one are invalidated in one action

### Story 2.4: GDPR Personal Data Export

As a registered user,
I want to export all my personal data in a portable format,
So that I can exercise my GDPR right to data portability.

**Acceptance Criteria:**

**Given** I am on the privacy settings page
**When** I request a data export
**Then** a data export job is queued
**And** I receive an email acknowledgment within 5 minutes that the request is being processed

**Given** the export is generated
**When** it is ready (within 72 hours per NFR-GDPR2)
**Then** I receive an email with a time-limited download link (expires after 48 hours)
**And** the download contains: profile, decks, cards, FSRS review history, and Learning Fingerprint signals in JSON format
**And** no payment card data is included (held by Stripe only, NFR-SEC8)
**And** no AI prompt content or PII sent to Azure OpenAI is included (NFR-SEC6)

### Story 2.5: GDPR Personal Data Summary

As a registered user,
I want to request a human-readable summary of all data stored about me,
So that I understand what personal data the system holds.

**Acceptance Criteria:**

**Given** I am on the privacy settings page
**When** I request a data summary
**Then** the summary is displayed in-app (or delivered by email within 72 hours)
**And** it lists all data categories: profile fields, decks, cards, study history, Learning Fingerprint signals, subscription tier, and active sessions
**And** it explicitly states that payment card data is not stored by the app (managed by Stripe)

### Story 2.6: Account Deletion Request

As a registered user,
I want to request deletion of my account and all associated personal data,
So that I can exercise my GDPR right to erasure.

**Acceptance Criteria:**

**Given** I am on the privacy settings page
**When** I click "Delete account"
**Then** a confirmation dialog is shown explaining exactly what will be deleted

**Given** I type "DELETE" to confirm and submit
**When** the request is processed
**Then** my profile is soft-deleted immediately (`profiles.deleted_at` set)
**And** my decks and notes are soft-deleted
**And** my FSRS reviews are hard-deleted immediately
**And** I am logged out and cannot log back in
**And** a deletion confirmation email is sent immediately
**And** full data erasure completes within 30 days (NFR-GDPR1)

---

## Epic 3: Deck & Card Library

Users can build and organize a personal flashcard library — creating, editing, sharing, and browsing decks and cards.

### Story 3.1: Create a New Flashcard Deck

As an authenticated user,
I want to create a new flashcard deck with a title and subject,
So that I can start building a collection of cards for a specific learning topic.

**Acceptance Criteria:**

**Given** I am on my personal library page
**When** I click "Create deck"
**Then** a form appears with fields: Title (required, max 100 chars) and Subject (optional)

**Given** I submit a valid title
**When** the deck is created
**Then** the new deck appears in my library immediately
**And** the deck record is inserted via the DAL with my `userId` and default `tier` metadata
**And** I am redirected to the deck detail page

**Given** I submit without a title
**When** I try to create
**Then** a validation error is shown before any server call is made
**And** no deck is created

### Story 3.2: Add Cards to a Deck Manually

As an authenticated user,
I want to add flashcards to a deck with front and back text and an optional image,
So that I can build up my collection one card at a time.

**Acceptance Criteria:**

**Given** I am on the detail page of a deck I own
**When** I click "Add card"
**Then** a card creation form appears with: Front (required), Back (required), Image (optional)

**Given** I fill in Front and Back and submit
**When** the card is created
**Then** it appears in my card list immediately
**And** the card record is inserted via the DAL

**Given** I attach an image (under 5 MB)
**When** the card is saved
**Then** the image is stored in Supabase Storage and displayed on the card

**Given** I try to attach an image over 5 MB
**When** the file is selected
**Then** a validation error is shown before upload and no file is sent to storage

### Story 3.3: Edit and Delete Individual Cards

As an authenticated user,
I want to edit and delete individual cards in a deck I own,
So that I can keep my deck content accurate and up to date.

**Acceptance Criteria:**

**Given** I am viewing a card in a deck I own
**When** I click "Edit"
**Then** the card form is pre-filled with the current Front, Back, and image

**Given** I make changes and save
**When** the update is submitted
**Then** the card is updated via the DAL and the new content is shown immediately

**Given** I click "Delete" on a card
**When** I confirm the deletion
**Then** the card is hard-deleted
**And** the card count on the deck is decremented immediately

**Given** I attempt to edit a card in a deck I do not own
**When** the request reaches the server
**Then** it is rejected with a 403 (RLS enforced on the cards table)

### Story 3.4: Delete a Deck

As an authenticated user,
I want to delete a deck I own,
So that I can remove decks I no longer need from my library.

**Acceptance Criteria:**

**Given** I am on the detail page of a deck I own
**When** I click "Delete deck"
**Then** a confirmation dialog is shown

**Given** I confirm the deletion
**When** it is processed
**Then** the deck is soft-deleted (`decks.deleted_at` set) via the DAL
**And** it disappears from my library view immediately
**And** any shared invite links for this deck become invalid

**Given** the deck has active team assignments (from Epic 8)
**When** I try to delete it
**Then** I am warned that team assignments exist before the confirmation dialog proceeds

### Story 3.5: Personal Deck Library View

As an authenticated user,
I want to view all my decks in a personal library,
So that I can quickly find and navigate to any deck.

**Acceptance Criteria:**

**Given** I am a logged-in user with decks
**When** I navigate to my library
**Then** I see a paginated list of my non-deleted decks (cursor-based, 20 per page)
**And** each deck card shows: title, subject, card count, and last studied date

**Given** I have more than 20 decks
**When** I reach the end of the first page
**Then** the next page of decks loads via cursor pagination

**Given** I have no decks
**When** I visit my library
**Then** an empty state is shown with CTAs: "Create a deck" and "Generate with AI"

### Story 3.6: Share Deck via Invite Link

As an authenticated user,
I want to share a deck with others via an invite link,
So that people I share it with can study it (requiring them to authenticate first).

**Acceptance Criteria:**

**Given** I am on the detail page of a deck I own
**When** I click "Share"
**Then** a unique invite link is generated and displayed
**And** I can copy it to my clipboard with one click

**Given** a recipient clicks the invite link
**When** they are not authenticated
**Then** they are prompted to log in or sign up
**And** upon authentication, the deck is added to their accessible decks

**Given** the owner has deleted the deck
**When** a recipient tries to access via the invite link
**Then** they see a "This deck is no longer available" message

---

## Epic 4: Study Sessions & Spaced Repetition

Users can study any accessible deck with FSRS-6 scheduling, rate recall confidence, track their Depth Score, target weak cards, and have all session progress persisted automatically.

### Story 4.1: Start a Study Session

As an authenticated user,
I want to start a study session for any deck I have access to,
So that I can begin reviewing cards and building retention.

**Acceptance Criteria:**

**Given** I am on a deck detail page
**When** I click "Study"
**Then** a study session is initialized and the first card loads within 1 second (NFR-PERF4)
**And** cards with a FSRS due date ≤ today are prioritized
**And** new (unseen) cards are shown when no due cards remain

**Given** I have a deck with no due cards and no new cards
**When** I start a session
**Then** I am shown an informational message indicating all cards are scheduled for future dates
**And** I have the option to study all cards anyway (override mode)

### Story 4.2: FSRS-6 Card Scheduling

As a user in a study session,
I want the system to schedule my card reviews using the FSRS-6 algorithm,
So that cards are shown at the optimal interval for long-term retention.

**Acceptance Criteria:**

**Given** I am in an active study session and I rate a card
**When** the rating is submitted
**Then** the `scheduleCard()` wrapper in `src/server/fsrs/index.ts` is called with the card state, rating, and current timestamp
**And** the card's FSRS state (stability, difficulty, due date) is updated in the `reviews` table via the DAL
**And** the card is not shown again in the current session after being rated

**Given** I have cards with future due dates
**When** I start a new session the next day
**Then** only cards with a due date ≤ today are shown automatically

### Story 4.3: Recall Confidence Rating

As a user in a study session,
I want to rate my recall confidence after viewing each card's answer,
So that my self-assessment drives the FSRS-6 scheduling for that card.

**Acceptance Criteria:**

**Given** I flip a card to see the answer
**When** the answer is revealed
**Then** four rating buttons are shown: Again (1), Hard (2), Good (3), Easy (4)
**And** no score or judgment language is displayed — only the neutral action buttons (zero shame UX)

**Given** I tap a rating button
**When** the rating is recorded
**Then** the FSRS schedule is updated immediately via the DAL
**And** the next card is shown without delay
**And** the rating action is included in the structured session log

### Story 4.4: Depth Score Display

As an authenticated user,
I want to see my Depth Score for each deck,
So that I have a meaningful, cumulative measure of my retention quality for that topic.

**Acceptance Criteria:**

**Given** I am on a deck detail page
**When** I view the deck
**Then** my current Depth Score for that deck is displayed (0–100 scale)
**And** the score reflects the aggregate FSRS retrievability across all cards in the deck

**Given** I complete a study session
**When** the session is persisted
**Then** the Depth Score is recalculated and updated on the deck detail page

**Given** I have not yet studied any cards in the deck
**When** I view the deck
**Then** the Depth Score shows as 0 or "Not started"

### Story 4.5: Weak Card Isolation Study Mode

As an authenticated user,
I want to study only my weakest cards in a deck,
So that I can efficiently target knowledge gaps without reviewing cards I already know well.

**Acceptance Criteria:**

**Given** I am on the detail page of a deck I have studied
**When** I click "Study weak cards"
**Then** a study session is started containing only cards with FSRS retrievability below 0.70
**And** the session follows the standard study loop (Story 4.3)

**Given** all cards in the deck are above the weak threshold
**When** I click "Study weak cards"
**Then** I see a message: "All cards are in good shape — no weak cards to target"
**And** I can choose to start a normal session instead

### Story 4.6: Automatic Session Progress Persistence

As a user in a study session,
I want my session progress to be saved automatically when the session ends — or if I close the browser,
So that I never lose review data.

**Acceptance Criteria:**

**Given** I am in an active study session and close the browser or navigate away
**When** the `beforeunload` event fires
**Then** current session state is sent via `navigator.sendBeacon` (with `Blob` + `application/json`) to the partial save endpoint
**And** partial progress is persisted to the database before the browser closes (zero data loss, NFR-REL5)

**Given** I complete all cards in a session normally
**When** the last card is rated
**Then** session data is persisted to the database before the completion screen is shown
**And** the Depth Score is recalculated
**And** a session summary screen is displayed with cards reviewed and time spent

---

## Epic 5: AI-Powered Card Generation

Users can instantly generate decks from a topic prompt or cards from pasted text, with full review control and enforced usage limits.

### Story 5.1: AI Deck Generation from Topic Prompt

As an authenticated user,
I want to generate a full flashcard deck from a topic prompt using AI,
So that I can create a complete study deck in seconds without manual effort.

**Acceptance Criteria:**

**Given** I click "Generate deck with AI" from my library
**When** the flow starts
**Then** I am first prompted to specify my learning goal and personal context (FR35)
**And** then prompted to enter a topic or prompt

**Given** I submit a topic
**When** the AI request is made
**Then** user input is sanitized before passing to the LLM (FR34, NFR-SEC6)
**And** no PII is included in the prompt
**And** the request is routed via `src/server/ai/index.ts` to the appropriate Azure OpenAI deployment
**And** up to 20 generated cards are returned within 15 seconds (NFR-PERF3)
**And** I am taken to the review screen (Story 5.3)

**Given** Azure OpenAI times out after 10 seconds
**When** a retry also fails
**Then** the fallback model (`gpt-4o`) is attempted automatically (NFR-INT1)
**And** if both fail, the user is shown a clear error message with a retry option

### Story 5.2: AI Card Generation from Pasted Text

As an authenticated user,
I want to generate flashcards from a block of pasted text,
So that I can turn notes, articles, or study material into cards instantly.

**Acceptance Criteria:**

**Given** I am on a deck detail page and click "Generate from text"
**When** the dialog opens
**Then** a text area is shown for pasting content

**Given** I paste content and submit
**When** the AI request is made
**Then** the text is sanitized before being sent to the LLM (FR34)
**And** cards are generated and returned for review within 5 seconds for up to 5 cards (NFR-PERF3)
**And** I am taken to the review screen (Story 5.3)

**Given** I submit empty or whitespace-only text
**When** I try to generate
**Then** a validation error is shown before any AI call is made

### Story 5.3: Review, Edit & Delete AI-Generated Cards Before Saving

As an authenticated user,
I want to review, edit, and delete AI-generated cards before they are added to my deck,
So that I have full control over the quality of my deck content.

**Acceptance Criteria:**

**Given** AI generation has completed
**When** the review screen is shown
**Then** all generated cards are listed with their Front and Back visible
**And** I can edit any card's Front or Back inline
**And** I can delete any card I don't want

**Given** I click "Save to deck"
**When** the action is confirmed
**Then** only the cards I kept (not deleted) are added to the deck via the DAL
**And** the review screen is dismissed and I am returned to the deck detail page

**Given** I delete all generated cards and click "Save"
**When** save is attempted
**Then** a validation message informs me there are no cards to save
**And** I can either add more content or cancel

### Story 5.4: Free-Tier AI Usage Limits & Admin Spend-Approval Gate

As a free-tier user,
I want to understand my monthly AI generation limit and see a clear upgrade prompt when I've reached it,
So that I know what I get for free and how to unlock more.

**Acceptance Criteria:**

**Given** I am a free-tier user who has not reached the monthly limit
**When** I use AI generation
**Then** my usage count is decremented in the database via the DAL

**Given** I have reached the monthly AI generation limit
**When** I try to generate
**Then** the AI generation UI shows a soft paywall with an upgrade CTA
**And** no request is made to Azure OpenAI (zero cost incurred)

**Given** the admin AI spend-approval flag is disabled (FR33, FR50)
**When** any free-tier user tries to use AI generation
**Then** the feature is blocked regardless of their remaining usage count
**And** a user-facing message explains the feature is temporarily unavailable

**Given** I am a Pro or Team subscriber
**When** I use AI generation
**Then** no usage limit is applied

---

## Epic 6: Adaptive Learning Engine

The app silently builds a Learning Fingerprint and uses it to adapt card presentation for each user.

### Story 6.1: Learning Fingerprint Data Model & Silent Signal Collection

As a user studying any deck,
I want the system to silently record behavioral signals from my study sessions,
So that my Learning Fingerprint builds over time without any action from me.

**Acceptance Criteria:**

**Given** I am in an active study session and complete a card rating
**When** the rating is recorded
**Then** the system also stores: card ID, rating value, response time (ms from card show to flip), card format shown, and timestamp — in the `learning_fingerprint_events` table via the DAL
**And** no PII is included in any fingerprint record (NFR-SEC6)
**And** no fingerprint data is visible in the study UI (silent collection)

**Given** I have fewer than 10 rated events in my fingerprint
**When** the fingerprint is queried
**Then** a default/baseline fingerprint is returned
**And** the default card format (text front/back) is used for presentation

### Story 6.2: Shapeshifter Cards — Adaptive Format Presentation

As a user who has built sufficient study history,
I want the app to present each card in the format best suited to how I learn,
So that my study experience adapts to maximize my retention.

**Acceptance Criteria:**

**Given** I have >= 10 rated events in my Learning Fingerprint
**When** I start a study session
**Then** each card's presentation format is selected by the Learning Fingerprint engine (text, image-first, or narrative/contextual)
**And** the format selection is not visible to me — I see only the card content

**Given** my fingerprint shows consistently higher ratings on narrative-format cards than text-only
**When** my fingerprint is updated after a session
**Then** narrative format is weighted more heavily in subsequent format selection

**Given** I have a default/cold fingerprint
**When** cards are presented
**Then** the default text format is used for all cards

### Story 6.3: Hesitation Time Signal & Automatic Deep Review Scheduling

As a user studying cards,
I want the system to detect when I hesitate unusually long on a card I've nominally mastered,
So that silent knowledge gaps are caught and scheduled for deeper review automatically.

**Acceptance Criteria:**

**Given** I am in an active study session
**When** a card is shown
**Then** the system begins measuring hesitation time from card display to the flip action

**Given** the hesitation time is recorded
**When** the session ends
**Then** the hesitation value is stored as a Learning Fingerprint signal via the DAL

**Given** I have previously mastered a card (high FSRS stability) but my hesitation on it is > 2× my personal median hesitation time
**When** the session data is processed
**Then** the card's FSRS due date is adjusted to an earlier date (flagged for deeper review)
**And** this scheduling override is logged for fingerprint analysis

---

## Epic 7: Subscriptions & Billing

Users can upgrade tiers via Stripe, manage billing, cancel anytime, with automatic access enforcement.

### Story 7.1: Subscription Tier, Usage Limits & Billing History View

As a registered user,
I want to view my current subscription tier, remaining AI credits, and billing history,
So that I understand my access level and can track my spending.

**Acceptance Criteria:**

**Given** I am on my account / billing settings page
**When** I view the Subscription section
**Then** I see my current tier: Free, Pro, or Team
**And** if Free: my remaining AI generation credits for the current month
**And** if Pro or Team: a message that AI generation is unlimited
**And** a list of past invoices with date, amount, and status (from Stripe API)

**Given** I am on Free tier with 0 credits remaining
**When** I view the subscription section
**Then** an upgrade CTA is prominently displayed

### Story 7.2: Free → Pro Upgrade via Stripe Checkout

As a free-tier user,
I want to upgrade to Pro via a Stripe checkout flow,
So that I can unlock unlimited AI generation and other Pro features.

**Acceptance Criteria:**

**Given** I click "Upgrade to Pro"
**When** I am redirected to Stripe Checkout
**Then** Stripe handles all payment card data (PCI DSS delegated, NFR-SEC8)
**And** no card data passes through or is stored by the app

**Given** my payment succeeds
**When** Stripe sends a checkout webhook
**Then** the webhook signature is validated (NFR-INT2)
**And** the webhook handler checks the `processed_webhook_events` table before processing (idempotency, ARCH12)
**And** `profiles.tier` is updated to `'pro'` via the DAL (ARCH13)
**And** I am redirected to the app with Pro features immediately accessible

**Given** the payment fails
**When** Stripe reports the failure
**Then** I see a clear failure message with an option to retry

### Story 7.3: Team Subscription Purchase & Management

As a user wanting to create a team workspace,
I want to purchase a Team subscription via Stripe and manage seats,
So that my team can access the platform under my billing account.

**Acceptance Criteria:**

**Given** I click "Upgrade to Team"
**When** the Stripe Checkout for the Team plan completes
**Then** my `profiles.tier` is updated to `'team_admin'` via the DAL (webhook-driven)
**And** a Team management section appears in my account

**Given** a team member is removed from my workspace
**When** the removal is confirmed
**Then** their `profiles.tier` is downgraded to `'free'` and Pro/Team features are revoked immediately

### Story 7.4: Subscription Cancellation

As a paying subscriber,
I want to cancel my subscription at any time,
So that I have control over my billing with no lock-in.

**Acceptance Criteria:**

**Given** I am a Pro subscriber and click "Cancel subscription"
**When** I am redirected to the Stripe Customer Portal
**Then** I can cancel self-service in Stripe

**Given** I confirm cancellation in the Stripe Portal
**When** Stripe sends the cancellation webhook
**Then** the webhook is idempotently processed
**And** `profiles.tier` remains `'pro'` until the end of the current billing period
**And** when the billing period ends, `profiles.tier` is automatically downgraded to `'free'` by the next webhook event

### Story 7.5: Automatic Feature Access Enforcement by Tier

As a user of the app,
I want feature access to be automatically granted or revoked based on my subscription tier,
So that the system enforces subscription rules without manual intervention.

**Acceptance Criteria:**

**Given** I am a Free user and try to access a Pro-only feature
**When** the UI renders the gated area
**Then** a soft paywall / upgrade CTA is shown — not a hard error
**And** the Pro feature is not accessible

**Given** my subscription is upgraded to Pro (via Stripe webhook updating `profiles.tier`)
**When** I load the next page
**Then** all Pro features are accessible immediately — no app restart required

**Given** my subscription lapses (Stripe webhook: subscription ended)
**When** the webhook is processed
**Then** `profiles.tier` is reverted to `'free'` and Pro features are blocked on next page load

---

## Epic 8: Team Workspaces

Team admins can create workspaces, invite members, assign decks, monitor progress, and send reminders.

### Story 8.1: Create Team Workspace

As a Team subscriber,
I want to create a named team workspace,
So that I can organize my team's learning under a shared space.

**Acceptance Criteria:**

**Given** I have `tier = 'team_admin'`
**When** I click "Create workspace" and submit a workspace name (required, max 100 chars)
**Then** a workspace record is created with me as admin via the DAL
**And** I am redirected to the workspace management page

**Given** I am on a Free or Pro tier
**When** I visit the create workspace page
**Then** I am shown an upgrade CTA explaining the Team subscription requirement

### Story 8.2: Invite Team Members by Email

As a team admin,
I want to invite members by entering a list of email addresses,
So that I can onboard my team to the workspace quickly.

**Acceptance Criteria:**

**Given** I am on the workspace management page
**When** I paste a list of email addresses and click "Send invites"
**Then** each email is validated for format before sending (FR44)
**And** invalid emails are flagged inline for correction before any sends occur
**And** the invite send is rate-limited via Vercel KV + Upstash (FR52)

**Given** all emails are valid and I confirm
**When** the invites are sent
**Then** each invitation is stored in the `pending_invites` table with an expiry timestamp (7 days)
**And** invitation emails are sent via Resend within 60 seconds (NFR-INT4)

### Story 8.3: Email Invitation Delivery & Join Flow

As a person invited to a team workspace,
I want to receive an invitation email and join via the link,
So that the onboarding process is seamless.

**Acceptance Criteria:**

**Given** I receive a team invitation email
**When** I click the join link
**Then** I am directed to a signup/login page pre-populated with my email

**Given** I am a new user and complete signup
**When** the account is created
**Then** I am added to the workspace with `tier = 'team_member'`
**And** I am redirected to the workspace

**Given** the invite link has expired (> 7 days)
**When** I click it
**Then** I see a clear expiry message and an option to request a new invitation

**Given** the team admin has revoked the invite
**When** I click the link
**Then** I see a "This invitation is no longer valid" message

### Story 8.4: Assign Deck to Team Members

As a team admin,
I want to assign a deck to all or selected team members,
So that I can push specific learning material to my team.

**Acceptance Criteria:**

**Given** I am on the workspace management page
**When** I click "Assign deck"
**Then** I can select any deck I own from a list
**And** I can choose: All members, or select specific members from a checklist

**Given** I confirm the assignment
**When** it is saved
**Then** a `team_deck_assignments` record is created via the DAL for each selected member
**And** the deck appears in the assigned decks list for those members
**And** a `deck_assigned` event is tracked (FR58)

### Story 8.5: Team Member Assigned Deck View & Study

As a team member,
I want to see and study all decks assigned to me,
So that I can complete the learning tasks set by my team admin.

**Acceptance Criteria:**

**Given** I am a team member with assigned decks
**When** I navigate to my library
**Then** I see an "Assigned by team" section with all decks assigned to me

**Given** I click on an assigned deck
**When** the deck opens
**Then** I can study it using the full study session interface (Epic 4)
**And** FSRS scheduling applies to my individual review history
**And** my progress is tracked against my personal account

### Story 8.6: Aggregate Study Progress Dashboard

As a team admin,
I want to view aggregate study progress per assigned deck,
So that I can understand how well my team is learning the material.

**Acceptance Criteria:**

**Given** I am on the workspace management page and view the Progress tab
**When** the page loads
**Then** I see each assigned deck with: completion rate (% of assigned members who have studied at least one card), average Depth Score across all assigned members, and a per-member status list

**Given** no members have studied a deck yet
**When** I view its progress row
**Then** completion rate shows 0% and average Depth Score shows "—"

### Story 8.7: Send Study Reminder to Inactive Members

As a team admin,
I want to send a reminder to members who have not started an assigned deck,
So that I can prompt them to begin studying without doing it manually for each person.

**Acceptance Criteria:**

**Given** I am on the workspace progress view
**When** I click "Send reminder" for an assigned deck
**Then** I see a pre-selected list of members who have not started the deck
**And** I can adjust the selection before sending

**Given** I click "Send"
**When** reminders are dispatched
**Then** a reminder email is sent to each selected member via Resend
**And** I receive a confirmation showing how many reminders were sent
**And** the reminder action is rate-limited: one reminder per member per deck per 24 hours

---

## Epic 9: Admin, Observability & Analytics

Admins have full visibility into system health, error logs, product metrics, and operational controls, with WCAG 2.1 AA on all core screens.

### Story 9.1: Structured Event & Error Logging Infrastructure

As the system,
I want all product events and errors logged in structured JSON format from the start,
So that all observability, analytics, and alerting capabilities rest on a reliable foundation.

**Acceptance Criteria:**

**Given** any tracked product event fires (cold_start_viewed, signup_completed, deck_created, ai_generation_used, session_started, session_completed, paywall_hit, upgrade_completed, team_created, deck_assigned)
**When** the event occurs
**Then** it is logged via `log()` in `src/lib/logger.ts` as structured JSON
**And** the entry includes: `event_type`, `user_id` (if authenticated), `timestamp`, and event-specific metadata
**And** no PII is included in any log entry (NFR-SEC6)

**Given** a critical event occurs (payment failure, auth failure)
**When** it fires
**Then** Sentry captures it and an alert triggers within 5 minutes (NFR-REL3, ARCH8)
**And** structured logs are retained for a minimum of 30 days (NFR-REL2)

### Story 9.2: Admin Error Log Access & System Health View

As an admin,
I want to access error logs and view system health indicators,
So that I can investigate and debug production issues quickly.

**Acceptance Criteria:**

**Given** I am an admin user on the admin dashboard
**When** I navigate to the Error Logs section
**Then** I see a list of recent errors with: type, severity, timestamp, and occurrence count
**And** errors are grouped and deduplicated to surface patterns (FR57)

**Given** I click into an error group
**When** the detail view opens
**Then** I see the full structured log entry and list of individual occurrences

**Given** I view the System Health panel
**When** the page loads
**Then** I see: uptime status, error rate (last 24h), Sentry alert count, and recent critical events

### Story 9.3: Error Log Query, Filter & Export

As an admin,
I want to filter error logs by type, time range, and severity, and export the results,
So that I can perform targeted investigations and share findings.

**Acceptance Criteria:**

**Given** I am on the admin Error Logs page
**When** I apply filters (error type, time range, severity)
**Then** the log list updates to show only matching entries

**Given** I click "Export"
**When** the export is generated
**Then** a JSON or CSV file containing all filtered entries is downloaded

**Given** no logs match the active filters
**When** I view the results
**Then** an empty state with a "No results" message is shown

### Story 9.4: Error Grouping & Deduplication

As an admin,
I want recurring errors to be grouped and deduplicated,
So that I see patterns rather than a flood of identical entries.

**Acceptance Criteria:**

**Given** the same error type fires 50 times within an hour
**When** I view the error log
**Then** it appears as a single grouped entry with an occurrence count and first/last seen timestamps
**And** I can expand it to view individual occurrences if needed
**And** Sentry's built-in grouping is used as the primary deduplication mechanism (ARCH8)

### Story 9.5: Product Event Tracking

As an admin,
I want key funnel and engagement events to be tracked reliably,
So that business metrics and funnel analytics can be derived from them.

**Acceptance Criteria:**

**Given** any tracked event fires: `cold_start_viewed`, `signup_completed`, `deck_created`, `ai_generation_used`, `session_started`, `session_completed`, `paywall_hit`, `upgrade_completed`, `team_created`, `deck_assigned`
**When** the event fires
**Then** it is persisted to the `analytics_events` table (or equivalent logging sink) via the DAL
**And** the record includes: `event_name`, `user_id`, `timestamp`, and event-specific metadata

**Given** I am on the admin analytics dashboard
**When** I view the Events section
**Then** recent events appear within 5 minutes of occurring

### Story 9.6: Business Metrics Dashboard

As an admin,
I want a business metrics dashboard with active users, retention cohorts, conversion rate, and MRR,
So that I can track the health and growth of the product at a glance.

**Acceptance Criteria:**

**Given** I am on the admin analytics dashboard
**When** I view the Business Metrics section
**Then** I see: DAU, WAU, MAU with a 30-day trend chart
**And** D1 / D7 / D30 retention cohort data
**And** freemium-to-paid conversion rate (last 30 days)
**And** MRR (calculated from `profiles.tier` counts × plan pricing or from Stripe data)
**And** all metrics are refreshed at least daily

### Story 9.7: Funnel Analytics — Cold Start to Upgrade

As an admin,
I want to view the user conversion funnel from cold start through to upgrade,
So that I can identify and address drop-off points in the user journey.

**Acceptance Criteria:**

**Given** I am on the admin analytics dashboard
**When** I view the Funnel section
**Then** I see step-by-step drop-off rates: Cold Start Viewed → Signup Completed → First Deck Created → First Study Session Completed → Upgrade Completed
**And** each step shows absolute counts and the conversion rate from the previous step

**Given** I select a date range filter (last 7 / 30 / 90 days)
**When** the filter is applied
**Then** the funnel updates to show data for the selected period only

### Story 9.8: AI Usage Metrics Dashboard

As an admin,
I want to view AI usage metrics including daily generation volume, free vs paid split, and cost estimate,
So that I can monitor AI spend and make informed decisions about free-tier limits.

**Acceptance Criteria:**

**Given** I am on the admin analytics dashboard
**When** I view the AI Usage section
**Then** I see: AI generations per day (line chart, last 30 days), free vs paid split of generations (bar or pie chart), and an estimated daily cost (token counts × model pricing)

**Given** estimated daily AI cost exceeds a configurable threshold
**When** the dashboard loads
**Then** an alert badge or banner is shown on the AI Usage section

### Story 9.9: Admin Role Simulation & AI Spend Flag Control

As an admin,
I want to simulate any subscription tier on my own account and toggle the global AI free-tier spend-approval flag,
So that I can test gated features without real payment and control AI cost exposure without a code deploy.

**Acceptance Criteria:**

**Given** I am an admin on the admin dashboard
**When** I use the "Simulate role" control
**Then** I can select: Free, Pro, Team Member, or Team Admin
**And** my session behaves as if I have that tier (UI gates and feature access match the simulated tier)
**And** the simulated role is clearly labeled in the UI so I cannot confuse it with my real tier
**And** the simulation does not modify my `profiles.tier` record — it applies to the current session only (FR10)

**Given** I toggle the "AI Free-Tier Enabled" flag to OFF
**When** any free-tier user tries to use AI generation
**Then** the feature is blocked with an "unavailable" message — no code deployment required (FR50)
**And** toggling it back ON immediately re-enables AI for free-tier users
