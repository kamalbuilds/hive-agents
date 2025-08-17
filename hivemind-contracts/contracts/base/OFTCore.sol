// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/access/Ownable.sol";

abstract contract OFTCore is Ownable {
    uint8 public immutable sharedDecimals;
    address public immutable lzEndpoint;
    
    struct SendParam {
        uint32 dstEid;
        bytes32 to;
        uint256 amountLD;
        uint256 minAmountLD;
        bytes extraOptions;
        bytes composeMsg;
        bytes oftCmd;
    }
    
    struct MessagingFee {
        uint256 nativeFee;
        uint256 lzTokenFee;
    }
    
    constructor(
        uint8 _sharedDecimals,
        address _lzEndpoint,
        address _delegate
    ) Ownable(_delegate) {
        sharedDecimals = _sharedDecimals;
        lzEndpoint = _lzEndpoint;
    }
    
    function _debit(
        uint256 _amountLD,
        uint256 _minAmountLD,
        uint32 _dstEid
    ) internal virtual returns (uint256 amountSentLD, uint256 amountReceivedLD);
    
    function _credit(
        address _to,
        uint256 _amountLD,
        uint32 _srcEid
    ) internal virtual returns (uint256 amountReceivedLD);
    
    function _send(
        SendParam memory _sendParam,
        MessagingFee memory _fee,
        address _refundAddress
    ) internal returns (bytes32 guid) {
        (uint256 amountSentLD, uint256 amountReceivedLD) = _debit(
            _sendParam.amountLD,
            _sendParam.minAmountLD,
            _sendParam.dstEid
        );
        
        // Simplified send logic
        guid = keccak256(abi.encodePacked(block.timestamp, _sendParam.dstEid, _sendParam.to));
        return guid;
    }
    
    function _quote(
        SendParam memory _sendParam,
        bool _payInLzToken
    ) internal view returns (MessagingFee memory) {
        // Simplified quote logic
        return MessagingFee({
            nativeFee: 0.001 ether,
            lzTokenFee: 0
        });
    }
}