// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "../lib/forge-std/src/Script.sol";
import "../src/optipair.sol";
import "../src/MockUSDC.sol";

contract Config is Script {
    struct NetworkConfig {
        address ftsoAddress;
        address usdcAddress;
    }

    address public constant FTSO_ADDRESS = 0xC4e9c78EA53db782E28f28Fdf80BaF59336B304d;

    function run() external returns (address, address) {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");

        // Start broadcasting with the private key
        vm.startBroadcast(privateKey);

        // Deploy Mock USDC Token
        MockUSDC usdc = new MockUSDC();

        // Stop broadcasting
        vm.stopBroadcast();
        // Set Ftso contract address (real or mock on-chain)

        console.log("MockUSDC deployed at:", address(usdc));

        return (FTSO_ADDRESS, address(usdc));
    }
}
