const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying HiveMind Coordinator to local network");
  
  // Start local hardhat node if not running
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  
  // Deploy mock USDC for local testing
  console.log("\n📄 Deploying Mock USDC...");
  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy();
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log("✅ Mock USDC deployed to:", usdcAddress);
  
  // Deploy HiveMindCoordinator
  console.log("\n📄 Deploying HiveMindCoordinator...");
  const HiveMindCoordinator = await hre.ethers.getContractFactory("HiveMindCoordinator");
  const coordinator = await HiveMindCoordinator.deploy(usdcAddress);
  await coordinator.waitForDeployment();
  const coordinatorAddress = await coordinator.getAddress();
  
  console.log("✅ HiveMindCoordinator deployed to:", coordinatorAddress);
  console.log("   Payment Token (USDC):", usdcAddress);
  
  // Mint some USDC to deployer for testing
  console.log("\n💰 Minting test USDC to deployer...");
  await usdc.mint(deployer.address, hre.ethers.parseEther("10000"));
  console.log("✅ Minted 10,000 USDC to", deployer.address);
  
  // Save deployment info
  const deploymentInfo = {
    network: "localhost",
    chainId: 31337,
    timestamp: new Date().toISOString(),
    contracts: {
      HiveMindCoordinator: coordinatorAddress,
      MockUSDC: usdcAddress
    },
    deployer: deployer.address,
    blockNumber: await hre.ethers.provider.getBlockNumber()
  };
  
  // Save to deployments folder
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }
  
  fs.writeFileSync(
    path.join(deploymentsDir, "localhost.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  // Update frontend config
  const frontendConfigPath = path.join(__dirname, "../frontend/config/contracts.json");
  const frontendConfig = {
    localhost: {
      HiveMindCoordinator: coordinatorAddress,
      PaymentToken: usdcAddress,
      chainId: 31337,
      rpcUrl: "http://127.0.0.1:8545"
    },
    "base-sepolia": {
      HiveMindCoordinator: "0x_TO_BE_DEPLOYED",
      PaymentToken: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      chainId: 84532,
      rpcUrl: "https://sepolia.base.org"
    }
  };
  
  // Create config directory if it doesn't exist
  const configDir = path.dirname(frontendConfigPath);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  fs.writeFileSync(frontendConfigPath, JSON.stringify(frontendConfig, null, 2));
  
  console.log("\n📊 Deployment info saved to:");
  console.log("   - deployments/localhost.json");
  console.log("   - frontend/config/contracts.json");
  
  console.log("\n🎉 Local deployment complete!");
  console.log("\n📋 Next steps:");
  console.log("   1. Keep this terminal running (local hardhat node)");
  console.log("   2. Run 'npm run dev' in frontend directory");
  console.log("   3. Connect MetaMask to http://127.0.0.1:8545");
  console.log("   4. Import deployer account with test ETH");
}

main()
  .then(() => console.log("\n✅ Script completed successfully"))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });