// ── Enums ─────────────────────────────────────────────────────────────────────

export type TraderType = "human" | "ai";
export type EpochStatus = "upcoming" | "live" | "settling" | "settled";
export type OrderSide = "buy_up" | "buy_down" | "sell_up" | "sell_down";
export type RiskLevel = "conservative" | "balanced" | "aggressive";

// ── App-Level View Models ─────────────────────────────────────────────────────

export interface EpochView {
  id: string;
  number: number;
  startsAt: number;
  endsAt: number;
  status: EpochStatus;
  potCount: number;
  tvl: number;
  createdAt: string;
}

export interface PotView {
  id: string;
  vault: string;
  epochId: string;
  traderId: string;
  name: string;
  strategy: PotStrategy;
  nav: number;
  lpPrice: number;
  totalShares: number;
  totalDeposits: number;
  exposure: number;
  exposureLimit: number;
  approvedPools: string[];
  status: "active";
  createdAt: string;
}

export interface TraderView {
  id: string;
  userId: string;
  traderType: TraderType;
  name: string;
  handle: string;
  avatarUrl: string;
  bio: string;
  country: string;
  tags: string[];
  verified: boolean;
  reputation: number;
  pnl30: number;
  winRate: number;
  aum: number;
  isLive: boolean;
  videoUrl?: string;
  followers: number;
  createdAt: string;
  updatedAt: string;
}

export interface PotStrategy {
  title: string;
  note: string;
  risk: RiskLevel;
  focus: string[];
}

export interface TradeView {
  id: string;
  potId: string;
  marketId: string;
  side: "BUY_YES" | "SELL_YES" | "BUY_NO" | "SELL_NO";
  size: number;
  price: number;
  orderId: string;
  timestamp: number;
}

export interface PositionView {
  id: string;
  potId: string;
  marketId: string;
  side: "up" | "down";
  contracts: number;
  avgPrice: number;
  realizedPnl: number;
  win: boolean;
}

export interface PayoutView {
  potId: string;
  epochId: string;
  totalYes: number;
  totalNo: number;
  nav: number;
  totalShares: number;
  sharePrice: number;
  status: "pending" | "distributed" | "claimed";
}

export interface PotShareView {
  id: string;
  userId: string;
  shares: number;
  investedUsd: number;
  claimableUsd: number;
}

// ── Market (on-chain orderbook) ───────────────────────────────────────────────

export interface MarketSnapshot {
  id: string;
  symbol: string;
  asset: "BTC" | "ETH";
  intervalSec: number;
  expiry: string;
  upPrice: number;
  downPrice: number;
  volume: number;
  status: "listed" | "trading" | "locked" | "resolved" | "voided";
  poolAddress: string;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  walletAddress: string;
}

export interface AuthVerifyResult {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

// ── Order Book ────────────────────────────────────────────────────────────────

export interface OrderBookLevel {
  price: number;
  quantity: number;
}

export interface OrderBookSnapshot {
  symbol: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: number;
}
