import { useEffect, useRef, useState } from 'react'
import { Camera, Check, Loader2, RotateCcw, TriangleAlert } from 'lucide-react'
import { scanSlips, getRemainingScans } from '../utils/slipScanner'

const MAX_SIZE = 15 * 1024 * 1024

let nextId = 0

// Splits a dropped/picked FileList into scannable images and rejects
function triage(files) {
  const accepted = []
  const rejected = []
  for (const file of files) {
    if (!file.type.startsWith('image/')) rejected.push({ file, error: 'Not an image file.' })
    else if (file.size > MAX_SIZE) rejected.push({ file, error: 'Too large (max 15MB).' })
    else accepted.push(file)
  }
  return { accepted, rejected }
}

export default function SlipScanner({ onExtracted }) {
  const [items, setItems]       = useState([]) // { id, name, url, status, error }
  const [scanning, setScanning] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [notice, setNotice]     = useState('')
  const inputRef = useRef()
  const urlsRef  = useRef([])
  const apiKey   = import.meta.env.VITE_OPENAI_API_KEY

  // Object URLs for the thumbnails outlive individual renders — release them on unmount
  useEffect(() => () => urlsRef.current.forEach((u) => URL.revokeObjectURL(u)), [])

  function patch(id, changes) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...changes } : it)))
  }

  async function run(files) {
    const batch = files.map((file) => {
      const url = URL.createObjectURL(file)
      urlsRef.current.push(url)
      return { id: ++nextId, file, name: file.name, url, status: 'queued', error: '' }
    })
    setItems((prev) => [...prev, ...batch])
    setScanning(true)

    const results = await scanSlips(files, apiKey, {
      onStart:   (i) => patch(batch[i].id, { status: 'scanning' }),
      onSettled: (i, r) => patch(batch[i].id, { status: r.status, error: r.error || '' }),
    })

    setScanning(false)
    const extracted = results.filter((r) => r.status === 'done').map((r) => r.data)
    if (extracted.length > 0) onExtracted(extracted)
  }

  function processFiles(fileList) {
    // A second batch started mid-scan would race the shared `scanning` flag and
    // the progress counter. Clicking is already blocked; this covers drag & drop.
    if (scanning) {
      setNotice('Still scanning — wait for the current batch to finish, then add more.')
      return
    }
    const picked = Array.from(fileList || [])
    if (picked.length === 0) return

    const { accepted, rejected } = triage(picked)
    const messages = rejected.map((r) => `${r.file.name}: ${r.error}`)

    // Don't fire off scans we know the hourly limit will reject
    const remaining = getRemainingScans()
    let toScan = accepted
    if (accepted.length > remaining) {
      toScan = accepted.slice(0, Math.max(remaining, 0))
      messages.push(
        remaining > 0
          ? `Only ${remaining} scan${remaining === 1 ? '' : 's'} left this hour — scanning the first ${remaining} of ${accepted.length}.`
          : 'Hourly scan limit reached. Try again later.'
      )
    }

    setNotice(messages.join(' · '))
    if (toScan.length > 0) run(toScan)
  }

  async function retry(item) {
    setScanning(true)
    patch(item.id, { status: 'scanning', error: '' })
    const [result] = await scanSlips([item.file], apiKey, {})
    patch(item.id, { status: result.status, error: result.error || '' })
    setScanning(false)
    if (result.status === 'done') onExtracted([result.data])
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    processFiles(e.dataTransfer.files)
  }

  if (!apiKey) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-sm text-yellow-400">
        Add <code className="bg-yellow-500/20 px-1 rounded">VITE_OPENAI_API_KEY</code> to your <code className="bg-yellow-500/20 px-1 rounded">.env</code> file to enable slip scanning.
      </div>
    )
  }

  const failed    = items.filter((i) => i.status === 'error')
  const settled   = items.filter((i) => i.status === 'done' || i.status === 'error').length
  const remaining = getRemainingScans()

  return (
    <div className="space-y-3">
      <div
        onClick={() => !scanning && inputRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
          dragging ? 'border-green-400 bg-green-500/10'
          : scanning ? 'border-gray-700 cursor-wait'
          : 'border-gray-700 cursor-pointer hover:border-green-500/50 hover:bg-green-500/5'
        }`}
      >
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => { processFiles(e.target.files); e.target.value = '' }} />

        {scanning ? (
          <div className="space-y-2">
            <Loader2 className="w-8 h-8 text-green-400 mx-auto animate-spin" />
            <p className="text-sm text-green-400">
              Scanning slips — {settled} of {items.length} done
            </p>
            <p className="text-xs text-gray-500">Reading up to 3 at a time — this takes a few seconds each</p>
          </div>
        ) : (
          <div className="space-y-2">
            <Camera className="w-8 h-8 text-gray-500 mx-auto" />
            <p className="text-sm text-gray-300 font-medium">
              {items.length > 0 ? 'Add more slips' : 'Upload slip screenshots'}
            </p>
            <p className="text-xs text-gray-500">
              Drag &amp; drop or click to browse — pick as many as you like · {remaining} scan{remaining === 1 ? '' : 's'} left this hour
            </p>
          </div>
        )}
      </div>

      {notice && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-2.5 text-xs text-yellow-400 flex items-start gap-2">
          <TriangleAlert className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span className="flex-1">{notice}</span>
          <button onClick={() => setNotice('')} className="text-yellow-500/60 hover:text-yellow-400">Dismiss</button>
        </div>
      )}

      {/* Per-slip progress strip */}
      {items.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {items.map((item) => (
            <div key={item.id} className="relative flex-shrink-0" title={item.error || item.name}>
              <img src={item.url} alt={item.name}
                className={`h-16 w-16 object-cover rounded-lg border ${
                  item.status === 'done'  ? 'border-green-500/50'
                  : item.status === 'error' ? 'border-red-500/50 opacity-60'
                  : 'border-gray-700 opacity-50'
                }`} />
              <div className="absolute inset-0 flex items-center justify-center">
                {item.status === 'scanning' && <Loader2 className="w-5 h-5 text-green-400 animate-spin" />}
                {item.status === 'queued'   && <span className="text-[10px] text-gray-400 font-medium">Queued</span>}
                {item.status === 'done'     && <Check className="w-5 h-5 text-green-400 drop-shadow" />}
                {item.status === 'error'    && (
                  <button onClick={() => retry(item)} disabled={scanning}
                    className="text-red-400 hover:text-red-300 disabled:opacity-50" title={`${item.error} — click to retry`}>
                    <RotateCcw className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {failed.length > 0 && !scanning && (
        <p className="text-xs text-red-400">
          {failed.length} slip{failed.length === 1 ? '' : 's'} failed — {failed[0].error} Click the arrow on a thumbnail to retry.
        </p>
      )}
    </div>
  )
}
