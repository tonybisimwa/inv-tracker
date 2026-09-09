/**
 * Statline's mark and wordmark.
 *
 * The mark is three ascending pills — a performance line, not a wager. It's
 * geometry rather than detail so it survives being shrunk to a 16px favicon,
 * and it draws with currentColor so callers set the colour with a text class.
 */

const SIZES = {
  sm: { mark: 'w-5 h-5', text: 'text-lg' },
  md: { mark: 'w-6 h-6', text: 'text-xl' },
  lg: { mark: 'w-8 h-8', text: 'text-3xl' },
}

export function LogoMark({ className = 'w-6 h-6' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="currentColor" aria-hidden="true" focusable="false">
      <rect x="5"    y="18" width="5" height="9"  rx="2.5" opacity="0.52" />
      <rect x="13.5" y="12" width="5" height="15" rx="2.5" opacity="0.76" />
      <rect x="22"   y="5"  width="5" height="22" rx="2.5" />
    </svg>
  )
}

export default function Logo({ size = 'md', className = '' }) {
  const s = SIZES[size] ?? SIZES.md
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark className={`${s.mark} shrink-0 text-green-400`} />
      <span className={`${s.text} font-bold tracking-tight text-gray-100`}>Statline</span>
    </span>
  )
}
