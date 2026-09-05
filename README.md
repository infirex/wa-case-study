# Creator Marketplace (Case Study)

> A full-stack creator marketplace platform where brands launch clipping campaigns with strict budget ceilings and creators submit short-form clips. Includes automated view tracking, dynamic payout calculation, and concurrency-safe approval logic.

🌐 **Live Demo:** [https://wa-case-study-l1zj.vercel.app/](https://wa-case-study-l1zj.vercel.app/)

---

## 🛠 Tech Stack

- **Framework:** Next.js 15 (App Router)
- **API Engine:** tRPC v11 (Strict end-to-end type safety)
- **Database & ORM:** PostgreSQL via Drizzle ORM
- **UI & Styling:** TailwindCSS & `shadcn/ui`
- **Validation:** Zod (Shared schemas)
- **Testing:** Vitest
- **Package Manager:** Yarn

---

## ⚡ Core Features

- **Campaign Management:** Brands post campaigns with defined platforms, view payout rates (`payout_per_1k_views`), total budget, and target dates.
- **Creator Submissions:** Creators submit clip URLs with strict platform regex validation (TikTok, Instagram Reels, YouTube Shorts).
- **Concurrency & Budget Safety:** Approvals use PostgreSQL row-level locks (`SELECT FOR UPDATE`) within transactions to guarantee zero budget overspending under concurrent admin approvals.
- **Daily Ingestion Script:** Idempotent metrics ingestion script updating submission views, likes, and calculated payouts (`yarn ingest`).
- **Dev Auth Switcher:** Dev-only role switcher (`admin` vs `creator`) using signed cookies.

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+ or 20+
- Yarn (`yarn@1.22.22`)
- PostgreSQL (Docker or local instance)

### 2. Environment Setup
Create `.env` from template:
```bash
cp .env.example .env
```
Set PostgreSQL connection string:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/wa_case_study"
NODE_ENV="development"
```

### 3. Database Setup
Generate and apply migrations, then seed test data:
```bash
yarn db:generate
yarn db:migrate
yarn db:seed
```

### 4. Development Server
```bash
yarn dev
```
Open [http://localhost:3000](http://localhost:3000).

---

## 🧪 Available Scripts

| Command | Purpose |
| --- | --- |
| `yarn dev` | Start development server |
| `yarn test` | Run Vitest backend & logic test suite |
| `yarn ingest` | Execute daily metrics ingestion script |
| `yarn db:generate` | Generate Drizzle schema migrations |
| `yarn db:migrate` | Apply database migrations to PostgreSQL |
| `yarn db:seed` | Seed database with sample campaigns and creators |
| `yarn check` | Run Next.js linting and TypeScript type checks |

---

## 📚 Documentation

- [docs/NOTES.md](docs/NOTES.md) - Deep dive on concurrency locks (`SELECT FOR UPDATE`), architecture, and technical trade-offs.

---

## 📄 License

MIT
