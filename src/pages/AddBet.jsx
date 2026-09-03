import { useNavigate } from 'react-router-dom'
import { useBets } from '../hooks/useBets'
import BetForm from '../components/BetForm'
import Layout from '../components/Layout'

export default function AddBet() {
  const { addBet } = useBets()
  const navigate = useNavigate()

  async function handleSubmit(data) {
    await addBet(data)
    navigate('/')
  }

  return (
    <Layout>
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Add Bet</h1>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <BetForm onSubmit={handleSubmit} />
        </div>
      </div>
    </Layout>
  )
}
