// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "../lib/forge-std/src/Script.sol";
import "../src/optipair.sol";
import "../src/MockUSDC.sol";
import "./Config.s.sol";

contract DeployOptionAMM is Script {
    struct NetworkConfig {
        address ftsoAddress;
        address usdcAddress;
    }

    NetworkConfig public config;
    Config public configContract = new Config();

    function run() external {
        // Load private key from environment
        uint256 privateKey = vm.envUint("PRIVATE_KEY");

        (config.ftsoAddress, config.usdcAddress) = configContract.run();
        
        // Start broadcasting with the private key
        vm.startBroadcast(privateKey);
        // Deploy OptionAMM contract
        OptionAMM amm = new OptionAMM(config.usdcAddress, config.ftsoAddress);

        // Stop broadcasting
        vm.stopBroadcast();


        // Log addresses
        console.log("OptionAMM deployed at:", address(amm));

    }
}
