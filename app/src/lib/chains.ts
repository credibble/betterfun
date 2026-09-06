export const somniaTestnet = {
  id: 50312,
  name: "Somnia Testnet",
  nativeCurrency: {
    name: "SOMNIA",
    symbol: "SOMNIA",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ["https://dream-rpc.somnia.network"] },
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

/**
 * EventVault — on-chain pooled counterparty for binary event contracts.
 * Set VITE_VAULT_ADDRESS in your .env after deploying with Forge.
 */
export const VAULT_ADDRESS = (import.meta.env.VITE_VAULT_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const VAULT_ABI = [
  {
    type: "function",
    name: "enter",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [{ name: "shares", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "exit",
    inputs: [{ name: "shares", type: "uint256" }],
    outputs: [{ name: "collateralOut", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "nav",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "pricePerShare",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalSupply",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "exposure",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "halted",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "positionTotals",
    inputs: [],
    outputs: [
      { name: "yes", type: "uint256" },
      { name: "no", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "Deposit",
    inputs: [
      { name: "lp", type: "address", indexed: true },
      { name: "collateralIn", type: "uint256" },
      { name: "sharesOut", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "Withdraw",
    inputs: [
      { name: "lp", type: "address", indexed: true },
      { name: "sharesBurned", type: "uint256" },
      { name: "collateralOut", type: "uint256" },
    ],
  },
] as const;

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
