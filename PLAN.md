# Plan: Remove old implementations, add ABIs, direct contract interaction, full typing

## Scope
Remove `@somnia-chain/markets-sdk` dependency, remove backend REST calls for on-chain data,
add complete contract ABIs, interact directly with contracts from frontend, eliminate all `any`.

---

## Phase 1: Add Complete Contract ABIs

**File: `app/src/lib/contracts.ts`** (NEW)

Create a single source of truth for all contract ABIs and addresses, extracted from
`subgraph/abis/*.json` and `contracts/deployed.json`:

- `POT_VAULT_ABI` — full ABI (enter, exit, nav, pricePerShare, balanceOf, totalSupply,
  exposure, halted, positionTotals, trade, mintSet, burnSet, redeem, approvePool, revokePool,
  all view functions, all events, all errors)
- `POT_FACTORY_ABI` — createPot, potCount, getPotsByEpoch, getPotsByTrader, isVault, pots
- `TRADER_REGISTRY_ABI` — registerTrader, getTrader, getAllTraders, traderCount, updateMetadata,
  setVerified, deactivate, incrementPotCount, updateAUM
- `EPOCH_CONTROLLER_ABI` — createEpoch, goLive, goSettling, goSettled, addPot, getEpoch,
  epochCount, latestEpoch, isFundingOpen, isTradingOpen
- `PLATFORM_GOVERNANCE_ABI` — getConfig, setFeeSplit, setTreasury, setMaxExposure, setPaused
- `METADATA_STORE_ABI` — setMetadata, getMetadata, getCurrentCID
- `TUSDC_ABI` — erc20 (transfer, balanceOf, approve, allowance) + faucet
- `OUTCOME_TOKEN_ABI` — ERC-6909 (balanceOf, approve, transfer, transferFrom, setOperator)

**File: `app/src/lib/addresses.ts`** (NEW)

Export all deployed addresses as constants:
```ts
export const ADDRESSES = {
  POT_VAULT: "0x1d04C7a884544c28f224617A9De7F8f6107a68d0",
  POT_FACTORY: "0x5ba4b53279e79e98de28ec86369db7391ec6d1f6",
  TRADER_REGISTRY: "0xe4d47c6ba74e8fa20ff6f28031e41f9b7b8738ea",
  EPOCH_CONTROLLER: "0x66264df0a101f49720e55e08f28229d567316892",
  PLATFORM_GOVERNANCE: "0xcedba65773205bb1773a82f8a3c242aef124b916",
  METADATA_STORE: "0xdc83cca42803b63055e1635c4557309862c02677",
  TUSDC: "0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E",
  SETTLEMENT: "0xbF4a49e0Dfd092e5FBE8E5761064C49533e6Ed23",
  OUTCOME_NFT: "0xf902f58d5C79165DeBEc60Af88e0d2e925979099",
} as const;
```

**File: `app/src/lib/types.ts`** (NEW)

Create TypeScript types for all contract structs and return values:
- `Epoch` struct type
- `TraderProfile` struct type
- `PotInfo` struct type
- `PlatformConfig` struct type
- `MetadataEntry` struct type
- `EpochStatus` enum
- `TraderType` enum
- `Side` enum

---

## Phase 2: Create Direct Contract Hooks

**File: `app/src/lib/hooks/use-epochs.ts`** (NEW)

Replace REST `/epochs` calls with direct `EpochController` reads:
- `useEpochCount()` — reads `epochCount()`
- `useLatestEpoch()` — reads `latestEpoch()`
- `useEpoch(epochId)` — reads `getEpoch(epochId)`
- `useAllEpochs()` — reads all epochs via `epochCount` + loop
- `useIsFundingOpen(epochId)` — reads `isFundingOpen(epochId)`
- `useIsTradingOpen(epochId)` — reads `isTradingOpen(epochId)`

**File: `app/src/lib/hooks/use-pots.ts`** (NEW)

Replace REST `/pots` calls with direct `PotFactory` + `PotVault` reads:
- `usePotCount()` — reads `potCount()`
- `usePotsByEpoch(epochId)` — reads `getPotsByEpoch(epochId)`
- `usePotsByTrader(trader)` — reads `getPotsByTrader(trader)`
- `usePotVault(vaultAddress)` — reads `nav()`, `pricePerShare()`, `totalSupply()`,
  `exposure()`, `positionTotals()`, `halted()`, `exposureLimit()`, `epochId()`, `operator()`
- `useIsVault(address)` — reads `isVault(address)`

**File: `app/src/lib/hooks/use-traders.ts`** (NEW)

Replace REST `/traders` calls with direct `TraderRegistry` reads:
- `useTraderCount()` — reads `traderCount()`
- `useAllTraders()` — reads `getAllTraders()` + `getTrader(addr)` for each
- `useOnChainTrader(address)` — reads `getTrader(address)`

**File: `app/src/lib/hooks/use-platform.ts`** (NEW)

Direct `PlatformGovernance` reads:
- `usePlatformConfig()` — reads `getConfig()`

**File: `app/src/lib/hooks/use-vault-actions.ts`** (REPLACE `vault-hooks.ts`)

Keep vault write hooks (deposit/withdraw) but use the new ABI:
- `useVaultDeposit(vaultAddress?)` — approve + enter
- `useVaultWithdraw(vaultAddress?)` — exit
- `useVaultTrade(vaultAddress?)` — trade (new)
- `useVaultMintSet(vaultAddress?)` — mintSet (new)
- `useVaultBurnSet(vaultAddress?)` — burnSet (new)
- `useVaultApprovePool(vaultAddress?)` — approvePool (new)
- `useVaultRedeem(vaultAddress?)` — redeem (new)

---

## Phase 3: Remove SDK, Update Queries

**Delete files:**
- `app/src/lib/exchange.ts` — no longer needed
- `app/src/lib/market-adapter.ts` — no longer needed
- `app/src/components/ExchangeProvider.tsx` — no longer needed

**Update `app/src/lib/queries.ts`:**
- Remove all `@somnia-chain/markets-sdk/react` imports
- Remove `useMarkets`, `useMarket`, `useOrderBook`, `useCandles`, `usePrice`, `usePriceTicks`
  (SDK hooks) — replace with direct contract reads or subgraph queries
- Replace `useEpochs`, `useActiveEpoch`, `useEpoch` with hooks from `use-epochs.ts`
- Replace `usePots`, `usePot` with hooks from `use-pots.ts`
- Replace `useTraders`, `useTrader` with hooks from `use-traders.ts`
- Keep REST calls that must stay on backend: `/auth/*`, `/faucet/*`, `/livekit/*`,
  `/upload/*`, `/comments/*`, `/studio/trade` (write), `/settlement/*` (write)
- Remove `useRestMarkets`, `useRestMarket`, `useRestOrderBook`, `useRestCandles`, `useRestPrice`

**Update `app/src/main.tsx`:**
- Remove `ExchangeProvider` from provider tree

**Update `app/package.json`:**
- Remove `@somnia-chain/markets-sdk` from dependencies

---

## Phase 4: Eliminate All `any` Types

### 4A. Define proper types in `app/src/lib/types.ts`

```ts
// Contract return types
interface Epoch { number: bigint; startsAt: bigint; tradingEndsAt: bigint; endsAt: bigint; status: number; potCount: bigint; tvl: bigint; }
interface TraderProfileOnChain { metadataCID: string; payoutAddress: string; traderType: number; verified: boolean; active: boolean; registeredAt: bigint; potCount: bigint; totalAUM: bigint; }
interface PotInfo { vault: string; epochId: bigint; trader: string; exposureLimit: bigint; createdAt: bigint; }
interface PlatformConfig { lpShare: number; traderShare: number; protocolShare: number; protocolTreasury: string; maxExposureDefault: bigint; minDeposit: bigint; maxPotsPerTrader: bigint; paused: boolean; }

// App-level types
interface EpochView { id: string; number: number; startsAt: number; endsAt: number; status: EpochStatus; potCount: number; tvl: number; }
type EpochStatus = "upcoming" | "live" | "settling" | "settled";
interface TraderView { id: string; name: string; handle: string; avatarUrl: string; bio: string; traderType: "human" | "ai"; verified: boolean; active: boolean; reputation: number; pnl30: number; winRate: number; aum: number; isLive: boolean; followers: number; createdAt: string; }
interface PotView { id: string; vault: string; epochId: string; traderId: string; name: string; strategy: PotStrategy; nav: number; lpPrice: number; totalShares: number; totalDeposits: number; exposure: number; exposureLimit: number; approvedPools: string[]; status: string; createdAt: string; }
interface PotStrategy { title: string; note: string; risk: "conservative" | "balanced" | "aggressive"; focus: string[]; }
interface Position { id: string; potId: string; marketId: string; side: "up" | "down"; contracts: number; avgPrice: number; realizedPnl: number; win: boolean; }
interface Trade { id: string; potId: string; marketId: string; side: string; size: number; price: number; orderId: string; timestamp: number; }
interface Comment { id: string; marketId: string; userId?: string; authorName: string; text: string; likes: number; createdAt: string; }
interface Payout { perShare: number; traderCutUsd: number; protocolCutUsd: number; lpDistributedUsd: number; }
interface LiveKitParticipant { id: string; identity: string; name: string; }
```

### 4B. Fix every file with `any`

**`app/src/lib/queries.ts`** — ~20 `any` usages:
- Replace `api<any>("/auth/me")` → `api<AuthUser>("/auth/me")`
- Replace `api<any[]>("/pots")` → `api<PotView[]>("/pots")`
- Replace `api<any>("/pots/${id}")` → `api<PotView>("/pots/${id}")`
- Replace `(p: any) =>` → `(p: PotView) =>`
- Replace `(b: any) =>` → `(b: TraderView) =>`
- Replace `api<{ room: any }>` → `api<{ room: { sid: string; name: string } }>`
- Replace `api<any[]>("/livekit/...")` → `api<LiveKitParticipant[]>("/livekit/...")`
- Replace `(err: any) =>` → `(err: Error) =>` or `(err: unknown) =>`
- Replace `epoch: any` → `epoch: EpochView`
- Replace `user: any` → proper AuthUser type

**`app/src/routes/studio.tsx`** — ~15 `any` usages:
- Replace `trader: any` → `trader: TraderView`
- Replace `pots: any[]` → `pots: PotView[]`
- Replace `epochs: any[]` → `epochs: EpochView[]`
- Replace `(p: any) =>` → `(p: PotView) =>`
- Replace `(err: any) =>` → `(err: Error) =>`
- Replace `(t: any) =>` → proper trade type

**`app/src/routes/epochs.tsx`** — ~4 `any` usages:
- Replace `(e: any) =>` → `(e: EpochView) =>`
- Replace `(p: any) =>` → `(p: PotView) =>`
- Replace `(err: any) =>` → `(err: Error) =>`

**`app/src/routes/portfolio.tsx`** — ~5 `any` usages:
- Replace `(e: any) =>` → `(e: EpochView) =>`
- Replace `(p: any) =>` → `(p: PotView) =>`
- Replace `(pot: any) =>` → `(pot: PotView) =>`

**`app/src/routes/pots.index.tsx`** — ~3 `any` usages:
- Replace `allPots as any[]` → proper `PotView[]`
- Replace `(e: any) =>` → `(e: EpochView) =>`
- Replace `(p: any) =>` → `(p: PotView) =>`

**`app/src/routes/pots.$id.tsx`** — ~3 `any` usages:
- Replace `(pot as any)?.signerAddress` → add `signerAddress` to PotView or use optional chaining with proper type
- Replace `<EpochPhaseBadge phase={... as any} />` → proper enum type

**`app/src/routes/traders.index.tsx`** — ~5 `any` usages:
- Replace `allTraders as any[]` → proper `TraderView[]`
- Replace `(t: any) =>` → `(t: TraderView) =>`
- Replace `(a: any, b: any) =>` → `(a: TraderView, b: TraderView) =>`

**`app/src/routes/traders.$id.tsx`** — ~2 `any` usages:
- Replace `(e: any) =>` → `(e: EpochView) =>`

**`app/src/routes/leaderboard.tsx`** — ~3 `any` usages:
- Replace `trader: any` → `trader: TraderView`
- Replace `traderXp(b as any)` → proper type

**`app/src/routes/become-a-trader.settings.tsx`** — ~3 `any` usages:
- Replace `(err: any) =>` → `(err: Error) =>`

**`app/src/routes/live.$id.tsx`** — ~1 `any` usage:
- Replace `(p: any) =>` → `(p: Position) =>`

**`app/src/components/traders/StakePanel.tsx`** — ~4 `any` usages:
- Replace `pot?: any` → `pot?: PotView`
- Replace `(err: any) =>` → `(err: Error) =>`

**`app/src/components/traders/CashoutDialog.tsx`** — ~1 `any` usage:
- Replace `(err: any) =>` → `(err: Error) =>`

**`app/src/components/chat/StreamChat.tsx`** — ~2 `any` usages:
- Replace `msg as any` → proper WS message type

**`app/src/hooks/use-trade-signals.ts`** — ~1 `any` usage:
- Replace `(msg: any) =>` → proper typed handler

**`app/src/hooks/use-chat.ts`** — ~2 `any` usages:
- Replace `(msg: any) =>` → proper typed handler

**`app/src/hooks/use-stream-viewers.ts`** — ~1 `any` usage:
- Replace `api<any[]>` → `api<LiveKitParticipant[]>`

**`app/src/hooks/use-live-streamers.ts`** — (no `any`, but uses api-client)

**`app/src/lib/ws-client.ts`** — ~2 `any` usages:
- Replace `type MessageHandler = (msg: any) => void` → typed WS message union
- Replace `send(msg: any)` → typed send

**`app/src/lib/use-ws-hub.ts`** — ~2 `any` usages:
- Replace `(msg: any) =>` → typed WS message

**`app/src/components/discovery/OfflineTraders.tsx`** — (uses api, no `any`)

**`app/src/components/discovery/StreamCard.tsx`** — ~1 `as any`:
- Fix route `to` type

**`app/src/components/sidebar/SidebarTraderCard.tsx`** — ~1 `as any`:
- Fix route `to` type

**`app/src/components/traders/TraderCard.tsx`** — ~1 `as any`:
- Fix `epochPhase as any`

---

## Phase 5: Update Shared Schemas

**File: `shared/src/index.ts`**

Align shared Zod schemas with the new app-level types. Remove `MarketSnapshot` (no longer
needed — markets are read directly from contracts). Ensure all entity schemas match the
types defined in Phase 4A.

---

## Phase 6: Clean Up

**Files to delete:**
- `app/src/lib/exchange.ts`
- `app/src/lib/market-adapter.ts`
- `app/src/components/ExchangeProvider.tsx`

**Files to simplify:**
- `app/src/lib/chains.ts` — remove old VAULT_ABI/TUSDC_ABI (moved to contracts.ts),
  keep chain definition and address constants
- `app/src/lib/vault-hooks.ts` — replaced by `hooks/use-vault-actions.ts`
- `app/src/lib/subgraph.ts` — keep (subgraph queries are still used)
- `app/src/lib/subgraph-queries.ts` — keep

**Dependencies to remove from `app/package.json`:**
- `@somnia-chain/markets-sdk`

---

## Execution Order

1. Create `contracts.ts` (ABIs), `addresses.ts`, `types.ts`
2. Create hook files: `use-epochs.ts`, `use-pots.ts`, `use-traders.ts`, `use-platform.ts`
3. Replace `vault-hooks.ts` with `use-vault-actions.ts`
4. Update `queries.ts` — remove SDK imports, use new hooks
5. Delete `exchange.ts`, `market-adapter.ts`, `ExchangeProvider.tsx`
6. Update `main.tsx` — remove ExchangeProvider
7. Update `chains.ts` — clean up
8. Fix all `any` types across every file
9. Run `tsc --noEmit` to verify zero errors
10. Remove `@somnia-chain/markets-sdk` from package.json
