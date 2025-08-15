#!/usr/bin/env node

// HIVE MIND - Swarm Initialization Script
import SwarmCoordinator from '../src/agents/swarm-coordinator.js'
import AgentMCPServer from '../src/agents/mcp-server.js'
import X402PaymentGateway from '../src/agents/x402-gateway.js'
import TEETradingEngine from '../src/defi/tee-trading-engine.js'
import FlareIntegration from '../src/defi/flare-integration.js'
import dotenv from 'dotenv'

dotenv.config()

console.log('🧠 HIVE MIND - Initializing Autonomous AI Agent Swarm...')
console.log('================================================')

async function initializeSwarm() {
  try {
    // 1. Initialize Swarm Coordinator (Queen)
    console.log('\n👑 Initializing Queen Coordinator...')
    const swarmCoordinator = new SwarmCoordinator({
      swarmId: `hive-mind-${Date.now()}`,
      topology: 'hierarchical',
      maxAgents: 10,
      consensusThreshold: 0.51
    })
    console.log('✅ Queen coordinator active')

    // 2. Initialize Payment Gateway
    console.log('\n💳 Setting up x402 Payment Gateway...')
    const paymentGateway = new X402PaymentGateway({
      facilitatorUrl: process.env.X402_FACILITATOR_URL || 'https://facilitator.x402.org',
      network: process.env.NETWORK || 'base',
      walletAddress: process.env.WALLET_ADDRESS
    })
    console.log('✅ Payment gateway configured')

    // 3. Initialize Flare Integration
    console.log('\n🔥 Connecting to Flare Network...')
    const flareIntegration = new FlareIntegration({
      network: process.env.FLARE_NETWORK || 'coston2'
    })
    
    // Get initial prices
    const prices = await flareIntegration.getMultiplePrices(['FLR/USD', 'XRP/USD'])
    console.log('✅ Flare FTSO connected')
    console.log('   Current prices:', prices)

    // 4. Initialize TEE Trading Engine
    console.log('\n🔒 Initializing TEE-Secured Trading Engine...')
    const tradingEngine = new TEETradingEngine({
      teeMode: process.env.TEE_MODE === 'true',
      flareRPC: process.env.FLARE_RPC,
      maxSlippage: 0.03,
      minProfit: 0.005,
      riskLimit: 0.1
    })
    console.log('✅ Trading engine ready')

    // 5. Spawn Initial Agents
    console.log('\n🐝 Spawning initial agent swarm...')
    
    const agentTypes = [
      { type: 'researcher', capabilities: ['data-analysis', 'pattern-recognition'], port: 3001 },
      { type: 'trader', capabilities: ['arbitrage', 'risk-assessment'], port: 3002 },
      { type: 'analyzer', capabilities: ['sentiment-analysis', 'price-prediction'], port: 3003 },
      { type: 'optimizer', capabilities: ['portfolio-optimization', 'yield-farming'], port: 3004 }
    ]

    const agents = []
    for (const config of agentTypes) {
      console.log(`   Spawning ${config.type} agent...`)
      
      // Create MCP server for agent
      const agentServer = new AgentMCPServer({
        port: config.port,
        agentId: `agent-${config.type}-${Date.now()}`,
        capabilities: config.capabilities.map(cap => ({
          name: cap,
          description: `Capability: ${cap}`,
          type: config.type,
          parameters: [],
          price: 0.001 + Math.random() * 0.009
        })),
        walletAddress: process.env.WALLET_ADDRESS,
        pricePerRequest: 0.001
      })

      // Register service with payment gateway
      for (const capability of config.capabilities) {
        await paymentGateway.registerService(`${config.type}-${capability}`, {
          name: `${config.type} ${capability}`,
          description: `AI agent service for ${capability}`,
          pricePerCall: 0.001 + Math.random() * 0.009,
          endpoint: `http://localhost:${config.port}/api/tools/${capability}/execute`,
          capabilities: [capability]
        })
      }

      // Register agent with swarm coordinator
      const agent = await swarmCoordinator.registerAgent({
        id: agentServer.agentId,
        type: config.type,
        capabilities: config.capabilities,
        endpoint: `http://localhost:${config.port}`
      })

      // Start MCP server
      agentServer.start()
      agents.push({ server: agentServer, config: agent })
      
      console.log(`   ✅ ${config.type} agent spawned on port ${config.port}`)
    }

    // 6. Create initial tasks
    console.log('\n📋 Creating initial tasks...')
    
    const tasks = [
      { type: 'analysis', description: 'Analyze market sentiment', reward: 0.01 },
      { type: 'prediction', description: 'Predict FLR price movement', reward: 0.05 },
      { type: 'optimization', description: 'Optimize yield farming strategy', reward: 0.03 }
    ]

    for (const taskConfig of tasks) {
      const task = await swarmCoordinator.createTask(taskConfig)
      console.log(`   ✅ Task created: ${taskConfig.description} (${taskConfig.reward} USDC)`)
    }

    // 7. Start monitoring
    console.log('\n📊 Starting swarm monitoring...')
    
    // Monitor prices
    flareIntegration.subscribeToPriceUpdates(
      ['FLR/USD', 'XRP/USD', 'BTC/USD', 'ETH/USD'],
      (prices) => {
        console.log('📈 Price update:', prices)
      },
      30000 // Update every 30 seconds
    )

    // Monitor arbitrage opportunities
    tradingEngine.startMonitoring(
      ['FLR/USD', 'XRP/USD'],
      ['blazeswap', 'sparkdex', 'kinetic', 'oracle-swap']
    )

    // 8. Display swarm statistics
    setInterval(() => {
      const stats = swarmCoordinator.getStatistics()
      console.log('\n📊 Swarm Statistics:')
      console.log(`   Agents: ${stats.agents.active}/${stats.agents.total} active`)
      console.log(`   Tasks: ${stats.tasks.completed}/${stats.tasks.total} completed`)
      console.log(`   Earnings: $${stats.earnings.toFixed(2)} USDC`)
      console.log(`   Memory: ${stats.sharedMemory} items stored`)
    }, 60000) // Every minute

    console.log('\n================================================')
    console.log('🎉 HIVE MIND SWARM INITIALIZED SUCCESSFULLY!')
    console.log('================================================')
    console.log('\nSwarm Configuration:')
    console.log(`  Swarm ID: ${swarmCoordinator.swarmId}`)
    console.log(`  Topology: ${swarmCoordinator.topology}`)
    console.log(`  Active Agents: ${agents.length}`)
    console.log(`  Network: ${process.env.NETWORK || 'base'}`)
    console.log(`  Flare Network: ${process.env.FLARE_NETWORK || 'coston2'}`)
    console.log('\n🌐 Access Points:')
    console.log(`  Dashboard: http://localhost:3000`)
    console.log(`  Agent APIs: http://localhost:3001-3004`)
    console.log(`  x402 Bazaar: https://bazaar.x402.org`)
    console.log('\nPress Ctrl+C to stop the swarm')

  } catch (error) {
    console.error('❌ Failed to initialize swarm:', error)
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down HIVE MIND swarm...')
  process.exit(0)
})

// Initialize the swarm
initializeSwarm()