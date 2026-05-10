# backendapi

TypeScript Express API with authentication and role/permission authorization.

## Features

- Register, login, and current-user endpoints
- JWT access tokens
- Refresh-token sessions with rotation and logout
- Bcrypt password hashing
- Role and permission authorization middleware
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

### `GET /auth/me`

Requires `Authorization: Bearer <accessToken>`.

### `GET /admin/users`

Requires `Authorization: Bearer <accessToken>` for a user with the `admin:read`
permission.

## Authorization Model

Roles and permissions live in `src/types/auth.ts`.

- `user`: `users:read`
- `admin`: `users:read`, `users:write`, `admin:read`

The default registration flow creates `user` accounts. For production, connect
`UserRepository` to a real database and add an admin provisioning path that fits
your operational model.
some random api i was bored i decided to create
