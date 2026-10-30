# onstage

Team 07's Open Mic build: a release creator that is the fan's view of the release.
Context and scope live in `CLAUDE.md`.

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm typecheck && pnpm lint
```

Everything runs on invented mock data; the agent in the sidebar is a keyword-matching
stand-in for the Claude call (`lib/mock-agent.ts`).
