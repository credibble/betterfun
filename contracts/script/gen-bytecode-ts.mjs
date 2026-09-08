import { readFileSync, writeFileSync } from 'fs';
const d = JSON.parse(readFileSync('C:/Users/devar/Documents/betterfun/contracts/out/VaultFactory.sol/VaultFactory.json', 'utf8'));
const bc = d.bytecode.object;
const content = `export const VAULT_FACTORY_BYTECODE = "${bc}" as const;\n`;
writeFileSync('C:/Users/devar/Documents/betterfun/backend/src/modules/vault/vault-factory-bytecode.ts', content);
console.log(`Wrote ${bc.length} chars`);
