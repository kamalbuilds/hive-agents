import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import contractsConfig from '../../../../config/contracts.json'
import HiveMindCoordinatorABI from '../../../../../contracts/artifacts/contracts/HiveMindCoordinator.sol/HiveMindCoordinator.json'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { taskType, description, reward, requirements, network = 'localhost' } = body

    if (!taskType || !description || !reward) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Get network config
    const config = contractsConfig[network as keyof typeof contractsConfig]
    if (!config) {
      return NextResponse.json(
        { error: 'Invalid network' },
        { status: 400 }
      )
    }

    // For demo, we'll store task details locally and use a mock IPFS hash
    // In production, this would upload to IPFS
    const taskDetails = {
      taskType,
      description,
      requirements: requirements || [],
      timestamp: Date.now()
    }

    // Mock IPFS hash (in production, upload to IPFS)
    const ipfsHash = `Qm${ethers.hexlify(ethers.randomBytes(23)).slice(2)}`
    
    // Convert reward to USDC units (6 decimals)
    const rewardAmount = ethers.parseUnits(reward.toString(), 6)

    // Return transaction preparation data
    return NextResponse.json({
      success: true,
      message: 'Task creation prepared',
      data: {
        contractAddress: (config as any).contracts?.HiveMindCoordinator || (config as any).HiveMindCoordinator,
        method: 'createTask',
        params: [taskType, ipfsHash, rewardAmount.toString()],
        taskDetails,
        ipfsHash,
        estimatedGas: '300000',
        network,
        requiredApproval: {
          token: (config as any).contracts?.MockUSDC || (config as any).PaymentToken || (config as any).MockUSDC,
          amount: rewardAmount.toString(),
          spender: (config as any).contracts?.HiveMindCoordinator || (config as any).HiveMindCoordinator
        }
      }
    })
  } catch (error) {
    console.error('Error preparing task creation:', error)
    return NextResponse.json(
      { 
        error: 'Failed to prepare task',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const taskId = searchParams.get('id')
  const network = searchParams.get('network') || 'localhost'

  try {
    // Get network config
    const config = contractsConfig[network as keyof typeof contractsConfig]
    if (!config) {
      return NextResponse.json(
        { error: 'Invalid network' },
        { status: 400 }
      )
    }

    // Connect to contract
    const rpcUrl = (config as any).rpcUrl || 'http://127.0.0.1:8545'
    const provider = new ethers.JsonRpcProvider(rpcUrl)
    // Handle both config structures (with and without contracts wrapper)
    const coordinatorAddress = (config as any).contracts?.HiveMindCoordinator || (config as any).HiveMindCoordinator
    const coordinator = new ethers.Contract(
      coordinatorAddress,
      HiveMindCoordinatorABI.abi,
      provider
    )

    if (taskId) {
      // Get specific task
      const task = await coordinator.getTask(taskId)
      
      if (task.id.toString() === '0') {
        return NextResponse.json(
          { error: 'Task not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        id: task.id.toString(),
        requester: task.requester,
        taskType: task.taskType,
        ipfsHash: task.ipfsHash,
        reward: ethers.formatUnits(task.reward, 6), // USDC has 6 decimals
        assignedAgent: task.assignedAgent,
        status: ['Pending', 'Assigned', 'InProgress', 'Completed', 'Failed', 'Disputed'][task.status],
        createdAt: new Date(Number(task.createdAt) * 1000).toISOString(),
        completedAt: task.completedAt > 0 ? new Date(Number(task.completedAt) * 1000).toISOString() : null,
        network
      })
    } else {
      // Get all tasks count
      const taskCount = await coordinator.getTaskCount()
      const tasks = []
      
      // Get last 10 tasks
      const start = Math.max(1, Number(taskCount) - 9)
      for (let i = Number(taskCount); i >= start; i--) {
        try {
          const task = await coordinator.getTask(i)
          if (task.id.toString() !== '0') {
            tasks.push({
              id: task.id.toString(),
              requester: task.requester,
              taskType: task.taskType,
              reward: ethers.formatUnits(task.reward, 6),
              status: ['Pending', 'Assigned', 'InProgress', 'Completed', 'Failed', 'Disputed'][task.status],
              assignedAgent: task.assignedAgent,
              createdAt: new Date(Number(task.createdAt) * 1000).toISOString()
            })
          }
        } catch (e) {
          // Task might not exist
        }
      }
      
      return NextResponse.json({
        totalTasks: taskCount.toString(),
        tasks,
        network
      })
    }
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch tasks',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}