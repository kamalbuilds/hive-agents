import { useState, useCallback, useEffect } from 'react'
import { useOpenSeaMCP } from '@/lib/opensea-mcp'
import type { 
  OpenSeaCollection, 
  OpenSeaNFT, 
  OpenSeaToken,
  OpenSeaSwapQuote 
} from '@/lib/opensea-mcp'

export function useOpenSea() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [trendingCollections, setTrendingCollections] = useState<OpenSeaCollection[]>([])
  const [topTokens, setTopTokens] = useState<OpenSeaToken[]>([])
  
  const mcp = useOpenSeaMCP()

  // Fetch trending NFT collections
  const fetchTrendingCollections = useCallback(async (
    timeframe: 'ONE_HOUR' | 'ONE_DAY' | 'SEVEN_DAYS' | 'THIRTY_DAYS' = 'ONE_DAY'
  ) => {
    setLoading(true)
    setError(null)
    try {
      const collections = await mcp.getTrendingCollections(timeframe);
      console.log('collections queried from opensea', timeframe)
      setTrendingCollections(collections)
      return collections
    } catch (err: any) {
      setError(err.message || 'Failed to fetch trending collections')
      return []
    } finally {
      setLoading(false)
    }
  }, [mcp])

  // Fetch top tokens by volume
  const fetchTopTokens = useCallback(async (chain?: string) => {
    setLoading(true)
    setError(null)
    try {
      const tokens = await mcp.getTrendingTokens(chain)
      setTopTokens(tokens)
      return tokens
    } catch (err: any) {
      setError(err.message || 'Failed to fetch top tokens')
      return []
    } finally {
      setLoading(false)
    }
  }, [mcp])

  // Search for NFT collections
  const searchCollections = useCallback(async (query: string, chain?: string) => {
    setLoading(true)
    setError(null)
    try {
      return await mcp.searchCollections(query, chain)
    } catch (err: any) {
      setError(err.message || 'Collection search failed')
      return []
    } finally {
      setLoading(false)
    }
  }, [mcp])

  // Get NFT portfolio for a wallet
  const getNFTPortfolio = useCallback(async (address: string) => {
    setLoading(true)
    setError(null)
    try {
      const [nfts, profile] = await Promise.all([
        mcp.getNFTBalances(address),
        mcp.getProfile(address)
      ])
      
      return {
        nfts,
        profile,
        totalCount: nfts.length,
        estimatedValue: nfts.reduce((sum, nft) => sum + (nft.price || 0), 0)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch NFT portfolio')
      return null
    } finally {
      setLoading(false)
    }
  }, [mcp])

  // Get token balances for a wallet
  const getTokenPortfolio = useCallback(async (address: string) => {
    setLoading(true)
    setError(null)
    try {
      const tokens = await mcp.getTokenBalances(address)
      
      // Calculate total portfolio value
      const totalValue = tokens.reduce((sum, token: any) => {
        const balance = parseFloat(token.balance || '0')
        const price = token.price || 0
        return sum + (balance * price)
      }, 0)
      
      return {
        tokens,
        totalValue,
        tokenCount: tokens.length
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch token portfolio')
      return null
    } finally {
      setLoading(false)
    }
  }, [mcp])

  // Get swap quote between tokens
  const getSwapQuote = useCallback(async (
    fromToken: string,
    toToken: string,
    amount: string,
    chain?: string
  ): Promise<OpenSeaSwapQuote | null> => {
    setLoading(true)
    setError(null)
    try {
      return await mcp.getSwapQuote(fromToken, toToken, amount, chain)
    } catch (err: any) {
      setError(err.message || 'Failed to get swap quote')
      return null
    } finally {
      setLoading(false)
    }
  }, [mcp])

  // Search across all OpenSea data
  const searchMarketplace = useCallback(async (query: string) => {
    setLoading(true)
    setError(null)
    try {
      const results = await mcp.search({ query })
      return results
    } catch (err: any) {
      setError(err.message || 'Marketplace search failed')
      return null
    } finally {
      setLoading(false)
    }
  }, [mcp])

  // Get collection details with analytics
  const getCollectionAnalytics = useCallback(async (slug: string) => {
    setLoading(true)
    setError(null)
    try {
      const collection = await mcp.getCollection(slug, [
        'activity',
        'analytics',
        'holders',
        'offers'
      ])
      return collection
    } catch (err: any) {
      setError(err.message || 'Failed to fetch collection analytics')
      return null
    } finally {
      setLoading(false)
    }
  }, [mcp])

  // Get NFT item details
  const getNFTDetails = useCallback(async (
    contractAddress: string,
    tokenId: string
  ) => {
    setLoading(true)
    setError(null)
    try {
      return await mcp.getItem(contractAddress, tokenId)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch NFT details')
      return null
    } finally {
      setLoading(false)
    }
  }, [mcp])

  // Analyze complete portfolio (NFTs + Tokens)
  const analyzeCompletePortfolio = useCallback(async (address: string) => {
    setLoading(true)
    setError(null)
    try {
      const [nftPortfolio, tokenPortfolio, analysis] = await Promise.all([
        getNFTPortfolio(address),
        getTokenPortfolio(address),
        mcp.analyzePortfolio(address)
      ])
      
      return {
        nfts: nftPortfolio,
        tokens: tokenPortfolio,
        analysis,
        totalValue: (nftPortfolio?.estimatedValue || 0) + (tokenPortfolio?.totalValue || 0)
      }
    } catch (err: any) {
      setError(err.message || 'Portfolio analysis failed')
      return null
    } finally {
      setLoading(false)
    }
  }, [mcp, getNFTPortfolio, getTokenPortfolio])

  return {
    // State
    loading,
    error,
    trendingCollections,
    topTokens,
    
    // Methods
    fetchTrendingCollections,
    fetchTopTokens,
    searchCollections,
    getNFTPortfolio,
    getTokenPortfolio,
    getSwapQuote,
    searchMarketplace,
    getCollectionAnalytics,
    getNFTDetails,
    analyzeCompletePortfolio,
    
    // Direct MCP access
    mcp
  }
}