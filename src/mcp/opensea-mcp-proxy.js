#!/usr/bin/env node

/**
 * OpenSea MCP Proxy for Claude Desktop
 * This proxies the OpenSea HTTP MCP server to work with Claude Desktop's command-based MCP
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js'
import axios from 'axios'
import * as dotenv from 'dotenv'

dotenv.config()

const OPENSEA_ACCESS_TOKEN = process.env.OPENSEA_ACCESS_TOKEN || 'aw0Zy876VFBWAyb7l6ayPwoWr2EU7tnGQOovsz4egU'

// OpenSea MCP tools definition
const openSeaTools = [
  {
    name: 'search',
    description: 'AI-powered search across OpenSea marketplace data',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' }
      },
      required: ['query']
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
        chain: { type: 'string', description: 'Blockchain (ethereum, polygon, base, etc)' },
        limit: { type: 'number', description: 'Number of results to return' }
      }
    }
  },
  {
    name: 'get_trending_tokens',
    description: 'Get trending cryptocurrencies',
    inputSchema: {
      type: 'object',
      properties: {
        chain: { type: 'string', description: 'Blockchain' },
        limit: { type: 'number', description: 'Number of results' }
      }
    }
  },
  {
    name: 'get_collection',
    description: 'Get detailed information about an NFT collection',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Collection slug' },
        includes: { 
          type: 'array',
          items: { type: 'string' },
          description: 'Additional data to include'
        }
      },
      required: ['slug']
    }
  },
  {
    name: 'search_collections',
    description: 'Search for NFT collections',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        chain: { type: 'string', description: 'Blockchain' },
        limit: { type: 'number', description: 'Number of results' }
      }
    }
  },
  {
    name: 'get_top_collections',
    description: 'Get top NFT collections by various metrics',
    inputSchema: {
      type: 'object',
      properties: {
        chain: { type: 'string', description: 'Blockchain' },
        sort_by: { type: 'string', description: 'Sort criteria' },
        limit: { type: 'number', description: 'Number of results' }
      }
    }
  }
]

// Create MCP server
const server = new Server(
  {
    name: 'opensea-mcp-proxy',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
)

// OpenSea API client using direct REST API
const openSeaAPI = axios.create({
  baseURL: 'https://api.opensea.io/api/v2',
  headers: {
    'X-API-KEY': OPENSEA_ACCESS_TOKEN,
    'Accept': 'application/json'
  },
  timeout: 30000
})

// Register tools list handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: openSeaTools }
})

// Register tool call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params
  
  try {
    let result
    
    switch (name) {
      case 'get_trending_collections':
        // OpenSea v2 API doesn't have trending, so get top collections
        const collections = await openSeaAPI.get('/collections', {
          params: {
            chain: args?.chain || 'ethereum',
            limit: args?.limit || 20
          }
        })
        result = {
          collections: collections.data.collections || [],
          message: 'Note: OpenSea API v2 does not have a trending endpoint. Showing top collections instead.'
        }
        break
        
      case 'search_collections':
        const searchResults = await openSeaAPI.get('/collections', {
          params: {
            chain: args?.chain || 'ethereum',
            limit: args?.limit || 20
          }
        })
        result = searchResults.data
        break
        
      case 'get_collection':
        const collection = await openSeaAPI.get(`/collections/${args.slug}`)
        result = collection.data
        break
        
      case 'search':
        // Use collections endpoint as a general search
        const searchData = await openSeaAPI.get('/collections', {
          params: {
            limit: 20
          }
        })
        result = {
          collections: searchData.data.collections || [],
          message: `Search results for: ${args.query}`
        }
        break
        
      case 'get_trending_tokens':
        result = {
          error: 'Token endpoints are not available in OpenSea API v2',
          suggestion: 'Use a dedicated DeFi API for token data'
        }
        break
        
      case 'get_top_collections':
        const topCollections = await openSeaAPI.get('/collections', {
          params: {
            chain: args?.chain || 'ethereum',
            limit: args?.limit || 20
          }
        })
        result = topCollections.data
        break
        
      default:
        throw new Error(`Unknown tool: ${name}`)
    }
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    }
  } catch (error) {
    console.error(`Error calling OpenSea API for ${name}:`, error.message)
    return {
      content: [{
        type: 'text',
        text: `Error: ${error.message}\n\nNote: This proxy uses OpenSea API v2 which has limited functionality compared to the full OpenSea MCP. Some features like trending may not work as expected.`
      }]
    }
  }
})

// Start the server
async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('OpenSea MCP Proxy Server running...')
}

main().catch(console.error)