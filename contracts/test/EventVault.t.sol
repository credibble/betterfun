// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {EventVault} from "../src/vault/EventVault.sol";
import {ERC20} from "solmate/tokens/ERC20.sol";
import {IOutcomeNft} from "../src/interfaces/IOutcomeNft.sol";
import {ISettlement} from "../src/interfaces/ISettlement.sol";

contract EventVaultTest is Test {
    EventVault public vault;
    MockCollateral public usdc;
    MockPositions public nft;
    MockSettle public settle;

    address governance = address(this);
    address operator = makeAddr("operator");
    address lp = makeAddr("lp");
    address treasury = makeAddr("treasury");

    function setUp() public {
        usdc = new MockCollateral("USD Coin", "USDC", 6);
        nft = new MockPositions();
        settle = new MockSettle();

        vault = new EventVault(
            ERC20(address(usdc)),
            IOutcomeNft(address(nft)),
            ISettlement(address(settle)),
            50_000e6,
            treasury
        );
        vault.setOperator(operator);

        usdc.mint(lp, 10_000e6);
        vm.prank(lp);
        usdc.approve(address(vault), type(uint256).max);
    }

    function test_enter_mintsShares() public {
        vm.prank(lp);
        uint256 shares = vault.enter(1_000e6);
        // First deposit: shares = amount * scale = 1_000e6 * 1e12 = 1e21
        assertEq(shares, 1_000e6 * 1e12);
        assertEq(vault.balanceOf(lp), 1_000e6 * 1e12);
        assertEq(usdc.balanceOf(address(vault)), 1_000e6);
    }

    function test_enter_secondDeposit_proportional() public {
        vm.prank(lp);
        uint256 firstShares = vault.enter(1_000e6);

        address lp2 = makeAddr("lp2");
        usdc.mint(lp2, 5_000e6);
        vm.startPrank(lp2);
        usdc.approve(address(vault), type(uint256).max);
        uint256 secondShares = vault.enter(2_000e6);
        vm.stopPrank();

        // 2000e6 * 1e12 * firstShares / 1000e6 = 2 * firstShares
        assertEq(secondShares, firstShares * 2);
    }

    function test_exit_returnsCollateral() public {
        vm.prank(lp);
        uint256 shares = vault.enter(1_000e6);

        vm.prank(lp);
        uint256 out = vault.exit(shares);

        assertEq(out, 1_000e6);
        assertEq(usdc.balanceOf(lp), 10_000e6);
    }

    function test_nav_includesIdle() public {
        vm.prank(lp);
        vault.enter(5_000e6);
        assertEq(vault.nav(), 5_000e6);
    }

    function test_pricePerShare_emptyVault() public view {
        assertEq(vault.pricePerShare(), 1e18);
    }

    function test_redeem_splitsFees() public {
        settle.setPay(100e6);
        nft.setBalance(1, 50e6);

        vm.prank(operator);
        vault.redeem(1, 50e6);

        assertEq(vault.operatorFees(), 15e6);
        assertEq(vault.protocolFees(), 5e6);
    }

    function test_setHalted_blocksDeposits() public {
        vm.prank(governance);
        vault.setHalted(true);

        vm.prank(lp);
        vm.expectRevert(EventVault.VaultHalted.selector);
        vault.enter(100e6);
    }

    function test_setHalted_doesNotBlockExits() public {
        vm.prank(lp);
        uint256 shares = vault.enter(1_000e6);

        vm.prank(governance);
        vault.setHalted(true);

        vm.prank(lp);
        uint256 out = vault.exit(shares);
        assertEq(out, 1_000e6);
    }

    function test_onlyGovernance_functions() public {
        vm.prank(makeAddr("nobody"));
        vm.expectRevert(EventVault.OnlyGovernance.selector);
        vault.setHalted(true);

        vm.prank(makeAddr("nobody"));
        vm.expectRevert(EventVault.OnlyGovernance.selector);
        vault.setOperator(makeAddr("bad"));
    }
}

/* ──────────────────────────── Mocks ───────────────────────────────── */

contract MockCollateral {
    string public name;
    string public symbol;
    uint8 public decimals;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    constructor(string memory _name, string memory _symbol, uint8 _dec) {
        name = _name;
        symbol = _symbol;
        decimals = _dec;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract MockPositions {
    mapping(address => mapping(uint256 => uint256)) public balanceOf;

    function setBalance(uint256 tokenId, uint256 amount) external {
        balanceOf[msg.sender][tokenId] = amount;
    }

    function setOperator(address, bool) external returns (bool) {
        return true;
    }
}

contract MockSettle {
    uint256 public payAmount;

    function setPay(uint256 amount) external {
        payAmount = amount;
    }

    function redeem(uint256, uint256, address) external returns (uint256) {
        return payAmount;
    }

    function finalizeAndRedeem(address, uint256, uint256, address) external returns (uint256) {
        return payAmount;
    }
}
