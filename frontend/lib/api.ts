const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3094";

export async function fetchVaults() {
  const res = await fetch(`${API_URL}/vaults`);
  if (!res.ok) throw new Error("Failed to fetch vaults");
  return res.json();
}

export async function fetchVault(id: string) {
  const res = await fetch(`${API_URL}/vaults/${id}`);
  if (!res.ok) throw new Error("Failed to fetch vault");
  return res.json();
}

export async function fetchPositions(stakerAddress: string) {
  const res = await fetch(`${API_URL}/position/${stakerAddress}`);
  if (!res.ok) throw new Error("Failed to fetch positions");
  return res.json();
}

export async function stake(payload: {
  vault_id: string;
  staker_address: string;
  token_mint: string;
  token_amount: number;
}) {
  const res = await fetch(`${API_URL}/stake`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Stake failed");
  return res.json();
}

export async function exitStake(payload: {
  stake_id: string;
  staker_address: string;
}) {
  const res = await fetch(`${API_URL}/exit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Exit failed");
  return res.json();
}
