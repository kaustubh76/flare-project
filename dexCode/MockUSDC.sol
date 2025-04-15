// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/**
 * @title MockUSDC
 * @dev A mock implementation of USDC stablecoin based on the ERC20 standard
 * Includes functionality for minting, burning, and permitting transactions
 */
contract MockUSDC is ERC20, ERC20Burnable, Ownable, ERC20Permit {
    uint8 private _decimals = 6; // USDC uses 6 decimals unlike the standard 18

    constructor(address initialOwner)
        ERC20("USD Coin", "USDC")
        Ownable(initialOwner)
        ERC20Permit("USD Coin")
    {}

    /**
     * @dev Returns the number of decimals used to get its user representation.
     * USDC uses 6 decimals instead of the default 18 used by most ERC20 tokens.
     */
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Mints new tokens to the specified address
     * @param to The address that will receive the minted tokens
     * @param amount The amount of tokens to mint
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Burns tokens from the specified address (if allowed)
     * @param from The address from which tokens will be burnt
     * @param amount The amount of tokens to burn
     */
    function burnFrom(address from, uint256 amount) public override {
        super.burnFrom(from, amount);
    }

    /**
     * @dev Custom implementation for blacklisting functionality (mock implementation)
     * Real USDC includes blacklisting capabilities
     */
    mapping(address => bool) private _blacklisted;

    /**
     * @dev Adds an address to the blacklist
     * @param account The address to blacklist
     */
    function blacklist(address account) public onlyOwner {
        _blacklisted[account] = true;
    }

    /**
     * @dev Removes an address from the blacklist
     * @param account The address to remove from blacklist
     */
    function unBlacklist(address account) public onlyOwner {
        _blacklisted[account] = false;
    }

    /**
     * @dev Checks if an address is blacklisted
     * @param account The address to check
     * @return True if the address is blacklisted, false otherwise
     */
    function isBlacklisted(address account) public view returns (bool) {
        return _blacklisted[account];
    }

    /**
     * @dev Override _beforeTokenTransfer to check blacklist status
     */
    function _update(address from, address to, uint256 amount) internal virtual override {
        require(!_blacklisted[from] && !_blacklisted[to], "MockUSDC: account is blacklisted");
        super._update(from, to, amount);
    }
}