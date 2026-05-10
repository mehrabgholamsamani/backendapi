# backendapi

TypeScript Express API with authentication and role/permission authorization.

## Features

- Register, login, and current-user endpoints
- JWT access tokens
- Refresh-token sessions with rotation and logout
- Bcrypt password hashing
- Role and permission authorization middleware
- Admin user management for roles, account status, and deletion
- Password reset tokens with one-time use and session revocation
- Helmet, CORS, JSON body limits, request logging, and rate limiting
- Zod request validation
- Local JSON user store for easy development
- Vitest/Supertest API tests

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Set a strong `JWT_SECRET` in `.env` before using this outside local development.

## Scripts

```bash
npm run dev        # start with tsx watch
npm run build      # compile TypeScript to dist
npm start          # run compiled server
npm test           # run API tests
npm run typecheck  # type-check without emitting
```

## Routes

### `GET /health`

Returns API health.

### `POST /auth/register`

```json
{
  "email": "person@example.com",
  "name": "Person",
  "password": "password123"
}
```

### `POST /auth/login`

```json
{
  "email": "person@example.com",
  "password": "password123"
}
```

### `POST /auth/refresh`

Rotates a refresh token and returns a new access token plus a new refresh token.

```json
{
  "refreshToken": "refresh-token-from-register-or-login"
}
```

### `POST /auth/logout`

Revokes the supplied refresh token.

```json
{
  "refreshToken": "refresh-token-from-register-or-login"
}
```

### `POST /auth/password/forgot`

Creates a one-time password reset token. In this local API starter, the token is
returned in the response so it can be tested without an email provider.

```json
{
  "email": "person@example.com"
}
```

### `POST /auth/password/reset`

Updates the password, consumes the reset token, and revokes refresh sessions.

```json
{
  "resetToken": "reset-token-from-forgot-password",
  "password": "new-password123"
}
```

### `GET /auth/me`

Requires `Authorization: Bearer <accessToken>`.

### `GET /admin/users`

Requires `Authorization: Bearer <accessToken>` for a user with the `admin:read`
permission.

### `PATCH /admin/users/:id/roles`

Requires `users:write`.

```json
{
  "roles": ["user", "admin"]
}
```

### `PATCH /admin/users/:id/status`

Requires `users:write`. Disabled users cannot authenticate or refresh tokens.

```json
{
  "isDisabled": true
}
```

### `DELETE /admin/users/:id`

Requires `users:write`. Deleting a user revokes their refresh sessions.

## Authorization Model

Roles and permissions live in `src/types/auth.ts`.

- `user`: `users:read`
- `admin`: `users:read`, `users:write`, `admin:read`

The default registration flow creates `user` accounts. For production, connect
`UserRepository` to a real database and add an admin provisioning path that fits
your operational model.
some random api i was bored i decided to create
