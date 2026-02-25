# Torium

Short links, beautifully simple.

## Project Structure

```
/apps
  /worker           → Cloudflare Worker (API + redirects)

/packages
  /shared           → Shared TypeScript types

/docs               → Documentation
/milestones         → Milestone capsules
/agents             → Agent role contracts
```

## Development

### Prerequisites

- Node.js 20+
- pnpm 8+
- Cloudflare account with Workers, D1 enabled

### Setup

```bash
# Install dependencies
pnpm install

# Create D1 database
wrangler d1 create torium-db

# Update wrangler.toml with the database ID from above

# Run local migration
pnpm --filter @torium/worker migrate:local

# Set secrets (required)
wrangler secret put RESEND_API_KEY
wrangler secret put SESSION_SECRET

# Start development server
pnpm dev
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `RESEND_API_KEY` | Resend API key for magic link emails | Yes |
| `SESSION_SECRET` | Secret for session token hashing | Yes |
| `APP_URL` | Base URL (defaults to https://torium.app) | No |

### Commands

```bash
pnpm dev              # Start local development server
pnpm build            # Build worker
pnpm deploy           # Deploy to Cloudflare
pnpm typecheck        # Type check all packages
```

## API Endpoints

### Auth

- `POST /api/v1/auth/request` - Request magic link email
- `POST /api/v1/auth/verify` - Verify token and create session
- `GET /api/v1/auth/verify?token=...` - Verify via direct link
- `POST /api/v1/auth/logout` - Logout (requires auth)
- `GET /api/v1/auth/me` - Get current user (requires auth)

### Health

- `GET /health` - Health check

## Architecture

- **Cloudflare Workers** - Edge compute
- **D1** - SQLite database (source of truth)
- **Resend** - Transactional email

See `/docs` for detailed documentation.

## License

Private
