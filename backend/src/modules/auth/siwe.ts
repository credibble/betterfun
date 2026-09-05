import { verifyMessage, type Hex } from "viem";

interface SiweParsed {
  address: string;
  chainId: number;
  nonce: string;
  domain: string;
  uri: string;
  version: string;
  issuedAt: string;
  expirationTime?: string;
  statement?: string;
}

/**
 * Verify an EIP-4361 SIWE signature and return the recovered address.
 */
export async function verifySiweSignature(
  messageStr: string,
  signature: Hex,
): Promise<{ address: string; chainId: number; nonce: string } | null> {
  try {
    const parsed = JSON.parse(messageStr) as SiweParsed;
    if (!parsed.address || !parsed.chainId || !parsed.nonce || !parsed.domain) {
      return null;
    }

    // viem's verifyMessage returns boolean — signature is valid for the given address
    const valid = await verifyMessage({
      address: parsed.address as `0x${string}`,
      message: messageStr,
      signature,
    });

    if (!valid) return null;

    return { address: parsed.address.toLowerCase(), chainId: parsed.chainId, nonce: parsed.nonce };
  } catch {
    return null;
  }
}

/**
 * Build a SIWE message for the client to sign.
 */
export function buildSiweMessage(params: {
  address: string;
  nonce: string;
  chainId: number;
}): string {
  const now = new Date();
  const msg = {
    domain: "betterfun.app",
    address: params.address,
    statement: "Sign in to BetterFun",
    uri: "https://betterfun.app",
    version: "1",
    chainId: params.chainId,
    nonce: params.nonce,
    issuedAt: now.toISOString(),
    expirationTime: new Date(now.getTime() + 1000 * 60 * 5).toISOString(),
  };
  return JSON.stringify(msg);
}
