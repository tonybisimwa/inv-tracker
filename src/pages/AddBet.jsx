import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBets } from '../hooks/useBets'
import BetForm from '../components/BetForm'
import SlipScanner from '../components/SlipScanner'
import Layout from '../components/Layout'

export default function AddBet() {
  const { addBet } = useBets()
  const navigate = useNavigate()
  const [prefill, setPrefill] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(data) {
    setError('')
    setSaving(true)
    try {
      await addBet(data)
      navigate('/')
    } catch (e) {
      setError('Failed to save bet. Please try again.')
      setSaving(false)
    }
  }

  function handleExtracted(data) {
    setPrefill(data)
    window.scrollTo({ top: 300, behavior: 'smooth' })
  }

  return (
    <Layout>
      <div className="max-w-xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Add Bet</h1>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-400">Scan Slip</h2>
            <span className="text-xs text-gray-600">AI-powered · auto-fills form</span>
          </div>
          <SlipScanner onExtracted={handleExtracted} />
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-medium text-gray-400">Bet Details</h2>
            {prefill && (
              <button onClick={() => setPrefill(null)} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                Clear scan
              </button>
            )}
          </div>
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400 mb-4">
              {error}
            </div>
          )}
          <BetForm key={JSON.stringify(prefill)} initial={prefill} onSubmit={handleSubmit} submitLabel={saving ? 'Saving...' : 'Save Bet'} disabled={saving} />
        </div>
      </div>
    </Layout>
  )
}
