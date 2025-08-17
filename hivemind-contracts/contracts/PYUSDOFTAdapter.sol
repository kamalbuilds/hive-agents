// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./base/OFTCore.sol";

/**
 * @title PYUSDOFTAdapter
 * @notice LayerZero OFT Adapter for PYUSD enabling cross-chain transfers
 * @dev Maintains 6 decimal precision across all chains for PYUSD
 */
contract PYUSDOFTAdapter is OFTCore {
    using SafeERC20 for IERC20;
    
    IERC20 public immutable pyusdToken;
    uint8 public constant SHARED_DECIMALS = 6;
    
    // Chain configuration
    mapping(uint32 => address) public chainTokenAddresses;
    mapping(uint32 => bool) public supportedChains;
    
    // Events
    event ChainConfigured(uint32 indexed eid, address tokenAddress);
    event CrossChainTransferInitiated(
        address indexed sender,
        uint32 indexed dstEid,
        address indexed recipient,
        uint256 amount
    );
    
    constructor(
        address _pyusd,
        address _lzEndpoint,
        address _delegate
    ) OFTCore(SHARED_DECIMALS, _lzEndpoint, _delegate) {
        pyusdToken = IERC20(_pyusd);
        
        // Configure supported chains
        _configureChains();
    }
    
    /**
     * @notice Configure supported chains for PYUSD transfers
     */
    function _configureChains() private {
        // Base
        supportedChains[30184] = true;
        chainTokenAddresses[30184] = address(pyusdToken);
        
        // Arbitrum
        supportedChains[30110] = true;
        chainTokenAddresses[30110] = address(pyusdToken);
        
        // Ethereum
        supportedChains[30101] = true;
        chainTokenAddresses[30101] = address(pyusdToken);
        
        // Optimism
        supportedChains[30111] = true;
        chainTokenAddresses[30111] = address(pyusdToken);
    }
    
    /**
     * @notice Lock tokens for cross-chain transfer
     */
    function _debit(
        uint256 _amountLD,
        uint256 _minAmountLD,
        uint32 _dstEid
    ) internal override returns (uint256 amountSentLD, uint256 amountReceivedLD) {
        require(supportedChains[_dstEid], "Destination chain not supported");
        
        // Transfer PYUSD from sender to this contract
        pyusdToken.safeTransferFrom(msg.sender, address(this), _amountLD);
        
        // Convert to shared decimals (already 6 for PYUSD)
        amountSentLD = _amountLD;
        amountReceivedLD = _amountLD;
        
        emit CrossChainTransferInitiated(msg.sender, _dstEid, msg.sender, _amountLD);
        
        return (amountSentLD, amountReceivedLD);
    }
    
    /**
     * @notice Release tokens after receiving cross-chain message
     */
    function _credit(
        address _to,
        uint256 _amountLD,
        uint32 _srcEid
    ) internal override returns (uint256 amountReceivedLD) {
        require(supportedChains[_srcEid], "Source chain not supported");
        
        // Transfer PYUSD to recipient
        pyusdToken.safeTransfer(_to, _amountLD);
        
        return _amountLD;
    }
    
    /**
     * @notice Send PYUSD cross-chain
     */
    function sendPYUSD(
        uint32 _dstEid,
        bytes32 _to,
        uint256 _amountLD,
        bytes calldata _options
    ) external payable {
        require(supportedChains[_dstEid], "Destination not supported");
        
        _send(
            SendParam({
                dstEid: _dstEid,
                to: _to,
                amountLD: _amountLD,
                minAmountLD: _amountLD * 99 / 100, // 1% slippage
                extraOptions: _options,
                composeMsg: "",
                oftCmd: ""
            }),
            MessagingFee(msg.value, 0),
            msg.sender
        );
    }
    
    /**
     * @notice Quote fee for cross-chain transfer
     */
    function quoteSend(
        uint32 _dstEid,
        uint256 _amountLD,
        bytes calldata _options
    ) external view returns (MessagingFee memory fee) {
        return _quote(
            SendParam({
                dstEid: _dstEid,
                to: bytes32(uint256(uint160(msg.sender))),
                amountLD: _amountLD,
                minAmountLD: _amountLD * 99 / 100,
                extraOptions: _options,
                composeMsg: "",
                oftCmd: ""
            }),
            false
        );
    }
    
    /**
     * @notice Add support for new chain
     */
    function addSupportedChain(uint32 _eid, address _tokenAddress) external onlyOwner {
        supportedChains[_eid] = true;
        chainTokenAddresses[_eid] = _tokenAddress;
        emit ChainConfigured(_eid, _tokenAddress);
    }
    
    /**
     * @notice Emergency token recovery
     */
    function recoverTokens(address _token, uint256 _amount) external onlyOwner {
        IERC20(_token).safeTransfer(owner(), _amount);
    }
}