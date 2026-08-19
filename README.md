# Moving the Needle

Starting a project is easy; restarting one is not. After a few days away a project stops being a
set of concrete moves and becomes an undefined blob, and the instinct is to re-plan it rather than
resume it — which feels like progress and reliably prevents it. This app has one job: after any
gap, tell you the one physical thing to do next, and give you no surface on which to re-plan
instead. Its second job is to accumulate an honest record of what you actually did, because that
record is the evidence against the story that you never finish anything. Bad days are normal here:
a ten-minute floor session is logged exactly like a two-hour one, and a gap is reported as a plain
fact in the same colour as everything else.

## Using it

Open it, read the next action on the card, press **Start**. Work. Press **Finish**, and write down
what you did, what broke, and what you do next. That last field is the whole point — it is the
only place in the app where the next action can be set.

If a project has been untouched for three days or more, the button reads **Restart** and opens a
five-step cold start instead: open the project, re-run the last thing that worked, read your last
entry, read the next action, do it for ten minutes. There are no exits from that screen except
finishing it.

Tapping the body of a card (anywhere but **Start**) opens that project's own page: its river
larger, its next action, and its full log. Archiving lives at the bottom of that page.

Close-out cannot be dismissed, but it can be abandoned. **Discard this session** at the bottom
throws the whole thing away — no entry, no draft, and your previous next action left exactly as it
was. It is the only way out, and it is deliberately the quietest thing on the screen.

## Note to future maintainers

**The absence of an edit button for `nextAction` is the feature. Do not add one.**

`nextAction` is written in exactly two functions, both in `src/data.ts`: `createProject` and
`closeOut`. Nothing else in the codebase assigns to it. Verify with:

```bash
grep -rn "nextAction" src --include=*.ts --include=*.tsx
```

If you are here to add an edit affordance because it felt inconvenient once — the inconvenience is
load-bearing. A next action you can revise outside a session is a next action you will re-plan.

## Deliberately excluded

None of the following are missing by accident. Each was considered and left out.

- Project planning, phases, roadmaps, milestones, deadlines
- Task lists, subtasks, dependencies, priorities, tags, statuses
- Streaks, scores, XP, badges, achievements, charts, analytics
- Notifications, reminders, push, email
- Accounts, login, backend, sync, multi-user
- Onboarding tour, tooltips, empty-state illustrations
- Dark/light toggle, theme settings, font settings
- Any screen that lets you change `nextAction` outside close-out
- Configurable anything: no thresholds, no categories, no durations to tune. Every such value is
  hardcoded, because a setting is a thing to fiddle with instead of working.

## The boat

Every project card carries its own boat on its own stretch of river. A boat has no distance
number, progress bar, destination, milestone, unlockable, or customisation, and it never moves
backwards. Its position is that project's `completedSessions * STEP` and nothing else — `src/river.ts`
does not read a date, a gap, or a session's duration, so a ten-minute floor session moves a boat
exactly as far as a hundred-minute one. A faint marker sits where the boat was before the most
recent session, so the last move is visible without counting anything.

> The moment distance becomes a number it becomes a score, and a score across projects becomes a
> reason to abandon the one that's behind. The boat shows movement; that is all it is for.

## Data

Everything is local. Text (projects, log entries, parking) lives in one versioned JSON blob in
`localStorage`; photos and their thumbnails live in IndexedDB. There is no server and nothing
leaves the device.

Settings has **Export**, which produces `moving-the-needle-backup-YYYY-MM-DD.zip` containing
`data.json` and an `images/` folder of the full-size photos, and **Export text only** for a quick
lightweight `.json`. **Import** replaces everything; thumbnails are regenerated from the full-size
images on the way in.

## Development

```bash
npm install
npm run dev
```

```bash
npm run build
```

`npm run icons` regenerates the PWA icons from `scripts/make-icons.mjs` (a hand-rolled PNG
encoder, so the project keeps no image toolchain). `build` runs it, typechecks, and then builds.

### The base path

Vite needs to know the URL prefix the app will be served from, and a wrong value produces a blank
white page rather than an error: `index.html` requests its assets under the wrong prefix, they
404, and nothing runs. `vite.config.ts` picks it automatically — `/moving-the-needle/` when
`GITHUB_ACTIONS` is set (Pages serves projects from a sub-path), `/` everywhere else, which covers
Vercel, Netlify, and `vite preview`. Set `BASE_PATH` to override both if a host needs some other
prefix.

Stack: Vite, React, TypeScript, one CSS file, and `fflate` for the export zip. No router, no state
library, no date library, no component library, no design system.
