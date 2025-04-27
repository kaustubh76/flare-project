'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useState, useEffect } from 'react';

export default function Header() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="bg-gray-800 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 relative overflow-hidden">
            {/* Using a placeholder image instead of the missing logo.png */}
            <div className="bg-blue-500 h-full w-full flex items-center justify-center text-white font-bold rounded-full">
              OA
            </div>
          </div>
          <h1 className="text-2xl font-bold">Options AMM</h1>
        </div>
        
        {/* Only render ConnectButton after client-side hydration */}
        {mounted && (
          <ConnectButton.Custom>
            {({
              account,
              chain,
              openAccountModal,
              openChainModal,
              openConnectModal,
              mounted: rainbowKitMounted,
            }) => {
              const ready = rainbowKitMounted;
              const connected = ready && account && chain;

              return (
                <div
                  {...(!ready && {
                    'aria-hidden': true,
                    style: {
                      opacity: 0,
                      pointerEvents: 'none',
                      userSelect: 'none',
                    },
                  })}
                >
                  {(() => {
                    if (!connected) {
                      return (
                        <button 
                          onClick={openConnectModal} 
                          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow transition-colors"
                        >
                          Connect Wallet
                        </button>
                      );
                    }

                    if (chain.unsupported) {
                      return (
                        <button 
                          onClick={openChainModal} 
                          className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg shadow transition-colors"
                        >
                          Wrong network
                        </button>
                      );
                    }

                    return (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={openChainModal}
                          className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg text-sm font-medium hover:from-orange-600 hover:to-red-700 shadow-md transition-all"
                        >
                          <div className="flex items-center">
                            {chain.hasIcon && (
                              <div className="text-xl mr-2  rounded-full p-0.5 flex items-center justify-center">
                                🔗
                              </div>
                            )}
                            <div className="flex flex-col items-start">
                              <span className="font-semibold text-white">{chain.name}</span>
                            </div>
                          </div>
                        </button>

                        <button
                          onClick={openAccountModal}
                          className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-900 rounded-full text-sm font-medium hover:bg-gray-200"
                        >
                          {account.displayName}
                        </button>
                      </div>
                    );
                  })()}
                </div>
              );
            }}
          </ConnectButton.Custom>
        )}
        
        {/* Show placeholder when not mounted (server-side or initial render) */}
        {!mounted && (
          <div className="px-6 py-2 rounded-lg bg-blue-600 text-white opacity-50">
            Connect Wallet
          </div>
        )}
      </div>
    </header>
  );
}