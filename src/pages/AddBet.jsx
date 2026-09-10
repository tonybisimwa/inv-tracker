import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBets } from '../hooks/useBets'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import BetForm from '../components/BetForm'
import SlipScanner from '../components/SlipScanner'
import ScannedBetsReview from '../components/ScannedBetsReview'
import Layout from '../components/Layout'

let nextId = 0

export default function AddBet() {
  const { addBet, addBets } = useBets()
  const { canBatchScan } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [scanned, setScanned] = useState([]) // { _id, ...betData } awaiting review
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [scannerKey, setScannerKey] = useState(0) // bump to remount (and reset) the scanner

  // Drop the review list and the scanner's thumbnails together, so the two never disagree
  function clearAll() {
    setScanned([])
    setError('')
    setScannerKey((k) => k + 1)
  }

  // Scanner hands up one batch at a time; keep earlier reviews and their edits
  function handleExtracted(newBets) {
    setScanned((prev) => [...prev, ...newBets.map((b) => ({ ...b, _id: ++nextId }))])
  }

  function updateScanned(id, data) {
    setScanned((prev) => prev.map((b) => (b._id === id ? { ...data, _id: id } : b)))
  }

  function removeScanned(id) {
    const left = scanned.filter((b) => b._id !== id)
    // Discarding the last one is the same as discarding all — reset the scanner too
    if (left.length === 0) clearAll()
    else setScanned(left)
  }

  async function handleSaveAll() {
    setError('')
    setSaving(true)
    try {
      const count = scanned.length
      await addBets(scanned.map(({ _id, ...bet }) => bet))
      // Toasts live above the router, so the confirmation survives the redirect
      toast.success(`${count} ${count === 1 ? 'bet' : 'bets'} saved.`)
      navigate('/')
    } catch {
      setError('Failed to save bets. Please try again.')
      setSaving(false)
    }
  }

  async function handleSubmitOne(data) {
    setError('')
    setSaving(true)
    try {
      await addBet(data)
      toast.success('Bet saved.')
      navigate('/')
    } catch {
      setError('Failed to save bet. Please try again.')
      setSaving(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Add Bets</h1>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-gray-400">{canBatchScan ? 'Scan Slips' : 'Scan a Slip'}</h2>
            <span className="text-xs text-gray-600 text-right">
              {canBatchScan ? 'AI-powered · upload several at once' : 'AI-powered · one at a time'}
            </span>
          </div>
          <SlipScanner key={scannerKey} onExtracted={handleExtracted} />
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          {scanned.length > 0 ? (
            <ScannedBetsReview
              bets={scanned}
              onChange={updateScanned}
              onRemove={removeScanned}
              onClearAll={clearAll}
              onSaveAll={handleSaveAll}
              saving={saving}
              error={error}
            />
          ) : (
            <>
              <h2 className="text-sm font-medium text-gray-400 mb-5">Bet Details</h2>
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400 mb-4">
                  {error}
                </div>
              )}
              <BetForm
                onSubmit={handleSubmitOne}
                submitLabel={saving ? 'Saving...' : 'Save Bet'}
                disabled={saving}
              />
            </>
          )}
        </div>
      </div>
    </Layout>
  )
}
