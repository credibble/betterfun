// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {EpochController} from "../src/epoch/EpochController.sol";

contract EpochControllerTest is Test {
    EpochController public epoch;

    address governance = address(this);

    uint256 constant FUNDING_DURATION = 7 days;
    uint256 constant TRADING_DURATION = 7 days;
    uint256 constant EPOCH_BUFFER = 1 days;

    function setUp() public {
        epoch = new EpochController(FUNDING_DURATION, TRADING_DURATION, EPOCH_BUFFER);
    }

    function test_createEpoch_autoSchedule() public {
        uint256 epochId = epoch.createEpoch(0);
        assertEq(epochId, 0);

        EpochController.Epoch memory ep = epoch.getEpoch(0);
        assertEq(ep.number, 0);
        assertTrue(ep.status == EpochController.EpochStatus.Upcoming);
        assertEq(ep.startsAt, block.timestamp);
        assertEq(ep.tradingEndsAt, block.timestamp + FUNDING_DURATION);
        assertEq(ep.endsAt, block.timestamp + FUNDING_DURATION + TRADING_DURATION);
    }

    function test_createEpoch_manualSchedule() public {
        uint256 startsAt = block.timestamp + 1 days;
        uint256 epochId = epoch.createEpoch(startsAt);
        assertEq(epochId, 0);

        EpochController.Epoch memory ep = epoch.getEpoch(0);
        assertEq(ep.startsAt, startsAt);
    }

    function test_createEpoch_chained() public {
        epoch.createEpoch(0);
        uint256 firstEndsAt = epoch.getEpoch(0).endsAt;

        uint256 epochId2 = epoch.createEpoch(0);
        EpochController.Epoch memory ep2 = epoch.getEpoch(1);
        assertEq(ep2.startsAt, firstEndsAt + EPOCH_BUFFER);
    }

    function test_goLive() public {
        epoch.createEpoch(0);

        epoch.goLive(0);
        EpochController.Epoch memory ep = epoch.getEpoch(0);
        assertTrue(ep.status == EpochController.EpochStatus.Live);
    }

    function test_goLive_tooEarly_reverts() public {
        uint256 startsAt = block.timestamp + 1 days;
        epoch.createEpoch(startsAt);

        vm.expectRevert(EpochController.TooEarly.selector);
        epoch.goLive(0);
    }

    function test_goSettling() public {
        epoch.createEpoch(0);
        epoch.goLive(0);

        vm.warp(block.timestamp + FUNDING_DURATION);
        epoch.goSettling(0);

        EpochController.Epoch memory ep = epoch.getEpoch(0);
        assertTrue(ep.status == EpochController.EpochStatus.Settling);
    }

    function test_goSettled() public {
        epoch.createEpoch(0);
        epoch.goLive(0);
        vm.warp(block.timestamp + FUNDING_DURATION);
        epoch.goSettling(0);
        vm.warp(block.timestamp + TRADING_DURATION);
        epoch.goSettled(0);

        EpochController.Epoch memory ep = epoch.getEpoch(0);
        assertTrue(ep.status == EpochController.EpochStatus.Settled);
    }

    function test_addPot() public {
        epoch.createEpoch(0);
        epoch.addPot(0);

        EpochController.Epoch memory ep = epoch.getEpoch(0);
        assertEq(ep.potCount, 1);
    }

    function test_isFundingOpen() public {
        epoch.createEpoch(0);
        assertFalse(epoch.isFundingOpen(0));

        epoch.goLive(0);
        assertTrue(epoch.isFundingOpen(0));
    }

    function test_isTradingOpen() public {
        epoch.createEpoch(0);
        epoch.goLive(0);
        assertTrue(epoch.isTradingOpen(0));

        vm.warp(block.timestamp + FUNDING_DURATION);
        assertFalse(epoch.isTradingOpen(0));
    }

    function test_setParams() public {
        epoch.setParams(14 days, 14 days, 2 days);
        assertEq(epoch.fundingDuration(), 14 days);
        assertEq(epoch.tradingDuration(), 14 days);
        assertEq(epoch.epochBuffer(), 2 days);
    }

    function test_epochCount() public {
        assertEq(epoch.epochCount(), 0);
        epoch.createEpoch(0);
        assertEq(epoch.epochCount(), 1);
        epoch.createEpoch(0);
        assertEq(epoch.epochCount(), 2);
    }

    function test_createEpoch_forceSettlesPrevious() public {
        // Create epoch 0 and go live
        epoch.createEpoch(0);
        epoch.goLive(0);

        // Warp past trading end
        vm.warp(block.timestamp + FUNDING_DURATION + 1);

        // Create epoch 1 — should force-settle epoch 0
        epoch.createEpoch(0);

        EpochController.Epoch memory ep0 = epoch.getEpoch(0);
        assertTrue(ep0.status == EpochController.EpochStatus.Settling);

        EpochController.Epoch memory ep1 = epoch.getEpoch(1);
        assertTrue(ep1.status == EpochController.EpochStatus.Upcoming);
    }

    function test_createEpoch_doesNotForceSettle_beforeTradingEnd() public {
        // Create epoch 0 and go live
        epoch.createEpoch(0);
        epoch.goLive(0);

        // Warp only partway through trading (not past tradingEndsAt)
        vm.warp(block.timestamp + FUNDING_DURATION / 2);

        // Create epoch 1 — should NOT force-settle epoch 0
        epoch.createEpoch(0);

        EpochController.Epoch memory ep0 = epoch.getEpoch(0);
        assertTrue(ep0.status == EpochController.EpochStatus.Live);
    }

    function test_createEpoch_doesNotForceSettle_ifUpcoming() public {
        // Create epoch 0 but don't go live
        epoch.createEpoch(0);

        // Create epoch 1
        epoch.createEpoch(0);

        EpochController.Epoch memory ep0 = epoch.getEpoch(0);
        assertTrue(ep0.status == EpochController.EpochStatus.Upcoming);
    }
}
