# Task Manager & Habit Tracker — Backend

A REST API for managing tasks and habits, built with Express, TypeScript, and MySQL. Supports habit scheduling by day of week, automatic task generation from habits, habit completion logging, and avatar uploads via Cloudinary.

**Full API reference:** [src/docs/API.md](./src/docs/API.md)

This is the backend for Tasker. The mobile app lives in [`../client`](../client/README.md).

## Tech Stack

- **Runtime:** Node.js, Express 5
- **Language:** TypeScript
- **Database:** MySQL (via `mysql2`)
- **Auth:** JWT in httpOnly cookies, bcrypt password hashing
- **Validation:** Zod
- **File uploads:** Multer + Cloudinary
- **Testing:** Jest + Supertest
- **Security:** Helmet, CORS, express-rate-limit

## Features

- Email/password authentication with rate-limited login and signup
- Full CRUD for tasks, with status tracking and priority levels
- Habits with daily or custom day-of-week scheduling
- Automatic task generation from habits
- Habit completion logging with date-range filtering and streak counts
- User profile management, including avatar upload
- Account deletion cascades to all owned habits, tasks, and logs
- Removing an avatar also deletes the image from Cloudinary
- Ownership checks: every query is scoped to the logged-in user, including habit IDs linked to tasks and logs

## Getting Started

### Prerequisites

- Node.js (v18+)
- MySQL running locally or accessible remotely
- A [Cloudinary](https://cloudinary.com) account (free tier is sufficient) for avatar uploads

### Installation

```bash
git clone <your-repo-url>
cd tasker/server
npm install
```

### Environment Variables

Create a `.env` file in the `server/` root:

```
DB_HOST=localhost
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=your_database_name
JWT_SECRET=a_long_random_secret_string
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
PORT=4000   # optional, defaults to 4000
```

`.env` is listed in `.gitignore`, so your secrets never get committed.

### Database Setup

The API needs four tables: `users`, `habit`, `task`, and `habit_log`. See [src/docs/API.md](./src/docs/API.md) for the fields each one stores.

<!-- TODO: export the schema with
     mysqldump --no-data -u <user> -p <database> > schema.sql
     commit server/schema.sql, then replace this section with:
     mysql -u <user> -p <database> < schema.sql -->

Create a database, then run the `CREATE TABLE` statements for those four tables against it.

### Running the Server

```bash
npm run dev     # development, with auto-restart
npm run build   # compile TypeScript
npm start       # run the compiled build
```

The server runs on `http://localhost:4000` by default.

## Testing

111 tests cover auth, users, avatars, tasks, habits, and habit logs.

```bash
npm test
```

Tests run against a **separate test database**, so they never touch your development data:

1. Create a second MySQL database whose name ends in `_test` (e.g. `tasker_api_test`) with the same tables.
2. Create `server/.env.test` with the same keys as `.env`, pointing `DB_NAME` at the test database. Fake Cloudinary values are fine there.
3. Run `npm test`.

`jest.setup.ts` loads `.env.test` before anything else, and `src/database/db.ts` refuses to start in test mode unless `DB_NAME` ends in `_test`. Each suite creates its own test users and deletes them afterwards. Cloudinary calls are mocked, so no real uploads happen and no credits are used.

## Project Structure

```
src/
├── controllers/   # Request handlers
├── routes/        # Express route definitions
├── schemas/       # Zod validation schemas
├── middleware/    # Auth, validation, rate limiting, uploads, error handling
├── types/         # TypeScript interfaces
├── utils/         # Shared helpers (day-of-week bitmask, custom errors, ownership checks, Cloudinary)
├── docs/          # API.md: full endpoint reference
├── database/      # MySQL connection pool
├── __tests__/     # Jest + Supertest test suites
├── app.ts         # Express app setup
└── server.ts      # Server entry point
```
