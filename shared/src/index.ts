import { z } from "zod";

// ── Auth ──────────────────────────────────────────────────────────────────────

export const WalletAddress = z.string().regex(/^0x[0-9a-fA-F]{40}$/, "Invalid EVM address");
export type WalletAddress = z.infer<typeof WalletAddress>;

export const SiweMessage = z.object({
  domain: z.string(),
  address: WalletAddress,
  statement: z.string().optional(),
  uri: z.string().url(),
  version: z.string().default("1"),
  chainId: z.number(),
  nonce: z.string(),
  issuedAt: z.string(),
  expirationTime: z.string().optional(),
});
export type SiweMessage = z.infer<typeof SiweMessage>;

export const JwtClaims = z.object({
  sub: WalletAddress,
  address: WalletAddress,
  role: z.enum(["user", "trader", "admin"]),
  traderId: z.string().uuid().optional(),
  iat: z.number(),
  exp: z.number(),
});
export type JwtClaims = z.infer<typeof JwtClaims>;

// ── Enums ─────────────────────────────────────────────────────────────────────

export const TraderType = z.enum(["human", "ai"]);
export type TraderType = z.infer<typeof TraderType>;

export const EpochStatus = z.enum(["upcoming", "live", "settling", "settled"]);
export type EpochStatus = z.infer<typeof EpochStatus>;

export const OrderSide = z.enum(["buy_up", "buy_down", "sell_up", "sell_down"]);
export type OrderSide = z.infer<typeof OrderSide>;

export const OrderStatus = z.enum(["pending", "filled", "partial", "cancelled", "expired"]);
export type OrderStatus = z.infer<typeof OrderStatus>;

export const PositionSide = z.enum(["up", "down"]);
export type PositionSide = z.infer<typeof PositionSide>;

export const PositionStatus = z.enum(["open", "resolved"]);
export type PositionStatus = z.infer<typeof PositionStatus>;

export const RiskLevel = z.enum(["conservative", "balanced", "aggressive"]);
export type RiskLevel = z.infer<typeof RiskLevel>;

export const PayoutStatus = z.enum(["pending", "distributed", "claimed"]);
export type PayoutStatus = z.infer<typeof PayoutStatus>;

export const LiveSessionStatus = z.enum(["active", "ended"]);
export type LiveSessionStatus = z.infer<typeof LiveSessionStatus>;

// ── Entities ──────────────────────────────────────────────────────────────────

export const UserSchema = z.object({
  id: z.string().uuid(),
  walletAddress: WalletAddress,
  nonce: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type UserSchema = z.infer<typeof UserSchema>;

export const AiConfigSchema = z.object({
  model: z.string(),
  skills: z.array(z.string()),
  description: z.string(),
});
export type AiConfigSchema = z.infer<typeof AiConfigSchema>;

export const TraderProfileSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  traderType: TraderType,
  aiConfig: AiConfigSchema.optional(),
  name: z.string().min(1).max(50),
  handle: z.string().min(1).max(30).regex(/^[a-z0-9_-]+$/),
  bio: z.string().max(500),
  country: z.string().max(100),
  tags: z.array(z.string().max(30)),
  verified: z.boolean(),
  reputation: z.number().min(0).max(100),
  pnl30: z.number(),
  winRate: z.number().min(0).max(100),
  followers: z.number().int().min(0),
  aum: z.number().min(0),
  isLive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type TraderProfileSchema = z.infer<typeof TraderProfileSchema>;

export const EpochSchema = z.object({
  id: z.string().uuid(),
  number: z.number().int().min(1),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  status: EpochStatus,
  potCount: z.number().int().min(0),
  tvl: z.number().min(0),
  createdAt: z.string().datetime(),
});
export type EpochSchema = z.infer<typeof EpochSchema>;

export const PotStrategySchema = z.object({
  title: z.string().min(1),
  note: z.string().max(500),
  risk: RiskLevel,
  focus: z.array(z.string()),
});
export type PotStrategySchema = z.infer<typeof PotStrategySchema>;

export const PotSchema = z.object({
  id: z.string().uuid(),
  traderId: z.string().uuid(),
  epochId: z.string().uuid(),
  strategy: PotStrategySchema,
  cash: z.number().min(0),
  nav: z.number().min(0),
  deployed: z.number().min(0),
  lpPrice: z.number().min(0),
  sharesOutstanding: z.number().min(0),
  signerAddress: WalletAddress,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type PotSchema = z.infer<typeof PotSchema>;

export const PotShareSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  potId: z.string().uuid(),
  shares: z.number().min(0),
  investedUsd: z.number().min(0),
  claimableUsd: z.number().min(0),
  createdAt: z.string().datetime(),
});
export type PotShareSchema = z.infer<typeof PotShareSchema>;

export const DepositSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  potId: z.string().uuid(),
  amountUsd: z.number().positive(),
  txHash: z.string(),
  status: z.enum(["pending", "confirmed", "failed"]),
  createdAt: z.string().datetime(),
});
export type DepositSchema = z.infer<typeof DepositSchema>;

export const WithdrawalSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  potId: z.string().uuid(),
  amountUsd: z.number().positive(),
  txHash: z.string().optional(),
  status: z.enum(["pending", "completed", "failed"]),
  createdAt: z.string().datetime(),
});
export type WithdrawalSchema = z.infer<typeof WithdrawalSchema>;

export const PositionSchema = z.object({
  id: z.string().uuid(),
  potId: z.string().uuid(),
  marketId: z.string(),
  symbol: z.string(),
  side: PositionSide,
  contracts: z.number().min(0),
  avgPrice: z.number().min(0),
  status: PositionStatus,
  realizedPnl: z.number(),
  win: z.boolean().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type PositionSchema = z.infer<typeof PositionSchema>;

export const OrderSchema = z.object({
  id: z.string().uuid(),
  potId: z.string().uuid(),
  marketId: z.string(),
  symbol: z.string(),
  exchangeOrderId: z.string().optional(),
  price: z.number().min(0).max(1),
  quantity: z.number().positive(),
  filled: z.number().min(0),
  side: OrderSide,
  status: OrderStatus,
  expiresAtNs: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type OrderSchema = z.infer<typeof OrderSchema>;

export const TradeSchema = z.object({
  id: z.string().uuid(),
  potId: z.string().uuid(),
  marketId: z.string(),
  symbol: z.string(),
  side: OrderSide,
  price: z.number().min(0).max(1),
  quantity: z.number().positive(),
  ts: z.string().datetime(),
});
export type TradeSchema = z.infer<typeof TradeSchema>;

export const PayoutSchema = z.object({
  id: z.string().uuid(),
  potId: z.string().uuid(),
  epochId: z.string().uuid(),
  perShare: z.number().min(0),
  traderCutUsd: z.number().min(0),
  protocolCutUsd: z.number().min(0),
  lpDistributedUsd: z.number().min(0),
  distribution: z.record(z.string(), z.number()),
  status: PayoutStatus,
  createdAt: z.string().datetime(),
});
export type PayoutSchema = z.infer<typeof PayoutSchema>;

export const LiveSessionSchema = z.object({
  id: z.string().uuid(),
  potId: z.string().uuid(),
  traderId: z.string().uuid(),
  livekitRoom: z.string(),
  title: z.string().max(200),
  status: LiveSessionStatus,
  viewerCount: z.number().int().min(0),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().optional(),
});
export type LiveSessionSchema = z.infer<typeof LiveSessionSchema>;

export const ChatMessageSchema = z.object({
  id: z.string().uuid(),
  roomId: z.string(),
  userId: z.string().uuid(),
  text: z.string().max(1000),
  ts: z.string().datetime(),
});
export type ChatMessageSchema = z.infer<typeof ChatMessageSchema>;

// ── API DTOs ──────────────────────────────────────────────────────────────────

export const AuthNonceRequest = z.object({
  address: WalletAddress,
});
export type AuthNonceRequest = z.infer<typeof AuthNonceRequest>;

export const AuthNonceResponse = z.object({
  nonce: z.string(),
  statement: z.string(),
});
export type AuthNonceResponse = z.infer<typeof AuthNonceResponse>;

export const AuthVerifyRequest = z.object({
  message: z.string(),
  signature: z.string(),
});
export type AuthVerifyRequest = z.infer<typeof AuthVerifyRequest>;

export const AuthVerifyResponse = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: UserSchema,
});
export type AuthVerifyResponse = z.infer<typeof AuthVerifyResponse>;

export const AuthRefreshRequest = z.object({
  refreshToken: z.string(),
});
export type AuthRefreshRequest = z.infer<typeof AuthRefreshRequest>;

export const AuthRefreshResponse = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});
export type AuthRefreshResponse = z.infer<typeof AuthRefreshResponse>;

export const TraderApplyRequest = z.object({
  name: z.string().min(1).max(50),
  handle: z.string().min(1).max(30).regex(/^[a-z0-9_-]+$/),
  traderType: TraderType,
  bio: z.string().min(1).max(500).optional(),
  country: z.string().max(100).optional(),
  tags: z.array(z.string().max(30)).optional(),
  strategy: z.string().min(10).max(500).optional(),
  aiConfig: AiConfigSchema.optional(),
});
export type TraderApplyRequest = z.infer<typeof TraderApplyRequest>;

export const TraderProfileUpdateRequest = z.object({
  name: z.string().min(1).max(50).optional(),
  bio: z.string().max(500).optional(),
  country: z.string().max(100).optional(),
  tags: z.array(z.string().max(30)).optional(),
});
export type TraderProfileUpdateRequest = z.infer<typeof TraderProfileUpdateRequest>;

export const CreatePotRequest = z.object({
  epochId: z.string().uuid(),
  strategy: PotStrategySchema,
});
export type CreatePotRequest = z.infer<typeof CreatePotRequest>;

export const DepositRequest = z.object({
  potId: z.string().uuid(),
  amountUsd: z.number().positive(),
});
export type DepositRequest = z.infer<typeof DepositRequest>;

export const WithdrawRequest = z.object({
  potId: z.string().uuid(),
  amountUsd: z.number().positive(),
});
export type WithdrawRequest = z.infer<typeof WithdrawRequest>;

export const TradeRequest = z.object({
  potId: z.string().uuid(),
  marketId: z.string(),
  side: OrderSide,
  sizeUsd: z.number().positive(),
  maxPrice: z.number().min(0).max(1).optional(),
  expiresInSec: z.number().int().min(30).max(3600).optional(),
});
export type TradeRequest = z.infer<typeof TradeRequest>;

// ── WebSocket Messages ────────────────────────────────────────────────────────

export const WsChannel = z.enum(["pot", "account", "chat", "markets", "notifications"]);
export type WsChannel = z.infer<typeof WsChannel>;

export const WsSubscribeMessage = z.object({
  type: z.literal("subscribe"),
  channel: WsChannel,
  id: z.string(),
});
export type WsSubscribeMessage = z.infer<typeof WsSubscribeMessage>;

export const WsUnsubscribeMessage = z.object({
  type: z.literal("unsubscribe"),
  channel: WsChannel,
  id: z.string(),
});
export type WsUnsubscribeMessage = z.infer<typeof WsUnsubscribeMessage>;

export const WsPotUpdate = z.object({
  type: z.literal("pot:update"),
  potId: z.string(),
  nav: z.number(),
  cash: z.number(),
  deployed: z.number(),
  lpPrice: z.number(),
});
export type WsPotUpdate = z.infer<typeof WsPotUpdate>;

export const WsPositionUpdate = z.object({
  type: z.literal("position:update"),
  potId: z.string(),
  position: PositionSchema,
});
export type WsPositionUpdate = z.infer<typeof WsPositionUpdate>;

export const WsTradeUpdate = z.object({
  type: z.literal("trade:update"),
  potId: z.string(),
  trade: TradeSchema,
});
export type WsTradeUpdate = z.infer<typeof WsTradeUpdate>;

export const WsChatMessage = z.object({
  type: z.literal("chat:message"),
  roomId: z.string(),
  message: ChatMessageSchema,
});
export type WsChatMessage = z.infer<typeof WsChatMessage>;

export const WsNotification = z.object({
  type: z.literal("notification"),
  id: z.string(),
  title: z.string(),
  body: z.string(),
  data: z.record(z.unknown()).optional(),
});
export type WsNotification = z.infer<typeof WsNotification>;

export const WsEpochUpdate = z.object({
  type: z.literal("epoch:update"),
  epoch: EpochSchema,
});
export type WsEpochUpdate = z.infer<typeof WsEpochUpdate>;

export const WsMessage = z.discriminatedUnion("type", [
  WsPotUpdate,
  WsPositionUpdate,
  WsTradeUpdate,
  WsChatMessage,
  WsNotification,
  WsEpochUpdate,
]);
export type WsMessage = z.infer<typeof WsMessage>;

// ── Market DTOs ───────────────────────────────────────────────────────────────

export const MarketSnapshot = z.object({
  id: z.string(),
  symbol: z.string(),
  asset: z.enum(["BTC", "ETH"]),
  intervalSec: z.number(),
  expiry: z.string().datetime(),
  upPrice: z.number().min(0).max(1),
  downPrice: z.number().min(0).max(1),
  volume: z.number().min(0),
  status: z.enum(["listed", "trading", "locked", "resolved", "voided"]),
  poolAddress: z.string(),
});
export type MarketSnapshot = z.infer<typeof MarketSnapshot>;

export const OrderBookLevel = z.object({
  price: z.number().min(0).max(1),
  quantity: z.number().min(0),
});
export type OrderBookLevel = z.infer<typeof OrderBookLevel>;

export const OrderBookSnapshot = z.object({
  symbol: z.string(),
  bids: z.array(OrderBookLevel),
  asks: z.array(OrderBookLevel),
  timestamp: z.number(),
});
export type OrderBookSnapshot = z.infer<typeof OrderBookSnapshot>;

// ── Fee Split ─────────────────────────────────────────────────────────────────

export const FEE_SPLIT = {
  traderBps: 1500,
  protocolBps: 500,
  lpBps: 8000,
} as const;

export const CALC_FEE_SPLIT = {
  trader: FEE_SPLIT.traderBps / 10000,
  protocol: FEE_SPLIT.protocolBps / 10000,
  lp: FEE_SPLIT.lpBps / 10000,
} as const;
