// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {MetadataStore} from "../src/metadata/MetadataStore.sol";

contract MetadataStoreTest is Test {
    MetadataStore public store;

    address owner = address(this);

    function setUp() public {
        store = new MetadataStore(owner);
    }

    function test_setMetadata() public {
        bytes32 key = keccak256("trader1");
        bytes32 cid = keccak256("QmTestCID");

        store.setMetadata(MetadataStore.EntityType.Trader, key, cid);

        MetadataStore.MetadataEntry memory entry = store.getMetadata(MetadataStore.EntityType.Trader, key);
        assertEq(entry.currentCID, cid);
        assertEq(entry.version, 1);
    }

    function test_setMetadata_versioning() public {
        bytes32 key = keccak256("trader1");
        bytes32 cid1 = keccak256("QmCID1");
        bytes32 cid2 = keccak256("QmCID2");

        store.setMetadata(MetadataStore.EntityType.Trader, key, cid1);
        store.setMetadata(MetadataStore.EntityType.Trader, key, cid2);

        MetadataStore.MetadataEntry memory entry = store.getMetadata(MetadataStore.EntityType.Trader, key);
        assertEq(entry.currentCID, cid2);
        assertEq(entry.previousCID, cid1);
        assertEq(entry.version, 2);
    }

    function test_getCurrentCID() public {
        bytes32 key = keccak256("trader1");
        bytes32 cid = keccak256("QmTestCID");

        store.setMetadata(MetadataStore.EntityType.Trader, key, cid);
        assertEq(store.getCurrentCID(MetadataStore.EntityType.Trader, key), cid);
    }

    function test_getPreviousCID() public {
        bytes32 key = keccak256("trader1");
        bytes32 cid1 = keccak256("QmCID1");
        bytes32 cid2 = keccak256("QmCID2");

        store.setMetadata(MetadataStore.EntityType.Trader, key, cid1);
        store.setMetadata(MetadataStore.EntityType.Trader, key, cid2);

        assertEq(store.getPreviousCID(MetadataStore.EntityType.Trader, key), cid1);
    }

    function test_getHistory() public {
        bytes32 key = keccak256("trader1");
        bytes32 cid1 = keccak256("QmCID1");
        bytes32 cid2 = keccak256("QmCID2");
        bytes32 cid3 = keccak256("QmCID3");

        store.setMetadata(MetadataStore.EntityType.Trader, key, cid1);
        store.setMetadata(MetadataStore.EntityType.Trader, key, cid2);
        store.setMetadata(MetadataStore.EntityType.Trader, key, cid3);

        bytes32[] memory history = store.getHistory(MetadataStore.EntityType.Trader, key);
        assertEq(history.length, 3);
        assertEq(history[0], cid1);
        assertEq(history[1], cid2);
        assertEq(history[2], cid3);
    }

    function test_differentEntityTypes() public {
        bytes32 traderKey = keccak256("trader1");
        bytes32 potKey = keccak256("pot1");
        bytes32 cid = keccak256("QmCID");

        store.setMetadata(MetadataStore.EntityType.Trader, traderKey, cid);
        store.setMetadata(MetadataStore.EntityType.Pot, potKey, cid);

        assertEq(store.getCurrentCID(MetadataStore.EntityType.Trader, traderKey), cid);
        assertEq(store.getCurrentCID(MetadataStore.EntityType.Pot, potKey), cid);
    }

    function test_zeroCID_reverts() public {
        vm.expectRevert(MetadataStore.ZeroCID.selector);
        store.setMetadata(MetadataStore.EntityType.Trader, keccak256("key"), bytes32(0));
    }
}
