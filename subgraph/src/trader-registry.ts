import { Bytes, BigInt } from "@graphprotocol/graph-ts";
import {
  TraderRegistered,
  TraderUpdated,
  TraderVerified,
  TraderDeactivated,
} from "../generated/TraderRegistry/TraderRegistry";
import { Trader } from "../generated/schema";

export function handleTraderRegistered(event: TraderRegistered): void {
  let trader = new Trader(event.params.trader);
  trader.metadataCID = event.params.metadataCID;
  trader.payoutAddress = event.params.payoutAddress;
  trader.traderType = event.params.traderType == 0 ? "TRADER" : "ALGO";
  trader.verified = false;
  trader.active = true;
  trader.potCount = BigInt.fromI32(0);
  trader.registeredAt = event.block.timestamp;
  trader.updatedAt = event.block.timestamp;
  trader.save();
}

export function handleTraderUpdated(event: TraderUpdated): void {
  let trader = Trader.load(event.params.trader);
  if (!trader) return;
  trader.metadataCID = event.params.metadataCID;
  trader.updatedAt = event.block.timestamp;
  trader.save();
}

export function handleTraderVerified(event: TraderVerified): void {
  let trader = Trader.load(event.params.trader);
  if (!trader) return;
  trader.verified = event.params.verified;
  trader.updatedAt = event.block.timestamp;
  trader.save();
}

export function handleTraderDeactivated(event: TraderDeactivated): void {
  let trader = Trader.load(event.params.trader);
  if (!trader) return;
  trader.active = false;
  trader.updatedAt = event.block.timestamp;
  trader.save();
}
