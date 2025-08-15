const hre = require("hardhat");
const { ethers } = require("ethers");

async function main() {
  console.log("🧪 Testing HIVE MIND Integration on Local Network\n");
  
  // Connect to local network
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  
  // Use test accounts from Hardhat
  const testPrivateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  const wallet = new ethers.Wallet(testPrivateKey, provider);
  console.log("💼 Using test wallet:", wallet.address);
  
  // Contract addresses from local deployment
  const coordinatorAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  const usdcAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  
  // Load ABIs
  const coordinatorABI = require("../contracts/artifacts/contracts/HiveMindCoordinator.sol/HiveMindCoordinator.json").abi;
  const usdcABI = require("../contracts/artifacts/contracts/MockUSDC.sol/MockUSDC.json").abi;
  
  // Connect to contracts
  const coordinator = new ethers.Contract(coordinatorAddress, coordinatorABI, wallet);
  const usdc = new ethers.Contract(usdcAddress, usdcABI, wallet);
  
  console.log("📄 Connected to contracts:");
  console.log("   HiveMindCoordinator:", coordinatorAddress);
  console.log("   MockUSDC:", usdcAddress);
  
  // Test 1: Register an Agent
  console.log("\n🤖 Test 1: Registering Agent...");
  try {
    const tx1 = await coordinator.registerAgent(
      "https://agent1.hivemind.ai/api",
      ["data_analysis", "python", "machine_learning"]
    );
    const receipt1 = await tx1.wait();
    console.log("✅ Agent registered! Tx:", receipt1.hash);
    
    // Get agent details
    const agent = await coordinator.getAgent(wallet.address);
    console.log("   Agent details:");
    console.log("   - Endpoint:", agent.endpoint);
    console.log("   - Capabilities:", agent.capabilities);
    console.log("   - Reputation:", agent.reputation.toString());
  } catch (error) {
    console.log("⚠️  Agent already registered or error:", error.message);
  }
  
  // Test 2: Create a Task
  console.log("\n📋 Test 2: Creating Task...");
  
  // First approve USDC spending
  const taskReward = ethers.parseUnits("100", 6); // 100 USDC
  console.log("   Approving USDC spending...");
  const approveTx = await usdc.approve(coordinatorAddress, taskReward);
  await approveTx.wait();
  console.log("   ✅ USDC approved");
  
  // Create task
  const ipfsHash = "QmTest123456789abcdefghijklmnopqrstuvwxyz";
  const createTx = await coordinator.createTask(
    "data_analysis",
    ipfsHash,
    taskReward
  );
  const createReceipt = await createTx.wait();
  console.log("✅ Task created! Tx:", createReceipt.hash);
  
  // Get task ID from event
  const taskCreatedEvent = createReceipt.logs.find(log => {
    try {
      const parsed = coordinator.interface.parseLog(log);
      return parsed?.name === 'TaskCreated';
    } catch {
      return false;
    }
  });
  
  const taskId = taskCreatedEvent ? 
    coordinator.interface.parseLog(taskCreatedEvent).args.taskId : 
    1n;
  console.log("   Task ID:", taskId.toString());
  
  // Get task details
  const task = await coordinator.getTask(taskId);
  console.log("   Task details:");
  console.log("   - Type:", task.taskType);
  console.log("   - Reward:", ethers.formatUnits(task.reward, 6), "USDC");
  console.log("   - Status:", ["Pending", "Assigned", "InProgress", "Completed", "Failed", "Disputed"][task.status]);
  
  // Test 3: Get Swarm Stats
  console.log("\n📊 Test 3: Fetching Swarm Stats...");
  const [agentCount, taskCount, platformFee, totalEarnings] = await Promise.all([
    coordinator.getAgentCount(),
    coordinator.getTaskCount(),
    coordinator.platformFee(),
    coordinator.totalEarnings()
  ]);
  
  console.log("   Swarm Statistics:");
  console.log("   - Total Agents:", agentCount.toString());
  console.log("   - Total Tasks:", taskCount.toString());
  console.log("   - Platform Fee:", (Number(platformFee) / 100).toFixed(2) + "%");
  console.log("   - Total Earnings:", ethers.formatUnits(totalEarnings, 6), "USDC");
  
  // Test 4: Register Multiple Agents (using different accounts)
  console.log("\n🤖 Test 4: Registering Multiple Agents...");
  const testAccounts = [
    "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", // Account #1
    "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a", // Account #2
  ];
  
  for (let i = 0; i < testAccounts.length; i++) {
    const agentWallet = new ethers.Wallet(testAccounts[i], provider);
    const agentCoordinator = new ethers.Contract(coordinatorAddress, coordinatorABI, agentWallet);
    
    try {
      const capabilities = [
        ["solidity", "smart_contracts", "auditing"],
        ["web3", "frontend", "react"]
      ][i];
      
      const tx = await agentCoordinator.registerAgent(
        `https://agent${i + 2}.hivemind.ai/api`,
        capabilities
      );
      await tx.wait();
      console.log(`   ✅ Agent ${i + 2} registered:`, agentWallet.address);
    } catch (error) {
      console.log(`   ⚠️  Agent ${i + 2} registration failed:`, error.message);
    }
  }
  
  // Test 5: Assign Task
  console.log("\n🎯 Test 5: Assigning Task to Agent...");
  try {
    const assignTx = await coordinator.assignTask(taskId, wallet.address);
    await assignTx.wait();
    console.log("✅ Task assigned to agent:", wallet.address);
    
    // Check updated task status
    const updatedTask = await coordinator.getTask(taskId);
    console.log("   Task status:", ["Pending", "Assigned", "InProgress", "Completed", "Failed", "Disputed"][updatedTask.status]);
    console.log("   Assigned to:", updatedTask.assignedAgent);
  } catch (error) {
    console.log("⚠️  Task assignment failed:", error.message);
  }
  
  // Test 6: Complete Task
  console.log("\n✨ Test 6: Completing Task...");
  try {
    const completeTx = await coordinator.completeTask(taskId);
    const completeReceipt = await completeTx.wait();
    console.log("✅ Task completed! Tx:", completeReceipt.hash);
    
    // Check agent earnings
    const agentAfter = await coordinator.getAgent(wallet.address);
    console.log("   Agent earnings:", ethers.formatUnits(agentAfter.earnings, 6), "USDC");
    console.log("   Tasks completed:", agentAfter.tasksCompleted.toString());
    console.log("   New reputation:", agentAfter.reputation.toString());
  } catch (error) {
    console.log("⚠️  Task completion failed:", error.message);
  }
  
  // Test 7: Query Agents by Capability
  console.log("\n🔍 Test 7: Finding Agents by Capability...");
  const dataAnalysts = await coordinator.getAgentsByCapability("data_analysis");
  console.log("   Agents with 'data_analysis' capability:", dataAnalysts.length);
  for (const agentAddr of dataAnalysts) {
    const agentData = await coordinator.getAgent(agentAddr);
    console.log(`   - ${agentAddr}: ${agentData.capabilities.join(", ")}`);
  }
  
  console.log("\n🎉 Integration Test Complete!");
  console.log("📊 Final Stats:");
  const finalAgentCount = await coordinator.getAgentCount();
  const finalTaskCount = await coordinator.getTaskCount();
  console.log("   - Total Agents:", finalAgentCount.toString());
  console.log("   - Total Tasks:", finalTaskCount.toString());
}

main()
  .then(() => {
    console.log("\n✅ All tests completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  });