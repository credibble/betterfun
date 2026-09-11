import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { MetadataStoreAbi, ADDRESSES } from "../contracts";

/** EntityType enum values for MetadataStore */
export const MetadataEntityType = {
  TRADER: 0,
  POT: 1,
} as const;

/**
 * Read the current CID for an entity from the MetadataStore contract.
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
 * Set metadata CID on-chain (requires ownership or authorization).
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
