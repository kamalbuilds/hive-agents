const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
  console.log("🚀 Deploying to Base Sepolia Testnet...\n");

  // Configure provider for Base Sepolia
  const provider = new ethers.JsonRpcProvider("https://sepolia.base.org");
  
  // Create wallet with the private key
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
  
  console.log("📍 Network: Base Sepolia");
  console.log("👛 Deployer: ", wallet.address);
  
  // Get current balance
  const balance = await provider.getBalance(wallet.address);
  console.log("💰 Balance: ", ethers.formatEther(balance), "ETH\n");

  // Get current nonce and increment it for each transaction
  let nonce = await provider.getTransactionCount(wallet.address);
  console.log("📊 Starting nonce:", nonce, "\n");

  // Deploy MockUSDC with explicit nonce
  console.log("📝 Deploying MockUSDC...");
  const MockUSDC = await ethers.getContractFactory("MockUSDC", wallet);
  const mockUSDC = await MockUSDC.deploy({ nonce: nonce++ });
  await mockUSDC.waitForDeployment();
  const mockUSDCAddress = await mockUSDC.getAddress();
  
  console.log("✅ MockUSDC deployed at:", mockUSDCAddress);
  console.log("   Explorer: ", `https://sepolia.basescan.org/address/${mockUSDCAddress}\n`);

  // Deploy HiveMindCoordinator with next nonce
  console.log("📝 Deploying HiveMindCoordinator...");
  const HiveMindCoordinator = await ethers.getContractFactory("HiveMindCoordinator", wallet);
  const coordinator = await HiveMindCoordinator.deploy(mockUSDCAddress, { nonce: nonce++ });
  await coordinator.waitForDeployment();
  const coordinatorAddress = await coordinator.getAddress();
  
  console.log("✅ HiveMindCoordinator deployed at:", coordinatorAddress);
  console.log("   Explorer: ", `https://sepolia.basescan.org/address/${coordinatorAddress}\n`);

  // Mint some USDC to the deployer for testing with next nonce
  console.log("💰 Minting 10,000 USDC to deployer for testing...");
  const mintAmount = ethers.parseUnits("10000", 6); // 10,000 USDC
  const mintTx = await mockUSDC.mint(wallet.address, mintAmount, { nonce: nonce++ });
  await mintTx.wait();
  console.log("✅ Minted 10,000 USDC to deployer\n");

  // Approve coordinator to spend USDC with next nonce
  console.log("✅ Approving HiveMindCoordinator to spend USDC...");
  const approveTx = await mockUSDC.approve(coordinatorAddress, ethers.MaxUint256, { nonce: nonce++ });
  await approveTx.wait();
  console.log("✅ Approved HiveMindCoordinator for USDC spending\n");

  // Save deployment info
  const deploymentInfo = {
    network: "base-sepolia",
    chainId: 84532,
    contracts: {
      MockUSDC: mockUSDCAddress,
      HiveMindCoordinator: coordinatorAddress,
    },
    deployer: wallet.address,
    timestamp: new Date().toISOString(),
    blockNumber: await provider.getBlockNumber(),
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(deploymentsDir, "base-sepolia.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );

  // Update frontend configuration
  const frontendConfigPath = path.join(__dirname, "..", "frontend", "config", "contracts.json");
  const frontendDir = path.dirname(frontendConfigPath);
  
  if (!fs.existsSync(frontendDir)) {
    fs.mkdirSync(frontendDir, { recursive: true });
  }

  const frontendConfig = {
    "84532": {
      name: "Base Sepolia",
      rpcUrl: "https://sepolia.base.org",
      explorer: "https://sepolia.basescan.org",
      contracts: {
        HiveMindCoordinator: coordinatorAddress,
        MockUSDC: mockUSDCAddress,
      }
    }
  };

  // Read existing config if it exists
  let existingConfig = {};
  if (fs.existsSync(frontendConfigPath)) {
    existingConfig = JSON.parse(fs.readFileSync(frontendConfigPath, "utf8"));
  }

  // Merge configs
  const mergedConfig = { ...existingConfig, ...frontendConfig };
  
  fs.writeFileSync(
    frontendConfigPath,
    JSON.stringify(mergedConfig, null, 2)
  );

  console.log("📄 Deployment Summary");
  console.log("====================");
  console.log(`Network:              Base Sepolia (Chain ID: 84532)`);
  console.log(`MockUSDC:            ${mockUSDCAddress}`);
  console.log(`HiveMindCoordinator: ${coordinatorAddress}`);
  console.log(`Deployer:            ${wallet.address}`);
  console.log(`Block Number:        ${deploymentInfo.blockNumber}`);
  console.log("\n✅ Deployment complete!");
  console.log("\n📝 Deployment info saved to:");
  console.log(`   - deployments/base-sepolia.json`);
  console.log(`   - frontend/config/contracts.json`);
  
  console.log("\n🔍 Verify contracts on Basescan:");
  console.log(`   npx hardhat verify --network base-sepolia ${mockUSDCAddress}`);
  console.log(`   npx hardhat verify --network base-sepolia ${coordinatorAddress} "${mockUSDCAddress}"`);
  
  console.log("\n🎯 Next Steps:");
  console.log("   1. Test contract interactions with scripts/test-real-integration.js");
  console.log("   2. Update frontend to use Base Sepolia network");
  console.log("   3. Configure MetaMask to Base Sepolia");
  console.log("   4. Start testing the dApp!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });