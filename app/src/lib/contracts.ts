import PotVaultAbiJson from "../abis/PotVault.json";
import PotFactoryAbiJson from "../abis/PotFactory.json";
import TraderRegistryAbiJson from "../abis/TraderRegistry.json";
import EpochControllerAbiJson from "../abis/EpochController.json";
import PlatformGovernanceAbiJson from "../abis/PlatformGovernance.json";
import { ADDRESSES, TUSDC_DECIMALS } from "./addresses";
import { parseUnits } from "viem";

// Re-export ABIs as typed const for useReadContract / useWriteContract
export const PotVaultAbi = PotVaultAbiJson as unknown as typeof PotVaultAbiJson;
export const PotFactoryAbi = PotFactoryAbiJson as unknown as typeof PotFactoryAbiJson;
export const TraderRegistryAbi = TraderRegistryAbiJson as unknown as typeof TraderRegistryAbiJson;
export const EpochControllerAbi = EpochControllerAbiJson as unknown as typeof EpochControllerAbiJson;
export const PlatformGovernanceAbi = PlatformGovernanceAbiJson as unknown as typeof PlatformGovernanceAbiJson;

// Minimal ERC20 ABI for tUSDC approve / balanceOf / allowance
export const ERC20Abi = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
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
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
] as const;

// Convenience helpers
export const parseUsdc = (amount: number) => parseUnits(amount.toFixed(TUSDC_DECIMALS), TUSDC_DECIMALS);
export const formatUsdc = (raw: bigint) => Number(raw) / 10 ** TUSDC_DECIMALS;
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as `0x${string}`;

export { ADDRESSES };
