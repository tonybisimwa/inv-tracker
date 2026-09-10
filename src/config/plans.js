/**
 * The single source of truth for what each tier costs and what it includes.
 *
 * Everything downstream reads from here: the pricing page's comparison table,
 * the scanner's batch gate, the paywall copy, and the quota the Cloud Function
 * enforces (mirrored in functions/plans.js — see the note there).
 *
 * The point of centralising it is that marketing copy and enforcement can't
 * drift apart. If VIP stops getting batch scanning, the table stops claiming it.
 */

export const TRIAL_HOURS = 24

/**
 * Prices are displayed here but charged by Stripe, which holds the real amount
 * against a price ID. The IDs live in the Functions config, never in the client,
 * so a tampered request can't select a cheaper price than the plan it names.
 * That does mean these strings and Stripe can drift — change both together.
 */
export const PLANS = [
  {
    id: 'weekly',
    label: 'Weekly',
    price: '$9.99',
    period: '/week',
    note: 'Cancel anytime',
    badge: null,
  },
  {
    id: 'monthly',
    label: 'Monthly',
    price: '$29.99',
    period: '/month',
    note: 'Most popular',
    badge: 'Save 25%',
    featured: true,
  },
  {
    id: 'yearly',
    label: 'Yearly',
    price: '$199.99',
    period: '/year',
    note: 'Two months free',
    badge: 'Best value',
  },
]

export const PLAN_IDS = PLANS.map((p) => p.id)

export const planById = (id) => PLANS.find((p) => p.id === id) ?? null

/**
 * Hard numbers the app enforces. `slipsPerScan` is the batch gate the user asked
 * for — Standard uploads one slip at a time, VIP drops a whole camera roll in.
 *
 * `scansPerDay` is the one that actually protects the OpenAI bill, and it is
 * enforced server-side. The batch limit is a client-side convenience on top:
 * a determined Standard user could still fire single scans in a loop, which is
 * exactly why the daily quota is the real boundary.
 */
export const TIERS = {
  standard: {
    id: 'standard',
    name: 'Standard',
    price: 'Free',
    blurb: 'The whole journal, free forever.',
    limits: { slipsPerScan: 1, scansPerDay: 5 },
  },
  vip: {
    id: 'vip',
    name: 'VIP',
    price: 'From $9.99',
    blurb: 'Everything in Standard, plus the full daily card and batch tools.',
    limits: { slipsPerScan: 20, scansPerDay: 150 },
  },
}

export const limitsFor = (tier) => (TIERS[tier] ?? TIERS.standard).limits

/**
 * The comparison table the user asked for.
 *
 * A cell is `true`, `false`, or a string. Strings carry the nuance that a tick
 * can't — "Up to 5, more on a big slate" is the honest version of the promise,
 * and writing it here means the pricing page and the paywall say the same thing.
 *
 * Ordering is deliberate: the journal comes first. Statline's paid pitch leads
 * with tools you keep, not picks you rent.
 */
export const FEATURE_MATRIX = [
  {
    group: 'Your journal',
    rows: [
      { label: 'Log bets by hand', standard: true, vip: true },
      { label: 'P&L, ROI, win rate, bankroll curve', standard: true, vip: true },
      { label: 'Breakdowns by sport and bet type', standard: true, vip: true },
      { label: 'Betting Academy — all 8 lessons', standard: true, vip: true },
    ],
  },
  {
    group: 'Slip scanning',
    rows: [
      {
        label: 'Scan a slip from a photo',
        detail: 'Reads sport, line, odds, and stake off a screenshot.',
        standard: 'One at a time',
        vip: `Up to ${TIERS.vip.limits.slipsPerScan} at once`,
      },
      {
        label: 'Batch upload',
        detail: 'Select a whole camera roll and review the lot in one pass.',
        standard: false,
        vip: true,
      },
      {
        label: 'Daily scan allowance',
        standard: `${TIERS.standard.limits.scansPerDay} per day`,
        vip: `${TIERS.vip.limits.scansPerDay} per day`,
      },
    ],
  },
  {
    group: "The daily card",
    rows: [
      {
        label: 'Free play',
        detail: 'Posted when there is one worth posting.',
        standard: 'Occasional',
        vip: 'Included',
      },
      {
        label: 'Best bets',
        detail: 'The plays with the strongest case on the day.',
        standard: false,
        vip: 'Up to 5 daily, more on a big slate',
      },
      {
        label: 'Daily lottery parlay',
        detail: 'One long-shot ticket a day, sized as a lottery ticket should be.',
        standard: false,
        vip: true,
      },
      { label: 'Full published track record', standard: true, vip: true },
    ],
  },
  {
    group: 'Account',
    rows: [
      { label: 'Export your data', standard: true, vip: true },
      { label: 'Cancel yourself, anytime', standard: '—', vip: true },
      { label: `${TRIAL_HOURS}-hour free trial`, standard: '—', vip: 'One per account' },
    ],
  },
]

/** Short VIP selling points, for the paywall and checkout where the table won't fit. */
export const VIP_HIGHLIGHTS = [
  'Up to 5 best bets a day — more when the slate is big',
  'The daily lottery parlay',
  `Scan up to ${TIERS.vip.limits.slipsPerScan} slips at once`,
  `${TIERS.vip.limits.scansPerDay} scans a day instead of ${TIERS.standard.limits.scansPerDay}`,
]
