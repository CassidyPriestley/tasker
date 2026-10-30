# Task Manager & Habit Tracker — Backend

A REST API for managing tasks and habits, built with Express, TypeScript, and MySQL. Supports habit scheduling by day of week, automatic task generation from habits, habit completion logging, and avatar uploads via Cloudinary.

**Full API reference:** [docs/API.md](./docs/API.md)

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

## Getting Started

### Prerequisites

- Node.js (v18+)
- MySQL running locally or accessible remotely
- A [Cloudinary](https://cloudinary.com) account (free tier is sufficient) for avatar uploads

### Installation

```bash
git clone <your-repo-url>
cd server
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
```

### Database Setup

Run the `CREATE TABLE` statements for `users`, `habit`, `task`, and `habit_log` against your MySQL database (see schema definitions in the codebase or `docs/API.md` for field details).

### Running the Server

```bash
npm run dev     # development, with auto-restart
npm run build   # compile TypeScript
npm start       # run the compiled build
```

The server runs on `http://localhost:4000` by default.

## Testing

Tests run against a **separate test database** so they never touch your development data.

1. Create a second MySQL database (e.g. `tasker_api_test`) with the same schema.
2. Create a `.env.test` file alongside `.env`, pointing `DB_NAME` at the test database.
3. Run:

```bash
npm test
```

Cloudinary calls are mocked during tests — no real uploads happen and no credits are used.

## Project Structure

```
src/
├── controllers/   # Request handlers
├── routes/        # Express route definitions
├── schemas/       # Zod validation schemas
├── middleware/    # Auth, validation, rate limiting, uploads, error handling
├── types/         # TypeScript interfaces
├── utils/         # Shared helpers (day-of-week bitmask, custom errors, etc.)
├── database/      # MySQL connection pool
├── __tests__/     # Jest + Supertest test suites
├── app.ts         # Express app setup
└── server.ts      # Server entry point
```
