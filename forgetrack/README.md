# ForgeTrack

> See the main [README](../README.md) in the project root for complete documentation, setup instructions, and deployment guide.

## Quick Start

```bash
# Install dependencies
npm install

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Run database schema (in Supabase SQL Editor)
# Execute: supabase/schema.sql
# Execute: supabase/seed.sql

# Start development server
npm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server on `localhost:5173` |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
