// Auto-generated from EventVault.sol + VaultFactory.sol — keep in sync with contracts.

export const EVENT_VAULT_ABI = [
  // ── Errors ──────────────────────────────────────────────────────────────
  { type: "error", name: "OnlyGovernance", inputs: [] },
  { type: "error", name: "OnlyOperator", inputs: [] },
  { type: "error", name: "VaultHalted", inputs: [] },
  { type: "error", name: "PoolNotApproved", inputs: [] },
  { type: "error", name: "BadSide", inputs: [] },
  { type: "error", name: "ZeroAmount", inputs: [] },
  { type: "error", name: "ExposureBreached", inputs: [{ name: "wouldBe", type: "uint256" }, { name: "limit", type: "uint256" }] },
  { type: "error", name: "NothingToClaim", inputs: [] },
  { type: "error", name: "NoRosterSpace", inputs: [] },
  { type: "error", name: "ZeroAddress", inputs: [] },

  // ── View functions ─────────────────────────────────────────────────────
  { type: "function", name: "nav", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "pricePerShare", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "exposure", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "rosterLength", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "positionTotals", inputs: [], outputs: [{ name: "yes", type: "uint256" }, { name: "no", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "balanceOf", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "totalSupply", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "halted", inputs: [], outputs: [{ name: "", type: "bool" }], stateMutability: "view" },
  { type: "function", name: "governance", inputs: [], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
  { type: "function", name: "operator", inputs: [], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
  { type: "function", name: "approved", inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "bool" }], stateMutability: "view" },
  { type: "function", name: "roster", inputs: [{ name: "", type: "uint256" }], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
  { type: "function", name: "exposureLimit", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "protocolFees", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "operatorFees", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "protocolTreasury", inputs: [], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
  { type: "function", name: "collateral", inputs: [], outputs: [{ name: "", type: "address" }], stateMutability: "view" },

  // ── Mutative functions ─────────────────────────────────────────────────
  { type: "function", name: "enter", inputs: [{ name: "amount", type: "uint256" }], outputs: [{ name: "shares", type: "uint256" }], stateMutability: "nonpayable" },
  { type: "function", name: "exit", inputs: [{ name: "shares", type: "uint256" }], outputs: [{ name: "collateralOut", type: "uint256" }], stateMutability: "nonpayable" },
  { type: "function", name: "mintSet", inputs: [{ name: "pool", type: "address" }, { name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "burnSet", inputs: [{ name: "pool", type: "address" }, { name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "trade", inputs: [{ name: "pool", type: "address" }, { name: "side", type: "uint8" }, { name: "tick", type: "uint256" }, { name: "size", type: "uint256" }, { name: "expiryNs", type: "uint64" }, { name: "orderKind", type: "uint8" }, { name: "selfMatch", type: "uint8" }], outputs: [{ name: "orderId", type: "uint256" }], stateMutability: "nonpayable" },
  { type: "function", name: "cancelOrder", inputs: [{ name: "pool", type: "address" }, { name: "orderId", type: "uint128" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "cancelOrders", inputs: [{ name: "pool", type: "address" }, { name: "ids", type: "uint128[]" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "redeem", inputs: [{ name: "outcomeId", type: "uint256" }, { name: "amount", type: "uint256" }], outputs: [{ name: "collateralOut", type: "uint256" }], stateMutability: "nonpayable" },
  { type: "function", name: "redeemFinalize", inputs: [{ name: "pool", type: "address" }, { name: "outcomeId", type: "uint256" }, { name: "amount", type: "uint256" }], outputs: [{ name: "collateralOut", type: "uint256" }], stateMutability: "nonpayable" },
  { type: "function", name: "claimOperatorFees", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "claimProtocolFees", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "approvePool", inputs: [{ name: "pool", type: "address" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "revokePool", inputs: [{ name: "pool", type: "address" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "setGovernance", inputs: [{ name: "addr", type: "address" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "setOperator", inputs: [{ name: "addr", type: "address" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "setHalted", inputs: [{ name: "flag", type: "bool" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "setExposureLimit", inputs: [{ name: "limit", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "setTreasury", inputs: [{ name: "addr", type: "address" }], outputs: [], stateMutability: "nonpayable" },

  // ── Events (match exact contract indexing) ──────────────────────────────
  { type: "event", name: "Deposit", inputs: [{ name: "lp", type: "address", indexed: true }, { name: "collateralIn", type: "uint256", indexed: false }, { name: "sharesOut", type: "uint256", indexed: false }] },
  { type: "event", name: "Withdraw", inputs: [{ name: "lp", type: "address", indexed: true }, { name: "sharesBurned", type: "uint256", indexed: false }, { name: "collateralOut", type: "uint256", indexed: false }] },
  { type: "event", name: "SetMinted", inputs: [{ name: "pool", type: "address", indexed: true }, { name: "amount", type: "uint256", indexed: false }] },
  { type: "event", name: "SetBurned", inputs: [{ name: "pool", type: "address", indexed: true }, { name: "amount", type: "uint256", indexed: false }] },
  { type: "event", name: "OrderPlaced", inputs: [{ name: "pool", type: "address", indexed: true }, { name: "side", type: "uint8", indexed: false }, { name: "tick", type: "uint256", indexed: false }, { name: "size", type: "uint256", indexed: false }, { name: "orderId", type: "uint256", indexed: false }] },
  { type: "event", name: "OrderCancelled", inputs: [{ name: "pool", type: "address", indexed: true }, { name: "orderId", type: "uint256", indexed: false }] },
  { type: "event", name: "Redeemed", inputs: [{ name: "outcomeId", type: "uint256", indexed: false }, { name: "amount", type: "uint256", indexed: false }, { name: "collateralOut", type: "uint256", indexed: false }] },
  { type: "event", name: "FeesWithdrawn", inputs: [{ name: "to", type: "address", indexed: true }, { name: "amount", type: "uint256", indexed: false }, { name: "isProtocol", type: "bool", indexed: false }] },
  { type: "event", name: "PoolApproved", inputs: [{ name: "pool", type: "address", indexed: true }] },
  { type: "event", name: "PoolRevoked", inputs: [{ name: "pool", type: "address", indexed: true }] },
  { type: "event", name: "GovernanceSet", inputs: [{ name: "newGov", type: "address", indexed: true }] },
  { type: "event", name: "OperatorSet", inputs: [{ name: "newOps", type: "address", indexed: true }] },
  { type: "event", name: "HaltedSet", inputs: [{ name: "halted", type: "bool", indexed: false }] },
  { type: "event", name: "ExposureLimitSet", inputs: [{ name: "limit", type: "uint256", indexed: false }] },
  { type: "event", name: "TreasurySet", inputs: [{ name: "addr", type: "address", indexed: true }] },
] as const;

// ─── VaultFactory ABI ───────────────────────────────────────────────────────

export const VAULT_FACTORY_ABI = [
  // ── Errors ──────────────────────────────────────────────────────────────
  { type: "error", name: "OnlyOwner", inputs: [] },
  { type: "error", name: "ZeroAddress", inputs: [] },

  // ── View functions ─────────────────────────────────────────────────────
  { type: "function", name: "owner", inputs: [], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
  { type: "function", name: "platformTreasury", inputs: [], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
  { type: "function", name: "collateral", inputs: [], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
  { type: "function", name: "positions", inputs: [], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
  { type: "function", name: "settlement", inputs: [], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
  { type: "function", name: "vaultCount", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "vaults", inputs: [{ name: "", type: "uint256" }], outputs: [{ name: "vault", type: "address" }, { name: "trader", type: "address" }, { name: "exposureLimit", type: "uint256" }, { name: "createdAt", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "isVault", inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "bool" }], stateMutability: "view" },

  // ── Mutative functions ─────────────────────────────────────────────────
  { type: "function", name: "deploy", inputs: [{ name: "trader", type: "address" }, { name: "exposureLimit", type: "uint256" }], outputs: [{ name: "vault", type: "address" }], stateMutability: "nonpayable" },
  { type: "function", name: "setOwner", inputs: [{ name: "addr", type: "address" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "setTreasury", inputs: [{ name: "addr", type: "address" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "transferVaultGovernance", inputs: [{ name: "vault", type: "address" }, { name: "newGovernance", type: "address" }], outputs: [], stateMutability: "nonpayable" },

  // ── Constructor (for deployContract) ────────────────────────────────────
  { type: "constructor", inputs: [{ name: "_collateral", type: "address" }, { name: "_positions", type: "address" }, { name: "_settlement", type: "address" }, { name: "_treasury", type: "address" }] },

  // ── Events ─────────────────────────────────────────────────────────────
  { type: "event", name: "VaultDeployed", inputs: [{ name: "vault", type: "address", indexed: true }, { name: "trader", type: "address", indexed: true }, { name: "exposureLimit", type: "uint256", indexed: false }, { name: "index", type: "uint256", indexed: false }] },
  { type: "event", name: "OwnerSet", inputs: [{ name: "newOwner", type: "address", indexed: true }] },
  { type: "event", name: "TreasurySet", inputs: [{ name: "addr", type: "address", indexed: true }] },
] as const;
