// Real blockchain contract integration for frontend
import { ethers } from 'ethers'
import { useState, useEffect } from 'react'

// Contract addresses
export const CONTRACTS = {
  'base-sepolia': {
    coordinator: '0xC8973d8f3cd4Ee6bd5358AcDbE9a4CA517BDd129',
    usdc: '0x6B5f6d625aa0fBA745759Ad0495017735cB72af7',
    rpc: 'https://sepolia.base.org',
    chainId: 84532
  },
  'localhost': {
    coordinator: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    usdc: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    rpc: 'http://127.0.0.1:8545',
    chainId: 31337
  }
}

// Contract ABIs
const COORDINATOR_ABI = [
  'function registerAgent(string memory _name, string memory _specialization, address _walletAddress, address _endpointAddress) external',
  'function createTask(string memory _description, uint256 _reward, uint256 _deadline) external',
  'function assignTask(uint256 _taskId, uint256 _agentId) external',
  'function completeTask(uint256 _taskId, string memory _result) external',
  'function getAgent(uint256 _agentId) external view returns (tuple(string name, string specialization, address walletAddress, address endpointAddress, uint256 reputation, uint256 tasksCompleted, bool isActive, uint256 registeredAt) agent)',
  'function getTask(uint256 _taskId) external view returns (tuple(string description, uint256 reward, address creator, uint256 assignedTo, bool isCompleted, uint256 deadline, uint256 createdAt, uint256 completedAt) task)',
  'function agentIdCounter() external view returns (uint256)',
  'function taskIdCounter() external view returns (uint256)',
  'function platformFee() external view returns (uint256)',
  'event AgentRegistered(uint256 indexed agentId, string name, string specialization, address walletAddress)',
  'event TaskCreated(uint256 indexed taskId, string description, uint256 reward, uint256 deadline)',
  'event TaskAssigned(uint256 indexed taskId, uint256 indexed agentId)',
  'event TaskCompleted(uint256 indexed taskId, uint256 indexed agentId, string result)'
]

const USDC_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)'
]

// Hook for contract interaction
export function useContract(network: string = 'base-sepolia') {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [signer, setSigner] = useState<ethers.Signer | null>(null)
  const [coordinator, setCoordinator] = useState<ethers.Contract | null>(null)
  const [usdc, setUsdc] = useState<ethers.Contract | null>(null)
  const [address, setAddress] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)

  const config = CONTRACTS[network as keyof typeof CONTRACTS]

  // Initialize provider and contracts
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const browserProvider = new ethers.BrowserProvider(window.ethereum)
      setProvider(browserProvider)

      // Initialize contracts with provider (read-only)
      const coordinatorContract = new ethers.Contract(
        config.coordinator,
        COORDINATOR_ABI,
        browserProvider
      )
      const usdcContract = new ethers.Contract(
        config.usdc,
        USDC_ABI,
        browserProvider
      )

      setCoordinator(coordinatorContract)
      setUsdc(usdcContract)
    }
  }, [network])

  // Connect wallet
  const connect = async () => {
    if (!provider) {
      throw new Error('No provider available')
    }

    try {
      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' })
      
      const signer = await provider.getSigner()
      const address = await signer.getAddress()
      
      setSigner(signer)
      setAddress(address)
      setConnected(true)

      // Update contracts with signer (write access)
      const coordinatorContract = new ethers.Contract(
        config.coordinator,
        COORDINATOR_ABI,
        signer
      )
      const usdcContract = new ethers.Contract(
        config.usdc,
        USDC_ABI,
        signer
      )

      setCoordinator(coordinatorContract)
      setUsdc(usdcContract)

      return address
    } catch (error) {
      console.error('Failed to connect wallet:', error)
      throw error
    }
  }

  // Register a new agent
  const registerAgent = async (name: string, specialization: string, endpointAddress?: string) => {
    if (!coordinator || !signer || !address) {
      throw new Error('Not connected')
    }

    const endpoint = endpointAddress || ethers.ZeroAddress
    const tx = await coordinator.registerAgent(name, specialization, address, endpoint)
    const receipt = await tx.wait()
    
    // Extract agent ID from events
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = coordinator.interface.parseLog(log)
        return parsed?.name === 'AgentRegistered'
      } catch {
        return false
      }
    })

    if (event) {
      const parsed = coordinator.interface.parseLog(event)
      return {
        agentId: parsed?.args[0].toString(),
        txHash: receipt.hash
      }
    }

    return { txHash: receipt.hash }
  }

  // Create a new task
  const createTask = async (description: string, reward: number, deadline: number) => {
    if (!coordinator || !signer || !usdc) {
      throw new Error('Not connected')
    }

    // Convert reward to USDC units (6 decimals)
    const rewardAmount = ethers.parseUnits(reward.toString(), 6)

    // Approve USDC spending
    const allowance = await usdc.allowance(address, config.coordinator)
    if (allowance < rewardAmount) {
      const approveTx = await usdc.approve(config.coordinator, rewardAmount)
      await approveTx.wait()
    }

    // Create task
    const tx = await coordinator.createTask(description, rewardAmount, deadline)
    const receipt = await tx.wait()

    // Extract task ID from events
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = coordinator.interface.parseLog(log)
        return parsed?.name === 'TaskCreated'
      } catch {
        return false
      }
    })

    if (event) {
      const parsed = coordinator.interface.parseLog(event)
      return {
        taskId: parsed?.args[0].toString(),
        txHash: receipt.hash
      }
    }

    return { txHash: receipt.hash }
  }

  // Get all agents
  const getAllAgents = async () => {
    if (!coordinator) return []

    try {
      const agentCount = await coordinator.agentIdCounter()
      const agents = []

      for (let i = 1; i <= agentCount; i++) {
        try {
          const agent = await coordinator.getAgent(i)
          agents.push({
            id: i.toString(),
            name: agent.name,
            specialization: agent.specialization,
            walletAddress: agent.walletAddress,
            endpointAddress: agent.endpointAddress,
            reputation: Number(agent.reputation),
            tasksCompleted: Number(agent.tasksCompleted),
            isActive: agent.isActive,
            registeredAt: new Date(Number(agent.registeredAt) * 1000)
          })
        } catch (err) {
          console.error(`Failed to fetch agent ${i}:`, err)
        }
      }

      return agents
    } catch (error) {
      console.error('Failed to fetch agents:', error)
      return []
    }
  }

  // Get all tasks
  const getAllTasks = async () => {
    if (!coordinator) return []

    try {
      const taskCount = await coordinator.taskIdCounter()
      const tasks = []

      for (let i = 1; i <= taskCount; i++) {
        try {
          const task = await coordinator.getTask(i)
          tasks.push({
            id: i.toString(),
            description: task.description,
            reward: ethers.formatUnits(task.reward, 6),
            creator: task.creator,
            assignedTo: task.assignedTo.toString() === '0' ? null : task.assignedTo.toString(),
            isCompleted: task.isCompleted,
            deadline: new Date(Number(task.deadline) * 1000),
            createdAt: new Date(Number(task.createdAt) * 1000),
            completedAt: task.completedAt > 0 ? new Date(Number(task.completedAt) * 1000) : null
          })
        } catch (err) {
          console.error(`Failed to fetch task ${i}:`, err)
        }
      }

      return tasks
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
      return []
    }
  }

  // Assign task to agent
  const assignTask = async (taskId: string, agentId: string) => {
    if (!coordinator || !signer) {
      throw new Error('Not connected')
    }

    const tx = await coordinator.assignTask(taskId, agentId)
    const receipt = await tx.wait()
    return { txHash: receipt.hash }
  }

  // Complete task
  const completeTask = async (taskId: string, result: string) => {
    if (!coordinator || !signer) {
      throw new Error('Not connected')
    }

    const tx = await coordinator.completeTask(taskId, result)
    const receipt = await tx.wait()
    return { txHash: receipt.hash }
  }

  // Get platform stats
  const getPlatformStats = async () => {
    if (!coordinator) return null

    try {
      const [agentCount, taskCount, platformFee] = await Promise.all([
        coordinator.agentIdCounter(),
        coordinator.taskIdCounter(),
        coordinator.platformFee()
      ])

      return {
        totalAgents: Number(agentCount),
        totalTasks: Number(taskCount),
        platformFee: Number(platformFee)
      }
    } catch (error) {
      console.error('Failed to fetch platform stats:', error)
      return null
    }
  }

  return {
    provider,
    signer,
    coordinator,
    usdc,
    address,
    connected,
    connect,
    registerAgent,
    createTask,
    getAllAgents,
    getAllTasks,
    assignTask,
    completeTask,
    getPlatformStats
  }
}

// Generate unique IDs without timestamp collision
let idCounter = 0
export function generateUniqueId(prefix: string): string {
  idCounter++
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${prefix}-${timestamp}-${idCounter}-${random}`
}