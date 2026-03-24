---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/A-Product-Brief/project-brief.md
---

# UX Design Specification Flashcards

**Author:** Jani
**Date:** 2026-03-24

---

<!-- UX design content will be appended sequentially through collaborative workflow steps -->

## Executive Summary

### Project Vision

Flashcards (Epics 3+4) delivers the core learning loop: create → study → return. Epic 3 builds the deck and card library; Epic 4 builds the study session with FSRS-6 spaced repetition. Together they form the product's heartbeat — the card flip interaction that makes retention effortless and measurable.

### Target Users

- **Sofia** (primary): Language learner, mobile/commute sessions, values speed and genuine retention over gamification
- **Marcus** (re-engagement): Returner after gaps, needs the system to feel forgiving and trust-worthy, not punishing
- **James** (team): Involuntary user with a pre-assigned deck, needs zero setup and team-context awareness

### Key Design Challenges

1. Card creation must feel instant — time to first deck < 3 min is a hard success metric; mobile typing friction is the primary risk
2. Study session must protect the retrieval moment without clinical UI — confidence rating, pacing, and feedback all threaten flow if over-designed
3. Depth Score must feel like mastery data, not a grade — framing copy and animation are as important as the number itself

### Design Opportunities

1. Physical flashcard metaphor in the card editor — consistent with study mode, teaches product model through gesture
2. Implicit confidence inference — zero-friction rating that feeds the Learning Fingerprint without asking users to rate themselves
3. Deck library as a motivating glance — Depth Score rings + contextual state lines make progress visible without performance anxiety

---

## Core User Experience

### Defining Experience

The single most important interaction in Epics 3+4 is **the card flip** — the moment between seeing a question and revealing the answer. This is the product's heartbeat. Everything else exists to get users to this moment and bring them back to it.

The second most important interaction is **deck creation** — specifically the first card added to a first deck. Time to first deck < 3 min is a hard success metric.

The core loop: **create → study (flip) → return**

### Platform Strategy

- **Web-first, mobile-responsive** — no native app at MVP
- **Primary device split:** mobile for study (commute, downtime), desktop for deck creation (typing-heavy)
- **Touch-first interaction model** for study cards; keyboard-first fallback required (WCAG 2.1 AA)
- **No offline mode** at MVP — session progress persisted server-side before UI confirms
- **Mobile constraint:** keyboard visibility management critical — "Add & next" must remain above keyboard at all times

### Effortless Interactions

| Interaction | How it becomes effortless |
|-------------|--------------------------|
| Confidence rating after flip | Implicit (inferred from hesitation time) — zero required action, one-tap override |
| Session progress saving | Automatic on completion — never lost, never asked about |
| Next session scheduling | FSRS-6 runs invisibly — "6 cards ready" appears without user action |
| Returning after a break | No penalty state — library shows what's ready, nothing punishes the gap |
| Rapid card entry on mobile | Auto-focus next card front after "Add & next" — continuous flow |

### Critical Success Moments

**Moment 1 — The First Flip (must not fail)**
First card flip in a study session. Animation quality, <1s load, and reveal weight define product feel and earn or lose trust.

**Moment 2 — Session Completion with Next-Visit Hook**
End of first session shows Depth Score ("your starting point — watch this grow") + specific next-visit hook ("Your next review: tomorrow, 3 cards").

**Moment 3 — Deck Created Under 3 Minutes**
Sofia's first deck — create tap to first card saved — under 3 minutes. Physical flashcard metaphor + "Add & next" auto-focus make this achievable on mobile.

**Moment 4 — Re-engagement Without Shame**
Marcus returns after 3 weeks. First thing: "Welcome back — your cards waited for you." No broken streak. No lost progress.

**Moment 5 — Depth Score Movement**
After 3–5 sessions, the Depth Score ring visibly improves. Animated number transition (45% → 61%) is first tangible proof the system works.

### Experience Principles

*(Refined via First Principles Analysis — each principle validated against root truth, not inherited assumption)*

1. **The moment between Q and A is where learning happens. Design protects that moment.**
   The flip enforces active retrieval — the brain working before seeing the answer. The pause is thinking time, not loading time. Any design that skips or rushes this moment undermines the memory mechanism.

2. **Invisible by default, transparent on demand — reasoning always one tap away.**
   FSRS-6 and Learning Fingerprint run silently. Users who want to understand scheduling ("why is this card appearing now?") can access it. The escape hatch exists even if 80% never open it.

3. **Quick capture is always one tap in. Deliberate curation is always available.**
   Mobile card creation (flip-based, one at a time) is speed-optimised. The full deck editor (desktop, existing deck, multiple cards) supports comfortable browsing and restructuring. Two contexts, not one design.

4. **Every feedback moment delivers curiosity, satisfaction, or mastery. Never obligation or guilt.**
   The goal isn't emotional flatness — it's the right emotions. Depth Score animation, re-engagement welcome, weak card bonus framing, and session completion all have an explicit emotional target.

5. **Every screen state has one visually dominant action. Secondary actions are accessible without searching.**
   Visual hierarchy governs what's biggest, not what's possible. The deck detail page in "Active" state leads with "Start study" — but "Add card" and "Share" remain reachable without hunting.

---

## Persona Reactions: Focus Group — Epics 3+4 UX

### Sofia (Language Learner, Mobile-first)

- **"N cards ready — X min" CTA:** Confirmed essential — commute context means time estimate is a decision trigger, not decoration
- **Implicit confidence rating:** Concerned hesitation ≠ always card difficulty (distraction, notification, etc.). Override must be visible and one-tap easy. Consider: "Was that right? Tap to correct" as a light fallback after auto-advance
- **Combined deck + first card flow:** Needs a draft/quick-save path — users plan decks on mobile, fill them in on desktop. Save without cards must exist, just not promoted as default
- **Depth Score framing on first session:** Confirmed must-have — "your starting point" copy is essential to prevent abandonment

### Marcus (The Returner, comes back after long breaks)

- **Library visual states:** Confirmed — "ready / up to date" distinction is a to-do list, not a shame mechanism. Critical for re-engagement
- **Session pacing (warm-up cards):** Warm-up cards must be algorithmically sequenced — drawn from highest recent retention, not random. Accidental hard card first destroys the effect
- **Algorithm signal timing:** 5 sessions too slow. Also needed: re-engagement trigger — if user returns after long break, show "Welcome back — your cards waited for you. No penalties." before study begins
- **Weak card mode as bonus round:** Confirmed — "bonus round" framing works; "remediation" does not

### James (Team Member, pre-assigned deck, involuntary user)

- **Single-deck library bypass:** Users with one assigned deck should skip the library and land directly on the deck detail or study prompt. Library is a multi-deck feature
- **Session completion — team context:** For team-assigned decks, completion screen needs: "Your progress is shared with [team admin name]." Builds system trust for reluctant users
- **Animation speed:** Deliberate weight resonates for retained users, not day-one. Animation speed should adapt (faster on first session) or be user-controllable in settings

### New Design Rules from Focus Group

| Rule | Source | Priority |
|------|--------|----------|
| Override chip visible and one-tap after implicit rating | Sofia | Must-have |
| Draft deck (no cards) save path available, not promoted | Sofia | Must-have |
| Warm-up cards = highest recent retention, algorithmically ordered | Marcus | Must-have |
| Re-engagement welcome state: "Your cards waited. No penalties." | Marcus | Should-have |
| Single-deck users bypass library → land on deck detail | James | Should-have |
| Team-assigned deck completion shows team context line | James | Should-have |
| Animation speed adapts (faster day-one) or settings toggle | James | Nice-to-have |

---

## Party Mode Insights — Sally, John & Winston on Epics 3+4

### Deck Detail Page: Three State-Driven Modes
The deck detail page serves three different emotional states (Sofia creating, Marcus returning, James studying). One layout, priority shifts by state:
- **Empty deck** (no cards yet) — creation CTA dominant
- **Active deck** (cards due) — study CTA dominant, Depth Score visible
- **Caught-up deck** (nothing due) — progress view dominant, "add more cards?" nudge

*Note: Marcus (returner) will almost always land in Active state due to FSRS backlog. Caught-up is primarily a healthy-habit user state (Sofia after a good week).*

### Card Editor: Physical Flashcard Metaphor
Card editor feels like writing on a physical flashcard — one face at a time, not a two-field form:
- Front face visible → tap to type question
- Flip icon/swipe → card animates to back face → type answer
- "Add & next" saves and presents fresh front face for next card
- The gesture teaches the product model — cards have two sides — through action, not onboarding copy

### Card Component: Shared Across All Contexts
One card component, used everywhere: creation, study, AI review (Epic 5), weak card mode.
- `editable` mode: creation and editing
- `readOnly` mode: study and review
- Design once, consistent metaphor throughout

### Flip Animation: Context-Sensitive Timing
Same component, different animation timing:
- **Creation mode:** instant/snappy flip — speed and flow
- **Study mode:** deliberate/weighted flip — memory consolidation moment

### Images: Inline on Card Face
Images live on the card face, not as a separate attachment field. Tapping a camera/upload icon inlines the image directly onto the current face. Layout reflows for text + image, image only, or text only.

### Deck Library Card: Three Elements Only
Each deck card in the library shows exactly:
1. **Title** (large)
2. **Depth Score ring** (right side, prominent)
3. **One contextual line** (state-driven): "6 cards ready" / "Up to date" / "No cards yet"

Nothing else. No last-studied date, no card count.

---

## Design Insights: SCAMPER Analysis — Deck Library & Study Session

### Key Insights by Lens

**Substitute**
- Replace card count with **Depth Score ring** as the primary per-deck visual in the library — users see retention quality (73%), not quantity (40 cards)
- Replace "Start Study Session" CTA with contextual invitation: "**6 cards ready — takes ~4 min**"

**Combine**
- Collapse deck creation + first card addition into a single flow — the deck doesn't persist until at least one card is saved (no empty decks)
- Merge session completion screen with next scheduled review — one glance shows both Depth Score update and next review date

**Adapt**
- Study session visual language borrows from **music player** (now playing, track position, playlist) — not quiz/test paradigm
- Deck library uses **inbox-zero pattern** — "3 decks have cards ready" badge, no streak counter

**Modify**
- Card flip animation given **deliberate weight** — slightly slower than functional, the pause is the memory consolidation moment
- Depth Score improvement after session animated prominently — number transition feels earned, not celebrated with confetti
- Weak cards labelled "**cards that want more time**" not "failed cards"

**Put to Other Use**
- Hesitation time data (FR36) powers a **per-card confidence history sparkline** visible in deck editor (not during study)
- Shared deck link lands directly in the study session — deck's first card is the landing page (acquisition mechanic)

**Eliminate**
- No empty library state — cold start demo deck always visible until user has 2+ own decks
- Remove card count as a primary metric from library view (only show in deck editor)
- Remove "Are you sure?" confirmation when ending session early — progress already persisted, no shame added

**Reverse**
- **Quick-capture mode** (post-MVP): study/capture ideas first, name and save deck after
- **Weak card mode as bonus round**: after regular session → "4 cards tripped you up — want a 2-min targeted round?" (opt-in, not remediation screen)

### Priority Tier

| Insight | Priority |
|---------|----------|
| Depth Score ring as primary deck visual | Must-have |
| "N cards ready — X min" CTA | Must-have |
| Single-flow deck creation + first card | Must-have |
| Deliberate card flip animation | Must-have |
| Weak card mode as post-session bonus | Should-have |
| Never empty library | Should-have |
| Hesitation sparkline in editor | Nice-to-have |
| Quick-capture mode | Post-MVP |

---

## Risk Analysis: Pre-mortem — Epics 3+4 UX Failure Modes

### Failure 1: Users create one deck and never return
**Root causes:** Blank card editor with no guidance; no next-visit hook after session; Depth Score on first session feels like a bad grade.
**Prevention:**
- Card editor shows contextual prompts with a pre-filled example on first use
- Session completion screen shows specific next-visit hook: "Your next review: tomorrow, 3 cards"
- Depth Score on first session has framing copy: "Your starting point — watch this grow"

### Failure 2: Study session feels like a chore after week 2
**Root causes:** No variation or pacing arc; repetitive card-flip loop; implicit rating occasionally wrong erodes trust in the algorithm.
**Prevention:**
- Session pacing: warm-up cards first, peak focus mid-session, hardest cards revisited at end
- Subtle progress indicator: "card 8 of 14" text only — no progress bar
- After ~5 sessions, surface one-liner: "The app noticed you find [X] harder — scheduling it more often"

### Failure 3: Deck library becomes cluttered and unusable
**Root causes:** Flat list sorted by creation date; no visual distinction between decks due today vs up to date.
**Prevention:**
- Default sort: cards due today, descending — most urgent deck always at top
- Visual deck states: "ready to study" (highlighted) / "up to date" (muted) / "no cards yet" (ghost)
- Collapse "up to date" decks into a secondary section at MVP to reduce visual noise

### Failure 4: Weak card mode goes unused
**Root causes:** Positioned as a tool ("Weak Cards" tab) not a benefit; plain list with no differentiation from normal study.
**Prevention:**
- Surface as post-session bonus round: "3 cards need more practice — 2 min reinforcement?" (not a tab)
- Only shown when user actually has weak cards
- Weak card session visually distinct: subtle different background/card border signals "focused practice"

### Failure 5: Mobile users bounce during card creation
**Root causes:** Four taps + two typing sessions per card; keyboard covers "Add card" button; no rapid-entry flow.
**Prevention:**
- "Add & next" button sticky above keyboard at all times
- After adding a card, auto-focus front field of new blank card — rapid-fire entry without navigation
- Voice input as post-MVP enhancement

### Prevention Priority

| Prevention | Priority |
|------------|----------|
| Next-visit hook on session completion + Depth Score framing | Must-have |
| Library sorted by due cards + visual states | Must-have |
| Sticky "Add & next" above keyboard + auto-focus | Must-have |
| Session pacing arc + algorithm signal at 5 sessions | Should-have |
| Weak card mode as post-session bonus (not tab) | Should-have |

---

## Desired Emotional Response

### Primary Emotional Goals

**Product identity north star: Quiet confidence** — the feeling that you're genuinely getting smarter without working hard at it. Not the dopamine spike of a game score, not the relief of completing homework. Something more durable: *I'm actually retaining this.*

This differentiates Flashcards from every competitor:
- Duolingo → excitement and streak anxiety (dopamine/guilt loop)
- Anki → control and mastery (satisfaction/overwhelm depending on user type)
- **Flashcards → quiet confidence (competence accumulating)**

**In-product emotional arc:** A single north star emotion isn't the right model for a multi-session product. The arc is deliberate and stage-based:

| Stage | Target emotion | Why |
|-------|---------------|-----|
| Sessions 1–2 (new user) | **Effortlessness** | Remove every barrier; the product should feel surprising in how little friction it has |
| Sessions 3–7 (early habit) | **Curiosity** | Shapeshifter Cards, Learning Fingerprint signals, varied card formats keep the loop interesting |
| Session 8+ (retained user) | **Quiet confidence** | Progress visible; Depth Score moves; user knows it's working |
| After a real-world recall | **Mastery** | "I used this in real life" — highest emotional peak, highest word-of-mouth trigger |
| Re-engagement (after break) | **Trust** | System remembered them, nothing is broken, no penalty |

### Emotional Journey Mapping

| Moment | User | Target emotion | Design lever |
|--------|------|---------------|--------------|
| First card flip | Sofia | Curiosity — "what's on the other side?" | Deliberate flip animation, card weight |
| Correct recall | Sofia | Satisfaction — "I knew that" | Implicit rating auto-advances smoothly, no fanfare |
| Session completion | Sofia | Accomplishment + anticipation | Depth Score with "your starting point" framing + next-visit hook |
| Returning after a break | Marcus | Relief/Trust — "my progress is still here" | "Welcome back — your cards waited" screen, no penalty state |
| Depth Score improves | Marcus | Mastery — "I can see it working" | Animated number transition, specific (45% → 61%) |
| First deck created | Sofia | Momentum — "that was fast" | Sub-3-min creation, immediate study CTA |
| Weak card bonus round | Marcus | Agency — "I'm fixing the gaps" | Opt-in framing, visually distinct session |
| Opening pre-assigned deck | James | Clarity — "I know exactly what to do" | Single-deck bypass to deck detail, zero setup |

### Micro-Emotions

**Confidence → not Confusion**
Every interaction must have an obvious next step. Physical flashcard metaphor, "6 cards ready — 4 min" CTA, sticky "Add & next" — all designed to eliminate "what do I do now?"

**Trust → not Scepticism**
"Invisible by default, transparent on demand" directly addresses this. Marcus's re-engagement moment is the highest-risk trust point.

**Satisfaction → not Excitement**
Satisfaction is quiet and durable. Excitement fades and demands escalation. Depth Score animations are satisfying, not exciting — a number moving is enough. No confetti, no level-up sounds.

**Accomplishment → not Frustration**
Session completion must feel earned, not interrupted. No "Are you sure?" quit confirmation. "Add & next" auto-focus prevents creation frustration on mobile.

**Belonging → not Isolation** *(team context)*
James needs to feel his studying matters. "Your progress is shared with [admin]" on completion turns solitary activity into connected contribution.

### Design Implications

| Target emotion | UX design approach |
|---------------|-------------------|
| Effortlessness (sessions 1–2) | Zero required actions; implicit rating; sub-3-min creation; no empty library |
| Curiosity (sessions 3–7) | Varied card formats via Shapeshifter; Learning Fingerprint signal surfaced at session 5+ |
| Quiet confidence (session 8+) | Depth Score as primary metric; animated improvement transitions; no streaks |
| Mastery (real-world recall) | Shareable Depth Score progress card (post-MVP); per-deck retention history |
| Trust (re-engagement) | "Welcome back" screen; scheduling transparency escape hatch; no penalty state |

### Emotions to Avoid

| Emotion | Where it risks appearing | Prevention |
|---------|------------------------|------------|
| Guilt | Return after a break | No streak counter, no "you missed X days", welcome-back screen |
| Performance anxiety | Depth Score on first session, mid-session | "Your starting point" framing; no visible score during session |
| Overwhelm | Large deck library | Sorted by due cards; algorithm invisible; "cards ready" not "cards total" |
| Confusion | New user, card editor | Physical flashcard metaphor; contextual prompts on first use |
| Abandonment anxiety | Session ends early | No confirmation modal; progress persisted; no penalty |

### Emotional Design Principles

1. **Design for the right stage, not a single emotion** — effortlessness for new users, curiosity for early habit, quiet confidence for retained users, mastery as the ceiling
2. **Quiet > loud** — satisfaction through subtle, specific feedback (a number changing) beats spectacle (confetti, badges, streaks)
3. **Trust is earned through memory** — the system remembering the user (their progress, their break, their weak cards) is the primary trust mechanism
4. **Agency over automation** — implicit intelligence only feels positive when the user can override it; invisible control creates anxiety, not ease

### Root Cause Analysis: Why Avoided Emotions Still Risk Appearing

**Guilt risk lives outside the app (5 Whys finding)**
The welcome-back screen fixes in-app guilt but leaves pre-open anxiety unsolved. The guilt happens before the user opens the app — triggered by the icon on their phone. Re-engagement emails and push notifications must carry the same anti-guilt tone as the in-app welcome screen.
- ❌ Not: "You have 14 cards waiting!"
- ✅ Yes: "Your deck is exactly where you left it — no catch-up needed."

**Performance anxiety: Depth Score session-1 state (5 Whys finding)**
Percentages are universally conditioned as test scores. The number is read before the framing copy. "Your starting point" text fails because the eye hits the number first.
- **Solution:** Session 1 completion shows an *empty ring* with a seedling/planted metaphor — not a percentage. Copy: "You've planted 12 cards. Watch them grow." The percentage appears from session 2 onward, after the user has context for what it means.

**Confusion: Flip affordance is assumed, not communicated (5 Whys finding)**
A flat rectangle on screen doesn't signal "I have another side." The physical flashcard metaphor fails in 2D without a depth cue. Users who haven't used physical flashcards won't know to attempt a flip.
- **Solution:** Subtle 3D shadow/edge on card component to suggest physicality. One-time "write the back →" nudge with a flip icon on first card creation — disappears after first use, never shown again.

---

## Design Decision: Confidence Rating UI (Tree of Thoughts Analysis)

### Problem
After every card flip, the user rates recall confidence to drive FSRS-6 scheduling. The interaction must balance algorithm data quality, study flow, and the anti-anxiety design principle.

### Paths Evaluated

| Path | Description | Flow | FSRS Data | Anxiety-free | Accessible |
|------|-------------|------|-----------|--------------|------------|
| A: Numeric 1–4 | Again/Hard/Good/Easy buttons | ❌ breaks | ✅ excellent | ❌ no | ✅ yes |
| B: Emoji 3-option | 😕 / 🤔 / 😊 | ⚠️ minor | ✅ good | ✅ mostly | ✅ yes |
| C: Binary swipe | Swipe right/left | ✅ seamless | ❌ coarse | ✅ yes | ❌ no |
| D: Spatial tap | Top/bottom zone tap | ✅ fast | ❌ coarse | ✅ yes | ❌ no |
| **E: Implicit + override** | **Inferred from hesitation time, one-tap override** | **✅ seamless** | **✅ good** | **✅ excellent** | **✅ yes** |
| F: Color/size buttons | Large green / medium yellow / small red | ⚠️ minor | ✅ good | ✅ mostly | ❌ no |

### Selected Approach: Path E (Implicit Signal + Optional Override)

The app infers confidence from hesitation time (FR36 — already in architecture). After card reveal, the app shows a subtle pre-selected chip ("I'd rate this as: Easy" or "Hard") that auto-advances after ~1.5s. User can tap once to override before it advances.

**Settings toggle:** Users who prefer explicit control can switch to Path B (3 emotional buttons).

**Rationale:**
- Zero required action — no self-judgment moment, no decision fatigue
- Hesitation time directly feeds Learning Fingerprint Layer 2 (FR36)
- Override preserves FSRS-6 data quality without forcing every user to rate every card
- Aligns with "UX so good it disappears" and anti-anxiety design principles
- Fully keyboard accessible and WCAG compliant
