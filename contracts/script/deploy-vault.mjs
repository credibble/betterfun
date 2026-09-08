// Deploy VaultFactory + first EventVault to Somnia Shannon testnet.
// Run: PRIVATE_KEY=0x... node contracts/script/deploy-vault.mjs
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error("Set PRIVATE_KEY env var");
  process.exit(1);
}

const somniaTestnet = {
  id: 50312,
  name: "Somnia Testnet",
  nativeCurrency: { name: "SOMNIA", symbol: "SOMNIA", decimals: 18 },
  rpcUrls: { default: { http: ["https://dream-rpc.somnia.network"] } },
};

// DreamDEX addresses
const TUSDC = "0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E";
const OUTCOME_NFT = "0xf902f58d5C79165DeBEc60Af88e0d2e925979099";
const SETTLEMENT = "0xbF4a49e0Dfd092e5FBE8E5761064C49533e6Ed23";

// Load compiled bytecode
const factoryJson = JSON.parse(readFileSync(resolve(__dirname, "../out/VaultFactory.sol/VaultFactory.json"), "utf8"));
const factoryBytecode = factoryJson.bytecode.object.startsWith("0x") ? factoryJson.bytecode.object : ("0x" + factoryJson.bytecode.object);

async function main() {
  const account = privateKeyToAccount(PRIVATE_KEY);
  console.log("Deployer:", account.address);

  const publicClient = createPublicClient({
    chain: somniaTestnet,
    transport: http("https://dream-rpc.somnia.network"),
  });

  const client = createWalletClient({
    account,
    chain: somniaTestnet,
    transport: http("https://dream-rpc.somnia.network"),
  });

  const balance = await publicClient.getBalance({ address: account.address });
  console.log("Balance:", balance.toString(), "wei");

  // 1) Deploy VaultFactory (treasury = deployer address)
  console.log("\nDeploying VaultFactory...");
  const factoryHash = await client.deployContract({
    abi: factoryJson.abi,
    bytecode: factoryBytecode,
    args: [TUSDC, OUTCOME_NFT, SETTLEMENT, account.address],
  });
  console.log("Factory deploy tx:", factoryHash);

  const factoryReceipt = await publicClient.waitForTransactionReceipt({ hash: factoryHash });
  console.log("Factory deployed at:", factoryReceipt.contractAddress);
  const factoryAddress = factoryReceipt.contractAddress;

  // 2) Deploy first EventVault via factory
  console.log("\nDeploying first EventVault via factory...");
  const vaultHash = await client.writeContract({
    address: factoryAddress,
    abi: factoryJson.abi,
    functionName: "deploy",
    args: [
      account.address,  // operator
      100_000_000_000,  // 100,000 tUSDC exposure cap (6 decimals)
    ],
  });
  console.log("Vault deploy tx:", vaultHash);

  await publicClient.waitForTransactionReceipt({ hash: vaultHash });
  console.log("Vault tx confirmed");

  // Read vault address from factory
  const count = await publicClient.readContract({
    address: factoryAddress,
    abi: factoryJson.abi,
    functionName: "vaultCount",
  });
  const [vaultAddr] = await publicClient.readContract({
    address: factoryAddress,
    abi: factoryJson.abi,
    functionName: "vaults",
    args: [count - 1n],
  });
  console.log("Vault deployed at:", vaultAddr);

  // Verify governance was transferred (use inline ABI — factory ABI doesn't have governance())
  const vaultAbi = [{type:'function',name:'governance',inputs:[],outputs:[{name:'',type:'address'}],stateMutability:'view'}];
  const gov = await publicClient.readContract({
    address: vaultAddr,
    abi: vaultAbi,
    functionName: "governance",
  });
  console.log("Vault governance:", gov, gov === account.address ? "(correct)" : "(MISMATCH)");

  console.log("\n=== DEPLOYMENT SUMMARY ===");
  console.log("VaultFactory:", factoryAddress);
  console.log("First Vault:", vaultAddr);
  console.log("Governance:", account.address);
  console.log("Operator:", account.address);
  console.log("\nBackend .env:");
  console.log("  VAULT_FACTORY_ADDRESS=" + factoryAddress);
  console.log("  VAULT_ADDRESS=" + vaultAddr);
  console.log("\nFrontend .env:");
  console.log("  VITE_VAULT_ADDRESS=" + vaultAddr);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
