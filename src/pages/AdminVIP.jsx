import { useState, useEffect } from 'react'
import { collection, onSnapshot, doc, updateDoc, query, orderBy } from 'firebase/firestore'
import { Star, CheckCircle, XCircle, ShieldOff } from 'lucide-react'
import { db } from '../firebase/config'
import { useToast } from '../contexts/ToastContext'
import Layout from '../components/Layout'

const PLAN_DAYS = { weekly: 7, monthly: 30, yearly: 365 }

function expiry(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  // Security rules can't parse an ISO string, so store an epoch-millis mirror
  // alongside it. The rules compare against vipUntilMs; the UI shows vipUntil.
  return { vipUntil: d.toISOString(), vipUntilMs: d.getTime() }
}

export default function AdminVIP() {
  const toast = useToast()
  const [requests, setRequests] = useState([])
  const [vipUsers, setVipUsers]  = useState([])
  const [loading, setLoading]    = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'vipRequests'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, (snap) => {
      setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    return onSnapshot(collection(db, 'users'), (snap) => {
      setVipUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((u) => u.isVIP))
    })
  }, [])

  async function approve(req) {
    try {
      await Promise.all([
        updateDoc(doc(db, 'vipRequests', req.id), { status: 'approved' }),
        updateDoc(doc(db, 'users', req.uid), { isVIP: true, vipPlan: req.plan, ...expiry(PLAN_DAYS[req.plan] || 30) }),
      ])
      toast.success(`VIP approved — ${req.plan} plan.`)
    } catch {
      toast.error('Could not approve that request.')
    }
  }

  async function reject(req) {
    try {
      await updateDoc(doc(db, 'vipRequests', req.id), { status: 'rejected' })
      toast.success('Request rejected.')
    } catch {
      toast.error('Could not reject that request.')
    }
  }

  async function revoke(uid) {
    try {
      await updateDoc(doc(db, 'users', uid), { isVIP: false, vipPlan: null, vipUntil: null, vipUntilMs: null })
      toast.success('VIP access revoked.')
    } catch {
      toast.error('Could not revoke VIP access.')
    }
  }

  const pending  = requests.filter((r) => r.status === 'pending')
  const settled  = requests.filter((r) => r.status !== 'pending')

  if (loading) return <Layout><div className="flex items-center justify-center h-64 text-gray-500">Loading...</div></Layout>

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold">VIP Management</h1>
          <p className="text-gray-500 text-sm mt-1">
            {pending.length} pending · {vipUsers.length} active member{vipUsers.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Pending requests */}
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Pending Requests</h2>
          {pending.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center text-gray-600">
              No pending requests
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map((req) => (
                <div key={req.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <p className="font-semibold font-mono text-purple-300">{req.username}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                        <span className="capitalize">{req.plan}</span>
                        <span>·</span>
                        <span>{req.method}</span>
                        <span>·</span>
                        <span>{new Date(req.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-gray-400 break-all">
                        Txn: <span className="font-mono text-gray-300">{req.txnId}</span>
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => approve(req)}
                        className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-semibold px-3 py-2 rounded-lg hover:bg-green-500/20 transition-colors"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => reject(req)}
                        className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold px-3 py-2 rounded-lg hover:bg-red-500/20 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Active VIP members */}
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Active VIP Members</h2>
          {vipUsers.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center text-gray-600">
              No active VIP members
            </div>
          ) : (
            <div className="space-y-3">
              {vipUsers.map((u) => (
                <div key={u.id} className="bg-gray-900 border border-purple-500/20 rounded-2xl p-5 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Star className="w-3.5 h-3.5 text-purple-400" />
                      <span className="font-semibold font-mono text-purple-300">{u.username || u.email}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 text-xs text-gray-500">
                      <span className="capitalize">{u.vipPlan} plan</span>
                      {u.vipUntil && (
                        <><span>·</span><span>Expires {new Date(u.vipUntil).toLocaleDateString()}</span></>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => revoke(u.id)}
                    className="flex items-center gap-1.5 bg-gray-800 border border-gray-700 text-gray-400 text-xs font-semibold px-3 py-2 rounded-lg hover:border-red-500/50 hover:text-red-400 transition-colors flex-shrink-0"
                  >
                    <ShieldOff className="w-3.5 h-3.5" /> Revoke
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Settled history */}
        {settled.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Settled Requests</h2>
            <div className="space-y-2">
              {settled.map((req) => (
                <div key={req.id} className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-3 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-gray-400">{req.username}</span>
                    <span className="text-xs text-gray-600 capitalize">{req.plan}</span>
                  </div>
                  <span className={req.status === 'approved' ? 'text-green-400' : 'text-red-400'}>
                    {req.status === 'approved' ? 'Approved' : 'Rejected'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </Layout>
  )
}
