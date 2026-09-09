import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronDown, ChevronUp, TrendingUp, Calculator, Shield, Wallet, Zap } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import Layout from '../components/Layout'

const CATEGORIES = {
  bankroll: { label: 'Bankroll',  color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/30',  bar: 'bg-green-500', Icon: Shield },
  math:     { label: 'Math',      color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/30',   bar: 'bg-blue-500',  Icon: Calculator },
  strategy: { label: 'Strategy',  color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', bar: 'bg-orange-500',Icon: TrendingUp },
  mindset:  { label: 'Mindset',   color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', bar: 'bg-purple-500',Icon: Zap },
}

const DIFFICULTY = {
  beginner:     { label: 'Beginner',     color: 'text-green-400 bg-green-500/10' },
  intermediate: { label: 'Intermediate', color: 'text-yellow-400 bg-yellow-500/10' },
  pro:          { label: 'Pro',          color: 'text-red-400 bg-red-500/10' },
}

const LESSONS = [
  {
    id: 1, category: 'bankroll', difficulty: 'beginner',
    title: 'The Unit System',
    summary: 'Stop betting random amounts. Units give you a consistent, bankroll-relative staking system that survives losing streaks.',
    content: [
      'A unit is simply a fixed percentage of your total bankroll — typically 1%. If you have $500, one unit is $5. This is the foundation of professional bankroll management.',
      'The system works because your stake scales with your actual bankroll. As you win, units get slightly larger. As you lose, they shrink — automatically protecting you from ruin.',
      'Most plays should be 1-2 units. Reserve 3-5 units for your highest-conviction plays (max 5% of bankroll). Never go above 5 units on a single bet, no matter how confident you feel.',
    ],
    takeaways: [
      '1 unit = 1% of total bankroll',
      'Standard plays: 1-2 units',
      'Best bets: 3-5 units max',
      'Never bet more than 5% on one game',
    ],
  },
  {
    id: 2, category: 'math', difficulty: 'beginner',
    title: 'American Odds Decoded',
    summary: 'Know exactly what -110, +150, and -300 mean — and how to instantly calculate your implied win probability.',
    content: [
      'Negative odds (e.g. -110) tell you how much you need to bet to win $100. Bet $110 to profit $100. Positive odds (e.g. +150) tell you how much you win on a $100 bet — profit $150.',
      'Every line has an implied probability baked in. For -110: 110 / (110 + 100) = 52.4%. That\'s the break-even win rate. Beat it consistently and you\'re profitable.',
      'The sportsbook\'s juice (vig) is built into both sides. A standard -110/-110 line means the book takes ~4.5% on each dollar wagered. This is why even a 50% win rate loses money at -110.',
    ],
    takeaways: [
      'Negative odds: cost to win $100',
      'Positive odds: profit on $100 bet',
      '-110 breaks even at 52.4% win rate',
      'Always calculate implied probability before betting',
    ],
  },
  {
    id: 3, category: 'strategy', difficulty: 'beginner',
    title: 'Line Shopping',
    summary: 'Half a point is worth more than you think. Having accounts at multiple books is the single easiest edge in sports betting.',
    content: [
      'Line shopping means checking multiple sportsbooks for the best available line before placing your bet. A team available at -3 at one book and -2.5 at another is a massive difference — especially on a key number like 3 in the NFL.',
      'Over a season, consistently getting +0.5 to +1 point better numbers is worth several percentage points in win rate. That\'s the difference between a winning and losing bettor.',
      'Set up accounts at 3-5 books minimum. Compare lines before every single bet. Never settle for the number your default book gives you.',
    ],
    takeaways: [
      'Always check 3+ books before betting',
      'Half a point on key numbers is huge',
      'Best books: DraftKings, FanDuel, BetMGM, Caesars',
      'Line shopping is the easiest free edge available',
    ],
  },
  {
    id: 4, category: 'math', difficulty: 'intermediate',
    title: 'Expected Value (+EV)',
    summary: 'The only metric that separates winning bettors from losing ones. If your EV is positive, bet it. If it\'s negative, don\'t.',
    content: [
      'Expected Value (EV) = (Probability of Win × Amount Won) − (Probability of Loss × Amount Lost). A bet with positive EV will make money over a large sample, even if it loses today.',
      'The key is finding situations where YOUR estimated probability is higher than the sportsbook\'s implied probability. If you think a team has a 55% chance to cover but the line implies 52%, you have +EV.',
      'This is why line shopping matters — better odds = higher EV on the same bet. A +EV approach combined with proper bankroll management is the closest thing to a guaranteed long-term strategy.',
    ],
    takeaways: [
      'EV = (Win% × Profit) − (Loss% × Stake)',
      'Positive EV = profitable long-term',
      'Your edge is when your probability > implied probability',
      'Bankroll management amplifies positive EV',
    ],
  },
  {
    id: 5, category: 'strategy', difficulty: 'intermediate',
    title: 'Closing Line Value',
    summary: 'The most predictive indicator of long-term betting skill. Beat the closing line consistently, and you\'re a winning bettor.',
    content: [
      'The closing line is the final line posted before the game starts. It reflects the most efficient market — after sharp bettors, public money, and injury news have all been priced in.',
      'Closing Line Value (CLV) means you got a better number than the closing line. If you bet -2.5 and the game closed at -3.5, you beat the close by a full point.',
      'Studies of professional bettors show that CLV is the single best predictor of long-term profitability — more predictive than actual win rate over short samples. Track your CLV on every bet.',
    ],
    takeaways: [
      'Bet early when you have conviction',
      'Track CLV on every play',
      'Positive CLV long-term = winning bettor',
      'Win rate in small samples is misleading; CLV is not',
    ],
  },
  {
    id: 6, category: 'math', difficulty: 'intermediate',
    title: 'Parlay Math',
    summary: 'Parlays are the casino\'s best friend. Know when they\'re pure juice and when a correlated parlay might justify the risk.',
    content: [
      'A 2-team parlay at -110/-110 pays +260 if both legs win. But the true odds of both winning (at 52.4% each) are 0.524 × 0.524 = 27.5%, which pays fair odds of +264. The book pays +260 — you\'re already behind.',
      'Every leg you add compounds the vig. A 4-team parlay should pay +1228 at true odds. Books typically pay around +1000-1100. The house edge grows with every leg.',
      'Correlated parlays are the exception — same-game parlays where two outcomes are linked (e.g. a QB passes for 300+ yards AND the game goes over). The correlation reduces the book\'s edge. Handle these individually.',
    ],
    takeaways: [
      'Standard parlays compound the house edge',
      '2-team parlay true odds: +264; books pay ~+260',
      'Lottery parlays are entertainment, not strategy',
      'Correlated same-game parlays have lower house edge',
    ],
  },
  {
    id: 7, category: 'strategy', difficulty: 'intermediate',
    title: 'Sharp vs. Square Money',
    summary: 'Sharp bettors move lines. Public bettors inflate them. Learn to read line movement and follow the money that matters.',
    content: [
      'Squares (recreational bettors) bet popular teams, big names, and home favorites. Books shade lines to attract public money, which often creates value on the other side.',
      'Sharp money is from professional bettors with real edges. When a line moves against the public betting percentage — e.g. 70% of bets are on Team A but the line moves toward Team A — that\'s reverse line movement, a sign of sharp action.',
      'Key numbers to watch: NFL lines at 3, 3.5, 6, 7, 7.5, 10. Books will take losses to avoid moving off key numbers. A line moving through a key number is a significant signal.',
    ],
    takeaways: [
      'Reverse line movement = sharp action',
      'Bet against heavy public sides (50%+ on one team)',
      'Watch for steam moves — fast, sharp-driven line moves',
      'NFL key numbers: 3, 7, 10, 14',
    ],
  },
  {
    id: 8, category: 'mindset', difficulty: 'beginner',
    title: 'The Long Game',
    summary: 'Every professional bettor has losing weeks. How you handle variance determines whether you survive long enough to profit.',
    content: [
      'Even a 55% win rate at -110 means you lose 45% of your bets. Losing streaks of 7-10 in a row are statistically normal. They are not a sign that your approach is broken.',
      'The two killers of bankrolls are chasing losses (increasing bet size to win back money) and going on tilt (abandoning your process after bad beats). Both feel completely rational in the moment.',
      'Track everything. Win rate, ROI, CLV, units won/lost. The data tells you if your process is working even when results aren\'t. A well-tracked losing month is far less damaging than a poorly-tracked losing week.',
    ],
    takeaways: [
      'Losing streaks are normal — don\'t chase',
      'Never increase unit size after losses',
      'Trust your process, not short-term results',
      'Data is your only protection against tilt',
    ],
  },
]

function LessonCard({ lesson, read, onToggleRead }) {
  const [open, setOpen] = useState(false)
  const cat  = CATEGORIES[lesson.category]
  const diff = DIFFICULTY[lesson.difficulty]
  const panelId = `lesson-${lesson.id}-body`

  return (
    <div className={`bg-gray-900 border rounded-2xl overflow-hidden transition-colors ${read ? 'border-gray-800/60' : 'border-gray-800'}`}>
      {/* Colored top bar */}
      <div className={`h-0.5 ${cat.bar} ${read ? 'opacity-40' : ''}`} />

      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full text-left px-5 py-4 flex items-start justify-between gap-4"
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cat.bg} ${cat.color}`}>
              <cat.Icon className="w-3 h-3" aria-hidden="true" />{cat.label}
            </span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${diff.color}`}>
              {diff.label}
            </span>
            {read && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500">
                <Check className="w-3 h-3" aria-hidden="true" />Read
              </span>
            )}
          </div>
          <h3 className={`font-bold text-base ${read ? 'text-gray-400' : 'text-gray-100'}`}>{lesson.title}</h3>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">{lesson.summary}</p>
        </div>
        <div className="flex-shrink-0 mt-1 text-gray-500">
          {open ? <ChevronUp className="w-5 h-5" aria-hidden="true" /> : <ChevronDown className="w-5 h-5" aria-hidden="true" />}
        </div>
      </button>

      {open && (
        <div id={panelId} className="px-5 pb-5 space-y-4 border-t border-gray-800 pt-4">
          {lesson.content.map((para, i) => (
            <p key={i} className="text-sm text-gray-300 leading-relaxed">{para}</p>
          ))}
          <div className={`rounded-xl p-4 ${cat.bg} border ${cat.border}`}>
            <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${cat.color}`}>Key Takeaways</p>
            <ul className="space-y-1">
              {lesson.takeaways.map((t, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                  <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${cat.bar}`} aria-hidden="true" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={() => onToggleRead(lesson.id)}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              read
                ? 'border border-gray-700 text-gray-400 hover:text-gray-200'
                : 'bg-green-500 hover:bg-green-400 text-gray-950'
            }`}
          >
            <Check className="w-4 h-4" aria-hidden="true" />
            {read ? 'Mark as unread' : 'Mark as read'}
          </button>
        </div>
      )}
    </div>
  )
}

const FILTERS = [
  { id: 'all',      label: 'All' },
  { id: 'unread',   label: 'Unread' },
  { id: 'bankroll', label: 'Bankroll' },
  { id: 'math',     label: 'Math' },
  { id: 'strategy', label: 'Strategy' },
  { id: 'mindset',  label: 'Mindset' },
]

export default function Academy() {
  const [filter, setFilter] = useState('all')
  const { bankroll, lessonsRead, updateProfile } = useAuth()
  const toast = useToast()

  const read = new Set(lessonsRead ?? [])
  const doneCount = LESSONS.filter((l) => read.has(l.id)).length
  const pct = Math.round((doneCount / LESSONS.length) * 100)
  const nextUp = LESSONS.find((l) => !read.has(l.id))

  async function toggleRead(id) {
    const next = read.has(id)
      ? (lessonsRead ?? []).filter((x) => x !== id)
      : [...(lessonsRead ?? []), id]
    try {
      await updateProfile({ lessonsRead: next })
      if (!read.has(id)) {
        toast.success(next.length === LESSONS.length ? 'Academy complete — nice work.' : 'Lesson marked as read.')
      }
    } catch {
      toast.error('Could not save your progress.')
    }
  }

  const visible =
    filter === 'all'    ? LESSONS :
    filter === 'unread' ? LESSONS.filter((l) => !read.has(l.id)) :
                          LESSONS.filter((l) => l.category === filter)

  const beginnerCount = LESSONS.filter((l) => l.difficulty === 'beginner').length

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-8">

        {/* Hero */}
        <div className="relative bg-gray-900 border border-gray-800 rounded-2xl p-6 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-blue-500/5" aria-hidden="true" />
          <div className="relative">
            <p className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-2">Betting Academy</p>
            <h1 className="text-2xl font-bold text-gray-100 mb-2">Bet smarter, not harder.</h1>
            <p className="text-gray-400 text-sm leading-relaxed max-w-lg">
              {LESSONS.length} lessons covering bankroll management, odds math, and advanced strategy.
              Start with the {beginnerCount} beginner lessons and work your way up.
            </p>

            {/* Progress — reading eight lessons with no sense of where you are
                is why people bounce off content like this. */}
            <div className="mt-5">
              <div className="flex items-baseline justify-between mb-2">
                <p className="text-xs font-medium text-gray-400">
                  {doneCount} of {LESSONS.length} lessons read
                </p>
                <p className="text-xs font-bold text-green-400 tabular">{pct}%</p>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden"
                role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
                aria-label="Academy progress">
                <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
              {nextUp && (
                <p className="text-xs text-gray-500 mt-2">
                  Next up: <span className="text-gray-300">{nextUp.title}</span>
                </p>
              )}
            </div>

            {/* Make the bankroll lesson actionable instead of theoretical */}
            {!bankroll && (
              <Link to="/settings"
                className="inline-flex items-center gap-2 mt-5 text-xs font-semibold bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 px-3 py-2 rounded-lg transition-colors">
                <Wallet className="w-3.5 h-3.5" aria-hidden="true" />
                Set your bankroll to put lesson 1 into practice
              </Link>
            )}

            <div className="flex gap-4 mt-5 text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500" aria-hidden="true" />{LESSONS.filter(l=>l.difficulty==='beginner').length} Beginner</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-500" aria-hidden="true" />{LESSONS.filter(l=>l.difficulty==='intermediate').length} Intermediate</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" aria-hidden="true" />{LESSONS.filter(l=>l.difficulty==='pro').length} Pro</span>
            </div>
          </div>
        </div>

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === f.id
                  ? 'bg-green-500 text-gray-950'
                  : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-gray-200'
              }`}
            >
              {f.label}
              {f.id === 'unread' && doneCount < LESSONS.length && (
                <span className="ml-1.5 tabular">{LESSONS.length - doneCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* Lessons */}
        <div className="space-y-3">
          {visible.map((lesson) => (
            <LessonCard key={lesson.id} lesson={lesson} read={read.has(lesson.id)} onToggleRead={toggleRead} />
          ))}
          {visible.length === 0 && (
            <div className="text-center py-12">
              <Check className="w-8 h-8 text-green-400 mx-auto mb-3" aria-hidden="true" />
              <p className="text-sm text-gray-400">You&rsquo;ve read every lesson. Go put it to work.</p>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-600 pb-4">More lessons coming soon.</p>
      </div>
    </Layout>
  )
}
