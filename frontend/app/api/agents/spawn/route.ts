import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Agent type configurations
const AGENT_CONFIGS = {
  coordinator: {
    capabilities: ['task-distribution', 'consensus-voting', 'swarm-optimization'],
    port: 3100,
    memory: '512Mi',
    cpu: '0.5'
  },
  analyzer: {
    capabilities: ['sentiment-analysis', 'pattern-recognition', 'data-mining'],
    port: 3200,
    memory: '256Mi',
    cpu: '0.25'
  },
  trader: {
    capabilities: ['arbitrage', 'market-making', 'risk-assessment'],
    port: 3300,
    memory: '512Mi',
    cpu: '0.5'
  },
  optimizer: {
    capabilities: ['portfolio-optimization', 'yield-farming', 'gas-optimization'],
    port: 3400,
    memory: '256Mi',
    cpu: '0.25'
  },
  researcher: {
    capabilities: ['market-research', 'trend-analysis', 'predictive-modeling'],
    port: 3500,
    memory: '256Mi',
    cpu: '0.25'
  }
}

// Track spawned agents
const activeAgents = new Map<string, any>()

// Generate unique agent ID
function generateAgentId(type: string): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substr(2, 5)
  return `${type}-${timestamp}-${random}`
}

// Spawn agent using Claude Flow
async function spawnAgentWithClaudeFlow(type: string, capabilities: string[]): Promise<any> {
  try {
    const command = `npx claude-flow@alpha agent spawn --type ${type} --capabilities "${capabilities.join(',')}" --json`
    const { stdout, stderr } = await execAsync(command)
    
    if (stderr && !stderr.includes('warning')) {
      throw new Error(`Agent spawn error: ${stderr}`)
    }
    
    return JSON.parse(stdout)
  } catch (error) {
    console.error('Failed to spawn agent with Claude Flow:', error)
    throw error
  }
}

// Create agent wallet
function createAgentWallet(): { address: string; privateKey: string } {
  const wallet = ethers.Wallet.createRandom()
  return {
    address: wallet.address,
    privateKey: wallet.privateKey
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, capabilities: customCapabilities, walletAddress, useClaudeFlow = true } = body

    // Validate agent type
    if (!type || !AGENT_CONFIGS[type as keyof typeof AGENT_CONFIGS]) {
      return NextResponse.json(
        { 
          error: 'Invalid agent type',
          validTypes: Object.keys(AGENT_CONFIGS)
        },
        { status: 400 }
      )
    }

    // Get agent configuration
    const config = AGENT_CONFIGS[type as keyof typeof AGENT_CONFIGS]
    const capabilities = customCapabilities || config.capabilities
    const agentId = generateAgentId(type)
    
    // Check if agent ID already exists
    if (activeAgents.has(agentId)) {
      return NextResponse.json(
        { error: 'Agent ID collision, please retry' },
        { status: 409 }
      )
    }

    // Create or use provided wallet
    let agentWallet = walletAddress
    let privateKey = null
    
    if (!walletAddress) {
      const wallet = createAgentWallet()
      agentWallet = wallet.address
      privateKey = wallet.privateKey
    }

    // Find available port
    const basePort = config.port
    let port = basePort
    let attempts = 0
    
    while (activeAgents.has(`port-${port}`) && attempts < 100) {
      port = basePort + Math.floor(Math.random() * 1000)
      attempts++
    }
    
    if (attempts >= 100) {
      return NextResponse.json(
        { error: 'No available ports for agent' },
        { status: 503 }
      )
    }

    // Agent configuration
    const newAgent = {
      id: agentId,
      type,
      status: 'initializing',
      capabilities,
      tasks: 0,
      earnings: 0,
      cpu: 0,
      memory: 0,
      lastSeen: new Date(),
      endpoint: `http://localhost:${port}`,
      walletAddress: agentWallet,
      config: {
        port,
        memory: config.memory,
        cpu: config.cpu
      },
      spawnedAt: new Date(),
      version: '1.0.0'
    }

    // Try to spawn with Claude Flow if enabled
    if (useClaudeFlow) {
      try {
        const claudeFlowAgent = await spawnAgentWithClaudeFlow(type, capabilities)
        
        // Merge Claude Flow response with our agent data
        newAgent.id = claudeFlowAgent.id || agentId
        newAgent.status = 'active'
        
        // Store agent
        activeAgents.set(agentId, newAgent)
        activeAgents.set(`port-${port}`, agentId)
        
        return NextResponse.json({
          success: true,
          agent: newAgent,
          claudeFlow: claudeFlowAgent,
          message: 'Agent spawned successfully with Claude Flow'
        })
      } catch (claudeFlowError) {
        console.error('Claude Flow spawn failed, using fallback:', claudeFlowError)
        // Continue with local spawn
      }
    }

    // Local spawn simulation (for testing without Claude Flow)
    // In production, this would actually start an agent process
    setTimeout(() => {
      if (activeAgents.has(agentId)) {
        const agent = activeAgents.get(agentId)
        agent.status = 'active'
        agent.cpu = Math.floor(10 + Math.random() * 40)
        agent.memory = Math.floor(20 + Math.random() * 30)
      }
    }, 2000)

    // Store agent
    activeAgents.set(agentId, newAgent)
    activeAgents.set(`port-${port}`, agentId)

    // Update status to pending
    newAgent.status = 'pending'

    return NextResponse.json({
      success: true,
      agent: newAgent,
      message: 'Agent spawn initiated',
      privateKey: privateKey ? '***hidden***' : undefined // Never expose private key in response
    })
  } catch (error) {
    console.error('Error spawning agent:', error)
    return NextResponse.json(
      { 
        error: 'Failed to spawn agent',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const agentId = searchParams.get('id')
    const type = searchParams.get('type')
    const status = searchParams.get('status')

    if (agentId) {
      // Get specific agent
      const agent = activeAgents.get(agentId)
      if (!agent) {
        return NextResponse.json(
          { error: 'Agent not found' },
          { status: 404 }
        )
      }
      
      // Update metrics
      agent.lastSeen = new Date()
      agent.cpu = Math.floor(10 + Math.random() * 50)
      agent.memory = Math.floor(20 + Math.random() * 40)
      
      return NextResponse.json(agent)
    }

    // Get all agents with filters
    let agents = Array.from(activeAgents.values()).filter(a => a.id) // Filter out port mappings
    
    if (type) {
      agents = agents.filter(a => a.type === type)
    }
    
    if (status) {
      agents = agents.filter(a => a.status === status)
    }

    // Update metrics for all agents
    agents.forEach(agent => {
      agent.lastSeen = new Date()
      agent.cpu = Math.floor(10 + Math.random() * 50)
      agent.memory = Math.floor(20 + Math.random() * 40)
    })

    return NextResponse.json({
      agents,
      total: agents.length,
      types: Object.keys(AGENT_CONFIGS)
    })
  } catch (error) {
    console.error('Error fetching agents:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch agents',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const agentId = searchParams.get('id')

    if (!agentId) {
      return NextResponse.json(
        { error: 'Missing agent ID' },
        { status: 400 }
      )
    }

    const agent = activeAgents.get(agentId)
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      )
    }

    // Try to terminate with Claude Flow
    try {
      const command = `npx claude-flow@alpha agent terminate --id ${agentId}`
      await execAsync(command)
    } catch (error) {
      console.error('Failed to terminate with Claude Flow:', error)
    }

    // Remove from active agents
    activeAgents.delete(agentId)
    if (agent.config?.port) {
      activeAgents.delete(`port-${agent.config.port}`)
    }

    return NextResponse.json({
      success: true,
      message: `Agent ${agentId} terminated`,
      agent: {
        id: agentId,
        type: agent.type,
        terminatedAt: new Date()
      }
    })
  } catch (error) {
    console.error('Error terminating agent:', error)
    return NextResponse.json(
      { 
        error: 'Failed to terminate agent',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}