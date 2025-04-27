'use client'

import React, { useState, useEffect } from 'react'
import useWalletKit from '../hooks/useWalletKit'
import WalletConnectModal from './WalletConnectModal'

export const WalletConnectButton: React.FC = () => {
  const { walletKit, loading, error } = useWalletKit()
  const [address, setAddress] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [wcUri, setWcUri] = useState<string | null>(null)

  useEffect(() => {
    // Check if already connected
    if (walletKit && walletKit.account) {
      setAddress(walletKit.account)
    }
  }, [walletKit])

  const connectWallet = async () => {
    if (!walletKit || loading) return
    
    try {
      setIsConnecting(true)
      // Get the URI from the connect method
      const { uri } = await walletKit.getConnectUri()
      
      if (uri) {
        setWcUri(uri)
        setShowModal(true)
        
        // The connection will be handled by the WalletConnect SDK
        // after the user scans the QR code
        walletKit.subscribeToEvents((account) => {
          if (account) {
            setAddress(account)
            setShowModal(false)
          }
          setIsConnecting(false)
        })
      }
    } catch (err) {
      console.error('Failed to connect wallet:', err)
      setIsConnecting(false)
    }
  }

  const disconnectWallet = async () => {
    if (!walletKit || !address) return
    
    try {
      await walletKit.disconnect()
      setAddress(null)
    } catch (err) {
      console.error('Failed to disconnect wallet:', err)
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setWcUri(null)
    setIsConnecting(false)
  }

  if (loading) {
    return <button className="bg-blue-500 text-white px-4 py-2 rounded opacity-50 cursor-not-allowed" disabled>Loading...</button>
  }

  if (error) {
    return <button className="bg-red-500 text-white px-4 py-2 rounded opacity-50 cursor-not-allowed" disabled>Error: {error.message}</button>
  }

  return (
    <>
      {address ? (
        <div className="flex items-center space-x-2">
          <span className="px-3 py-1 bg-gray-100 rounded-full text-sm font-medium">{`${address.substring(0, 6)}...${address.substring(address.length - 4)}`}</span>
          <button 
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded transition-colors" 
            onClick={disconnectWallet}
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button 
          className={`bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow transition-colors ${isConnecting ? 'opacity-75 cursor-not-allowed' : ''}`}
          onClick={connectWallet}
          disabled={isConnecting}
        >
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
      )}

      <WalletConnectModal 
        isOpen={showModal}
        onClose={closeModal}
        uri={wcUri}
      />
    </>
  )
}

export default WalletConnectButton