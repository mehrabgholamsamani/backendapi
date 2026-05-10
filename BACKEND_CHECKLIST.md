# Robust Backend Checklist

## Implemented

- Strict TypeScript build
- Environment validation
- Production-only secret and CORS checks
- Request IDs on every response
- Consistent error response shape
- Health and readiness endpoints
- Security headers
- Disabled Express technology header
- CORS configuration
- Global rate limiting
- Stricter authentication rate limiting
- Request body size limit
- Password hashing
- JWT access tokens
- Refresh token rotation
- Server-side refresh session revocation
- Logout
- Password reset with one-time tokens
- Disabled/deleted account enforcement
- Role and permission authorization
- Admin user management
- Atomic JSON file writes
- Automated API tests
- Dependency audit

## Still Needed For Production

- PostgreSQL or another transactional database
- Database migrations
- Email provider integration
- Password reset emails instead of development response tokens
- Email verification flow
- Structured JSON logging
- Metrics endpoint
- Centralized audit events
- OpenAPI documentation
- CI pipeline
- Docker image and runtime health checks
- Secrets manager integration
- Backups and restore testing
- Horizontal-safe rate limiting with Redis
- Refresh session device metadata
- Login failure tracking and account lockout policy
- HTTPS termination in deployment
