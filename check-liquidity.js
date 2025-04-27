// Script to check the raw value of totalLiquidity
const { ethers } = require("ethers");

async function checkTotalLiquidity() {
  try {
    // Connect to Flare network
    const provider = new ethers.providers.JsonRpcProvider(
      "https://coston2-api.flare.network/ext/C/rpc"
    );

    // Contract info
    const optionAMMAddress = "0x8889F62d45A1bcECf23b848f6783258eF82D0138";
    const abi = [
      "function totalLiquidity() view returns (uint256)",
      "function getTotalLiquidity() view returns (uint256)",
    ];

    // Create contract instance
    const contract = new ethers.Contract(optionAMMAddress, abi, provider);

    console.log("\n--- Total Liquidity Check ---");

    // Check direct totalLiquidity variable
    try {
      const liquidityFromVar = await contract.totalLiquidity();
      console.log(`Raw totalLiquidity: ${liquidityFromVar.toString()}`);
      console.log(
        `Formatted totalLiquidity (assuming 6 decimals): ${ethers.utils.formatUnits(
          liquidityFromVar,
          6
        )} USDC`
      );
    } catch (error) {
      console.log("Error accessing totalLiquidity variable:", error.message);
    }

    // Check getTotalLiquidity function
    try {
      const liquidityFromFn = await contract.getTotalLiquidity();
      console.log(`Raw getTotalLiquidity(): ${liquidityFromFn.toString()}`);
      console.log(
        `Formatted getTotalLiquidity() (assuming 6 decimals): ${ethers.utils.formatUnits(
          liquidityFromFn,
          6
        )} USDC`
      );
    } catch (error) {
      console.log("Error calling getTotalLiquidity():", error.message);
    }

    console.log("\n--- Additional Context ---");
    console.log("USDC typically uses 6 decimals.");
    console.log(
      "If the raw value is 110160000000, that represents 110,160 USDC"
    );
  } catch (error) {
    console.error("Script error:", error);
  }
}

// Run the function
checkTotalLiquidity().catch(console.error);
