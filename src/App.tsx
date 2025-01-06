import { useState } from 'react'
import { PhantomWalletButton } from './components/PhantomWalletButton'
import { ChatComponent } from './components/ChatComponent'

export default function App() {
  const [walletKey, setWalletKey] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 to-black text-white font-sans p-4">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-bold">Homunculus Prototype</h1>
      </header>
      <main className="max-w-2xl mx-auto">
        <PhantomWalletButton onConnect={setWalletKey} />
        {walletKey && <ChatComponent walletKey={walletKey} />}
      </main>
    </div>
  )
}