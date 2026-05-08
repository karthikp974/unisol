# College ERP

Production-focused College ERP foundation using React, NestJS, PostgreSQL, Prisma, Redis, BullMQ, Docker, Tailwind CSS, and shadcn-style UI patterns.

## Phase 1 Scope

Built now:

- Core academic structure
- Contextual teacher role assignments
- Four portal shells
- Backend permission foundation
- PostgreSQL schema through Prisma
- Redis/BullMQ background job foundation
- Toast and safe action UI patterns
- Permanent project rules in `.cursor/rules/erp-foundation.mdc`

Not built yet:

- Attendance
- Fees
- Marks
- Timetable
- PDF result parser
- Promotion
- Reports

## Local Setup

1. Copy `.env.example` to `.env`.
2. Start PostgreSQL and Redis:

```bash
docker compose up postgres redis
```

3. Install packages:

```bash
npm install
```

4. Generate Prisma client:

```bash
npm run prisma:generate
```

5. Create database tables:

```bash
npm run prisma:migrate
```

6. Seed campuses, programs, branches, and admin:

```bash
npm run seed -w apps/backend
```

Default admin:

```text
Email: admin@college-erp.local
Password: Admin@12345
```

Change this password before production.
