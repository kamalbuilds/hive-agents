#!/usr/bin/env node
/**
 * Standalone MCP Server
 * Runs the MCP server independently for Claude integration
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js'
import axios from 'axios'
import { ethers } from 'ethers'
import dotenv from 'dotenv'

dotenv.config()

// OpenSea MCP client
class OpenSeaMCPClient {
  constructor(accessToken, mcpUrl) {
    this.client = axios.create({
      baseURL: mcpUrl || 'https://mcp.opensea.io/sse',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    })
  }

  async callTool(tool, params) {
    try {
      const response = await this.client.post('/mcp', { tool, params })
      return response.data
    } catch (error) {
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

// Simulated wallet for demo (in production, this would connect to Electron)
const demoWallet = ethers.Wallet.createRandom()
console.error(`Demo wallet created: ${demoWallet.address}`)

// Create MCP server
const server = new Server(
  {
    name: 'hive-mind-mcp',
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
  return {
    tools: [
      {
        name: 'sign_message',
        description: 'Sign a message with the embedded wallet',
        inputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string', description: 'Message to sign' }
          },
          required: ['message']
        }
      },
      {
        name: 'get_wallet_address',
        description: 'Get the wallet address',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
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
        name: 'get_token_swap_quote',
        description: 'Get a token swap quote',
        inputSchema: {
          type: 'object',
          properties: {
            fromToken: { type: 'string', description: 'From token address' },
            toToken: { type: 'string', description: 'To token address' },
            amount: { type: 'string', description: 'Amount to swap' },
            chain: { type: 'string', description: 'Blockchain' }
          },
          required: ['fromToken', 'toToken', 'amount']
        }
      },
      {
        name: 'get_nft_balances',
        description: 'Get NFTs owned by a wallet',
        inputSchema: {
          type: 'object',
          properties: {
            address: { type: 'string', description: 'Wallet address' },
            chain: { type: 'string', description: 'Blockchain' }
          },
          required: ['address']
        }
      }
    ]
  }
})

// Register tool call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  switch (name) {
    case 'sign_message': {
      const signature = await demoWallet.signMessage(args.message)
      return {
        content: [{
          type: 'text',
          text: `Message signed: ${signature}`
        }]
      }
    }

    case 'get_wallet_address': {
      return {
        content: [{
          type: 'text',
          text: `Wallet address: ${demoWallet.address}`
        }]
      }
    }

    case 'search_nft_collections': {
      try {
        const result = await openSeaClient.callTool('search_collections', {
          query: args.query,
          chain: args.chain || 'ethereum'
        })
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        }
      } catch (error) {
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
          slug: args.slug,
          includes: ['stats', 'analytics']
        })
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        }
      } catch (error) {
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
          timeframe: args.timeframe || 'ONE_DAY',
          chain: args.chain || 'ethereum'
        })
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        }
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error getting trending collections: ${error.message}`
          }]
        }
      }
    }

    case 'get_token_swap_quote': {
      try {
        const result = await openSeaClient.callTool('get_token_swap_quote', {
          fromToken: args.fromToken,
          toToken: args.toToken,
          amount: args.amount,
          chain: args.chain || 'ethereum'
        })
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        }
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error getting swap quote: ${error.message}`
          }]
        }
      }
    }

    case 'get_nft_balances': {
      try {
        const result = await openSeaClient.callTool('get_nft_balances', {
          address: args.address,
          chain: args.chain || 'ethereum'
        })
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        }
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error getting NFT balances: ${error.message}`
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
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('HiveMind MCP Server running...')
}

main().catch(console.error)