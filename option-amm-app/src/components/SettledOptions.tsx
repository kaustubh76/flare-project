'use client'

import { useState, useEffect, useCallback } from 'react';
import { usePublicClient, useAccount } from 'wagmi';
import { OPTION_AMM_ABI, OPTION_AMM_ADDRESS } from '@/constants/contractInfo';
import { formatUnits } from 'viem';

// Define option types from contract
interface OptionData {
  0: bigint; // strikePrice
  1: bigint; // lotSize
  2: bigint; // premium
  3: bigint; // k
  4: bigint; // expiry
  5: boolean; // isCall
  6: string; // creator
  length: 7;
}

// Define the structure of a settled option
interface SettledOption {
  id: number;
  strikePrice: bigint;
  premium: bigint;
  lotSize: bigint;
  expiry: bigint;
  isCall: boolean;
  creator: string;
  userLots?: bigint; // Optional property for user-owned lots
  payout?: bigint; // Optional property for calculated payout
  payoutFormatted?: string; // Formatted payout string
  inTheMoney?: boolean; // Whether option expired in the money
  settledAmount?: bigint; // Settlement amount
  settledAt?: bigint; // Block number when settled
}

export default function SettledOptions() {
  const [settledOptions, setSettledOptions] = useState<SettledOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  
  const { address } = useAccount();
  const publicClient = usePublicClient();

  // Fetch user's settled options (those that have been exercised)
  const fetchSettledOptions = useCallback(async () => {
    if (!publicClient || !address) {
      setErrorMessage('Wallet not connected');
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setSettledOptions([]);
    setErrorMessage(null);
    
    try {
      console.log('Fetching settled options for user...');
      
      // Get current block number
      const currentBlock = await publicClient.getBlockNumber();
      console.log(`Current block number: ${currentBlock}`);
      
      // Use a much smaller block range (30 blocks) due to RPC limitations
      const BLOCK_RANGE = 30; // Fetch 30 blocks at a time
      const logs = [];
      
      // Start from recent blocks only (last ~500 blocks = ~40 minutes assuming 5s blocks)
      // This is much more efficient than scanning the entire chain
      const lookbackBlocks = 10000; // Look back ~10k blocks (about 14 hours)
      const startBlock = currentBlock > BigInt(lookbackBlocks) ? currentBlock - BigInt(lookbackBlocks) : BigInt(0);
      const totalBlocksToScan = Number(currentBlock - startBlock);
      
      console.log(`Scanning from block ${startBlock} to ${currentBlock} (${totalBlocksToScan} blocks)`);
      
      // Split the request into smaller chunks
      let blocksScanned = 0;
      for (let fromBlock = startBlock; fromBlock <= currentBlock; fromBlock += BigInt(BLOCK_RANGE)) {
        const toBlock = fromBlock + BigInt(BLOCK_RANGE - 1) > currentBlock 
          ? currentBlock 
          : fromBlock + BigInt(BLOCK_RANGE - 1);
        
        try {
          // Look for OptionSettled events
          const blockLogs = await publicClient.getLogs({
            address: OPTION_AMM_ADDRESS as `0x${string}`,
            event: {
              name: 'OptionSettled',
              type: 'event',
              inputs: [
                { indexed: true, name: 'optionId', type: 'uint256' },
                { indexed: true, name: 'holder', type: 'address' },
                { indexed: false, name: 'payout', type: 'uint256' },
                { indexed: false, name: 'inTheMoney', type: 'bool' }
              ]
            },
            args: {
              holder: address as `0x${string}`
            },
            fromBlock: fromBlock,
            toBlock: toBlock
          });
          
          blocksScanned += Number(toBlock - fromBlock) + 1;
          
          // Update progress
          const percentComplete = Math.min(Math.round((blocksScanned * 100) / totalBlocksToScan), 100);
          setProgress(percentComplete);
          
          if (blockLogs.length > 0) {
            console.log(`Found ${blockLogs.length} logs in block range ${fromBlock}-${toBlock}`);
            logs.push(...blockLogs);
          }
        } catch (error) {
          console.error(`Error fetching logs for block range ${fromBlock}-${toBlock}:`, error);
        }
      }
      
      console.log(`Found a total of ${logs.length} settlement events`);
      
      // Process each settlement event
      const processedOptions: SettledOption[] = [];
      
      for (const log of logs) {
        try {
          // Use type assertion for log.args since TypeScript might not recognize the property
          const logArgs = log.args as unknown as { 
            optionId?: bigint,
            payout?: bigint,
            inTheMoney?: boolean
          };
          
          const optionId = logArgs.optionId ? Number(logArgs.optionId) : 0;
          const payout = logArgs.payout || BigInt(0);
          
          if (optionId === 0) continue; // Skip if no valid ID
          
          // Fetch the option details
          const option = await publicClient.readContract({
            address: OPTION_AMM_ADDRESS as `0x${string}`,
            abi: OPTION_AMM_ABI,
            functionName: 'options',
            args: [BigInt(optionId)],
          }) as OptionData;
          
          if (option) {
            const settledOption: SettledOption = {
              id: optionId,
              strikePrice: option[0],
              premium: option[2],
              lotSize: option[1],
              expiry: option[4],
              isCall: option[5],
              creator: option[6],
              userLots: BigInt(0), // We don't have this info from the event
              payout: payout,
              payoutFormatted: formatUnits(payout, 18)
            };
            
            processedOptions.push(settledOption);
          }
        } catch (error) {
          console.error(`Error processing option:`, error);
        }
      }
      
      console.log(`Processed ${processedOptions.length} settled options`);
      
      // Sort options by settlement time (most recent first)
      processedOptions.sort((a, b) => Number(b.expiry - a.expiry));
      
      setSettledOptions(processedOptions);
      setErrorMessage(null);
    } catch (error) {
      console.error("Error fetching settled options:", error);
      setErrorMessage('Failed to fetch your settled options. Please try refreshing.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setProgress(0);
    }
  }, [publicClient, address]);
  
  // Format price from wei to a readable value
  const formatPrice = (price: bigint): string => {
    // Check magnitude to determine decimals
    if (price > BigInt(10000000000000)) {
      return formatUnits(price, 18);
    } else {
      return formatUnits(price, 6);
    }
  };

  // Format date from unix timestamp
  const formatDate = (timestamp: bigint): string => {
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };
  
  // Format block number to estimated date (rough approximation)
  const formatBlockDate = (blockNumber: bigint): string => {
    // Using Coston2 testnet average block time (~5 seconds)
    const now = Date.now();
    const AVERAGE_BLOCK_TIME = 5000; // 5 seconds in milliseconds
    
    // Get current block number from the chain or estimate it
    const currentBlockEstimate = BigInt(Math.floor(now / AVERAGE_BLOCK_TIME));
    
    // Calculate approximate timestamp
    const blockDiff = currentBlockEstimate - blockNumber;
    const timeDiffMs = Number(blockDiff) * AVERAGE_BLOCK_TIME;
    const estimatedTimestamp = now - timeDiffMs;
    
    return new Date(estimatedTimestamp).toLocaleString();
  };

  // Handle manual refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchSettledOptions();
  };

  // Refresh list on mount and when dependencies change
  useEffect(() => {
    if (publicClient && address) {
      fetchSettledOptions();
    }
  }, [publicClient, address, fetchSettledOptions]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Settled Options</h2>
        <button 
          onClick={handleRefresh}
          disabled={isLoading || isRefreshing}
          className={`px-4 py-2 rounded ${(isLoading || isRefreshing)
            ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
            : 'bg-blue-600 text-white hover:bg-blue-700'}`}
        >
          {isLoading || isRefreshing ? 'Refreshing...' : 'Refresh List'}
        </button>
      </div>
      
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {errorMessage}
        </div>
      )}
      
      {isLoading ? (
        <div className="flex flex-col items-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 mb-4"></div>
          {progress > 0 && (
            <div className="w-full max-w-md">
              <div className="bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-sm text-center mt-2 text-gray-600">Scanning blocks: {progress}% complete</p>
            </div>
          )}
        </div>
      ) : settledOptions.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-black">You don&apos;t have any settled options yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr>
                <th className="py-3 px-4 border-b text-left text-gray-900 font-semibold">ID</th>
                <th className="py-3 px-4 border-b text-left text-gray-900 font-semibold">Type</th>
                <th className="py-3 px-4 border-b text-right text-gray-900 font-semibold">Strike Price</th>
                <th className="py-3 px-4 border-b text-center text-gray-900 font-semibold">Status</th>
                <th className="py-3 px-4 border-b text-right text-gray-900 font-semibold">Settlement Amount</th>
                <th className="py-3 px-4 border-b text-left text-gray-900 font-semibold">Expiry Date</th>
                <th className="py-3 px-4 border-b text-left text-gray-900 font-semibold">Settled Date</th>
              </tr>
            </thead>
            <tbody>
              {settledOptions.map((option) => (
                <tr key={option.id} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border-b text-gray-900">{option.id}</td>
                  <td className="py-2 px-4 border-b">
                    <span className={option.isCall ? "text-green-700 font-medium" : "text-red-700 font-medium"}>
                      {option.isCall ? "CALL" : "PUT"}
                    </span>
                  </td>
                  <td className="py-2 px-4 border-b text-right text-gray-900">${formatPrice(option.strikePrice)}</td>
                  <td className="py-2 px-4 border-b text-center">
                    <span className={option.inTheMoney 
                      ? "bg-green-100 text-green-800 py-1 px-2 rounded-full text-xs font-medium"
                      : "bg-red-100 text-red-800 py-1 px-2 rounded-full text-xs font-medium"}>
                      {option.inTheMoney ? "In the money" : "Out of the money"}
                    </span>
                  </td>
                  <td className="py-2 px-4 border-b text-right text-gray-900">${formatPrice(option.payout || BigInt(0))}</td>
                  <td className="py-2 px-4 border-b text-gray-900">{formatDate(option.expiry)}</td>
                  <td className="py-2 px-4 border-b text-gray-900">{option.settledAt ? formatBlockDate(option.settledAt) : "Unknown"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}