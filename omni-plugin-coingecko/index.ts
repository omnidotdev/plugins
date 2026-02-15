const BASE_URL = "https://api.coingecko.com/api/v3";

type PriceArgs = {
  coin_id: string;
  vs_currencies?: string;
};

/** Fetch current price, 24h change, and market cap for a coin */
async function cryptoPrice(args: PriceArgs) {
  const { coin_id, vs_currencies = "usd" } = args;

  const params = new URLSearchParams({
    ids: coin_id,
    vs_currencies,
    include_24hr_change: "true",
    include_market_cap: "true",
  });

  const res = await fetch(`${BASE_URL}/simple/price?${params}`);

  if (!res.ok) {
    throw new Error(`CoinGecko API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  if (!data[coin_id]) {
    return { error: `Coin '${coin_id}' not found` };
  }

  return data[coin_id];
}

/** Fetch top 10 trending coins */
async function cryptoTrending() {
  const res = await fetch(`${BASE_URL}/search/trending`);

  if (!res.ok) {
    throw new Error(`CoinGecko API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const coins = data.coins?.slice(0, 10) ?? [];

  return coins.map(
    (entry: {
      item: {
        name: string;
        symbol: string;
        id: string;
        market_cap_rank: number;
        score: number;
        data?: {
          price?: number;
          price_change_percentage_24h?: Record<string, number>;
          market_cap?: string;
        };
      };
    }) => ({
      name: entry.item.name,
      symbol: entry.item.symbol,
      id: entry.item.id,
      market_cap_rank: entry.item.market_cap_rank,
      score: entry.item.score,
      price_usd: entry.item.data?.price ?? null,
      price_change_24h: entry.item.data?.price_change_percentage_24h?.usd ?? null,
      market_cap: entry.item.data?.market_cap ?? null,
    }),
  );
}

async function main() {
  const toolName = process.argv[2];
  const args = JSON.parse(process.argv[3] || "{}");

  let result: unknown;

  switch (toolName) {
    case "crypto_price":
      result = await cryptoPrice(args);
      break;
    case "crypto_trending":
      result = await cryptoTrending();
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
