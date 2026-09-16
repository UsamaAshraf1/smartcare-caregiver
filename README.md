# SmartCare Caregiver

A standalone React Native (Expo) app for SmartCare's home-care providers —
built from `home_care_provider_app_spec.docx` and reusing the exact design
system (`theme.ts`, `Icon.tsx`, `ui.tsx`, `AppAlert.tsx`) and Supabase
backend integration pattern from the `smartcareapp/frontend` patient app
you shared. Same backend, same database, same design language — a
genuinely separate app rather than the role-gated tab that used to live
inside the patient app.

## What's built (spec §12 "Ready to use today")

This app implements the full first list from the spec's scoping summary —
a complete MVP without touching the backend:

- **Sign in** — Supabase Auth `signInWithPassword`, same GoTrue instance as
  the patient app. No self-signup screen: accounts are provisioned by an
  admin (spec §2), so this app only ever signs in.
- **Caregiver profile & on-duty toggle** — `profiles.caregiver_active`,
  toggled from both the Queue header and the Profile tab.
- **Open job pool + claim job** — `home_care_visits?status=eq.requested`
  (RLS filters by `caregiver_type`), `claim_home_care_visit` RPC.
- **My active queue** — `my_caregiver_queue()` RPC, polled every 8s.
- **Full visit status lifecycle** — `update_home_care_visit_status` RPC
  drives matched → en_route → in_progress → completed; `cancel_home_care_visit`
  for caregiver-initiated cancels.
- **Real-time GPS broadcast (foreground)** — Supabase Realtime Broadcast on
  `visit:<visitId>`, started automatically while a visit is `en_route`.
- **Visit address/notes, dependent details** — visit fields directly on
  `home_care_visits`, plus `family_members` lookup when a visit is booked
  for a dependent rather than the account holder.
- **In-app notification inbox** — `public.notifications`, with push-token
  registration wired up (`device_push_tokens`) for whenever push is turned
  on for this app.
- **Edit profile** — name, credentials, and vehicle, via the same
  `profiles_update_own` RLS policy the on-duty toggle already relies on.
  `role` and `caregiver_type` are deliberately left out of this screen —
  they're admin-provisioned per spec §2, not something this app exposes as
  editable, even though the RLS policy itself doesn't forbid it.

## What's intentionally stubbed (spec §12 "Needs new backend work")

The visit detail screen shows an in-app note about this rather than
hiding it, so it's visible during a demo/review:

- Patient medical basics + a direct call/message to the patient — blocked
  on a new RLS policy and a queryable phone number (spec §6).
- Push notifications *to* caregivers (new job / cancellation) — the
  delivery pipe exists, but nothing inserts into `notification_outbox` for
  caregiver events yet (spec §7).
- Earnings/payout tracking, structured vitals entry, fixed-shift
  scheduling, background location, and a map UI — all flagged in the spec
  as fast-follow work, not MVP.

## Project structure

```
App.tsx                      # navigation + providers
src/theme.ts                 # design tokens (colors, radius, spacing, shadows) — copied verbatim
src/components/
  Icon.tsx, ui.tsx           # shared UI primitives — copied verbatim from the patient app
  AppAlert.tsx                # in-app alert/confirm dialogs — copied verbatim
  forms.tsx                   # text input field (subset of the patient app's forms.tsx)
  TabBar.tsx                   # 3-tab bar: Queue / Notifications / Profile
src/lib/
  supabase.ts                 # Supabase client — same backend, same env vars — copied verbatim
  pushNotifications.ts, visitLocation.ts   # copied verbatim
src/state/
  session.tsx                 # sign-in/sign-out only (no self-signup)
  profile.tsx                  # caregiver-only profile fields + on-duty toggle
  homecare.tsx                  # visit queue/claim/status/cancel + dependent lookup
  notifications.tsx             # in-app inbox — copied/adapted
src/screens/
  auth/SplashScreen.tsx, SignInScreen.tsx
  queue/QueueScreen.tsx, VisitDetailScreen.tsx
  notifications/NotificationsScreen.tsx
  profile/ProfileScreen.tsx
```

## Interaction design

Every tappable surface gives real feedback rather than a flat state change:

- **Press feedback** — `Card`, `PrimaryButton`, `OutlineButton`, `InlineButton`, `Chip`, `OptionChip`, `ListRow`, and the tab bar all spring down slightly on press and back on release (`src/components/motion.tsx#usePressScale`, core `Animated` API — no Reanimated install needed).
- **A real sliding toggle** — `Toggle` (on-duty switch) animates its thumb position and track color instead of jumping between two fixed states.
- **Live pulse indicators** — a looping "breathing" dot (`motion.tsx#Pulse`) marks anything currently live: on-duty status, the location-sharing banner, unread notifications.
- **Status stepper** — the visit detail screen shows the lifecycle (Matched → En route → In progress → Done) as a connected row of steps that fill in as the caregiver advances, instead of just a text label.
- **Entrance animation** — new queue cards, notifications, and profile sections fade + rise in once on mount (`motion.tsx#FadeInUp`), staggered slightly per item; existing items don't re-animate on every poll since they're keyed by a stable id.
- **Haptics** — light tap feedback on every action (claim, toggle, advance status, refresh), success/warning haptics on the outcome (`src/lib/haptics.ts`). Silently no-ops on web/simulators that don't support it.

## Known dev-sandbox quirk (fixed here)

VisitDetailScreen used to re-fetch the visit by id (`home_care_visits`
`select('*').eq('id', ...)`) when opened, which came back as a PostgREST
500 against the shared dev sandbox and left the screen permanently blank
(the failed fetch just left `visit` as `null`). It's fixed by not
re-fetching at all: QueueScreen already has the full visit row from
`my_caregiver_queue()`, so it's passed straight through as a navigation
param and VisitDetailScreen renders from that. `fetchHomeCareVisit` is
still in `state/homecare.tsx` as a documented, unused fallback for a
future entry point that only has an id — the underlying 500 should get
tracked down server-side before wiring that back in.

Also: the "Open requests" section is gone from the Queue screen. This
org's visits all arrive already `matched` — patients book a specific
staff member's slot directly (`staff_slot_id`) rather than dropping a job
into an open pool — so that section was always empty, not broken. The
open-claim functions (`fetchOpenHomeCareRequests`, `claimHomeCareVisit`)
are still in `state/homecare.tsx` for whichever org, or whichever future
flow on this one, actually uses that pool.

## Setup

```bash
npm install
cp .env.example .env   # fill in the same Supabase URL/anon key the patient app uses
npx expo start
```

Requires the same `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
as the patient app — caregivers are rows in the same `public.profiles` table
(`role = 'caregiver'`), not a separate backend or auth system.

To sign in as a caregiver for testing, an admin needs to have created an
account via `create_staff_member(...)` with `role='caregiver'` and a
`caregiver_type` set.
