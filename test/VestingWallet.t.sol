// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/VestingWallet.sol";
import "./MockERC20.sol";

contract VestingWalletTest is Test {
    MockERC20 token;
    VestingWallet vesting;

    address beneficiary = address(0xBEEF);

    uint256 constant TOTAL = 1_000 ether;
    uint256 cliff;
    uint256 duration = 100 days;

    function setUp() public {
        token = new MockERC20();
        vesting = new VestingWallet(address(token));

        // On donne des tokens au owner (address(this))
        token.mint(address(this), TOTAL);
        token.approve(address(vesting), TOTAL);

        cliff = block.timestamp + 10 days;

        vesting.createVestingSchedule(
            beneficiary,
            TOTAL,
            cliff,
            duration
        );
    }

    function testVestingCreated() public {
        (
            address b,
            uint256 c,
            uint256 d,
            uint256 t,
            uint256 r
        ) = vesting.vestingSchedules(beneficiary);

        assertEq(b, beneficiary);
        assertEq(c, cliff);
        assertEq(d, duration);
        assertEq(t, TOTAL);
        assertEq(r, 0);
    }

    function testClaimBeforeCliffFails() public {
        vm.prank(beneficiary);
        vm.expectRevert("Nothing to claim");
        vesting.claimVestedTokens();
    }

    function testPartialClaimDuringVesting() public {
        vm.warp(cliff + 50 days);

        uint256 expected = (TOTAL * 50 days) / duration;

        vm.prank(beneficiary);
        vesting.claimVestedTokens();

        assertEq(token.balanceOf(beneficiary), expected);
    }

    function testFullClaimAfterVesting() public {
        vm.warp(cliff + duration + 1);

        vm.prank(beneficiary);
        vesting.claimVestedTokens();

        assertEq(token.balanceOf(beneficiary), TOTAL);
    }
}
