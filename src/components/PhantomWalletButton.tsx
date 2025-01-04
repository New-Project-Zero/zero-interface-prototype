import{ useEffect, useState } from 'react'

interface PhantomWalletButtonProps {
  onConnect: (publicKey: string) => void
}

export function PhantomWalletButton({ onConnect }: PhantomWalletButtonProps) {
  const [walletKey, setWalletKey] = useState<string | null>(null)

  useEffect(() => {
    const provider = (window as any).solana
    if (provider?.isPhantom) {
      provider.on('connect', () => {
        const publicKey = provider.publicKey.toString()
        setWalletKey(publicKey)
        onConnect(publicKey)
      })
    }
  }, [onConnect])

  const connectWallet = async () => {
    const provider = (window as any).solana
    if (provider?.isPhantom) {
      try {
        const { publicKey } = await provider.connect()
        setWalletKey(publicKey.toString())
        onConnect(publicKey.toString())
      } catch (err) {
        console.error("Error connecting to wallet:", err)
      }
    } else {
      window.open('https://phantom.app/', '_blank')
    }
  }

  return (
    <button 
      onClick={connectWallet}
      className="w-full mb-4 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
    >
      {walletKey ? `Connected: ${walletKey.slice(0, 4)}...${walletKey.slice(-4)}` : 'Connect Phantom Wallet'}
    </button>
  )
}

