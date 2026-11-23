# Migrations

Schema changes are applied through migrations only (brief section 4.3).

Planned tooling: [`golang-migrate`](https://github.com/golang-migrate/migrate).

Naming: `NNNN_description.up.sql` / `NNNN_description.down.sql`.

The initial schema is intentionally not created yet. The data model depends on
admin-scope and order-flow decisions that the owner must confirm first
(brief sections 2.5, 2.6, 12).
