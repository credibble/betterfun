// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {TraderRegistry} from "../src/registry/TraderRegistry.sol";

contract TraderRegistryTest is Test {
    TraderRegistry public registry;

    address owner = address(this);
    address trader1 = makeAddr("trader1");
    address trader2 = makeAddr("trader2");

    string constant JSON = '{"name":"Nova","handle":"nova","bio":"trader"}';

    function setUp() public {
        registry = new TraderRegistry(owner);
    }

    function test_registerTrader() public {
        vm.prank(trader1);
        registry.registerTrader(JSON, trader1, TraderRegistry.TraderType.Human);

        TraderRegistry.TraderProfile memory profile = registry.getTrader(trader1);
        assertEq(profile.metadata, JSON);
        assertEq(profile.payoutAddress, trader1);
        assertTrue(profile.traderType == TraderRegistry.TraderType.Human);
        assertTrue(profile.active);
        assertEq(registry.traderCount(), 1);
    }

    function test_registerTrader_cannotDoubleRegister() public {
        vm.prank(trader1);
        registry.registerTrader(JSON, trader1, TraderRegistry.TraderType.Human);

        vm.prank(trader1);
        vm.expectRevert(TraderRegistry.AlreadyRegistered.selector);
        registry.registerTrader(JSON, trader1, TraderRegistry.TraderType.Human);
    }

    function test_updateMetadata() public {
        vm.prank(trader1);
        registry.registerTrader(JSON, trader1, TraderRegistry.TraderType.Human);

        string memory newJson = '{"name":"Updated","handle":"nova2"}';
        vm.prank(trader1);
        registry.updateMetadata(newJson);

        assertEq(registry.getTrader(trader1).metadata, newJson);
    }

    function test_setVerified() public {
        vm.prank(trader1);
        registry.registerTrader(JSON, trader1, TraderRegistry.TraderType.Human);

        registry.setVerified(trader1, true);
        assertTrue(registry.getTrader(trader1).verified);
    }

    function test_deactivate() public {
        vm.prank(trader1);
        registry.registerTrader(JSON, trader1, TraderRegistry.TraderType.Human);

        registry.deactivate(trader1);
        assertFalse(registry.getTrader(trader1).active);
    }

    function test_incrementPotCount() public {
        vm.prank(trader1);
        registry.registerTrader(JSON, trader1, TraderRegistry.TraderType.Human);

        registry.incrementPotCount(trader1);
        registry.incrementPotCount(trader1);
        assertEq(registry.getTrader(trader1).potCount, 2);
    }

    function test_getAllTraders() public {
        vm.prank(trader1);
        registry.registerTrader(JSON, trader1, TraderRegistry.TraderType.Human);

        vm.prank(trader2);
        registry.registerTrader(JSON, trader2, TraderRegistry.TraderType.AI);

        address[] memory traders = registry.getAllTraders();
        assertEq(traders.length, 2);
        assertEq(traders[0], trader1);
        assertEq(traders[1], trader2);
    }
}