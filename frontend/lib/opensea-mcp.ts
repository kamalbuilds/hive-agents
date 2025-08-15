/**
 * OpenSea MCP (Model Context Protocol) Integration
 * Provides AI agents with access to OpenSea marketplace data and blockchain analytics
 */

import axios, { AxiosInstance } from 'axios'

// OpenSea MCP Tool Types
export interface OpenSeaSearchParams {
  query: string
  chain?: string
  limit?: number
}

export interface OpenSeaCollection {
  slug: string
  name: string
  description?: string
  floorPrice?: number
  totalVolume?: number
  totalSupply?: number
  chain: string
  imageUrl?: string
  verified?: boolean
}

export interface OpenSeaNFT {
  tokenId: string
  contractAddress: string
  name: string
  description?: string
  imageUrl?: string
  owner?: string
  price?: number
  lastSale?: number
  traits?: Record<string, any>
}

export interface OpenSeaToken {
  address: string
  symbol: string
  name: string
  decimals: number
  price?: number
  marketCap?: number
  volume24h?: number
  priceChange24h?: number
  chain: string
}

export interface OpenSeaSwapQuote {
  fromToken: string
  toToken: string
  fromAmount: string
  toAmount: string
  gasEstimate: string
  priceImpact: number
  route: any[]
}

export interface OpenSeaProfile {
  address: string
  username?: string
  bio?: string
  nftCount: number
  collections: string[]
  totalValue?: number
}

class OpenSeaMCP {
  private client: AxiosInstance
  private accessToken: string
  private mcpUrl: string

  constructor() {
    this.accessToken = process.env.NEXT_PUBLIC_OPENSEA_API_KEY || ''
    this.mcpUrl = process.env.NEXT_PUBLIC_OPENSEA_MCP_URL || 'https://mcp.opensea.io/sse'
    
    // Create axios instance with authentication
    this.client = axios.create({
      baseURL: this.mcpUrl,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout for MCP calls
    })
  }

  /**
   * AI-powered search across OpenSea marketplace
   */
  async search(params: OpenSeaSearchParams): Promise<any> {
    try {
      const response = await this.client.post('/mcp', {
        tool: 'search',
        params
      })
      return response.data
    } catch (error) {
      console.error('OpenSea search error:', error)
      throw error
    }
  }

  /**
   * Search for NFT collections
   */
  async searchCollections(query: string, chain?: string): Promise<OpenSeaCollection[]> {
    try {
      const response = await this.client.post('/mcp', {
        tool: 'search_collections',
        params: { query, chain }
      })
      return response.data.collections || []
    } catch (error) {
      console.error('Collection search error:', error)
      return []
    }
  }

  /**
   * Get detailed collection information
   */
  async getCollection(slug: string, includes?: string[]): Promise<OpenSeaCollection | null> {
    try {
      const response = await this.client.post('/mcp', {
        tool: 'get_collection',
        params: { slug, includes }
      })
      return response.data
    } catch (error) {
      console.error('Get collection error:', error)
      return null
    }
  }

  /**
   * Search for individual NFTs
   */
  async searchItems(collection?: string, chain?: string): Promise<OpenSeaNFT[]> {
    try {
      const response = await this.client.post('/mcp', {
        tool: 'search_items',
        params: { collection, chain }
      })
      return response.data.items || []
    } catch (error) {
      console.error('Item search error:', error)
      return []
    }
  }

  /**
   * Get NFT details
   */
  async getItem(contractAddress: string, tokenId: string): Promise<OpenSeaNFT | null> {
    try {
      const response = await this.client.post('/mcp', {
        tool: 'get_item',
        params: { contractAddress, tokenId }
      })
      return response.data
    } catch (error) {
      console.error('Get item error:', error)
      return null
    }
  }

  /**
   * Search for cryptocurrencies and tokens
   */
  async searchTokens(query: string, chain?: string): Promise<OpenSeaToken[]> {
    try {
      const response = await this.client.post('/mcp', {
        tool: 'search_tokens',
        params: { query, chain }
      })
      return response.data.tokens || []
    } catch (error) {
      console.error('Token search error:', error)
      return []
    }
  }

  /**
   * Get token information
   */
  async getToken(address: string, chain?: string): Promise<OpenSeaToken | null> {
    try {
      const response = await this.client.post('/mcp', {
        tool: 'get_token',
        params: { address, chain }
      })
      return response.data
    } catch (error) {
      console.error('Get token error:', error)
      return null
    }
  }

  /**
   * Get token swap quote
   */
  async getSwapQuote(
    fromToken: string, 
    toToken: string, 
    amount: string, 
    chain?: string
  ): Promise<OpenSeaSwapQuote | null> {
    try {
      const response = await this.client.post('/mcp', {
        tool: 'get_token_swap_quote',
        params: { fromToken, toToken, amount, chain }
      })
      return response.data
    } catch (error) {
      console.error('Swap quote error:', error)
      return null
    }
  }

  /**
   * Get NFT balances for a wallet
   */
  async getNFTBalances(address: string, chain?: string): Promise<OpenSeaNFT[]> {
    try {
      const response = await this.client.post('/mcp', {
        tool: 'get_nft_balances',
        params: { address, chain }
      })
      return response.data.nfts || []
    } catch (error) {
      console.error('NFT balance error:', error)
      return []
    }
  }

  /**
   * Get token balances for a wallet
   */
  async getTokenBalances(address: string, chain?: string): Promise<OpenSeaToken[]> {
    try {
      const response = await this.client.post('/mcp', {
        tool: 'get_token_balances',
        params: { address, chain }
      })
      return response.data.tokens || []
    } catch (error) {
      console.error('Token balance error:', error)
      return []
    }
  }

  /**
   * Get trending NFT collections
   */
  async getTrendingCollections(
    timeframe: 'ONE_HOUR' | 'ONE_DAY' | 'SEVEN_DAYS' | 'THIRTY_DAYS' = 'ONE_DAY',
    chain?: string
  ): Promise<OpenSeaCollection[]> {
    try {
      const response = await this.client.post('/mcp', {
        tool: 'get_trending_collections',
        params: { timeframe, chain }
      })
      return response.data.collections || []
    } catch (error) {
      console.error('Trending collections error:', error)
      return []
    }
  }

  /**
   * Get top collections by volume
   */
  async getTopCollections(
    sortBy: 'VOLUME' | 'FLOOR_PRICE' | 'SALES' = 'VOLUME',
    chain?: string
  ): Promise<OpenSeaCollection[]> {
    try {
      const response = await this.client.post('/mcp', {
        tool: 'get_top_collections',
        params: { sortBy, chain }
      })
      return response.data.collections || []
    } catch (error) {
      console.error('Top collections error:', error)
      return []
    }
  }

  /**
   * Get trending tokens
   */
  async getTrendingTokens(chain?: string): Promise<OpenSeaToken[]> {
    try {
      const response = await this.client.post('/mcp', {
        tool: 'get_trending_tokens',
        params: { chain }
      })
      return response.data.tokens || []
    } catch (error) {
      console.error('Trending tokens error:', error)
      return []
    }
  }

  /**
   * Get user profile
   */
  async getProfile(address: string, includes?: string[]): Promise<OpenSeaProfile | null> {
    try {
      const response = await this.client.post('/mcp', {
        tool: 'get_profile',
        params: { address, includes }
      })
      return response.data
    } catch (error) {
      console.error('Get profile error:', error)
      return null
    }
  }

  /**
   * Analyze NFT portfolio value
   */
  async analyzePortfolio(address: string): Promise<{
    totalNFTs: number
    totalValue: number
    topCollections: OpenSeaCollection[]
    recentActivity: any[]
  }> {
    try {
      const [nfts, profile] = await Promise.all([
        this.getNFTBalances(address),
        this.getProfile(address, ['collections', 'activity'])
      ])

      // Calculate total value based on floor prices
      let totalValue = 0
      const collectionMap = new Map<string, number>()

      for (const nft of nfts) {
        if (nft.price) {
          totalValue += nft.price
        }
      }

      return {
        totalNFTs: nfts.length,
        totalValue,
        topCollections: [],
        recentActivity: []
      }
    } catch (error) {
      console.error('Portfolio analysis error:', error)
      return {
        totalNFTs: 0,
        totalValue: 0,
        topCollections: [],
        recentActivity: []
      }
    }
  }
}

// Export singleton instance
export const openSeaMCP = new OpenSeaMCP()

// Export hooks-friendly functions
export const useOpenSeaMCP = () => {
  return {
    search: openSeaMCP.search.bind(openSeaMCP),
    searchCollections: openSeaMCP.searchCollections.bind(openSeaMCP),
    getCollection: openSeaMCP.getCollection.bind(openSeaMCP),
    searchItems: openSeaMCP.searchItems.bind(openSeaMCP),
    getItem: openSeaMCP.getItem.bind(openSeaMCP),
    searchTokens: openSeaMCP.searchTokens.bind(openSeaMCP),
    getToken: openSeaMCP.getToken.bind(openSeaMCP),
    getSwapQuote: openSeaMCP.getSwapQuote.bind(openSeaMCP),
    getNFTBalances: openSeaMCP.getNFTBalances.bind(openSeaMCP),
    getTokenBalances: openSeaMCP.getTokenBalances.bind(openSeaMCP),
    getTrendingCollections: openSeaMCP.getTrendingCollections.bind(openSeaMCP),
    getTopCollections: openSeaMCP.getTopCollections.bind(openSeaMCP),
    getTrendingTokens: openSeaMCP.getTrendingTokens.bind(openSeaMCP),
    getProfile: openSeaMCP.getProfile.bind(openSeaMCP),
    analyzePortfolio: openSeaMCP.analyzePortfolio.bind(openSeaMCP)
  }
}