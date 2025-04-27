'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import OptionList from '@/components/OptionList'
import CreateOption from '@/components/CreateOption'
import LiquidityPanel from '@/components/LiquidityPanel'
import NetworkInfo from '@/components/NetworkInfo'
import MarketInfo from '@/components/MarketInfo'
import MyOptions from '@/components/MyOptions'
import { useAccount } from 'wagmi'

export default function Home() {
  const { isConnected } = useAccount()
  const [activeTab, setActiveTab] = useState<'options' | 'myOptions' | 'liquidity'>('options')
  const [mounted, setMounted] = useState(false)
  
  // Wait for client-side hydration to complete
  useEffect(() => {
    setMounted(true)
  }, [])

  // If not mounted yet, render a placeholder that matches the structure
  // This ensures server and client renders match during hydration
  if (!mounted) {
    return (
      <main className="min-h-screen bg-gray-100">
        <Header />
        
        <div className="container mx-auto py-8 px-4">
          <h1 className="text-3xl font-bold mb-6 text-gray-900">Options AMM on Flare Network</h1>
          
          {/* Added Market Info component to display pool stats */}
          <MarketInfo />
          
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-black">Welcome to Options AMM</h2>
            <p className="text-black mb-4">
              This decentralized application allows you to:
            </p>
            <ul className="list-disc pl-5 mb-6 space-y-2 text-black">
              <li>Create and trade options on the Flare Network</li>
              <li>Provide liquidity to earn fees from option trades</li>
              <li>Exercise in-the-money options when they expire</li>
            </ul>
            <p className="text-black mb-4">
              Please connect your wallet to get started. Make sure you&apos;re connected to the Flare Coston2 Testnet.
            </p>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <p className="text-black">
                <strong>Network Information:</strong> Flare Coston2 Testnet (Chain ID: 114)<br/>
                <strong>RPC URL:</strong> https://coston2-api.flare.network/ext/C/rpc
              </p>
            </div>
          </div>
        </div>
        
        <footer className="bg-gray-800 text-white py-6 mt-10">
          <div className="container mx-auto px-4 text-center">
            <p>Options AMM Platform - Decentralized Options Trading on Flare Network</p>
          </div>
        </footer>
      </main>
    )
  }

  // Normal render after client-side hydration
  return (
    <main className="min-h-screen bg-gray-100">
      <Header />
      
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">Options AMM on Flare Network</h1>
        
        {/* Always display Market Info component to show total liquidity and ETH/USD price */}
        <MarketInfo />
        
        {/* Always show network warning banner if wrong network */}
        {isConnected && <NetworkInfo />}
        
        {isConnected ? (
          <>
            <div className="flex mb-6 border-b">
              <button
                className={`py-2 px-4 font-medium ${
                  activeTab === 'options'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
                onClick={() => setActiveTab('options')}
              >
                Options
              </button>
              <button
                className={`py-2 px-4 font-medium ${
                  activeTab === 'myOptions'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
                onClick={() => setActiveTab('myOptions')}
              >
                My Options
              </button>
              <button
                className={`py-2 px-4 font-medium ${
                  activeTab === 'liquidity'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
                onClick={() => setActiveTab('liquidity')}
              >
                Liquidity Pool
              </button>
            </div>
            
            {activeTab === 'options' ? (
              <>
                <CreateOption />
                <OptionList />
              </>
            ) : activeTab === 'myOptions' ? (
              <MyOptions />
            ) : (
              <LiquidityPanel />
            )}
          </>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-black">Welcome to Options AMM</h2>
            <p className="text-black mb-4">
              This decentralized application allows you to:
            </p>
            <ul className="list-disc pl-5 mb-6 space-y-2 text-black">
              <li>Create and trade options on the Flare Network</li>
              <li>Provide liquidity to earn fees from option trades</li>
              <li>Exercise in-the-money options when they expire</li>
            </ul>
            <p className="text-black mb-4">
              Please connect your wallet to get started. Make sure you&apos;re connected to the Flare Coston2 Testnet.
            </p>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <p className="text-black">
                <strong>Network Information:</strong> Flare Coston2 Testnet (Chain ID: 114)<br/>
                <strong>RPC URL:</strong> https://coston2-api.flare.network/ext/C/rpc
              </p>
            </div>
          </div>
        )}
      </div>
      
      <footer className="bg-gray-800 text-white py-6 mt-10">
        <div className="container mx-auto px-4 text-center">
          <p>Options AMM Platform - Decentralized Options Trading on Flare Network</p>
        </div>
      </footer>
    </main>
  )
}
