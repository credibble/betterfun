// ── Re-exports ────────────────────────────────────────────────────────────────
// Central export point — all hooks used by components import from here.

export {
  useEpochs,
  useActiveEpoch,
  useEpoch,
  useEpochCount,
  useLatestEpochId,
  useIsFundingOpen,
  useIsTradingOpen,
  useFastForwardEpoch,
} from "./hooks/use-epochs";

export {
  usePots,
  usePot,
  usePotCount,
  useIsVault,
  useCreatePot,
  usePotShares,
} from "./hooks/use-pots";

export {
  useTraders,
  useTrader,
  useMyTrader,
  useMyTraderProfile,
  useTraderProfile,
  useTraderCount,
  useRegisterTraderOnChain,
  useUpdateTraderMetadata,
  useUpdatePayoutAddress,
  useUploadImage,
  buildTraderMetadata,
} from "./hooks/use-traders";

export {
  usePlatformConfig,
  useGovernanceConfig,
} from "./hooks/use-platform";

export {
  useVaultDeposit,
  useVaultWithdraw,
  useVaultTrade,
  useVaultMintSet,
  useVaultBurnSet,
  useVaultRedeem,
  useVaultApprovePool,
  useVaultCancelOrder,
  useVaultClaimTraderFees,
  useApproveTusdc,
  useVaultBalanceOf,
  useVaultTotalSupply,
  useTusdcBalance,
  useVaultPricePerShare,
  useVaultTraderFees,
  useVaultHalted,
  useVaultTotalDeposits,
  useVaultExposure,
  useVaultExposureLimit,
  useVaultAllowance,
  formatNav,
  formatSharePrice,
} from "./hooks/use-vault-actions";

export {
  usePositions,
  useTrades,
  useTrade,
  usePayout,
  useClaimPayout,
} from "./queries-positions";

export {
  useMarkets,
  useMarket,
} from "./queries-markets";

// ── LiveKit (on backend) ──────────────────────────────────────────────────────

export {
  useLiveKitToken,
  useLiveKitStreamSetup,
  useLiveKitRoom,
  useLiveKitParticipants,
} from "./queries-livekit";