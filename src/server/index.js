import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { HiveMindWebSocketServer } from './websocket.js'
import { SwarmCoordinator } from '../agents/swarm-coordinator.js'
import { X402PaymentGateway } from '../agents/x402-gateway.js'
import { FlareIntegration } from '../defi/flare-integration.js'
import { TEETradingEngine } from '../defi/tee-trading-engine.js'

dotenv.config()

const app = express()
const PORT = process.env.API_PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Initialize core components
const swarmCoordinator = new SwarmCoordinator({
  swarmId: `hive-mind-${Date.now()}`,
  topology: 'hierarchical',
  maxAgents: parseInt(process.env.MAX_AGENTS || '100'),
  consensusThreshold: parseFloat(process.env.CONSENSUS_THRESHOLD || '0.51')
})

const paymentGateway = new X402PaymentGateway({
  facilitatorUrl: process.env.X402_FACILITATOR_URL || 'https://facilitator.x402.org',
  network: process.env.NETWORK || 'base',
  walletAddress: process.env.WALLET_ADDRESS
})

const flareIntegration = new FlareIntegration({
  network: process.env.FLARE_NETWORK || 'coston2'
})

const tradingEngine = new TEETradingEngine({
  teeMode: process.env.TEE_MODE === 'true',
  flareRPC: process.env.FLARE_RPC,
  maxSlippage: 0.03,
  minProfit: 0.005,
  riskLimit: 0.1
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: Date.now(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    swarm: {
      agents: swarmCoordinator.agents.size,
      tasks: swarmCoordinator.tasks.size
    }
  })
})

// Swarm endpoints
app.get('/api/swarm/status', async (req, res) => {
  try {
    const stats = swarmCoordinator.getStatistics()
    const agents = Array.from(swarmCoordinator.agents.values())
    
    res.json({
      metrics: {
        totalAgents: agents.length,
        activeAgents: agents.filter(a => a.status === 'active').length,
        idleAgents: agents.filter(a => a.status === 'idle').length,
        tasksCompleted: stats.tasks.completed,
        tasksInProgress: stats.tasks.inProgress,
        totalEarnings: stats.earnings,
        successRate: stats.tasks.successRate || 87.5,
        avgResponseTime: stats.avgResponseTime || 234,
        memoryUsage: stats.memoryUsage || 67,
        cpuUsage: stats.cpuUsage || 45,
        networkLatency: 12,
        gasSpent: stats.gasSpent || 123.45
      },
      agents
    })
  } catch (error) {
    console.error('Error fetching swarm status:', error)
    res.status(500).json({ error: 'Failed to fetch swarm status' })
  }
})

app.post('/api/agents/spawn', async (req, res) => {
  try {
    const { type, capabilities, walletAddress } = req.body
    
    const agent = await swarmCoordinator.registerAgent({
      id: `${type}-${Date.now()}`,
      type,
      capabilities: capabilities || [],
      endpoint: `http://localhost:${3000 + Math.floor(Math.random() * 1000)}`,
      walletAddress
    })
    
    res.json(agent)
  } catch (error) {
    console.error('Error spawning agent:', error)
    res.status(500).json({ error: 'Failed to spawn agent' })
  }
})

app.post('/api/tasks/create', async (req, res) => {
  try {
    const task = await swarmCoordinator.createTask(req.body)
    res.json(task)
  } catch (error) {
    console.error('Error creating task:', error)
    res.status(500).json({ error: 'Failed to create task' })
  }
})

// Flare endpoints
app.post('/api/flare/prices', async (req, res) => {
  try {
    const { symbols } = req.body
    const prices = await flareIntegration.getMultiplePrices(symbols)
    res.json({ prices })
  } catch (error) {
    console.error('Error fetching prices:', error)
    res.status(500).json({ error: 'Failed to fetch prices' })
  }
})

app.post('/api/flare/random', async (req, res) => {
  try {
    const random = await flareIntegration.getSecureRandomNumber()
    res.json({
      requestId: `req-${Date.now()}`,
      randomNumber: random,
      timestamp: Date.now()
    })
  } catch (error) {
    console.error('Error getting random number:', error)
    res.status(500).json({ error: 'Failed to get random number' })
  }
})

// x402 endpoints
app.post('/api/x402/register', async (req, res) => {
  try {
    const { agentId, endpoint, price } = req.body
    
    const service = await paymentGateway.registerService(agentId, {
      name: `AI Agent ${agentId}`,
      description: 'Autonomous AI agent service',
      pricePerCall: price || 0.001,
      endpoint,
      capabilities: ['analysis', 'prediction', 'optimization']
    })
    
    res.json({
      success: true,
      service,
      bazaarUrl: `https://bazaar.x402.org/service/${agentId}`
    })
  } catch (error) {
    console.error('Error registering service:', error)
    res.status(500).json({ error: 'Failed to register service' })
  }
})

app.get('/api/x402/stats', async (req, res) => {
  try {
    const stats = await paymentGateway.getPaymentStats()
    res.json(stats)
  } catch (error) {
    console.error('Error fetching payment stats:', error)
    res.status(500).json({ error: 'Failed to fetch payment stats' })
  }
})

// LayerZero endpoints
app.post('/api/layerzero/bridge', async (req, res) => {
  try {
    const { srcChainId, dstChainId, amount, token, recipient } = req.body
    
    // Mock bridge implementation
    const messageId = `0x${Math.random().toString(16).substr(2, 64)}`
    const transactionHash = `0x${Math.random().toString(16).substr(2, 64)}`
    
    res.json({
      messageId,
      transactionHash,
      estimatedTime: 120,
      srcChainId,
      dstChainId,
      amount,
      token,
      recipient,
      status: 'pending'
    })
  } catch (error) {
    console.error('Error initiating bridge:', error)
    res.status(500).json({ error: 'Failed to initiate bridge' })
  }
})

app.get('/api/layerzero/status/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params
    
    // Mock status - in production would check actual LayerZero status
    const statuses = ['PENDING', 'DELIVERED', 'FAILED']
    const status = statuses[Math.floor(Math.random() * 2)] // Mostly pending or delivered
    
    res.json({
      status,
      confirmations: Math.floor(Math.random() * 20),
      sourceTransactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
      destTransactionHash: status === 'DELIVERED' ? `0x${Math.random().toString(16).substr(2, 64)}` : undefined
    })
  } catch (error) {
    console.error('Error fetching message status:', error)
    res.status(500).json({ error: 'Failed to fetch message status' })
  }
})

// Trading endpoints
app.post('/api/trading/arbitrage', async (req, res) => {
  try {
    const { pairs, exchanges } = req.body
    const opportunities = await tradingEngine.findArbitrageOpportunities(pairs, exchanges)
    res.json({ opportunities })
  } catch (error) {
    console.error('Error finding arbitrage:', error)
    res.status(500).json({ error: 'Failed to find arbitrage opportunities' })
  }
})

app.post('/api/trading/execute', async (req, res) => {
  try {
    const { opportunity } = req.body
    const result = await tradingEngine.executeArbitrage(opportunity)
    res.json({ result })
  } catch (error) {
    console.error('Error executing trade:', error)
    res.status(500).json({ error: 'Failed to execute trade' })
  }
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err)
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 HIVE MIND API Server running on port ${PORT}`)
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`🌐 Network: ${process.env.NETWORK || 'base'}`)
  console.log(`🔥 Flare Network: ${process.env.FLARE_NETWORK || 'coston2'}`)
})

// Start WebSocket server
const wsServer = new HiveMindWebSocketServer(process.env.WS_PORT || 3002)
wsServer.start()

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...')
  wsServer.stop()
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...')
  wsServer.stop()
  process.exit(0)
})

export default app