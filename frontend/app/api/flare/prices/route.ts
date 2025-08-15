import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'

// Flare Coston2 Testnet Configuration
const COSTON2_RPC = 'https://coston2-api.flare.network/ext/C/rpc'
const FTSO_REGISTRY = '0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019' // Coston2 FtsoRegistry
const PRICE_SUBMITTER = '0x1000000000000000000000000000000000000003' // PriceSubmitter contract

// FTSO V2 Price Feed configuration for Coston2
const FTSO_V2_RELAY = '0x6fBe299b5aAd63d879E9fb8Fb2E0b8A3d5Ce7f10' // Coston2 FtsoV2Interface
const FAST_UPDATER = '0x58fb598EC6DB6901aA6F26a9A2087E9274128E59' // FastUpdater contract
const FAST_UPDATES_CONFIG = '0x0EC0283576E1BEAf78fe649cC4a59b68A0Ba0a01' // FastUpdatesConfiguration

// Supported price feed indices on Coston2
const FEED_INDICES: Record<string, number> = {
  'FLR/USD': 0,
  'SGB/USD': 1,
  'BTC/USD': 2,
  'XRP/USD': 3,
  'LTC/USD': 4,
  'XLM/USD': 5,
  'DOGE/USD': 6,
  'ADA/USD': 7,
  'ALGO/USD': 8,
  'ETH/USD': 9,
  'FIL/USD': 10,
  'ARB/USD': 11,
  'AVAX/USD': 12,
  'BNB/USD': 13,
  'MATIC/USD': 14,
  'SOL/USD': 15,
  'USDC/USD': 16,
  'USDT/USD': 17,
  'XDC/USD': 18
}

// ABI for FTSO V2 Interface
const FTSO_V2_ABI = [
  'function getFeedById(bytes21 _feedId) external view returns (uint256 value, int8 decimals, uint64 timestamp)',
  'function getFeedByIndex(uint256 _index) external view returns (uint256 value, int8 decimals, uint64 timestamp)',
  'function getFeedId(uint256 _index) external view returns (bytes21)',
  'function getSupportedFeedIds() external view returns (bytes21[] memory)',
  'function getSupportedIndicesAndSymbols() external view returns (uint256[] memory indices, string[] memory symbols, bytes21[] memory feedIds)'
]

// ABI for Fast Updates
const FAST_UPDATER_ABI = [
  'function fetchCurrentFeeds(uint256[] calldata _indices) external view returns (uint256[] memory _values, int8[] memory _decimals, uint64 _timestamp)'
]

interface PriceData {
  symbol: string
  value: number
  timestamp: number
  decimals: number
  confidence: number
  source: string
  blockNumber: number
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { symbols } = body

    if (!symbols || !Array.isArray(symbols)) {
      return NextResponse.json(
        { error: 'Invalid symbols parameter' },
        { status: 400 }
      )
    }

    // Connect to Flare Coston2 testnet
    const provider = new ethers.JsonRpcProvider(COSTON2_RPC)
    const blockNumber = await provider.getBlockNumber()
    
    // Initialize FTSO V2 contract
    const ftsoV2 = new ethers.Contract(FTSO_V2_RELAY, FTSO_V2_ABI, provider)
    const fastUpdater = new ethers.Contract(FAST_UPDATER, FAST_UPDATER_ABI, provider)
    
    const prices: PriceData[] = []
    
    // Get indices for requested symbols
    const requestedIndices: number[] = []
    const symbolToIndex: Map<string, number> = new Map()
    
    for (const symbol of symbols) {
      if (FEED_INDICES[symbol] !== undefined) {
        requestedIndices.push(FEED_INDICES[symbol])
        symbolToIndex.set(symbol, FEED_INDICES[symbol])
      }
    }
    
    if (requestedIndices.length > 0) {
      try {
        // Fetch current prices using Fast Updates for better performance
        const [values, decimals, timestamp] = await fastUpdater.fetchCurrentFeeds(requestedIndices)
        
        // Process fetched prices
        for (let i = 0; i < requestedIndices.length; i++) {
          const symbol = symbols.find(s => symbolToIndex.get(s) === requestedIndices[i])
          if (symbol) {
            const value = Number(values[i]) / Math.pow(10, Math.abs(Number(decimals[i])))
            
            prices.push({
              symbol,
              value,
              timestamp: Number(timestamp) * 1000, // Convert to milliseconds
              decimals: Math.abs(Number(decimals[i])),
              confidence: 100, // FTSO prices have 100% confidence when available
              source: 'flare-ftso-v2',
              blockNumber
            })
          }
        }
      } catch (err) {
        console.error('Failed to fetch prices from Fast Updater, falling back to individual queries:', err)
        
        // Fallback to individual price queries
        for (const symbol of symbols) {
          try {
            const index = FEED_INDICES[symbol]
            if (index !== undefined) {
              const [value, decimals, timestamp] = await ftsoV2.getFeedByIndex(index)
              
              prices.push({
                symbol,
                value: Number(value) / Math.pow(10, Math.abs(Number(decimals))),
                timestamp: Number(timestamp) * 1000,
                decimals: Math.abs(Number(decimals)),
                confidence: 100,
                source: 'flare-ftso-v2',
                blockNumber
              })
            } else {
              // Symbol not supported by FTSO
              prices.push({
                symbol,
                value: 0,
                timestamp: Date.now(),
                decimals: 18,
                confidence: 0,
                source: 'flare-ftso-v2',
                blockNumber
              })
            }
          } catch (err) {
            console.error(`Failed to fetch price for ${symbol}:`, err)
            prices.push({
              symbol,
              value: 0,
              timestamp: Date.now(),
              decimals: 18,
              confidence: 0,
              source: 'flare-ftso-v2',
              blockNumber
            })
          }
        }
      }
    } else {
      // No valid symbols requested
      for (const symbol of symbols) {
        prices.push({
          symbol,
          value: 0,
          timestamp: Date.now(),
          decimals: 18,
          confidence: 0,
          source: 'flare-ftso-v2',
          blockNumber
        })
      }
    }
    
    // Calculate 24h change (would require historical data in production)
    const pricesWithChange = prices.map(p => ({
      ...p,
      change24h: p.confidence > 0 ? ((Math.random() - 0.5) * 10) : 0, // Placeholder for actual 24h change
      volume: p.confidence > 0 ? Math.floor(100000 + Math.random() * 9900000) : 0 // Placeholder volume
    }))

    return NextResponse.json({ 
      prices: pricesWithChange,
      network: 'coston2',
      blockNumber,
      ftsoV2Interface: FTSO_V2_RELAY,
      fastUpdater: FAST_UPDATER,
      timestamp: Date.now()
    })
  } catch (error) {
    console.error('Error fetching Flare prices:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch prices',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const symbol = searchParams.get('symbol')

  try {
    // Connect to Flare Coston2
    const provider = new ethers.JsonRpcProvider(COSTON2_RPC)
    const blockNumber = await provider.getBlockNumber()
    const block = await provider.getBlock('latest')
    
    if (!symbol) {
      // Get supported feeds from contract
      try {
        const ftsoV2 = new ethers.Contract(FTSO_V2_RELAY, FTSO_V2_ABI, provider)
        const [indices, symbols, feedIds] = await ftsoV2.getSupportedIndicesAndSymbols()
        
        return NextResponse.json({
          network: 'flare-coston2',
          rpcUrl: COSTON2_RPC,
          ftsoV2Interface: FTSO_V2_RELAY,
          fastUpdater: FAST_UPDATER,
          blockNumber,
          timestamp: block?.timestamp,
          availableFeeds: symbols,
          feedIndices: Object.fromEntries(symbols.map((s: string, i: number) => [s, indices[i].toString()])),
          feedIds: Object.fromEntries(symbols.map((s: string, i: number) => [s, feedIds[i]])),
          documentation: 'https://docs.flare.network/tech/ftso/'
        })
      } catch (err) {
        // Fallback to predefined feeds if contract call fails
        return NextResponse.json({
          network: 'flare-coston2',
          rpcUrl: COSTON2_RPC,
          ftsoV2Interface: FTSO_V2_RELAY,
          fastUpdater: FAST_UPDATER,
          blockNumber,
          timestamp: block?.timestamp,
          availableFeeds: Object.keys(FEED_INDICES),
          feedIndices: FEED_INDICES,
          documentation: 'https://docs.flare.network/tech/ftso/'
        })
      }
    }

    // Fetch specific symbol price
    try {
      const index = FEED_INDICES[symbol]
      if (index !== undefined) {
        const ftsoV2 = new ethers.Contract(FTSO_V2_RELAY, FTSO_V2_ABI, provider)
        const [value, decimals, timestamp] = await ftsoV2.getFeedByIndex(index)
        
        return NextResponse.json({
          symbol,
          value: Number(value) / Math.pow(10, Math.abs(Number(decimals))),
          timestamp: Number(timestamp) * 1000,
          decimals: Math.abs(Number(decimals)),
          confidence: 100,
          source: 'flare-ftso-v2',
          blockNumber,
          network: 'coston2',
          feedIndex: index
        })
      } else {
        return NextResponse.json(
          { 
            error: 'Symbol not supported by FTSO',
            availableSymbols: Object.keys(FEED_INDICES)
          },
          { status: 404 }
        )
      }
    } catch (error) {
      console.error('Error fetching price:', error)
      return NextResponse.json(
        { 
          error: 'Failed to fetch price from FTSO',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error connecting to Flare:', error)
    return NextResponse.json(
      { 
        error: 'Failed to connect to Flare network',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}