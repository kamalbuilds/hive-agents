// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/access/Ownable.sol";

abstract contract OApp is Ownable {
    address public immutable endpoint;
    
    struct Origin {
        uint32 srcEid;
        bytes32 sender;
        uint64 nonce;
    }
    
    struct MessagingFee {
        uint256 nativeFee;
        uint256 lzTokenFee;
    }
    
    constructor(address _endpoint, address _delegate) Ownable(_delegate) {
        endpoint = _endpoint;
    }
    
    function _lzSend(
        uint32 _dstEid,
        bytes memory _message,
        bytes memory _options,
        MessagingFee memory _fee,
        address payable _refundAddress,
        bytes memory _composeMsg
    ) internal returns (bytes32) {
        // Simplified send
        return keccak256(abi.encodePacked(_dstEid, _message, block.timestamp));
    }
    
    function _quote(
        uint32 _dstEid,
        bytes memory _message,
        bytes memory _options,
        bool _payInLzToken
    ) internal view returns (MessagingFee memory) {
        return MessagingFee({
            nativeFee: 0.001 ether,
            lzTokenFee: 0
        });
    }
    
    function _lzReceive(
        Origin calldata _origin,
        bytes32 _guid,
        bytes calldata _message,
        address _executor,
        bytes calldata _extraData
    ) internal virtual;
}