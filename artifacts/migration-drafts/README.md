# Archived migration draft

`0003_business_services.sql` is an unchanged copy of the untracked duplicate
found in the executable migrations directory. Its column, indexes, and foreign
key already exist in the tracked `0002_business_tenancy.sql` migration.

Keep this draft outside `packages/db/prisma/migrations`: replaying both fails
with `column "business_id" of relation "Service" already exists`.
No tracked SQL history or database ledger was changed to archive this file.
