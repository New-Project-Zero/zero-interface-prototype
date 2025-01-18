import { useEffect, useState } from 'react'

interface PhantomWalletButtonProps {
  onConnect: (publicKey: string) => void
}

export function PhantomWalletButton({ onConnect }: PhantomWalletButtonProps) {
  const [walletKey, setWalletKey] = useState<string | null>(null)
  const [agentSpawned, setAgentSpawned] = useState(false)

  const connectWallet = async () => {
    const provider = window.solana;
    if (provider) {
      try {
        const publicKey = await provider.connect();
        setWalletKey(publicKey.publicKey.toString());
        onConnect(publicKey.publicKey.toString());
      } catch (error) {
        console.error("Error connecting to Phantom Wallet:", error);
      }
    } else {
      console.error("Phantom Wallet not found.");
    }
  };

  /*const handleSpawnAgent = async () => {
    setAgentSpawned(true);
  }*/

  useEffect(() => {
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length > 0) {
        setWalletKey(accounts[0]);
      } else {
        setWalletKey(null);
      }
    };

    if (window.solana) {
      window.solana.on('accountsChanged', handleAccountsChanged);
      return () => window.solana.removeListener('accountsChanged', handleAccountsChanged);
    }
  }, []);

  return (
    <div className="flex flex-col items-center w-full gap-4">
      <button 
        onClick={connectWallet}
        className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
      >
        {walletKey ? `Connected: ${walletKey.slice(0, 4)}...${walletKey.slice(-4)}` : 'Connect Phantom Wallet'}
      </button>
    </div>
  )
}

