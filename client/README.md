# Tasker — Mobile App

The Expo (React Native) app for Tasker. It talks to the API in [`../server`](../server/README.md).

## Prerequisites

- **Node.js 18+**
- **The API running** on `http://localhost:4000` (see [server/README.md](../server/README.md))
- One of:
  - **iOS Simulator** (comes with Xcode on a Mac), or
  - **Expo Go** on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))

## Getting started

```bash
cd client
npm install
npx expo start
```

Then press **`i`** to open the iOS Simulator, or scan the QR code with Expo Go.

> Always add packages with `npx expo install <package>` instead of `npm install`. It picks the version that matches this Expo SDK.

## Connecting to the API

The API address lives in [`src/lib/api.ts`](src/lib/api.ts) as `BASE_URL`:

| Where the app runs | Address to use |
|---|---|
| iOS Simulator | `http://localhost:4000` (default) |
| Android Emulator | `http://10.0.2.2:4000` (default) |
| A real phone (Expo Go) | `http://<your computer's IP>:4000` |

For a real phone, `localhost` would mean the phone itself, so it can't reach your computer. Find your Mac's IP with `ipconfig getifaddr en0`, put it in `LAN_IP`, and switch `BASE_URL` to use it. Your phone and computer must be on the same Wi-Fi.

## Scripts

| Command | What it does |
|---|---|
| `npx expo start` | Start the dev server |
| `npm run ios` / `npm run android` | Start and open a simulator/emulator |
| `npm run lint` | Lint with ESLint |
| `npx tsc --noEmit` | Type-check without building |

## Project structure

```
src/
├── app/                # Screens. Expo Router turns every file here into a route
│   ├── _layout.tsx     # Root: fonts, theme, auth gate (logged in → tabs, else → auth)
│   ├── (auth)/         # Login and register
│   └── (tabs)/         # Today (index), Tasks, Habits + the custom tab bar layout
├── components/
│   ├── auth/           # AuthShell and the animated aurora background
│   ├── habits/         # HabitCard, HabitSheet (create/edit), color and icon options
│   ├── tasks/          # TaskItem, TaskSheet (create/edit), FilterChips
│   ├── today/          # ProgressRing, WeekStrip, CheckRow, GlassCard, AvatarButton
│   └── ui/             # Shared building blocks: GlowPillButton, LuxInput, GlowTabBar…
├── constants/          # glowColors (the only color palette) and fonts
├── context/            # AuthContext (current user) and ThemeContext (theme tokens)
├── hooks/              # use-today, use-tasks, use-habits: data loading + actions
├── lib/
│   ├── api.ts          # axios instance, BASE_URL, error handling, auto-logout on 401
│   ├── services/       # One file per API area (auth, users, tasks, habits, habitLogs)
│   └── dates.ts        # Local-timezone date helpers and streak math
└── types/              # Shared TypeScript types matching the API
```

## How it's built

- **Screens stay thin.** Each tab gets its data and actions from a hook (`use-today`, `use-tasks`, `use-habits`), and the hooks call small service functions in `lib/services/`.
- **Optimistic updates.** Checking off a habit or task updates the screen right away. If the request fails, it rolls back and shows the error.
- **Auth.** The API sets an httpOnly cookie. On any 401 response, `api.ts` logs the user out and the root layout sends them to the login screen.
- **Dates are local.** `lib/dates.ts` builds `YYYY-MM-DD` strings in the phone's timezone instead of using `toISOString()` (UTC), so evening check-offs don't land on tomorrow.
- **One sheet for create and edit.** `TaskSheet` and `HabitSheet` get a new `key` each time they open, which resets their form state.
- **Design.** Dark "luxe" theme: colors only from `constants/glowColors.ts` (Today = green, Tasks = orange, Habits = blue), Bodoni Moda headings, Manrope body text. The aurora background is drawn with SVG radial gradients and animated with Reanimated. It stays still when Reduce Motion is on.
