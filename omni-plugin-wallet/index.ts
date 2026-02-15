import {
  createPublicClient,
  formatEther,
  formatGwei,
  http,
} from "viem";
import { arbitrum, base, mainnet, polygon } from "viem/chains";

import type { Chain, PublicClient } from "viem";

const CHAIN_CONFIG: Record<string, { chain: Chain; rpcUrl: string; nativeSymbol: string }> = {
  ethereum: {
    chain: mainnet,
    rpcUrl: "https://eth.llamarpc.com",
    nativeSymbol: "ETH",
  },
  polygon: {
    chain: polygon,
    rpcUrl: "https://polygon.llamarpc.com",
    nativeSymbol: "MATIC",
  },
  arbitrum: {
    chain: arbitrum,
    rpcUrl: "https://arbitrum.llamarpc.com",
    nativeSymbol: "ETH",
  },
  base: {
    chain: base,
    rpcUrl: "https://base.llamarpc.com",
    nativeSymbol: "ETH",
  },
};

function getClient(chainName: string): { client: PublicClient; config: (typeof CHAIN_CONFIG)[string] } {
  const config = CHAIN_CONFIG[chainName];

  if (!config) {
    throw new Error(`Unsupported chain: ${chainName}. Supported: ${Object.keys(CHAIN_CONFIG).join(", ")}`);
  }

  const client = createPublicClient({
    chain: config.chain,
    transport: http(config.rpcUrl),
  });

  return { client, config };
}

type BalanceArgs = {
  address: string;
  chain?: string;
};

/** Check native token balance for an address */
async function walletBalance(args: BalanceArgs) {
  const { address, chain = "ethereum" } = args;
  const { client, config } = getClient(chain);

  const balance = await client.getBalance({
    address: address as `0x${string}`,
  });

  return {
    address,
    chain,
    balance: formatEther(balance),
    symbol: config.nativeSymbol,
    raw: balance.toString(),
  };
}

type ChainArgs = {
  chain?: string;
};

/** Get latest block information */
async function walletHistory(args: ChainArgs) {
  const { chain = "ethereum" } = args;
  const { client } = getClient(chain);

  const block = await client.getBlock({ blockTag: "latest" });

  return {
    chain,
    block_number: block.number.toString(),
    timestamp: new Date(Number(block.timestamp) * 1000).toISOString(),
    transaction_count: block.transactions.length,
    gas_used: block.gasUsed.toString(),
    gas_limit: block.gasLimit.toString(),
    base_fee_per_gas: block.baseFeePerGas ? formatGwei(block.baseFeePerGas) : null,
    hash: block.hash,
  };
}

/** Get current gas prices */
async function walletGas(args: ChainArgs) {
  const { chain = "ethereum" } = args;
  const { client } = getClient(chain);

  const gasPrice = await client.getGasPrice();
  const block = await client.getBlock({ blockTag: "latest" });

  const result: Record<string, unknown> = {
    chain,
    gas_price_gwei: formatGwei(gasPrice),
    base_fee_gwei: block.baseFeePerGas ? formatGwei(block.baseFeePerGas) : null,
  };

  // Estimate priority fee if supported
  try {
    const maxPriorityFee = await client.estimateMaxPriorityFeePerGas();
    result.max_priority_fee_gwei = formatGwei(maxPriorityFee);
  } catch {
    // Chain may not support EIP-1559
  }

  return result;
}

async function main() {
  const toolName = process.argv[2];
  const args = JSON.parse(process.argv[3] || "{}");

  let result: unknown;

  switch (toolName) {
    case "wallet_balance":
      result = await walletBalance(args);
      break;
    case "wallet_history":
      result = await walletHistory(args);
      break;
    case "wallet_gas":
      result = await walletGas(args);
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
