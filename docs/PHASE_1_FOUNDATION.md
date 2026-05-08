# Phase 1 Foundation

This phase builds only the ERP skeleton. It does not implement attendance, fees, marks, timetable, PDF parsing, promotions, or reports.

## Core Structure

The fixed hierarchy is:

```text
Campus -> Program -> Branch -> Batch -> Class -> Section -> Users
```

Campuses:

- KIET
- KIEK
- KIEW

Campus grouping:

- KIET + KIEK share one group.
- KIEW is isolated.

## Permissions

Permissions answer:

```text
Who can do which action in which scope?
```

Admin has full control. Students can only access their own student portal foundation. Teachers can have multiple active assignments at the same time:

- STPO: subject teacher scope
- CTPO: class/section teacher scope
- HTPO: admin-assigned head scope, not automatically the whole department

## Safety Rules

- Use pagination and filters for large lists.
- Never load thousands of rows directly into the UI.
- Disable actions while they are running.
- Add backend duplicate prevention for important writes.
- Check permissions in backend for every protected action.
- Use background jobs for slow work.
- Show toast notifications for every user action.
- Keep KIEW separated from KIET/KIEK.

## Module Build Order

For every future module:

1. Confirm behavior.
2. Extend the Prisma schema.
3. Build backend endpoints and permission checks.
4. Add tests for risky logic.
5. Build frontend screens.
6. Run checks before moving to the next module.
