export const somniaTestnet = {
  id: 50312,
  name: "Somnia Testnet",
  nativeCurrency: {
    name: "SOMNIA",
    symbol: "SOMNIA",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ["https://api.infra.testnet.somnia.network"] },
  },
  blockExplorers: {
    default: { name: "Somnia Explorer", url: "https://shannon-explorer.somnia.network" },
  },
  testnet: true,
} as const;

export const somniaTestnetId = 50312 as const;

/** tUSDC — the event-contract collateral on Somnia testnet (6 decimals). */
export const TUSDC_TOKEN = {
  chainId: somniaTestnetId,
  address: "0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E",
  decimals: 6,
  symbol: "tUSDC",
  name: "Test USDC",
} as const;

export const TUSDC_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "faucet",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
] as const;
