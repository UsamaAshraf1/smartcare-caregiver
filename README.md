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

## New in this pass: spec revision 2026-09-16

Five previously-"needs backend work" items got built and are now wired in,
without touching anything already working:

- **Patient medical basics + contact** — `VisitDetailScreen` now calls
  `get_home_care_patient_info(p_visit_id)` (spec §6) while a visit is
  matched/en_route/in_progress, and shows blood type, conditions,
  allergies, and Call/Email buttons (`tel:`/`mailto:`). Replaces the old
  "not available yet" note. Access lapses server-side once a visit is
  completed/cancelled — the screen shows a plain note instead of an error
  in that case, matching the spec's own intent (data minimization, not a
  bug to route around).
- **Structured vitals** — a new **Vitals** screen (`src/screens/queue/VitalsScreen.tsx`),
  reached from a "Record vitals" button that only shows while a visit is
  `in_progress` (matching the RLS insert rule). Records to and reads from
  the new `home_care_visit_vitals` table (spec §9).
- **Self-service scheduling** — a new **Schedule** screen (`src/screens/schedule/ScheduleScreen.tsx`),
  reached from Profile → "My schedule". Manage recurring weekly
  availability (`home_care_schedule_templates`), generate concrete
  bookable slots from it (`generate_home_care_slots`), and see upcoming
  slots and their status (spec §10).
- **Own rating** — Profile now shows average rating and rated-visit count
  via `get_my_caregiver_rating()` (spec §11).
- **Caregiver push notifications** — no app-side call needed (the spec
  confirms the existing inbox/push pipeline just receives new `kind`
  values now); `NotificationsScreen`'s icon mapping was updated to the
  exact confirmed strings (`homecare_new_job`, `homecare_assigned`,
  `homecare_cancelled`) so the right icon shows instead of falling back
  to a generic bell.

Two real bugs got caught and fixed while wiring this up, both because the
fuller spec revision included actual request/response examples: **both**
`get_home_care_patient_info` **and** `get_my_caregiver_rating` return a
row *set* (a PostgREST array — one row when entitled, `[]` when not) —
not a single object like the first spec description implied. Both are
now unwrapped correctly (`state/homecare.tsx`). Also: `conditions` and
`allergies` on the patient-info response are each an array of strings,
not one combined string — fixed in both the type and the rendering.

Explicitly **not** touched: background location tracking, map UI, and
location history — still flagged "needs a product decision" in the spec
itself (map provider, ping interval, retention), so still out of scope
here on purpose, same as the crash-fix pass before it.

## Pre-pilot pass: 2026-09-30

Four gaps from the feature-checklist review, where the backend was ready
but the app wasn't using it yet:

- **Caregiver-only access** — both apps share one GoTrue instance, so a
  patient's credentials sign in here too. `RootNavigator` (`App.tsx`) now
  checks `profiles.role` and shows `NotCaregiverScreen` (with sign-out) for
  anything that isn't `'caregiver'` — the mirror of the patient app's
  block screen. Splash holds while the profile loads, so there's no flash
  of the caregiver tabs first.
- **Service name on visits** — queue cards and visit detail now show what
  the job actually is (e.g. "Blood draw at home · 30 min"), from
  `home_care_services`, fetched once per session and cached
  (`fetchHomeCareServices` in `state/homecare.tsx`).
- **Push behaves properly** — a foreground handler
  (`configureForegroundNotifications`) so pushes that arrive while the app
  is open actually show; tapping a push (cold start or background) or an
  inbox row opens that visit, via `lib/notificationRouting.ts`. The visit is
  resolved from `my_caregiver_queue()` rather than the by-id fetch that 500s
  on the sandbox; a visit no longer in the queue lands on the inbox instead.
  The inbox also refreshes the moment a push arrives. Native only — no
  pushes on web.
- **Profile phone & email** — read and shown on Profile. `create_staff_member`
  doesn't copy the email onto `profiles.email`, so it falls back to the
  sign-in email.

## Directions: map, ETA and navigation — 2026-09-30

Built on the patient-side backend work (infra migrations 036 and 037):
every visit now carries the patient's pinned destination
(`dest_lat`/`dest_lng`/`dest_approx`), and, while the patient's tracking
screen is open, a routed ETA and road shape (`route_eta_minutes`,
`route_polyline`, `route_updated_at`).

While a visit is matched or en route, the visit screen shows a
**Directions** card:

- **Map** (`src/components/VisitMap.tsx`, `react-native-maps` 1.20.1, same
  as the patient app): the caregiver's own position, the patient's pin, and
  the road route when a fresh one exists (under 3 min old), else a dashed
  straight line. iOS uses Apple Maps (no key). Android needs
  `GOOGLE_MAPS_ANDROID_API_KEY` at build time (see `app.config.js`); without
  it the map is skipped on Android rather than showing a blank grid. No map
  on web.
- **Distance / ETA** — the routed ETA when fresh, otherwise the same rough
  estimate the patient sees (`src/lib/eta.ts`, a copy of the patient app's,
  kept identical on purpose).
- **Navigate** — Google Maps, Waze and (on iOS) Apple Maps, to the exact pin,
  or a text-address search for visits booked before pins existed
  (`src/lib/navigation.ts`).
- A plain note that location sharing pauses in another app: background
  tracking is descoped, so this is expected behavior, not a bug.

Adding `react-native-maps` is a native change: a new EAS build is needed
before this shows up on devices.

## Past visits and saved notes: 2026-09-30

- **Past visits** — a new screen (`src/screens/queue/PastVisitsScreen.tsx`),
  reached from the Queue screen's "Past visits" link and from Profile. It
  lists completed and cancelled visits, newest first (latest 50), with the
  service, fee, the patient's rating and any cancellation reason. There's no
  RPC for this, so it reads `home_care_visits` directly, which RLS allows
  for the visit's own caregiver. That path depends on migration 033's
  recursion fix being live, and it shows a "couldn't load" note on error
  rather than an empty list. Tapping a visit opens the usual visit detail,
  which for a finished visit now shows its note, rating or cancellation
  reason read-only.
- **Visit notes survive leaving the screen** — the in-progress note is saved
  on the device as it's typed (`src/lib/visitNotesDraft.ts`) and restored on
  return, including after the app is killed. It still reaches the server
  only with "Complete visit": the backend has no call that saves notes on
  their own (`notes` is only the optional `p_notes` of
  `update_home_care_visit_status`). Saving to the server mid-visit, so the
  note is safe if the phone is lost or the caregiver switches devices,
  needs a small new backend RPC.

## Crash fix: en_route → in_progress ("I've arrived")

Tapping "I've arrived" while sharing location could crash the app. Root
cause was two related issues in the location-tracking code, both fixed:

1. `openVisitLocationBroadcaster`'s `close()` never reset its internal
   `ready` flag, so a GPS ping already in flight when the channel tears
   down could still try to `send()` on it.
2. Neither that `send()` call nor the cleanup that stops the location
   watcher (`watchRef.current?.remove()`) nor the channel teardown
   (`broadcasterRef.current?.close()`) were wrapped in try/catch. Any of
   those throwing synchronously inside a `useEffect`, with no error
   boundary anywhere in the app, had nowhere to go but a hard crash.

Fixed in `src/lib/visitLocation.ts` (every channel call now try/catch-
wrapped, `ready` reset on close) and `src/screens/queue/VisitDetailScreen.tsx`
(the stop/start logic consolidated into one `stopLocationTracking()`
helper, itself wrapped, plus a check for the case where the visit status
changes while the async permission/watch setup is still in flight).

Also added `src/components/ErrorBoundary.tsx`, wrapping the whole app in
`App.tsx` — a general safety net so a future error like this degrades to
a "Try again" screen instead of a hard crash. It only catches render/
lifecycle errors, not async or event-handler errors (React's error
boundaries never do) — which is exactly why the try/catch fixes above
still matter on their own.

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
