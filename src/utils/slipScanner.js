/**
 * Slip scanning, client side.
 *
 * Everything that used to happen here — the API key, the prompt, the parsing,
 * the rate limit — now happens in the `scanSlip` Cloud Function. What's left is
 * the part that genuinely needs a browser: resizing the image with a canvas
 * before upload. That removes the OpenAI SDK from the bundle (~260 kB) along
 * with the key it needed.
 *
 * The allowance is no longer readable from here either; it lives in
 * users/{uid}/usage/scans and is read by useScanQuota, because a number the
 * client keeps is a number the client can reset.
 */

import { mapWithConcurrency } from './concurrency.js'
import { scanSlipRemote } from '../firebase/api'

// Slips read at once. Enough to feel instant on a batch, few enough to stay well
// inside the function's per-instance concurrency and OpenAI's per-minute limits.
const CONCURRENCY = 3

const MAX_DIMENSION = 1200
const JPEG_QUALITY = 0.85

/**
 * Shrinks a slip to something worth uploading.
 *
 * A phone screenshot is often 3–8 MB; the model reads a 1200px JPEG just as well.
 * This runs before the network call, so it also keeps us inside the callable
 * request size limit on a large batch.
 */
export async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      let { width, height } = img
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_DIMENSION) / width)
          width = MAX_DIMENSION
        } else {
          width = Math.round((width * MAX_DIMENSION) / height)
          height = MAX_DIMENSION
        }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(url)

      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('Could not process that image.')); return }
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.onerror = () => reject(new Error('Could not read that image.'))
          reader.readAsDataURL(blob)
        },
        'image/jpeg',
        JPEG_QUALITY
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read that image.'))
    }
    img.src = url
  })
}

/** The caller's local date, so a slip with no visible year is dated correctly
 *  for them rather than for UTC. */
function localToday() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Reads one slip. Resolves to the bet object the form expects. */
export async function scanSlip(file) {
  const image = await compressImage(file)
  const { bet } = await scanSlipRemote(image, localToday())
  return bet
}

/**
 * Scans several slips, at most CONCURRENCY in flight.
 *
 * One slip failing never stops the others — every file gets its own result, so a
 * single unreadable screenshot in a batch of twenty doesn't cost the other
 * nineteen. `onStart(i)` / `onSettled(i, result)` fire as each slip moves so the
 * UI can show per-slip progress. Results are positionally matched to `files`:
 *   { status: 'done', data } | { status: 'error', error }
 */
export async function scanSlips(files, { onStart, onSettled } = {}) {
  const toResult = (r) =>
    r.status === 'done'
      ? { status: 'done', data: r.value }
      : { status: 'error', error: r.reason?.message || 'Failed to scan slip.' }

  const settled = await mapWithConcurrency(files, CONCURRENCY, (file) => scanSlip(file), {
    onStart,
    onSettled: (i, r) => onSettled?.(i, toResult(r)),
  })
  return settled.map(toResult)
}
