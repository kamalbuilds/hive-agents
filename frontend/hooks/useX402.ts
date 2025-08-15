import { useState, useCallback } from 'react'
import axios, { AxiosError } from 'axios'
import { useFacilitator } from 'x402/verify'
import { facilitator } from '@coinbase/x402'

interface X402Config {
  facilitatorUrl?: string
  network?: string
  maxPrice?: number
}

interface Service {
  id: string
  name: string
  price: number
  endpoint: string
  capabilities: string[]
}

export function useX402(config: X402Config = {}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Use official x402.org facilitator for testnet
  const officialFacilitatorUrl = 'https://x402.org/facilitator'
  const facilitatorUrl = config.facilitatorUrl || process.env.NEXT_PUBLIC_FACILITATOR_URL || officialFacilitatorUrl
  const network = config.network || 'base-sepolia'
  const maxPrice = config.maxPrice || 0.1 // Max $0.10 per call
  
  console.log('facilitatorUrl', facilitatorUrl)
  // Initialize x402 facilitator discovery
  const { list } = useFacilitator(officialFacilitatorUrl);
  console.log('official list', list)

  // Discover services from x402 Bazaar
  const discoverServices = useCallback(async (query?: string) => {
    setLoading(true)
    setError(null)
    
    try {
      // Try using the x402 discovery first
      try {
        const resources = await list();
        console.log('resources from x402', resources)
        if (resources && resources.items) {
          return resources.items.map((item: any) => ({
            id: item.resource,
            name: item.type || 'AI Service',
            price: 0.001,
            endpoint: item.resource,
            capabilities: item.accepts || [],
            metadata: item.metadata
          }))
        }
      } catch (discoveryErr) {
        console.log('x402 discovery not available, trying API endpoint')
      }
      
      // Fallback to API endpoint
      const response = await axios.get(`${facilitatorUrl}/api/services`, {
        params: {
          type: 'ai-agent',
          query,
          network
        },
        timeout: 5000 // 5 second timeout
      })
      
      return response.data.services || []
    } catch (err: any) {
      // Handle network errors gracefully
      if (err.code === 'ERR_NETWORK' || err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
        console.log('x402 Bazaar not available, returning mock services')
        // Return mock services for development/testing
        return [
          {
            id: 'mock-oracle-001',
            name: 'Price Oracle Service',
            price: 0.001,
            endpoint: '/api/x402/services/oracle',
            capabilities: ['price-feed', 'prediction', 'analytics']
          },
          {
            id: 'mock-trader-001',
            name: 'Trading Bot Service',
            price: 0.005,
            endpoint: '/api/x402/services/trader',
            capabilities: ['arbitrage', 'market-making', 'risk-assessment']
          },
          {
            id: 'mock-analyzer-001',
            name: 'Data Analysis Service',
            price: 0.002,
            endpoint: '/api/x402/services/analyzer',
            capabilities: ['sentiment-analysis', 'pattern-recognition', 'reporting']
          }
        ]
      }
      
      setError(err.message)
      console.error('Service discovery failed:', err)
      return []
    } finally {
      setLoading(false)
    }
  }, [facilitatorUrl, network])

  // Purchase a capability from another agent
  const purchaseCapability = useCallback(async (serviceUrl: string, params: any) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await axios.post(serviceUrl, params, {
        headers: {
          'X-Max-Price': maxPrice,
          'X-Currency': 'USDC',
          'X-Network': network
        },
        // Configure axios to not throw on 402 status
        validateStatus: (status) => status < 500
      })
      
      // Handle 402 Payment Required
      if (response.status === 402) {
        const paymentUrl = response.data.paymentUrl
        
        // Initiate payment flow
        const paymentResponse = await initiatePayment(paymentUrl, response.data.price)
        
        if (paymentResponse.success) {
          // Retry with payment token
          const retryResponse = await axios.post(serviceUrl, params, {
            headers: {
              'X-402-Payment': paymentResponse.token,
              'X-Currency': 'USDC',
              'X-Network': network
            }
          })
          
          return retryResponse.data
        } else {
          throw new Error(paymentResponse.error || 'Payment failed')
        }
      }
      
      return response.data
    } catch (err: any) {
      setError(err.message)
      console.error('Capability purchase failed:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [maxPrice, network])

  // Initiate x402 payment
  const initiatePayment = useCallback(async (paymentUrl: string, amount: number) => {
    try {
      const response = await axios.post(`${facilitatorUrl}/pay`, {
        paymentUrl,
        amount,
        currency: 'USDC',
        network
      }, {
        timeout: 5000,
        validateStatus: (status) => status < 500
      })
      
      if (response.status === 404) {
        // Facilitator not available, mock the payment for testing
        console.log('x402 Facilitator not available, mocking payment')
        return {
          success: true,
          token: `mock-payment-${Date.now()}`,
          transactionHash: `0x${Math.random().toString(16).substring(2)}`
        }
      }
      
      return {
        success: true,
        token: response.data.token,
        transactionHash: response.data.txHash
      }
    } catch (err: any) {
      console.error('Payment failed:', err)
      
      // If network error, return mock payment for testing
      if (err.code === 'ERR_NETWORK' || err.code === 'ECONNREFUSED') {
        return {
          success: true,
          token: `mock-payment-${Date.now()}`,
          transactionHash: `0x${Math.random().toString(16).substring(2)}`
        }
      }
      
      return {
        success: false,
        error: err.message
      }
    }
  }, [facilitatorUrl, network])

  // Register a service in x402 Bazaar
  const registerService = useCallback(async (service: Partial<Service>) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await axios.post(`${facilitatorUrl}/api/services`, {
        ...service,
        network,
        type: 'ai-agent'
      }, {
        timeout: 5000,
        validateStatus: (status) => status < 500
      })
      
      if (response.status === 404) {
        // Bazaar not available, store locally
        console.log('x402 Bazaar not available, storing service locally')
        return {
          ...service,
          id: `local-${Date.now()}`,
          registered: true,
          local: true
        }
      }
      
      return response.data
    } catch (err: any) {
      // Handle network errors gracefully
      if (err.code === 'ERR_NETWORK' || err.code === 'ECONNREFUSED') {
        console.log('x402 Bazaar not available, storing service locally')
        return {
          ...service,
          id: `local-${Date.now()}`,
          registered: true,
          local: true
        }
      }
      
      setError(err.message)
      console.error('Service registration failed:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [facilitatorUrl, network])

  // Call an agent service with automatic payment
  const callService = useCallback(async (endpoint: string, params: any) => {
    setLoading(true)
    setError(null)
    
    try {
      // First attempt without payment - configure to not throw on 402
      const response = await axios.post(endpoint, params, {
        validateStatus: (status) => status < 500,
        timeout: 10000
      })
      
      // If payment required, handle it
      if (response.status === 402) {
        const { price, paymentUrl } = response.data
        
        if (price > maxPrice) {
          throw new Error(`Service price ${price} exceeds max price ${maxPrice}`)
        }
        
        // Initiate payment
        const paymentResult = await initiatePayment(paymentUrl, price)
        
        if (paymentResult.success) {
          // Retry with payment token
          const retryResponse = await axios.post(endpoint, params, {
            headers: {
              'X-402-Payment': paymentResult.token
            }
          })
          
          return retryResponse.data
        } else {
          throw new Error(paymentResult.error || 'Payment failed')
        }
      }
      
      return response.data
    } catch (err: any) {
      // Handle network errors gracefully
      if (err.code === 'ERR_NETWORK' || err.code === 'ECONNREFUSED') {
        console.log('Service endpoint not available')
        return {
          success: false,
          error: 'Service temporarily unavailable',
          offline: true
        }
      }
      
      setError(err.message)
      console.error('Service call failed:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [maxPrice, initiatePayment])

  // Get payment statistics
  const getPaymentStats = useCallback(async () => {
    try {
      const response = await axios.get(`${facilitatorUrl}/api/stats`, {
        params: { network },
        timeout: 5000,
        validateStatus: (status) => status < 500
      })
      
      if (response.status === 404) {
        // Return mock stats if not available
        return {
          totalPayments: 0,
          totalVolume: 0,
          averagePrice: 0.003,
          currency: 'USDC',
          network
        }
      }
      
      return response.data
    } catch (err: any) {
      console.error('Failed to get payment stats:', err)
      
      // Return mock stats on error
      return {
        totalPayments: 0,
        totalVolume: 0,
        averagePrice: 0.003,
        currency: 'USDC',
        network
      }
    }
  }, [facilitatorUrl, network])

  return {
    loading,
    error,
    discoverServices,
    purchaseCapability,
    registerService,
    callService,
    getPaymentStats,
    initiatePayment
  }
}