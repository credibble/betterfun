import { BigInt } from "@graphprotocol/graph-ts";
import { PotDeployed } from "../generated/PotFactory/PotFactory";
import { PotVault as PotVaultTemplate } from "../generated/templates";
import { Pot, Epoch, Trader } from "../generated/schema";

export function handlePotDeployed(event: PotDeployed): void {
  // Create template data source for this vault
  PotVaultTemplate.create(event.params.vault);

  let pot = new Pot(event.params.vault);
  pot.vault = event.params.vault;
  pot.epoch = event.params.epochId.toString();
  pot.trader = event.params.trader;
  pot.exposureLimit = event.params.exposureLimit;
  pot.index = event.params.index;
  pot.halted = false;
  pot.nav = BigInt.fromI32(0);
  pot.totalShares = BigInt.fromI32(0);
  pot.totalDeposits = BigInt.fromI32(0);
  pot.exposure = BigInt.fromI32(0);
  pot.approvedPools = [];
  pot.createdAt = event.block.timestamp;
  pot.save();

  // Increment trader pot count
  let trader = Trader.load(event.params.trader);
  if (trader) {
    trader.potCount = trader.potCount.plus(BigInt.fromI32(1));
    trader.updatedAt = event.block.timestamp;
    trader.save();
  }
}
