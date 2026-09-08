import { readFileSync } from 'fs';
const d = JSON.parse(readFileSync('out/VaultFactory.sol/VaultFactory.json', 'utf8'));
console.log(d.bytecode);
