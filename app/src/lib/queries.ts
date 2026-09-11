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
  useCreateTrader,
  useUpdateTrader,
  useSetLive,
  useIsFollowing,
  useFollow,
  useUnfollow,
  useUploadImage,
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

// ── Auth (keep on backend) ────────────────────────────────────────────────────

export {
  useNonce,
  useVerify,
  useMe,
} from "./queries-auth";

// ── Faucet (keep on backend) ──────────────────────────────────────────────────

export { useFaucetMint } from "./queries-auth";

// ── Comments (keep on backend) ────────────────────────────────────────────────

export {
  useComments,
  usePostComment,
  useLikeComment,
} from "./queries-comments";

// ── LiveKit (keep on backend) ─────────────────────────────────────────────────

export {
  useLiveKitToken,
  useLiveKitStreamSetup,
  useLiveKitRoom,
  useLiveKitParticipants,
} from "./queries-livekit";

// ── Demo (keep on backend) ────────────────────────────────────────────────────

export {
  useDemoSeed,
  useDemoFastForward,
} from "./queries-demo";
