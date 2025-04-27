const { ethers } = require("ethers");

// Using the actual values from the contract
const latestPrice = 1804235; // Raw value from getLatestPrice (3 decimal places)
const strikePrice = ethers.BigNumber.from("800000000000000000000"); // 800 with 18 decimals
const lotCount = ethers.BigNumber.from("1000000000000000000"); // 1 with 18 decimals
const totalLiquidity = ethers.BigNumber.from("110160000000"); // 110,160 USDC with 6 decimals

console.log("--- Option Settlement Calculation (Current Contract Logic) ---");
console.log(`Latest Price (raw): ${latestPrice}`);
console.log(`Latest Price (formatted, 3 decimals): $${latestPrice / 1000}`);
console.log(`Strike Price (raw): ${strikePrice.toString()}`);
console.log(
  `Strike Price (formatted, 18 decimals): $${ethers.utils.formatUnits(
    strikePrice,
    18
  )}`
);
console.log(`Your Lot Count (raw): ${lotCount.toString()}`);
console.log(
  `Your Lot Count (formatted, 18 decimals): ${ethers.utils.formatUnits(
    lotCount,
    18
  )}`
);
console.log(`Total Contract Liquidity (raw): ${totalLiquidity.toString()}`);
console.log(
  `Total Contract Liquidity (formatted, 6 decimals): ${ethers.utils.formatUnits(
    totalLiquidity,
    6
  )} USDC\n`
);

// Contract's current payout calculation:
// latestPrice * 1e15 makes it have effectively 18 decimal places (3 + 15 = 18)
const latestPriceAdjusted = ethers.BigNumber.from(latestPrice).mul(
  ethers.BigNumber.from(10).pow(15)
);
console.log(`Latest Price * 1e15: ${latestPriceAdjusted.toString()}`);

// Calculate price difference (current - strike) for a call option
const priceDifference = latestPriceAdjusted.sub(strikePrice);
console.log(`Price Difference: ${priceDifference.toString()}`);
console.log(
  `Price Difference (formatted, 18 decimals): $${ethers.utils.formatUnits(
    priceDifference,
    18
  )}`
);

// Calculate payout as per contract: priceDifference * lotCount / 1e12
const payoutContract = priceDifference
  .mul(lotCount)
  .div(ethers.BigNumber.from(10).pow(12));
console.log(`\nContract Payout Calculation: priceDifference * lotCount / 1e12`);
console.log(`Payout (raw): ${payoutContract.toString()}`);
console.log(
  `Payout (formatted, 6 decimals): ${ethers.utils.formatUnits(
    payoutContract,
    6
  )} USDC`
);
console.log(
  `Is liquidity sufficient? ${
    totalLiquidity.gte(payoutContract) ? "Yes" : "No"
  }`
);
console.log(
  `Shortfall: ${ethers.utils.formatUnits(
    payoutContract.sub(totalLiquidity),
    6
  )} USDC\n`
);

// WHAT THE CONTRACT SHOULD DO (more reasonable calculation)
console.log("--- Corrected Calculation (What Contract Should Do) ---");

// A more reasonable approach would be to:
// 1. Convert both strike and price to same decimal precision (e.g., 6 decimals for USDC)
// 2. Calculate the difference
// 3. Multiply by lot count normalized to 1.0 (no 18 decimals)

const priceIn6Decimals = ethers.BigNumber.from(latestPrice).mul(1000); // 3 to 6 decimals
const strikeIn6Decimals = strikePrice.div(ethers.BigNumber.from(10).pow(12)); // 18 to 6 decimals
const normalizedLotCount = ethers.utils.formatUnits(lotCount, 18); // Convert to number without decimals

console.log(`Price in 6 decimals: ${priceIn6Decimals.toString()}`);
console.log(`Strike in 6 decimals: ${strikeIn6Decimals.toString()}`);
console.log(`Normalized lot count: ${normalizedLotCount}`);

const diff6Decimals = priceIn6Decimals.sub(strikeIn6Decimals);
console.log(`Price difference (6 decimals): ${diff6Decimals.toString()}`);

// Calculate payout properly: price diff * lot count (as regular number)
const correctedPayout = diff6Decimals
  .mul(Math.floor(normalizedLotCount * 1000000))
  .div(1000000);
console.log(`\nCorrected payout (raw): ${correctedPayout.toString()}`);
console.log(
  `Corrected payout (formatted, 6 decimals): ${ethers.utils.formatUnits(
    correctedPayout,
    6
  )} USDC`
);
console.log(
  `Is liquidity sufficient? ${
    totalLiquidity.gte(correctedPayout) ? "Yes" : "No"
  }\n`
);

// Contract fix recommendation
console.log("--- Contract Fix Recommendation ---");
console.log(`The contract's payout calculation uses improper decimal scaling.`);
console.log(
  `It should be modified to align the decimal places between price feed and strike price.`
);
console.log(
  `For a proper fix, the contract's settleOption function needs to be updated.`
);
