/**
 * OpenSea MCP + x402 Protocol Integration Test
 * Complete end-to-end testing of NYC Flare-CDP project components
 */

import { ethers } from 'ethers'
import { Coinbase, Wallet } from '@coinbase/cdp-sdk'
import axios from 'axios'
import WebSocket from 'ws'
import dotenv from 'dotenv'

dotenv.config()

// Configuration
const CONFIG = {
  // OpenSea MCP Configuration
  OPENSEA_MCP_URL: process.env.OPENSEA_MCP_URL || 'https://mcp.opensea.io/sse',
  OPENSEA_ACCESS_TOKEN: process.env.OPENSEA_ACCESS_TOKEN || 'YOUR_ACCESS_TOKEN',
  
  // x402 Protocol Configuration
  X402_DISCOVERY_URL: 'https://discovery.x402.io',
  X402_FACILITATOR_URL: 'https://facilitator.x402.io',
  
  // Flare Network Configuration
  FLARE_RPC: 'https://flare-api.flare.network/ext/C/rpc',
  FTSO_REGISTRY: '0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019',
  
  // Base Sepolia Configuration
  BASE_SEPOLIA_RPC: 'https://sepolia.base.org',
  COORDINATOR_ADDRESS: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  
  // WebSocket Configuration
  WS_URL: 'ws://localhost:8080'
}

// OpenSea MCP Client
class OpenSeaMCPClient {
  constructor(accessToken) {
    this.accessToken = accessToken
    this.mcpUrl = CONFIG.OPENSEA_MCP_URL
  }

  async callTool(tool, params) {
    try {
      const response = await axios.post(this.mcpUrl, {
        tool,
        params
      }, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      })
      return response.data
    } catch (error) {
      console.error(`OpenSea MCP ${tool} error:`, error.message)
      throw error
    }
  }

  async searchCollections(query, chain) {
    return this.callTool('search_collections', { query, chain })
  }

  async getCollection(slug) {
    return this.callTool('get_collection', { slug, includes: ['stats', 'analytics'] })
  }

  async getNFTBalances(address, chain) {
    return this.callTool('get_nft_balances', { address, chain })
  }

  async getSwapQuote(fromToken, toToken, amount, chain) {
    return this.callTool('get_token_swap_quote', { 
      fromToken, 
      toToken, 
      amount, 
      chain 
    })
  }

  async getTrendingCollections(timeframe = 'ONE_DAY', chain) {
    return this.callTool('get_trending_collections', { timeframe, chain })
  }
}

// x402 Protocol Client
class X402Client {
  constructor() {
    this.discoveryUrl = CONFIG.X402_DISCOVERY_URL
    this.facilitatorUrl = CONFIG.X402_FACILITATOR_URL
  }

  async discoverServices() {
    try {
      const response = await axios.get(`${this.discoveryUrl}/api/services`)
      return response.data
    } catch (error) {
      console.error('x402 discovery error:', error.message)
      return []
    }
  }

  async registerService(service) {
    try {
      const response = await axios.post(`${this.discoveryUrl}/api/register`, service)
      return response.data
    } catch (error) {
      console.error('x402 registration error:', error.message)
      throw error
    }
  }

  async createPaymentChannel(params) {
    try {
      const response = await axios.post(`${this.facilitatorUrl}/api/channel`, params)
      return response.data
    } catch (error) {
      console.error('x402 payment channel error:', error.message)
      throw error
    }
  }
}

// Flare FTSO Price Oracle
class FlareFTSOClient {
  constructor(provider) {
    this.provider = provider
    this.ftsoRegistry = new ethers.Contract(
      CONFIG.FTSO_REGISTRY,
      [
        'function getCurrentPricesBySymbols(string[] memory _symbols) external view returns (uint256[] memory _prices, uint256[] memory _timestamps)',
        'function getSupportedSymbols() external view returns (string[] memory)',
        'function getCurrentPrice(string memory _symbol) external view returns (uint256 _price, uint256 _timestamp, uint256 _decimals)'
      ],
      provider
    )
  }

  async getCurrentPrice(symbol) {
    try {
      const result = await this.ftsoRegistry.getCurrentPrice(symbol)
      return {
        price: ethers.formatUnits(result._price, result._decimals),
        timestamp: result._timestamp.toString(),
        decimals: result._decimals.toString()
      }
    } catch (error) {
      console.error(`FTSO price fetch error for ${symbol}:`, error.message)
      return null
    }
  }

  async getMultiplePrices(symbols) {
    try {
      const result = await this.ftsoRegistry.getCurrentPricesBySymbols(symbols)
      return symbols.map((symbol, i) => ({
        symbol,
        price: result._prices[i].toString(),
        timestamp: result._timestamps[i].toString()
      }))
    } catch (error) {
      console.error('FTSO multiple prices error:', error.message)
      return []
    }
  }

  async getSupportedSymbols() {
    try {
      return await this.ftsoRegistry.getSupportedSymbols()
    } catch (error) {
      console.error('FTSO supported symbols error:', error.message)
      return []
    }
  }
}

// CDP AgentKit Integration
class CDPAgentKit {
  constructor() {
    this.wallet = null
    this.isInitialized = false
  }

  async initialize() {
    try {
      // Configure CDP SDK
      Coinbase.configure({
        apiKeyName: process.env.CDP_API_KEY_NAME,
        privateKey: process.env.CDP_API_KEY_PRIVATE_KEY
      })

      // Create wallet
      this.wallet = await Wallet.create()
      this.isInitialized = true
      
      console.log('CDP Wallet created:', this.wallet.getDefaultAddress())
      return this.wallet
    } catch (error) {
      console.error('CDP initialization error:', error.message)
      throw error
    }
  }

  async deploySmartWallet() {
    if (!this.isInitialized) await this.initialize()
    
    try {
      const smartWallet = await this.wallet.deploy()
      console.log('Smart wallet deployed:', smartWallet.getAddress())
      return smartWallet
    } catch (error) {
      console.error('Smart wallet deployment error:', error.message)
      throw error
    }
  }

  async executeTransaction(to, value, data) {
    if (!this.isInitialized) await this.initialize()
    
    try {
      const transfer = await this.wallet.transfer({
        to,
        amount: value,
        assetId: 'eth'
      })
      
      await transfer.wait()
      console.log('Transaction executed:', transfer.getTransactionHash())
      return transfer
    } catch (error) {
      console.error('Transaction execution error:', error.message)
      throw error
    }
  }

  async signMessage(message) {
    if (!this.isInitialized) await this.initialize()
    
    try {
      const signature = await this.wallet.signMessage(message)
      console.log('Message signed:', signature)
      return signature
    } catch (error) {
      console.error('Message signing error:', error.message)
      throw error
    }
  }
}

// WebSocket Connection Manager
class WebSocketManager {
  constructor(url) {
    this.url = url
    this.ws = null
    this.isConnected = false
    this.messageHandlers = new Map()
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url)
      
      this.ws.on('open', () => {
        this.isConnected = true
        console.log('WebSocket connected to:', this.url)
        resolve()
      })
      
      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data)
          this.handleMessage(message)
        } catch (error) {
          console.error('WebSocket message parse error:', error)
        }
      })
      
      this.ws.on('error', (error) => {
        console.error('WebSocket error:', error)
        reject(error)
      })
      
      this.ws.on('close', () => {
        this.isConnected = false
        console.log('WebSocket disconnected')
      })
    })
  }

  send(type, payload) {
    if (!this.isConnected) {
      console.error('WebSocket not connected')
      return
    }
    
    this.ws.send(JSON.stringify({ type, payload }))
  }

  on(type, handler) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, [])
    }
    this.messageHandlers.get(type).push(handler)
  }

  handleMessage(message) {
    const handlers = this.messageHandlers.get(message.type) || []
    handlers.forEach(handler => handler(message.payload))
  }

  close() {
    if (this.ws) {
      this.ws.close()
    }
  }
}

// Main Integration Test Suite
async function runIntegrationTests() {
  console.log('🚀 NYC Flare-CDP Integration Test Suite\n')
  console.log('=' .repeat(50))
  
  // Initialize clients
  const openSeaMCP = new OpenSeaMCPClient(CONFIG.OPENSEA_ACCESS_TOKEN)
  const x402Client = new X402Client()
  const flareProvider = new ethers.JsonRpcProvider(CONFIG.FLARE_RPC)
  const ftsoClient = new FlareFTSOClient(flareProvider)
  const cdpAgent = new CDPAgentKit()
  const wsManager = new WebSocketManager(CONFIG.WS_URL)
  
  // Test results
  const results = {
    opensea: { success: false, data: null },
    x402: { success: false, data: null },
    ftso: { success: false, data: null },
    cdp: { success: false, data: null },
    websocket: { success: false, data: null }
  }
  
  // Test 1: OpenSea MCP Integration
  console.log('\n📦 Test 1: OpenSea MCP Integration')
  console.log('-'.repeat(40))
  try {
    // Search for trending collections
    const trending = await openSeaMCP.getTrendingCollections('ONE_DAY', 'ethereum')
    console.log(`✅ Found ${trending.collections?.length || 0} trending collections`)
    
    // Get specific collection
    const bayc = await openSeaMCP.getCollection('boredapeyachtclub')
    console.log('✅ BAYC Floor Price:', bayc?.stats?.floor_price || 'N/A')
    
    // Get swap quote
    const swapQuote = await openSeaMCP.getSwapQuote(
      '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
      '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
      '1',
      'ethereum'
    )
    console.log('✅ Swap Quote:', swapQuote ? `1 WETH = ${swapQuote.toAmount} USDC` : 'N/A')
    
    results.opensea = { success: true, data: { trending, bayc, swapQuote } }
  } catch (error) {
    console.error('❌ OpenSea MCP test failed:', error.message)
  }
  
  // Test 2: x402 Protocol Discovery
  console.log('\n🔍 Test 2: x402 Protocol Discovery')
  console.log('-'.repeat(40))
  try {
    // Discover available services
    const services = await x402Client.discoverServices()
    console.log(`✅ Discovered ${services.length} x402 services`)
    
    // Register test service
    const registration = await x402Client.registerService({
      name: 'HiveMind AI Agent',
      endpoint: 'https://hivemind.ai/agent',
      capabilities: ['nft-analysis', 'price-prediction', 'trading'],
      pricing: {
        model: 'per-request',
        amount: '0.001',
        currency: 'ETH'
      }
    })
    console.log('✅ Service registered:', registration.id || 'Success')
    
    // Create payment channel
    const channel = await x402Client.createPaymentChannel({
      provider: registration.id,
      consumer: '0x1234...', // Consumer address
      amount: '0.1',
      duration: 3600 // 1 hour
    })
    console.log('✅ Payment channel created:', channel.channelId || 'Success')
    
    results.x402 = { success: true, data: { services, registration, channel } }
  } catch (error) {
    console.error('❌ x402 Protocol test failed:', error.message)
  }
  
  // Test 3: Flare FTSO Price Oracle
  console.log('\n💰 Test 3: Flare FTSO Price Oracle')
  console.log('-'.repeat(40))
  try {
    // Get supported symbols
    const symbols = await ftsoClient.getSupportedSymbols()
    console.log(`✅ Supported symbols: ${symbols.slice(0, 5).join(', ')}...`)
    
    // Get ETH price
    const ethPrice = await ftsoClient.getCurrentPrice('ETH')
    console.log(`✅ ETH Price: $${ethPrice?.price || 'N/A'}`)
    
    // Get multiple prices
    const prices = await ftsoClient.getMultiplePrices(['BTC', 'ETH', 'FLR'])
    prices.forEach(p => {
      console.log(`   ${p.symbol}: ${ethers.formatUnits(p.price, 5)}`)
    })
    
    results.ftso = { success: true, data: { symbols, ethPrice, prices } }
  } catch (error) {
    console.error('❌ FTSO Oracle test failed:', error.message)
  }
  
  // Test 4: CDP AgentKit
  console.log('\n🤖 Test 4: CDP AgentKit Integration')
  console.log('-'.repeat(40))
  try {
    // Initialize CDP wallet
    const wallet = await cdpAgent.initialize()
    console.log('✅ CDP Wallet initialized')
    
    // Sign test message
    const signature = await cdpAgent.signMessage('Hello from HiveMind!')
    console.log('✅ Message signed successfully')
    
    // Deploy smart wallet (if needed)
    // const smartWallet = await cdpAgent.deploySmartWallet()
    // console.log('✅ Smart wallet deployed')
    
    results.cdp = { success: true, data: { wallet: wallet.getDefaultAddress(), signature } }
  } catch (error) {
    console.error('❌ CDP AgentKit test failed:', error.message)
  }
  
  // Test 5: WebSocket Real-time Updates
  console.log('\n🔄 Test 5: WebSocket Real-time Updates')
  console.log('-'.repeat(40))
  try {
    // Connect to WebSocket
    await wsManager.connect()
    console.log('✅ WebSocket connected')
    
    // Set up message handlers
    wsManager.on('price_update', (data) => {
      console.log('   Price update:', data)
    })
    
    wsManager.on('task_assigned', (data) => {
      console.log('   Task assigned:', data)
    })
    
    wsManager.on('agent_status', (data) => {
      console.log('   Agent status:', data)
    })
    
    // Send test messages
    wsManager.send('subscribe', { channels: ['prices', 'tasks', 'agents'] })
    wsManager.send('heartbeat', { timestamp: Date.now() })
    
    // Wait for some messages
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    results.websocket = { success: true, data: { connected: true } }
  } catch (error) {
    console.error('❌ WebSocket test failed:', error.message)
  } finally {
    wsManager.close()
  }
  
  // Test 6: Combined Workflow
  console.log('\n🎯 Test 6: Combined Workflow - NFT Analysis with Pricing')
  console.log('-'.repeat(40))
  try {
    // Step 1: Get trending NFT collection
    const trending = await openSeaMCP.getTrendingCollections('ONE_DAY', 'ethereum')
    const topCollection = trending.collections?.[0]
    console.log(`1️⃣ Top trending collection: ${topCollection?.name || 'Unknown'}`)
    
    // Step 2: Get ETH price from FTSO
    const ethPrice = await ftsoClient.getCurrentPrice('ETH')
    const ethUSD = parseFloat(ethPrice?.price || '0')
    console.log(`2️⃣ Current ETH price: $${ethUSD}`)
    
    // Step 3: Calculate floor price in USD
    const floorETH = topCollection?.stats?.floor_price || 0
    const floorUSD = floorETH * ethUSD
    console.log(`3️⃣ Floor price: ${floorETH} ETH ($${floorUSD.toFixed(2)})`)
    
    // Step 4: Create x402 service offer
    const serviceOffer = {
      service: 'nft-valuation',
      collection: topCollection?.slug,
      floorPrice: floorUSD,
      timestamp: Date.now()
    }
    console.log(`4️⃣ x402 service offer created:`, serviceOffer.service)
    
    // Step 5: Sign with CDP wallet
    const signedOffer = await cdpAgent.signMessage(JSON.stringify(serviceOffer))
    console.log(`5️⃣ Offer signed with CDP wallet`)
    
    console.log('\n✅ Combined workflow completed successfully!')
  } catch (error) {
    console.error('❌ Combined workflow failed:', error.message)
  }
  
  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 Test Results Summary:')
  console.log('-'.repeat(40))
  
  Object.entries(results).forEach(([test, result]) => {
    const status = result.success ? '✅' : '❌'
    console.log(`${status} ${test.toUpperCase()}: ${result.success ? 'PASSED' : 'FAILED'}`)
  })
  
  const totalTests = Object.keys(results).length
  const passedTests = Object.values(results).filter(r => r.success).length
  const successRate = ((passedTests / totalTests) * 100).toFixed(1)
  
  console.log('\n' + '='.repeat(50))
  console.log(`🎯 Overall Success Rate: ${successRate}% (${passedTests}/${totalTests} tests passed)`)
  console.log('='.repeat(50))
  
  return results
}

// Execute tests
if (import.meta.url === `file://${process.argv[1]}`) {
  runIntegrationTests()
    .then(() => {
      console.log('\n✨ Integration tests completed!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Integration tests failed:', error)
      process.exit(1)
    })
}

export {
  OpenSeaMCPClient,
  X402Client,
  FlareFTSOClient,
  CDPAgentKit,
  WebSocketManager,
  runIntegrationTests
}