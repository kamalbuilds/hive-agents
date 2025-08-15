import { useState, useCallback } from 'react'
import axios from 'axios'

interface BridgeParams {
  amount: number
  token: string
  sourceChain: string
  destChain: string
  recipient: string
}

interface MessageStatus {
  status: 'PENDING' | 'DELIVERED' | 'FAILED'
  confirmations: number
  sourceTransactionHash?: string
  destTransactionHash?: string
}

export function useLayerZero() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)


  // Chain IDs for LayerZero
  const CHAIN_IDS: Record<string, number> = {
    ethereum: 101,
    bsc: 102,
    avalanche: 106,
    polygon: 109,
    arbitrum: 110,
    optimism: 111,
    fantom: 112,
    base: 184,
    flaretestnet: 114
  }

  // Bridge tokens cross-chain
  const bridgeTokens = useCallback(async (params: BridgeParams) => {
    setLoading(true)
    setError(null)
    
    try {
      // Prepare LayerZero message
      const message = {
        srcChainId: CHAIN_IDS[params.sourceChain],
        dstChainId: CHAIN_IDS[params.destChain],
        amount: params.amount,
        token: params.token,
        recipient: params.recipient,
        adapterParams: '0x' // Default adapter params
      }

      // Call backend API to initiate bridge
      const response = await axios.post('/api/layerzero/bridge', message)
      
      return {
        messageId: response.data.messageId,
        txHash: response.data.transactionHash,
        estimatedTime: response.data.estimatedTime
      }
    } catch (err: any) {
      setError(err.message)
      console.error('Bridge failed:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Get message status
  const getMessageStatus = useCallback(async (messageId: string): Promise<MessageStatus> => {
    try {
      const response = await axios.get(`/api/layerzero/status/${messageId}`)
      return response.data
    } catch (err: any) {
      console.error('Failed to get message status:', err)
      return {
        status: 'FAILED',
        confirmations: 0
      }
    }
  }, [])

  // Estimate bridge fees
  const estimateFees = useCallback(async (
    amount: number,
    token: string,
    sourceChain: string,
    destChain: string
  ) => {
    try {
      const response = await axios.post('/api/layerzero/estimate', {
        amount,
        token,
        srcChainId: CHAIN_IDS[sourceChain],
        dstChainId: CHAIN_IDS[destChain]
      })
      
      return {
        nativeFee: response.data.nativeFee,
        zroFee: response.data.zroFee,
        totalFee: response.data.totalFee
      }
    } catch (err: any) {
      console.error('Failed to estimate fees:', err)
      return null
    }
  }, [])

  // Get supported chains
  const getSupportedChains = useCallback(async () => {
    try {
      const response = await axios.get('/api/layerzero/chains')
      return response.data.chains
    } catch (err: any) {
      console.error('Failed to get chains:', err)
      return []
    }
  }, [])

  // Get bridge history
  const getBridgeHistory = useCallback(async (address: string) => {
    try {
      const response = await axios.get(`/api/layerzero/history/${address}`)
      return response.data.transactions
    } catch (err: any) {
      console.error('Failed to get history:', err)
      return []
    }
  }, [])

  return {
    loading,
    error,
    bridgeTokens,
    getMessageStatus,
    estimateFees,
    getSupportedChains,
    getBridgeHistory
  }
}