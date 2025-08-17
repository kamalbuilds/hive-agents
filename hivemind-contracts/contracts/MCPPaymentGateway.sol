// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IX402PaymentRouter {
    function requestPayment(
        address _serviceProvider,
        uint256 _amount,
        string memory _requestedToken,
        uint32 _destinationChain,
        bytes calldata _serviceData
    ) external payable returns (bytes32 requestId);
    
    function registerService(
        string memory _serviceName,
        address _endpoint,
        uint256 _fee
    ) external;
}

interface IHiveMindCoordinator {
    function registerAgent(string memory endpoint, string[] memory capabilities) external;
    function createTask(string memory taskType, string memory ipfsHash, uint256 reward) external returns (uint256);
}

/**
 * @title MCPPaymentGateway
 * @notice Gateway for MCP (Model Context Protocol) services to receive payments
 * @dev Integrates with x402 protocol and LayerZero for cross-chain payments
 */
contract MCPPaymentGateway is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // MCP Service structure
    struct MCPService {
        string serviceName;
        address provider;
        string[] acceptedTokens;
        uint256 baseFee;
        uint32[] supportedChains;
        bool isActive;
        uint256 totalEarned;
        uint256 requestsServed;
    }
    
    // Payment request from MCP
    struct MCPPaymentRequest {
        bytes32 requestId;
        address mcp;
        address payer;
        string requestedToken;
        uint256 amount;
        uint32 targetChain;
        bytes serviceData;
        uint256 timestamp;
        RequestStatus status;
    }
    
    enum RequestStatus {
        Pending,
        Processing,
        Paid,
        Failed,
        Refunded
    }
    
    // State variables
    IX402PaymentRouter public paymentRouter;
    IHiveMindCoordinator public hiveMindCoordinator;
    IERC20 public pyusd;
    
    // MCP registry
    mapping(address => MCPService) public mcpServices;
    mapping(bytes32 => MCPPaymentRequest) public paymentRequests;
    mapping(address => bytes32[]) public mcpRequestHistory;
    mapping(string => address[]) public tokenToMCPs; // Token symbol => MCPs accepting it
    
    // Service discovery
    address[] public registeredMCPs;
    mapping(string => bool) public supportedTokens;
    
    // Events
    event MCPRegistered(
        address indexed mcp,
        string serviceName,
        string[] acceptedTokens,
        uint256 baseFee
    );
    
    event PaymentRequested(
        bytes32 indexed requestId,
        address indexed mcp,
        address indexed payer,
        string requestedToken,
        uint256 amount
    );
    
    event PaymentProcessed(
        bytes32 indexed requestId,
        address mcp,
        string token,
        uint256 amount,
        uint32 chain
    );
    
    event ServiceDiscoveryUpdated(
        address indexed mcp,
        string[] tokens,
        uint32[] chains
    );
    
    constructor(
        address _paymentRouter,
        address _hiveMindCoordinator,
        address _pyusd
    ) Ownable(msg.sender) {
        paymentRouter = IX402PaymentRouter(_paymentRouter);
        hiveMindCoordinator = IHiveMindCoordinator(_hiveMindCoordinator);
        pyusd = IERC20(_pyusd);
        
        _initializeSupportedTokens();
    }
    
    /**
     * @notice Initialize commonly supported tokens
     */
    function _initializeSupportedTokens() private {
        supportedTokens["PYUSD"] = true;
        supportedTokens["USDC"] = true;
        supportedTokens["USDT"] = true;
        supportedTokens["DAI"] = true;
    }
    
    /**
     * @notice Register MCP service
     * @param _serviceName Name of the MCP service
     * @param _acceptedTokens Array of accepted token symbols
     * @param _baseFee Base fee for the service
     * @param _supportedChains Array of supported chain IDs
     */
    function registerMCP(
        string memory _serviceName,
        string[] memory _acceptedTokens,
        uint256 _baseFee,
        uint32[] memory _supportedChains
    ) external {
        require(bytes(_serviceName).length > 0, "Invalid service name");
        require(_acceptedTokens.length > 0, "No tokens specified");
        require(_baseFee > 0, "Invalid base fee");
        require(_supportedChains.length > 0, "No chains specified");
        
        MCPService storage mcp = mcpServices[msg.sender];
        mcp.serviceName = _serviceName;
        mcp.provider = msg.sender;
        mcp.acceptedTokens = _acceptedTokens;
        mcp.baseFee = _baseFee;
        mcp.supportedChains = _supportedChains;
        mcp.isActive = true;
        
        // Register with payment router
        paymentRouter.registerService(_serviceName, msg.sender, _baseFee);
        
        // Update token mappings
        for (uint i = 0; i < _acceptedTokens.length; i++) {
            tokenToMCPs[_acceptedTokens[i]].push(msg.sender);
        }
        
        // Register as agent in HiveMind
        string[] memory capabilities = new string[](1);
        capabilities[0] = _serviceName;
        hiveMindCoordinator.registerAgent(
            string(abi.encodePacked("mcp://", _serviceName)),
            capabilities
        );
        
        registeredMCPs.push(msg.sender);
        
        emit MCPRegistered(msg.sender, _serviceName, _acceptedTokens, _baseFee);
        emit ServiceDiscoveryUpdated(msg.sender, _acceptedTokens, _supportedChains);
    }
    
    /**
     * @notice Request payment for MCP service
     * @param _mcp MCP service provider address
     * @param _requestedToken Token requested by MCP
     * @param _amount Payment amount
     * @param _targetChain Target chain for payment
     * @param _serviceData Additional service data
     */
    function requestMCPPayment(
        address _mcp,
        string memory _requestedToken,
        uint256 _amount,
        uint32 _targetChain,
        bytes calldata _serviceData
    ) external payable nonReentrant returns (bytes32 requestId) {
        MCPService memory mcp = mcpServices[_mcp];
        require(mcp.isActive, "MCP not active");
        require(_amount >= mcp.baseFee, "Amount below base fee");
        require(_isTokenAccepted(_mcp, _requestedToken), "Token not accepted");
        require(_isChainSupported(_mcp, _targetChain), "Chain not supported");
        
        // Generate request ID
        requestId = keccak256(
            abi.encodePacked(
                msg.sender,
                _mcp,
                _requestedToken,
                _amount,
                _targetChain,
                block.timestamp
            )
        );
        
        // Create payment request
        paymentRequests[requestId] = MCPPaymentRequest({
            requestId: requestId,
            mcp: _mcp,
            payer: msg.sender,
            requestedToken: _requestedToken,
            amount: _amount,
            targetChain: _targetChain,
            serviceData: _serviceData,
            timestamp: block.timestamp,
            status: RequestStatus.Processing
        });
        
        mcpRequestHistory[_mcp].push(requestId);
        
        emit PaymentRequested(requestId, _mcp, msg.sender, _requestedToken, _amount);
        
        // Process payment through router
        _processPayment(requestId);
        
        return requestId;
    }
    
    /**
     * @notice Process payment through x402 router
     */
    function _processPayment(bytes32 _requestId) private {
        MCPPaymentRequest storage request = paymentRequests[_requestId];
        
        // Transfer PYUSD from payer
        pyusd.safeTransferFrom(request.payer, address(this), request.amount);
        
        // Approve router (reset allowance first for safety)
        pyusd.safeIncreaseAllowance(address(paymentRouter), request.amount);
        
        // Route payment with automatic swap if needed
        bytes32 routerRequestId = paymentRouter.requestPayment{value: msg.value}(
            request.mcp,
            request.amount,
            request.requestedToken,
            request.targetChain,
            request.serviceData
        );
        
        // Update status
        request.status = RequestStatus.Paid;
        
        // Update MCP stats
        MCPService storage mcp = mcpServices[request.mcp];
        mcp.totalEarned += request.amount;
        mcp.requestsServed++;
        
        emit PaymentProcessed(
            _requestId,
            request.mcp,
            request.requestedToken,
            request.amount,
            request.targetChain
        );
    }
    
    /**
     * @notice Check if token is accepted by MCP
     */
    function _isTokenAccepted(address _mcp, string memory _token) 
        private 
        view 
        returns (bool) 
    {
        MCPService memory mcp = mcpServices[_mcp];
        for (uint i = 0; i < mcp.acceptedTokens.length; i++) {
            if (keccak256(bytes(mcp.acceptedTokens[i])) == keccak256(bytes(_token))) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * @notice Check if chain is supported by MCP
     */
    function _isChainSupported(address _mcp, uint32 _chain) 
        private 
        view 
        returns (bool) 
    {
        MCPService memory mcp = mcpServices[_mcp];
        for (uint i = 0; i < mcp.supportedChains.length; i++) {
            if (mcp.supportedChains[i] == _chain) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * @notice Get MCPs accepting specific token
     */
    function getMCPsByToken(string memory _token) 
        external 
        view 
        returns (address[] memory) 
    {
        return tokenToMCPs[_token];
    }
    
    /**
     * @notice Get MCP service details
     */
    function getMCPService(address _mcp) 
        external 
        view 
        returns (MCPService memory) 
    {
        return mcpServices[_mcp];
    }
    
    /**
     * @notice Get payment request details
     */
    function getPaymentRequest(bytes32 _requestId) 
        external 
        view 
        returns (MCPPaymentRequest memory) 
    {
        return paymentRequests[_requestId];
    }
    
    /**
     * @notice Get MCP request history
     */
    function getMCPRequestHistory(address _mcp) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        return mcpRequestHistory[_mcp];
    }
    
    /**
     * @notice Update MCP service fee
     */
    function updateServiceFee(uint256 _newFee) external {
        require(_newFee > 0, "Invalid fee");
        MCPService storage mcp = mcpServices[msg.sender];
        require(mcp.isActive, "MCP not registered");
        
        mcp.baseFee = _newFee;
    }
    
    /**
     * @notice Add accepted token
     */
    function addAcceptedToken(string memory _token) external {
        MCPService storage mcp = mcpServices[msg.sender];
        require(mcp.isActive, "MCP not registered");
        require(supportedTokens[_token], "Token not supported");
        
        mcp.acceptedTokens.push(_token);
        tokenToMCPs[_token].push(msg.sender);
    }
    
    /**
     * @notice Add supported chain
     */
    function addSupportedChain(uint32 _chain) external {
        MCPService storage mcp = mcpServices[msg.sender];
        require(mcp.isActive, "MCP not registered");
        
        mcp.supportedChains.push(_chain);
    }
    
    /**
     * @notice Deactivate MCP service
     */
    function deactivateMCP() external {
        MCPService storage mcp = mcpServices[msg.sender];
        require(mcp.isActive, "MCP not active");
        
        mcp.isActive = false;
    }
    
    /**
     * @notice Get all registered MCPs
     */
    function getRegisteredMCPs() external view returns (address[] memory) {
        return registeredMCPs;
    }
    
    /**
     * @notice Update router address
     */
    function updatePaymentRouter(address _newRouter) external onlyOwner {
        paymentRouter = IX402PaymentRouter(_newRouter);
    }
    
    /**
     * @notice Emergency withdrawal
     */
    function emergencyWithdraw(address _token, uint256 _amount) external onlyOwner {
        IERC20(_token).safeTransfer(owner(), _amount);
    }
}