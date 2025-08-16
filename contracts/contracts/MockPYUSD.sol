// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockPYUSD
 * @notice Mock PayPal USD stablecoin for testing x402 payments
 * @dev Implements standard ERC20 with minting capability for testing
 */
contract MockPYUSD is ERC20, Ownable {
    uint8 private constant DECIMALS = 6; // PYUSD uses 6 decimals like USDC
    
    mapping(address => bool) public minters;
    mapping(address => uint256) public dailyMintLimit;
    mapping(address => uint256) public dailyMinted;
    mapping(address => uint256) public lastMintDay;
    
    event MinterAdded(address indexed minter, uint256 dailyLimit);
    event MinterRemoved(address indexed minter);
    event EmergencyMint(address indexed to, uint256 amount);
    
    constructor() ERC20("PayPal USD", "PYUSD") Ownable(msg.sender) {
        // Mint initial supply for testing
        _mint(msg.sender, 1000000 * 10**DECIMALS); // 1M PYUSD
    }
    
    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }
    
    /**
     * @notice Add a minter with daily limit
     * @param minter Address to grant minting permission
     * @param limit Daily minting limit in PYUSD
     */
    function addMinter(address minter, uint256 limit) external onlyOwner {
        minters[minter] = true;
        dailyMintLimit[minter] = limit * 10**DECIMALS;
        emit MinterAdded(minter, limit);
    }
    
    /**
     * @notice Remove minter permission
     * @param minter Address to revoke minting permission
     */
    function removeMinter(address minter) external onlyOwner {
        minters[minter] = false;
        emit MinterRemoved(minter);
    }
    
    /**
     * @notice Mint PYUSD within daily limit
     * @param to Recipient address
     * @param amount Amount to mint (with decimals)
     */
    function mint(address to, uint256 amount) external {
        require(minters[msg.sender], "Not a minter");
        
        uint256 today = block.timestamp / 1 days;
        if (lastMintDay[msg.sender] < today) {
            dailyMinted[msg.sender] = 0;
            lastMintDay[msg.sender] = today;
        }
        
        require(
            dailyMinted[msg.sender] + amount <= dailyMintLimit[msg.sender],
            "Daily limit exceeded"
        );
        
        dailyMinted[msg.sender] += amount;
        _mint(to, amount);
    }
    
    /**
     * @notice Emergency mint by owner (for testing)
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function emergencyMint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
        emit EmergencyMint(to, amount);
    }
    
    /**
     * @notice Burn PYUSD tokens
     * @param amount Amount to burn
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
    
    /**
     * @notice Get formatted balance (for UI display)
     * @param account Address to check
     * @return balance Balance without decimals
     */
    function getFormattedBalance(address account) external view returns (uint256) {
        return balanceOf(account) / 10**DECIMALS;
    }
}