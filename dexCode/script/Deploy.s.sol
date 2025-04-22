// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../lib/forge-std/src/Script.sol";
import "../src/optipair.sol";
import "../src/MockUSDC.sol";

contract DeployOptionAMM is Script {
    function run() external {
        // Load private key from environment
        uint256 privateKey = vm.envUint("PRIVATE_KEY");

        // Start broadcasting with the private key
        vm.startBroadcast(privateKey);

        // Deploy Mock USDC Token
        MockUSDC usdc = new MockUSDC();

        // Set Ftso contract address (real or mock on-chain)
        address ftsoAddress = 0x7BDE3Df0624114eDB3A67dFe6753e62f4e7c1d20;

        // Deploy OptionAMM contract
        OptionAMM amm = new OptionAMM(address(usdc), ftsoAddress);

        // Log addresses
        console.log("MockUSDC deployed at:", address(usdc));
        console.log("OptionAMM deployed at:", address(amm));

        // Stop broadcasting
        vm.stopBroadcast();
    }
}
