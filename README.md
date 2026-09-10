# Statline

*Track every play. Know your numbers.*

A sports-betting journal and tipster platform. Users log their own bets — by hand or
by photographing a betting slip — and track bankroll, ROI, and unit performance over
time. An admin publishes daily plays, split into a free tier and a paid VIP tier.

The name and voice deliberately borrow from sports analytics rather than wagering: a
statline is a player's performance summary, and this is the user's. Product copy
leads with measurement ("performance journal", "know your numbers"); the SEO
description still says "sports betting" because that's the search term.

Brand: `Logo.jsx` holds the mark and wordmark — three ascending pills drawn in
`currentColor` so callers set the colour with a text class. `public/favicon.svg` is
the same mark on gray-950, kept inside the maskable safe zone. Accent is green-400
(`#05df72` in sRGB); the repo directory is still `inv-tracker`.

## Stack

| | |
|---|---|
| UI | React 19 + React Router 7 |
| Build | Vite 8, Tailwind CSS v4 (via `@tailwindcss/vite`) |
| Backend | Firebase — Auth, Firestore, Hosting, Cloud Functions v2 (Blaze) |
| Payments | Stripe Checkout + Billing Portal, granted by webhook |
| Charts | Recharts |
| Slip OCR | OpenAI `gpt-4o-mini` vision, called server-side |
| Lint | oxlint |
| Tests | `node:test` (no test framework dependency) |

## Getting started

```bash
npm install
cp .env.example .env              # Firebase web config
(cd functions && npm install)
cp functions/.env.example functions/.env
npm run dev
```

The client talks to deployed Functions by default. `npm run dev` against
production Functions is fine for UI work; use the emulator if you're changing
function code.

### Environment

Two separate files, and the split is the point:

| | |
|---|---|
| `.env` | `VITE_FIREBASE_*` only. Inlined into the bundle, readable by anyone. Not secret. |
| `functions/.env` | `APP_URL` and the three `STRIPE_PRICE_*` ids. Non-secret params. |
| Secret Manager | `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`. Never in a file. |

```bash
firebase functions:secrets:set OPENAI_API_KEY
firebase functions:secrets:set STRIPE_SECRET_KEY
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
```

**No secret may carry a `VITE_` prefix.** Vite inlines every `VITE_`-prefixed
variable into the JavaScript it ships, so a `VITE_`-prefixed secret is a
published secret. This bit the project once already — see [History](#history).

## Cloud Functions

Six callables and one webhook, all in `functions/`:

| | |
|---|---|
| `scanSlip` | Reads a slip image. Holds the OpenAI key and enforces the scan allowance. |
| `createCheckoutSession` | Opens Stripe Checkout for a plan id. |
| `createPortalSession` | Opens Stripe's billing portal so cancelling never needs a human. |
| `startVipTrial` | Grants the 24-hour trial. Refuses a second one. |
| `stripeWebhook` | The only thing that grants or revokes paid VIP. |
| `deleteAccount` | Cancels the subscription, recursively deletes the user, deletes the Auth record. |

```bash
firebase deploy --only functions
```

Price ids are resolved **server-side** from the plan id. The client sends
`'monthly'`, never a price or an amount, so a tampered request cannot name a
cheaper price than the plan it claims.

### Stripe setup checklist

1. Create one Product with three recurring prices (weekly, monthly, yearly) and
   put those price ids in `functions/.env`.
2. Set the three secrets above. Use test keys until step 5 passes.
3. Register the webhook endpoint at `https://<your-domain>/api/stripe-webhook`,
   subscribed to `checkout.session.completed`,
   `customer.subscription.created`, `customer.subscription.updated`, and
   `customer.subscription.deleted`. Put its signing secret in
   `STRIPE_WEBHOOK_SECRET`.
   The path is a Hosting rewrite to the function, so it stays on your own
   origin — see the `rewrites` block in `firebase.json`.
4. Enable the Customer Portal (Settings › Billing › Customer portal) and allow
   plan switching and cancellation, or "Manage subscription" will 400.
5. Pay with `4242 4242 4242 4242` and confirm the profile flips to VIP without
   anyone touching the console.

Do not pin `payment_method_types` on the Checkout session. Leaving it unset is
what makes Stripe offer Apple Pay, Google Pay, Link, and local methods by
region — pinning it to `['card']` silently removes all of them.

Verify the webhook signature against `req.rawBody`, never a re-serialised body:
`JSON.parse` → `JSON.stringify` does not round-trip byte-for-byte, and the
signature is over the bytes.

## Scripts

```bash
npm run dev      # dev server
npm run build    # production build to dist/
npm run preview  # serve the built bundle
npm run lint           # oxlint
npm test               # node:test — pure logic in src/utils
npm run test:rules     # firestore.rules against the emulator (needs a JDK)
npm run test:functions # the scan allowance against the emulator (needs a JDK)
```

## Layout

```
src/
  config/      plans.js — tiers, prices, limits, the feature matrix
  contexts/    Auth, Plays, Settings, Toast — app-wide state, one Firestore
               listener each so tabs don't refetch
  firebase/    config.js (app/auth/db/functions) + api.js (callable wrappers)
  hooks/       thin accessors over those contexts (useAdmin, usePlays, …)
  pages/       one per route; admin pages are lazy-loaded
  components/  presentational + BetForm / SlipScanner / ErrorBoundary
  utils/       pure functions — calculations, entitlements, concurrency
functions/     Cloud Functions; deployed separately, own package.json
firestore.rules          access control (see below)
firestore.indexes.json   composite indexes (currently none needed)
```

Routes are code-split with `React.lazy`.

### Data model

```
users/{uid}                  isAdmin, username, bankroll, unitSize, lessonsRead[]
                             isVIP, vipPlan, vipUntil, vipUntilMs
                             trialStartedAt
                             stripeCustomerId, stripeSubscriptionId,
                             stripeStatus, cancelAtPeriodEnd
users/{uid}/bets/{betId}     the user's private journal
users/{uid}/usage/scans      rolling scan allowance; server-written, read-only
plays/{playId}               published picks; tier: 'free' | 'vip'
vipRequests/{reqId}          legacy manual-approval requests; nothing writes here now
settings/tipster             display name, stats visibility, public win/loss record
```

`vipUntilMs` is an epoch-millis mirror of the `vipUntil` ISO string. Security rules
can't parse date strings, so expiry has to be compared against a number.

## Tiers and entitlements

`src/config/plans.js` is the single source of truth for what each tier includes:
prices, limits, and the `FEATURE_MATRIX` the pricing table renders from. Add a
feature there and the comparison table, the gates, and the upsell copy all move
together — the copy on `/pricing` cannot drift from the code that enforces it.

|  | Standard | VIP |
|---|---|---|
| Journal, stats, Academy | full | full |
| Slips per scan | 1 | 20 |
| Scans per day | 5 | 150 |
| Published plays | occasional free play | full daily card + lottery parlay |

`functions/plans.js` is a deliberate duplicate of the tier limits. `firebase
deploy` uploads only `functions/`, so `../src` does not exist in production and
the server cannot import the client's copy. `src/utils/planParity.test.js` fails
the build if the two ever disagree — that test is the only thing keeping the
duplication honest, so don't delete it.

### What actually enforces the batch-scan gate

The `multiple` attribute on the file input is a convenience, not a boundary; a
determined user can call the callable directly. The real limit is
`scansPerDay`, claimed inside a Firestore transaction in `scanSlip`. It's a
**rolling 24-hour window**, not a calendar day: a rolling window needs no
timezone from the client, so nobody can reset their allowance by claiming to be
in Kiritimati. A batch upload fires scans concurrently, which is why the claim
is a transaction and not read-then-write.

A scan that fails after the claim is refunded by removing that exact timestamp,
so an OpenAI outage doesn't burn someone's allowance. The stamp has to be the
value the transaction actually stored — an earlier version computed it before the
transaction ran, so the refund never matched and failures quietly kept charging.

```bash
npm run test:functions
```

32 tests, and the one that matters most fires 20 concurrent claims against a
limit of 5 and asserts exactly 5 are granted. It is also mutation-checked:
replacing `runTransaction` with a read-then-write makes it fail (all 20 pass),
which is the answer to "why is this a transaction?".

### The trial

24 hours, no card, one per account. "One per account" rests entirely on
`trialStartedAt` being write-once, which is true only because it's in
`privilegedFields()` in the rules. `stripeCustomerId` is privileged for the same
reason: clearing it would restore trial eligibility, and forging it would let
someone claim another person's subscription.

The public win/loss record in `settings/tipster` is an aggregate maintained by the
admin on every result change. It exists because non-VIP clients no longer receive
VIP plays — counting the record client-side would show them a smaller, misleading
number. The aggregate keeps the track record honest without exposing the picks.

## Security rules

Three things are enforced server-side in `firestore.rules`, and all three must stay
that way:

1. **Users cannot grant themselves access.** Every field in `privilegedFields()`
   is closed to owner writes — `isAdmin`, `isVIP`, `vipPlan`, `vipUntil`,
   `vipUntilMs`, `trialStartedAt`, and the four `stripe*` fields. Owners can edit
   everything else on their own profile. Cloud Functions write these through the
   Admin SDK, which bypasses rules by design.
2. **The VIP paywall is a read rule, not a UI state.** A non-VIP is not permitted to
   read `tier: 'vip'` documents at all.
3. **The scan allowance is not client-writable.** `users/{uid}/usage/*` is
   read-only to the owner and written only by the function. A user who could
   write it could grant themselves unlimited scans, billed to us.

Note that rules on `match /users/{uid}` do **not** cascade to subcollections; the
`bets` and `usage` rules are separate `match` blocks and have to be.

Because only an admin can write `isAdmin`, the **first** admin has to be set from
the Firebase console by hand — flip `isAdmin` to `true` on your own `users/{uid}`
document. There is deliberately no in-app path to it.

Firestore rules filter the *result set*, not individual documents: a query that
could match a document the caller can't read is rejected outright. So a non-VIP
client must query `where('tier', '==', 'free')` explicitly — which is why
`PlaysContext` runs two separate listeners and only attaches the VIP one when the
user is entitled to it.

Those listeners deliberately do **not** use `orderBy`. Combining an equality filter
on `tier` with `orderBy('gameTime')` requires a composite index, and a missing index
rejects the entire listener — which looks exactly like plays failing to save. Plays
are sorted client-side instead; there are only a handful a day. Both listeners also
pass an error callback, because a rejected `onSnapshot` reports nowhere else and
would otherwise leave the page silently empty.

### One-time backfill before deploying

Plays are now fetched by two `where('tier', '==', …)` queries. A document with no
`tier` field matches **neither**, so it silently disappears for every user, admin
included. Publishing has always set `tier`, but check for stragglers first — in the
Firebase console, or from a browser console on the app while signed in as admin:

```js
// list plays missing a tier
const { getDocs, collection } = await import('firebase/firestore')
const snap = await getDocs(collection(db, 'plays'))
snap.docs.filter((d) => !d.data().tier).map((d) => d.id)
```

Backfill any that turn up with `tier: 'free'` before deploying the rules.

### Testing the rules

```bash
npm run test:rules      # boots the emulator, runs tests/firestore.rules.test.js
```

58 tests covering every trust boundary in the file: each of the ten privileged
fields individually, the batch-scan quota, the paywall including expiry, and the
result-set query behaviour. Run them before every rules deploy — this is the one
suite in the repo that covers something an attacker would actually try.

Requires a **JDK** for the emulator. It's keg-only on Homebrew, so it needs to be
on `PATH` rather than just installed:

```bash
brew install openjdk
export PATH="/opt/homebrew/opt/openjdk/bin:$PATH"
```

The suite has been mutation-checked: deleting `trialStartedAt` from
`privilegedFields()` fails exactly the two tests that cover it and nothing else.
If you change the rules and the suite still passes green, confirm it can actually
fail before believing it.

Two things to know when adding tests:

- Seed fixtures with `withSecurityRulesDisabled`. The documents under test are
  ones no client may create, so seeding through a normal context would only
  prove the rules block the seed.
- `clearFirestore()` in `beforeEach`, or one test's writes satisfy another's
  read and you get passes that mean nothing.

```bash
firebase deploy --only firestore:rules
```

## Pre-launch checklist

- [ ] Run the `tier` backfill above
- [ ] `npm run test:rules`, then deploy the rules
- [ ] Set `isAdmin` on your own user from the console
- [ ] Stripe: products, prices, secrets, webhook, portal enabled; test-card run
- [ ] Switch Stripe to live keys and re-register the live webhook (its signing
      secret is different from the test one)
- [ ] Confirm in writing with Stripe that they will support this business — see
      below
- [ ] Have a lawyer read `/legal`
- [ ] Rotate the OpenAI key that was previously exposed client-side

## Known issues and risks

- **Processor risk, and it's the one that could end the product.** Card networks
  and processors routinely classify paid sports-betting picks as a restricted or
  high-risk category, and accounts get frozen with funds held. Get written
  confirmation from Stripe before taking real money. The mitigation built into
  the product is the framing: VIP leads with *tools* — batch scanning, a higher
  allowance, the journal — and treats picks as included. That underwrites much
  closer to SaaS, and it's why `FEATURE_MATRIX` puts "Your journal" first. Don't
  reorder it to lead with picks without understanding what you're trading.
- No automated coverage of React components, and none of the Stripe webhook's
  subscription mapping — that one is reasoned about, not executed, and it's the
  biggest remaining gap now that the quota is covered. Testing it properly wants
  the Stripe CLI's `stripe trigger` against the emulator.
- Not built yet: analytics, offline persistence, auto-settling results from a
  scores API, push when plays drop, a trial-ending email.

## History

Two decisions worth knowing about, because rediscovering them is expensive:

**The OpenAI key used to ship to the browser.** `VITE_OPENAI_API_KEY` was read
directly by the client, which means it was extractable from the bundle by anyone
who loaded the app. It now lives only in Secret Manager and is used only inside
`scanSlip`. Rotate the old key if that hasn't happened yet — it was public for
as long as it was deployed. Removing the SDK from the client also took the
`AddBet` chunk from ~275 kB to ~14 kB.

**The scan limit used to be a `localStorage` counter.** It was framed as cost
control but reset in a private window, so it never was. Cost control has to be
server-side, keyed to the account.

**VIP used to be approved by hand.** Users paid by CashApp or Venmo, pasted a
transaction id, and waited up to 24 hours for an admin. Checkout plus the
webhook replaced it. `vipRequests` and the admin approval screen are left in
place for anything still mid-flight, but nothing writes there any more.

## License

Private.
