import { useState, useEffect } from 'react'
import { PhantomWalletButton } from './components/PhantomWalletButton'
import { ChatComponent } from './components/ChatComponent'
import { SidebarButtons } from './components/SidebarButtons'
import { SidebarAgentSection } from './components/SidebarAgentSection'
import LeafGenerator from './components/LeafGenerator'
//import { AgentStatus } from './components/AgentStatus'

//gotta be a better way to get tools
interface Tool { 
  name: string;
  action: string;
}
const tools: Tool[] = [
  { name: 'Wallet Information', action: 'publicKey' },
  { name: 'Token Information', action: 'contract' },
];

export default function App() { 
  const [walletKey, setWalletKey] = useState<string | null>(null)
  //const [agentSpawned, setAgentSpawned] = useState(false)
  const [hasRequiredToken, setHasRequiredToken] = useState(false); // state for token ownership
  const [showPopup, setShowPopup] = useState(false); // state for popup
  const [showInitialPopup, setShowInitialPopup] = useState(true); // state for initial popup

  const handleDisconnect = () => {
    setWalletKey(null);
    setHasRequiredToken(false);
  };

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
            const data = await response.json(); // parse response
            setHasRequiredToken(data.hasToken); // Update token ownership state
            if (!data.hasToken) {
              setShowPopup(true); // popup if the user doesn't have newp
            }
          } else {
            console.error('User does not have the required token');
          }
        } catch (error) {
          console.error('Error checking token balance:', error);
        }
      }
    };

    checkTokenBalance(); 
  }, [walletKey]); // run effect whenever walletKey changes

  return (
    
    <div className="min-h-screen bg-gradient-to-b from-green-900 to-black text-white font-serif p-2 relative overflow-hidden">
      <LeafGenerator />
      <header className="text-center mb-6 relative z-10">
        <h1 className="text-4xl font-bold">🌱 Homunculus Prototype 🌱</h1>
        <div className="mt-4 flex justify-center max-w-xs mx-auto"> {/* Centered the button */}
        <PhantomWalletButton 
          onConnect={setWalletKey} 
          onDisconnect={handleDisconnect}
        />
        </div>
      </header>
      <main className="max-w-8xl mx-auto relative z-10">
  {walletKey && hasRequiredToken && (
    <div className="mx-auto flex w-full max-w-8xl h-[95vh]"> {/* w-full ensures it tries to take full width within max-w-8xl */}
      {/*Left Sidebar info section*/}
      <aside className="w-64 max-w-xs p-4 mr-2 bg-gray-800 rounded-lg info-section"> {/* max-w-xs limits sidebar width */}
        <SidebarButtons toolList={tools} />
      </aside>

      {/* Main Content Area */}
      <section className="flex-1 bg-gray-800 rounded-lg chat-section"> {/* flex-1 makes it grow */}
        <ChatComponent walletKey={walletKey} />
      </section>

      {/* Right Sidebar Agent Section */}
      <aside className="w-64 max-w-xs p-4 ml-2 bg-gray-800 rounded-lg agent-section"> {/* max-w-xs limits sidebar width */}
        <SidebarAgentSection walletKey={walletKey}/>
      </aside>
    </div>
  )}

        {/* Initial Popup */}
        {showInitialPopup && (
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="bg-black bg-opacity-80 p-8 rounded-lg max-w-md text-center">
              <h2 className="text-2xl font-bold mb-4">Welcome to Homunculus v0.103</h2>
              <p className="mb-6">
                $NEWP holders can connect their wallets and use the Homunculus prototype. This is an early version so some functionality may be buggy. Expansion of capabilities will be implemented regularly with many features planned for the future. 
              </p>
              <button
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                onClick={() => setShowInitialPopup(false)}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* NEWP holders only popup*/}
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

