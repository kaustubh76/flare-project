// Script to check option cost calculation and USDC balance
const { ethers } = require("ethers");

// ABI fragments for our contracts
const OPTION_AMM_ABI = [
  "function options(uint256) external view returns (uint256, uint256, uint256, uint256, uint256, bool, address)",
  "function usdc() external view returns (address)",
];

const USDC_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
];

// Contract addresses - updated to the latest deployed contracts
const OPTION_AMM_ADDRESS = "0x8889F62d45A1bcECf23b848f6783258eF82D0138";
const USDC_ADDRESS = "0x468f701DdB6c1118148D710ff185A97bbFE39f37";

// RPC URL for Flare Coston2 testnet
const RPC_URL = "https://coston2-api.flare.network/ext/C/rpc";

// Option ID and wallet address to check
const OPTION_ID = 15; // The option ID you're trying to purchase
const WALLET_ADDRESS =
  process.argv[2] || "0xFF7290D664603D7564718800A987A161BedC4A6D";
const LOT_AMOUNT = 1; // The lot amount you're trying to purchase

async function main() {
  if (!ethers.utils.isAddress(WALLET_ADDRESS)) {
    console.log("Please provide a valid wallet address");
    console.log("Usage: node check-option-cost.js 0xYourWalletAddress");
    return;
  }

  console.log("Checking option cost calculation for option #" + OPTION_ID);
  console.log("Wallet address:", WALLET_ADDRESS);

  // Connect to the network
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

  // Create contracts
  const optionAmmContract = new ethers.Contract(
    OPTION_AMM_ADDRESS,
    OPTION_AMM_ABI,
    provider
  );

  try {
    // Get USDC address from contract to double-check
    const usdcAddress = await optionAmmContract.usdc();
    console.log("USDC address from contract:", usdcAddress);
    console.log("Expected USDC address:", USDC_ADDRESS);

    if (usdcAddress.toLowerCase() !== USDC_ADDRESS.toLowerCase()) {
      console.log("⚠️ WARNING: USDC addresses don't match!");
    }

    const usdcContract = new ethers.Contract(usdcAddress, USDC_ABI, provider);

    // Get decimals of USDC token
    const decimals = await usdcContract.decimals();
    console.log(`USDC decimals: ${decimals}`);

    // Get user's USDC balance
    const balance = await usdcContract.balanceOf(WALLET_ADDRESS);
    console.log(
      `USDC Balance: ${ethers.utils.formatUnits(
        balance,
        decimals
      )} USDC (${balance.toString()} wei)`
    );

    // Get option details
    const option = await optionAmmContract.options(OPTION_ID);
    console.log("\nOption #" + OPTION_ID + " details:");
    console.log("Strike Price:", ethers.utils.formatUnits(option[0], decimals));
    console.log("Lot Size:", option[1].toString());
    console.log("Premium:", ethers.utils.formatUnits(option[2], decimals));
    console.log("K constant:", option[3].toString());
    console.log(
      "Expiry:",
      new Date(option[4].toNumber() * 1000).toLocaleString()
    );
    console.log("Is Call:", option[5]);
    console.log("Creator:", option[6]);

    // Calculate cost using the same logic as the contract
    const lotSize = option[1];
    const k = option[3];

    // Calculate current premium: k / lotSize
    let currentPremium = lotSize.gt(0)
      ? k.div(lotSize)
      : ethers.BigNumber.from(0);
    console.log(
      "\nCalculated current premium:",
      ethers.utils.formatUnits(currentPremium, decimals),
      "USDC"
    );

    // Calculate cost: currentPremium * lotAmount
    const cost = currentPremium.mul(LOT_AMOUNT);
    console.log(
      `Cost for ${LOT_AMOUNT} lot(s): ${ethers.utils.formatUnits(
        cost,
        decimals
      )} USDC (${cost.toString()} wei)`
    );

    // Compare cost to balance
    if (balance.lt(cost)) {
      console.log(
        "\n❌ ERROR: Your USDC balance is less than the required cost!"
      );
      console.log(
        `You need ${ethers.utils.formatUnits(
          cost.sub(balance),
          decimals
        )} more USDC to make this purchase`
      );
    } else {
      console.log("\n✅ Your USDC balance is sufficient to cover this cost");
    }

    // Log possible causes of the error
    console.log(
      "\nIf you're still seeing 'transfer amount exceeds balance' errors:"
    );
    console.log(
      "1. The contract might be confused about which USDC token to use"
    );
    console.log(
      "2. There might be a decimal precision issue in how the frontend calculates the amount"
    );
    console.log(
      "3. You might need to add liquidity to the contract first before purchasing"
    );
    console.log("4. The option might no longer be available or has expired");
  } catch (error) {
    console.error("Error:", error);
  }
}

main().catch(console.error);
