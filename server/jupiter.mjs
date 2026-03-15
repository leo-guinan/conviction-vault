const TOKEN_UNIVERSE = {
  TOWEL: {
    mint: 'Ak9ptp86tfJMrKwBwoe49pNkHxPjZk8GRQxZKB78pump',
    name: 'TOWEL',
    chain: 'SOLANA',
    decimals: 9,
  },
  METATOWEL: {
    mint: 'CtsDk7Mo1wwhxhQp6zqB2oHEFXPEHhgjTBE8VvcUpump',
    name: 'METATOWEL',
    chain: 'SOLANA',
    decimals: 9,
  },
  MARVIN: {
    mint: '91gCUo2EY9sXNCTioG2AbCCTyraNn9zXvX5HF9qnpump',
    name: 'MARVIN',
    chain: 'SOLANA',
    decimals: 9,
  },
  SOL: {
    mint: 'So11111111111111111111111111111111111111112',
    name: 'SOL',
    chain: 'SOLANA',
    decimals: 9,
  },
  ANTIHUNTER: {
    mint: '0xcee38b10810abab93487ebc93a9099853476bb07',
    name: 'ANTIHUNTER',
    chain: 'BASE',
    decimals: 18,
  },
  KELLYCLAUDE: {
    mint: 'BASE_KELLYCLAUDE_ADDRESS_TBD',
    name: 'KELLYCLAUDE',
    chain: 'BASE',
    decimals: 18,
  },
  FELIX: {
    mint: 'BASE_FELIX_ADDRESS_TBD',
    name: 'FELIX',
    chain: 'BASE',
    decimals: 18,
  },
  DRIP: {
    mint: 'EiW9cxqFuLfJbLGXL7vZ7rcqtFLmDf13ho5oE6YKBAGS',
    name: 'DRIP',
    chain: 'SOLANA',
    decimals: 9,
    role: 'PLATFORM_COIN', // bags.fm native — 10% of vault fees buy this
  },
};

const JUPITER_PRICE_API = 'https://price.jup.ag/v4/price';
const JUPITER_QUOTE_API = 'https://quote-api.jup.ag/v6/quote';
const JUPITER_SWAP_API = 'https://quote-api.jup.ag/v6/swap';

export function getSupportedTokens() {
  return TOKEN_UNIVERSE;
}

export function getTokenByMint(mint) {
  return Object.values(TOKEN_UNIVERSE).find((t) => t.mint === mint) || null;
}

export function getSolanaTokens() {
  return Object.values(TOKEN_UNIVERSE).filter((t) => t.chain === 'SOLANA');
}

export function getBaseTokens() {
  return Object.values(TOKEN_UNIVERSE).filter((t) => t.chain === 'BASE');
}

async function getPriceFromDexScreener(tokenMint) {
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenMint}`);
    if (!res.ok) return null;
    const data = await res.json();
    const pair = data.pairs?.[0];
    if (!pair?.priceUsd) return null;
    return {
      mint: tokenMint,
      symbol: pair.baseToken?.symbol || tokenMint.slice(0, 6),
      priceUsd: parseFloat(pair.priceUsd),
      timestamp: Date.now(),
    };
  } catch {
    return null;
  }
}

export async function getPrice(tokenMint) {
  const token = getTokenByMint(tokenMint);
  if (token && token.chain === 'BASE') {
    console.warn(`[Jupiter] ${token.name} is a Base token — price not available via Jupiter`);
    return null;
  }

  // Try Jupiter first, fall back to DexScreener for pump.fun / unlisted tokens
  try {
    const res = await fetch(`${JUPITER_PRICE_API}?ids=${tokenMint}`);
    if (res.ok) {
      const data = await res.json();
      const priceData = data.data?.[tokenMint];
      if (priceData) {
        return {
          mint: tokenMint,
          symbol: priceData.mintSymbol,
          priceUsd: priceData.price,
          timestamp: Date.now(),
        };
      }
    }
  } catch {
    // fall through to DexScreener
  }

  console.warn(`[Jupiter] Falling back to DexScreener for ${tokenMint}`);
  return getPriceFromDexScreener(tokenMint);
}

export async function getQuote(inputMint, outputMint, amountLamports) {
  try {
    const params = new URLSearchParams({
      inputMint,
      outputMint,
      amount: String(amountLamports),
      slippageBps: '100',
    });
    const res = await fetch(`${JUPITER_QUOTE_API}?${params}`);
    if (!res.ok) throw new Error(`Jupiter Quote API returned ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(`[Jupiter] Quote failed:`, err.message);
    return null;
  }
}

export async function executeSwap(quoteResponse, userPublicKey, connection, wallet) {
  const isDryRun = process.env.DRY_RUN !== 'false';
  if (isDryRun) {
    console.log('[Jupiter] DRY_RUN mode — swap simulated, not executed');
    return {
      simulated: true,
      quote: quoteResponse,
      userPublicKey,
      timestamp: Date.now(),
    };
  }

  try {
    const res = await fetch(JUPITER_SWAP_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteResponse,
        userPublicKey,
        wrapAndUnwrapSol: true,
      }),
    });
    if (!res.ok) throw new Error(`Jupiter Swap API returned ${res.status}`);
    const { swapTransaction } = await res.json();
    return {
      simulated: false,
      swapTransaction,
      timestamp: Date.now(),
    };
  } catch (err) {
    console.error('[Jupiter] Swap execution failed:', err.message);
    return null;
  }
}

export async function getPrices(mints) {
  const solanaMints = mints.filter((m) => {
    const token = getTokenByMint(m);
    return !token || token.chain === 'SOLANA';
  });

  if (solanaMints.length === 0) return {};

  try {
    const res = await fetch(`${JUPITER_PRICE_API}?ids=${solanaMints.join(',')}`);
    if (!res.ok) throw new Error(`Jupiter Price API returned ${res.status}`);
    const data = await res.json();
    const prices = {};
    for (const mint of solanaMints) {
      const p = data.data?.[mint];
      if (p) prices[mint] = p.price;
    }
    return prices;
  } catch (err) {
    console.error('[Jupiter] Batch price fetch failed:', err.message);
    return {};
  }
}
