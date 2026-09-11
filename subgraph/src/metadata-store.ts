import { Bytes, BigInt } from "@graphprotocol/graph-ts";
import { MetadataSet } from "../generated/MetadataStore/MetadataStore";
import { MetadataUpdate } from "../generated/schema";

function entityTypeStr(val: i32): string {
  if (val == 0) return "TRADER";
  if (val == 1) return "POT";
  if (val == 2) return "EPOCH";
  return "PLATFORM";
}

export function handleMetadataSet(event: MetadataSet): void {
  let id = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
  let entity = new MetadataUpdate(id);
  entity.entityType = entityTypeStr(event.params.entityType);
  entity.entityKey = event.params.entityKey;
  entity.cid = event.params.cid;
  entity.version = event.params.version;
  entity.timestamp = event.block.timestamp;
  entity.save();
}
