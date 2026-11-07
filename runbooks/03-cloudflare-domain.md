# 03. Cloudflare account and your domain

**Why:** Cloudflare gives us, for free: the fast image address (`cdn.yourdomain`), the storefront hosting, a cache in front of the API that makes the shop fast, and protection against attacks. For that, your domain must be managed by Cloudflare.
**Time:** 30 minutes of work, then waiting up to a day.
**Cost:** $0 (a domain itself costs money only if you don't have one yet).

## Before you start

- Find out **where your domain is registered** (GoDaddy, Namecheap, PKNIC, and so on) and have the login for it.
- Tell me the **domain name**. I need it for the plan. If you have no domain yet, buy one first (about $10 a year at Cloudflare Registrar, Namecheap, etc.).
- If your store currently works at that domain, **the live shop must not break**. Follow step 5 carefully.

## Steps

1. Go to <https://dash.cloudflare.com/sign-up> and make a free account. Use an email you'll keep. Turn on two-step login in your profile (Profile → Authentication).
2. Click **Add a domain** (or **Onboard a domain**). Type your domain, for example `kksonline.com`. Choose the **Free** plan.
3. Cloudflare scans your existing DNS records. It shows a list.
4. **Compare that list with your current DNS.**
   - Open the DNS settings at your registrar in another tab.
   - Make sure every record there (storefront, `www`, email like `MX` and `TXT` records) is also in Cloudflare's list. Add any missing one by hand.
   - Records for the website (A, AAAA, CNAME) should be set to **DNS only** (grey cloud) for now. I'll turn the orange cloud on later, record by record.
5. Cloudflare gives you **two nameservers**, like `anna.ns.cloudflare.com` and `bob.ns.cloudflare.com`.
6. Go to your registrar. Find "Nameservers" for the domain. Choose "Custom nameservers" and replace the old ones with the two from Cloudflare. Save.
   - A `.pk` domain: the change is made in the registrar's panel, and can take longer.
7. Go back to Cloudflare and click **Check nameservers**. It can take 10 minutes to 24 hours. Cloudflare emails you when it's ready.
8. When the domain says **Active**, open the **DNS** page and test your normal website address in a browser. The store must still load.

## Check it worked

- Cloudflare shows the domain as **Active** (green).
- Your current storefront and your email still work.

## If it goes wrong

Put the old nameservers back at your registrar. Everything returns to how it was within the hour.

## Send me

- The **domain name**.
- "done 03, the domain is Active".
- Not needed: any password.

Next: [04-cloudflare-api-token.md](04-cloudflare-api-token.md)
