# BetterFun — Creator Economy Prediction Pots on DreamDEX Event Contracts

**Hackathon:** Somnia × DreamDEX Event Contracts Hackathon (submission Aug 25 – Sep 8)

**Product:** A creator-economy prediction-market platform. Human traders **and** AI agents create accounts as "traders," livestream, and run **pots** their followers fund. Followers deposit tUSDC into a pot before an epoch locks; the trader trades the pot's capital on DreamDEX Event Contracts (Up/Down binary markets) but **never has withdraw access** to the funds. At epoch end, if the pot is profitable the trader (and protocol) get a cut of the gains only; if it loses, the trader gets nothing and followers split what's left pro-rata by shares.

This document is the end-to-end technical plan. Everything targets **testnet (Somnia Shannon, chain id `50312`)**.

---

## 0. Architecture Summary

| Layer | Stack | Role |
|---|---|---|
| `app/` | Vite + React 19 + TanStack Router + TanStack Query + wagmi/viem + Reown (WalletConnect) | Consumer + trader frontend |
| `backend/` | Express + TypeScript, TypeORM + Postgres, BullMQ + Redis, JWT (SIWE sign-message auth), LiveKit (livestream), OpenAI (AI agent), `ws` (socket server) | REST + WebSocket API, epoch/pot state machine, delegated trading engine, settlement, AI agent |
| `shared/` | Zod schemas shared across app + backend | Single source of truth for DTOs/types |
| DreamDEX | `@somnia-chain/markets-sdk@^0.29.0` + viem | Event Contract reads/writes (testnet tUSDC collateral) |
| **No smart contracts** | — | Delegated non-custodial trading is achieved with per-pot HD-derived signer keys held server-side + strict software-level authority separation |

The core mechanism is **non-custodial-with-custody**: followers' funds live in on-chain tUSDC controlled by a per-pot **pot signer** (an HD-derived key held only by the backend). The backend trades that pot's balance on the exchange on the trader's behalf, but only pays out to **followers** at settlement. The trader (human or AI) can *signal* trades through the UI/agent, but the authority to move money off the pot is hard-wired to the payout flow — never to the trader.

---

## 1. Key Architectural Decisions (and why)

### 1.1 Why per-pot HD signer keys instead of a smart contract
The Event Contracts SDK trades from a single EOA signer. To keep "trader can trade but not withdraw," the safest hackathon-scaled design is:
- Backend derives one EOA per pot from a master seed (`HDKey m/44'/60'/0'/0/{potIndex}`, already in `keys.ts`).
- **Trading** uses `SomniaMarkets` with the pot's private key (place/cancel orders, mint/burn sets, redeem).
- **Withdrawal** is a separate, restricted path: only `SettlementService.claimPayout` moves tUSDC off the pot signer, and it transfers **pro-rata to followers only** per the payout ledger.
- The trader's own wallet is **never** a transfer target from a pot.

This is honest for a testnet demo and removes smart-contract risk. **Note for the deck:** a production version would use an on-chain vault (e.g. ERC-6909 account / Safe) with a restricted `canCall({placeOrder,cancel,burnSet})` + `cannotCall(withdraw)` role, or the SDK's operator/session-key model. Flag this as the roadmap.

### 1.2 The epoch/pot state machine
Epochs separate *funding* (deposits/withdrawals open) from *trading* (locked) from *settlement*.

```
Epoch:  upcoming ──(t_start)──> live ──(t_end)──> settling ──> settled
Pot:    funding  ──────────────> live ─────────> settling ──> settled
```

State transitions (driven by BullMQ):
1. `upcoming` — followers can deposit/withdraw at 1:1 (`lpPrice = 1`). Traders create pots.
2. `live` — pots lock. Trader/AI can place orders; deposits/withdrawals blocked.
3. `settling` — trading window closed with **buffer**; wait for all markets to resolve (`status Resolved/Voided`), then compute NAV + payout waterfall.
4. `settled` — followers claim their share.

**Critical: settlement buffer.** DreamDEX markets lock → resolve asynchronously via the oracle. The epoch's trading close must be **before** the epoch's hard end, leaving a buffer (e.g. 30–60 min) so every position's market has reached `Resolved`/`Voided` before we compute final NAV. Otherwise redeem/NAV is computed too early.

### 1.3 Collateral: tUSDC (6 decimals) — testnet only
- Collateral on testnet is **tUSDC** `0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E`, **6 decimals**.
- **Fix needed in code:** `settlement.service.ts` hardcodes `TUSDC_ADDRESS = "0x74fa...` (wrong) and `1e6` — must use the SDK's `SOMNIA_TESTNET_ADDRESSES` collateral and `decimals()`-derived scale (6 here, 18 on mainnet).
- Faucet: `exchange.trader.faucet()` (cap 10,000 tUSDC/call) for pot signers. Gas (STT) is separate; pot signers need STT for writes.
- Always derive scale from `decimals()`, never a literal (testnet 6 vs mainnet 18 = 10^12 difference).

### 1.4 Real-time data: SDK live watches over the public WS feed
- The SDK's `watchOrderBook`/`watchTrades`/`watchUser` (chain-log sockets) are **typed and reconnect+backfill** — prefer these for the app.
- The public DEX WS feed (`wss://stg.api.dreamdex.io/v0/ws/public`) is **JSON, unauthenticated, no resume cursor** — every reconnect is a cold start. Use only if we need cross-market public depth (not per-pot user fills).
- The app already has `WsClient` for the **backend** WS (pot updates, chat, notifications) — keep that for product-level events. Do **not** conflate the two.
- TanStack Query `refetchInterval`/`invalidateQueries` on top of the SDK react hooks (`@somnia-chain/markets-sdk/react`) handles the "invalidates fully typed realtime sockets" requirement.

---

## 2. DreamDEX Integration Layer (backend)

All DreamDEX access goes through `backend/src/modules/dreamdex/`.

### 2.1 Single read exchange
`getReadExchange()` (already exists) — no signer; used for market discovery, books, candles, prices. Keep.

### 2.2 Per-pot trading exchange + cache + lock
`createTradingExchange(privateKey)` (already exists). Extend the trading service with:
- **Per-pot exchange cache** (already in `trading.service.ts`) keyed by `signerIndex`.
- **Per-pot write lock** (already in `trading.service.ts`) — serializes nonces. Keep and harden.
- Gate **every** write on `client.getMarketOnchain(marketId).status === 1` (Trading) before placing.
- Use **IOC** for taker fills (cross the touch), **POST_ONLY** for maker/resting quotes; always set `expireTimestampNs` in the future (mandatory, ≤ market expiry).
- Size/price to the venue **tick/lot grid** in integer steps (use the bot-kit pattern: `getBinaryBookParams(pool)` → `priceToPrecision`/`amountToPrecision` or manual `quantize`) — dodges the 18-decimal float bug and `InvalidPrice`/`InvalidInputError` (amount 0 below one lot).
- Check `receipt.status === "reverted"` after every write (SDK ≥0.23 throws, but still assert).

### 2.3 Market discovery (BTC/ETH only)
`loadLiveBinaryMarkets()` (already in `market.service.ts`) is close, but:
- **Key all state by `marketId`/symbol, never pool address** (pools are recycled).
- Read on-chain status via `getMarketOnchain` (already done) — gate on `status === 1`.
- **Skip windows with < ~5 min left** (`expiry − now < 300s`) to avoid mid-flight locks.
- Use `exchange.client.listBinaryMarkets({ venueId, status: "Finalized" })` to **discover settled markets** (they disappear from `loadMarkets()`).
- Scope to the correct `venueId` (config, not constant — it moves; testnet default `0x679795a0195a1b76cdebb7c51d74e058aee92919b8c3389af86ef24535e8a28c`).

### 2.4 Order execution (trading.service.ts — rewrite)
Current `executeTrade` uses `createOrder(symbol, "market", ...)` with `timeInForce: "IOC"`. Replace with a robust path:
1. Resolve symbol → market → `getMarketOnchain` → assert `status === 1`.
2. Convert human size (USD) → lot-grid integer quantity (`amountToPrecision`).
3. `trader.placeOrder({ pool, side: "BUY_YES"/"BUY_NO"/"SELL_YES"/"SELL_NO", price, quantity, orderType: ORDER_TYPE.MARKET (IOC), expireTimestampNs })`.
4. Read `result.fills`/`receipt.status`; persist `Order` + `Trade` + update `Position` and pot `cash`/`deployed`.
5. Handle `SELL_*`: only sell what the pot holds — mint a complete set first if needed (`mintSet`), never short.

### 2.5 Settlement (settlement.service.ts — fix + extend)
Current `settlePot` is directionally right but has real bugs:
1. **Fix collateral address/decimals** (see 1.3).
2. **Redeem**: for each open position, `getMarketOnchain`; if `isResolved` redeem the winning `outcomeIdx` (voided → redeem **both** sides at 0.5); losing redemption pays 0 (doesn't revert) — handle gracefully. Use `redeemMany` to batch.
3. **NAV** = on-chain tUSDC balance of the pot signer **after** all redemptions (fall back to tracked NAV only on read failure).
4. **Payout waterfall** (already correct):
   - `perShare = finalNav / totalShares`
   - Profit (`perShare > 1`): `totalGain = (perShare − 1) × totalShares`; trader cut = `gain × 0.15`, protocol = `gain × 0.05`, LP (followers) = `gain × 0.80` (i.e. followers get their principal back + 80% of gains).
   - Loss: trader/protocol get **0**; followers split remaining `finalNav` pro-rata.
5. **Rounding**: distribute to the smallest tUSDC unit and leave dust with the pot (never mint/destroy fractional cents incorrectly). Document the dust policy in the deck.
6. **Claim**: `claimPayout` transfers tUSDC from the pot signer to the follower's wallet (already implemented; fix address/decimals).

---

## 3. Backend Modules (Express + TypeORM)

Already present; the plan below marks **keep**, **fix**, or **build**:

| Module | Files | Status | Work |
|---|---|---|---|
| Auth (SIWE → JWT) | `auth/*` | **Keep** | Already `siwe` + `jsonwebtoken` + refresh. Ensure role claim includes `traderId`. |
| Traders | `traders/*` | **Keep** | Profiles already model `human`/`ai` + `aiConfig`. |
| Epochs | `epochs/*` | **Keep** | Add automatic **epoch rollover** job (create next epoch, wire transitions via BullMQ timers). |
| Pots | `pots/*` | **Keep + harden** | Add deposit **on-chain verification** (confirm tUSDC actually reached the pot signer before crediting shares). |
| Trading | `trading/*` | **Rewrite core** | See §2.4. Add cancel/open-orders/positions endpoints. |
| Settlement | `settlement/*` | **Fix + extend** | See §2.5. |
| DreamDEX | `dreamdex/*` | **Extend** | Fix decimals; add venue id config; settled-market discovery; quote helpers. |
| AI Agent | `ai/*` | **Rewrite** | See §4. |
| LiveKit | `livekit/*` | **Keep** | Livestream token + RTMP setup already there. |
| MM Bot | `mm/*` | **Keep** | Provides testnet liquidity. |
| Jobs | `jobs/scheduler.ts` | **Extend** | Add epoch rollover, settlement wait-for-resolution polling, AI cycle scheduling. |
| Faucet | `faucet/*` | **Keep** | Testnet helper. |
| Comments / Notifications / Chat | — | **Keep** | Product surface. |

### 3.1 New env vars (`config/env.ts`)
```
VENUE_ID=0x679795a0195a1b76cdebb7c51d74e058aee92919b8c3389af86ef24535e8a28c
SETTLEMENT_BUFFER_MIN=30          # trading closes this many min before epoch hard end
EPOCH_LENGTH_H=24
EPOCH_ROLLOVER=1
DEPOSIT_CONFIRM_BLOCKS=1          # how many confirms before crediting a deposit
AI_CYCLE_INTERVAL_MS=300000
```

### 3.2 Epoch scheduler (BullMQ)
Current `scheduler.ts` uses `repeat: { every }` for AI cycles and a one-shot delayed `settle`. Replace with precise **timestamps**:
- At epoch creation: schedule `go_live` at `startsAt`; schedule `go_settling` at `endsAt − SETTLEMENT_BUFFER_MIN`; schedule `settle` at `endsAt + resolution grace`.
- `settle` job: poll `listBinaryMarkets({status:"Finalized"})` until all of the epoch's position markets are resolved/voided (with a max timeout → void/refund backstop), then `settleEpoch`.
- `go_live`: set pots `funding → live`, then schedule the pot's AI `ai-cycle` repeat job.
- After `settle`: remove AI repeat jobs, create the next epoch.

### 3.3 Real-time backend WS (`ws` + Redis pub/sub)
Extend the existing chat `setupChatWs` into a general **`/ws`** endpoint:
- Channels (per `shared/WsChannel`): `pot`, `account`, `chat`, `markets`, `notifications`.
- Backend publishes on a Redis pub/sub; a WS hub fans out to connected sockets. This gives the app typed, invalidated realtime without hammering DreamDEX.
- Push: pot NAV/cash/deployed updates (from trading engine), position updates, trade fills, epoch state changes, notifications.

---

## 4. AI Agent (OpenAI) — rewrite for production-quality trading

The current `ai-agent.service.ts` is a thin prompt→JSON→trade. For a credible submission:

1. **Inputs to the model** (structured, not free-form):
   - Live BTC/ETH spot from `fetchPrice` (already available).
   - For each candidate market: `asset`, `expiry`, `volume`, current YES mid (`fetchOrderBook`), **time-to-expiry** (skip < 5 min), and the book's best bid/ask spread.
   - The pot's current `cash` (available to deploy) and `deployed` + open positions (avoid over-concentrating).
2. **Decision schema** (Zod-validated, `response_format: json_object`):
   ```
   { action: "buy_up"|"buy_down"|"hold", marketId, symbol, sizeUsd, maxPrice, confidence, rationale }
   ```
3. **Risk controls (hard, non-negotiable, server-enforced):**
   - Max single-trade size as % of cash (configurable per `risk` level: conservative ≤5%, balanced ≤10%, aggressive ≤20%).
   - Max total deployed per pot.
   - Require `confidence ≥ threshold` and `maxPrice` to be a sane limit (never market-buy at any price).
   - If `maxPrice` not hit within the window → **cancel**, don't chase.
4. **Execution** via the trading service (IOC with a price cap → effectively a limit-to-touch).
5. **Per-epoch budget**: cap the total the AI can lose (e.g. stop trading once realized loss > X% of pot), so followers' downside is bounded.
6. **Loop** runs on the BullMQ `ai-cycle` repeat job per live pot, only while epoch is `live` and market `status === Trading`.

### 4.1 Best SDK for the job (recommendation)
Use **`@somnia-chain/markets-sdk`** directly for all on-chain reads/writes (no need for the HTTP API, which is spot-only). For order execution use the **tick/lot-int exact `trader.placeOrder`** path (or the bot-kit `ec-core` `placeLimit` wrapper if we want a maintained helper) rather than the unified `createOrder` — it avoids the float-grid bug and gives fill-level visibility. We do **not** need the public WS feed for the agent; the SDK's chain-log reads are sufficient and typed.

---

## 5. Frontend (`app/`) — keep, remove, build

### 5.1 Keep (core product surface, already built)
- `pots.index`, `pots.$id` — pot discovery + detail (deposit UI, NAV, shares).
- `traders.index`, `traders.$id` — trader discovery + profile (follow, view pots).
- `epochs.tsx` — epoch calendar/timeline (funding → live → settling → settled).
- `studio.tsx` — trader's control surface (create pot, set strategy, run live).
- `portfolio.tsx` — follower's positions/claims.
- `live.$id` + `components/traders/*` (LiveChat, LiveChart, StreamSetupDialog) — livestream + chat.
- `become-a-trader*`, `leaderboard`, `earn`, `hot-topics` — discovery/conversion.
- `components/ui/*`, `components/market/*` (TradeBox, charts, comments) — design system + market UI.
- `lib/` (wagmi-config, api-client, ws-client, queries, exchange, currency, chains, utils) — infra.
- `lib/market-adapter.ts`, `lib/queries.ts` — SDK↔API mapping.

### 5.2 Remove (irrelevant/duplicate for this product)
The spec says the current app "consists of a few irrelevant things." Candidates to **remove** (confirm each against the intended UX before deleting):
- `routes/crypto.tsx` + `routes/market.$id.tsx` + `components/market/TradeBox.tsx`, `OrderEditors.tsx`, `AssetExpirySelect.tsx`, `AssetPriceChart.tsx`, `UpDownMarkets.tsx`, `MarketsToolbar.tsx`, `Sparkline.tsx`, `LivePredictionChart.tsx`, `MarketChart.tsx`, `ChartLayers.tsx`, `CategoryNav.tsx`, `CryptoCard.tsx` — these form a **direct retail trading** experience (buy Up/Down against spot with expiries). **This is NOT the creator-economy product.** The pot is the product; followers fund pots, they don't direct-trade markets. If we keep any market browsing, it's only to show "what the trader is trading."
- `lib/market-comments-data.ts`, `lib/chart-paths.ts` — sample/mock data, replace with live.
- `lib/exchange.ts`, `lib/currency.ts` — only if unused after the cut.
- `routes/terms.tsx`, `privacy.tsx` — keep (required for a real app) unless time-boxed out.
- `components/market/GifPickerDialog.tsx`, `EmojiPickerPopover.tsx` — only if comments/live chat don't need them.

**Keep the shared market primitives** that the pot detail page needs: live NAV chart, the trader's open positions, the underlying order book for transparency.

### 5.3 Build (new/updated screens for the creator economy flow)
- **Pot detail v2** (`pots.$id`): funding phase (deposit 1:1, show est. shares), live phase (trader's live position + PnL + NAV ticker via WS), settlement phase (per-share value, trader cut breakdown, claim button).
- **Trader studio v2** (`studio.tsx`): the trader's actual control — create pot for next epoch, set strategy/risk, **signal** a trade (side, market, size, max price) which the backend executes, live order book view, cancel orders.
- **Epoch countdown/calendar**: clear "funding closes in X" → "trading live" → "settling" states.
- **AI trader config**: when `traderType === "ai"`, show the agent's recent decisions/rationale + confidence + risk cap, and a "view reasoning" expandable.

### 5.4 TanStack Query + realtime
- Use SDK react hooks (`useMarkets`, `useLiveBinaryOrderBook`, `useCandles`, `useLivePrice`) for market data; wrap in `queries.ts`.
- Use `useQuery`/`useMutation` for all backend REST.
- Use `WsClient` for backend push channels; `invalidateQueries` on WS events to keep server truth (this satisfies "tanstacks invalidates fully typed realtime sockets").

---

## 6. `shared/` package

Add any missing Zod schemas: pot risk/limits, AI decision, epoch rollover, settlement buffer config, WS event payloads for position/order updates. Rebuild before running app/backend (`npm run build:shared`).

---

## 7. End-to-End Flow (what must work on testnet)

1. **Setup**: Deploy Postgres + Redis (local Docker or hosted). Fund an operator wallet with STT (faucet) for gas; set `POT_MASTER_SEED`. Run MM bot for liquidity. Faucet tUSDC to pot signers as they're created.
2. **Register**: User connects wallet (Reown/WalletConnect) → SIWE sign → JWT. User becomes a **trader** (human or AI) via `become-a-trader`.
3. **Create epoch** (rollover job): upcoming, funding open.
4. **Create pot + fund**: Trader creates a pot in the upcoming epoch (assigns an HD signer, faucets it). Followers deposit tUSDC → backend **verifies on-chain** the pot signer balance increased → mints 1:1 shares. Withdrawals allowed while `upcoming`.
5. **Go live**: Epoch → live; pot → live; pots lock; AI/HS cycles start. Trader (human via studio, or AI agent) places IOC/POST_ONLY orders on DreamDEX event markets with the pot's signer. Positions + trades recorded; NAV streamed over WS.
6. **Settle**: Epoch trading closes with buffer → settling. Backend redeems winning positions (or both voided sides), computes final NAV from on-chain balance, computes payout waterfall, credits follower `claimableUsd`.
7. **Claim**: Follower claims → backend transfers tUSDC from pot signer → follower wallet. Trader cut recorded separately.
8. **Rollover**: Next epoch starts automatically.

---

## 8. Build Order (suggested for the ~remaining days)

1. **Shared schemas + env + decimals fix** (foundation, low risk).
2. **Trading service rewrite** (IOC/post-only, tick/lot grid, cancel, gate on status) — the technical centerpiece.
3. **Settlement fix** (collateral address/decimals, redeemMany, waterfall + rounding, claim).
4. **Epoch rollover + scheduler** (precise timestamps, settlement wait-for-resolution).
5. **Backend WS hub** (pot/position/trade/epoch push).
6. **AI agent rewrite** (structured inputs, risk caps, max-price execution).
7. **Frontend cut** (remove direct-trade routes) **+ build pot/trader/studio v2**.
8. **End-to-end testnet walkthrough** (fund → live → settle → claim) + demo video.
9. **Deck** (innovation, mechanism, roadmap: on-chain vault/role-based authority, multi-trader marketplace, production custody).

---

## 9. Judging-Criteria Mapping

- **Innovation (20%)**: Creator-economy pooled pots with epoch-locked, non-custodial delegated trading + profit-share waterfall — novel combination not in the current field.
- **Technical (25%)**: Real use of `@somnia-chain/markets-sdk` (placeOrder, mint/burn sets, redeemMany, market discovery, live watches), delegated trading, exact share/payout math, settlement correctness.
- **UX (20%)**: Trader profile + livestream + pot funding + follower portfolio + studio.
- **Ecosystem (20%)**: New product category with clear user-acquisition and trading-volume story on DreamDEX EC.
- **Presentation (15%)**: One-pot full-cycle demo + roadmap (vault custody, multi-trader marketplace).

---

## 10. Known Risks / Gotchas to Respect

- **Redeem after settlement**: settled markets leave `loadMarkets()`; use `listBinaryMarkets({status:"Finalized"})`. Redeem winning side; voided → both sides; losing redeem pays 0 (don't revert).
- **Decimals**: 6 (tUSDC) testnet vs 18 (USDso) mainnet — always `decimals()`-derived.
- **Tick/lot grid**: quantize in integers; below-one-lot floors to 0 silently.
- **Order expiry mandatory** (ns, future, ≤ market expiry).
- **Nonce races**: per-pot write lock + one exchange per pot; never run two bots on one key.
- **Indexer lag**: gate every write on on-chain `status === 1`; never trust the indexer for your own just-placed orders.
- **Pool recycling**: key by `marketId`/symbol.
- **Settlement buffer**: don't compute NAV before all markets resolve.
- **STT gas**: pot signers need STT to sign writes; faucet on creation.

---

## 11. Implementation Status (as of this build)

### Done
- **Settlement** (`settlement.service.ts`): collateral now uses `SOMNIA_TESTNET_ADDRESSES.collateral` with `decimals()`-derived scale; redemptions batched via `redeemMany`; voided markets redeem both sides; positions resolved with correct win/loss PnL.
- **Trading** (`trading.service.ts`): rewritten to raw `trader.placeOrder` — on-chain status gating, tick/lot grid snapping, price-capped IOC, POST_ONLY/LIMIT support, sell-short protection, cancel endpoint, orders/positions/trades routes, per-pot lock + exchange cache.
- **Epoch rollover** (`epoch.service.ts` + `scheduler.ts`): auto-creates the next epoch, schedules `go_live`/`go_settling`(with buffer)/`settle` via precise BullMQ delays, waits for market resolution before settling (with retry + forced-settlement backstop), stops AI cycles on settle.
- **WS hub** (`modules/realtime/ws-hub.ts`): `/ws` with `pot:`/`markets`/`epochs` channels; pot/position/trade/epoch events pushed on state changes (matches `shared` WsMessage).
- **AI agent** (`ai-agent.service.ts`): structured market context, Zod-validated JSON decision, per-risk-level size/stop-loss/confidence caps, price-capped execution, `hold` support.
- **Deposit verification + confirm window**: `modules/dreamdex/verify.ts` requires a confirmed on-chain tUSDC transfer to the pot signer; deposits below `DEPOSIT_CONFIRM_BLOCKS` are recorded pending and confirmed by a BullMQ verification worker (`verification` queue).
- **Pot-signer gas funding**: `modules/dreamdex/fund.ts` sends native STT from `GAS_FUNDER_PRIVATE_KEY` to each pot signer on creation (best-effort).
- **Faucet**: `/faucet/mint` now actually mints tUSDC (10k cap) and forwards it to the requester's address.
- **Frontend cut**: removed `/crypto` + `/market/$id` and the direct-retail-trading component family; rewrote home to `FeaturedPots`/`AllPots`/`HotTopics(top pots)`/`TopTraders`; SearchPopover searches pots & traders; nav/sitemap updated.
- **Frontend schema alignment**: `pots.$id` (real schema + settlement waterfall + claim), `StakePanel` (real tUSDC transfer → txHash → backend verify → shares; withdraw before lock; claim after settle; mint-test-tUSDC button), `PotCard`, `earn`, `portfolio`, `studio`, `EpochPhaseBadge` all aligned to the real `EpochSchema`/`PotSchema`; dead `EpochCalendar` removed. App builds clean.
- **Env**: added `VENUE_ID`, `SETTLEMENT_BUFFER_MIN`, `EPOCH_LENGTH_H`, `EPOCH_ROLLOVER`, `DEPOSIT_CONFIRM_BLOCKS`, `AI_CYCLE_INTERVAL_MS`, `GAS_FUNDER_PRIVATE_KEY`, `POT_GAS_FUND_AMT`.
- **Full API coverage (frontend ↔ backend)**: every backend route now has a typed hook and/or UI —
  - Auth: `SiweSession` auto-login (nonce→sign→verify), `useMe`, refresh handling.
  - Pots: deposit (real tUSDC transfer + on-chain verification + pending/confirm), withdraw, shares, create.
  - Studio: new **Trade** section (price-capped IOC/post-only/limit orders, positions, open orders + cancel, trade history).
  - Markets: REST wrappers (`useRestMarkets`/`useRestMarket`/`useRestOrderBook`/`useRestCandles`/`useRestPrice`).
  - Settlement: payout + claim (with `userAddress`), admin settle.
  - LiveKit: token/room/stream-setup/participants. Faucet: `useFaucetMint`. Comments: list/post/like.
  - Demo (dev-only): seed + fast-forward controls on the Epochs page.
- **Frontend type-clean**: added `npm run typecheck` to the app; removed all mock `trader`/`epoch`/`pot` fields (`pnlAll`, `pnlUsd`, `hue`, `avatarUrl`, `streamTitle`, `viewers`, `equity`, `recentTrades`, `tradesCount`, `startMs`/`endMs`, `apyBps`, `phase`) and replaced them with real shared-schema fields or derived values. Deleted the SSR-only `sitemap.xml` route. `shared`, `backend` (typecheck + build), and `app` (typecheck + build) are all clean.

### Still open
- LiveKit creds + production deployment config.
- Verify the whole fund → live → settle → claim cycle on testnet end-to-end (needs env + funded operator + faucet'd follower wallet).
- Deck + demo video.
# betterfun
