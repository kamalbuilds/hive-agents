import { ethers } from 'ethers';
import contractsConfig from '../config/contracts.json';
import COORDINATOR_ABI from './abis/HiveMindCoordinator.json';
import USDC_ABI from './abis/MockUSDC.json';

// Get network config
export function getNetworkConfig(network: string = 'localhost') {
  return contractsConfig[network as keyof typeof contractsConfig];
}

// Get provider
export function getProvider(network: string = 'localhost') {
  const config = getNetworkConfig(network);
  if (!config) throw new Error(`Unknown network: ${network}`);
  
  if (typeof window !== 'undefined' && (window as any).ethereum) {
    return new ethers.BrowserProvider((window as any).ethereum);
  }
  
  const rpcUrl = (config as any).rpcUrl || 'http://127.0.0.1:8545';
  return new ethers.JsonRpcProvider(rpcUrl);
}

// Get signer
export async function getSigner(network: string = 'localhost') {
  const provider = getProvider(network) as ethers.BrowserProvider;
  const signer = await provider.getSigner();
  return signer;
}

// Get HiveMindCoordinator contract
export async function getCoordinatorContract(network: string = 'localhost', signer?: ethers.Signer) {
  const config = getNetworkConfig(network);
  if (!config) throw new Error(`Unknown network: ${network}`);
  
  const provider = getProvider(network);
  // Handle both config structures (with and without contracts wrapper)
  const coordinatorAddress = (config as any).contracts?.HiveMindCoordinator || (config as any).HiveMindCoordinator;
  
  const contract = new ethers.Contract(
    coordinatorAddress,
    COORDINATOR_ABI,
    signer || provider
  );
  
  return contract;
}

// Get USDC contract
export async function getUSDCContract(network: string = 'localhost', signer?: ethers.Signer) {
  const config = getNetworkConfig(network);
  if (!config) throw new Error(`Unknown network: ${network}`);
  
  const provider = getProvider(network);
  // Handle both config structures (with and without contracts wrapper)
  const usdcAddress = (config as any).contracts?.MockUSDC || (config as any).PaymentToken || (config as any).MockUSDC;
  
  const contract = new ethers.Contract(
    usdcAddress,
    USDC_ABI,
    signer || provider
  );
  
  return contract;
}

// Agent Management Functions
export async function registerAgent(
  endpoint: string,
  capabilities: string[],
  network: string = 'localhost'
) {
  try {
    const signer = await getSigner(network);
    const coordinator = await getCoordinatorContract(network, signer);
    
    const tx = await coordinator.registerAgent(endpoint, capabilities);
    const receipt = await tx.wait();
    
    return {
      success: true,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber
    };
  } catch (error: any) {
    console.error('Failed to register agent:', error);
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
}

export async function getAgent(address: string, network: string = 'localhost') {
  try {
    const coordinator = await getCoordinatorContract(network);
    const agent = await coordinator.getAgent(address);
    
    return {
      wallet: agent.wallet,
      endpoint: agent.endpoint,
      capabilities: agent.capabilities,
      reputation: agent.reputation.toString(),
      earnings: ethers.formatEther(agent.earnings),
      tasksCompleted: agent.tasksCompleted.toString(),
      active: agent.active,
      registeredAt: new Date(Number(agent.registeredAt) * 1000).toISOString()
    };
  } catch (error: any) {
    console.error('Failed to get agent:', error);
    return null;
  }
}

// Task Management Functions
export async function createTask(
  taskType: string,
  ipfsHash: string,
  reward: string,
  network: string = 'localhost'
) {
  try {
    const signer = await getSigner(network);
    const coordinator = await getCoordinatorContract(network, signer);
    const usdc = await getUSDCContract(network, signer);
    
    // Approve USDC spending
    const rewardAmount = ethers.parseUnits(reward, 6); // USDC has 6 decimals
    const coordinatorAddress = await coordinator.getAddress();
    
    const approveTx = await usdc.approve(coordinatorAddress, rewardAmount);
    await approveTx.wait();
    
    // Create task
    const tx = await coordinator.createTask(taskType, ipfsHash, rewardAmount);
    const receipt = await tx.wait();
    
    // Get task ID from events
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = coordinator.interface.parseLog(log);
        return parsed?.name === 'TaskCreated';
      } catch {
        return false;
      }
    });
    
    const taskId = event ? coordinator.interface.parseLog(event).args.taskId : null;
    
    return {
      success: true,
      taskId: taskId?.toString(),
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber
    };
  } catch (error: any) {
    console.error('Failed to create task:', error);
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
}

export async function getTask(taskId: string, network: string = 'localhost') {
  try {
    const coordinator = await getCoordinatorContract(network);
    const task = await coordinator.getTask(taskId);
    
    return {
      id: task.id.toString(),
      requester: task.requester,
      taskType: task.taskType,
      ipfsHash: task.ipfsHash,
      reward: ethers.formatUnits(task.reward, 6), // USDC has 6 decimals
      assignedAgent: task.assignedAgent,
      status: ['Pending', 'Assigned', 'InProgress', 'Completed', 'Failed', 'Disputed'][task.status],
      createdAt: new Date(Number(task.createdAt) * 1000).toISOString(),
      completedAt: task.completedAt > 0 ? new Date(Number(task.completedAt) * 1000).toISOString() : null
    };
  } catch (error: any) {
    console.error('Failed to get task:', error);
    return null;
  }
}

export async function assignTask(
  taskId: string,
  agentAddress: string,
  network: string = 'localhost'
) {
  try {
    const signer = await getSigner(network);
    const coordinator = await getCoordinatorContract(network, signer);
    
    const tx = await coordinator.assignTask(taskId, agentAddress);
    const receipt = await tx.wait();
    
    return {
      success: true,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber
    };
  } catch (error: any) {
    console.error('Failed to assign task:', error);
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
}

export async function completeTask(taskId: string, network: string = 'localhost') {
  try {
    const signer = await getSigner(network);
    const coordinator = await getCoordinatorContract(network, signer);
    
    const tx = await coordinator.completeTask(taskId);
    const receipt = await tx.wait();
    
    return {
      success: true,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber
    };
  } catch (error: any) {
    console.error('Failed to complete task:', error);
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
}

// Stats Functions
export async function getSwarmStats(network: string = 'localhost') {
  try {
    const coordinator = await getCoordinatorContract(network);
    
    const [agentCount, taskCount, platformFee, totalEarnings] = await Promise.all([
      coordinator.getAgentCount(),
      coordinator.getTaskCount(),
      coordinator.platformFee(),
      coordinator.totalEarnings()
    ]);
    
    return {
      totalAgents: agentCount.toString(),
      totalTasks: taskCount.toString(),
      platformFee: (Number(platformFee) / 100).toFixed(2) + '%',
      totalEarnings: ethers.formatUnits(totalEarnings, 6) + ' USDC'
    };
  } catch (error: any) {
    console.error('Failed to get swarm stats:', error);
    return null;
  }
}

// Get agents by capability
export async function getAgentsByCapability(capability: string, network: string = 'localhost') {
  try {
    const coordinator = await getCoordinatorContract(network);
    const agents = await coordinator.getAgentsByCapability(capability);
    return agents;
  } catch (error: any) {
    console.error('Failed to get agents by capability:', error);
    return [];
  }
}

// Check if wallet is connected
export async function isWalletConnected() {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    return false;
  }
  
  try {
    const provider = new ethers.BrowserProvider((window as any).ethereum);
    const accounts = await provider.listAccounts();
    return accounts.length > 0;
  } catch {
    return false;
  }
}

// Connect wallet
export async function connectWallet() {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error('No wallet found. Please install MetaMask.');
  }
  
  try {
    const provider = new ethers.BrowserProvider((window as any).ethereum);
    await provider.send('eth_requestAccounts', []);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    return address;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to connect wallet');
  }
}

// Get current wallet address
export async function getCurrentAddress() {
  try {
    const signer = await getSigner();
    return await signer.getAddress();
  } catch {
    return null;
  }
}

// Switch network
export async function switchNetwork(chainId: number) {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error('No wallet found');
  }
  
  try {
    await (window as any).ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    });
  } catch (error: any) {
    // This error code indicates that the chain has not been added to MetaMask
    if (error.code === 4902) {
      throw new Error('Please add this network to your wallet');
    }
    throw error;
  }
}