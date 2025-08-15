#!/usr/bin/env node

/**
 * x402 Service Endpoints for Hive Mind AI Agents
 * These endpoints will be discoverable in the x402 Bazaar
 */

import express from 'express'
import cors from 'cors'
import { config } from 'dotenv'
import { paymentMiddleware } from 'x402-express'
import { facilitator as cdpFacilitator } from '@coinbase/x402'
import axios from 'axios'

// Load environment variables
config()

const PORT = process.env.X402_SERVICE_PORT || 3402
const WALLET_ADDRESS = process.env.X402_WALLET_ADDRESS || '0xC8973d8f3cd4Ee6bd5358AcDbE9a4CA517BDd129'
const NETWORK = process.env.X402_USE_MAINNET === 'true' ? 'base' : 'base-sepolia'
const USE_MAINNET = process.env.X402_USE_MAINNET === 'true'

// Configure facilitator based on environment
const facilitatorConfig = USE_MAINNET 
  ? cdpFacilitator // Requires CDP_API_KEY_ID and CDP_API_KEY_SECRET
  : { url: 'https://x402.org/facilitator' }

const app = express()

// Enable CORS
app.use(cors())
app.use(express.json())

// Configure x402 payment middleware with route-specific pricing
app.use(paymentMiddleware(
  WALLET_ADDRESS,
  {
    // AI Agent Oracle Service
    'GET /api/agents/oracle': {
      price: '$0.001',
      network: NETWORK,
      config: {
        description: 'Real-time price oracle service powered by FTSO on Flare Network',
        inputSchema: {
          type: 'object',
          properties: {
            symbols: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'Array of token symbols (e.g., ["BTC", "ETH", "XRP"])' 
            }
          },
          required: ['symbols']
        },
        outputSchema: {
          type: 'object',
          properties: {
            prices: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  symbol: { type: 'string' },
                  price: { type: 'number' },
                  timestamp: { type: 'string' }
                }
              }
            }
          }
        }
      }
    },
    
    // Trading Bot Service
    'POST /api/agents/trader': {
      price: '$0.005',
      network: NETWORK,
      config: {
        description: 'Autonomous trading bot with market-making and arbitrage capabilities',
        inputSchema: {
          type: 'object',
          properties: {
            action: { 
              type: 'string',
              enum: ['analyze', 'execute', 'backtest'],
              description: 'Trading action to perform'
            },
            params: {
              type: 'object',
              description: 'Action-specific parameters'
            }
          },
          required: ['action']
        },
        outputSchema: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            result: { type: 'object' },
            recommendation: { type: 'string' }
          }
        }
      }
    },
    
    // Data Analysis Service
    'POST /api/agents/analyzer': {
      price: '$0.002',
      network: NETWORK,
      config: {
        description: 'Advanced blockchain data analysis and pattern recognition',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['sentiment', 'pattern', 'portfolio'],
              description: 'Type of analysis'
            },
            data: {
              type: 'object',
              description: 'Data to analyze'
            }
          },
          required: ['type', 'data']
        },
        outputSchema: {
          type: 'object',
          properties: {
            analysis: { type: 'object' },
            confidence: { type: 'number' },
            insights: { type: 'array' }
          }
        }
      }
    },
    
    // Swarm Coordinator Service
    'POST /api/agents/coordinator': {
      price: '$0.003',
      network: NETWORK,
      config: {
        description: 'AI swarm coordination and task distribution service',
        inputSchema: {
          type: 'object',
          properties: {
            task: {
              type: 'string',
              description: 'Task to distribute'
            },
            agents: {
              type: 'array',
              items: { type: 'string' },
              description: 'Agent IDs to coordinate'
            }
          },
          required: ['task']
        },
        outputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string' },
            distribution: { type: 'object' },
            status: { type: 'string' }
          }
        }
      }
    }
  },
  facilitatorConfig
))

// Implement the actual service endpoints

// Oracle Service - FTSO Price Feeds
app.get('/api/agents/oracle', async (req, res) => {
  try {
    const symbols = req.query.symbols ? req.query.symbols.split(',') : ['BTC', 'ETH', 'XRP']
    
    // In production, this would fetch from FTSO
    const prices = symbols.map(symbol => ({
      symbol,
      price: Math.random() * 10000, // Mock price
      timestamp: new Date().toISOString()
    }))
    
    res.json({ prices })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Trading Bot Service
app.post('/api/agents/trader', async (req, res) => {
  try {
    const { action, params } = req.body
    
    let result
    switch (action) {
      case 'analyze':
        result = {
          marketCondition: 'bullish',
          opportunities: ['ETH/USDC arbitrage', 'BTC momentum trade'],
          riskLevel: 'medium'
        }
        break
      case 'execute':
        result = {
          orderId: `order_${Date.now()}`,
          status: 'pending',
          estimatedProfit: 0.05
        }
        break
      case 'backtest':
        result = {
          winRate: 0.65,
          totalTrades: 100,
          profitFactor: 1.8
        }
        break
      default:
        result = { error: 'Invalid action' }
    }
    
    res.json({
      success: true,
      result,
      recommendation: 'Continue monitoring market conditions'
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Data Analyzer Service
app.post('/api/agents/analyzer', async (req, res) => {
  try {
    const { type, data } = req.body
    
    let analysis
    switch (type) {
      case 'sentiment':
        analysis = {
          sentiment: 'positive',
          score: 0.75,
          keywords: ['bullish', 'growth', 'adoption']
        }
        break
      case 'pattern':
        analysis = {
          pattern: 'ascending triangle',
          probability: 0.68,
          targetPrice: data.currentPrice * 1.15
        }
        break
      case 'portfolio':
        analysis = {
          diversification: 0.82,
          riskScore: 0.45,
          recommendations: ['Rebalance ETH allocation']
        }
        break
      default:
        analysis = { error: 'Invalid analysis type' }
    }
    
    res.json({
      analysis,
      confidence: 0.85,
      insights: [
        'Market momentum is increasing',
        'Consider taking partial profits'
      ]
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Swarm Coordinator Service
app.post('/api/agents/coordinator', async (req, res) => {
  try {
    const { task, agents = [] } = req.body
    
    const taskId = `task_${Date.now()}`
    const distribution = {}
    
    // Distribute task among agents
    agents.forEach((agentId, index) => {
      distribution[agentId] = {
        subtask: `Subtask ${index + 1}`,
        priority: index === 0 ? 'high' : 'medium',
        deadline: new Date(Date.now() + 3600000).toISOString()
      }
    })
    
    res.json({
      taskId,
      distribution,
      status: 'distributed'
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Health check endpoint (free)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Hive Mind x402 Services',
    network: NETWORK,
    facilitator: USE_MAINNET ? 'CDP (mainnet)' : 'x402.org (testnet)'
  })
})

// Service discovery endpoint (free)
app.get('/api/services', (req, res) => {
  res.json({
    services: [
      {
        name: 'Oracle Service',
        endpoint: '/api/agents/oracle',
        price: '$0.001',
        description: 'FTSO price oracle'
      },
      {
        name: 'Trading Bot',
        endpoint: '/api/agents/trader',
        price: '$0.005',
        description: 'Autonomous trading'
      },
      {
        name: 'Data Analyzer',
        endpoint: '/api/agents/analyzer',
        price: '$0.002',
        description: 'Blockchain analytics'
      },
      {
        name: 'Swarm Coordinator',
        endpoint: '/api/agents/coordinator',
        price: '$0.003',
        description: 'Agent coordination'
      }
    ],
    network: NETWORK,
    paymentRequired: true,
    facilitator: facilitatorConfig.url || 'CDP'
  })
})

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║     Hive Mind x402 Services Running       ║
╠════════════════════════════════════════════╣
║  Port: ${PORT}                            ║
║  Network: ${NETWORK.padEnd(29)}║
║  Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-8).padEnd(18)}║
║  Mode: ${USE_MAINNET ? 'MAINNET (Real Payments)      ' : 'TESTNET (Test Payments)      '}║
╚════════════════════════════════════════════╝

🔥 Your services are now x402-enabled!

Available endpoints (payment required):
  GET  /api/agents/oracle    - Price oracle ($0.001)
  POST /api/agents/trader    - Trading bot ($0.005)
  POST /api/agents/analyzer  - Data analysis ($0.002)
  POST /api/agents/coordinator - Swarm coordination ($0.003)

Free endpoints:
  GET  /health              - Health check
  GET  /api/services        - Service discovery

${USE_MAINNET ? 
  '💰 MAINNET MODE: Accepting real USDC payments via CDP facilitator' : 
  '🧪 TESTNET MODE: Using Base Sepolia with test USDC'}

🌐 Once you hit these endpoints, they'll appear in the x402 Bazaar at:
   https://bazaar.x402.org

📚 Documentation: https://docs.x402.org
  `)
})