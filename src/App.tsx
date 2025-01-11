import { useState } from 'react'
import { PhantomWalletButton } from './components/PhantomWalletButton'
import { ChatComponent } from './components/ChatComponent'
import { AgentStatus } from './components/AgentStatus'

export default function App() {
  const [walletKey, setWalletKey] = useState<string | null>(null)
  const [agentSpawned, setAgentSpawned] = useState(false)

  const handleSpawnAgent = async () => {
    if (walletKey) {
      try {
        const response = await fetch('/api/spawn-agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletKey })
        });
        if (response.ok) {
          setAgentSpawned(true);
        } else {
          console.error('Failed to spawn agent');
        }
      } catch (error) {
        console.error('Error spawning agent:', error);
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 to-black text-white font-sans p-4">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-bold">Homunculus Prototype</h1>
      </header>
      <main className="max-w-2xl mx-auto">
        <PhantomWalletButton onConnect={setWalletKey} onSpawnAgent={handleSpawnAgent} />
        {walletKey && agentSpawned && <AgentStatus walletKey={walletKey} />}
        {walletKey && <ChatComponent walletKey={walletKey} agentSpawned={agentSpawned} />}
      </main>
    </div>
  )
}

