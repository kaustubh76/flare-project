'use client'

import React from 'react'
import QRCode from 'qrcode.react'

interface WalletConnectModalProps {
  isOpen: boolean
  onClose: () => void
  uri: string | null
}

const WalletConnectModal: React.FC<WalletConnectModalProps> = ({ isOpen, onClose, uri }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-medium text-black">Connect Wallet</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            &times;
          </button>
        </div>
        <div className="text-center">
          {uri ? (
            <>
              <p className="mb-4 text-gray-700">Scan this QR code with your wallet app to connect</p>
              <div className="bg-white p-4 inline-block rounded">
                <QRCode value={uri} size={256} renderAs="svg" />
              </div>
              <p className="mt-4 text-sm text-gray-600">
                Don&apos;t have a wallet app? Get one from your app store.
              </p>
            </>
          ) : (
            <p className="text-gray-700">Preparing connection...</p>
          )}
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default WalletConnectModal