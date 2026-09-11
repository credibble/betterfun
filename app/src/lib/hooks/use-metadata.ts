import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { MetadataStoreAbi, ADDRESSES } from "../contracts";

/** EntityType enum values for MetadataStore */
export const MetadataEntityType = {
  TRADER: 0,
  POT: 1,
} as const;

/**
 * Pad a 20-byte address to a 32-byte bytes32 value (left-padded with zeros).
 * The MetadataStore contract expects bytes32 keys, so addresses must be padded.
 */
export function addressToBytes32(addr: `0x${string}`): `0x${string}` {
  return `0x${addr.slice(2).toLowerCase().padStart(64, "0")}` as `0x${string}`;
}

/**
 * Read the current CID for an entity from the MetadataStore contract.
 * entityKey must be a 32-byte bytes32 value (use addressToBytes32 for addresses).
 */
export function useMetadataCID(
  entityType: number,
  entityKey: `0x${string}` | undefined,
) {
  return useReadContract({
    address: ADDRESSES.METADATA_STORE,
    abi: MetadataStoreAbi,
    functionName: "getCurrentCID",
    args: entityKey !== undefined ? [entityType, entityKey] : undefined,
    query: { enabled: entityKey !== undefined },
  });
}

/**
 * Read full metadata entry (currentCID, previousCID, updatedAt, version).
 * entityKey must be a 32-byte bytes32 value (use addressToBytes32 for addresses).
 */
export function useMetadataEntry(
  entityType: number,
  entityKey: `0x${string}` | undefined,
) {
  return useReadContract({
    address: ADDRESSES.METADATA_STORE,
    abi: MetadataStoreAbi,
    functionName: "getMetadata",
    args: entityKey !== undefined ? [entityType, entityKey] : undefined,
    query: { enabled: entityKey !== undefined },
  });
}

/**
 * Set metadata CID on-chain.
 * entityKey and cid must be 32-byte bytes32 values (use addressToBytes32 for addresses).
 */
export function useSetMetadata() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  const setMetadata = async (entityType: number, entityKey: `0x${string}`, cid: `0x${string}`) => {
    await writeContractAsync({
      address: ADDRESSES.METADATA_STORE,
      abi: MetadataStoreAbi,
      functionName: "setMetadata",
      args: [entityType, entityKey, cid],
    });
  };

  return { setMetadata, hash, isPending, receipt, error };
}
