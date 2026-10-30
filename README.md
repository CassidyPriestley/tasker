# Tasker

A mobile task and habit tracker with streaks, built with **Expo (React Native)** and an **Express + MySQL** API.

Plan your day on one screen: check off habits to grow your streaks, finish today's tasks, and turn habits into tasks with one tap. The app has a dark "luxe" look with glowing accents and a slowly drifting aurora background.

<!--
  TODO screenshots: take them in the iOS Simulator (Cmd+S), save them in docs/screenshots/,
  then delete this comment and the comment markers around the block below.
-->
<!--
<p align="center">
  <img src="docs/screenshots/today.png" alt="Today screen" width="250" />
  <img src="docs/screenshots/habits.png" alt="Habits screen" width="250" />
  <img src="docs/screenshots/habit-sheet.png" alt="Edit habit sheet" width="250" />
</p>
-->

## Features

**Today**
- Personal greeting, a week strip, and a progress ring for the day
- Every habit scheduled for today and every task due today, with overdue tasks first
- Check things off with one tap. The screen updates instantly and rolls back if the server fails

**Tasks**
- Create, edit, and delete tasks with a priority and a due date
- Filter by All, To do, or Done

**Habits**
- Daily habits or habits on chosen weekdays
- Pick a color, an icon, and an optional streak goal (7, 21, 30, or 100 days)
- Streaks and a weekly progress view on every habit card
- Archive and restore habits; deleting forever asks for confirmation
- Optionally turn a habit into a task for today

**Account**
- Sign up and log in (secure httpOnly cookie sessions)
- Profile photo: pick, crop, and upload from your photo library (stored on Cloudinary)

## Tech stack

| | |
|---|---|
| **Client** | Expo SDK 57, React Native 0.86, Expo Router, TypeScript, Reanimated, React Native SVG, expo-image-picker, axios |
| **Server** | Node.js, Express 5, TypeScript, MySQL (`mysql2`), Zod, JWT + bcrypt, Multer + Cloudinary, Helmet, express-rate-limit, Pino |
| **Testing** | Jest + Supertest: 111 API tests |

## Project structure

```
tasker/
├── client/   # Expo app (iOS / Android). See client/README.md
└── server/   # REST API. See server/README.md
```

## Getting started

You need **Node.js 18+**, a running **MySQL** server, and a free **Cloudinary** account (for profile photos).

1. **Start the API first.** Follow [server/README.md](server/README.md): install, create `server/.env`, set up the database, then `npm run dev`. It runs on `http://localhost:4000`.
2. **Then start the app.** Follow [client/README.md](client/README.md): `npm install`, then `npx expo start`, and open it in the iOS Simulator or Expo Go.

## Testing

The API has 111 tests covering auth, users, avatars, tasks, habits, and habit logs. They run against a separate `_test` database (with a guard that refuses any other database), and Cloudinary is mocked so no real uploads happen.

```bash
cd server
npm test
```

## Security highlights

- Passwords hashed with bcrypt; sessions in httpOnly cookies, so JavaScript can't read the token
- Every query is scoped to the logged-in user, and linked habit IDs are checked for ownership
- Login returns the same error for a wrong email or a wrong password, so it doesn't reveal which emails have accounts
- Request validation with Zod, rate limiting on auth routes, and security headers with Helmet
- Uploads limited to JPEG, PNG, and WEBP up to 5 MB

## Roadmap

- Deploy the API and database, and ship the app with EAS Build
- Edit username, email, and password from inside the app (the API already supports it)
- A stats screen with streak history
- Reminder notifications
