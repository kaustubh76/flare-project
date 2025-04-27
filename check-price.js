// Script to check the raw value of getLatestPrice
const { ethers } = require("ethers");

async function checkLatestPrice() {
  try {
    console.log("Checking raw value of getLatestPrice function...");

    // Connect to Flare network
    const provider = new ethers.providers.JsonRpcProvider(
      "https://coston2-api.flare.network/ext/C/rpc"
    );
    console.log("Connected to Flare Coston2 network");

    // Create wallet with private key (for payable function call)
    // Replace with your private key - BE CAREFUL NOT TO SHARE THIS FILE
    const privateKey = "YOUR_PRIVATE_KEY"; // Replace this or use .env file
    const wallet = new ethers.Wallet(privateKey, provider);

    // Contract info
    const optionAMMAddress = "0x8889F62d45A1bcECf23b848f6783258eF82D0138";
    const abi = ["function getLatestPrice() payable returns (int256)"];

    // Create contract instance with signer
    const contract = new ethers.Contract(optionAMMAddress, abi, wallet);

    console.log("Calling getLatestPrice()...");
    // Call the payable function with a small amount of native token
    const price = await contract.getLatestPrice({
      value: ethers.utils.parseEther("0.0001"), // Small amount of native token
    });

    console.log("\n--- Latest Price Information ---");
    console.log(`Raw price from getLatestPrice(): ${price.toString()}`);
    console.log(
      `Formatted price (assuming 18 decimals): ${ethers.utils.formatUnits(
        price,
        18
      )}`
    );

    console.log("\n--- Price Calculations for Contract Logic ---");
    console.log(
      `Raw price * 1e15: ${price
        .mul(ethers.BigNumber.from(10).pow(15))
        .toString()}`
    );
    console.log(
      `Formatted price * 1e15: ${ethers.utils.formatUnits(
        price.mul(ethers.BigNumber.from(10).pow(15)),
        33
      )}`
    );

    console.log("\n--- For Option ID 0 ---");
    const strikePrice = ethers.utils.parseUnits("800", 18); // Your option's strike price
    console.log(`Strike price: ${strikePrice.toString()}`);

    // Calculate price difference as in contract
    const priceDifference = price
      .mul(ethers.BigNumber.from(10).pow(15))
      .sub(strikePrice);
    console.log(`Price difference: ${priceDifference.toString()}`);

    // Calculate payout with 1.0 lot (with 18 decimals: 1e18)
    const lotCount = ethers.utils.parseUnits("1", 18);
    const payout = priceDifference
      .mul(lotCount)
      .div(ethers.BigNumber.from(10).pow(12));
    console.log(`Calculated payout: ${payout.toString()}`);
    console.log(
      `Formatted payout (assuming 6 decimals): ${ethers.utils.formatUnits(
        payout,
        6
      )} USDC`
    );
  } catch (error) {
    console.error("Script error:", error);
  }
}

// Note: You need to replace YOUR_PRIVATE_KEY with your actual private key to run this
// or comment out the wallet creation and make this read-only
console.log(
  "WARNING: This script requires your private key to call the payable function."
);
console.log(
  "Please edit the script to add your private key before running it."
);
// checkLatestPrice().catch(console.error);
