import { useState, useCallback, useEffect } from 'react'
import axios from 'axios'

interface PriceData {
  symbol: string
  value: number
  timestamp: number
  confidence?: number
  change24h?: number
  volume?: number
}

interface RandomRequest {
  requestId: string
  randomNumber: string
  timestamp: number
}

export function useFlare() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [prices, setPrices] = useState<PriceData[]>([])
  
  const FLARE_RPC = process.env.NEXT_PUBLIC_FLARE_RPC || 'https://coston2-api.flare.network/ext/C/rpc'
  const FTSO_REGISTRY = process.env.NEXT_PUBLIC_FTSO_REGISTRY || '0x'

  // Get current prices from FTSO
  const getPrices = useCallback(async (symbols: string[]): Promise<PriceData[]> => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await axios.post('/api/flare/prices', { symbols })
      const priceData = response.data.prices.map((p: any) => ({
        symbol: p.symbol,
        value: p.value,
        timestamp: p.timestamp,
        confidence: p.confidence || 99,
        change24h: p.change24h || 0,
        volume: p.volume || 0
      }))
      
      setPrices(priceData)
      return priceData
    } catch (err: any) {
      setError(err.message)
      console.error('Failed to get prices:', err)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  // Subscribe to price updates
  const subscribeToPrices = useCallback((
    symbols: string[],
    callback: (prices: PriceData[]) => void,
    interval: number = 5000
  ) => {
    const fetchPrices = async () => {
      const newPrices = await getPrices(symbols)
      if (newPrices.length > 0) {
        callback(newPrices)
      }
    }

    // Initial fetch
    fetchPrices()
    
    // Set up interval
    const intervalId = setInterval(fetchPrices, interval)
    
    // Return cleanup function
    return () => clearInterval(intervalId)
  }, [getPrices])

  // Get secure random number
  const getRandomNumber = useCallback(async (): Promise<RandomRequest> => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await axios.post('/api/flare/random')
      return {
        requestId: response.data.requestId,
        randomNumber: response.data.randomNumber,
        timestamp: response.data.timestamp
      }
    } catch (err: any) {
      setError(err.message)
      console.error('Failed to get random number:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Get FAssets information
  const getFAssets = useCallback(async (asset: string) => {
    try {
      const response = await axios.get(`/api/flare/fassets/${asset}`)
      return {
        totalSupply: response.data.totalSupply,
        collateralRatio: response.data.collateralRatio,
        availableToMint: response.data.availableToMint
      }
    } catch (err: any) {
      console.error('Failed to get FAssets:', err)
      return null
    }
  }, [])

  // Submit price data (for price providers)
  const submitPrice = useCallback(async (
    symbol: string,
    price: number,
    timestamp: number
  ) => {
    try {
      const response = await axios.post('/api/flare/submit-price', {
        symbol,
        price,
        timestamp
      })
      return response.data.success
    } catch (err: any) {
      console.error('Failed to submit price:', err)
      return false
    }
  }, [])

  // Get reward epoch info
  const getRewardEpoch = useCallback(async () => {
    try {
      const response = await axios.get('/api/flare/reward-epoch')
      return {
        epochId: response.data.epochId,
        startTime: response.data.startTime,
        endTime: response.data.endTime,
        votePowerBlock: response.data.votePowerBlock
      }
    } catch (err: any) {
      console.error('Failed to get reward epoch:', err)
      return null
    }
  }, [])

  // Get delegation info
  const getDelegationInfo = useCallback(async (address: string) => {
    try {
      const response = await axios.get(`/api/flare/delegation/${address}`)
      return {
        delegatedTo: response.data.delegatedTo,
        amount: response.data.amount,
        percentage: response.data.percentage
      }
    } catch (err: any) {
      console.error('Failed to get delegation info:', err)
      return null
    }
  }, [])

  // Claim rewards
  const claimRewards = useCallback(async (address: string, epochs: number[]) => {
    try {
      const response = await axios.post('/api/flare/claim-rewards', {
        address,
        epochs
      })
      return {
        success: response.data.success,
        amount: response.data.amount,
        txHash: response.data.transactionHash
      }
    } catch (err: any) {
      console.error('Failed to claim rewards:', err)
      return null
    }
  }, [])

  return {
    loading,
    error,
    prices,
    getPrices,
    subscribeToPrices,
    getRandomNumber,
    getFAssets,
    submitPrice,
    getRewardEpoch,
    getDelegationInfo,
    claimRewards
  }
}