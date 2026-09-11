// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {PlatformGovernance} from "../src/governance/PlatformGovernance.sol";

contract PlatformGovernanceTest is Test {
    PlatformGovernance public gov;

    address governance = address(this);
    address treasury = makeAddr("treasury");

    function setUp() public {
        gov = new PlatformGovernance(treasury, 50_000e6, 10e6, 5);
    }

    function test_initialConfig() public {
        PlatformGovernance.PlatformConfig memory config = gov.getConfig();
        assertEq(config.lpShare, 80);
        assertEq(config.traderShare, 15);
        assertEq(config.protocolShare, 5);
        assertEq(config.protocolTreasury, treasury);
        assertEq(config.maxExposureDefault, 50_000e6);
        assertEq(config.minDeposit, 10e6);
        assertEq(config.maxPotsPerTrader, 5);
        assertFalse(config.paused);
    }

    function test_setFeeSplit() public {
        gov.setFeeSplit(75, 20, 5);
        PlatformGovernance.PlatformConfig memory config = gov.getConfig();
        assertEq(config.lpShare, 75);
        assertEq(config.traderShare, 20);
        assertEq(config.protocolShare, 5);
    }

    function test_setFeeSplit_invalidSum_reverts() public {
        vm.expectRevert(PlatformGovernance.InvalidFeeSplit.selector);
        gov.setFeeSplit(80, 15, 6); // sums to 101
    }

    function test_setTreasury() public {
        address newTreasury = makeAddr("newTreasury");
        gov.setTreasury(newTreasury);
        assertEq(gov.getConfig().protocolTreasury, newTreasury);
    }

    function test_setMaxExposure() public {
        gov.setMaxExposure(100_000e6);
        assertEq(gov.getConfig().maxExposureDefault, 100_000e6);
    }

    function test_setMinDeposit() public {
        gov.setMinDeposit(50e6);
        assertEq(gov.getConfig().minDeposit, 50e6);
    }

    function test_setPaused() public {
        gov.setPaused(true);
        assertTrue(gov.getConfig().paused);

        gov.setPaused(false);
        assertFalse(gov.getConfig().paused);
    }

    function test_isDepositValid() public {
        assertTrue(gov.isDepositValid(100e6));
        assertTrue(gov.isDepositValid(10e6));
        assertFalse(gov.isDepositValid(9e6));
    }

    function test_setOperator() public {
        address op = makeAddr("op");
        gov.setOperator(op, true);
        assertTrue(gov.isOperator(op));

        gov.setOperator(op, false);
        assertFalse(gov.isOperator(op));
    }

    function test_onlyGov_canSetParams() public {
        vm.prank(makeAddr("nobody"));
        vm.expectRevert(PlatformGovernance.OnlyGovernance.selector);
        gov.setFeeSplit(75, 20, 5);
    }
}
