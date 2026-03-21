---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-02b-vision
  - step-02c-executive-summary
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-06-innovation
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
  - step-12-complete
inputDocuments:
  - _bmad-output/A-Product-Brief/project-brief.md
  - _bmad-output/planning-artifacts/research/technical-flashcards-saas-stack-research-2026-03-20.md
  - _bmad-output/brainstorming/brainstorming-session-2026-03-20-0900.md
briefCount: 1
researchCount: 1
brainstormingCount: 1
projectDocsCount: 0
workflowType: 'prd'
classification:
  projectType: consumer_saas_web_app
  domain: edtech
  complexity: medium
  projectContext: greenfield
---

# Product Requirements Document - Flashcards

**Author:** Jani
**Date:** 2026-03-20

## Executive Summary

Flashcards is a freemium consumer SaaS learning platform that fundamentally upgrades how individuals learn — not by digitizing existing flashcard paradigms, but by leveraging AI to make knowledge acquisition effortless and measurably effective. The platform targets individual learners across language learning, test preparation, and professional development, with secondary B2B potential for team onboarding and educator use cases.

The core problem: dominant flashcard apps (Anki, Quizlet) are testing tools with a learning narrative painted on. They rely on a single memory consolidation mechanism — spaced repetition — while ignoring four others proven by cognitive science: emotion, novelty, storytelling, and sensory context. The result is apps that feel like chores, create performance anxiety through streaks and visible scores, and produce mediocre retention compared to what's possible.

Flashcards closes this gap by building an AI-native platform where the product improves the longer it's used — creating a compounding, user-specific advantage that's difficult for competitors to replicate.

### What Makes This Special

Two "aha" moments define the user experience:

1. **Frictionless creation:** Users are surprised by how fast they can build a deck — AI handles the heavy lifting of content generation, formatting, and structuring. The barrier to entry is near-zero.
2. **Proven retention:** Users notice they're actually remembering things. Not going through motions — genuinely retaining. This is the moment the product earns loyalty.

The engine behind both is the **Learning Fingerprint** — a silent AI profile that models how each individual uniquely learns and continuously adapts the entire experience. Card formats shapeshift to match learning style. Content is delivered through narrative and emotion rather than rote repetition. Scheduling uses FSRS-6 (state-of-the-art spaced repetition) as the baseline, enhanced by the AI layer.

Business model differentiators reinforce the product vision: a **reverse paywall** lets users experience AI features before hitting a subscription decision, driving conversion through demonstrated value rather than feature-gating. **Anti-streak mechanics** replace daily logging pressure with a Depth Score that rewards meaningful learning. A **cold start deck** delivers the core experience before signup, eliminating onboarding friction.

Why now: LLM capabilities have crossed a threshold where personalization at this depth is buildable by a solo developer. The timing creates a window before well-resourced competitors adapt.

## Project Classification

- **Project Type:** Consumer SaaS Web App (freemium, individual learners primary / B2B secondary)
- **Domain:** EdTech
- **Complexity:** Medium (AI/ML components, standard SaaS concerns — auth, payments, data privacy; no heavy regulatory requirements)
- **Project Context:** Greenfield
- **Platform:** Web-first (desktop + mobile responsive); native mobile potential later
- **Infrastructure:** $0/month at launch via free tiers (Supabase, Vercel) + Azure OpenAI

## Success Criteria

### User Success

| Metric | Target | Rationale |
|--------|--------|-----------|
| Day-1 retention | ≥ 40% | Users who return within 24h of signup |
| Day-7 retention | ≥ 20% | Benchmark for healthy consumer EdTech |
| Day-30 retention | ≥ 10% | Indicates habit formation |
| Session completion rate | ≥ 70% | Users who start a study session finish it |
| NPS | ≥ 40 | "Good" SaaS benchmark; Duolingo ~50 |
| Time to first deck created | < 3 min | Validates frictionless creation aha moment |
| Time to first AI-generated card | < 60 sec | Validates AI value delivery speed |

### Business Success

| Milestone | Target |
|-----------|--------|
| Month 3 | 500 active users, 15–25 paid subscribers |
| Month 12 | 2,000 active users, 5% freemium-to-paid conversion (~100 paid) |
| MRR at Month 12 | ~$500–$1,000 (validates product-market fit signal) |
| Infra scale trigger | Upgrade Supabase/Vercel when MRR > $200/mo |
| Virality | ≥ 0.3 viral coefficient via deck sharing / Learning Wrapped |

### Technical Success

| Metric | Target |
|--------|--------|
| Page load (LCP) | < 2s on 4G |
| AI card generation | < 5s end-to-end |
| API response (p95) | < 500ms |
| Uptime | ≥ 99.5% |
| Core Web Vitals | All green (Vercel Analytics) |

### Measurable Outcomes

- Users self-report improved retention within first 2 weeks of use
- Freemium users who experience AI features convert at ≥ 2× the rate of those who don't (validates reverse paywall mechanic)
- Returning users average ≥ 3 sessions/week in first month (indicates habit formation)
- B2B teams share ≥ 2 decks within first week of onboarding (validates collaboration value)

## User Journeys

### Journey 1: Sofia — The Language Learner (Primary, Success Path)

Sofia is a 28-year-old UX designer in Helsinki learning Spanish for a trip to Buenos Aires in 4 months. She tried Duolingo but felt like she was playing a game, not learning. She tried Anki but abandoned it after 2 hours of setup. She has 10–15 minutes a day, usually on her commute.

**Opening Scene:** Sofia finds Flashcards via a shared deck link from a friend. She opens it on her phone — no signup prompt, no onboarding tutorial. She sees a Spanish vocabulary deck and immediately starts studying. The cards adapt in format after a few swipes — some show images, one asks her to recall a phrase in context. She finishes the deck in 8 minutes.

**Rising Action:** She signs up (one click, Google auth). Her Learning Fingerprint has already started building from her cold start session. She asks the AI to generate a deck from "restaurant phrases for Argentina" — 20 cards appear in under 5 seconds. She edits two, deletes one. Her first AI-generated deck is live in under 3 minutes.

**Climax:** Two weeks later, at a coffee shop in real life, she uses a phrase she learned in the app and it works. The app's Depth Score shows she's retained 73% of her Spanish deck. She shares her progress card to Instagram.

**Resolution:** Sofia is a retained user. She's building her third deck. She upgrades to Pro when she hits the AI generation limit — the value was already proven before she saw a paywall.

**Capabilities revealed:** Cold start deck, FSRS-6 scheduling, AI card generation, Learning Fingerprint data collection, Shapeshifter Cards, Depth Score, social sharing, Google auth, Stripe upgrade flow.

---

### Journey 2: Marcus — The Frustrated Quitter (Edge Case, Recovery Path)

Marcus signed up 3 weeks ago, built a deck for his AWS certification, studied for 4 days, then stopped. Life got busy. He feels guilty opening the app.

**Opening Scene:** Marcus gets a nudge — not a streak-shame notification, but a "You've got 12 cards ready to review — takes about 6 minutes." No guilt trip. He opens the app.

**Rising Action:** The review session is shorter than expected. The Depth Score shows he hasn't lost much — the FSRS-6 algorithm accounted for his break. He finishes the session, adds 3 new cards using AI generation from a paste of AWS documentation.

**Climax:** He realizes the app didn't punish him for disappearing. No broken streak. His progress is still there. He books a study session for the next morning.

**Resolution:** Marcus re-engages. His retention is measurably better than his previous tool. He invites a colleague to study the same deck.

**Capabilities revealed:** Re-engagement notifications (no shame framing), FSRS-6 gap-tolerant scheduling, Depth Score (no streak mechanics), AI card generation from pasted text, deck sharing/invite.

---

### Journey 3: Priya — The Team Admin (B2B, Corporate Onboarding)

Priya is an HR manager at a 40-person SaaS company. New employees need to learn internal tools, processes, and compliance basics. Currently this is done via a 60-page PDF nobody reads.

**Opening Scene:** Priya logs into Flashcards, creates a new team workspace, and pastes in a list of 12 new hire emails. The system validates all emails, flags one as invalid (typo), lets her correct it. All 12 receive invites.

**Rising Action:** Priya builds a "Company Onboarding — Week 1" deck using AI generation from a paste of the PDF text. 35 cards generated in under 30 seconds. She reviews, edits 4, removes 2. She assigns the deck to all 12 team members.

**Climax:** By day 3, she can see aggregate progress — 9 of 12 have completed the deck, average retention 81%. Two haven't started; she sends them a reminder from within the app.

**Resolution:** New hire onboarding time drops. Priya creates a second deck for tool-specific training. She renews the team subscription at month end.

**Capabilities revealed:** Team workspace creation, email list invite with validation, deck assignment to team, team progress view, reminder nudge, AI generation from pasted content, B2B subscription.

---

### Journey 4: James — The New Team Member (B2B, Learner Side)

James just joined Priya's company. Day 1, he gets an email: "Your onboarding materials are ready on Flashcards."

**Opening Scene:** James clicks the link, signs up with his work email, and immediately sees his assigned deck — no searching, no setup. He starts studying.

**Rising Action:** The app feels nothing like the dry PDFs he expected. Cards are concise, some have visuals, the flow is quick. He finishes 20 cards in 9 minutes. The Depth Score shows 68% retention — he knows which concepts need reinforcement.

**Resolution:** James studies the weak cards again before his Day 2 standup. He actually remembers the company's key processes by week 2. He tells Priya the app is "way better than the old way."

**Capabilities revealed:** Invite-based signup, pre-assigned deck view, study session, Depth Score, weak card reinforcement loop.

---

### Journey Requirements Summary

| Capability | Journeys |
|---|---|
| Cold start (no-auth) deck | 1, 2 |
| Google / email auth | 1, 2, 3, 4 |
| AI card generation (text paste, topic prompt) | 1, 2, 3 |
| FSRS-6 spaced repetition scheduling | 1, 2 |
| Learning Fingerprint data collection | 1 |
| Shapeshifter Cards (adaptive format) | 1 |
| Depth Score (no streaks) | 1, 2, 4 |
| Re-engagement notifications (shame-free) | 2 |
| Deck sharing / invite by link | 2 |
| Team workspace + email list invite w/ validation | 3 |
| Deck assignment to team members | 3, 4 |
| Team progress view + reminders | 3 |
| B2B subscription (Stripe) | 3 |
| Invite-based signup flow | 4 |
| Stripe freemium → Pro upgrade | 1 |

## Domain-Specific Requirements

### Compliance & Regulatory

- **GDPR (MVP):** Full compliance from day 1. Required: cookie consent banner, privacy policy, terms of service, right to data deletion (account + study data), data processing records. Supabase (EU region) as data processor satisfies data residency requirements.
- **No COPPA/FERPA:** Platform targets adult learners; no K-12 or institutional student data handling.
- **No age restriction:** Platform open to all ages; standard ToS acceptance on signup suffices.

### Accessibility

- **Target:** WCAG 2.1 AA on all core user-facing screens. See Non-Functional Requirements → Accessibility for full detail.

### Content & Data

- **Deck sharing:** Invite-only (no public deck discovery at MVP). Eliminates content moderation risk for launch — no need for reporting, flagging, or review workflows at this stage.
- **User-generated content:** Deck text and images stored in Supabase Storage; no public indexing.
- **Data retention:** User data retained until account deletion; study history and Learning Fingerprint data deleted on request within 30 days (GDPR compliance).

### Technical Constraints

- **Data residency:** Supabase project hosted in EU region (Frankfurt).
- **AI data handling:** Card content sent to Azure OpenAI for generation — confirm Azure OpenAI EU data boundary compliance; no PII should be included in AI prompts.
- **Session security:** HTTPS only, secure cookie handling, Supabase RLS (Row Level Security) enforced on all tables.

### Risk Mitigations

| Risk | Mitigation |
|---|---|
| GDPR non-compliance at launch | Implement consent + deletion flows as MVP requirement, not afterthought |
| AI prompt data leakage | Strip PII from prompts; no user names/emails passed to Azure OpenAI |
| Invite list abuse (bulk spam) | Validate email format + domain; rate-limit team invite sends |
| Accessibility gaps blocking B2B | WCAG 2.1 AA audit on core flows before launch |

## Innovation & Novel Patterns

### Detected Innovation Areas

**1. Multi-Mechanism Memory Architecture**
Every competing flashcard app (Anki, Quizlet, Brainscape) uses spaced repetition as its sole memory consolidation mechanism. Flashcards is the first to systematically layer four additional mechanisms — emotion, novelty, storytelling, and sensory context — into the card delivery experience via AI. This is a categorical improvement, not an incremental one.

**2. Learning Fingerprint — Compounding Personalization**
Rather than generic adaptive learning (common in EdTech), the Learning Fingerprint builds a per-user model that improves with every interaction. The longer a user stays, the more personalized their experience — creating a switching cost that grows over time. This makes the product inherently stickier than alternatives and difficult to replicate without the same training data.

**3. Reverse Paywall**
Standard SaaS gates premium features behind a paywall. Flashcards inverts this: AI features are experienced *before* the paywall, with conversion triggered by demonstrated value. This is well-established in gaming (free-to-play) but rare in EdTech SaaS. Combined with the cold start deck (no signup required), this removes every barrier before the moment of delight.

**4. Anti-Streak Mechanics (Depth Score)**
Directly challenges Duolingo's dominant streak paradigm — which research suggests drives daily logging anxiety rather than genuine learning. Depth Score rewards quality of retention over frequency of login, appealing to users burned out by streak-based apps. This is a differentiated positioning statement as much as a feature.

**5. AI-Native Solo-Dev SaaS**
The combination of FSRS-6 + LLM personalization + multi-modal cards is technically achievable by one developer today in a way that was impossible 3 years ago. This is a timing innovation — the product exists at a specific window where AI capability meets solo-dev tooling maturity.

### Market Context & Competitive Landscape

- **Anki:** Open-source, powerful, user base of millions — but notoriously complex UX. No AI layer. Community-driven deck ecosystem.
- **Quizlet:** Consumer-friendly, largest user base (~500M users) — but built on testing paradigm. AI features shallow and generic. Streak-based.
- **Brainscape:** Confidence-based repetition. No AI. Limited mobile UX.
- **Duolingo:** Gamification-first, massive marketing budget. Language-only. Streak addiction baked into core loop.
- **Gap:** None of the above use multiple memory consolidation mechanisms or build a per-user learning model. The market is large, mature, and ripe for disruption from the AI layer.

### Validation Approach

| Innovation | Validation Signal | Timeline |
|---|---|---|
| Multi-mechanism memory | D-30 retention significantly above industry benchmark (10%) | Month 2–3 |
| Learning Fingerprint effectiveness | Users who have 20+ sessions retain more than users with <5 | Month 3–6 |
| Reverse paywall conversion | AI-exposed freemium converts at ≥ 2× non-AI-exposed | Month 2 |
| Anti-streak appeal | NPS qualitative: users cite "no guilt" as key reason they stayed | Month 2–3 |

### Risk Mitigation

| Risk | Mitigation |
|---|---|
| Learning Fingerprint underdelivers early (cold start data thin) | Default to FSRS-6 baseline; fingerprint enriches gradually — users don't notice a gap |
| AI generation quality inconsistent | Human review step in deck creation; user can edit/delete before saving |
| Reverse paywall cannibalizes conversion | A/B test paywall placement; monitor conversion rate vs. AI usage depth |
| Anti-streak positioning alienates streak-lovers | Opt-in streak for users who want it (post-MVP) |

## Consumer SaaS Web App — Specific Requirements

### Project-Type Overview

A web-first SaaS application serving two account contexts: individual consumer accounts and team workspaces. Both contexts share the same core learning engine (FSRS-6, Learning Fingerprint, AI generation) with team-specific layers for workspace management, member administration, and deck assignment. Built as a responsive SPA (Next.js App Router), deployable to Vercel.

### Multi-Tenancy Model

- **Individual accounts:** Single-tenant by default. Each user owns their decks, study data, and Learning Fingerprint.
- **Team workspaces:** Lightweight multi-tenancy. A team is a named workspace with members (invited by email list). Any member can create decks; admins can assign decks to the team.
- **Isolation:** Supabase RLS enforces data isolation — users can only access their own data and shared team data they're explicitly members of.
- **No cross-team data:** Team A cannot see Team B's decks or member data.

### Permission Model (RBAC)

| Role | Capabilities |
|---|---|
| Anonymous | Study cold start deck, view landing page |
| Free User | Create decks (limited), study, manual cards, basic FSRS-6 |
| Pro User | All Free + AI card generation (unlimited), AI-enhanced Learning Fingerprint |
| Team Member | All Pro + access to assigned team decks, team study progress (own) |
| Team Admin | All Team Member + invite members, assign decks, view team progress, send reminders |

### Subscription Tiers

| Tier | Price (TBD) | Limits |
|---|---|---|
| Free | $0 | Limited AI card generations/month (~10), manual cards unlimited |
| Pro | ~$8–12/mo | Unlimited AI generation, full Learning Fingerprint, priority AI |
| Team | ~$6–8/seat/mo | All Pro features + team workspace (min. 3 seats) |

*Exact pricing TBD — recommend A/B testing at launch.*

### AI Generation Access Control

- **Anonymous users:** No AI generation. Cold start deck uses pre-generated content only.
- **Free users:** AI generation available, but gated behind two conditions: (1) authenticated session, and (2) admin spend-approval switch enabled. A global `system_config.ai_free_tier_enabled` flag in Supabase controls access — toggleable without deployment. Ships **off** at launch; enabled manually once rate limiting and abuse monitoring is in place.
- **Pro/Team users:** AI generation always enabled (subscription covers costs; payment commitment reduces abuse risk).
- **Rationale:** Consumer-facing service with anonymous reach creates bot abuse risk. Authenticated + admin-gated access prevents unexpected token spend while the product is in early growth.

### Integration List

| Integration | Purpose | MVP |
|---|---|---|
| Azure OpenAI (GPT-4o) | AI card generation, Learning Fingerprint adaptation | ✅ |
| Gemini 2.5 Flash | Fallback LLM if Azure unavailable | ✅ |
| Supabase | Database, auth, storage, RLS | ✅ |
| Stripe | Subscription billing, webhook handling | ✅ |
| Resend | Transactional email (invites, receipts, re-engagement) | ✅ |
| Vercel Analytics | Core Web Vitals, performance monitoring | ✅ |

### Browser & Platform Support

- **Target:** Modern evergreen browsers (Chrome, Firefox, Safari, Edge — last 2 major versions)
- **Mobile:** Responsive web (no native app at MVP); touch-optimized study session UI
- **No IE11 support**
- **PWA:** Out of scope for MVP; consider for V2

### SEO Strategy

- **Marketing/landing pages:** Full SEO optimization (meta tags, OG, sitemap, structured data)
- **App content:** Not indexed (authenticated routes behind auth; invite-only deck sharing means no public deck URLs)
- **Core Web Vitals:** Green across all metrics (Vercel Analytics monitoring)

### Real-Time Requirements

- **Team progress view:** Near-real-time acceptable (refresh on page load / manual refresh). Full real-time (WebSockets) not required at MVP.
- **Study session:** Local state only — sync to Supabase on session complete.
- **Notifications/reminders:** Async via Resend email; no push notifications at MVP.

### Implementation Considerations

- **Framework:** Next.js (App Router) deployed on Vercel
- **Database:** Supabase (PostgreSQL + RLS) hosted in EU (Frankfurt)
- **ORM:** Drizzle ORM for type-safe queries
- **State management:** React Server Components where possible; minimal client state
- **AI calls:** Server-side only (API keys never exposed to client)
- **Solo-dev constraint:** No microservices; monorepo architecture; maximize use of Supabase built-ins (auth, storage, edge functions)

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Experience MVP — the minimum feature set that delivers the full emotional value arc: frictionless deck creation + demonstrable retention. A stripped-down version without AI generation or Learning Fingerprint would validate the technical stack but not the product thesis.

**Resource:** Solo developer. Architecture decisions are constrained by maintainability — no microservices, maximize Supabase built-ins, minimize operational overhead.

**Launch readiness criteria:** A user can (1) discover the product via cold start deck without signing up, (2) sign up and create an AI-generated deck in under 3 minutes, (3) complete a study session with FSRS-6 scheduling, and (4) see their Depth Score — all before hitting any paywall.

### MVP Feature Set (Phase 1)

**Core user journeys supported:** Sofia (individual learner), Marcus (re-engagement), Priya (team admin), James (team member)

**Must-Have Capabilities:**

| Capability | Justification |
|---|---|
| Cold Start Deck | Removes signup barrier; first impression without friction |
| Google + Email Auth | Required for personalization and data persistence |
| AI Card Generation (admin-gated for free tier) | Core "aha" moment #1 — frictionless creation |
| Manual Card Creation | Fallback for users who prefer control |
| FSRS-6 Spaced Repetition | Foundation of retention engine |
| Learning Fingerprint data model | Must collect data from day 1; can't retrofit |
| Shapeshifter Cards (text + image) | Minimum multi-modal expression of fingerprint |
| Depth Score | Replaces streaks; core positioning vs. competitors |
| Stripe (Free + Pro + Team tiers) | Revenue enablement; validates willingness to pay |
| Team Workspace (invite by email list, assign decks, progress view) | B2B MVP; validates enterprise use case |
| GDPR compliance (consent, deletion) | Legal requirement; non-negotiable |
| WCAG 2.1 AA (core flows) | Accessibility baseline |

### Post-MVP Features

**Phase 2 — Growth:**
- Learning Wrapped (shareable monthly/annual summary)
- Team Duels (competitive learning)
- Re-engagement notifications (shame-free nudges via Resend)
- Audio cards (multi-modal expansion)
- Deck sharing via link (invite-only → broader sharing)
- Advanced B2B admin (analytics dashboard, bulk actions)
- Opt-in streak mode (for users who want it)

**Phase 3 — Expansion:**
- Educator Mode (class management, assignment scheduling)
- Advanced B2B (SSO, permissions, API access)
- Native mobile apps (iOS/Android)
- Public deck marketplace
- Full multi-modal Learning Fingerprint (audio, video)
- Personalized learning paths across collections

### Risk Mitigation Strategy

| Risk Category | Risk | Mitigation |
|---|---|---|
| Technical | Learning Fingerprint cold start delivers poor personalization | Default to FSRS-6 baseline; fingerprint enriches silently — no visible gap |
| Technical | AI generation quality inconsistent | User can review/edit all AI output before saving; quality gate in prompt engineering |
| Technical | Solo-dev capacity overrun | Cut Phase 1 scope at Depth Score + team basic if timeline slips; AI generation is non-negotiable |
| Market | Reverse paywall cannibalizes conversion | A/B test paywall placement; monitor AI usage depth vs. conversion rate |
| Market | PMF not validated fast enough | Ship cold start deck + basic study loop first; AI + team can follow in sprint 2 |
| Resource | Azure OpenAI costs spike unexpectedly | Admin spend toggle; per-user AI rate limiting; Gemini 2.5 Flash fallback |

## Functional Requirements

### Discovery & Onboarding

- **FR1:** Anonymous users can access and study a pre-built cold start deck without creating an account
- **FR2:** Anonymous users can initiate account creation directly from within the cold start deck experience
- **FR3:** Users can sign up using Google OAuth or email/password
- **FR4:** Users invited to a team workspace can sign up using their work email via an invite link

### Authentication & Account Management

- **FR5:** Users can create, log in to, and log out of their account
- **FR6:** Users can update their profile information
- **FR7:** Users can request deletion of their account and all associated personal data
- **FR8:** Users can review a summary of their stored personal data on request (GDPR)
- **FR9:** New visitors can accept, decline, or adjust cookie consent preferences
- **FR10:** Admin can simulate any subscription role (Free, Pro, Team Member, Team Admin) on their own account for testing purposes without requiring actual payment
- **FR11:** Users can view all active sessions and revoke individual sessions
- **FR12:** Users can change their password
- **FR13:** Users can export their personal data in a portable format (GDPR right to data portability)

### Deck & Card Management

- **FR14:** Authenticated users can create a new flashcard deck with a title and subject
- **FR15:** Users can add cards to a deck manually with text (front/back) and an optional image
- **FR16:** Users can edit and delete individual cards within a deck they own
- **FR17:** Users can delete a deck they own
- **FR18:** Users can share a deck via an invite link (recipients must be authenticated to study)
- **FR19:** Users can view all their decks in a personal library

### Study & Learning Engine

- **FR20:** Users can start a study session for any deck they have access to
- **FR21:** The system schedules card reviews using the FSRS-6 spaced repetition algorithm
- **FR22:** Users can rate their recall confidence after each card, which drives FSRS-6 scheduling
- **FR23:** Users can view their Depth Score — a cumulative measure of retention quality — per deck
- **FR24:** Users can identify and study weak cards (low retention) in isolation within a deck
- **FR25:** The system presents card content in adaptive formats (text, image, contextual narrative) based on the user's Learning Fingerprint
- **FR26:** Study session progress is persisted automatically on session completion

### AI & Personalization

- **FR27:** Authenticated users can generate a deck from a topic prompt using AI
- **FR28:** Authenticated users can generate cards from pasted text using AI
- **FR29:** Users can review, edit, and delete AI-generated cards before saving to a deck
- **FR30:** The system silently builds a Learning Fingerprint for each user based on study behavior and response patterns
- **FR31:** The Learning Fingerprint influences card format selection and content presentation style over time
- **FR32:** AI card generation for free-tier users is subject to a monthly usage limit
- **FR33:** AI card generation for free-tier users requires an admin spend-approval flag to be enabled
- **FR34:** The system sanitizes and validates all user-supplied content before passing it to AI generation
- **FR35:** Before AI deck generation, the system prompts users to specify their learning goal and personal context (what, why, and timeline); AI-generated card content is framed through that stated goal
- **FR36:** The system measures and logs response hesitation time (elapsed time between card display and user interaction) as a Learning Fingerprint signal; sustained hesitation on nominally mastered cards automatically schedules them for deeper review

### Payments & Subscriptions

- **FR37:** Users can upgrade from Free to Pro tier via a subscription checkout flow
- **FR38:** Team admins can purchase and manage a Team subscription
- **FR39:** Users can view their current subscription tier, remaining usage limits, and billing history
- **FR40:** Users can cancel their subscription at any time
- **FR41:** The system automatically grants and revokes feature access based on the user's active subscription tier

### Team & B2B Workspace

- **FR42:** Authenticated users can create a named team workspace
- **FR43:** Team admins can invite members by providing a list of email addresses
- **FR44:** The system validates each email address in the invite list and flags invalid entries before sending invitations
- **FR45:** Invited users receive an email invitation with a link to sign up or log in and join the workspace
- **FR46:** Team admins can assign a deck to all or selected team members
- **FR47:** Team members can view and study all decks assigned to them
- **FR48:** Team admins can view aggregate study progress per assigned deck (completion rate, average retention)
- **FR49:** Team admins can send a reminder to members who have not started an assigned deck

### Administration & Compliance

- **FR50:** Admin can toggle the global AI free-tier spend approval flag without a code deployment
- **FR51:** The system presents a cookie consent banner to new visitors and applies their preference
- **FR52:** The system rate-limits team invite sends to prevent abuse
- **FR53:** All core user-facing screens conform to WCAG 2.1 AA accessibility standards
- **FR54:** The system logs errors, AI generation failures, and payment events in structured, machine-readable format (action context, user role, stack trace, timestamps) to enable automated analysis
- **FR55:** Admin can access error logs and system health indicators to investigate and debug production issues
- **FR56:** Admin can query, filter, and export error logs by type, time range, and severity
- **FR57:** The system groups and deduplicates recurring errors to surface patterns rather than noise
- **FR58:** The system tracks key product events (cold start viewed, signup, deck created, AI generation used, study session completed, paywall hit, upgrade, team created, deck assigned)
- **FR59:** Admin can view a business metrics dashboard covering active users, retention cohorts (D1/D7/D30), freemium-to-paid conversion rate, and MRR
- **FR60:** Admin can view funnel analytics from cold start → signup → first deck → first study session → upgrade
- **FR61:** Admin can view AI usage metrics (generations per day, free vs. paid split, cost estimate)
- **FR62:** The system enforces rate limiting on authentication attempts to prevent brute-force attacks

## Non-Functional Requirements

### Performance

| Requirement | Target |
|---|---|
| Largest Contentful Paint (LCP) | < 2s on 4G mobile |
| API response time (p95) | < 500ms for all non-AI endpoints |
| AI card generation (end-to-end) | < 5s for a single card; < 15s for a full deck (20 cards) |
| Study session first card load | < 1s after session start |
| Time to interactive (TTI) | < 3s on desktop |
| Core Web Vitals | All green in Vercel Analytics |

### Security

| Requirement | Standard |
|---|---|
| Data in transit | TLS 1.2+ enforced on all connections |
| Data at rest | AES-256 encryption (Supabase managed) |
| Authentication tokens | Short-lived JWTs; refresh token rotation enabled |
| Row-level security | Supabase RLS enforced on all tables — no client-side trust |
| API keys | Never exposed to client; all AI/payment calls server-side only |
| AI prompt inputs | Sanitized before passing to LLM; no PII in prompts |
| Brute-force protection | Auth attempts rate-limited at 10 attempts/15 min per IP |
| Payment data | Never stored locally; Stripe handles all card data (PCI DSS delegated) |
| Dependency security | Automated vulnerability scanning (Dependabot or equivalent) |

### Privacy & GDPR

| Requirement | SLA |
|---|---|
| Data deletion requests | Fulfilled within 30 days of request |
| Data export requests | Fulfilled within 72 hours of request |
| Cookie consent | Functional cookies only until consent granted; analytics blocked until opt-in |
| Data residency | All user data stored in EU region (Supabase Frankfurt) |
| AI data handling | No user PII sent to Azure OpenAI; prompt content not used for model training (Azure enterprise terms) |
| Privacy policy | Accessible from every page; updated within 30 days of any material change |

### Scalability

| Requirement | Target |
|---|---|
| Concurrent users (MVP launch) | Support 500 concurrent users without degradation |
| Database | Supabase free tier sufficient to 500 MAU; scale trigger at MRR > $200/mo |
| AI generation throughput | Queue AI requests if concurrent demand spikes; graceful degradation to manual creation |
| Vercel serverless | Auto-scales; no manual capacity planning required |
| Team workspace size | Support teams up to 200 members (MVP ceiling) |

### Reliability & Observability

| Requirement | Target |
|---|---|
| Uptime | ≥ 99.5% monthly (Vercel + Supabase SLA covers this) |
| Error logging | Structured JSON logs with context; retained for minimum 30 days |
| Error alerting | Critical errors (payment failures, auth failures) alert within 5 minutes |
| AI fallback | Automatic failover to Gemini 2.5 Flash if Azure OpenAI unavailable |
| Study session data loss | Zero tolerance — session results persisted before UI confirms completion |
| Stripe webhook reliability | Idempotent webhook handlers; retry on failure; dead-letter queue for failed events |

### Accessibility

| Requirement | Standard |
|---|---|
| Compliance target | WCAG 2.1 AA on all core flows (study session, deck creation, onboarding, team management) |
| Keyboard navigation | Full keyboard accessibility on all interactive elements |
| Screen reader support | Semantic HTML; ARIA labels on dynamic content |
| Color contrast | Minimum 4.5:1 ratio for normal text; 3:1 for large text |
| Focus management | Visible focus indicators; logical tab order throughout app |

### Integration Quality

| Integration | Requirement |
|---|---|
| Azure OpenAI / Gemini | Timeout after 10s; retry once; fallback to secondary model; user notified if both fail |
| Stripe | Webhook signature validation on all events; idempotency keys on all payment operations |
| Supabase | Connection pooling via Supabase Pooler; no direct DB connections from serverless functions |
| Resend (email) | Transactional emails delivered within 60s; bounce handling logged |
| Third-party uptime dependency | App remains functional (read-only study mode) if Stripe or Resend are temporarily unavailable |
