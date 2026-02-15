const PRICES_URL = "https://coins.llama.fi";
const API_URL = "https://api.llama.fi";

type TokenPriceArgs = {
  chain: string;
  address: string;
};

type ProtocolTvlArgs = {
  slug: string;
};

type ChainTvlArgs = {
  limit?: number;
};

/** Get current price for a token by chain and contract address */
async function tokenPrice(args: TokenPriceArgs) {
  const { chain, address } = args;
  const coinKey = `${chain}:${address}`;

  const res = await fetch(`${PRICES_URL}/prices/current/${coinKey}`);

  if (!res.ok) {
    throw new Error(`DeFi Llama API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const coin = data.coins?.[coinKey];

  if (!coin) {
    return { error: `Token not found: ${coinKey}` };
  }

  return {
    chain,
    address,
    symbol: coin.symbol,
    price: coin.price,
    decimals: coin.decimals,
    confidence: coin.confidence,
    timestamp: coin.timestamp
      ? new Date(coin.timestamp * 1000).toISOString()
      : null,
  };
}

/** Get TVL and details for a DeFi protocol */
async function protocolTvl(args: ProtocolTvlArgs) {
  const { slug } = args;

  const res = await fetch(`${API_URL}/protocol/${slug}`);

  if (!res.ok) {
    if (res.status === 404) {
      return { error: `Protocol not found: ${slug}` };
    }
    throw new Error(`DeFi Llama API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  return {
    name: data.name,
    slug: data.slug,
    symbol: data.symbol,
    category: data.category,
    description: data.description,
    tvl: data.tvl,
    chain_tvls: data.chainTvls
      ? Object.fromEntries(
          Object.entries(data.chainTvls)
            .map(([chain, info]: [string, unknown]) => {
              const tvlInfo = info as { tvl?: { totalLiquidityUSD: number }[] };
              const latest = tvlInfo.tvl?.at(-1);
              return [chain, latest?.totalLiquidityUSD ?? null];
            })
            .filter(([, val]) => val !== null)
            .sort(([, a], [, b]) => (b as number) - (a as number)),
        )
      : null,
    chains: data.chains,
    url: data.url,
    twitter: data.twitter,
    audits: data.audits,
    audit_links: data.audit_links,
  };
}

type ChainInfo = {
  name: string;
  tvl: number;
  tokenSymbol?: string;
  gecko_id?: string;
  chainId?: number;
};

/** Get chain TVL rankings */
async function chainTvl(args: ChainTvlArgs) {
  const { limit = 20 } = args;

  const res = await fetch(`${API_URL}/v2/chains`);

  if (!res.ok) {
    throw new Error(`DeFi Llama API error: ${res.status} ${res.statusText}`);
  }

  const chains: ChainInfo[] = await res.json();

  const sorted = chains
    .sort((a, b) => (b.tvl ?? 0) - (a.tvl ?? 0))
    .slice(0, limit);

  return sorted.map((chain, index) => ({
    rank: index + 1,
    name: chain.name,
    tvl: chain.tvl,
    token_symbol: chain.tokenSymbol ?? null,
    gecko_id: chain.gecko_id ?? null,
    chain_id: chain.chainId ?? null,
  }));
}

async function main() {
  const toolName = process.argv[2];
  const args = JSON.parse(process.argv[3] || "{}");

  let result: unknown;

  switch (toolName) {
    case "token_price":
      result = await tokenPrice(args);
      break;
    case "protocol_tvl":
      result = await protocolTvl(args);
      break;
    case "chain_tvl":
      result = await chainTvl(args);
      break;
    default:
      result = { error: `Unknown tool: ${toolName}` };
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
