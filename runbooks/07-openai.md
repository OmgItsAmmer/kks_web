# 07. OpenAI key (for AI product descriptions)

**Why:** The admin can write product descriptions with OpenAI's GPT-4o mini. It costs a fraction of a cent per description. A spending limit makes sure it can never surprise you.
**Time:** 10 minutes. **Needed by:** Phase 6 (you can do it later).

## Steps

1. Go to <https://platform.openai.com> and sign in or create an account. (This is separate from a ChatGPT subscription.)
2. Go to **Settings → Billing**. Add a payment card and put in a small amount of credit, for example **$5**. Turn **auto-recharge off**.
3. Go to **Settings → Limits** (or **Billing → Limits**). Set a **monthly budget** of **$5** and a warning at **$3**.
4. Go to **API keys** → **Create new secret key**. Name: `kks-admin`. Choose a **project** key (create a project called `kks-online` if it asks) rather than an account-wide one.
5. Copy the key now. It's shown once. Open `kksonline-backend-express/.env` and add:
   ```
   OPENAI_API_KEY=paste_the_key_here
   ```

## Check it worked

The key starts with `sk-`. The Limits page shows your $5 budget. I test the key with a one-word request in `preflight`.

## Send me

"done 07". Not the key.
