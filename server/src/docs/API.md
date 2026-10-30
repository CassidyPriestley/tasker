# API Reference

Base URL (local development): `http://localhost:4000`

## Authentication

Most endpoints require authentication via an `httpOnly` cookie named `token`, set automatically on login. There is no `Authorization` header — the cookie is sent automatically by the browser (or by Postman, if "send cookies" is enabled) on every request to this API.

Unauthenticated requests to protected routes return:

```json
{ "message": "No token provided" }
```
`401 Unauthorized`

## Error Response Shape

Every error response follows the same shape:

```json
{ "message": "A human-readable description of what went wrong" }
```

Common status codes used throughout this API:

| Code | Meaning |
|---|---|
| 200 | Success |
| 201 | Resource created |
| 400 | Validation error / bad input |
| 401 | Missing or invalid authentication |
| 404 | Resource not found |
| 409 | Conflict (duplicate entry) |
| 429 | Rate limit exceeded |
| 500 | Server error |

## Rate Limiting

- Auth routes (`/auth/*`): 10 requests per 15 minutes per IP.
- All other routes: 300 requests per 15 minutes per IP.

Exceeding a limit returns `429` with `{ "message": "Too many attempts, please try again later" }` (auth) or `{ "message": "Too many requests, please try again later" }` (general).

---

## Auth

### `POST /auth/register`
Creates a new user account.

**Body:**
```json
{
  "email": "user@example.com",
  "username": "myusername",
  "password": "at least 8 characters"
}
```

**201 Created**
```json
{ "message": "User successfully created", "userId": 1 }
```

**Errors:**
- `400` — validation failure (invalid email, username too short/long/invalid characters, password too short)
- `409` — `"This email is already registered"` or `"This username is already registered"`

---

### `POST /auth/login`
Logs in and sets the `token` cookie.

**Body:**
```json
{ "email": "user@example.com", "password": "yourpassword" }
```

**200 OK**
```json
{ "message": "User successfully logged in" }
```
Sets a `Set-Cookie: token=...` header (httpOnly, 1 hour expiry).

**Errors:**
- `404` — `"User not found"` (no account with that email)
- `401` — `"Invalid password or email"`

---

### `POST /auth/logout`
Clears the `token` cookie. No body required.

**200 OK**
```json
{ "message": "User successfully logged out" }
```

---

## Users

All routes below require authentication.

### `GET /users/me`
Returns the logged-in user's profile.

**200 OK**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "myusername",
    "avatar_url": "https://res.cloudinary.com/.../avatars/xyz.jpg",
    "created_at": "2026-01-01T00:00:00.000Z",
    "updated_at": "2026-01-01T00:00:00.000Z"
  }
}
```
Note: `avatar_url` is `null` if no avatar has been uploaded. `password_hash` is never included.

---

### `PUT /users/me/username`
**Body:** `{ "username": "newusername" }`
Rules: 3–23 characters, letters/numbers/underscores only.

**200 OK** → `{ "message": "Username updated successfully" }`
**Errors:** `400` validation, `409` `"That username is already taken"`

---

### `PUT /users/me/email`
**Body:** `{ "email": "new@example.com" }`

**200 OK** → `{ "message": "Email updated successfully" }`
**Errors:** `400` invalid email format, `409` `"That email is already taken"`

---

### `PUT /users/me/password`
**Body:**
```json
{ "current_password": "oldpassword", "new_password": "newpassword123" }
```

**200 OK** → `{ "message": "Password successfully updated" }`
**Errors:** `401` `"Invalid password"` (wrong current password), `400` new password under 8 characters

---

### `DELETE /users/me`
Permanently deletes the account. **This cascades** — all of the user's habits, tasks, and habit logs are deleted too.

**Body:** `{ "password": "yourpassword" }`

**200 OK** → `{ "message": "Account successfully deleted" }`
**Errors:** `401` `"Invalid password"`

---

### `POST /users/me/avatar`
Uploads a profile picture. Sent as `multipart/form-data`, not JSON — the file goes under the field name `avatar`.

Accepted types: JPEG, PNG, WEBP. Max size: 5MB.

**200 OK**
```json
{
  "message": "Avatar uploaded successfully",
  "avatarUrl": "https://res.cloudinary.com/.../avatars/xyz.jpg"
}
```
**Errors:** `400` — no file attached, disallowed file type, or file over 5MB

Uploading again when an avatar already exists **replaces** it — there's no separate "update" endpoint.

---

### `DELETE /users/me/avatar`
Removes the current avatar (sets it back to `null`). No body required.

**200 OK** → `{ "message": "Avatar removed successfully" }`

---

## Tasks

All routes below require authentication. A task's owner is always scoped to the logged-in user — one user can never see or modify another user's tasks.

### `POST /tasks`
**Body:**
```json
{
  "title": "Buy groceries",
  "task_description": "Milk, eggs, bread",
  "priority": "medium",
  "due_date": "2026-10-15",
  "habit_id": null
}
```
Only `title` is required. `priority` defaults to `"medium"` (`low` | `medium` | `high`). `habit_id` links the task to a habit it was generated from (optional, usually left out when creating a task manually).

**201 Created** → `{ "message": "Task successfully created", "taskId": 1 }`
**Errors:** `400` validation, `400` `"Reference habit does not exist"` if `habit_id` is invalid

---

### `GET /tasks`
Optional query params: `?status=pending|in_progress|completed` and `?priority=low|medium|high`.

**200 OK** → `{ "tasks": [ { ...task }, ... ] }`

---

### `GET /tasks/:id`
**200 OK** → `{ "task": { ... } }`
**Errors:** `400` invalid id, `404` not found

---

### `PUT /tasks/:id`
Partial update — send only the fields you want to change. At least one field is required.

**Body (any combination of):**
```json
{ "title": "...", "task_description": "...", "priority": "high", "due_date": "2026-10-20", "habit_id": null }
```

**200 OK** → `{ "message": "Task successfully updated" }`
**Errors:** `400` empty body or invalid id, `404` not found

---

### `PUT /tasks/:id/status`
**Body:** `{ "status": "pending" | "in_progress" | "completed" }`

**200 OK** → `{ "message": "Task status successfully updated" }`
**Errors:** `400` invalid status/id, `404` not found

---

### `DELETE /tasks/:id`
**200 OK** → `{ "message": "Task successfully deleted" }`
**Errors:** `400` invalid id, `404` not found

---

## Habits

All routes below require authentication.

### `POST /habits`
**Body:**
```json
{
  "title": "Workout",
  "description": "40 minutes, full body",
  "frequency": "range",
  "days": ["monday", "tuesday", "thursday", "friday"],
  "generates_task": true,
  "target_streak": 30,
  "color": "#FF5733",
  "icon": "dumbbell"
}
```
Only `title` is required. `frequency` is `"daily"` or `"range"` (defaults to `"daily"`). `days` is an array of lowercase day names (`sunday`–`saturday`) and is **required** when `frequency` is `"range"`. `generates_task` defaults to `false`.

**201 Created** → `{ "message": "Habit successfully created", "habitId": 1 }`
**Errors:** `400` validation (including missing `days` when `frequency` is `"range"`)

---

### `GET /habits`
Optional query params: `?frequency=daily|range`, `?generates_task=true|false`, `?include_archived=true`.

**200 OK**
```json
{
  "habits": [
    { "id": 1, "title": "Workout", "frequency": "range", "days": ["monday", "tuesday"], ... }
  ]
}
```
Note: `days` is derived for display — the database stores it internally as a bitmask, but that detail never appears in the API.

---

### `GET /habits/:id`
**200 OK** → `{ "habit": { ..., "days": [...] } }`
**Errors:** `400` invalid id, `404` not found

---

### `PUT /habits/:id`
Partial update — at least one field required. Same body shape as `POST /habits`.

**200 OK** → `{ "message": "Habit successfully updated" }`
**Errors:** `400` empty body, invalid id, or missing `days` when changing `frequency` to `"range"`; `404` not found

---

### `PATCH /habits/:id/archive`
Soft-deletes the habit (sets `archived_at`). Archived habits are excluded from `GET /habits` by default.

**200 OK** → `{ "message": "Habit successfully archived" }`
**Errors:** `404` not found or already archived

---

### `PATCH /habits/:id/restore`
Un-archives a previously archived habit.

**200 OK** → `{ "message": "Archived habit successfully restored" }`
**Errors:** `404` — habit doesn't exist, or was never archived

---

### `DELETE /habits/:id`
Permanently deletes the habit. Cascades to its habit logs.

**200 OK** → `{ "message": "Habit deleted successfully" }`
**Errors:** `400` invalid id, `404` not found

---

### `POST /habits/:id/generate-task`
Creates a new task from this habit (title and description copied over, due date set to today). Only works if the habit has `generates_task: true` and is not archived.

**201 Created** → `{ "message": "Task successfully generated from habit", "taskId": 1 }`
**Errors:**
- `400` — `"This habit is not set up to generate tasks"` (if `generates_task` is `false`)
- `404` — habit not found or archived

---

## Habit Logs

All routes below require authentication. A habit log records one completed instance of a habit on a specific date.

### `POST /habits/:id/logs`
**Body:** `{ "completed_at": "2026-09-23" }` — optional, defaults to today's date if omitted. Must be `YYYY-MM-DD`.

**201 Created** → `{ "message": "Habit log successfully created", "habitLogId": 1 }`
**Errors:**
- `400` — invalid habit id, malformed/invalid date, or `"Referenced habit does not exist"`
- `409` — `"This habit is already logged for that date"` (one log per habit per day)

---

### `GET /habits/:id/logs`
Optional query params: `?start=2026-09-01&end=2026-09-30` to filter by date range.

**200 OK** → `{ "logs": [ { "id": 1, "habit_id": 1, "completed_at": "2026-09-23", ... } ] }`
**Errors:** `400` invalid habit id

---

### `GET /habits/:id/logs/count`
Returns the total number of logs for a habit (all-time).

**200 OK** → `{ "count": 12 }`
**Errors:** `400` invalid habit id

---

### `DELETE /habits/logs/:logId`
Deletes a single habit log by its own id (not nested under a specific habit's id in the URL).

**200 OK** → `{ "message": "Habit log successfully deleted" }`
**Errors:** `400` invalid log id, `404` not found

---

## Notes for Frontend Implementation

- **Cookies, not tokens-in-headers**: don't store the JWT yourself or add an `Authorization` header — just make sure requests are sent with credentials (e.g. `fetch(url, { credentials: "include" })` or Axios's `withCredentials: true`), and the browser handles the rest.
- **CORS**: the backend only accepts requests from `http://localhost:3000` in development (configurable in `app.ts`). Update this when deploying.
- **Days, not numbers**: when building habit forms, always send/receive `days` as an array of day names (`["monday", "friday"]`). The bitmask is an internal storage detail and never appears in any request or response.
- **File uploads** (`POST /users/me/avatar`) must be sent as `multipart/form-data`, not JSON — use `FormData` on the frontend.
