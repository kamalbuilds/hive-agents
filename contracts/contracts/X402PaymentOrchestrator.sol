// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { OApp, Origin, MessagingFee } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import { OAppOptionsType3 } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title X402PaymentOrchestrator
 * @notice Omnichain payment orchestration for x402 service using PYUSD
 * @dev Implements advanced LayerZero messaging for cross-chain payment coordination
 */
contract X402PaymentOrchestrator is OApp, OAppOptionsType3 {
    using SafeERC20 for IERC20;

    // Payment state management
    struct Payment {
        address payer;
        address recipient;
        uint256 amount;
        uint32 sourceChainId;
        uint32 destinationChainId;
        uint256 timestamp;
        PaymentStatus status;
        bytes32 serviceId;
        bytes metadata;
    }

    struct ServiceAccount {
        uint256 balance;
        uint256 totalSpent;
        uint256 totalReceived;
        uint32[] activeChains;
        mapping(uint32 => uint256) chainBalances;
        bool isActive;
    }

    enum PaymentStatus {
        Pending,
        Processing,
        Completed,
        Failed,
        Refunded
    }

    // State variables
    IERC20 public immutable pyusd;
    uint256 public paymentNonce;
    mapping(bytes32 => Payment) public payments;
    mapping(address => ServiceAccount) public serviceAccounts;
    mapping(uint32 => address) public chainOrchestrators;
    mapping(bytes32 => bool) public processedMessages;

    // Cross-chain governance
    mapping(uint32 => mapping(address => bool)) public validators;
    uint256 public requiredValidations = 2;

    // Events
    event PaymentInitiated(
        bytes32 indexed paymentId,
        address indexed payer,
        uint256 amount,
        uint32 destinationChain
    );
    
    event PaymentCompleted(
        bytes32 indexed paymentId,
        address indexed recipient,
        uint256 amount
    );
    
    event CrossChainSyncInitiated(
        uint32 indexed targetChain,
        bytes32 syncId,
        bytes data
    );
    
    event ServiceAccountUpdated(
        address indexed account,
        uint256 newBalance,
        uint32 chainId
    );

    event ValidatorAdded(uint32 chainId, address validator);
    event ValidationReceived(bytes32 paymentId, address validator, uint32 chainId);

    // Message types for omnichain communication
    uint16 public constant MSG_TYPE_PAYMENT = 1;
    uint16 public constant MSG_TYPE_SYNC = 2;
    uint16 public constant MSG_TYPE_GOVERNANCE = 3;
    uint16 public constant MSG_TYPE_VALIDATION = 4;

    constructor(
        address _endpoint,
        address _owner,
        address _pyusd
    ) OApp(_endpoint, _owner) Ownable(_owner) {
        pyusd = IERC20(_pyusd);
    }

    /**
     * @notice Initiate a cross-chain payment
     * @param _recipient Recipient address on destination chain
     * @param _amount Amount of PYUSD to transfer
     * @param _dstEid Destination chain endpoint ID
     * @param _serviceId Service identifier for x402
     * @param _metadata Additional payment metadata
     */
    function initiatePayment(
        address _recipient,
        uint256 _amount,
        uint32 _dstEid,
        bytes32 _serviceId,
        bytes calldata _metadata,
        bytes calldata _options
    ) external payable returns (bytes32 paymentId) {
        require(_amount > 0, "Invalid amount");
        require(_recipient != address(0), "Invalid recipient");
        
        // Transfer PYUSD from payer to this contract
        pyusd.safeTransferFrom(msg.sender, address(this), _amount);
        
        // Create payment record
        paymentId = keccak256(
            abi.encodePacked(
                msg.sender,
                _recipient,
                _amount,
                _dstEid,
                block.timestamp,
                paymentNonce++
            )
        );
        
        payments[paymentId] = Payment({
            payer: msg.sender,
            recipient: _recipient,
            amount: _amount,
            sourceChainId: uint32(block.chainid),
            destinationChainId: _dstEid,
            timestamp: block.timestamp,
            status: PaymentStatus.Processing,
            serviceId: _serviceId,
            metadata: _metadata
        });
        
        // Prepare cross-chain message
        bytes memory payload = abi.encode(
            MSG_TYPE_PAYMENT,
            paymentId,
            _recipient,
            _amount,
            _serviceId,
            _metadata
        );
        
        // Send message via LayerZero
        _lzSend(
            _dstEid,
            payload,
            _options,
            MessagingFee(msg.value, 0),
            payable(msg.sender)
        );
        
        emit PaymentInitiated(paymentId, msg.sender, _amount, _dstEid);
    }

    /**
     * @notice Synchronize account state across chains
     * @param _account Account to synchronize
     * @param _targetChains Target chain endpoint IDs
     */
    function syncAccountState(
        address _account,
        uint32[] calldata _targetChains,
        bytes calldata _options
    ) external payable onlyOwner {
        ServiceAccount storage account = serviceAccounts[_account];
        require(account.isActive, "Account not active");
        
        bytes32 syncId = keccak256(
            abi.encodePacked(_account, block.timestamp, block.number)
        );
        
        bytes memory syncData = abi.encode(
            _account,
            account.balance,
            account.totalSpent,
            account.totalReceived
        );
        
        for (uint i = 0; i < _targetChains.length; i++) {
            bytes memory payload = abi.encode(
                MSG_TYPE_SYNC,
                syncId,
                syncData
            );
            
            _lzSend(
                _targetChains[i],
                payload,
                _options,
                MessagingFee(msg.value / _targetChains.length, 0),
                payable(msg.sender)
            );
            
            emit CrossChainSyncInitiated(_targetChains[i], syncId, syncData);
        }
    }

    /**
     * @notice Submit cross-chain governance proposal
     * @param _action Governance action type
     * @param _data Action data
     * @param _targetChains Target chains for execution
     */
    function submitGovernanceAction(
        uint256 _action,
        bytes calldata _data,
        uint32[] calldata _targetChains,
        bytes calldata _options
    ) external payable onlyOwner {
        bytes32 proposalId = keccak256(
            abi.encodePacked(_action, _data, block.timestamp)
        );
        
        for (uint i = 0; i < _targetChains.length; i++) {
            bytes memory payload = abi.encode(
                MSG_TYPE_GOVERNANCE,
                proposalId,
                _action,
                _data
            );
            
            _lzSend(
                _targetChains[i],
                payload,
                _options,
                MessagingFee(msg.value / _targetChains.length, 0),
                payable(msg.sender)
            );
        }
    }

    /**
     * @notice Handle incoming LayerZero messages
     */
    function _lzReceive(
        Origin calldata _origin,
        bytes32 _guid,
        bytes calldata _message,
        address _executor,
        bytes calldata _extraData
    ) internal override {
        // Prevent duplicate processing
        require(!processedMessages[_guid], "Message already processed");
        processedMessages[_guid] = true;
        
        // Decode message type
        uint16 messageType = abi.decode(_message[:32], (uint16));
        
        if (messageType == MSG_TYPE_PAYMENT) {
            _handlePaymentMessage(_origin, _message);
        } else if (messageType == MSG_TYPE_SYNC) {
            _handleSyncMessage(_origin, _message);
        } else if (messageType == MSG_TYPE_GOVERNANCE) {
            _handleGovernanceMessage(_origin, _message);
        } else if (messageType == MSG_TYPE_VALIDATION) {
            _handleValidationMessage(_origin, _message);
        }
    }

    /**
     * @notice Process incoming payment message
     */
    function _handlePaymentMessage(Origin calldata _origin, bytes calldata _message) private {
        (
            ,
            bytes32 paymentId,
            address recipient,
            uint256 amount,
            bytes32 serviceId,
            bytes memory metadata
        ) = abi.decode(_message, (uint16, bytes32, address, uint256, bytes32, bytes));
        
        // Update payment status
        Payment storage payment = payments[paymentId];
        if (payment.amount == 0) {
            // New payment from another chain
            payment = payments[paymentId];
            payment.recipient = recipient;
            payment.amount = amount;
            payment.sourceChainId = _origin.srcEid;
            payment.destinationChainId = uint32(block.chainid);
            payment.timestamp = block.timestamp;
            payment.serviceId = serviceId;
            payment.metadata = metadata;
        }
        
        // Process payment
        payment.status = PaymentStatus.Completed;
        
        // Update service account
        ServiceAccount storage account = serviceAccounts[recipient];
        account.balance += amount;
        account.totalReceived += amount;
        account.chainBalances[uint32(block.chainid)] += amount;
        
        // Transfer PYUSD if available on this chain
        if (pyusd.balanceOf(address(this)) >= amount) {
            pyusd.safeTransfer(recipient, amount);
        }
        
        emit PaymentCompleted(paymentId, recipient, amount);
        emit ServiceAccountUpdated(recipient, account.balance, uint32(block.chainid));
    }

    /**
     * @notice Process account synchronization message
     */
    function _handleSyncMessage(Origin calldata _origin, bytes calldata _message) private {
        (
            ,
            bytes32 syncId,
            bytes memory syncData
        ) = abi.decode(_message, (uint16, bytes32, bytes));
        
        (
            address account,
            uint256 balance,
            uint256 totalSpent,
            uint256 totalReceived
        ) = abi.decode(syncData, (address, uint256, uint256, uint256));
        
        // Update local state
        ServiceAccount storage serviceAccount = serviceAccounts[account];
        serviceAccount.balance = balance;
        serviceAccount.totalSpent = totalSpent;
        serviceAccount.totalReceived = totalReceived;
        serviceAccount.isActive = true;
        
        emit ServiceAccountUpdated(account, balance, uint32(block.chainid));
    }

    /**
     * @notice Process governance message
     */
    function _handleGovernanceMessage(Origin calldata _origin, bytes calldata _message) private {
        (
            ,
            bytes32 proposalId,
            uint256 action,
            bytes memory data
        ) = abi.decode(_message, (uint16, bytes32, uint256, bytes));
        
        // Execute governance action based on type
        if (action == 1) {
            // Update validator set
            (address validator, bool status) = abi.decode(data, (address, bool));
            validators[_origin.srcEid][validator] = status;
            if (status) {
                emit ValidatorAdded(_origin.srcEid, validator);
            }
        } else if (action == 2) {
            // Update required validations
            requiredValidations = abi.decode(data, (uint256));
        }
    }

    /**
     * @notice Process validation message
     */
    function _handleValidationMessage(Origin calldata _origin, bytes calldata _message) private {
        (
            ,
            bytes32 paymentId,
            address validator
        ) = abi.decode(_message, (uint16, bytes32, address));
        
        require(validators[_origin.srcEid][validator], "Invalid validator");
        
        emit ValidationReceived(paymentId, validator, _origin.srcEid);
        
        // Update payment validation count
        Payment storage payment = payments[paymentId];
        // Additional validation logic would go here
    }

    /**
     * @notice Register a service account
     */
    function registerServiceAccount(address _account) external onlyOwner {
        ServiceAccount storage account = serviceAccounts[_account];
        account.isActive = true;
        emit ServiceAccountUpdated(_account, 0, uint32(block.chainid));
    }

    /**
     * @notice Add a validator for a specific chain
     */
    function addValidator(uint32 _chainId, address _validator) external onlyOwner {
        validators[_chainId][_validator] = true;
        emit ValidatorAdded(_chainId, _validator);
    }

    /**
     * @notice Get payment details
     */
    function getPayment(bytes32 _paymentId) external view returns (Payment memory) {
        return payments[_paymentId];
    }

    /**
     * @notice Get service account balance on a specific chain
     */
    function getChainBalance(address _account, uint32 _chainId) external view returns (uint256) {
        return serviceAccounts[_account].chainBalances[_chainId];
    }

    /**
     * @notice Emergency withdrawal
     */
    function emergencyWithdraw(address _token, uint256 _amount) external onlyOwner {
        IERC20(_token).safeTransfer(owner(), _amount);
    }
}