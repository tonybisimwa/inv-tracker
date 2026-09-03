import OpenAI from 'openai'

const RATE_LIMIT_KEY = 'inv_scan_log'
const MAX_SCANS_PER_HOUR = 20

function getRateLimitLog() {
  try {
    return JSON.parse(localStorage.getItem(RATE_LIMIT_KEY) || '[]')
  } catch {
    return []
  }
}

function checkRateLimit() {
  const now = Date.now()
  const hourAgo = now - 60 * 60 * 1000
  const log = getRateLimitLog().filter((t) => t > hourAgo)
  if (log.length >= MAX_SCANS_PER_HOUR) {
    const oldest = log[0]
    const resetIn = Math.ceil((oldest + 60 * 60 * 1000 - now) / 60000)
    throw new Error(`Rate limit reached (${MAX_SCANS_PER_HOUR}/hour). Resets in ~${resetIn} min.`)
  }
  log.push(now)
  localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(log))
}

export function getRemainingScans() {
  const now = Date.now()
  const hourAgo = now - 60 * 60 * 1000
  const log = getRateLimitLog().filter((t) => t > hourAgo)
  return MAX_SCANS_PER_HOUR - log.length
}

async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const MAX = 1200
      let { width, height } = img
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round((height * MAX) / width); width = MAX }
        else { width = Math.round((width * MAX) / height); height = MAX }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(url)
      canvas.toBlob((blob) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      }, 'image/jpeg', 0.85)
    }
    img.onerror = reject
    img.src = url
  })
}

const EXTRACT_PROMPT = `Analyze this sports betting slip screenshot and extract the bet details. Return ONLY a valid JSON object with these fields:

{
  "sport": one of ["NFL","NBA","MLB","NHL","NCAAF","NCAAB","Soccer","UFC/MMA","Tennis","Golf","Boxing","Other"],
  "event": "team vs team or event name as shown",
  "betType": one of ["Spread","Moneyline","Over/Under","Parlay","Prop","Futures","Teaser","Other"],
  "odds": American odds as an integer (e.g. -110 or 250, no plus sign needed for positive),
  "stake": wager amount as a number (no $ sign),
  "date": "YYYY-MM-DD" if visible, otherwise null,
  "notes": any relevant details like spread value, total line, specific prop description, or null
}

If a field cannot be determined confidently, use null. Return only the JSON, no explanation.`

export async function scanSlip(file, apiKey) {
  if (!apiKey) throw new Error('OpenAI API key not configured. Add VITE_OPENAI_API_KEY to your .env file.')

  checkRateLimit()

  const imageDataUrl = await compressImage(file)

  const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true })

  let attempt = 0
  while (attempt < 3) {
    try {
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 512,
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageDataUrl, detail: 'low' } },
            { type: 'text', text: EXTRACT_PROMPT },
          ],
        }],
      })

      const text = response.choices[0].message.content.trim()
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Could not parse response from AI.')

      const parsed = JSON.parse(jsonMatch[0])
      return {
        sport: parsed.sport || 'Other',
        event: parsed.event || '',
        betType: parsed.betType || 'Moneyline',
        odds: parsed.odds ? parseInt(parsed.odds) : '',
        stake: parsed.stake ? parseFloat(parsed.stake) : '',
        date: parsed.date || new Date().toISOString().split('T')[0],
        notes: parsed.notes || '',
        outcome: 'pending',
      }
    } catch (err) {
      if (err.status === 429 && attempt < 2) {
        await new Promise((r) => setTimeout(r, (attempt + 1) * 2000))
        attempt++
        continue
      }
      throw err
    }
  }
}
