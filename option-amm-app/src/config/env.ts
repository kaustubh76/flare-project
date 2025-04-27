/**
 * Environment variables configuration 
 * This centralizes environment variable access and provides validation/defaults
 */

// Function to validate that required environment variables are set
const validateEnv = (name: string, value: string | undefined, fallback?: string): string => {
  if (!value && fallback === undefined) {
    console.error(`Missing required environment variable: ${name}`);
    // In development, provide more visible warning
    if (process.env.NODE_ENV === 'development') {
      throw new Error(`Missing required environment variable: ${name}`);
    }
  }
  return value || fallback || '';
};

// Environment variables
export const ENV = {
  // Contract addresses
  OPTION_AMM_ADDRESS: validateEnv(
    'NEXT_PUBLIC_OPTION_AMM_ADDRESS', 
    process.env.NEXT_PUBLIC_OPTION_AMM_ADDRESS,
    // Use the latest contract address
    "0x170D1256a2CB057dAcDEEBBCcB6DDd0b19f660Fe"
  ),
  
  // WalletConnect
  WALLET_CONNECT_PROJECT_ID: validateEnv(
    'NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID',
    process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
    '782f79947e03ce155a9226b7e15a8ccf' // Using the existing ID as fallback for backward compatibility
  ),
  
  // Flare Network configuration
  FLARE_RPC_URL: validateEnv(
    'NEXT_PUBLIC_FLARE_RPC_URL',
    process.env.NEXT_PUBLIC_FLARE_RPC_URL,
    'https://coston2-api.flare.network/ext/C/rpc'
  ),
  FLARE_CHAIN_ID: 114, // Flare Coston2 Testnet chain ID
  
  // App metadata 
  APP_NAME: 'Flare Options AMM',
  APP_DESCRIPTION: 'Options AMM dApp on Flare Network',
  APP_URL: validateEnv(
    'NEXT_PUBLIC_APP_URL',
    process.env.NEXT_PUBLIC_APP_URL,
    'https://flare-project.app'
  ),
  APP_ICON: validateEnv(
    'NEXT_PUBLIC_APP_ICON',
    process.env.NEXT_PUBLIC_APP_ICON,
    'https://walletconnect.com/walletconnect-logo.png'
  ),
};

export default ENV;