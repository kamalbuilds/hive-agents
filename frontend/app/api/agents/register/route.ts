import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import contractsConfig from '../../../../config/contracts.json'
import HiveMindCoordinatorABI from '../../../../lib/abis/HiveMindCoordinator.json'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { endpoint, capabilities, walletAddress, signature, network = 'localhost' } = body

    if (!endpoint || !capabilities || !walletAddress) {
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

    // Connect to contract
    const rpcUrl = (config as any).rpcUrl || 'http://127.0.0.1:8545'
    const provider = new ethers.JsonRpcProvider(rpcUrl)
    // Handle both config structures (with and without contracts wrapper)
    const coordinatorAddress = (config as any).contracts?.HiveMindCoordinator || (config as any).HiveMindCoordinator
    const coordinator = new ethers.Contract(
      coordinatorAddress,
      HiveMindCoordinatorABI,
      provider
    )

    // Check if agent is already registered
    try {
      const agent = await coordinator.getAgent(walletAddress)
      if (agent.active) {
        return NextResponse.json({
          success: false,
          error: 'Agent already registered',
          agent: {
            wallet: agent.wallet,
            endpoint: agent.endpoint,
            capabilities: agent.capabilities,
            reputation: agent.reputation.toString(),
            earnings: ethers.formatEther(agent.earnings),
            tasksCompleted: agent.tasksCompleted.toString(),
            active: agent.active
          }
        })
      }
    } catch (e) {
      // Agent not found, can proceed with registration
    }

    // In production, this would be done client-side with user's wallet
    // For testing, we'll simulate the registration
    return NextResponse.json({
      success: true,
      message: 'Agent registration prepared',
      data: {
        contractAddress: coordinatorAddress,
        method: 'registerAgent',
        params: [endpoint, capabilities],
        estimatedGas: '200000',
        network
      }
    })
  } catch (error) {
    console.error('Error preparing agent registration:', error)
    return NextResponse.json(
      { 
        error: 'Failed to prepare registration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const address = searchParams.get('address')
  const network = searchParams.get('network') || 'localhost'

  if (!address) {
    return NextResponse.json(
      { error: 'Address parameter required' },
      { status: 400 }
    )
  }

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
      HiveMindCoordinatorABI,
      provider
    )

    // Get agent details
    const agent = await coordinator.getAgent(address)
    
    if (!agent.active) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      )
    }

    // Get agent's tasks
    const taskIds = await coordinator.getAgentTasks(address)

    return NextResponse.json({
      wallet: agent.wallet,
      endpoint: agent.endpoint,
      capabilities: agent.capabilities,
      reputation: agent.reputation.toString(),
      earnings: ethers.formatUnits(agent.earnings, 6), // USDC has 6 decimals
      tasksCompleted: agent.tasksCompleted.toString(),
      active: agent.active,
      registeredAt: new Date(Number(agent.registeredAt) * 1000).toISOString(),
      taskIds: taskIds.map((id: bigint) => id.toString()),
      network
    })
  } catch (error) {
    console.error('Error fetching agent:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch agent',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}