// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Interfaces
interface IUniversalRouter {
    function execute(bytes calldata commands, bytes[] calldata inputs) external payable;
}

interface IQuoter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    
    function quoteExactInputSingle(
        ExactInputSingleParams memory params
    ) external returns (uint256 amountOut);
}

interface IPoolManager {
    struct PoolKey {
        address currency0;
        address currency1;
        uint24 fee;
        int24 tickSpacing;
        address hooks;
    }
    
    struct SwapParams {
        PoolKey poolKey;
        bool zeroForOne;
        int256 amountSpecified;
        uint160 sqrtPriceLimitX96;
        bytes hookData;
    }
    
    function swap(
        PoolKey memory key,
        SwapParams memory params,
        bytes calldata hookData
    ) external returns (int256 amount0, int256 amount1);
    
    function initialize(
        PoolKey memory key,
        uint160 sqrtPriceX96,
        bytes calldata hookData
    ) external returns (int24 tick);
}

interface IPermit2 {
    struct PermitSingle {
        address token;
        uint256 amount;
        uint256 expiration;
        uint256 nonce;
    }
    
    function permit(
        address owner,
        PermitSingle memory permitSingle,
        bytes calldata signature
    ) external;
    
    function approve(
        address token,
        address spender,
        uint160 amount,
        uint48 expiration
    ) external;
}

/// @title UniswapV4SwapRouter
/// @notice Production-ready token swap router using Uniswap V4 on Sepolia
/// @dev Integrates with deployed Uniswap V4 PoolManager and Universal Router
contract UniswapV4SwapRouter is Ownable {
    using SafeERC20 for IERC20;

    // Uniswap V4 Sepolia Deployments
    address public constant POOL_MANAGER = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;
    address public constant UNIVERSAL_ROUTER = 0x3A9D48AB9751398BbFa63ad67599Bb04e4BdF98b;
    address public constant POSITION_MANAGER = 0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4;
    address public constant QUOTER = 0x61B3f2011A92d183C7dbaDBdA940a7555Ccf9227;
    address public constant PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;
    
    // Using structs from interfaces
    
    // Events
    event SwapExecuted(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );
    
    event PoolConfigured(
        address indexed token0,
        address indexed token1,
        uint24 fee,
        int24 tickSpacing
    );
    
    // State variables
    uint256 public slippageTolerance = 300; // 3% default
    uint256 public constant BASIS_POINTS = 10000;
    
    // Pool configurations
    mapping(bytes32 => IPoolManager.PoolKey) public poolKeys;
    mapping(address => mapping(address => bytes32)) public poolKeyIds;
    
    // Universal Router command encodings
    bytes private constant COMMANDS_SWAP = hex"00"; // V4_SWAP
    bytes private constant COMMANDS_SETTLE = hex"10"; // SETTLE
    bytes private constant COMMANDS_TAKE = hex"11"; // TAKE
    
    constructor(address _owner) Ownable(_owner) {
        // Verify deployed contracts exist
        require(UNIVERSAL_ROUTER.code.length > 0, "Universal Router not deployed");
        require(POOL_MANAGER.code.length > 0, "Pool Manager not deployed");
        require(PERMIT2.code.length > 0, "Permit2 not deployed");
    }
    
    /// @notice Configure a pool for swapping
    /// @param tokenA First token address
    /// @param tokenB Second token address  
    /// @param fee Pool fee tier (500 = 0.05%, 3000 = 0.3%, 10000 = 1%)
    /// @param tickSpacing Pool tick spacing
    /// @param hooks Hook contract address (use address(0) for no hooks)
    function configurePool(
        address tokenA,
        address tokenB,
        uint24 fee,
        int24 tickSpacing,
        address hooks
    ) external onlyOwner {
        require(tokenA != tokenB, "Identical tokens");
        require(fee == 500 || fee == 3000 || fee == 10000, "Invalid fee tier");
        
        // Order tokens
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        
        IPoolManager.PoolKey memory poolKey = IPoolManager.PoolKey({
            currency0: token0,
            currency1: token1,
            fee: fee,
            tickSpacing: tickSpacing,
            hooks: hooks
        });
        
        bytes32 poolKeyId = keccak256(abi.encode(token0, token1, fee));
        poolKeys[poolKeyId] = poolKey;
        poolKeyIds[token0][token1] = poolKeyId;
        poolKeyIds[token1][token0] = poolKeyId;
        
        emit PoolConfigured(token0, token1, fee, tickSpacing);
    }
    
    /// @notice Execute a token swap with exact input through Universal Router
    /// @param tokenIn Input token address
    /// @param tokenOut Output token address
    /// @param amountIn Input token amount
    /// @param amountOutMinimum Minimum output amount
    /// @param recipient Recipient address
    /// @return amountOut The actual output amount
    function swapExactInputSingle(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMinimum,
        address recipient
    ) external returns (uint256 amountOut) {
        require(amountIn > 0, "Invalid input amount");
        require(recipient != address(0), "Invalid recipient");
        
        // Get pool configuration
        bytes32 poolKeyId = poolKeyIds[tokenIn][tokenOut];
        require(poolKeyId != bytes32(0), "Pool not configured");
        
        IPoolManager.PoolKey memory poolKey = poolKeys[poolKeyId];
        
        // Transfer tokens from sender to this contract
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        
        // Approve Permit2 to spend tokens
        IERC20(tokenIn).safeIncreaseAllowance(PERMIT2, amountIn);
        
        // Approve Universal Router through Permit2
        IPermit2(PERMIT2).approve(
            tokenIn,
            UNIVERSAL_ROUTER,
            uint160(amountIn),
            uint48(block.timestamp + 3600) // 1 hour expiration
        );
        
        // Encode swap parameters for Universal Router
        bytes memory commands = abi.encodePacked(
            COMMANDS_SWAP,    // Execute swap
            COMMANDS_SETTLE,  // Settle tokens
            COMMANDS_TAKE     // Take output tokens
        );
        
        // Prepare swap inputs
        bool zeroForOne = tokenIn == poolKey.currency0;
        
        bytes[] memory inputs = new bytes[](3);
        
        // Encode V4_SWAP parameters
        inputs[0] = abi.encode(
            poolKey,
            zeroForOne,
            int256(amountIn),
            uint160(0), // No price limit
            bytes("") // No hook data
        );
        
        // Encode SETTLE parameters (settle all input tokens)
        inputs[1] = abi.encode(tokenIn, amountIn, true); // payerIsUser = true
        
        // Encode TAKE parameters (take all output tokens)
        inputs[2] = abi.encode(tokenOut, recipient, amountOutMinimum);
        
        // Execute swap through Universal Router
        uint256 balanceBefore = IERC20(tokenOut).balanceOf(recipient);
        
        IUniversalRouter(UNIVERSAL_ROUTER).execute(commands, inputs);
        
        uint256 balanceAfter = IERC20(tokenOut).balanceOf(recipient);
        amountOut = balanceAfter - balanceBefore;
        
        require(amountOut >= amountOutMinimum, "Insufficient output amount");
        
        emit SwapExecuted(msg.sender, tokenIn, tokenOut, amountIn, amountOut);
    }
    
    /// @notice Get quote for swap through Quoter contract
    /// @param tokenIn Input token
    /// @param tokenOut Output token
    /// @param amountIn Input amount
    /// @return amountOut Estimated output amount
    function getQuote(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external returns (uint256 amountOut) {
        bytes32 poolKeyId = poolKeyIds[tokenIn][tokenOut];
        require(poolKeyId != bytes32(0), "Pool not configured");
        
        IPoolManager.PoolKey memory poolKey = poolKeys[poolKeyId];
        
        IQuoter.ExactInputSingleParams memory params = IQuoter.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: poolKey.fee,
            recipient: address(this),
            amountIn: amountIn,
            amountOutMinimum: 0,
            sqrtPriceLimitX96: 0
        });
        
        // Call quoter for accurate quote
        amountOut = IQuoter(QUOTER).quoteExactInputSingle(params);
        
        // Apply slippage tolerance
        uint256 slippageAmount = (amountOut * slippageTolerance) / BASIS_POINTS;
        amountOut = amountOut - slippageAmount;
    }
    
    /// @notice Initialize a pool with starting price
    /// @param tokenA First token
    /// @param tokenB Second token
    /// @param fee Fee tier
    /// @param sqrtPriceX96 Initial sqrt price
    function initializePool(
        address tokenA,
        address tokenB,
        uint24 fee,
        uint160 sqrtPriceX96
    ) external onlyOwner {
        bytes32 poolKeyId = poolKeyIds[tokenA][tokenB];
        require(poolKeyId != bytes32(0), "Pool not configured");
        
        IPoolManager.PoolKey memory poolKey = poolKeys[poolKeyId];
        
        IPoolManager(POOL_MANAGER).initialize(
            poolKey,
            sqrtPriceX96,
            bytes("")
        );
    }
    
    /// @notice Direct swap through PoolManager for advanced users
    /// @param tokenIn Input token
    /// @param tokenOut Output token
    /// @param amountIn Amount to swap
    /// @param minAmountOut Minimum output
    /// @return amountOut Output amount
    function directPoolSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) external returns (uint256 amountOut) {
        bytes32 poolKeyId = poolKeyIds[tokenIn][tokenOut];
        require(poolKeyId != bytes32(0), "Pool not configured");
        
        IPoolManager.PoolKey memory poolKey = poolKeys[poolKeyId];
        bool zeroForOne = tokenIn == poolKey.currency0;
        
        // Transfer tokens
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).safeIncreaseAllowance(POOL_MANAGER, amountIn);
        
        // Prepare swap params
        IPoolManager.SwapParams memory params = IPoolManager.SwapParams({
            poolKey: poolKey,
            zeroForOne: zeroForOne,
            amountSpecified: int256(amountIn),
            sqrtPriceLimitX96: 0,
            hookData: bytes("")
        });
        
        // Execute swap
        (int256 amount0, int256 amount1) = IPoolManager(POOL_MANAGER).swap(
            poolKey,
            params,
            bytes("")
        );
        
        // Calculate output
        amountOut = uint256(zeroForOne ? -amount1 : -amount0);
        require(amountOut >= minAmountOut, "Slippage exceeded");
        
        // Transfer output tokens
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);
        
        emit SwapExecuted(msg.sender, tokenIn, tokenOut, amountIn, amountOut);
    }
    
    /// @notice Update slippage tolerance
    /// @param _slippageTolerance New slippage tolerance in basis points
    function setSlippageTolerance(uint256 _slippageTolerance) external onlyOwner {
        require(_slippageTolerance <= 1000, "Slippage too high"); // Max 10%
        slippageTolerance = _slippageTolerance;
    }
    
    /// @notice Check if a pool is configured
    /// @param tokenA First token
    /// @param tokenB Second token
    /// @return bool True if pool exists
    function hasPool(address tokenA, address tokenB) external view returns (bool) {
        return poolKeyIds[tokenA][tokenB] != bytes32(0);
    }
    
    /// @notice Get pool details
    /// @param tokenA First token
    /// @param tokenB Second token
    /// @return poolKey The pool configuration
    function getPool(address tokenA, address tokenB) external view returns (IPoolManager.PoolKey memory) {
        bytes32 poolKeyId = poolKeyIds[tokenA][tokenB];
        require(poolKeyId != bytes32(0), "Pool not found");
        return poolKeys[poolKeyId];
    }
    
    /// @notice Emergency token recovery
    /// @param token Token address
    /// @param amount Amount to recover
    function recoverToken(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }
}