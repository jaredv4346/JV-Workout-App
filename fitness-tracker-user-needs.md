# Fitness Tracker — User Needs & App Specification

## Context
This is a personal-use fitness tracking web app for a single user running a 4-day bro split (chest/shoulders, arms, back, legs) with a hypertrophy-for-aesthetics and lean recomp focus. The app must be fast to use mid-workout on a phone. If logging a set takes more than ~5 seconds, the app has failed.

## Tech Stack & Constraints
- **Framework:** Next.js (App Router)
- **Deployment:** Vercel (hobby/free tier)
- **Database:** Supabase (free tier) — Postgres with built-in auth if needed
- **Supabase Project URL:** Stored in `NEXT_PUBLIC_SUPABASE_URL` env var (already provisioned)
- **Supabase Anon Key:** Stored in `NEXT_PUBLIC_SUPABASE_ANON_KEY` env var (already provisioned)
- **Auth:** Simple single-user auth (password gate or Supabase email auth). This is a personal tool, not a multi-user platform. Do not over-engineer authentication.
- **Design:** Mobile-first, PWA-ready. Must be usable one-handed between sets. Responsive but phone is the primary device.
- **Styling:** Tailwind CSS. Clean, minimal UI — dark mode default. No visual clutter.

---

## Core User Needs

### 1. Exercise Bank
- I need to maintain a personal library of exercises I perform.
- Each exercise should have: name, primary muscle group, and optionally equipment type and notes.
- I need to be able to add, edit, and archive (soft-delete) exercises at any time.
- Exercises should be taggable or filterable by muscle group so I can quickly find them when building a session.

### 2. Split Schedule & Session Templates
- I need to define my weekly split structure (e.g., Day 1: Chest/Shoulders, Day 2: Arms, Day 3: Back, Day 4: Legs).
- The app should suggest today's workout based on my split rotation, but I must always be able to override and pick any day.
- The split should be editable — I may restructure it periodically.
- The schedule logic should be rotation-aware (track which day I last completed, suggest the next one) rather than rigidly calendar-mapped to specific weekdays.

### 3. Pre-Workout Session Setup
- Before or at the start of a session, I need to select which split day I'm training.
- I then need to pick exercises from my exercise bank for that session. The app should remember which exercises I chose last time for that split day and pre-populate them as a default, which I can then modify.
- I need to be able to reorder exercises within the session and add/remove exercises on the fly.

### 4. In-Workout Logging (This is the most critical UX surface)
- For each exercise in my session, I need to log individual sets with: weight, reps, and optionally an RPE or note.
- **Critical:** The app must display what I did last time for this exercise (weight × reps for each set) directly alongside the current logging inputs. This is the primary decision-support for progressive overload.
- Adding a set should be one tap. Pre-filling weight/reps from the previous session's corresponding set is ideal — I just adjust and confirm.
- I need to be able to delete or edit a set after logging it (miskeys happen mid-set).
- The interface must be large-tap-target, minimal-scroll, and fast. No modals or multi-step flows for basic set logging.

### 5. Progression Tracking & Visualization
- For each exercise, I need to see improvement over time with three toggleable metrics:
  - **Estimated 1RM** (using Epley or Brzycki formula)
  - **Total session volume** (sets × reps × weight for that exercise in a given session)
  - **Top-set weight** (heaviest weight used in a session)
- Visualize as a simple line chart or trend graph per exercise, with a selectable time range (last 4 weeks, 8 weeks, 12 weeks, all time).
- I don't need complex analytics. I need to glance at a chart and answer: "Am I progressing on this lift or not?"

### 6. Bodyweight Tracking
- I need to log daily bodyweight entries.
- Display a rolling 7-day average trend line alongside individual data points to smooth out daily fluctuations.
- This should be a lightweight feature — a quick-entry field accessible from the home screen, plus a simple chart.

### 7. Workout History
- I need to view past sessions in reverse chronological order.
- Each session entry should show: date, split day label, exercises performed, and total volume.
- I need to be able to tap into a past session and see the full set-by-set detail.

---

## Non-Requirements (Explicitly Out of Scope)
- **No nutrition tracking.** That's a separate problem.
- **No social features.** Single-user app.
- **No AI-generated programming or exercise recommendations.** I program my own training.
- **No gamification.** No streaks, badges, or achievements.
- **No rest timer.** I'll use my phone's clock if I need one. Can add later.
- **No multi-user support.** No sharing, no profiles, no permissions beyond basic single-user auth.

---

## UX Priorities (Ranked)
1. **Speed of in-workout logging** — this makes or breaks daily usage.
2. **"Last time" context visibility** — the core value proposition over a notes app.
3. **Session setup simplicity** — pre-populated from last time, quick to adjust.
4. **Progression charts** — the payoff for consistent logging.
5. **Everything else.**

---

## Data Model (Suggested Starting Point)

- **exercises** — id, name, muscle_group, equipment, notes, is_archived, created_at
- **split_days** — id, label (e.g., "Chest/Shoulders"), order_index, created_at
- **sessions** — id, split_day_id, date, started_at, completed_at, notes
- **session_exercises** — id, session_id, exercise_id, order_index
- **sets** — id, session_exercise_id, set_number, weight, reps, rpe, notes, created_at
- **bodyweight_logs** — id, date, weight, created_at

---

## Implementation Notes
- Use Supabase for Postgres + auth. Row-level security is optional since this is single-user, but set it up if simple.
- Deploy on Vercel. Use environment variables for Supabase credentials.
- Prioritize server components where possible, but the in-workout logging screen will need to be a client component for real-time interactivity.
- Add a web app manifest and basic service worker for PWA install-to-homescreen capability.
- Seed the exercise bank with common compound and isolation movements for a 4-day bro split so the app isn't empty on first launch.
