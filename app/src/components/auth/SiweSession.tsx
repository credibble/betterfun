import { useEffect, useRef } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { useNonce, useVerify } from "@/lib/queries";

/**
 * Automatically performs SIWE login once a wallet is connected:
 * nonce → sign the statement → POST /auth/verify → store JWT pair.
 * Mount once at the root.
 */
export function SiweSession() {
  const { address, isConnected } = useAccount();
  const { data: nonceData } = useNonce(address ?? "");
  const { signMessageAsync } = useSignMessage();
  const verify = useVerify();
  const signing = useRef(false);
  // Only ever attempt login once per address+statement, even if renders churn.
  const attemptedKey = useRef<string | null>(null);

  useEffect(() => {
    if (!isConnected || !address) return;
    if (localStorage.getItem("access_token")) return;
    if (!nonceData?.statement || nonceData.statement.length === 0) return;

    const key = `${address}:${nonceData.statement}`;
    if (signing.current || attemptedKey.current === key) return;
    attemptedKey.current = key;
    signing.current = true;

    (async () => {
      try {
        const signature = await signMessageAsync({ message: nonceData.statement });
        await verify.mutateAsync({
          message: nonceData.statement,
          signature,
          address,
        });
      } catch (err) {
        // e.g. user rejected the signature — leave them connected but unsigned.
        console.warn("SIWE login failed", err);
      } finally {
        signing.current = false;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address, nonceData?.statement, signMessageAsync]);

  return null;
}