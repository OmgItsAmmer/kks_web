# 01. Where to put secrets

**Why:** I need keys to connect to Neon, Cloudflare, OpenAI and so on. If a key ends up in chat or in GitHub, anyone can use it. So keys go in a few safe places only.
**Time:** 5 minutes.

## The three safe places

| Place | Used for | How |
|---|---|---|
| **A `.env` file on your computer** | Running the app while we build it | Described below |
| **GitHub Secrets** | The robots that run backups and jobs | See [12-github-secrets.md](12-github-secrets.md) |
| **The hosting dashboard** (Fly, Cloudflare Pages) | The live app | I tell you in the specific runbook, or I set it with `flyctl` |

## Steps for the `.env` file

1. Open the folder `kksonline-backend-express`.
2. Look for a file named `.env`. If it isn't there, create a new text file and name it exactly `.env` (no `.txt` at the end).
3. Each key goes on its own line, like this:
   ```
   R2_ACCOUNT_ID=abc123
   OPENAI_API_KEY=sk-xxxxxxxx
   ```
   No spaces around `=`, and no quote marks needed.
4. The runbooks tell you the exact name for each key (the part before `=`). Use those names exactly.
5. Save the file.

## Already done for you

The Neon database addresses are already in a file called `.env.local` in the main `kks_web` folder. Neon's tool wrote it. It is ignored by git, so it won't be uploaded. Leave it alone.

## Check it is safe

Open a terminal in the main folder and run:

```
git check-ignore -v kksonline-backend-express/.env
```

You should see a line that mentions `.gitignore`. If it prints nothing, stop and tell me, because that means the file could be uploaded.

## One thing to know

The file `react-frontend/.env` is currently saved in git. It only holds values that are public in a website anyway (the Google client ID and a map key), so it is not a disaster. But **never put a private key in that file.** Private keys go only in the backend `.env`.

## If a key leaks

If you pasted a key in chat, in a commit or anywhere public, do not panic: go to that service's dashboard, delete (revoke) the key, make a new one and put the new one in the `.env` file. Then tell me which service it was.

## Send me

Nothing. Just tell me when a key is in place, for example "done 05 R2 keys in .env".
