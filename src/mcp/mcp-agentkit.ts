#!/usr/bin/env node
/**
 * MCP Server with CDP AgentKit Integration
 * Provides real wallet functionality through Coinbase Developer Platform
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js'
import { getMcpTools } from '@coinbase/agentkit-model-context-protocol'
import { AgentKit, cdpApiActionProvider, openseaActionProvider, pythActionProvider } from '@coinbase/agentkit'
import axios, { AxiosInstance } from 'axios'
import * as dotenv from 'dotenv'
import { CdpEvmWalletProvider } from "@coinbase/agentkit";

dotenv.config()

// Suppress all console.log to prevent JSON parsing errors in MCP
const originalConsoleLog = console.log
console.log = () => {}  // Disable console.log completely

// Suppress dotenv logging to stderr
const originalConsoleError = console.error
console.error = (...args: any[]) => {
  if (args[0] && typeof args[0] === 'string' && args[0].includes('[dotenv@')) {
    return // Suppress dotenv messages
  }
  originalConsoleError.apply(console, args)
}

// OpenSea MCP client
class OpenSeaMCPClient {
  client: AxiosInstance

  constructor(accessToken: string | undefined, mcpUrl: string | undefined) {
    this.client = axios.create({
      baseURL: mcpUrl || 'https://mcp.opensea.io/sse',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    })
  }

  async callTool(tool: string, params: any) {
    try {
      const response = await this.client.post('/mcp', { tool, params })
      return response.data
    } catch (error: any) {
      console.error(`OpenSea MCP ${tool} error:`, error.message)
      throw error
    }
  }
}

// Initialize OpenSea client
const openSeaClient = new OpenSeaMCPClient(
  process.env.OPENSEA_ACCESS_TOKEN,
  process.env.OPENSEA_MCP_URL
)

// Initialize AgentKit with CDP API keys
let agentKit: AgentKit | null = null
let agentKitTools: any = []
let agentKitToolHandler: any = null

async function initializeAgentKit() {
  try {
    // Silent initialization for MCP protocol compliance
    // All debug output must go to stderr, and we should avoid exposing sensitive keys

    const walletProvider = await CdpEvmWalletProvider.configureWithWallet({
      apiKeyId: process.env.CDP_API_KEY_NAME,
      apiKeySecret: process.env.CDP_API_KEY_SECRET,
      networkId: process.env.NETWORK_ID || 'base-mainnet',
      walletSecret: process.env.CDP_WALLET_SECRET,
    });

    // Check for the correct environment variables
    const apiKeyName = process.env.CDP_API_KEY_NAME
    const apiKeySecret = process.env.CDP_API_KEY_SECRET
    const networkId = process.env.NETWORK_ID || 'base-mainnet'
    
    if (apiKeyName && apiKeySecret) {
      
      // Initialize AgentKit with proper configuration
      agentKit = await AgentKit.from({
        walletProvider: walletProvider,
        actionProviders: [
          openseaActionProvider({
            apiKey: process.env.OPENSEA_API_KEY,
            networkId: process.env.NETWORK_ID || 'base-mainnet',
            privateKey: process.env.WALLET_PRIVATE_KEY,
          }),
          pythActionProvider(),
        ],
      })

      // Get MCP-compatible tools from AgentKit
      const mcpTools = await getMcpTools(agentKit);
      agentKitTools = mcpTools.tools
      agentKitToolHandler = mcpTools.toolHandler
    } else {
      console.error('CDP API keys not found, AgentKit tools will be unavailable')
    }
  } catch (error: any) {
    console.error('Failed to initialize AgentKit:', error.message)
    console.error('Error details:', error)
  }
}

// Custom OpenSea tools that leverage AgentKit wallet
const openSeaTools = [
  {
    name: 'search_nft_collections',
    description: 'Search for NFT collections on OpenSea',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        chain: { type: 'string', description: 'Blockchain (ethereum, polygon, etc)' }
      },
      required: ['query']
    }
  },
  {
    name: 'get_collection',
    description: 'Get detailed information about an NFT collection',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Collection slug' }
      },
      required: ['slug']
    }
  },
  {
    name: 'get_trending_collections',
    description: 'Get trending NFT collections',
    inputSchema: {
      type: 'object',
      properties: {
        timeframe: { 
          type: 'string', 
          enum: ['ONE_HOUR', 'ONE_DAY', 'SEVEN_DAYS', 'THIRTY_DAYS'],
          description: 'Time period for trends' 
        },
        chain: { type: 'string', description: 'Blockchain' }
      }
    }
  },
  {
    name: 'get_my_nfts',
    description: 'Get NFTs owned by the AgentKit wallet',
    inputSchema: {
      type: 'object',
      properties: {
        chain: { type: 'string', description: 'Blockchain' }
      }
    }
  },
  {
    name: 'get_nft_floor_price',
    description: 'Get the floor price of an NFT collection',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Collection slug' }
      },
      required: ['slug']
    }
  },
  {
    name: 'analyze_portfolio',
    description: 'Analyze the NFT portfolio of the AgentKit wallet',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
]

// Create MCP server
const server = new Server(
  {
    name: 'hive-mind-agentkit-mcp',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
)

// Register tools list handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  // Combine AgentKit tools with custom OpenSea tools
  const allTools = [...agentKitTools, ...openSeaTools]
  return { tools: allTools }
})

// Register tool call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  // First check if it's an AgentKit tool
  if (agentKitToolHandler && agentKitTools.some((t: any) => t.name === name)) {
    try {
      return await agentKitToolHandler(name, args)
    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `Error executing AgentKit tool ${name}: ${error.message}`
        }]
      }
    }
  }

  // Handle custom OpenSea tools
  // Validate args
  const validatedArgs = args || {}
  
  switch (name) {
    case 'search_nft_collections': {
      try {
        const result = await openSeaClient.callTool('search_collections', {
          query: validatedArgs.query,
          chain: validatedArgs.chain || 'ethereum'
        })
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        }
      } catch (error: any) {
        return {
          content: [{
            type: 'text',
            text: `Error searching collections: ${error.message}`
          }]
        }
      }
    }

    case 'get_collection': {
      try {
        const result = await openSeaClient.callTool('get_collection', {
          slug: validatedArgs.slug,
          includes: ['stats', 'analytics']
        })
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        }
      } catch (error: any) {
        return {
          content: [{
            type: 'text',
            text: `Error getting collection: ${error.message}`
          }]
        }
      }
    }

    case 'get_trending_collections': {
      try {
        const result = await openSeaClient.callTool('get_trending_collections', {
          timeframe: validatedArgs.timeframe || 'ONE_DAY',
          chain: validatedArgs.chain || 'ethereum'
        })
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        }
      } catch (error: any) {
        return {
          content: [{
            type: 'text',
            text: `Error getting trending collections: ${error.message}`
          }]
        }
      }
    }

    case 'get_my_nfts': {
      if (!agentKit) {
        return {
          content: [{
            type: 'text',
            text: 'AgentKit wallet not initialized. Please configure CDP API keys.'
          }]
        }
      }
      
      try {
        const walletAddress = (agentKit as any).walletProvider?.defaultAddress || 'N/A'
        const result = await openSeaClient.callTool('get_nft_balances', {
          address: walletAddress,
          chain: validatedArgs.chain || 'ethereum'
        })
        return {
          content: [{
            type: 'text',
            text: `NFTs owned by wallet ${walletAddress}:\n${JSON.stringify(result, null, 2)}`
          }]
        }
      } catch (error: any) {
        return {
          content: [{
            type: 'text',
            text: `Error getting NFTs: ${error.message}`
          }]
        }
      }
    }

    case 'get_nft_floor_price': {
      try {
        const result = await openSeaClient.callTool('get_collection', {
          slug: validatedArgs.slug,
          includes: ['stats']
        })
        const floorPrice = result?.stats?.floor_price || 'N/A'
        return {
          content: [{
            type: 'text',
            text: `Floor price for ${validatedArgs.slug}: ${floorPrice} ETH`
          }]
        }
      } catch (error: any) {
        return {
          content: [{
            type: 'text',
            text: `Error getting floor price: ${error.message}`
          }]
        }
      }
    }

    case 'analyze_portfolio': {
      if (!agentKit) {
        return {
          content: [{
            type: 'text',
            text: 'AgentKit wallet not initialized. Please configure CDP API keys.'
          }]
        }
      }
      
      try {
        const walletAddress = (agentKit as any).walletProvider?.defaultAddress || 'N/A'
        
        // Get NFT balances
        const nfts = await openSeaClient.callTool('get_nft_balances', {
          address: walletAddress,
          chain: 'ethereum'
        })
        
        // Get token balance from AgentKit wallet provider
        const balance = 'Check via CDP API'
        
        const analysis = {
          wallet: walletAddress,
          nfts: {
            count: nfts?.nfts?.length || 0,
            collections: Array.from(new Set(nfts?.nfts?.map((n: any) => n.collection) || []))
          },
          balance: balance,
          timestamp: new Date().toISOString()
        }
        
        return {
          content: [{
            type: 'text',
            text: `Portfolio Analysis:\n${JSON.stringify(analysis, null, 2)}`
          }]
        }
      } catch (error: any) {
        return {
          content: [{
            type: 'text',
            text: `Error analyzing portfolio: ${error.message}`
          }]
        }
      }
    }

    default:
      throw new Error(`Unknown tool: ${name}`)
  }
})

// Start the server
async function main() {
  // Initialize AgentKit first
  await initializeAgentKit()
  
  // Start MCP server
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('HiveMind AgentKit MCP Server running...')
}

main().catch(console.error)