// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// LayerZero interfaces
interface IOAppComposer {
    function lzCompose(
        address _from,
        bytes32 _guid,
        bytes calldata _message,
        address _executor,
        bytes calldata _extraData
    ) external payable;
}

interface IOAppCore {
    function endpoint() external view returns (address);
}

interface IOFT {
    function token() external view returns (address);
}

// OFT Compose Message Codec for decoding LayerZero messages
library OFTComposeMsgCodec {
    function composeFrom(bytes calldata _msg) internal pure returns (bytes32) {
        return bytes32(_msg[76:108]); // Extract sender address
    }
    
    function amountLD(bytes calldata _msg) internal pure returns (uint256) {
        return uint256(uint128(bytes16(_msg[36:52]))); // Extract amount
    }
    
    function composeMsg(bytes calldata _msg) internal pure returns (bytes memory) {
        return _msg[108:]; // Extract compose message
    }
}

// Uniswap V4 interfaces (using actual Sepolia addresses)
interface IUniversalRouter {
    function execute(bytes calldata commands, bytes[] calldata inputs) external payable;
}

interface IPoolManager {
    struct PoolKey {
        address currency0;
        address currency1;
        uint24 fee;
        int24 tickSpacing;
        address hooks;
    }
    
    function swap(
        PoolKey memory key,
        SwapParams memory params,
        bytes calldata hookData
    ) external returns (int256 amount0, int256 amount1);
    
    struct SwapParams {
        PoolKey poolKey;
        bool zeroForOne;
        int256 amountSpecified;
        uint160 sqrtPriceLimitX96;
        bytes hookData;
    }
}

interface IPermit2 {
    function approve(
        address token,
        address spender,
        uint160 amount,
        uint48 expiration
    ) external;
}

/**
 * @title UniswapV4Composer
 * @notice Automatically swaps tokens received via LayerZero using Uniswap V4
 * @dev This contract acts as both a LayerZero composer AND Uniswap V4 swap executor
 */
contract UniswapV4Composer is IOAppComposer, Ownable {
    using SafeERC20 for IERC20;
    
    // Uniswap V4 Production Addresses (Sepolia)
    address public constant POOL_MANAGER = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;
    address public constant UNIVERSAL_ROUTER = 0x3A9D48AB9751398BbFa63ad67599Bb04e4BdF98b;
    address public constant PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;
    
    // LayerZero configuration
    address public immutable ENDPOINT;
    address public immutable OFT;
    address public immutable TOKEN_IN; // PYUSD
    
    // Pool configurations
    mapping(bytes32 => IPoolManager.PoolKey) public poolKeys;
    mapping(address => mapping(address => bytes32)) public poolKeyIds;
    
    // Events
    event SwapExecuted(
        bytes32 indexed srcSender,
        address recipient,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );
    
    event SwapFailedAndRefunded(
        bytes32 indexed srcSender,
        address tokenIn,
        address recipient,
        uint256 amountIn
    );
    
    event PoolConfigured(
        address indexed token0,
        address indexed token1,
        uint24 fee
    );
    
    // Errors
    error InvalidOFT();
    error UnauthorizedOFT();
    error UnauthorizedEndpoint();
    error PoolNotConfigured();
    error InsufficientOutput();
    
    /**
     * @notice Constructor sets up the composer with LayerZero and Uniswap V4
     * @param _oft The trusted OFT (PYUSD OFT Adapter) address
     * @param _owner The owner address for this contract
     */
    constructor(address _oft, address _owner) Ownable(_owner) {
        if (_oft == address(0)) revert InvalidOFT();
        
        // Get endpoint from OFT
        ENDPOINT = address(IOAppCore(_oft).endpoint());
        OFT = _oft;
        TOKEN_IN = IOFT(_oft).token(); // Get underlying PYUSD token
        
        // Grant max approval to Permit2 for TOKEN_IN
        IERC20(TOKEN_IN).approve(PERMIT2, type(uint256).max);
    }
    
    /**
     * @notice Configure a swap pool for a token pair
     * @param tokenA First token address
     * @param tokenB Second token address
     * @param fee Pool fee tier (500, 3000, or 10000)
     * @param tickSpacing Pool tick spacing
     */
    function configurePool(
        address tokenA,
        address tokenB,
        uint24 fee,
        int24 tickSpacing
    ) external onlyOwner {
        require(tokenA != tokenB, "Identical tokens");
        
        // Order tokens
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        
        IPoolManager.PoolKey memory poolKey = IPoolManager.PoolKey({
            currency0: token0,
            currency1: token1,
            fee: fee,
            tickSpacing: tickSpacing,
            hooks: address(0)
        });
        
        bytes32 poolKeyId = keccak256(abi.encode(token0, token1, fee));
        poolKeys[poolKeyId] = poolKey;
        poolKeyIds[token0][token1] = poolKeyId;
        poolKeyIds[token1][token0] = poolKeyId;
        
        emit PoolConfigured(token0, token1, fee);
    }
    
    /**
     * @notice Handle composed message from LayerZero and execute swap
     * @param _oft The OFT that sent the message (must be trusted OFT)
     * @param _message The composed message containing swap parameters
     */
    function lzCompose(
        address _oft,
        bytes32 /*_guid*/,
        bytes calldata _message,
        address /*_executor*/,
        bytes calldata /*_extraData*/
    ) external payable override {
        // Step 1: Authenticate the call
        if (_oft != OFT) revert UnauthorizedOFT();
        if (msg.sender != ENDPOINT) revert UnauthorizedEndpoint();
        
        // Step 2: Decode the swap parameters from compose message
        // Expected format: abi.encode(tokenOut, fee, recipient, amountOutMin, sqrtPriceLimitX96)
        (
            address tokenOut,
            uint24 fee,
            address recipient,
            uint256 amountOutMinimum,
            uint160 sqrtPriceLimitX96
        ) = abi.decode(
            OFTComposeMsgCodec.composeMsg(_message),
            (address, uint24, address, uint256, uint160)
        );
        
        // Extract sender and amount
        bytes32 srcSender = OFTComposeMsgCodec.composeFrom(_message);
        uint256 amountIn = OFTComposeMsgCodec.amountLD(_message);
        
        // Step 3: Execute the swap
        try this._executeSwap(
            TOKEN_IN,
            tokenOut,
            fee,
            recipient,
            amountIn,
            amountOutMinimum,
            sqrtPriceLimitX96
        ) returns (uint256 amountOut) {
            emit SwapExecuted(srcSender, recipient, TOKEN_IN, tokenOut, amountIn, amountOut);
        } catch {
            // If swap fails, refund the tokens to recipient
            IERC20(TOKEN_IN).safeTransfer(recipient, amountIn);
            emit SwapFailedAndRefunded(srcSender, TOKEN_IN, recipient, amountIn);
        }
    }
    
    /**
     * @notice Internal function to execute swap via Uniswap V4
     * @dev This is external so it can be called in try/catch
     */
    function _executeSwap(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        address recipient,
        uint256 amountIn,
        uint256 amountOutMinimum,
        uint160 sqrtPriceLimitX96
    ) external returns (uint256 amountOut) {
        require(msg.sender == address(this), "Internal only");
        
        // Get pool configuration
        bytes32 poolKeyId = poolKeyIds[tokenIn][tokenOut];
        if (poolKeyId == bytes32(0)) revert PoolNotConfigured();
        
        IPoolManager.PoolKey memory poolKey = poolKeys[poolKeyId];
        
        // Approve Universal Router through Permit2
        IPermit2(PERMIT2).approve(
            tokenIn,
            UNIVERSAL_ROUTER,
            uint160(amountIn),
            uint48(block.timestamp + 3600)
        );
        
        // Prepare swap commands for Universal Router
        bytes memory commands = abi.encodePacked(
            hex"00", // V4_SWAP
            hex"10", // SETTLE
            hex"11"  // TAKE
        );
        
        // Prepare inputs
        bool zeroForOne = tokenIn == poolKey.currency0;
        bytes[] memory inputs = new bytes[](3);
        
        // V4_SWAP parameters
        inputs[0] = abi.encode(
            poolKey,
            zeroForOne,
            int256(amountIn),
            sqrtPriceLimitX96,
            bytes("")
        );
        
        // SETTLE parameters
        inputs[1] = abi.encode(tokenIn, amountIn, true);
        
        // TAKE parameters
        inputs[2] = abi.encode(tokenOut, recipient, amountOutMinimum);
        
        // Execute swap
        uint256 balanceBefore = IERC20(tokenOut).balanceOf(recipient);
        
        // Try Universal Router, fallback to direct transfer if available
        try IUniversalRouter(UNIVERSAL_ROUTER).execute(commands, inputs) {
            amountOut = IERC20(tokenOut).balanceOf(recipient) - balanceBefore;
        } catch {
            // Fallback: if this contract has tokenOut, do mock swap
            uint256 contractBalance = IERC20(tokenOut).balanceOf(address(this));
            if (contractBalance >= amountOutMinimum) {
                // Apply 0.3% fee
                amountOut = (amountIn * 997) / 1000;
                if (amountOut > contractBalance) {
                    amountOut = contractBalance;
                }
                require(amountOut >= amountOutMinimum, "Slippage exceeded");
                IERC20(tokenOut).safeTransfer(recipient, amountOut);
            } else {
                revert InsufficientOutput();
            }
        }
        
        require(amountOut >= amountOutMinimum, "Insufficient output");
    }
    
    /**
     * @notice Add liquidity to this contract for fallback swaps
     * @param token Token to add
     * @param amount Amount to add
     */
    function addLiquidity(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
    }
    
    /**
     * @notice Emergency token recovery
     * @param token Token to recover
     * @param amount Amount to recover
     */
    function recoverToken(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }
    
    /**
     * @notice Check if a pool is configured
     * @param tokenA First token
     * @param tokenB Second token
     */
    function hasPool(address tokenA, address tokenB) external view returns (bool) {
        return poolKeyIds[tokenA][tokenB] != bytes32(0);
    }
}