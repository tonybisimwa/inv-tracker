import { Component } from 'react'

/**
 * Catches a render-time throw and shows something other than a white screen.
 *
 * Without this, one bad value from Firestore — a play with a malformed date, a
 * null where a number was assumed — unmounts the whole app and leaves a blank
 * page with no way forward. On a phone that's indistinguishable from the app
 * being broken, and the user's only recourse is to delete it.
 *
 * A class component because that is still the only way to catch this. Hooks have
 * no equivalent of componentDidCatch.
 */
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // The stack is the only useful artefact here, and it's gone on reload
    console.error('[boundary] render failed:', error, info?.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto">
            <span className="text-2xl" aria-hidden="true">⚠</span>
          </div>
          <div>
            <h1 className="text-xl font-bold">This page hit a snag</h1>
            <p className="text-sm text-gray-400 mt-2 leading-relaxed">
              Your bets are safe — nothing here is stored on this device. Reloading
              usually clears it.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="bg-green-500 hover:bg-green-400 text-gray-950 font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors"
            >
              Reload
            </button>
            {/* A full page load, not a router navigation: the router is part of
                the tree that just failed, so pushing a route may not recover. */}
            <button
              onClick={() => window.location.assign('/')}
              className="border border-gray-700 hover:border-gray-500 text-gray-300 font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors"
            >
              Go to dashboard
            </button>
          </div>

          <details className="text-left">
            <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-400">
              Technical details
            </summary>
            <pre className="mt-2 text-[11px] text-gray-500 bg-gray-900 border border-gray-800 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
              {this.state.error?.message ?? String(this.state.error)}
            </pre>
          </details>
        </div>
      </div>
    )
  }
}
