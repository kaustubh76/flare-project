'use client'

import { useEffect, useState } from 'react';
import { useChainId, useSwitchChain } from 'wagmi';
import { ENV } from '@/config/env';

export default function NetworkInfo() {
  const [mounted, setMounted] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const chainId = useChainId(); // Using useChainId instead of useNetwork in wagmi v2
  const { switchChain, isPending: isSwitchingNetwork } = useSwitchChain(); // Using useSwitchChain instead of useSwitchNetwork
  
  const flareCoston2ChainId = ENV.FLARE_CHAIN_ID;

  // Set mounted to true after component mounts on the client
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Don't check chain until we're mounted on the client
    if (!mounted) return;
    
    // Check if we're on the correct chain
    if (chainId) {
      setShowBanner(chainId !== flareCoston2ChainId);
    } else {
      setShowBanner(false);
    }
  }, [chainId, flareCoston2ChainId, mounted]);

  const handleSwitchNetwork = async () => {
    if (switchChain) {
      switchChain({ chainId: flareCoston2ChainId });
    } else {
      // Provide manual instructions if switchChain is not available
      console.warn('Wallet does not support programmatic network switching');
      alert(`Please manually switch to Flare Coston2 Testnet (Chain ID: ${flareCoston2ChainId}) in your wallet.`);
    }
  };

  // Don't render anything during server-side rendering or initial hydration
  if (!mounted) return null;
  
  // Don't show the banner if we don't need to
  if (!showBanner) return null;

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
      <div className="flex">
        <div>
          <p className="text-yellow-700 font-bold">Wrong Network Detected</p>
          <p className="text-yellow-700">
            Please connect to the Flare Coston2 Testnet (Chain ID: {flareCoston2ChainId}) to use this application.
          </p>
          <button 
            onClick={handleSwitchNetwork}
            disabled={isSwitchingNetwork}
            className={`mt-2 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition ${isSwitchingNetwork ? 'opacity-75 cursor-not-allowed' : ''}`}
          >
            {isSwitchingNetwork ? 'Switching...' : 'Switch to Flare Network'}
          </button>
        </div>
      </div>
    </div>
  );
}