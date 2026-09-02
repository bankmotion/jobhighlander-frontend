export type CryptoChain = 'bep20' | 'erc20';
export type TopUpStatus = 'pending' | 'credited' | 'rejected';
export type CreditKind = 'topup' | 'usage' | 'adjustment';

export interface Balance {
  balanceMicroUsd: number;
  balanceUsd: number;
  /** False once the balance runs out — the AI generators refuse at that point. */
  canSpend: boolean;
}

export interface DepositInfo {
  address: string;
  chains: { id: CryptoChain; label: string; explorer: string }[];
  minUsd: number;
  maxUsd: number;
}

export interface TopUpRequest {
  id: number;
  chain: CryptoChain;
  txHash: string;
  claimedMicroUsd: number;
  creditedMicroUsd: number | null;
  status: TopUpStatus;
  note: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  /** Present only on the super admin queue. */
  user?: { id: number; email: string; balanceMicroUsd: number };
}

export interface CreditEntry {
  id: number;
  kind: CreditKind;
  amountMicroUsd: number;
  balanceAfterMicroUsd: number;
  note: string | null;
  createdAt: string;
  /** Present only on the account-wide history. */
  user?: { id: number; email: string };
  createdBy?: { id: number; email: string } | null;
}

export interface CreditableUser {
  id: number;
  email: string;
  role: string;
  balanceMicroUsd: number;
}

export const MICRO = 1_000_000;

/**
 * Balances are shown to the cent, but AI charges are routinely far smaller than
 * that — a single Ask AI follow-up costs about a tenth of a cent. Four decimals
 * below a cent so a spend never renders as "$0.00", which reads as free.
 */
export function usdt(microUsd: number): string {
  const v = microUsd / MICRO;
  const abs = Math.abs(v);
  if (abs > 0 && abs < 0.01) return `${v < 0 ? '-' : ''}$${abs.toFixed(4)}`;
  return `${v < 0 ? '-' : ''}$${abs.toFixed(2)}`;
}

/** Signed, for the statement: "+$25.00" reads differently from "-$0.0312". */
export const signedUsdt = (microUsd: number): string =>
  `${microUsd > 0 ? '+' : ''}${usdt(microUsd)}`;

export const STATUS_META: Record<TopUpStatus, { label: string; cls: string }> = {
  pending: { label: 'Awaiting review', cls: 'bg-amber-500/15 text-amber-300' },
  credited: { label: 'Credited', cls: 'bg-green-500/15 text-green-300' },
  rejected: { label: 'Rejected', cls: 'bg-red-500/15 text-red-300' },
};

export const KIND_LABEL: Record<CreditKind, string> = {
  topup: 'USDT deposit',
  usage: 'AI usage',
  adjustment: 'Manual adjustment',
};

/** A hash is 0x + 64 hex on both chains; checked here so the form can say so. */
export const TX_HASH = /^0x[0-9a-fA-F]{64}$/;

export const shortHash = (hash: string): string =>
  hash.length > 18 ? `${hash.slice(0, 10)}…${hash.slice(-6)}` : hash;
