// Type declarations for global window object extensions used by web3 libraries

interface Window {
  ethereum?: {
    isMetaMask?: boolean;
    request?: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    on?: (eventName: string, handler: (params?: unknown) => void) => void;
    removeListener?: (eventName: string, handler: (params?: unknown) => void) => void;
    autoRefreshOnNetworkChange?: boolean;
  };
}

// Declare global BigInt serialization for JSON
interface BigInt {
  toJSON(): string;
}