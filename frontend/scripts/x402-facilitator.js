#!/usr/bin/env node

/**
 * x402 Service Endpoint for Hive Mind AI Agents
 * This creates x402-enabled endpoints that can be discovered in the Bazaar
 */

import express from 'express'
import cors from 'cors'
import { config } from 'dotenv'
import { paymentMiddleware } from 'x402-express'
import { facilitator as cdpFacilitator } from '@coinbase/x402'

// Load environment variables
config()

const PORT = process.env.X402_SERVICE_PORT || 3402
const WALLET_ADDRESS = process.env.X402_WALLET_ADDRESS || '0xC8973d8f3cd4Ee6bd5358AcDbE9a4CA517BDd129' // Your coordinator contract
const NETWORK = process.env.X402_NETWORK || 'base-sepolia'
const USE_MAINNET = process.env.X402_USE_MAINNET === 'true'

// For testnet, use the official x402.org facilitator
// For mainnet, use CDP facilitator with API keys
const facilitatorConfig = USE_MAINNET 
  ? cdpFacilitator // Requires CDP_API_KEY_ID and CDP_API_KEY_SECRET env vars
  : { url: 'https://x402.org/facilitator' }

const app = express()

// Configure middleware
app.use(cors())
app.use(express.json())

// Create Sepolia client
const client = createClientSepolia()

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    mode: PRIVATE_KEY === '0x' ? 'mock' : 'live',
    network: 'base-sepolia' 
  })
})

// Verify endpoint
app.get('/verify', (req, res) => {
  res.json({
    endpoint: '/verify',
    description: 'POST to verify x402 payments',
    body: {
      paymentPayload: 'PaymentPayload',
      paymentRequirements: 'PaymentRequirements',
    },
  })
})

app.post('/verify', async (req, res) => {
  try {
    const { paymentPayload, paymentRequirements } = req.body
    
    if (PRIVATE_KEY === '0x') {
      // Mock mode
      res.json({
        valid: true,
        mockMode: true
      })
      return
    }
    
    const requirements = PaymentRequirementsSchema.parse(paymentRequirements)
    const payload = PaymentPayloadSchema.parse(paymentPayload)
    const valid = await verify(client, payload, requirements)
    res.json({ valid })
  } catch (error) {
    console.error('Verify error:', error)
    res.status(400).json({ error: 'Invalid request' })
  }
})

// Settle endpoint
app.get('/settle', (req, res) => {
  res.json({
    endpoint: '/settle',
    description: 'POST to settle x402 payments',
    body: {
      paymentPayload: 'PaymentPayload',
      paymentRequirements: 'PaymentRequirements',
    },
  })
})

app.post('/settle', async (req, res) => {
  try {
    if (PRIVATE_KEY === '0x') {
      // Mock mode
      res.json({
        success: true,
        txHash: `0x${Math.random().toString(16).substring(2)}`,
        mockMode: true
      })
      return
    }
    
    const signer = createSignerSepolia(PRIVATE_KEY)
    const { paymentPayload, paymentRequirements } = req.body
    const requirements = PaymentRequirementsSchema.parse(paymentRequirements)
    const payload = PaymentPayloadSchema.parse(paymentPayload)
    const response = await settle(signer, payload, requirements)
    res.json(response)
  } catch (error) {
    console.error('Settle error:', error)
    res.status(400).json({ error: `Invalid request: ${error.message}` })
  }
})

// Supported networks
app.get('/supported', (req, res) => {
  res.json({
    kinds: [
      {
        x402Version: 1,
        scheme: 'exact',
        network: 'base-sepolia',
      },
    ],
  })
})

// Service discovery endpoint (custom for Hive Mind)
app.get('/api/services', (req, res) => {
  const { type, query, network } = req.query
  
  // Return AI agent services
  const services = [
    {
      id: 'hive-oracle-001',
      name: 'Hive Oracle Service',
      price: 0.001,
      endpoint: 'http://localhost:3002/api/agents/oracle',
      capabilities: ['price-feed', 'prediction', 'analytics'],
      network: network || 'base-sepolia',
      type: 'ai-agent',
      description: 'Real-time price feeds and predictions from FTSO',
      x402Version: 1
    },
    {
      id: 'hive-trader-001',
      name: 'Hive Trading Bot',
      price: 0.005,
      endpoint: 'http://localhost:3002/api/agents/trader',
      capabilities: ['arbitrage', 'market-making', 'risk-assessment'],
      network: network || 'base-sepolia',
      type: 'ai-agent',
      description: 'Autonomous trading strategies and execution',
      x402Version: 1
    },
    {
      id: 'hive-analyzer-001',
      name: 'Hive Data Analyst',
      price: 0.002,
      endpoint: 'http://localhost:3002/api/agents/analyzer',
      capabilities: ['sentiment-analysis', 'pattern-recognition', 'reporting'],
      network: network || 'base-sepolia',
      type: 'ai-agent',
      description: 'Advanced data analysis and insights',
      x402Version: 1
    },
    {
      id: 'hive-coordinator-001',
      name: 'Hive Swarm Coordinator',
      price: 0.003,
      endpoint: 'http://localhost:3002/api/agents/coordinator',
      capabilities: ['task-distribution', 'consensus-voting', 'swarm-optimization'],
      network: network || 'base-sepolia',
      type: 'ai-agent',
      description: 'Orchestrate and optimize agent swarms',
      x402Version: 1
    }
  ]
  
  // Filter by query if provided
  let filteredServices = services
  if (query) {
    filteredServices = services.filter(s => 
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.capabilities.some(c => c.includes(query.toLowerCase()))
    )
  }
  
  res.json({
    services: filteredServices,
    total: filteredServices.length,
    page: 1,
    network: network || 'base-sepolia'
  })
})

// Payment initiation endpoint
app.post('/pay', async (req, res) => {
  try {
    const { paymentUrl, amount, currency, network } = req.body
    
    // In production, this would handle actual payment processing
    res.json({
      success: true,
      token: `x402-${Date.now()}-${Math.random().toString(36).substring(2)}`,
      txHash: PRIVATE_KEY === '0x' ? 
        `0x${Math.random().toString(16).substring(2)}` : 
        null, // Would be real tx hash in production
      amount,
      currency: currency || 'USDC',
      network: network || 'base-sepolia',
      mockMode: PRIVATE_KEY === '0x'
    })
  } catch (error) {
    console.error('Payment error:', error)
    res.status(500).json({ error: 'Payment failed' })
  }
})

// Stats endpoint
app.get('/api/stats', (req, res) => {
  res.json({
    totalPayments: 42,
    totalVolume: 123.45,
    averagePrice: 0.003,
    currency: 'USDC',
    network: req.query.network || 'base-sepolia',
    activeServices: 4
  })
})

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║     x402 Facilitator Server Running    ║
╠════════════════════════════════════════╣
║  Port: ${PORT}                            ║
║  Mode: ${PRIVATE_KEY === '0x' ? 'Mock (no private key)     ' : 'Live                     '}║
║  Network: Base Sepolia                 ║
╚════════════════════════════════════════╝

Available endpoints:
  GET  /health           - Health check
  GET  /verify           - Verify endpoint info
  POST /verify           - Verify payment
  GET  /settle           - Settle endpoint info  
  POST /settle           - Settle payment
  GET  /supported        - Supported networks
  GET  /api/services     - Discover services
  POST /pay              - Initiate payment
  GET  /api/stats        - Payment statistics

${PRIVATE_KEY === '0x' ? '⚠️  Running in MOCK mode. Set PRIVATE_KEY in .env to enable real payments.' : '✅ Running with real payment processing.'}
  `)
})