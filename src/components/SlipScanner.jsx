import { useState, useRef } from 'react'
import { Camera } from 'lucide-react'
import { scanSlip, getRemainingScans } from '../utils/slipScanner'

export default function SlipScanner({ onExtracted }) {
  const [state, setState] = useState('idle') // idle | scanning | done | error
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef()
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  const remaining = getRemainingScans()

  async function processFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      setError('Please upload an image file.')
      setState('error')
      return
    }
    if (file.size > 15 * 1024 * 1024) {
      setError('Image too large (max 15MB).')
      setState('error')
      return
    }
    setPreview(URL.createObjectURL(file))
    setState('scanning')
    setError('')
    try {
      const data = await scanSlip(file, apiKey)
      setState('done')
      onExtracted(data)
    } catch (e) {
      setState('error')
      setError(e.message || 'Failed to scan slip.')
    }
  }

  function handleFile(e) { processFile(e.target.files[0]) }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    processFile(e.dataTransfer.files[0])
  }

  if (!apiKey) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-sm text-yellow-400">
        Add <code className="bg-yellow-500/20 px-1 rounded">VITE_OPENAI_API_KEY</code> to your <code className="bg-yellow-500/20 px-1 rounded">.env</code> file to enable slip scanning.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div
        onClick={() => state !== 'scanning' && inputRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          dragging ? 'border-green-400 bg-green-500/10'
          : state === 'scanning' ? 'border-gray-700 cursor-wait'
          : 'border-gray-700 hover:border-green-500/50 hover:bg-green-500/5'
        }`}
      >
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

        {state === 'scanning' ? (
          <div className="space-y-2">
            {preview && <img src={preview} className="h-24 object-contain mx-auto rounded opacity-60" alt="slip" />}
            <p className="text-sm text-green-400 animate-pulse">Scanning slip...</p>
          </div>
        ) : state === 'done' ? (
          <div className="space-y-2">
            {preview && <img src={preview} className="h-24 object-contain mx-auto rounded" alt="slip" />}
            <p className="text-sm text-green-400">Extracted — review the form below</p>
            <p className="text-xs text-gray-500">Click to scan a different slip</p>
          </div>
        ) : (
          <div className="space-y-2">
            <Camera className="w-8 h-8 text-gray-500 mx-auto" />
            <p className="text-sm text-gray-300 font-medium">Upload a slip screenshot</p>
            <p className="text-xs text-gray-500">Drag & drop or click to browse · {remaining} scans remaining this hour</p>
          </div>
        )}
      </div>

      {state === 'error' && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400">
          {error}
          <button onClick={() => { setState('idle'); setPreview(null) }} className="ml-3 underline text-xs">Try again</button>
        </div>
      )}
    </div>
  )
}
