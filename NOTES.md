# NOTES

## Setup

```bash
cp .env.example .env
yarn db:generate
yarn db:migrate
yarn db:seed
yarn dev
```

The app runs on `http://localhost:3000`.

Useful commands:

```bash
yarn test
yarn typecheck
yarn check
yarn ingest
```

## Architecture

The project uses Next.js 15, tRPC, Drizzle, PostgreSQL, Zod, React Hook Form, Tailwind/shadcn and Vitest.

The main flow is:

```text
UI → tRPC → auth/validation → business logic → Drizzle → PostgreSQL
```

I kept payout calculations in `src/lib/payout.ts` as pure functions so the important business rules can be tested independently.

## Auth & Access Control

Authentication is intentionally simple: a signed cookie plus a development user switcher.

Authorization is handled on the server with tRPC procedures. Creator queries also use the authenticated creator ID, so a creator cannot access another creator's submissions by changing the input.

The seed creates one admin and two creator users.

## Concurrency

Approval and budget updates are handled inside a database transaction. The campaign row is locked with `SELECT ... FOR UPDATE` before checking the remaining budget.

This prevents two concurrent approvals for the same campaign from both spending the same remaining budget.

I chose database locking instead of an in-memory lock because it also works when multiple application instances are running.

## Payout & Budget

Payout is calculated as:

```text
floor(views / 1000) × payout_per_1k_views
```

All money values are stored as integer cents.

One thing I identified during the final review is that the current approval flow clamps the payout to the remaining budget. The case study expects an approval to fail when the calculated payout would exceed the remaining budget, so this is something I would change before final submission.

I also noticed that ingestion currently changes the campaign budget. This needs to be aligned with the approval flow to make sure the same payout is never counted twice.

## Ingestion

`yarn ingest` simulates the daily metrics sync.

It processes approved submissions independently, keeps views increasing, and uses the `(submission_id, captured_at)` unique constraint together with `onConflictDoNothing()` to make repeated runs for the same day idempotent.

An error for one submission is caught and reported without stopping the others.

## Testing

The current tests cover the payout formula and budget calculations.

The most important additional tests I would add are:

- concurrent approvals where only one can succeed
- creator ownership/access control
- repeated ingestion
- over-budget approval
- failure isolation during ingestion

## What I'd Fix With Another Day

If I had another day, I would mainly focus on:

1. Adding a few more tests for edge cases.
2. Improving typed error messages and loading states in the UI.
3. Fixing the redirection behavior when users try to access pages they are not authorized to access.
4. Reviewing the codebase and cleaning up small inconsistencies.
5. Improving the overall UI details and accessibility.
6. Doing one more full end-to-end test of the main user flows.

## AI Tooling

I used AI tools mainly for boilerplate, framework setup, test scaffolding and reviewing edge cases.

I reviewed the generated code manually, especially the authorization, transaction/concurrency and budget logic. The review helped identify the budget-clamping and budget-accounting issues mentioned above.

## Intentional Omissions

I intentionally kept the scope small and did not add real authentication, payment integrations, social-media APIs or other features outside the case requirements.
