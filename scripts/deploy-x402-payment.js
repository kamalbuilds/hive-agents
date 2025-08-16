/**
 * Deployment script for X402PaymentOrchestrator with PYUSD
 * Deploys the payment orchestrator and MockPYUSD for testing
 */

const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

// LayerZero Endpoint addresses
const ENDPOINTS = {
    'localhost': '0x0000000000000000000000000000000000000000', // Mock endpoint for local
    'base-sepolia': '0x6EDCE65403992e310A62460808c4b910D972f10f',
    'arbitrum-sepolia': '0x6EDCE65403992e310A62460808c4b910D972f10f',
    'optimism-sepolia': '0x6EDCE65403992e310A62460808c4b910D972f10f',
    'ethereum-sepolia': '0x6EDCE65403992e310A62460808c4b910D972f10f'
};

// Chain IDs for LayerZero
const CHAIN_IDS = {
    'base-sepolia': 40245,
    'arbitrum-sepolia': 40231,
    'optimism-sepolia': 40232,
    'ethereum-sepolia': 40161
};

async function main() {
    console.log("🚀 Deploying X402PaymentOrchestrator with PYUSD...\n");

    // Get network
    const network = hre.network.name;
    console.log(`📍 Network: ${network}`);

    // Get deployer
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Deployer: ${deployer.address}`);

    // Get balance
    const balance = await deployer.getBalance();
    console.log(`💰 Balance: ${ethers.utils.formatEther(balance)} ETH\n`);

    // Deploy MockPYUSD first
    console.log("📝 Deploying MockPYUSD...");
    const MockPYUSD = await ethers.getContractFactory("MockPYUSD");
    const mockPYUSD = await MockPYUSD.deploy();
    await mockPYUSD.deployed();
    console.log(`✅ MockPYUSD deployed at: ${mockPYUSD.address}`);

    // Mint some PYUSD to deployer for testing
    const mintAmount = ethers.utils.parseUnits("100000", 6); // 100k PYUSD
    await mockPYUSD.emergencyMint(deployer.address, mintAmount);
    console.log(`💵 Minted ${ethers.utils.formatUnits(mintAmount, 6)} PYUSD to deployer`);

    // Get LayerZero endpoint
    let endpoint = ENDPOINTS[network];
    if (!endpoint || endpoint === '0x0000000000000000000000000000000000000000') {
        // Deploy mock endpoint for local testing
        console.log("\n📝 Deploying Mock LayerZero Endpoint...");
        const MockEndpoint = await ethers.getContractFactory("MockLayerZeroEndpoint");
        const mockEndpoint = await MockEndpoint.deploy();
        await mockEndpoint.deployed();
        endpoint = mockEndpoint.address;
        console.log(`✅ Mock Endpoint deployed at: ${endpoint}`);
    }

    // Deploy X402PaymentOrchestrator
    console.log("\n📝 Deploying X402PaymentOrchestrator...");
    const X402PaymentOrchestrator = await ethers.getContractFactory("X402PaymentOrchestrator");
    const orchestrator = await X402PaymentOrchestrator.deploy(
        endpoint,
        deployer.address,
        mockPYUSD.address
    );
    await orchestrator.deployed();
    console.log(`✅ X402PaymentOrchestrator deployed at: ${orchestrator.address}`);

    // Configure the orchestrator
    console.log("\n⚙️ Configuring orchestrator...");

    // Register service accounts for testing
    const testAccounts = [
        "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
    ];

    for (const account of testAccounts) {
        await orchestrator.registerServiceAccount(account);
        console.log(`✅ Registered service account: ${account}`);
    }

    // Add validators if on testnet
    if (network !== 'localhost') {
        const chainId = CHAIN_IDS[network];
        if (chainId) {
            await orchestrator.addValidator(chainId, deployer.address);
            console.log(`✅ Added validator for chain ${chainId}`);
        }
    }

    // Save deployment info
    const deploymentInfo = {
        network: network,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contracts: {
            MockPYUSD: {
                address: mockPYUSD.address,
                decimals: 6,
                initialSupply: "1000000"
            },
            X402PaymentOrchestrator: {
                address: orchestrator.address,
                endpoint: endpoint,
                pyusd: mockPYUSD.address
            }
        },
        testAccounts: testAccounts,
        chainId: CHAIN_IDS[network] || 31337
    };

    // Create deployments directory if it doesn't exist
    const deploymentsDir = path.join(__dirname, '..', 'deployments');
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    // Save deployment info to file
    const deploymentFile = path.join(deploymentsDir, `x402-payment-${network}.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\n💾 Deployment info saved to: ${deploymentFile}`);

    // Display summary
    console.log("\n" + "=".repeat(50));
    console.log("📊 DEPLOYMENT SUMMARY");
    console.log("=".repeat(50));
    console.log(`Network:                ${network}`);
    console.log(`MockPYUSD:             ${mockPYUSD.address}`);
    console.log(`X402PaymentOrchestrator: ${orchestrator.address}`);
    console.log(`LayerZero Endpoint:     ${endpoint}`);
    console.log(`Chain ID:               ${CHAIN_IDS[network] || 31337}`);
    console.log("=".repeat(50));

    // Verify contracts if on testnet
    if (network !== 'localhost' && network !== 'hardhat') {
        console.log("\n🔍 Preparing contract verification...");
        console.log("Run the following commands to verify on Etherscan:");
        console.log(`\nnpx hardhat verify --network ${network} ${mockPYUSD.address}`);
        console.log(`npx hardhat verify --network ${network} ${orchestrator.address} ${endpoint} ${deployer.address} ${mockPYUSD.address}`);
    }

    console.log("\n✅ Deployment complete!");
}

// Mock LayerZero Endpoint for local testing
const MockLayerZeroEndpoint = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

contract MockLayerZeroEndpoint {
    uint32 public eid = 31337;
    
    function send(
        uint32 _dstEid,
        bytes calldata _path,
        bytes calldata _payload,
        address _refundAddress,
        address _zroPaymentAddress,
        bytes calldata _adapterParams
    ) external payable returns (uint64 nonce) {
        // Mock implementation
        return 1;
    }
    
    function estimateFees(
        uint32 _dstEid,
        address _userApplication,
        bytes calldata _payload,
        bool _payInZRO,
        bytes calldata _adapterParam
    ) external view returns (uint nativeFee, uint zroFee) {
        // Mock fee estimation
        return (0.001 ether, 0);
    }
}
`;

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });