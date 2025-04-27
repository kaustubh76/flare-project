// Script to check option payout details
import { ethers } from "ethers";

// Contract addresses
const OPTION_AMM_ADDRESS = "0x8889F62d45A1bcECf23b848f6783258eF82D0138";

// ABI fragments for the functions we need
const OPTION_AMM_ABI = [
  "function options(uint256) view returns (uint256, uint256, uint256, uint256, uint256, bool, address)",
  "function optionOwnership(uint256, address) view returns (uint256)",
  "function totalLiquidity() view returns (uint256)",
  "function getLatestPrice() payable returns (int256)",
];

// Your wallet address
const WALLET_ADDRESS = "0xb862825240fC768515A26D09FAeB9Ab3236Df09e"; // Replace with your actual address
const OPTION_ID = 0; // The ID of your option

async function checkPayout() {
  console.log("Starting option payout calculation check...");

  // Connect to the Flare network
  const provider = new ethers.providers.JsonRpcProvider(
    "https://coston2-api.flare.network/ext/C/rpc"
  );
  console.log("Connected to Flare Coston2 network");

  try {
    // Create contract instance
    const optionAMMContract = new ethers.Contract(
      OPTION_AMM_ADDRESS,
      OPTION_AMM_ABI,
      provider
    );

    // Get option details
    console.log(`Fetching data for Option ID: ${OPTION_ID}`);
    const option = await optionAMMContract.options(OPTION_ID);
    const strikePrice = option[0];
    const lotSize = option[1];
    const premium = option[2];
    const k = option[3];
    const expiry = option[4];
    const isCall = option[5];
    const creator = option[6];

    // Get your ownership amount
    const lotCount = await optionAMMContract.optionOwnership(
      OPTION_ID,
      WALLET_ADDRESS
    );

    // Get total liquidity
    const totalLiquidity = await optionAMMContract.totalLiquidity();

    // For simulation purposes, let's use the price from the UI
    // Actual price would come from getLatestPrice() but that's a payable function
    const latestPrice = ethers.utils.parseUnits("1806.25", 18); // Using the price from the UI

    console.log("\n--- Option Details ---");
    console.log(
      `Strike Price: ${ethers.utils.formatUnits(strikePrice, 18)} USD`
    );
    console.log(
      `Lot Size in contract: ${ethers.utils.formatUnits(lotSize, 18)}`
    );
    console.log(`Premium: ${ethers.utils.formatUnits(premium, 18)}`);
    console.log(`K constant: ${ethers.utils.formatUnits(k, 36)}`);
    console.log(
      `Expiry: ${new Date(expiry.toNumber() * 1000).toLocaleString()}`
    );
    console.log(`Is Call Option: ${isCall}`);
    console.log(`Creator: ${creator}`);

    console.log("\n--- Your Position ---");
    console.log(`Your Lot Count: ${ethers.utils.formatUnits(lotCount, 18)}`);
    console.log(`Raw Lot Count (wei): ${lotCount.toString()}`);

    console.log("\n--- Contract State ---");
    console.log(
      `Total Liquidity: ${ethers.utils.formatUnits(totalLiquidity, 6)} USDC`
    );
    console.log(`Raw Total Liquidity (wei): ${totalLiquidity.toString()}`);
    console.log(
      `Current ETH Price: ${ethers.utils.formatUnits(latestPrice, 18)} USD`
    );

    // Calculate expected payout using the same formula as the contract
    console.log("\n--- Payout Calculation ---");
    let payout = ethers.BigNumber.from(0);
    if (isCall) {
      if (latestPrice.mul(ethers.BigNumber.from(10).pow(15)).gt(strikePrice)) {
        const priceDifference = latestPrice
          .mul(ethers.BigNumber.from(10).pow(15))
          .sub(strikePrice);
        payout = priceDifference
          .mul(lotCount)
          .div(ethers.BigNumber.from(10).pow(12));
        console.log(
          `Price difference: ${ethers.utils.formatUnits(priceDifference, 0)}`
        );
      }
    } else {
      if (latestPrice.mul(ethers.BigNumber.from(10).pow(15)).lt(strikePrice)) {
        const priceDifference = strikePrice.sub(
          latestPrice.mul(ethers.BigNumber.from(10).pow(15))
        );
        payout = priceDifference
          .mul(lotCount)
          .div(ethers.BigNumber.from(10).pow(12));
        console.log(
          `Price difference: ${ethers.utils.formatUnits(priceDifference, 0)}`
        );
      }
    }

    console.log(
      `Calculated Payout: ${ethers.utils.formatUnits(payout, 6)} USDC`
    );
    console.log(`Raw Payout (wei): ${payout.toString()}`);
    console.log(
      `Sufficient Liquidity: ${totalLiquidity.gte(payout) ? "Yes" : "No"}`
    );

    if (!totalLiquidity.gte(payout)) {
      console.log(`\n--- Liquidity Shortfall ---`);
      console.log(
        `Additional USDC needed: ${ethers.utils.formatUnits(
          payout.sub(totalLiquidity),
          6
        )} USDC`
      );
    }

    console.log("\n--- Details from Contract Logic ---");
    console.log("From contract code in optipair.sol:");
    console.log(
      "1. Latest price * 1e15:",
      latestPrice.mul(ethers.BigNumber.from(10).pow(15)).toString()
    );
    console.log("2. Strike price:", strikePrice.toString());
    console.log("3. Lot count raw value:", lotCount.toString());
    console.log("4. Computed payout = (price_diff * lotCount) / 1e12");
    console.log("5. Total liquidity needed =", payout.toString());
  } catch (error) {
    console.error("Error during calculation:", error);
  }
}

// Run the check
checkPayout().catch(console.error);
