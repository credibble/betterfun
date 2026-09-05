import { HDKey } from "@scure/bip32";
import { privateKeyToAccount } from "viem/accounts";
import { bytesToHex, hexToBytes } from "viem";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";

let masterKey: HDKey | null = null;

function getMasterKey(): HDKey {
  if (!masterKey) {
    const seed = hexToBytes(env.POT_MASTER_SEED as `0x${string}`);
    masterKey = HDKey.fromMasterSeed(seed);
    logger.info("Pot master HD key initialized");
  }
  return masterKey;
}

/**
 * Derive a pot signer private key from the master seed.
 * Each pot gets index 0, 1, 2, ... based on creation order.
 */
export function derivePotKey(potIndex: number): `0x${string}` {
  const master = getMasterKey();
  const derived = master.derive(`m/44'/60'/0'/0/${potIndex}`);
  if (!derived.privateKey) {
    throw new Error(`Failed to derive key for pot index ${potIndex}`);
  }
  return bytesToHex(derived.privateKey) as `0x${string}`;
}

/**
 * Derive the Ethereum address from a pot's private key.
 */
export function getPotAddress(potIndex: number): string {
  const privateKey = derivePotKey(potIndex);
  const account = privateKeyToAccount(privateKey);
  return account.address;
}
