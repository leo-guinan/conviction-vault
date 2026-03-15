import { Connection, clusterApiUrl } from '@solana/web3.js';

export const SOLANA_NETWORK = 'mainnet-beta';
export const connection = new Connection(
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl('mainnet-beta'),
  'confirmed'
);

export const PLATFORM_WALLET = 'BCiPx7CbD3ZrcETcGTEGjTWtCwAbotNPPmdqmB9zAseq';
