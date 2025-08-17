// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/ILayerZeroEndpoint.sol";

/**
 * @title SimplePYUSDRouter
 * @notice Simplified cross-chain PYUSD payment router for x402 services
 * @dev Handles PYUSD payments and cross-chain routing via LayerZero
 */
contract SimplePYUSDRouter is Ownable, ReentrancyGuard {
    // State variables
    IERC20 public immutable pyusd;
    ILayerZeroEndpoint public immutable lzEndpoint;
    
    // Chain configuration
    mapping(uint32 => address) public trustedRemotes;
    mapping(uint32 => bool) public supportedChains;
    
    // Service registry
    struct Service {
        address provider;
        string endpoint;
        uint256 pricePerCall;
        address acceptedToken;
        bool active;
    }
    
    mapping(bytes32 => Service) public services;
    mapping(address => bytes32[]) public providerServices;
    
    // Payment tracking
    struct Payment {
        bytes32 serviceId;
        address payer;
        uint256 amount;
        uint32 destinationChain;
        uint256 timestamp;
        bool completed;
    }
    
    mapping(bytes32 => Payment) public payments;
    uint256 public paymentCounter;
    
    // Events
    event ServiceRegistered(bytes32 indexed serviceId, address indexed provider, uint256 price);
    event PaymentInitiated(bytes32 indexed paymentId, bytes32 indexed serviceId, address payer, uint256 amount);
    event CrossChainPaymentSent(bytes32 indexed paymentId, uint32 destinationChain, bytes32 guid);
    event PaymentCompleted(bytes32 indexed paymentId);
    
    constructor(address _pyusd, address _lzEndpoint) Ownable(msg.sender) {
        pyusd = IERC20(_pyusd);
        lzEndpoint = ILayerZeroEndpoint(_lzEndpoint);
    }
    
    /**
     * @notice Register a new x402 service
     */
    function registerService(
        string calldata endpoint,
        uint256 pricePerCall,
        address acceptedToken
    ) external returns (bytes32 serviceId) {
        serviceId = keccak256(abi.encodePacked(msg.sender, endpoint, block.timestamp));
        
        services[serviceId] = Service({
            provider: msg.sender,
            endpoint: endpoint,
            pricePerCall: pricePerCall,
            acceptedToken: acceptedToken,
            active: true
        });
        
        providerServices[msg.sender].push(serviceId);
        emit ServiceRegistered(serviceId, msg.sender, pricePerCall);
    }
    
    /**
     * @notice Pay for a service with PYUSD
     */
    function payForService(
        bytes32 serviceId,
        uint32 destinationChain
    ) external payable nonReentrant returns (bytes32 paymentId) {
        Service memory service = services[serviceId];
        require(service.active, "Service not active");
        
        // Transfer PYUSD from payer
        require(
            pyusd.transferFrom(msg.sender, address(this), service.pricePerCall),
            "PYUSD transfer failed"
        );
        
        // Create payment record
        paymentId = keccak256(abi.encodePacked(paymentCounter++, msg.sender, block.timestamp));
        payments[paymentId] = Payment({
            serviceId: serviceId,
            payer: msg.sender,
            amount: service.pricePerCall,
            destinationChain: destinationChain,
            timestamp: block.timestamp,
            completed: false
        });
        
        emit PaymentInitiated(paymentId, serviceId, msg.sender, service.pricePerCall);
        
        // If cross-chain, initiate LayerZero transfer
        if (destinationChain != 0 && destinationChain != block.chainid) {
            _sendCrossChainPayment(paymentId, service, destinationChain);
        } else {
            // Direct payment on same chain
            _completePayment(paymentId, service);
        }
    }
    
    /**
     * @notice Send cross-chain payment via LayerZero
     */
    function _sendCrossChainPayment(
        bytes32 paymentId,
        Service memory service,
        uint32 destinationChain
    ) private {
        require(supportedChains[destinationChain], "Chain not supported");
        require(trustedRemotes[destinationChain] != address(0), "Remote not set");
        
        // Encode payment message
        bytes memory payload = abi.encode(
            paymentId,
            service.provider,
            service.pricePerCall,
            service.acceptedToken
        );
        
        // Prepare LayerZero message
        ILayerZeroEndpoint.MessagingParams memory params = ILayerZeroEndpoint.MessagingParams({
            dstEid: destinationChain,
            receiver: bytes32(uint256(uint160(trustedRemotes[destinationChain]))),
            message: payload,
            options: abi.encodePacked(uint16(1), uint256(200000)), // Gas limit
            payInLzToken: false
        });
        
        // Quote and send
        ILayerZeroEndpoint.MessagingFee memory fee = lzEndpoint.quote(params, address(this));
        require(msg.value >= fee.nativeFee, "Insufficient fee");
        
        ILayerZeroEndpoint.MessagingReceipt memory receipt = lzEndpoint.send{value: fee.nativeFee}(
            params,
            msg.sender
        );
        
        emit CrossChainPaymentSent(paymentId, destinationChain, receipt.guid);
    }
    
    /**
     * @notice Complete payment on current chain
     */
    function _completePayment(bytes32 paymentId, Service memory service) private {
        // Transfer to service provider
        require(
            pyusd.transfer(service.provider, service.pricePerCall),
            "Provider payment failed"
        );
        
        payments[paymentId].completed = true;
        emit PaymentCompleted(paymentId);
    }
    
    /**
     * @notice Receive cross-chain message from LayerZero
     */
    function lzReceive(
        ILayerZeroEndpoint.Origin calldata _origin,
        bytes32 _guid,
        bytes calldata _message,
        address _executor,
        bytes calldata _extraData
    ) external {
        require(msg.sender == address(lzEndpoint), "Invalid endpoint");
        require(trustedRemotes[_origin.srcEid] != address(0), "Untrusted source");
        
        // Decode and process payment
        (bytes32 paymentId, address provider, uint256 amount, address token) = 
            abi.decode(_message, (bytes32, address, uint256, address));
        
        // Handle token swap if needed
        if (token != address(pyusd)) {
            // Swap PYUSD to requested token
            _swapAndTransfer(provider, amount, token);
        } else {
            // Direct PYUSD transfer
            require(pyusd.transfer(provider, amount), "Transfer failed");
        }
        
        emit PaymentCompleted(paymentId);
    }
    
    /**
     * @notice Swap PYUSD to requested token and transfer
     */
    function _swapAndTransfer(address recipient, uint256 amount, address targetToken) private {
        // Simplified swap logic - in production would integrate with DEX
        // For now, just transfer PYUSD
        require(pyusd.transfer(recipient, amount), "Transfer failed");
    }
    
    // Admin functions
    function setTrustedRemote(uint32 _chainId, address _remote) external onlyOwner {
        trustedRemotes[_chainId] = _remote;
        supportedChains[_chainId] = true;
    }
    
    function withdrawStuckTokens(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner(), amount);
    }
}