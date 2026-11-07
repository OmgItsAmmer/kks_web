# 13. Production cutover: the night we switch (Phase 11)

**Why:** This is the one moment the live store moves from Supabase to Neon and R2. I do the technical work. You decide **when**, tell your team, and test at the end. **Nothing here happens without your clear "go".**
**Time:** one evening. About 30 minutes of the store being in maintenance mode, plus an hour of watching.
**When:** a weeknight inside your low-traffic period (about 6 PM to 9 AM). There is still some traffic then, which is why the store goes into maintenance mode for a short time.

## A few days before

1. I tell you the dress rehearsal is done and give you the timings.
2. Pick the night. Tell me the date and start time.
3. Tell your staff: **on that night, don't use the old OMGx app** from the start time until I say it's finished. Anything they save there after the final copy would be lost.
4. Check [the checklist](#checklist-before-you-say-go) below.

## Checklist before you say "go"

- [ ] The dress rehearsal succeeded and you saw the report.
- [ ] You tested the new admin on the staging address and like it.
- [ ] Every staff member can log in to the new admin.
- [ ] The backup of the old database is done (I confirm it).
- [ ] You are free for the whole window and can answer chat.

## What I run (you do not need to)

For reference, the steps behind the scenes. All of them are safe to repeat for the dress rehearsal on a fresh Neon branch:

1. `npm run db:migrate` creates the new tables in the empty Neon database.
2. `node scripts/migrate-from-supabase.mjs` (a dry run that shows what would be copied), then the same with `--apply`.
3. `node scripts/migrate-images.mjs --apply` copies the pictures to R2 (add `--webp` only if the total is over about 8 GB).
4. A `pg_dump` of the ERP tables goes to `kks-private/archive/` (the list is in `docs/db-triage.md`).
5. `npm run preflight`, then a test order end to end.

## On the night

1. Say **"go"** in chat. I won't start without it.
2. I put the store in maintenance mode, copy the data, switch the settings and deploy.
3. I tell you when it's ready to test.
4. **You test** (about 10 minutes):
   - Open the store: pages and pictures load.
   - Search for a product.
   - Place a **test order** and pay by the cheapest method.
   - Open the new admin: you see that order. Change its status. Cancel it.
   - Check that the product's stock went down, then back up after cancelling.
5. Tell me "all good", or tell me what looks wrong.
6. I lift maintenance mode.

## If something is wrong

- **In the first hour, if no real order has come in on the new system:** I can switch back to Supabase. Say "roll back".
- **After that:** I fix forward, because going back would lose new orders.

## After

- I turn off the keep-alive job, remove the Supabase code and archive the old admin.
- The old Supabase project sits idle and pauses by itself. **Don't delete it for 90 days.** Then tell me and I'll give you the delete steps.

## Send me

"go" (on the night), then "all good" or a list of problems.
