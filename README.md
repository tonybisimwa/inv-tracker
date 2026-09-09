# inv-tracker

A sports-betting journal and tipster platform. Users log their own bets — by hand or
by photographing a betting slip — and track bankroll, ROI, and unit performance over
time. An admin publishes daily plays, split into a free tier and a paid VIP tier.

## Stack

| | |
|---|---|
| UI | React 19 + React Router 7 |
| Build | Vite 8, Tailwind CSS v4 (via `@tailwindcss/vite`) |
| Backend | Firebase — Auth, Firestore, Hosting |
| Charts | Recharts |
| Slip OCR | OpenAI `gpt-4o-mini` vision |
| Lint | oxlint |
| Tests | `node:test` (no test framework dependency) |

## Getting started

```bash
npm install
cp .env.example .env   # then fill in the values below
npm run dev
```

### Environment

All of these are `VITE_`-prefixed, which means **they are inlined into the client
bundle and are readable by anyone who loads the app.** That's expected for the
Firebase web config — it isn't a secret, and access is enforced by security rules.
It is *not* acceptable for the OpenAI key; see [Known issues](#known-issues).

`.env.example` is the full list. In short:

```
VITE_FIREBASE_*              web config, 7 vars
VITE_OPENAI_API_KEY          slip scanning
VITE_STRIPE_LINK_*           weekly / monthly / yearly payment links
VITE_CASHAPP_TAG             manual payment handles shown at checkout
VITE_VENMO_HANDLE
VITE_PAYPAL_ME
```

The payment vars are optional. Any method whose handle is unset still appears at
checkout, but shows a "contact admin" fallback instead of payment details.

## Scripts

```bash
npm run dev      # dev server
npm run build    # production build to dist/
npm run preview  # serve the built bundle
npm run lint     # oxlint
npm test         # node:test — pure logic in src/utils
```

## Layout

```
src/
  contexts/    Auth, Plays, Settings, Toast — app-wide state, one Firestore
               listener each so tabs don't refetch
  hooks/       thin accessors over those contexts (useAdmin, usePlays, …)
  pages/       one per route; admin pages are lazy-loaded
  components/  presentational + BetForm / SlipScanner
  utils/       pure functions — calculations, slip parsing, concurrency
firestore.rules          access control (see below)
firestore.indexes.json   composite indexes
```

Routes are code-split with `React.lazy`. This matters for `AddBet`, which pulls in
the ~260 kB OpenAI SDK — that weight stays out of the initial load.

### Data model

```
users/{uid}                  isAdmin, isVIP, vipPlan, vipUntil, vipUntilMs,
                             username, bankroll, unitSize, lessonsRead[]
users/{uid}/bets/{betId}     the user's private journal
plays/{playId}               published picks; tier: 'free' | 'vip'
vipRequests/{reqId}          subscription requests awaiting admin action
settings/tipster             display name, stats visibility, public win/loss record
```

`vipUntilMs` is an epoch-millis mirror of the `vipUntil` ISO string. Security rules
can't parse date strings, so expiry has to be compared against a number.

The public win/loss record in `settings/tipster` is an aggregate maintained by the
admin on every result change. It exists because non-VIP clients no longer receive
VIP plays — counting the record client-side would show them a smaller, misleading
number. The aggregate keeps the track record honest without exposing the picks.

## Security rules

Two things are enforced server-side in `firestore.rules`, and both must stay that way:

1. **Users cannot grant themselves access.** `isAdmin`, `isVIP`, `vipPlan`,
   `vipUntil`, and `vipUntilMs` are admin-only writes. Owners can edit everything
   else on their own profile.
2. **The VIP paywall is a read rule, not a UI state.** A non-VIP is not permitted to
   read `tier: 'vip'` documents at all.

Firestore rules filter the *result set*, not individual documents: a query that
could match a document the caller can't read is rejected outright. So a non-VIP
client must query `where('tier', '==', 'free')` explicitly — which is why
`PlaysContext` runs two separate listeners and only attaches the VIP one when the
user is entitled to it.

### Deploying and testing rules

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

Running the rules against the emulator requires a **JDK**, which the rules test
suite needs and which is not installed in this checkout:

```bash
brew install openjdk        # prerequisite
firebase emulators:start --only firestore
```

Until that's set up, verify by hand after deploying, signed in as each role:

- [ ] Non-VIP loads `/plays` and sees free plays
- [ ] Non-VIP receives **no** VIP plays (check the network payload, not just the blur)
- [ ] VIP and admin both see VIP plays unblurred
- [ ] A user writing `{isAdmin: true}` to their own profile is denied
- [ ] Saving bankroll / unit size / lesson progress still succeeds
- [ ] Admin approve and revoke VIP still work

## Known issues

- **`VITE_OPENAI_API_KEY` ships to the browser.** Anyone can extract it and spend
  against the account. The fix is a server-side proxy — a Firebase Function fits,
  since Hosting is already the deploy target, but it needs the Blaze plan.
- No automated coverage of components or rules; `npm test` covers pure utils only.

## License

Private.
