// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

interface FtsoV2Interface {
    function getFeedsById(bytes21[] calldata _feedIds)
        external
        payable
        returns (uint256[] memory _values, int8[] memory _decimals, uint64 _timestamp);
}

contract OptionAMM {
    struct Option {
        uint256 strikePrice;
        uint256 lotSize; // x
        uint256 premium; // y
        uint256 k; // Constant product x * y
        uint256 expiry;
        bool isCall;
        address creator;
    }

    Option[] public options;
    IERC20 public usdc; // USDC token contract interface
    FtsoV2Interface public ftso;
    bytes21 public constant ETH_USD_FEED_ID = bytes21(0x014554482f55534400000000000000000000000000);

    // Mapping from option ID to user address to lot count
    mapping(uint256 => mapping(address => uint256)) public optionOwnership;

    // Liquidity tracking
    uint256 public totalLiquidity;
    uint256 public totalPremiumLiquidity;
    mapping(address => uint256) public liquidityContributions;

    event OptionCreated(
        uint256 indexed optionId, uint256 strikePrice, uint256 lotSize, uint256 premium, uint256 expiry, bool isCall
    );
    event OptionPurchased(uint256 indexed optionId, address buyer, uint256 lotAmount, uint256 cost);
    event LiquidityAdded(address indexed provider, uint256 amount);
    event LiquidityRemoved(address indexed provider, uint256 amount);
    event OptionSettled(uint256 indexed optionId, address indexed holder, uint256 payout, bool inTheMoney);

    constructor(address _usdcAddress, address _ftsoAddress) {
        usdc = IERC20(_usdcAddress);
        ftso = FtsoV2Interface(_ftsoAddress);
    }

    function createOption(uint256 _strikePrice, uint256 _lotSize, uint256 _premium, uint256 _expiry, bool _isCall)
        public
    {   
        int256 latestPrice = getLatestPrice();
        require(_isCall ? _strikePrice > uint256(latestPrice) * 1e15 : _strikePrice < uint256(latestPrice) * 1e15, "Strike price not valid");
        require(_lotSize > 0, "Lot size must be greater than 0");
        require(_premium > 0, "Premium must be greater than 0");
        require(_expiry > block.timestamp, "Expiry must be in the future");
        uint256 _k = _lotSize * _premium;
        options.push(
            Option({
                strikePrice: _strikePrice,
                lotSize: _lotSize,
                premium: _premium,
                k: _k,
                expiry: _expiry,
                isCall: _isCall,
                creator: msg.sender
            })
        );
        uint256 optionId = options.length - 1;
        emit OptionCreated(optionId, _strikePrice, _lotSize, _premium, _expiry, _isCall);
    }

    function purchaseOption(uint256 _optionId, uint256 _lotAmount) public {
        require(_optionId < options.length, "Option does not exist");
        Option storage option = options[_optionId];
        require(block.timestamp < option.expiry, "Option has expired");
        require(option.lotSize >= _lotAmount, "Not enough options available");


        uint256 currentPremium = option.lotSize > 0 ? option.k / option.lotSize : 0;
        uint256 extraPenalty = 0;
        int256 latestPrice = getLatestPrice();

        if(option.isCall) {
            if(latestPrice * 1e15 > int256(option.strikePrice)) {
                extraPenalty = uint256(latestPrice * 1e15 - int256(option.strikePrice));
            }
        } else {
            if(latestPrice * 1e15 < int256(option.strikePrice)) {
                extraPenalty = uint256(int256(option.strikePrice) - latestPrice);
            }
        }
        
        uint256 cost = (currentPremium + extraPenalty) * _lotAmount / 1e30; // Adjust for decimals
        


        require(usdc.transferFrom(msg.sender, address(this), cost), "Failed to transfer USDC");

        option.lotSize -= _lotAmount; // Decrease lot size available
        option.premium = option.lotSize > 0 ? option.k / option.lotSize : 0; // Update premium for next buyer
        optionOwnership[_optionId][msg.sender] += _lotAmount; // Record the purchase
        totalLiquidity += cost; // Update total liquidity
        totalPremiumLiquidity += cost; // Update total premium liquidity

        emit OptionPurchased(_optionId, msg.sender, _lotAmount, cost);
    }

    function addLiquidity(uint256 _amount) public {
        require(usdc.transferFrom(msg.sender, address(this), _amount), "Failed to transfer USDC");
        liquidityContributions[msg.sender] += _amount;
        totalLiquidity += _amount;
        emit LiquidityAdded(msg.sender, _amount);
    }

    function removeLiquidity(uint256 _amount) public {
        require(liquidityContributions[msg.sender] >= _amount, "Insufficient liquidity");
        require(usdc.transfer(msg.sender, _amount), "Transfer failed");
        liquidityContributions[msg.sender] -= _amount;
        totalLiquidity -= _amount;
        emit LiquidityRemoved(msg.sender, _amount);
    }



    function settleOption(uint256 optionId) public {
        require(optionId < options.length, "Option does not exist");
        Option storage option = options[optionId];
        require(block.timestamp >= option.expiry, "Option has not yet expired");
        require(optionOwnership[optionId][msg.sender] > 0, "No option holdings");

        int256 latestPrice = getLatestPrice();
        uint256 lotCount = optionOwnership[optionId][msg.sender];
        uint256 payout = 0;
        bool inTheMoney = false;

        /*
            latest price = 1808.051 * 1e18 = 1808051 * 1e15
            strike price = 500 * 1e18 = 500000 * 1e15
            lot count = 1e18 = 1000 * 1e15
            price difference = 1808051 - 500000 = 13,08,051 * 1e15
            payout = 1308051000 * 1e12 * 1e18 / 1e30 = 1308051000 * 1e0 = 1308051000

        */

        if (option.isCall) {
            if (latestPrice * 1e15 > int256(option.strikePrice)) {
                inTheMoney = true;
                uint256 priceDifference = uint256(abs(latestPrice * 1e15 - int256(option.strikePrice)));
                payout = priceDifference * lotCount / 1e30;

                // Ensure there is enough liquidity to pay out
                require(totalLiquidity >= payout, "Insufficient liquidity for payout");
                require(usdc.transfer(msg.sender, payout), "Payout failed");
                totalLiquidity -= payout; // Update liquidity
            }
        } else {
            // Put option
            if (latestPrice * 1e15 < int256(option.strikePrice)) {
                inTheMoney = true;
                uint256 priceDifference = uint256(abs(latestPrice * 1e15 - int256(option.strikePrice)));
                payout = priceDifference * lotCount / 1e30;

                // Ensure there is enough liquidity to pay out
                require(totalLiquidity >= payout, "Insufficient liquidity for payout");
                require(usdc.transfer(msg.sender, payout), "Payout failed");
                totalLiquidity -= payout; // Update liquidity
            }
        }

        // if (
        //     (option.isCall && latestPrice > int256(option.strikePrice))
        //         || (option.isCall == false && latestPrice < int256(option.strikePrice))
        // ) {
        //     inTheMoney = true;
        //     uint256 priceDifference = uint256(abs(latestPrice - int256(option.strikePrice)));
        //     payout = priceDifference * lotCount;

        //     // Ensure there is enough liquidity to pay out
        //     require(totalLiquidity >= payout, "Insufficient liquidity for payout");
        //     require(usdc.transfer(msg.sender, payout), "Payout failed");
        //     totalLiquidity -= payout; // Update liquidity
        // }

        // Burn the settled options
        optionOwnership[optionId][msg.sender] = 0;

        emit OptionSettled(optionId, msg.sender, payout, inTheMoney);
    }

    function getLatestPrice() public payable returns (int256) {
        bytes21[] memory feedIds = new bytes21[](1);
        feedIds[0] = ETH_USD_FEED_ID;
        (uint256[] memory values,,) = ftso.getFeedsById(feedIds);
        return int256(values[0]);
    }

    function abs(int256 x) private pure returns (uint256) {
        return x >= 0 ? uint256(x) : uint256(-x);
    }

    // Additional helper methods can be added here
    function getOptionsLength() public view returns (uint256) {
        return options.length;
    }

    function getOptionOwnership(uint256 optionId, address user) public view returns (uint256) {
        return optionOwnership[optionId][user];
    }
    
    function getLiquidityContribution(address user) public view returns (uint256) {
        return liquidityContributions[user];
    }
    
    function getTotalLiquidity() public view returns (uint256) {
        return totalLiquidity;
    }

    function getOptionDetails(uint256 optionId) public view returns (Option memory) {
        require(optionId < options.length, "Option does not exist");
        return options[optionId];
    }
    
    function getTotalPremiumLiquidity() public view returns (uint256) {
        return totalPremiumLiquidity;
    }

    function getExtraPanelty(uint256 optionId) public returns (uint256) {
        require(optionId < options.length, "Option does not exist");
        Option memory option = options[optionId];
        int256 latestPrice = getLatestPrice();
        uint256 extraPenalty = 0;

        if(option.isCall) {
            if(latestPrice * 1e15 > int256(option.strikePrice)) {
                extraPenalty = uint256(latestPrice * 1e15 - int256(option.strikePrice));
            }
        } else {
            if(latestPrice < int256(option.strikePrice)) {
                extraPenalty = uint256(int256(option.strikePrice) - latestPrice);
            }
        }

        return extraPenalty;
    }
}