import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  EpochCreated,
  EpochWentLive,
  EpochWentSettling,
  EpochSettled,
  PotAddedToEpoch,
} from "../generated/EpochController/EpochController";
import { Epoch, Pot } from "../generated/schema";

function epochId(id: BigInt): string {
  return id.toString();
}

export function handleEpochCreated(event: EpochCreated): void {
  let epoch = new Epoch(epochId(event.params.epochId));
  epoch.startsAt = event.params.startsAt;
  epoch.endsAt = event.params.endsAt;
  epoch.state = "UPCOMING";
  epoch.createdAt = event.block.timestamp;
  epoch.save();
}

export function handleEpochWentLive(event: EpochWentLive): void {
  let epoch = Epoch.load(epochId(event.params.epochId));
  if (!epoch) return;
  epoch.state = "LIVE";
  epoch.save();
}

export function handleEpochWentSettling(event: EpochWentSettling): void {
  let epoch = Epoch.load(epochId(event.params.epochId));
  if (!epoch) return;
  epoch.state = "SETTLING";
  epoch.save();
}

export function handleEpochSettled(event: EpochSettled): void {
  let epoch = Epoch.load(epochId(event.params.epochId));
  if (!epoch) return;
  epoch.state = "SETTLED";
  epoch.save();
}

export function handlePotAddedToEpoch(event: PotAddedToEpoch): void {
  let pot = Pot.load(event.params.pot);
  if (pot) {
    pot.epoch = epochId(event.params.epochId);
    pot.save();
  }
}
