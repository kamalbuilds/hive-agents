/**
 * OpenSea MCP Bridge
 * Handles communication with OpenSea MCP server
 */

const axios = require('axios')

class OpenSeaMCPBridge {
  constructor(config) {
    this.accessToken = config.accessToken
    this.mcpUrl = config.mcpUrl
    
    this.client = axios.create({
      baseURL: this.mcpUrl,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    })
  }

  async callTool(tool, params) {
    try {
      const response = await this.client.post('/mcp', {
        tool,
        params
      })
      return response.data
    } catch (error) {
      console.error(`OpenSea MCP ${tool} error:`, error.message)
      throw error
    }
  }

  // Convenience methods for specific tools
  async searchCollections(query, chain) {
    return this.callTool('search_collections', { query, chain })
  }

  async getCollection(slug, includes) {
    return this.callTool('get_collection', { slug, includes })
  }

  async searchItems(collection, chain) {
    return this.callTool('search_items', { collection, chain })
  }

  async getItem(contractAddress, tokenId) {
    return this.callTool('get_item', { contractAddress, tokenId })
  }

  async searchTokens(query, chain) {
    return this.callTool('search_tokens', { query, chain })
  }

  async getToken(address, chain) {
    return this.callTool('get_token', { address, chain })
  }

  async getSwapQuote(fromToken, toToken, amount, chain) {
    return this.callTool('get_token_swap_quote', {
      fromToken,
      toToken,
      amount,
      chain
    })
  }

  async getNFTBalances(address, chain) {
    return this.callTool('get_nft_balances', { address, chain })
  }

  async getTokenBalances(address, chain) {
    return this.callTool('get_token_balances', { address, chain })
  }

  async getTrendingCollections(timeframe, chain) {
    return this.callTool('get_trending_collections', { timeframe, chain })
  }

  async getTopCollections(sortBy, chain) {
    return this.callTool('get_top_collections', { sortBy, chain })
  }

  async getTrendingTokens(chain) {
    return this.callTool('get_trending_tokens', { chain })
  }

  async getProfile(address, includes) {
    return this.callTool('get_profile', { address, includes })
  }
}

module.exports = { OpenSeaMCPBridge }