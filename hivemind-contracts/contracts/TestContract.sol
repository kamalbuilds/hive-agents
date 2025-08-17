// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

contract TestContract {
    string public name = "Test";
    
    function getName() public view returns (string memory) {
        return name;
    }
}