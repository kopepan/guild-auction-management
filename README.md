# MoonShade — Guild Auction Queue Manager

A wishlist and queue manager for the **MoonShade** guild in *Ragnarok: The New World*,
replacing the weekly SurveyMonkey form and the hand-written Discord list.

Guild events reward items that members can bid on. MoonShade's policy is that members queue
for items rather than bid-racing, so everyone pays the lowest crystal cost. This app runs
the weekly wishlist, orders each queue by the guild's own rules, records each member's
requested quantity, and produces the Discord announcement.

## How the model works

Registration is **per week**. Each week is a *round*, and a member registers a wishlist
against the round that is currently open. Continuity between weeks comes from carry-over
rather than a standing queue.

Every active catalogue item is automatically available in an open round. Managers arrange
the queues first; when they draw the round, the app proposes each member's requested quantity
for review. Managers do not need to enter actual stock.

### The three wishlist types

Every item declares one or more queue types. Red accessories and Mirage cards can expose
both Gear Rating and random queues in the same round, and a member may join each queue
independently. Each queue is ordered separately.

| Type | Ordering | Limits |
| ---- | -------- | ------ |
| **Gear Rating queue** — red accessories, Mirage cards | Gear Rating, highest first | One item of this type per member per week |
| **Random queue** — red accessories, Mirage cards, Rita, Gem Box, Title items | Random shuffle | Unlimited items; quantity allowed |
| *First come, first served* | Registration time | Not part of the written policy; available for items managers prefer to hand out in order |

### Carry-over

If a manager carries an unserved entry into the next round, its place **is drawn ahead of
that round's new registrations**. Among carried entries the longest wait leads, and the rank
they already earned is preserved rather than reshuffled. This is the rule that makes a
weekly form behave like a queue.

A member who forfeited for lack of diamonds, or who was serving a bid ban, does **not**
carry over: the policy says they lose that round.

### Requested quantities

For quantity-enabled items, members enter how many units they want. The draw records that
request for the manager to review. The manager marks whether the member **received** the item
or **forfeited**. The app does not require an actual stock count.


### Bid bans

Bidding on an item that is not your queue carries a ban of 1 to 4 weeks, or expulsion. An
active ban blocks registration and excludes the member from draws.

The policy itself lives in `src/lib/policy.ts` and the ordering logic in `src/lib/queue.ts`,
both covered by unit tests, so the published rules can be checked against the code in one
place.

## Features

**For members**

- Sign in with the same Discord account used in the guild server.
- Character profile replacing the weekly roster form: character name, 8-digit in-game ID and
  Gear Rating.
- A weekly wishlist page listing the items this round offers, each with its ordering rule,
  the member's live position, remaining allowances and quantity fields where relevant.
- Full queue lists are public to the guild, so the ordering is auditable by everyone.
- Carried entries are labelled, so it is visible why someone sits ahead of a higher Gear
  Rating.
- Thai and English throughout, switchable at any time.

**For guild managers**

- **Item master data**: bilingual names and descriptions, category, artwork and queue types.
- **Rounds**: create the week's round; active catalogue items appear automatically. Only one
  round takes registrations at a time, so weekly allowances are never ambiguous.
- **Carry over**: roll everyone who missed out in the previous round into this one, ranked
  ahead of new registrations.
- **Draw**: order every queue by its own rule and propose each member's requested quantity.
  Redrawing is safe, since settled entries keep their decision.
- **Reshuffle**: re-roll random queues for fresh registrations while carried entries keep
  the rank they earned.
- **Settle** each queued member individually as received or forfeited for lack of diamonds.
- **Discord announcement**: a copy-ready message with each requested quantity and outcome.
- **Post queue to Discord**: send the current ordered queues directly to a configured Discord
  channel with one click. Each item gets its own message with its image, plus a
  complete queue for the manager to review.
- **Members**: roster with Gear Ratings and entry counts; promote or demote
  managers, deactivate members, and issue or lift bid bans. The last remaining manager
  cannot be demoted.
- **Rules**: edit the bilingual rules that used to sit at the top of the survey.

## Tech stack

| Layer     | Choice                                  |
| --------- | --------------------------------------- |
| Framework | Next.js 15 (App Router, Server Actions) |
| Language  | TypeScript                              |
| Database  | PostgreSQL with Drizzle ORM             |
| Auth      | Auth.js v5 with the Discord provider    |
| Styling   | Tailwind CSS v4                         |

## Getting started

### 1. Requirements

- Node.js 20.9 or newer
- A PostgreSQL database (Docker locally, or Supabase/Neon in production)

### 2. Install

```bash
npm install
cp .env.example .env.local
```

### 3. Start a database

Locally with Docker:

```bash
docker run -d --name moonshade-pg \
  -e POSTGRES_USER=moonshade \
  -e POSTGRES_PASSWORD=moonshade \
  -e POSTGRES_DB=moonshade \
  -p 5433:5432 postgres:16-alpine
```

That matches the `DATABASE_URL` already in `.env.example`. For Supabase or Neon, paste
their connection string instead.

### 4. Configure the environment

Edit `.env.local`:

| Variable              | Purpose                                                                   |
| --------------------- | ------------------------------------------------------------------------- |
| `DATABASE_URL`        | Postgres connection string.                                               |
| `AUTH_SECRET`         | Session signing key. Generate with `npx auth secret`.                     |
| `AUTH_URL`            | Public site URL, e.g. `http://localhost:3000`.                            |
| `AUTH_DISCORD_ID`     | Discord application client ID.                                            |
| `AUTH_DISCORD_SECRET` | Discord application client secret.                                        |
| `DISCORD_GUILD_ID`    | Guild server ID; used to load each member's server nickname on sign-in.   |
| `DISCORD_MEMBER_ROLE_IDS` | Optional comma-separated Discord role IDs; only members with these roles are synced. |
| `DISCORD_WEBHOOK_URL` | Incoming Webhook URL; used to find the channel for queue posts.           |
| `DISCORD_BOT_TOKEN`   | Bot token; posts queue messages with Join/Leave buttons.                  |
| `DISCORD_PUBLIC_KEY`  | Application public key; verifies Discord interaction requests.            |
| `ADMIN_DISCORD_IDS`   | Comma-separated Discord user IDs that are always managers.                |
| `ADMIN_DISCORD_ROLE_IDS` | Comma-separated Discord role IDs whose members become managers.        |
| `ALLOW_DEV_LOGIN`     | `true` enables name-only login for local testing. Never use in production.|

To create the Discord credentials, open the
[Discord Developer Portal](https://discord.com/developers/applications), create an
application, and under **OAuth2** add a redirect URI of
`http://localhost:3000/api/auth/callback/discord` (and your production URL when you
deploy). Copy the client ID and secret into `.env.local`.

To post queues with Join/Leave buttons in Discord:

1. Open the target channel's **Edit Channel → Integrations → Webhooks**, create an
   Incoming Webhook, and copy its URL into `DISCORD_WEBHOOK_URL` (kept secret; used
   only to discover the channel ID).
2. In the same Discord application, open **Bot**, enable the bot, and copy the
   token into `DISCORD_BOT_TOKEN`. Under **General Information**, copy the
   **Public Key** into `DISCORD_PUBLIC_KEY`.
3. Invite the bot to the MoonShade server with **Send Messages** and **Embed Links**,
   and make sure it can see the queue channel.
4. Set **Interactions Endpoint URL** to
   `https://your-public-domain/api/discord/interactions`. Discord must reach a
   public HTTPS URL (plain `localhost` will not work). `AUTH_URL` should match that
   public origin so sign-in hints in bot replies point to the right site.
5. Members must sign in on the website once with Discord before the Join button
   works (so their Discord ID is linked). Quantity items open a modal for amount.

The manager page's **Send queue to Discord** button posts one bot message per item
(with Join/Leave). Empty selected queues are included so members can join from
Discord. Re-post after registrations change if you want the public list updated.

To find your own Discord user ID for `ADMIN_DISCORD_IDS`, enable **Developer Mode** in
Discord under Settings → Advanced, then right-click your name and choose *Copy User ID*.
For role-based managers, right-click a role in Server Settings → Roles and choose
*Copy Role ID*, then add it to `ADMIN_DISCORD_ROLE_IDS`.
If you leave both empty, the very first account to sign in becomes the manager.

### 5. Create the tables and seed

```bash
npm run db:migrate
npm run db:seed           # item catalogue, the guild's rules, one open round
npm run db:sync-members   # pull guild members from Discord (needs bot + guild ID)
```

The catalogue mirrors the item kinds named in the guild's form, including the red
accessories and Mirage cards that appear twice because they run a Gear Rating queue and a
random queue side by side.

### 6. Run it

```bash
npm run dev
```

Open <http://localhost:3000>.

## Deploy (recommended: Railway — app + database in one place)

**Railway** is the simplest option when you want the website and PostgreSQL together.
No separate Neon/Supabase account required.

### 1. Push the repo to GitHub

Railway deploys from Git. If the project is not on GitHub yet, create a repo and push it.

### 2. Create the Railway project

1. Open [railway.app](https://railway.app/) and sign in with GitHub.
2. **New Project** → **Deploy from GitHub repo** → select this repository.
3. In the same project, click **+ New** → **Database** → **PostgreSQL**.
4. Open the **web service** (your app) → **Variables** → **Add variable reference** →
   pick `DATABASE_URL` from the Postgres service (Railway links them automatically).

### 3. Set the remaining environment variables

Copy everything from `.env.local` into Railway **Variables**, then adjust:

| Variable | Production value |
| -------- | ---------------- |
| `AUTH_URL` | `https://moonshade-auction.up.railway.app` |
| `ALLOW_DEV_LOGIN` | `false` |

Public domain: **https://moonshade-auction.up.railway.app**
(Settings → Networking → Generate / custom domain.)

### 4. Discord (once you know the public URL)

| Setting | Value |
| ------- | ----- |
| OAuth2 redirect | `https://moonshade-auction.up.railway.app/api/auth/callback/discord` |
| Interactions endpoint | `https://moonshade-auction.up.railway.app/api/discord/interactions` |

Keep the `http://localhost:3000/...` redirects for local development.
In local `.env.local`, keep `AUTH_URL=http://localhost:3000` — set the Railway URL
only in Railway **Variables**.

### 5. Migrate and seed (once)

After the first deploy, open the Railway **web service** → **Settings** → run in the
shell (or use Railway CLI):

```bash
npm run db:migrate
npm run db:seed
npm run db:sync-members
```

Or locally with the Railway Postgres URL:

```bash
DATABASE_URL="postgresql://..." npm run db:migrate
DATABASE_URL="postgresql://..." npm run db:seed
DATABASE_URL="postgresql://..." npm run db:sync-members
```

(Copy `DATABASE_URL` from the Postgres service → **Connect** tab.)

Build/start commands are in `railway.json` (`npm run build` / `npm run start`).

---

## Deploy to Netlify (alternative — database is separate)

Production URL example: **https://moon-shade-auction.netlify.app**

Netlify cannot reach your local Docker Postgres. Create a hosted database first (Neon or
Supabase), run migrations against it once, then point Netlify at that connection string.

### 1. Database (once)

```bash
# Use the pooled connection string from Neon/Supabase in DATABASE_URL, then:
npm run db:migrate
npm run db:seed
npm run db:sync-members
```

### 2. Discord (once)

In the [Discord Developer Portal](https://discord.com/developers/applications):

| Setting | Value |
| ------- | ----- |
| OAuth2 redirect | `https://moon-shade-auction.netlify.app/api/auth/callback/discord` |
| Interactions endpoint | `https://moon-shade-auction.netlify.app/api/discord/interactions` |

Keep `http://localhost:3000/...` redirects as well if you still develop locally.

### 3. Netlify site

1. Push this repo to GitHub/GitLab/Bitbucket (or connect Netlify to your git remote).
2. [Netlify](https://app.netlify.com/) → **Add new site** → import the repo.
3. Set the site name to **`moon-shade-auction`** so the URL becomes
   `moon-shade-auction.netlify.app`.
4. Build settings are read from `netlify.toml` (`npm run build`, Next.js plugin).
5. **Site configuration → Environment variables** — copy every variable from `.env.local`,
   but set:

   | Variable | Production value |
   | -------- | ---------------- |
   | `AUTH_URL` | `https://moon-shade-auction.netlify.app` |
   | `DATABASE_URL` | Pooled Postgres URL from Neon/Supabase |
   | `ALLOW_DEV_LOGIN` | `false` (or leave unset) |

6. Deploy. After the first successful deploy, open the site and sign in with Discord to
   confirm OAuth works.

### CLI alternative

```bash
npm install -g netlify-cli
netlify login
netlify sites:create --name moon-shade-auction
netlify link
netlify env:set AUTH_URL https://moon-shade-auction.netlify.app
# …set the rest of the env vars…
netlify deploy --prod
```

## Scripts

| Command               | What it does                                          |
| --------------------- | ----------------------------------------------------- |
| `npm run dev`         | Development server.                                   |
| `npm run build`       | Production build.                                     |
| `npm start`           | Serve the production build.                           |
| `npm run lint`        | ESLint.                                               |
| `npm run test:unit`   | Unit tests for queue ordering and budgets.             |
| `npm run test:e2e`    | Playwright tests covering the weekly routine.          |
| `npm run db:generate` | Generate a migration after editing the schema.        |
| `npm run db:migrate`  | Apply pending migrations.                             |
| `npm run db:push`     | Push the schema directly, skipping migration files.   |
| `npm run db:studio`   | Browse the data in Drizzle Studio.                    |
| `npm run db:seed`     | Seed the catalogue, rules and this week's round.      |

### Tests

`npm run test:unit` covers the policy itself with no database: Gear Rating ordering, random
ordering and carried entries outranking fresh registrations.

`npm run test:e2e` drives a real browser through the weekly routine: a lower Gear Rating
registering first but still queueing behind a higher one, the one-item-per-week limit,
requested quantities being proposed without stock input, settlement decisions, and a bid ban
blocking registration.

It needs a running dev server with `ALLOW_DEV_LOGIN=true`:

```bash
npm run dev
# in another terminal
PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:e2e
```

Point `PLAYWRIGHT_BASE_URL` at whichever port Next.js actually chose if 3000 was taken.

## Typical weekly routine

1. A manager creates the week's round and sets it to **Open for registration**. Active
   catalogue items appear automatically.
2. If the previous round left anyone unserved, the manager presses **Carry over from
   previous round**. Those entries are drawn ahead of this week's new registrations.
3. Members keep their character profile current — especially Gear Rating — and register
   their wishlist for the round.
4. When registration closes, the manager presses **Draw round**. Each queue is ordered by its
   own rule and each requested quantity is shown for review.
5. The manager copies the generated announcement into Discord.
6. The manager settles each queued member as **received** or **no diamonds** (forfeits the
   round outright).

## Deployment notes

The app runs anywhere Next.js runs; Vercel plus a hosted Postgres is the simplest option.

- Set every variable from `.env.example` in the hosting environment, leaving
  `ALLOW_DEV_LOGIN` unset or `false`.
- Add your production callback URL to the Discord application's OAuth2 redirects.
- Run `npm run db:migrate` against the production database as part of your deploy.
- The database driver uses TCP sockets, so pages using it run on the Node.js runtime
  rather than the edge runtime. Authentication is checked in server components and server
  actions rather than in middleware for the same reason.

## Project layout

```
src/
  app/               Routes. /admin is guarded by a layout requiring the manager role.
  components/        UI, including the client forms that call server actions.
  db/                Drizzle schema, connection and seed script.
  lib/
    policy.ts        The guild's rules: wishlist types and ordering.
    queue.ts         Queue ordering, unit tested.
    actions/         Server actions, one module per area.
    i18n/            Thai and English dictionaries plus server and client helpers.
    queries.ts       Read queries, including building each round's ordered queues.
    announcement.ts  Builds the Discord message from a draw.
    guards.ts        Session helpers and role checks.
drizzle/             Generated SQL migrations.
e2e/                 Playwright scenarios for the weekly routine.
```
