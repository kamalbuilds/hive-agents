// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title MockPYUSDV2
 * @notice Mock PYUSD token with minter role for testing
 */
contract MockPYUSDV2 is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    uint8 private constant DECIMALS = 6;
    
    event MinterAdded(address indexed account);
    event MinterRemoved(address indexed account);
    
    constructor() ERC20("PayPal USD", "PYUSD") {
        // Grant admin role to deployer
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        // Grant minter role to deployer
        _grantRole(MINTER_ROLE, msg.sender);
        
        // Mint initial supply to deployer (10,000 PYUSD)
        _mint(msg.sender, 10000 * 10**DECIMALS);
    }
    
    /**
     * @notice Returns the number of decimals (6 for PYUSD)
     */
    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }
    
    /**
     * @notice Mint new tokens (only MINTER_ROLE)
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }
    
    /**
     * @notice Burn tokens from sender
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
    
    /**
     * @notice Add a new minter
     */
    function addMinter(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(MINTER_ROLE, account);
        emit MinterAdded(account);
    }
    
    /**
     * @notice Remove a minter
     */
    function removeMinter(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(MINTER_ROLE, account);
        emit MinterRemoved(account);
    }
    
    /**
     * @notice Check if an address is a minter
     */
    function isMinter(address account) external view returns (bool) {
        return hasRole(MINTER_ROLE, account);
    }
}