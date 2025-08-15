// Deploy to Base Sepolia Testnet Script
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Base Sepolia configuration
const BASE_SEPOLIA_CONFIG = {
  rpc: 'https://sepolia.base.org',
  chainId: 84532,
  explorer: 'https://sepolia.basescan.org',
  usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  gasPrice: '0.001', // gwei
};

async function deployToBaseSepolia() {
  console.log('🚀 Deploying to Base Sepolia Testnet...\n');

  // Check for private key
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    console.error('❌ DEPLOYER_PRIVATE_KEY not found in .env file');
    console.log('\nTo deploy to Base Sepolia:');
    console.log('1. Create a wallet and get the private key');
    console.log('2. Fund it with Base Sepolia ETH from: https://www.alchemy.com/faucets/base-sepolia');
    console.log('3. Add to .env: DEPLOYER_PRIVATE_KEY=your_private_key');
    return;
  }

  try {
    // Connect to Base Sepolia
    const provider = new ethers.JsonRpcProvider(BASE_SEPOLIA_CONFIG.rpc);
    const wallet = new ethers.Wallet(privateKey, provider);
    
    console.log('📍 Network: Base Sepolia');
    console.log('👛 Deployer: ', wallet.address);
    
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    const balanceETH = ethers.formatEther(balance);
    console.log('💰 Balance: ', balanceETH, 'ETH');
    
    if (parseFloat(balanceETH) < 0.01) {
      console.error('❌ Insufficient balance. Need at least 0.01 ETH');
      console.log('Get testnet ETH from: https://www.alchemy.com/faucets/base-sepolia');
      return;
    }

    // Load contract artifacts
    const coordinatorArtifact = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, '../contracts/artifacts/contracts/HiveMindCoordinator.sol/HiveMindCoordinator.json'),
        'utf8'
      )
    );

    const mockUSDCArtifact = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, '../contracts/artifacts/contracts/MockUSDC.sol/MockUSDC.json'),
        'utf8'
      )
    );

    console.log('\n📝 Deploying MockUSDC...');
    const MockUSDC = new ethers.ContractFactory(
      mockUSDCArtifact.abi,
      mockUSDCArtifact.bytecode,
      wallet
    );
    
    const mockUSDC = await MockUSDC.deploy();
    await mockUSDC.waitForDeployment();
    const usdcAddress = await mockUSDC.getAddress();
    console.log('✅ MockUSDC deployed at:', usdcAddress);
    console.log('   Explorer: ', `${BASE_SEPOLIA_CONFIG.explorer}/address/${usdcAddress}`);

    console.log('\n📝 Deploying HiveMindCoordinator...');
    const HiveMindCoordinator = new ethers.ContractFactory(
      coordinatorArtifact.abi,
      coordinatorArtifact.bytecode,
      wallet
    );
    
    const coordinator = await HiveMindCoordinator.deploy(usdcAddress);
    await coordinator.waitForDeployment();
    const coordinatorAddress = await coordinator.getAddress();
    console.log('✅ HiveMindCoordinator deployed at:', coordinatorAddress);
    console.log('   Explorer: ', `${BASE_SEPOLIA_CONFIG.explorer}/address/${coordinatorAddress}`);

    // Mint some test USDC to deployer
    console.log('\n💵 Minting 10,000 test USDC...');
    const mintTx = await mockUSDC.mint(wallet.address, ethers.parseUnits('10000', 6));
    await mintTx.wait();
    console.log('✅ Minted 10,000 USDC to deployer');

    // Save deployment info
    const deployment = {
      network: 'base-sepolia',
      chainId: BASE_SEPOLIA_CONFIG.chainId,
      deployer: wallet.address,
      timestamp: new Date().toISOString(),
      contracts: {
        HiveMindCoordinator: coordinatorAddress,
        MockUSDC: usdcAddress
      },
      explorer: {
        coordinator: `${BASE_SEPOLIA_CONFIG.explorer}/address/${coordinatorAddress}`,
        usdc: `${BASE_SEPOLIA_CONFIG.explorer}/address/${usdcAddress}`
      }
    };

    fs.writeFileSync(
      path.join(__dirname, '../deployments/base-sepolia.json'),
      JSON.stringify(deployment, null, 2)
    );

    console.log('\n✅ Deployment completed successfully!');
    console.log('\n📄 Deployment info saved to: deployments/base-sepolia.json');
    
    // Update frontend config
    const frontendConfig = {
      'base-sepolia': {
        chainId: BASE_SEPOLIA_CONFIG.chainId,
        rpc: BASE_SEPOLIA_CONFIG.rpc,
        contracts: {
          HiveMindCoordinator: coordinatorAddress,
          MockUSDC: usdcAddress
        }
      }
    };

    fs.writeFileSync(
      path.join(__dirname, '../frontend/config/base-sepolia.json'),
      JSON.stringify(frontendConfig, null, 2)
    );
    
    console.log('📄 Frontend config updated: frontend/config/base-sepolia.json');

    // Verify contracts (optional)
    console.log('\n🔍 To verify contracts on Basescan:');
    console.log(`npx hardhat verify --network base-sepolia ${coordinatorAddress} ${usdcAddress}`);
    console.log(`npx hardhat verify --network base-sepolia ${usdcAddress}`);

    // Next steps
    console.log('\n📋 Next Steps:');
    console.log('1. Update .env with contract addresses');
    console.log('2. Configure frontend to use Base Sepolia');
    console.log('3. Test contract interactions');
    console.log('4. Register agents and create tasks');
    
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  }
}

// Run deployment
deployToBaseSepolia();