// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/VestingWallet.sol";
import "../test/MockERC20.sol";

contract DeployVestingWallet is Script {
    function run() external {
        vm.startBroadcast();

        // Déploiement d’un token ERC20 de test
        MockERC20 token = new MockERC20();

        // Déploiement du VestingWallet avec l’adresse du token
        VestingWallet vesting = new VestingWallet(address(token));

        vm.stopBroadcast();
    }
}
