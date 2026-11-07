# 10. Your admin sign-in (fixed accounts)

**Why:** The new admin does not use email or a sign-up service. You sign in with fixed accounts that you create yourself in one text file. The password is never saved in the code or in git. Only a scrambled version (a "hash") of it is saved.
**Time:** 5 minutes. **Needed by:** Phase 3.

## Steps

1. Open a terminal in the folder `kksonline-backend-express`.
2. Run:
   ```
   npm run admin:hash
   ```
3. It asks for a password. Type a long one (12 or more characters) and press Enter. Nothing shows while you type.
   It prints a long text starting with `$2b$`. That is the hash. Copy it.
4. Run it again for each extra person who needs their own account. One account per person is safer.
5. Open `kksonline-backend-express/.env` and add (keep it all on **one line**):
   ```
   ADMIN_ACCOUNTS=[{"email":"you@example.com","name":"Your Name","role":"owner","passwordHash":"$2b$12$paste_the_hash_here"}]
   ADMIN_SESSION_SECRET=any_long_random_text_40_or_more_characters
   ADMIN_ORIGIN=http://localhost:5174
   ```
   For more people, add more `{...}` blocks separated by commas inside the square brackets.
6. Roles: `owner` (everything), `manager` (products, orders, stock), `staff` (view and update orders). See section 5.2 of [plan.md](../plan.md).
7. On the live server I set the same variables with `flyctl`, or you add them to the Fly dashboard under **Secrets**.

## Changing a password or removing a person

Edit the `ADMIN_ACCOUNTS` line (make a new hash, or delete the person's block) and restart the API. A removed person is locked out immediately.

## What this does not have

No email, no "forgot password" and no second code from a phone. If you forget a password, make a new hash and replace it. That was your decision for now. It can be upgraded later.

## Send me

"done 10". Never the password or the hash.
