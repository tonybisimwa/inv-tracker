import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { Check, Info, TriangleAlert, X } from 'lucide-react'

const ToastContext = createContext(null)

const VARIANTS = {
  success: { Icon: Check,         ring: 'border-green-500/40',  tint: 'bg-green-500/10',  fg: 'text-green-400' },
  error:   { Icon: TriangleAlert, ring: 'border-red-500/40',    tint: 'bg-red-500/10',    fg: 'text-red-400' },
  info:    { Icon: Info,          ring: 'border-gray-700',      tint: 'bg-gray-800',      fg: 'text-gray-300' },
}

const DURATION = 4000

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())
  const nextId = useRef(0)

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) { clearTimeout(timer); timers.current.delete(id) }
  }, [])

  const push = useCallback((message, variant = 'success') => {
    const id = ++nextId.current
    setToasts((prev) => [...prev, { id, message, variant }])
    timers.current.set(id, setTimeout(() => dismiss(id), DURATION))
    return id
  }, [dismiss])

  // Convenience wrappers so callers read as intent, not configuration.
  // Memoised so the context value is referentially stable across renders and
  // consumers don't re-render every time a toast appears.
  const toast = useMemo(() => ({
    success: (m) => push(m, 'success'),
    error:   (m) => push(m, 'error'),
    info:    (m) => push(m, 'info'),
  }), [push])

  return (
    <ToastContext.Provider value={toast}>
      {children}

      {/* aria-live so screen readers announce results that are otherwise
          only conveyed visually. Sits above the mobile bottom nav. */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed inset-x-0 bottom-24 md:bottom-6 z-[60] flex flex-col items-center gap-2 px-4 pointer-events-none"
      >
        {toasts.map((t) => {
          const { Icon, ring, tint, fg } = VARIANTS[t.variant] ?? VARIANTS.info
          return (
            <div
              key={t.id}
              role="status"
              className={`pointer-events-auto w-full max-w-sm flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg shadow-black/40 backdrop-blur ${ring} ${tint} animate-rise`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${fg}`} aria-hidden="true" />
              <p className="flex-1 text-sm text-gray-100">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="text-gray-500 hover:text-gray-200 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

// Safe no-op default keeps components usable outside the provider (e.g. tests)
const NOOP = { success: () => {}, error: () => {}, info: () => {} }
export const useToast = () => useContext(ToastContext) ?? NOOP
