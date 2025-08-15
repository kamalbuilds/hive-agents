const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying HiveMind Coordinator to", hre.network.name);
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH");
  
  // Deploy HiveMindCoordinator
  // For testnet, we'll use a mock USDC address or deploy a test token
  const mockUSDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Base Sepolia USDC
  const minStake = hre.ethers.parseEther("0.1"); // 0.1 USDC minimum stake
  
  console.log("\n📄 Deploying HiveMindCoordinator...");
  const HiveMindCoordinator = await hre.ethers.getContractFactory("HiveMindCoordinator");
  const coordinator = await HiveMindCoordinator.deploy(mockUSDC, minStake);
  
  await coordinator.waitForDeployment();
  const coordinatorAddress = await coordinator.getAddress();
  
  console.log("✅ HiveMindCoordinator deployed to:", coordinatorAddress);
  console.log("   Payment Token (USDC):", mockUSDC);
  console.log("   Minimum Stake:", hre.ethers.formatEther(minStake), "USDC");
  
  // Save deployment addresses
  const fs = require("fs");
  const deployments = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    timestamp: new Date().toISOString(),
    contracts: {
      HiveMindCoordinator: coordinatorAddress,
      PaymentToken: mockUSDC
    },
    deployer: deployer.address,
    blockNumber: await hre.ethers.provider.getBlockNumber()
  };
  
  fs.writeFileSync(
    `./deployments/${hre.network.name}.json`,
    JSON.stringify(deployments, null, 2)
  );
  
  console.log("\n📊 Deployment info saved to deployments/" + hre.network.name + ".json");
  
  // Verify contract on Basescan if not on localhost
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n🔍 Waiting for block confirmations before verification...");
    await coordinator.deploymentTransaction().wait(6);
    
    console.log("📝 Verifying contract on explorer...");
    try {
      await hre.run("verify:verify", {
        address: coordinatorAddress,
        constructorArguments: [mockUSDC, minStake],
      });
      console.log("✅ Contract verified successfully!");
    } catch (error) {
      console.error("❌ Verification failed:", error.message);
      console.log("   You can verify manually at:");
      console.log("   https://sepolia.basescan.org/address/" + coordinatorAddress);
    }
  }
  
  console.log("\n🎉 Deployment complete!");
  console.log("📋 Next steps:");
  console.log("   1. Fund the contract with payment tokens");
  console.log("   2. Register agents using registerAgent()");
  console.log("   3. Create tasks using createTask()");
  console.log("   4. Update frontend with contract address");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });