# Running and Deploying OLY Zmanim Studio

A hand-off guide for someone who has never touched this project. Part A gets it
running on your own machine from GitHub. Part B publishes it to Cloudflare.

Everything in this file was run end-to-end from a clean clone on 2026-08-26,
except the two steps that need credentials this machine does not have — those
are marked **NOT VERIFIED** where they appear.

---

## 0. What you are deploying

A single-page flyer editor plus **one** server route. That is the whole system.

| Piece | What it is |
| --- | --- |
| The editor | React app, runs entirely in the browser |
| `/api/zmanim` | A Cloudflare Worker route that fetches times from Chabad.org and hands them back as JSON |
| Everything else | Static files (JS, CSS, the logo) |

**What it does *not* have** — this is the good news, and it is verified, not assumed
(`wrangler deploy --dry-run` reports `No bindings found`):

- **No database.** `.openai/hosting.json` sets both `d1` and `r2` to `null`. A `DB`
  binding is declared in `worker/index.ts` but nothing reads it; it is leftover
  template code.
- **No secrets, API keys, or environment variables.** Nothing to configure, nothing
  to leak. The Chabad.org endpoint is public and unauthenticated.
- **No accounts or login.** `app/chatgpt-auth.ts` exists but is imported nowhere.

**Why `/api/zmanim` has to exist at all:** Chabad.org sends no CORS headers, so the
browser cannot call it directly. The request has to be made server-side. That single
route is the only reason this needs a server rather than plain static hosting.

**Where the user's data lives.** Flyers and templates are in that browser's
`localStorage` — they do not sync between browsers, devices, or people, and
deploying does not touch them. Saved versions are real files the user writes to a
folder they choose (Chrome/Edge desktop only). **A deploy cannot destroy anyone's
flyers**, which makes this a low-risk thing to publish.

---

## Part A — Run it locally from GitHub

### A1. Prerequisites

- **Node.js 22.13.0 or newer.** Enforced by `engines` in `package.json`.
  Check with `node -v`. (Built and tested here on Node 25.6.1.)
- **git**
- A **Chromium browser** (Chrome or Edge) if you want to test the "Saved versions"
  folder feature — it uses the File System Access API, which Firefox and Safari
  do not support. Everything else works in any modern browser.

### A2. Get it and run it

```bash
git clone https://github.com/yaakov-svg/oly-flyer-app.git
cd oly-flyer-app
npm ci
npm run dev
```

Use `npm ci`, not `npm install` — `ci` installs the exact versions in
`package-lock.json`, which is what was tested.

Open the address the dev server prints (normally <http://localhost:3000>).

`npm audit` will report 4 high-severity advisories during install. They are known
and pre-existing — see [Known issues](#5-known-issues-none-of-these-block-a-deploy).
Do **not** run `npm audit fix --force`; it will pull in breaking major versions.

### A3. Check it actually works

1. The flyer renders with a logo, an orange **PARSHAS …** banner, and three columns.
2. Click any text on the flyer — it should become editable in place.
3. Open the **Zmanim** panel (top right) → **Refresh for this week**. Real times
   should appear. *This is the one feature that needs the internet and a working
   Chabad.org.* If it errors, that is the endpoint, not your setup.
4. Click **Auto-fill …**. It should report filling **10 dovening times**.

### A4. Run the checks

```bash
node --test tests/dovening-times.test.mjs   # 21 tests, all should pass
npm run build                                # production build
npm run lint                                 # 0 errors (2 <img> warnings are expected)
```

**Do not use `npm test`.** It runs two obsolete tests from the starter template and
does not run the real suite — it will fail, and that failure means nothing. The real
test command is the `node --test` line above.

`npm run lint` is fine on a clean clone. (You may see it described elsewhere in this
repo as broken; that is true only on a machine that has a nested `.claude/worktrees/`
folder, which lint walks into. A fresh clone has no such folder and exits 0. If you
ever do hit it, `npx eslint app worker tests` scopes lint to the real source.)

---

## Part B — Deploy to Cloudflare

### B1. Read this first: what is live today

There **is** an existing deployment, and it is **badly out of date**.

The last recorded live version is commit `36072ab` (21 July 2026). `master` is now
**15 commits ahead** of it. The live flyer therefore has none of the zmanim engine,
none of the dovening-time rules, and none of the August fixes.

Two honest caveats:

- `36072ab` being live comes from the 2026-08-12 review note, not from checking the
  site. I confirmed it is a genuine ancestor of `master`, but **no live URL is
  recorded anywhere in this repo**, so I could not verify what is actually serving.
- **Find the live URL before deploying.** If you deploy blind you may publish to a
  different Worker than the one people use, and end up with two versions live.

Quick way to tell which version a URL is running: open it, click **Zmanim** →
**Auto-fill**. If there is no Zmanim panel at all, it is pre-July-31. If Motzai
Shabbos Maariv comes back blank, it is pre-August-25.

### B2. Which path to use

| Path | Use when |
| --- | --- |
| **Sites-managed** (`.openai/hosting.json`, project `appgprj_6a5ecf684c088191a0cc96da61f52acd`) | This is how it was originally published. Prefer it if you have access — it keeps deploys where the history already is. |
| **Direct Wrangler** (below) | You have a Cloudflare account with Workers access and want to publish from a terminal. |

The direct-Wrangler path is documented here because it is the one that can be
verified from a checkout. **NOT VERIFIED:** the Sites path — I have no credentials
for that project, so I cannot describe its UI or confirm its behaviour. If Sites is
your route, publish through whatever interface you normally use; the build output in
`dist/` is identical either way.

### B3. Deploy with Wrangler

```bash
# from a clean checkout
npm ci
npm run build
npx wrangler login        # opens a browser
npx wrangler deploy
```

That is the whole sequence. Notes on each step:

- **`npm run build` must come before `deploy`.** The build writes both the output in
  `dist/` *and* `.wrangler/deploy/config.json`, the pointer that tells Wrangler where
  the config lives. Both are gitignored, so a fresh clone has neither until you build.
  (Verified: the build regenerates the pointer, so `deploy` finds it with no flags.)
- **`wrangler login`** is required — this machine reports `Not logged in`, which is
  why the final step is **NOT VERIFIED** here. Everything up to it is.
- If your account has more than one Cloudflare account, Wrangler will ask which to
  use, or set `CLOUDFLARE_ACCOUNT_ID`.

Dry-run first if you want to see exactly what would be uploaded, without publishing:

```bash
npx wrangler deploy --dry-run
```

Expect roughly: `Total Upload: ~1.3 MiB / gzip: ~297 KiB`, assets read from
`dist/client`, and **`No bindings found`**. If it reports bindings, something has
changed and you should stop and find out what.

### B4. What gets created

| Setting | Value | Where it comes from |
| --- | --- | --- |
| Worker name | `oly-zmanim` | `name` in `package.json` |
| Static assets | `dist/client` | generated |
| Compatibility date | `2026-05-15` | generated config |
| Compatibility flags | `nodejs_compat` | generated config |
| Routes / custom domain | none configured | — |

Because no route is configured, a plain `wrangler deploy` publishes to your
`*.workers.dev` subdomain. **If the shul uses a custom domain, that domain is
configured in the Cloudflare dashboard, not in this repo** — check it before and
after, or the deploy will land somewhere nobody is looking.

The generated Wrangler config lives at `dist/server/wrangler.json` and is rewritten
by every build. **Do not hand-edit it** — edits are lost on the next build. Real
config belongs in `vite.config.ts` or `.openai/hosting.json`.

### B5. Smoke-test after deploying

Do these against the deployed URL, in order. Steps 3 and 4 are the ones that catch a
broken Worker, because they are the only parts that are not static files.

1. The page loads, logo and orange banner render.
2. Clicking flyer text makes it editable.
3. **Zmanim → Refresh for this week** returns real times. *This proves the Worker
   route is alive.* If the page loads but this fails, assets deployed and the Worker
   did not.
4. **Auto-fill** reports **10 dovening times** and Motzai Shabbos Maariv is **not
   blank**. A blank Maariv means an old build is serving.
5. **Print / PDF** → the preview shows dark navy headers and the orange banner. If
   everything prints as white boxes with floating text, the print CSS did not ship.
6. **Export PNG** downloads an image with **no blue selection outline** around the
   card you last clicked.

Step 6 is worth doing carefully: it is the one fix from the August round that was
never confirmed against a real downloaded file.

### B6. Rollback

Deploy an earlier commit the same way:

```bash
git checkout <previous-commit>
npm ci && npm run build && npx wrangler deploy
git checkout master
```

Cloudflare also keeps previous Worker versions in the dashboard, which is faster if
you just need to revert immediately.

Rolling back is safe for user data: flyers live in each person's browser, not on the
server. Someone mid-edit will not lose work.

---

## 5. Known issues (none of these block a deploy)

Pre-existing, unrelated to the recent work, and each verified still true on
2026-08-26 from a clean clone:

1. **`npm test` fails.** It runs `tests/rendered-html.test.mjs`, two obsolete tests
   from the starter template that were never updated, and it does *not* run the real
   suite. Confirmed on a clean clone: 2 tests, 0 pass, 2 fail. Use
   `node --test tests/dovening-times.test.mjs` (21 tests, all pass).
2. **`npm run lint` is *fine* on a clean clone** — 0 errors, exit 0. Older notes in
   `AGENTS.md` and the session logs call it broken; that was a local artifact of a
   nested `.claude/worktrees/` folder that lint walked into, not a repo defect.
   Nothing to fix before deploying.
3. **4 high-severity npm advisories** in production dependencies (Next.js 16.2.6 and
   transitive Nano ID, PostCSS, Sharp). Real, and worth scheduling — but this app
   stores no credentials and handles no personal data, so the practical exposure is
   low. `npm audit fix --force` would pull breaking majors; do not run it casually.
4. **The Chabad.org endpoint is unofficial.** `worker/zmanim.ts` calls an internal
   webservice. It works today and is cached 24h, but Chabad.org could change it
   without notice. If zmanim stop loading, that is the first thing to check.
5. **Location is hard-coded** to Baltimore ZIP 21215 (`worker/zmanim.ts`).
6. **Saved versions need Chrome or Edge on desktop.** Firefox and Safari lack the
   File System Access API. The rest of the app is fine everywhere.
7. **Flyers do not sync.** `localStorage` is per-browser, per-device. Two people
   editing on two machines have two separate sets of flyers. The "Saved versions"
   folder (pointed at Dropbox/OneDrive/Drive) is the intended workaround.

---

## 6. Quick reference

```bash
# local
git clone https://github.com/yaakov-svg/oly-flyer-app.git && cd oly-flyer-app
npm ci
npm run dev

# checks  (note: `npm test` is miswired - use the line below)
node --test tests/dovening-times.test.mjs
npm run build
npm run lint

# deploy
npm ci && npm run build
npx wrangler login
npx wrangler deploy          # add --dry-run to preview
```

| Fact | Value |
| --- | --- |
| Repo | <https://github.com/yaakov-svg/oly-flyer-app> (private) |
| Worker name | `oly-zmanim` |
| Sites project | `appgprj_6a5ecf684c088191a0cc96da61f52acd` |
| Server route | `GET /api/zmanim?date=YYYY-MM-DD` |
| Node | >= 22.13.0 |
| Bindings / secrets | none |
| Live URL | **not recorded — find it before deploying** |

Deeper context on how the code is organised, and the reasoning behind the
dovening-time rules, is in `AGENTS.md` and `README.md`. Per-session history is in
`session-logs/`.

**Handing it to a non-technical user?** `HOW-TO-USE.md` is written for the person
who will actually make the flyers each week — no terminal, no jargon. Send them a
deployed link plus that guide; do not send them the repo.
