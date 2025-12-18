// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract VestingWallet is Ownable, ReentrancyGuard {
    struct VestingSchedule {
        address beneficiary;
        uint256 cliff;
        uint256 duration;
        uint256 totalAmount;
        uint256 releasedAmount;
    }

    IERC20 public immutable token;
    mapping(address => VestingSchedule) public vestingSchedules;

    constructor(address tokenAddress) Ownable(msg.sender) {
        require(tokenAddress != address(0), "Invalid token");
        token = IERC20(tokenAddress);
    }

    function createVestingSchedule(
        address _beneficiary,
        uint256 _totalAmount,
        uint256 _cliff,
        uint256 _duration
    ) external onlyOwner {
        require(_beneficiary != address(0), "Invalid beneficiary");
        require(_totalAmount > 0, "Amount = 0");
        require(_duration > 0, "Duration = 0");
        require(vestingSchedules[_beneficiary].totalAmount == 0, "Vesting exists");

        require(
            token.transferFrom(msg.sender, address(this), _totalAmount),
            "Token transfer failed"
        );

        vestingSchedules[_beneficiary] = VestingSchedule({
            beneficiary: _beneficiary,
            cliff: _cliff,
            duration: _duration,
            totalAmount: _totalAmount,
            releasedAmount: 0
        });
    }

    function claimVestedTokens() external nonReentrant {
        VestingSchedule storage schedule = vestingSchedules[msg.sender];
        require(schedule.totalAmount > 0, "No vesting");

        uint256 vested = getVestedAmount(msg.sender);
        uint256 claimable = vested - schedule.releasedAmount;
        require(claimable > 0, "Nothing to claim");

        schedule.releasedAmount += claimable;
        require(token.transfer(msg.sender, claimable), "Transfer failed");
    }

    function getVestedAmount(address _beneficiary) public view returns (uint256) {
        VestingSchedule memory schedule = vestingSchedules[_beneficiary];
        if (schedule.totalAmount == 0) return 0;

        if (block.timestamp < schedule.cliff) return 0;

        uint256 elapsed = block.timestamp - schedule.cliff;
        if (elapsed >= schedule.duration) return schedule.totalAmount;

        return (schedule.totalAmount * elapsed) / schedule.duration;
    }
}
