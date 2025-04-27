import { ENV } from './env';

// Contract addresses
export const ADDRESSES = {
  USDC: process.env.NEXT_PUBLIC_USDC_ADDRESS || '0x828A4f80312F62D4BbAbCD9438Dc3B6fD1d69A34',
  OPTION_AMM: ENV.OPTION_AMM_ADDRESS || '0x170D1256a2CB057dAcDEEBBCcB6DDd0b19f660Fe',
};

// Contract ABI imports
import { OPTION_AMM_ABI, USDC_ABI } from '@/constants/contractInfo';

// Define ABIs
export const ABIS = {
  OPTION_AMM: OPTION_AMM_ABI,
  USDC: USDC_ABI,
};

// Create a combined object for easier usage in components
export const CONTRACTS = {
  OPTION_AMM: {
    address: ADDRESSES.OPTION_AMM as `0x${string}`,
    abi: ABIS.OPTION_AMM,
  },
  USDC: {
    address: ADDRESSES.USDC as `0x${string}`,
    abi: ABIS.USDC,
  },
};

export default CONTRACTS;