const BASE_URL = "https://gamma-api.polymarket.com";

type SearchArgs = {
  query: string;
  limit?: number;
};

type DetailArgs = {
  condition_id: string;
};

type Market = {
  question: string;
  conditionId: string;
  slug: string;
  volume: string;
  volume24hr: string;
  liquidity: string;
  outcomePrices: string;
  outcomes: string;
  startDate: string;
  endDate: string;
  description: string;
  active: boolean;
  closed: boolean;
};

/** Format a market response into a clean shape */
function formatMarket(market: Market) {
  let outcomePrices: number[] = [];
  let outcomes: string[] = [];

  try {
    outcomePrices = JSON.parse(market.outcomePrices || "[]");
  } catch {
    // Ignore parse errors
  }

  try {
    outcomes = JSON.parse(market.outcomes || "[]");
  } catch {
    // Ignore parse errors
  }

  return {
    question: market.question,
    condition_id: market.conditionId,
    slug: market.slug,
    volume: market.volume,
    volume_24hr: market.volume24hr,
    liquidity: market.liquidity,
    outcomes: outcomes.map((name: string, i: number) => ({
      name,
      price: outcomePrices[i] ?? null,
    })),
    start_date: market.startDate,
    end_date: market.endDate,
    active: market.active,
    closed: market.closed,
  };
}

/** Search markets by keyword, sorted by 24h volume */
async function marketSearch(args: SearchArgs) {
  const { query, limit = 10 } = args;

  const params = new URLSearchParams({
    closed: "false",
    limit: String(limit + 20), // Fetch extra to account for filtering
    order: "volume24hr",
    ascending: "false",
  });

  const res = await fetch(`${BASE_URL}/markets?${params}`);

  if (!res.ok) {
    throw new Error(`Polymarket API error: ${res.status} ${res.statusText}`);
  }

  const markets: Market[] = await res.json();

  const lowerQuery = query.toLowerCase();

  const filtered = markets
    .filter(
      (m) =>
        m.question?.toLowerCase().includes(lowerQuery) ||
        m.description?.toLowerCase().includes(lowerQuery),
    )
    .slice(0, limit);

  return filtered.map(formatMarket);
}

/** Get market detail by condition ID */
async function marketDetail(args: DetailArgs) {
  const { condition_id } = args;

  const params = new URLSearchParams({
    conditionId: condition_id,
  });

  const res = await fetch(`${BASE_URL}/markets?${params}`);

  if (!res.ok) {
    throw new Error(`Polymarket API error: ${res.status} ${res.statusText}`);
  }

  const markets: Market[] = await res.json();

  if (!markets.length) {
    return { error: `No market found with condition ID: ${condition_id}` };
  }

  const market = markets[0];

  return {
    ...formatMarket(market),
    description: market.description,
  };
}

async function main() {
  const toolName = process.argv[2];
  const args = JSON.parse(process.argv[3] || "{}");

  let result: unknown;

  switch (toolName) {
    case "market_search":
      result = await marketSearch(args);
      break;
    case "market_detail":
      result = await marketDetail(args);
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
