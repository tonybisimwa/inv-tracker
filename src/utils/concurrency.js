/**
 * Runs `fn` over every item with at most `limit` calls in flight at once.
 *
 * Unlike Promise.all, one rejection never cancels the rest — every item gets
 * its own settled result, positionally matched to `items`:
 *   { status: 'done', value } | { status: 'error', reason }
 *
 * `onStart(index)` fires when an item is picked up, `onSettled(index, result)`
 * when it finishes, so callers can report progress as it happens.
 */
export async function mapWithConcurrency(items, limit, fn, { onStart, onSettled } = {}) {
  const results = new Array(items.length)
  let next = 0

  async function worker() {
    while (next < items.length) {
      const i = next++
      onStart?.(i)
      try {
        results[i] = { status: 'done', value: await fn(items[i], i) }
      } catch (reason) {
        results[i] = { status: 'error', reason }
      }
      onSettled?.(i, results[i])
    }
  }

  const workers = Math.max(1, Math.min(limit, items.length))
  await Promise.all(Array.from({ length: workers }, worker))
  return results
}
