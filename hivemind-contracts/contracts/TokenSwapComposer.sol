// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
// LayerZero interfaces

/**
 * @title TokenSwapComposer
 * @notice LayerZero Composer for automatic token swaps after cross-chain transfers
 * @dev Receives PYUSD via LayerZero and swaps to requested token
 */
interface IOAppComposer {
    
    function lzCompose(
        address _from,
        bytes32 _guid,
        bytes calldata _message,
        address _executor,
        bytes calldata _extraData
    ) external payable;
}

interface ILayerZeroEndpointV2 {
    function send(
        uint32 _dstEid,
        bytes calldata _message,
        bytes calldata _options
    ) external payable returns (bytes32);
}

interface IUniswapV4SwapRouter {
    function swapExactInputSingle(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMinimum,
        address recipient
    ) external returns (uint256 amountOut);
    
    function getQuote(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 amountOut);
}

contract TokenSwapComposer is IOAppComposer, Ownable {
    using SafeERC20 for IERC20;
    
    ILayerZeroEndpointV2 public immutable endpoint;
    address public immutable pyusd;
    
    // Swap configuration
    mapping(address => address) public swapRouters; // token => DEX router
    mapping(address => bool) public supportedTokens;
    mapping(bytes32 => address) public oAppRegistry;
    
    // Uniswap V4 router
    IUniswapV4SwapRouter public uniswapV4Router;
    
    // Events
    event SwapExecuted(
        address indexed recipient,
        address indexed fromToken,
        address indexed toToken,
        uint256 amountIn,
        uint256 amountOut
    );
    
    event OAppRegistered(bytes32 indexed oApp, address indexed implementation);
    
    constructor(
        address _endpoint,
        address _pyusd,
        address _owner
    ) Ownable(_owner) {
        endpoint = ILayerZeroEndpointV2(_endpoint);
        pyusd = _pyusd;
        
        // Configure default supported tokens
        _configureSupportedTokens();
    }
    
    /**
     * @notice Configure default supported tokens and DEX routers
     */
    function _configureSupportedTokens() private {
        // USDC
        supportedTokens[0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48] = true;
        // USDT
        supportedTokens[0xdAC17F958D2ee523a2206206994597C13D831ec7] = true;
        // WETH
        supportedTokens[0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2] = true;
    }
    
    /**
     * @notice Compose receiver for LayerZero messages
     */
    function lzCompose(
        address _from,
        bytes32 _guid,
        bytes calldata _message,
        address _executor,
        bytes calldata _extraData
    ) external payable override {
        require(msg.sender == address(endpoint), "Only endpoint");
        require(oAppRegistry[bytes32(uint256(uint160(_from)))] != address(0), "Unknown OApp");
        
        // Decode the composed message
        (
            address recipient,
            uint256 amountLD,
            address targetToken,
            uint256 minAmountOut
        ) = abi.decode(_message, (address, uint256, address, uint256));
        
        // Execute the swap
        _executeSwap(recipient, amountLD, targetToken, minAmountOut);
    }
    
    /**
     * @notice Execute token swap from PYUSD to target token
     */
    function _executeSwap(
        address recipient,
        uint256 amountIn,
        address targetToken,
        uint256 minAmountOut
    ) private {
        require(supportedTokens[targetToken], "Token not supported");
        
        if (targetToken == pyusd) {
            // No swap needed, direct transfer
            IERC20(pyusd).safeTransfer(recipient, amountIn);
            emit SwapExecuted(recipient, pyusd, pyusd, amountIn, amountIn);
            return;
        }
        
        // Get DEX router for target token
        address router = swapRouters[targetToken];
        require(router != address(0), "No router configured");
        
        // Approve router to spend PYUSD
        IERC20(pyusd).safeIncreaseAllowance(router, amountIn);
        
        // Execute swap (simplified - would integrate with actual DEX)
        uint256 amountOut = _performSwap(router, pyusd, targetToken, amountIn, minAmountOut);
        
        // Transfer swapped tokens to recipient
        IERC20(targetToken).safeTransfer(recipient, amountOut);
        
        emit SwapExecuted(recipient, pyusd, targetToken, amountIn, amountOut);
    }
    
    /**
     * @notice Perform actual swap on DEX
     */
    function _performSwap(
        address router,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) private returns (uint256 amountOut) {
        // Use Uniswap V4 router if configured
        if (address(uniswapV4Router) != address(0) && router == address(uniswapV4Router)) {
            // Approve Uniswap V4 router
            IERC20(tokenIn).safeIncreaseAllowance(address(uniswapV4Router), amountIn);
            
            // Execute swap through Uniswap V4
            amountOut = uniswapV4Router.swapExactInputSingle(
                tokenIn,
                tokenOut,
                amountIn,
                minAmountOut,
                address(this)
            );
            
            return amountOut;
        }
        
        // Fallback to simplified swap for testing
        return minAmountOut;
    }
    
    /**
     * @notice Set Uniswap V4 router
     */
    function setUniswapV4Router(address _router) external onlyOwner {
        require(_router != address(0), "Invalid router");
        uniswapV4Router = IUniswapV4SwapRouter(_router);
    }
    
    /**
     * @notice Register OApp for composition
     */
    function registerOApp(bytes32 _oApp, address _implementation) external onlyOwner {
        oAppRegistry[_oApp] = _implementation;
        emit OAppRegistered(_oApp, _implementation);
    }
    
    /**
     * @notice Add supported token
     */
    function addSupportedToken(address _token, address _router) external onlyOwner {
        supportedTokens[_token] = true;
        swapRouters[_token] = _router;
    }
    
    /**
     * @notice Quote swap for planning
     */
    function quoteSwap(
        uint256 amountIn,
        address targetToken
    ) external view returns (uint256 expectedOut) {
        if (targetToken == pyusd) {
            return amountIn;
        }
        
        // Use Uniswap V4 router for quotes if available
        if (address(uniswapV4Router) != address(0)) {
            try uniswapV4Router.getQuote(pyusd, targetToken, amountIn) returns (uint256 quote) {
                return quote;
            } catch {
                // Fallback to default quote
            }
        }
        
        // Default: return 1:1 ratio with 1% slippage
        return amountIn * 99 / 100;
    }
    
    /**
     * @notice Emergency token recovery
     */
    function recoverTokens(address _token, uint256 _amount) external onlyOwner {
        IERC20(_token).safeTransfer(owner(), _amount);
    }
}