// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {EventVault} from "../src/vault/EventVault.sol";
import {VaultFactory} from "../src/factory/VaultFactory.sol";
import {ERC20} from "solmate/tokens/ERC20.sol";
import {IOutcomeNft} from "../src/interfaces/IOutcomeNft.sol";
import {ISettlement} from "../src/interfaces/ISettlement.sol";

/// @notice Deploy VaultFactory + first EventVault to Somnia Shannon testnet.
///
///  Addresses below are from the Somnia testnet DreamDEX deployment:
///   - tUSDC (collateral): 0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E
///   - Outcome token (ERC-6909): found at runtime via pool.params().outcomeNft
///   - Settlement singleton: 0xbF4a49e0Dfd092e5FBE8E5761064C49533e6Ed23
///
///  Run: forge script script/Deploy.s.sol --rpc-url somnia --broadcast --verify
contract DeployScript is Script {
    // ─── Somnia Shannon testnet addresses ───
    address constant TUSDC       = 0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E;
    address constant SETTLEMENT  = 0xbF4a49e0Dfd092e5FBE8E5761064C49533e6Ed23;

    // Queried from live pool 0x230f5ce9bf56e20a891847c3d4e597f2623b7bc6
    address constant OUTCOME_NFT = 0xf902f58d5C79165DeBEc60Af88e0d2e925979099;

    function run() public {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        console.log("Deployer:", deployer);
        console.log("Collateral (tUSDC):", TUSDC);
        console.log("Outcome NFT:", OUTCOME_NFT);
        console.log("Settlement:", SETTLEMENT);

        // 1) Deploy factory
        VaultFactory factory = new VaultFactory(
            ERC20(TUSDC),
            IOutcomeNft(OUTCOME_NFT),
            ISettlement(SETTLEMENT),
            deployer   // treasury = deployer for testnet
        );
        console.log("VaultFactory:", address(factory));

        // 2) Deploy the first vault for the deployer (demo trader)
        //    Exposure cap: 100,000 tUSDC
        address vault = factory.deploy(deployer, 100_000e6);
        console.log("First vault:", vault);

        vm.stopBroadcast();
    }
}
