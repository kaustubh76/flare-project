import { ENV } from '@/config/env';

// Updated types to match the current WalletConnect SDK
interface ProposerMetadata {
  name: string;
  url: string;
  description: string;
  icons: string[];
}

interface Proposer {
  metadata: ProposerMetadata;
}

interface RequiredNamespace {
  chains?: string[];
  methods: string[];
  events: string[];
}

interface Proposal {
  proposer: Proposer;
  requiredNamespaces: Record<string, RequiredNamespace>;
}

/**
 * Format session proposal for display
 */
export function formatSessionProposal(
  proposal: Proposal
): { name: string; url: string; description: string; icons: string[] } {
  return {
    name: proposal.proposer.metadata.name || 'Unknown dApp',
    url: proposal.proposer.metadata.url || '',
    description: proposal.proposer.metadata.description || '',
    icons: proposal.proposer.metadata.icons || [],
  };
}

/**
 * Parse account string to get the address
 * Format: "eip155:1:0x123..."
 */
export function parseAccountId(accountId: string): string | null {
  try {
    const [, , address] = accountId.split(':');
    return address;
  } catch (e) {
    console.error('Failed to parse account ID:', e);
    return null;
  }
}

/**
 * Get chains that the dApp supports
 */
export function getSupportedChains(proposal: Proposal): number[] {
  const { requiredNamespaces } = proposal;
  const chains: number[] = [];
  
  // Extract chain IDs from required namespaces
  Object.values(requiredNamespaces).forEach(namespace => {
    namespace.chains?.forEach(chainId => {
      const [, chainIdStr] = chainId.split(':');
      const chainIdNum = parseInt(chainIdStr);
      if (!isNaN(chainIdNum) && !chains.includes(chainIdNum)) {
        chains.push(chainIdNum);
      }
    });
  });
  
  return chains;
}

/**
 * Check if the Flare network is supported by the dApp
 */
export function isFlareNetworkSupported(proposal: Proposal): boolean {
  const supportedChains = getSupportedChains(proposal);
  return supportedChains.includes(ENV.FLARE_CHAIN_ID);
}

/**
 * Formats wallet address for display
 * Shortens address to "0x1234...5678" format
 */
export function formatAddress(address: string | undefined | null): string {
  if (!address) return 'Not connected';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}