import { useState, useCallback } from 'react'
import axios from 'axios'

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
  
  const facilitatorUrl = config.facilitatorUrl || 'https://facilitator.x402.org'
  const network = config.network || 'base'
  const maxPrice = config.maxPrice || 0.1 // Max $0.10 per call

  // Discover services from x402 Bazaar
  const discoverServices = useCallback(async (query?: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await axios.get(`${facilitatorUrl}/api/services`, {
        params: {
          type: 'ai-agent',
          query,
          network
        }
      })
      
      return response.data.services
    } catch (err: any) {
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
        }
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
      })
      
      return {
        success: true,
        token: response.data.token,
        transactionHash: response.data.txHash
      }
    } catch (err: any) {
      console.error('Payment failed:', err)
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
      })
      
      return response.data
    } catch (err: any) {
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
      // First attempt without payment
      const response = await axios.post(endpoint, params)
      
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
        params: { network }
      })
      
      return response.data
    } catch (err: any) {
      console.error('Failed to get payment stats:', err)
      return null
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