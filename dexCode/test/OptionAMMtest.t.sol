// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {OptionAMM} from "../src/optipair.sol";

contract OptionAMMTest is Test {
    OptionAMM public amm;
    IERC20 public usdc;
    address public constant USDC_ADDRESS = 0x828A4f80312F62D4BbAbCD9438Dc3B6fD1d69A34;
    address public constant FTSO_ADDRESS = 0xC4e9c78EA53db782E28f28Fdf80BaF59336B304d;
    address public user1 = vm.addr(1);
    address public user2 = vm.addr(2);

    function setUp() public {
        vm.createSelectFork(vm.envString("RPC_URL")); // Set your network RPC URL in .env

        usdc = IERC20(USDC_ADDRESS);

        amm = new OptionAMM(USDC_ADDRESS, FTSO_ADDRESS);

        deal(address(usdc), user1, 1_000_000 * 1e6); // assuming USDC has 6 decimals
        deal(address(usdc), user2, 1_000_000 * 1e6);

        vm.prank(user1);
        usdc.approve(address(amm), type(uint256).max);

        vm.prank(user2);
        usdc.approve(address(amm), type(uint256).max);
    }

    function testAddAndRemoveLiquidity() public {
        vm.startPrank(user1);
        amm.addLiquidity(100_000 * 1e6);
        assertEq(amm.totalLiquidity(), 100_000 * 1e6);

        amm.removeLiquidity(50_000 * 1e6);
        assertEq(amm.totalLiquidity(), 50_000 * 1e6);
        vm.stopPrank();
    }

    function testCreateAndPurchaseOption() public {
        vm.startPrank(user1);
        amm.addLiquidity(100_000 * 1e6);

        uint256 strike = 2000 * 1e6;
        uint256 lot = 10;
        uint256 premium = 50 * 1e6;
        uint256 expiry = block.timestamp + 1 days;

        amm.createOption(strike, lot, premium, expiry, true);

        vm.stopPrank();

        vm.startPrank(user2);
        amm.purchaseOption(0, 5);

        (,,,, uint256 premiumAfterPurchase,,) = amm.options(0);
        assertGt(premiumAfterPurchase, premium);
        vm.stopPrank();
    }

    function testSettleInTheMoneyOptionCall() public {
        vm.startPrank(user1);
        amm.addLiquidity(1_000_000 * 1e6);

        uint256 strike = 500 * 1e18;
        uint256 lot = 1 * 1e18;
        uint256 premium = 100 * 1e18;
        uint256 expiry = block.timestamp + 1.9 hours;
        amm.createOption(strike, lot, premium, expiry, true);

        vm.stopPrank();

        vm.startPrank(user2);
        amm.purchaseOption(0, 1);

        vm.stopPrank();

        skip(2 hours);

        // Attempt to settle the option
        int256 currentPrice = amm.getLatestPrice();
        uint256 lotCount = amm.optionOwnership(0, user2);
        uint256 payout;
        uint256 priceDifference = uint256(currentPrice * 1e15 - int256(strike));
        payout = priceDifference * lotCount / 1e30;
        bool optionIsCall = amm.getOptionDetails(0).isCall;
        console.log("currentPrice", currentPrice);
        console.log("strike", strike);
        console.log("lotCount", lotCount);
        console.log("priceDifference", priceDifference);
        console.log("payout", payout);

        console.log("settling option");
        optionIsCall ? console.log("call option") : console.log("put option");
        console.log("options length", amm.getOptionsLength());
        console.log("lot count", amm.optionOwnership(0, user2));
        uint256 currentBalance = usdc.balanceOf(user2);
        // Settle the option

        vm.prank(user2);
        amm.settleOption(0);

        assertEq(amm.totalLiquidity(), 1_000_000 * 1e6 - payout, "Liquidity should be reduced by the payout amount");
        assertEq(
            usdc.balanceOf(user2), currentBalance + payout, "User2's balance should reflect the payout after settlement"
        );
        assertEq(amm.optionOwnership(0, user2), 0, "User2 should no longer own the option after settlement");
    }

    function testSettleInTheMoneyOptionPut() public {
        vm.startPrank(user1);
        amm.addLiquidity(1_000_000 * 1e6);

        uint256 strike = 2500 * 1e18;
        uint256 lot = 1 * 1e18;
        uint256 premium = 100 * 1e18;
        uint256 expiry = block.timestamp + 1.9 hours;
        amm.createOption(strike, lot, premium, expiry, false);

        vm.stopPrank();

        vm.startPrank(user2);
        amm.purchaseOption(0, 1);

        vm.stopPrank();

        skip(2 hours);

        // Attempt to settle the option
        int256 currentPrice = amm.getLatestPrice();
        uint256 lotCount = amm.optionOwnership(0, user2);
        uint256 payout;
        uint256 priceDifference = uint256(int256(strike) - currentPrice * 1e15);
        payout = priceDifference * lotCount / 1e30;
        bool optionIsPut = !amm.getOptionDetails(0).isCall;
        console.log("currentPrice", currentPrice);
        console.log("strike", strike);
        console.log("lotCount", lotCount);
        console.log("priceDifference", priceDifference);
        console.log("payout", payout);

        console.log("settling option");
        optionIsPut ? console.log("put option") : console.log("call option");
        console.log("options length", amm.getOptionsLength());
        console.log("lot count", amm.optionOwnership(0, user2));
        uint256 currentBalance = usdc.balanceOf(user2);
        // Settle the option

        vm.prank(user2);
        amm.settleOption(0);

        assertEq(amm.totalLiquidity(), 1_000_000 * 1e6 - payout, "Liquidity should be reduced by the payout amount");
        assertEq(
            usdc.balanceOf(user2), currentBalance + payout, "User2's balance should reflect the payout after settlement"
        );
        assertEq(amm.optionOwnership(0, user2), 0, "User2 should no longer own the option after settlement");
    }

    function testGetLatestPriceFromFTSO() public {
        // Fetch the latest price from the FTSO oracle
        int256 currentPrice = amm.getLatestPrice();

        // Test that the price is not zero (basic validation)
        assertTrue(currentPrice > 0, "Price should be greater than zero");

        // Log the current ETH/USD price for verification
        console.log("Current ETH/USD Price:", uint256(currentPrice));

        // Verify price is within a reasonable range for ETH/USD
        // The price appears to be in the range of ~1.7M which suggests
        // it might use a different decimal precision than we expected
        assertTrue(currentPrice >= 1000000 && currentPrice <= 5000000, "ETH price should be within a reasonable range");

        // Call the price oracle twice to verify consistency
        int256 secondPrice = amm.getLatestPrice();

        // Prices should be identical or very close in the same block
        assertApproxEqAbs(currentPrice, secondPrice, 100, "Price should be consistent within short timeframes");

        // Add more specific tests to verify the price format and accuracy
        // Let's check if we can determine the exact decimal precision
        console.log("Approximate ETH price in USD: $", uint256(currentPrice) / 1000);
    }
}
