import { BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import {
  Deposit,
  Withdraw,
  SetMinted,
  SetBurned,
  OrderPlaced,
  Redeemed,
  FeesWithdrawn,
  PoolApproved,
  PoolRevoked,
} from "../generated/templates/PotVault/PotVault";
import {
  Pot as PotEntity,
  Deposit as DepositEntity,
  Withdrawal,
  Trade,
  SetMint as SetMintEntity,
  SetBurn as SetBurnEntity,
  FeeClaim,
} from "../generated/schema";

function getPot(addr: Bytes): PotEntity | null {
  return PotEntity.load(addr);
}

function txId(event: ethereum.Event, suffix: string): string {
  return event.transaction.hash.toHex() + "-" + event.logIndex.toString() + "-" + suffix;
}

export function handleDeposit(event: Deposit): void {
  let pot = getPot(event.address);
  if (!pot) return;

  let entity = new DepositEntity(txId(event, "deposit"));
  entity.pot = pot.id;
  entity.lp = event.params.lp;
  entity.collateralIn = event.params.collateralIn;
  entity.sharesOut = event.params.sharesOut;
  entity.timestamp = event.block.timestamp;
  entity.save();

  pot.totalShares = pot.totalShares.plus(event.params.sharesOut);
  pot.totalDeposits = pot.totalDeposits.plus(event.params.collateralIn);
  pot.save();
}

export function handleWithdraw(event: Withdraw): void {
  let pot = getPot(event.address);
  if (!pot) return;

  let entity = new Withdrawal(txId(event, "withdraw"));
  entity.pot = pot.id;
  entity.lp = event.params.lp;
  entity.sharesBurned = event.params.sharesBurned;
  entity.collateralOut = event.params.collateralOut;
  entity.timestamp = event.block.timestamp;
  entity.save();

  pot.totalShares = pot.totalShares.minus(event.params.sharesBurned);
  pot.totalDeposits = pot.totalDeposits.minus(event.params.collateralOut);
  pot.save();
}

export function handleSetMinted(event: SetMinted): void {
  let pot = getPot(event.address);
  if (!pot) return;

  let entity = new SetMintEntity(txId(event, "mint"));
  entity.pot = pot.id;
  entity.pool = event.params.pool;
  entity.amount = event.params.amount;
  entity.timestamp = event.block.timestamp;
  entity.save();
}

export function handleSetBurned(event: SetBurned): void {
  let pot = getPot(event.address);
  if (!pot) return;

  let entity = new SetBurnEntity(txId(event, "burn"));
  entity.pot = pot.id;
  entity.pool = event.params.pool;
  entity.amount = event.params.amount;
  entity.timestamp = event.block.timestamp;
  entity.save();
}

export function handleOrderPlaced(event: OrderPlaced): void {
  let pot = getPot(event.address);
  if (!pot) return;

  let side: string;
  if (event.params.side == 0) side = "BUY_YES";
  else if (event.params.side == 1) side = "SELL_YES";
  else if (event.params.side == 2) side = "BUY_NO";
  else side = "SELL_NO";

  let entity = new Trade(txId(event, "trade"));
  entity.pot = pot.id;
  entity.pool = event.params.pool;
  entity.side = side;
  entity.tick = event.params.tick;
  entity.size = event.params.size;
  entity.orderId = event.params.orderId;
  entity.timestamp = event.block.timestamp;
  entity.save();
}

export function handleRedeemed(event: Redeemed): void {
  // Redemption doesn't need a PotEntity reference (comes from settlement)
}

export function handleFeesWithdrawn(event: FeesWithdrawn): void {
  let pot = getPot(event.address);
  if (!pot) return;

  let entity = new FeeClaim(txId(event, "fee"));
  entity.pot = pot.id;
  entity.to = event.params.to;
  entity.amount = event.params.amount;
  entity.isProtocol = event.params.isProtocol;
  entity.timestamp = event.block.timestamp;
  entity.save();
}

export function handlePoolApproved(event: PoolApproved): void {
  let pot = getPot(event.address);
  if (!pot) return;

  let pools = pot.approvedPools;
  pools.push(event.params.pool);
  pot.approvedPools = pools;
  pot.save();
}

export function handlePoolRevoked(event: PoolRevoked): void {
  let pot = getPot(event.address);
  if (!pot) return;

  let pools = pot.approvedPools;
  let idx = pools.indexOf(event.params.pool);
  if (idx != -1) {
    pools.splice(idx, 1);
  }
  pot.approvedPools = pools;
  pot.save();
}
