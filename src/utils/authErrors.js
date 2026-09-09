/**
 * Firebase auth errors arrive as things like
 *   "Firebase: Error (auth/invalid-credential)."
 * which we were showing to users verbatim. Map the ones people actually hit to
 * plain language, and tell them what to do next.
 */
const MESSAGES = {
  'auth/invalid-email':             'That email address doesn\'t look right.',
  'auth/invalid-credential':        'Wrong email or password. Please try again.',
  'auth/wrong-password':            'Wrong email or password. Please try again.',
  'auth/user-not-found':            'No account with that email. Create one below.',
  'auth/user-disabled':             'This account has been disabled.',
  'auth/email-already-in-use':      'That email already has an account. Sign in instead.',
  'auth/weak-password':             'Please pick a password of at least 6 characters.',
  'auth/missing-password':          'Please enter your password.',
  'auth/too-many-requests':         'Too many attempts. Wait a minute and try again.',
  'auth/network-request-failed':    'Network problem — check your connection and retry.',
  'auth/popup-closed-by-user':      'Sign-in window closed before finishing.',
  'auth/cancelled-popup-request':   'Sign-in window closed before finishing.',
  'auth/popup-blocked':             'Your browser blocked the sign-in popup. Allow popups and retry.',
  'auth/operation-not-allowed':     'That sign-in method isn\'t enabled for this app.',
  'auth/unauthorized-domain':       'This domain isn\'t authorised for sign-in.',
}

export function authErrorMessage(error) {
  return MESSAGES[error?.code] ?? 'Something went wrong signing you in. Please try again.'
}
