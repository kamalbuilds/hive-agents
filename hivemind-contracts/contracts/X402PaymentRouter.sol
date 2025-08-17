// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./base/OApp.sol";

/**
 * @title X402PaymentRouter
 * @notice Main payment router for x402 microservices with LayerZero integration
 * @dev Routes PYUSD payments cross-chain with automatic token swapping
 */
contract X402PaymentRouter is OApp, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // Core components
    IERC20 public immutable pyusd;
    address public tokenSwapComposer;
    address public pyusdOFTAdapter;
    
    // Service registry
    struct Service {
        address provider;
        string endpoint;
        uint256 pricePerCall;
        address[] acceptedTokens;
        uint32[] supportedChains;
        bool active;
    }
    
    struct PaymentRequest {
        bytes32 serviceId;
        address payer;
        address serviceProvider;
        uint256 amount;
        address requestedToken;
        uint32 destinationChain;
        uint256 timestamp;
        bool completed;
    }
    
    // State
    mapping(bytes32 => Service) public services;
    mapping(address => bytes32[]) public providerServices;
    mapping(bytes32 => PaymentRequest) public paymentRequests;
    uint256 public requestCounter;
    
    // Events
    event ServiceRegistered(
        bytes32 indexed serviceId,
        address indexed provider,
        uint256 price
    );
    
    event PaymentRequested(
        bytes32 indexed requestId,
        bytes32 indexed serviceId,
        address payer,
        uint256 amount,
        address requestedToken,
        uint32 destinationChain
    );
    
    event PaymentCompleted(bytes32 indexed requestId);
    
    event CrossChainPaymentSent(
        bytes32 indexed requestId,
        uint32 destinationChain,
        bytes32 guid
    );
    
    constructor(
        address _pyusd,
        address _endpoint,
        address _delegate
    ) OApp(_endpoint, _delegate) {
        pyusd = IERC20(_pyusd);
    }
    
    /**
     * @notice Register x402 service
     */
    function registerService(
        string calldata _endpoint,
        uint256 _pricePerCall,
        address[] calldata _acceptedTokens,
        uint32[] calldata _supportedChains
    ) external returns (bytes32 serviceId) {
        serviceId = keccak256(abi.encodePacked(msg.sender, _endpoint, block.timestamp));
        
        services[serviceId] = Service({
            provider: msg.sender,
            endpoint: _endpoint,
            pricePerCall: _pricePerCall,
            acceptedTokens: _acceptedTokens,
            supportedChains: _supportedChains,
            active: true
        });
        
        providerServices[msg.sender].push(serviceId);
        emit ServiceRegistered(serviceId, msg.sender, _pricePerCall);
    }
    
    /**
     * @notice Request payment for x402 service
     */
    function requestPayment(
        bytes32 _serviceId,
        address _requestedToken,
        uint32 _destinationChain,
        bytes calldata _options
    ) external payable nonReentrant returns (bytes32 requestId) {
        Service memory service = services[_serviceId];
        require(service.active, "Service not active");
        require(_isTokenAccepted(service, _requestedToken), "Token not accepted");
        require(_isChainSupported(service, _destinationChain), "Chain not supported");
        
        // Transfer PYUSD from payer
        pyusd.safeTransferFrom(msg.sender, address(this), service.pricePerCall);
        
        // Create payment request
        requestId = keccak256(abi.encodePacked(requestCounter++, msg.sender, block.timestamp));
        paymentRequests[requestId] = PaymentRequest({
            serviceId: _serviceId,
            payer: msg.sender,
            serviceProvider: service.provider,
            amount: service.pricePerCall,
            requestedToken: _requestedToken,
            destinationChain: _destinationChain,
            timestamp: block.timestamp,
            completed: false
        });
        
        emit PaymentRequested(
            requestId,
            _serviceId,
            msg.sender,
            service.pricePerCall,
            _requestedToken,
            _destinationChain
        );
        
        // Route payment
        if (_requestedToken != address(pyusd) || _destinationChain != block.chainid) {
            _routeWithSwap(requestId, paymentRequests[requestId], _options);
        } else {
            _routeDirectPayment(requestId, paymentRequests[requestId]);
        }
    }
    
    /**
     * @notice Route payment with token swap via LayerZero
     */
    function _routeWithSwap(
        bytes32 requestId,
        PaymentRequest memory request,
        bytes calldata _options
    ) private {
        // Prepare composed message for swap
        bytes memory composeMsg = abi.encode(
            request.serviceProvider,
            request.amount,
            request.requestedToken,
            request.amount * 99 / 100 // 1% slippage
        );
        
        // Send via LayerZero with composition
        bytes32 guid = _lzSend(
            request.destinationChain,
            abi.encode(requestId, request.serviceProvider, request.amount),
            _options,
            MessagingFee(msg.value, 0),
            payable(msg.sender),
            composeMsg
        );
        
        emit CrossChainPaymentSent(requestId, request.destinationChain, guid);
    }
    
    /**
     * @notice Route direct PYUSD payment on same chain
     */
    function _routeDirectPayment(bytes32 requestId, PaymentRequest memory request) private {
        pyusd.safeTransfer(request.serviceProvider, request.amount);
        paymentRequests[requestId].completed = true;
        emit PaymentCompleted(requestId);
    }
    
    /**
     * @notice Receive cross-chain payment confirmation
     */
    function _lzReceive(
        Origin calldata _origin,
        bytes32 _guid,
        bytes calldata _message,
        address _executor,
        bytes calldata _extraData
    ) internal override {
        (bytes32 requestId, address provider, uint256 amount) = 
            abi.decode(_message, (bytes32, address, uint256));
        
        // Mark payment as completed
        paymentRequests[requestId].completed = true;
        emit PaymentCompleted(requestId);
    }
    
    /**
     * @notice Check if token is accepted by service
     */
    function _isTokenAccepted(
        Service memory service,
        address token
    ) private pure returns (bool) {
        for (uint i = 0; i < service.acceptedTokens.length; i++) {
            if (service.acceptedTokens[i] == token) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * @notice Check if chain is supported by service
     */
    function _isChainSupported(
        Service memory service,
        uint32 chainId
    ) private pure returns (bool) {
        for (uint i = 0; i < service.supportedChains.length; i++) {
            if (service.supportedChains[i] == chainId) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * @notice Quote cross-chain payment fee
     */
    function quotePayment(
        bytes32 _serviceId,
        uint32 _destinationChain,
        bytes calldata _options
    ) external view returns (MessagingFee memory fee) {
        Service memory service = services[_serviceId];
        
        return _quote(
            _destinationChain,
            abi.encode(_serviceId, service.provider, service.pricePerCall),
            _options,
            false
        );
    }
    
    /**
     * @notice Set token swap composer address
     */
    function setTokenSwapComposer(address _composer) external onlyOwner {
        tokenSwapComposer = _composer;
    }
    
    /**
     * @notice Set PYUSD OFT adapter address
     */
    function setPYUSDOFTAdapter(address _adapter) external onlyOwner {
        pyusdOFTAdapter = _adapter;
    }
    
    /**
     * @notice Update service status
     */
    function updateServiceStatus(bytes32 _serviceId, bool _active) external {
        require(services[_serviceId].provider == msg.sender, "Not service owner");
        services[_serviceId].active = _active;
    }
    
    /**
     * @notice Emergency token recovery
     */
    function recoverTokens(address _token, uint256 _amount) external onlyOwner {
        IERC20(_token).safeTransfer(owner(), _amount);
    }
}