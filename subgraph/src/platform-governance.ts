import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  FeeSplitSet,
  TreasurySet,
  MaxExposureSet,
  MinDepositSet,
  MaxPotsPerTraderSet,
  PausedSet,
} from "../generated/PlatformGovernance/PlatformGovernance";
import { PlatformConfig } from "../generated/schema";

let CONFIG_ID = "global";

function getOrCreateConfig(): PlatformConfig {
  let config = PlatformConfig.load(CONFIG_ID);
  if (!config) {
    config = new PlatformConfig(CONFIG_ID);
    config.lpShare = BigInt.fromI32(80);
    config.traderShare = BigInt.fromI32(15);
    config.protocolShare = BigInt.fromI32(5);
    config.treasury = Bytes.empty();
    config.maxExposure = BigInt.fromI32(0);
    config.minDeposit = BigInt.fromI32(0);
    config.maxPotsPerTrader = BigInt.fromI32(0);
    config.paused = false;
    config.updatedAt = BigInt.fromI32(0);
  }
  return config;
}

export function handleFeeSplitSet(event: FeeSplitSet): void {
  let config = getOrCreateConfig();
  config.lpShare = BigInt.fromI32(event.params.lp);
  config.traderShare = BigInt.fromI32(event.params.trader);
  config.protocolShare = BigInt.fromI32(event.params.protocol);
  config.updatedAt = event.block.timestamp;
  config.save();
}

export function handleTreasurySet(event: TreasurySet): void {
  let config = getOrCreateConfig();
  config.treasury = event.params.addr;
  config.updatedAt = event.block.timestamp;
  config.save();
}

export function handleMaxExposureSet(event: MaxExposureSet): void {
  let config = getOrCreateConfig();
  config.maxExposure = event.params.limit;
  config.updatedAt = event.block.timestamp;
  config.save();
}

export function handleMinDepositSet(event: MinDepositSet): void {
  let config = getOrCreateConfig();
  config.minDeposit = event.params.amount;
  config.updatedAt = event.block.timestamp;
  config.save();
}

export function handleMaxPotsPerTraderSet(event: MaxPotsPerTraderSet): void {
  let config = getOrCreateConfig();
  config.maxPotsPerTrader = event.params.limit;
  config.updatedAt = event.block.timestamp;
  config.save();
}

export function handlePausedSet(event: PausedSet): void {
  let config = getOrCreateConfig();
  config.paused = event.params.paused;
  config.updatedAt = event.block.timestamp;
  config.save();
}
