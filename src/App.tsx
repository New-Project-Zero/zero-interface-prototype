import { useState, useEffect } from 'react'
import { PhantomWalletButton } from './components/PhantomWalletButton'
import { ChatComponent } from './components/ChatComponent'
//import { AgentStatus } from './components/AgentStatus'

export default function App() { 
  const [walletKey, setWalletKey] = useState<string | null>(null)
  //const [agentSpawned, setAgentSpawned] = useState(false)
  const [hasRequiredToken, setHasRequiredToken] = useState(false); // Add state for token ownership
  const [showPopup, setShowPopup] = useState(false); // Add state for the popup

  /*const handleSpawnAgent = async () => {
    if (walletKey && hasRequiredToken) {
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
  };*/
  
  useEffect(() => {
    const checkTokenBalance = async () => {
      if (walletKey) {
        try {
          console.log('wallet: ',walletKey);
          const response = await fetch('/api/check-token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ walletKey }),
          });

          if (response.ok) {
            const data = await response.json(); // Parse the response
            setHasRequiredToken(data.hasToken); // Update token ownership state
            if (!data.hasToken) {
              setShowPopup(true); // Show the popup if the user doesn't have the token
            }
            // Token check successful, maybe update state or show a success message
            console.log('User has the required token');
          } else {
            // Token check failed, handle accordingly (e.g., show an error message)
            console.error('User does not have the required token');
          }
        } catch (error) {
          console.error('Error checking token balance:', error);
        }
      }
    };

    checkTokenBalance(); // Call the function
  }, [walletKey]); // Run this effect whenever walletKey changes

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 to-black text-white font-sans p-4">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-bold">Homunculus Prototype</h1>
      </header>
      <main className="max-w-2xl mx-auto">
      <PhantomWalletButton onConnect={setWalletKey} />
      {walletKey && hasRequiredToken && (
        <>
          <ChatComponent walletKey={walletKey} /> {/* Removed agentSpawned prop */}
        </>
      )}

        {/* Popup - NEWP holders only */}
        {showPopup && (
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="bg-black bg-opacity-80 p-8 rounded-lg">
              <h2 className="text-2xl font-bold mb-4">NEWP Holders Only!</h2>
              <p className="mb-6">
                This feature is exclusively for NEWP token holders.
              </p>
              <button
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                onClick={() => setShowPopup(false)}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

