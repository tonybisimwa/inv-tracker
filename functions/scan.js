import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions'
import OpenAI from 'openai'
import { db, userRef, requireAuth, getProfile, OPENAI_API_KEY } from './shared.js'
import { limitsFor, tierOf } from './plans.js'

const WINDOW_MS = 24 * 60 * 60 * 1000

// A compressed slip is typically well under 400 kB. This is a sanity ceiling on
// what we'll forward to OpenAI, not a UX limit — the client resizes first.
const MAX_IMAGE_CHARS = 4 * 1024 * 1024

const SPORTS = ['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB', 'Soccer', 'UFC/MMA', 'Tennis', 'Golf', 'Boxing', 'Other']
const BET_TYPES = ['Spread', 'Moneyline', 'Over/Under', 'Parlay', 'Prop', 'Futures', 'Teaser', 'Other']

const quotaRef = (uid) => userRef(uid).collection('usage').doc('scans')

// claimScan, refundScan, describeReset and normalise are exported for scan.test.js.
// Only scanSlip is a deployed entry point — index.js re-exports that alone, so the
// others are internal despite the keyword.

/**
 * Claims one scan against the caller's allowance, or refuses.
 *
 * This is the boundary that actually protects the OpenAI bill. The old version
 * lived in localStorage, which meant an incognito window reset it — so it was a
 * courtesy, not a limit. It has to be a transaction because a batch upload fires
 * several scans concurrently and a read-then-write would let them all pass.
 *
 * The window rolls over the last 24 hours rather than bucketing by calendar day,
 * so it needs no timezone from the client — and therefore can't be gamed by
 * lying about one. The array is trimmed to the limit so the doc stays small.
 */
export async function claimScan(uid, limit) {
  const ref = quotaRef(uid)
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const now = Date.now()
    const recent = (snap.exists ? snap.data().recent ?? [] : []).filter(
      (t) => typeof t === 'number' && t > now - WINDOW_MS
    )

    if (recent.length >= limit) {
      const resetAt = (recent.length ? Math.min(...recent) : now) + WINDOW_MS
      throw new HttpsError(
        'resource-exhausted',
        `You've used all ${limit} scans for today. More unlock ${describeReset(resetAt - now)}.`,
        { limit, resetAt }
      )
    }

    const next = [...recent, now].slice(-limit)
    tx.set(ref, { recent: next, limit, updatedAt: now }, { merge: true })
    // `stamp` is the value actually stored — a refund has to remove that exact
    // entry, not a timestamp the caller guessed before the transaction ran.
    return { remaining: limit - next.length, stamp: now }
  })
}

/** Hands back a claimed scan when the work it paid for failed on our side. */
export async function refundScan(uid, stamp) {
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(quotaRef(uid))
      if (!snap.exists) return
      const recent = snap.data().recent ?? []
      const at = recent.lastIndexOf(stamp)
      if (at === -1) return
      tx.update(quotaRef(uid), { recent: [...recent.slice(0, at), ...recent.slice(at + 1)] })
    })
  } catch (err) {
    // A failed refund must not mask the original error the caller needs to see
    logger.warn('could not refund scan quota', { uid, err: err.message })
  }
}

export function describeReset(ms) {
  const mins = Math.ceil(ms / 60000)
  if (mins < 60) return `in ${mins} minute${mins === 1 ? '' : 's'}`
  const hours = Math.ceil(mins / 60)
  return `in ${hours} hour${hours === 1 ? '' : 's'}`
}

/**
 * `today` only seasons the prompt so a slip with no visible year gets the right
 * one in the user's timezone. It never affects the quota, so a wrong value costs
 * the caller accuracy and nothing else.
 */
function buildPrompt(today) {
  const year = today.slice(0, 4)
  return `Analyze this sports betting slip screenshot and extract the bet details. Today's date is ${today} (year: ${year}). Return ONLY a valid JSON object with these fields:

{
  "sport": one of ${JSON.stringify(SPORTS)},
  "event": "team vs team or event name as shown",
  "betType": one of ${JSON.stringify(BET_TYPES)},
  "odds": American odds as an integer (e.g. -110 or 250, no plus sign needed for positive),
  "stake": wager amount as a number (no $ sign),
  "date": "YYYY-MM-DD" using year ${year} unless the slip clearly shows a different year — if no date is visible use "${today}",
  "notes": any relevant details like spread value, total line, specific prop description, or null
}

If a field cannot be determined confidently, use null. Return only the JSON, no explanation.`
}

/** Shapes the model's output into the exact bet object the form expects. */
export function normalise(parsed, today) {
  const odds = Number.parseInt(parsed.odds, 10)
  const stake = Number.parseFloat(parsed.stake)
  return {
    sport: SPORTS.includes(parsed.sport) ? parsed.sport : 'Other',
    event: typeof parsed.event === 'string' ? parsed.event : '',
    betType: BET_TYPES.includes(parsed.betType) ? parsed.betType : 'Moneyline',
    odds: Number.isFinite(odds) ? odds : '',
    stake: Number.isFinite(stake) ? stake : '',
    date: /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) ? parsed.date : today,
    notes: typeof parsed.notes === 'string' ? parsed.notes : '',
    outcome: 'pending',
  }
}

/**
 * Reads one betting slip.
 *
 * The whole reason this is a Cloud Function: the OpenAI key used to be a
 * VITE_ variable, which Vite inlines into the bundle for anyone to lift. Now the
 * key stays here and the browser only ever sees the parsed result.
 */
export const scanSlip = onCall(
  { secrets: [OPENAI_API_KEY], memory: '512MiB', timeoutSeconds: 120, cors: true },
  async (request) => {
    const uid = requireAuth(request)
    const image = request.data?.image
    const today = /^\d{4}-\d{2}-\d{2}$/.test(request.data?.today ?? '')
      ? request.data.today
      : new Date().toISOString().slice(0, 10)

    if (typeof image !== 'string' || !image.startsWith('data:image/')) {
      throw new HttpsError('invalid-argument', 'Send the slip as an image data URL.')
    }
    if (image.length > MAX_IMAGE_CHARS) {
      throw new HttpsError('invalid-argument', 'That image is too large — try a screenshot instead of a photo.')
    }

    const tier = tierOf(await getProfile(uid))
    const { scansPerDay } = limitsFor(tier)

    const { remaining, stamp } = await claimScan(uid, scansPerDay)

    try {
      const client = new OpenAI({ apiKey: OPENAI_API_KEY.value() })
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 512,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: image, detail: 'low' } },
              { type: 'text', text: buildPrompt(today) },
            ],
          },
        ],
      })

      const text = response.choices[0]?.message?.content?.trim() ?? ''
      const match = text.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('The model did not return JSON.')

      return { bet: normalise(JSON.parse(match[0]), today), remaining, tier }
    } catch (err) {
      // The user shouldn't pay a scan for our failure
      await refundScan(uid, stamp)
      logger.error('slip scan failed', { uid, err: err.message })
      if (err.status === 429) {
        throw new HttpsError('unavailable', 'The scanner is busy right now. Try again in a moment.')
      }
      throw new HttpsError('internal', "Couldn't read that slip. Try a clearer screenshot.")
    }
  }
)
