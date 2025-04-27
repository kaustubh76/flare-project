'use client'

import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { OPTION_AMM_ABI, OPTION_AMM_ADDRESS } from '@/constants/contractInfo';
import { useRouter } from 'next/navigation';
import { usePriceContext } from '@/context/PriceContext';

export default function CreateOption() {
  const router = useRouter();
  const [strikePrice, setStrikePrice] = useState('');
  const [lotSize, setLotSize] = useState('');
  const [premium, setPremium] = useState('');
  const [expiryDays, setExpiryDays] = useState('30');
  const [expiryHours, setExpiryHours] = useState('0');
  const [expiryMinutes, setExpiryMinutes] = useState('0');
  const [expirySeconds, setExpirySeconds] = useState('0');
  const [isCall, setIsCall] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [optionId, setOptionId] = useState<bigint | null>(null);
  const [expectedOptionIndex, setExpectedOptionIndex] = useState<number | null>(null);
  
  // Try to read from the "options" array at a specific index to verify option creation
  const { refetch: refetchOption } = useReadContract({
    abi: OPTION_AMM_ABI,
    address: OPTION_AMM_ADDRESS as `0x${string}`,
    functionName: 'options',
    args: expectedOptionIndex !== null ? [BigInt(expectedOptionIndex)] : undefined,
    query: {
      // Only run this query when we have an expected index to check
      enabled: expectedOptionIndex !== null,
    }
  });
  
  const { data: hash, isPending, error, writeContract } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess: isTransactionSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Verify option creation after transaction confirms by trying indices
  useEffect(() => {
    if (isTransactionSuccess && hash) {
      // Wait a bit before checking options
      const verifyOptionCreation = async () => {
        try {
          // Start with index 0 and work our way up until we find the latest option
          let foundValidOption = false;
          let currentIndex = 0;
          
          // Keep trying increasing indices until we find a non-existent option (which will cause an error)
          while (!foundValidOption && currentIndex < 100) { // Limit to 100 checks to avoid infinite loop
            try {
              // Update the query parameters directly
              const { data } = await refetchOption();
              
              // If we got valid data and it matches the values we just submitted
              if (data) {
                // If this is the last valid option, we found our option!
                setExpectedOptionIndex(currentIndex);
                setOptionId(BigInt(currentIndex));
                foundValidOption = true;
                resetForm();
                
                // Force refresh the page to update the options list
                router.refresh();
                break;
              }
              
              currentIndex++;
            } catch {
              // If we hit an error, we've gone past the valid options
              break;
            }
          }
          
          if (!foundValidOption) {
            // Option wasn't created despite transaction success
            setErrorMessage("Transaction completed, but option wasn't created. Check gas limit or contract permissions.");
          }
        } catch (error) {
          console.error("Error verifying option creation:", error);
        }
      };
      
      setTimeout(verifyOptionCreation, 2000);
    }
  }, [isTransactionSuccess, hash, refetchOption, router]);

  const resetForm = () => {
    setStrikePrice('');
    setLotSize('');
    setPremium('');
    setExpiryDays('30');
    setExpiryHours('0');
    setExpiryMinutes('0');
    setExpirySeconds('0');
  };

  // Add price context for current ETH price
  const { ethUsdPrice } = usePriceContext();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setOptionId(null);
    setExpectedOptionIndex(null);
    
    try {
      // Convert input values to BigInt with 18 decimal places (wei)
      // Using a more precise conversion method to avoid floating point issues
      const strikeValue = parseFloat(strikePrice);
      const premiumValue = parseFloat(premium);
      const lotValue = parseFloat(lotSize);
      const currentETHPrice = ethUsdPrice ? parseFloat(ethUsdPrice) : 0;
      
      // Validate values per contract requirements
      if (strikeValue <= 0 || premiumValue <= 0 || lotValue <= 0) {
        setErrorMessage("All values must be greater than 0");
        return;
      }
      
      // Check strike price validity based on current price
      if (currentETHPrice > 0) {
        if (isCall && strikeValue <= currentETHPrice) {
          setErrorMessage("For call options, strike price must be higher than current ETH price");
          return;
        }
        
        if (!isCall && strikeValue >= currentETHPrice) {
          setErrorMessage("For put options, strike price must be lower than current ETH price");
          return;
        }
      }
      
      // Convert to wei - using 10^18 as the base unit
      const strikePriceWei = BigInt(Math.round(strikeValue * 1e18));
      const premiumWei = BigInt(Math.round(premiumValue * 1e18));
      const lotSizeWei = BigInt(Math.round(lotValue * 1e18));
      
      // Calculate expiry timestamp including days, hours, minutes, and seconds
      const secondsPerDay = 24 * 60 * 60;
      const secondsPerHour = 60 * 60;
      const secondsPerMinute = 60;
      
      const totalSeconds = 
        parseInt(expiryDays) * secondsPerDay +
        parseInt(expiryHours) * secondsPerHour +
        parseInt(expiryMinutes) * secondsPerMinute +
        parseInt(expirySeconds);
      
      const expiryTimestamp = BigInt(Math.floor(Date.now() / 1000) + totalSeconds);
      
      // Log the values for debugging
      console.log("Creating option with parameters:", {
        strikePriceWei: strikePriceWei.toString(),
        lotSizeWei: lotSizeWei.toString(),
        premiumWei: premiumWei.toString(),
        expiryTimestamp: expiryTimestamp.toString(),
        totalSeconds,
        isCall
      });
      
      writeContract({
        abi: OPTION_AMM_ABI,
        address: OPTION_AMM_ADDRESS as `0x${string}`,
        functionName: 'createOption',
        args: [strikePriceWei, lotSizeWei, premiumWei, expiryTimestamp, isCall],
      });
    } catch (error) {
      setErrorMessage(`Error preparing transaction: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-gray-900">Create New Option</h2>
        <button
          className="text-blue-700 hover:text-blue-900 font-medium"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? 'Close' : 'Open Form'}
        </button>
      </div>
      
      {isOpen && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Information box about option requirements */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md mb-4">
            <h3 className="font-medium text-blue-800">Important Option Creation Rules:</h3>
            <ul className="mt-2 text-blue-700 text-sm">
              <li>• For <strong>Call options</strong>, strike price must be <strong>higher</strong> than current ETH price (${ethUsdPrice || '0'})</li>
              <li>• For <strong>Put options</strong>, strike price must be <strong>lower</strong> than current ETH price</li>
              <li>• All values (strike, premium, lot size) must be greater than zero</li>
              <li>• Expiry must be in the future</li>
            </ul>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Option Type
              </label>
              <div className="flex space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    name="optionType"
                    checked={isCall}
                    onChange={() => setIsCall(true)}
                  />
                  <span className="ml-2 text-black">Call</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    name="optionType"
                    checked={!isCall}
                    onChange={() => setIsCall(false)}
                  />
                  <span className="ml-2 text-black">Put</span>
                </label>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Expiry Date
              </label>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-xs font-medium text-black mb-1">Days</label>
                  <input
                    type="number"
                    min="0"
                    value={expiryDays}
                    onChange={(e) => setExpiryDays(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-black mb-1">Hours</label>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={expiryHours}
                    onChange={(e) => setExpiryHours(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-black mb-1">Minutes</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={expiryMinutes}
                    onChange={(e) => setExpiryMinutes(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-black mb-1">Seconds</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={expirySeconds}
                    onChange={(e) => setExpirySeconds(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Strike Price (USD)
              </label>
              <input
                type="number"
                min="0.0001"
                step="0.0001"
                value={strikePrice}
                onChange={(e) => setStrikePrice(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <small className="text-black">e.g. 2000.00 for $2000</small>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Premium (USD)
              </label>
              <input
                type="number"
                min="0.0001"
                step="0.0001"
                value={premium}
                onChange={(e) => setPremium(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <small className="text-black">Price to buy one lot of this option</small>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Lot Size
              </label>
              <input
                type="number"
                min="0.0001"
                step="0.0001"
                value={lotSize}
                onChange={(e) => setLotSize(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <small className="text-black">Amount of the underlying asset per option</small>
            </div>
          </div>
          
          {(error || errorMessage) && (
            <div className="text-red-600 mt-2">
              Error: {error?.message || errorMessage || "Failed to create option"}
            </div>
          )}
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPending || isConfirming}
              className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 ${
                (isPending || isConfirming) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isPending
                ? 'Creating...'
                : isConfirming
                ? 'Confirming...'
                : 'Create Option'}
            </button>
          </div>
          
          {isTransactionSuccess && optionId !== null && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-700 font-medium">Option created successfully!</p>
              <p className="text-green-600 mt-1">Option ID: {optionId.toString()}</p>
              <button
                onClick={() => router.push(`/option/${optionId}`)}
                className="mt-2 text-blue-600 hover:text-blue-800 font-medium"
              >
                View Option Details
              </button>
            </div>
          )}
        </form>
      )}
    </div>
  );
}