const WALLET_KEY = "conviction_vault_wallet";

export function getWallet(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(WALLET_KEY);
}

export function connectWallet(): string {
  const fakeAddress = "CVau" + Math.random().toString(36).substring(2, 10) + "..." + Math.random().toString(36).substring(2, 6);
  localStorage.setItem(WALLET_KEY, fakeAddress);
  return fakeAddress;
}

export function disconnectWallet(): void {
  localStorage.removeItem(WALLET_KEY);
}
