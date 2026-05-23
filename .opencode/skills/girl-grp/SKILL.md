---
name: girl-grp
description: Use when working in Canadian AI repos with GIRL/GRP, Next.js, Convex, Clerk, Cloudflare, Firebase Storage, R2, S3, env audits, stack inspection, validation, or safe guided refactoring.
---

# GIRL / GRP

GIRL is the Grammar-Integrated Refactoring Layer. GRP is the Grammar Refactoring Protocol.

Use this skill for Canadian AI stack-aware development across Next.js, Convex, Clerk, Cloudflare, Firebase Storage, Cloudflare R2, S3, Vercel, Railway, and shared runtime repos.

Canonical extension files live at `/home/tyrellshawn/.config/opencode/extensions/opencode-girl`.

## GRP Workflow

1. Inspect: detect framework, backend, auth, storage, env, deploy, package manager, and existing repo instructions.
2. Select: choose one capability card and one recipe.
3. Plan: state the smallest safe change and auth/storage/env risks.
4. Patch: edit only intended files.
5. Validate: run targeted lint, typecheck, tests, Convex checks, or build.
6. Summarize: changed files, commands, pass/fail, risks, and next blocker.

## Capability Cards

- `nextjs.route.add`: Create App Router pages, layouts, route handlers, and server actions. Risk: medium.
- `convex.function.add`: Add Convex queries, mutations, actions, and schema changes. Risk: medium.
- `clerk.auth.guard`: Add Clerk authentication and role checks to routes/components. Risk: high.
- `storage.adapter.add`: Add Firebase, R2, or S3 storage adapter code. Risk: high.
- `cloudflare.worker.add`: Add or update Cloudflare Worker logic. Risk: medium.
- `env.audit`: Detect missing or inconsistent environment variables. Risk: high.
- `validate.stack`: Run repo-appropriate lint, typecheck, tests, Convex checks, and build validation. Risk: low.

## Safety Rules

- Do not expose secrets or env values.
- Do not place server secrets in client components or `NEXT_PUBLIC_*` variables.
- Prefer server-side auth checks for protected operations.
- Prefer Convex mutations/actions for backend writes in Convex apps.
- Tenant storage paths must include tenant/workspace scope before user-controlled file names.
- Upload permissions and signed URL generation must stay server-side.
- Source apps own final authorization; orchestration layers must not bypass them.

## Validation Menu

Choose only commands that exist in the repo and fit the change:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
bun run lint
bun run typecheck
bun test
bun run build
pnpm lint
pnpm typecheck
pnpm test
pnpm build
npx convex dev --once
npx convex deploy --dry-run
```

For auth/storage/env changes, also verify:

- Env vars are documented without values.
- Secrets are excluded from client bundles.
- Clerk user IDs map to app users/tenants correctly.
- Storage paths are tenant-scoped.
- Upload and signed URL permissions are server-side only.
- Rollback path is clear.

## Output Contract

Return detected stack, capability card, recipe, files changed, validation commands with pass/fail, security notes, and follow-ups.
