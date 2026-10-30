# onstage

Team 07's Open Mic build: a release creator that is the fan's view of the release.
Context and scope live in `CLAUDE.md`.

```bash
pnpm install
cp .env.example .env.local   # then add your ANTHROPIC_API_KEY
pnpm dev                     # http://localhost:3000
pnpm typecheck && pnpm lint
```

The chat in the sidebar is assistant-ui talking to Claude through `app/api/chat/route.ts`;
Claude fills the release page with the `update_release` tool. Everything else runs on
invented mock data. Without an API key, "Load the saved draft" on the empty page still
fills it.
