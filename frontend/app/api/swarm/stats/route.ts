import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import contractsConfig from '../../../../config/contracts.json'
import HiveMindCoordinatorABI from '../../../../../contracts/artifacts/contracts/HiveMindCoordinator.sol/HiveMindCoordinator.json'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
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
    const provider = new ethers.JsonRpcProvider(config.rpcUrl)
    const coordinator = new ethers.Contract(
      config.HiveMindCoordinator,
      HiveMindCoordinatorABI.abi,
      provider
    )

    // Get stats from contract
    const [agentCount, taskCount, platformFee, totalEarnings, minReputation] = await Promise.all([
      coordinator.getAgentCount(),
      coordinator.getTaskCount(),
      coordinator.platformFee(),
      coordinator.totalEarnings(),
      coordinator.minReputation()
    ])

    // Get latest block info
    const blockNumber = await provider.getBlockNumber()
    const block = await provider.getBlock(blockNumber)
    
    // Calculate additional metrics
    const activeTasks = []
    const completedTasks = []
    
    // Get recent tasks (last 20)
    const taskCountNum = Number(taskCount)
    const start = Math.max(1, taskCountNum - 19)
    
    for (let i = taskCountNum; i >= start && i > 0; i--) {
      try {
        const task = await coordinator.getTask(i)
        if (task.id.toString() !== '0') {
          const taskData = {
            id: task.id.toString(),
            status: task.status,
            reward: ethers.formatUnits(task.reward, 6)
          }
          
          if (task.status === 3) { // Completed
            completedTasks.push(taskData)
          } else if (task.status < 3) { // Active (Pending, Assigned, InProgress)
            activeTasks.push(taskData)
          }
        }
      } catch (e) {
        // Task might not exist
      }
    }

    // Get top agents by looking at registered agents
    const registeredAgentCount = Number(agentCount)
    const topAgents = []
    
    if (registeredAgentCount > 0) {
      // In production, you'd want to index this data
      // For now, we'll get a sample of agents
      const sampleSize = Math.min(5, registeredAgentCount)
      for (let i = 0; i < sampleSize; i++) {
        try {
          const agentAddress = await coordinator.registeredAgents(i)
          const agent = await coordinator.getAgent(agentAddress)
          
          if (agent.active) {
            topAgents.push({
              address: agentAddress,
              reputation: agent.reputation.toString(),
              tasksCompleted: agent.tasksCompleted.toString(),
              earnings: ethers.formatUnits(agent.earnings, 6)
            })
          }
        } catch (e) {
          // Agent might not exist
        }
      }
    }

    // Sort agents by reputation
    topAgents.sort((a, b) => Number(b.reputation) - Number(a.reputation))

    return NextResponse.json({
      network,
      contractAddress: config.HiveMindCoordinator,
      blockNumber: blockNumber.toString(),
      timestamp: block?.timestamp || Math.floor(Date.now() / 1000),
      stats: {
        totalAgents: agentCount.toString(),
        totalTasks: taskCount.toString(),
        activeTasks: activeTasks.length,
        completedTasks: completedTasks.length,
        platformFee: (Number(platformFee) / 100).toFixed(2) + '%',
        totalEarnings: ethers.formatUnits(totalEarnings, 6) + ' USDC',
        minReputation: minReputation.toString()
      },
      metrics: {
        agentsOnline: Math.floor(Number(agentCount) * 0.7), // Simulated for demo
        averageResponseTime: '2.3s', // Simulated
        successRate: completedTasks.length > 0 
          ? ((completedTasks.length / (completedTasks.length + activeTasks.length)) * 100).toFixed(1) + '%'
          : '0%',
        totalVolume: ethers.formatUnits(totalEarnings, 6),
        avgTaskReward: taskCountNum > 0 
          ? (Number(ethers.formatUnits(totalEarnings, 6)) / taskCountNum).toFixed(2)
          : '0'
      },
      topAgents: topAgents.slice(0, 5),
      recentActivity: {
        activeTasks: activeTasks.slice(0, 5),
        completedTasks: completedTasks.slice(0, 5)
      }
    })
  } catch (error) {
    console.error('Error fetching swarm stats:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch swarm stats',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}