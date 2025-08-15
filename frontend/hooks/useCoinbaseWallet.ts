import { useState, useCallback, useEffect } from 'react'
import axios from 'axios'

interface Wallet {
  address: string
  network: string
  balance?: number
  tokens?: Token[]
}

interface Token {
  symbol: string
  balance: number
  address: string
  decimals: number
}

interface Transaction {
  hash: string
  from: string
  to: string
  value: string
  status: 'pending' | 'confirmed' | 'failed'
  timestamp: number
}

export function useCoinbaseWallet() {
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  // Connect to Coinbase Wallet
  const connectWallet = useCallback(async () => {
    setIsConnecting(true)
    setError(null)
    
    try {
      // Check if Coinbase Wallet is available
      const ethereum = (window as any).ethereum
      
      if (!ethereum) {
        throw new Error('Coinbase Wallet not found. Please install the extension.')
      }

      // Request account access
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' })
      
      if (accounts.length === 0) {
        throw new Error('No accounts found')
      }

      const address = accounts[0]
      const chainId = await ethereum.request({ method: 'eth_chainId' })
      const network = getNetworkName(chainId)
      
      // Get balance
      const balanceWei = await ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest']
      })
      
      const balance = parseFloat((parseInt(balanceWei, 16) / 1e18).toFixed(4))
      
      const walletData: Wallet = {
        address,
        network,
        balance
      }
      
      setWallet(walletData)
      
      // Store in session
      sessionStorage.setItem('coinbase_wallet', JSON.stringify(walletData))
      
      return walletData
    } catch (err: any) {
      setError(err.message)
      console.error('Failed to connect wallet:', err)
      throw err
    } finally {
      setIsConnecting(false)
    }
  }, [])

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    setWallet(null)
    sessionStorage.removeItem('coinbase_wallet')
  }, [])

  // Get wallet balance
  const getBalance = useCallback(async (tokenAddress?: string) => {
    if (!wallet) {
      throw new Error('Wallet not connected')
    }

    try {
      if (tokenAddress) {
        // Get ERC20 token balance
        const response = await axios.get(`/api/wallet/balance/${wallet.address}/${tokenAddress}`)
        return response.data.balance
      } else {
        // Get native token balance
        const ethereum = (window as any).ethereum
        const balanceWei = await ethereum.request({
          method: 'eth_getBalance',
          params: [wallet.address, 'latest']
        })
        return parseFloat((parseInt(balanceWei, 16) / 1e18).toFixed(4))
      }
    } catch (err: any) {
      console.error('Failed to get balance:', err)
      return 0
    }
  }, [wallet])

  // Send transaction
  const sendTransaction = useCallback(async (
    to: string,
    amount: string,
    data?: string
  ): Promise<Transaction> => {
    if (!wallet) {
      throw new Error('Wallet not connected')
    }

    setLoading(true)
    setError(null)
    
    try {
      const ethereum = (window as any).ethereum
      
      const txParams = {
        from: wallet.address,
        to,
        value: '0x' + (parseFloat(amount) * 1e18).toString(16),
        data: data || '0x'
      }
      
      const txHash = await ethereum.request({
        method: 'eth_sendTransaction',
        params: [txParams]
      })
      
      const transaction: Transaction = {
        hash: txHash,
        from: wallet.address,
        to,
        value: amount,
        status: 'pending',
        timestamp: Date.now()
      }
      
      // Monitor transaction status
      monitorTransaction(txHash)
      
      return transaction
    } catch (err: any) {
      setError(err.message)
      console.error('Transaction failed:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [wallet])

  // Sign message
  const signMessage = useCallback(async (message: string) => {
    if (!wallet) {
      throw new Error('Wallet not connected')
    }

    try {
      const ethereum = (window as any).ethereum
      const signature = await ethereum.request({
        method: 'personal_sign',
        params: [message, wallet.address]
      })
      return signature
    } catch (err: any) {
      console.error('Failed to sign message:', err)
      throw err
    }
  }, [wallet])

  // Switch network
  const switchNetwork = useCallback(async (chainId: string) => {
    try {
      const ethereum = (window as any).ethereum
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId }]
      })
      
      // Update wallet network
      if (wallet) {
        const network = getNetworkName(chainId)
        const updatedWallet = { ...wallet, network }
        setWallet(updatedWallet)
        sessionStorage.setItem('coinbase_wallet', JSON.stringify(updatedWallet))
      }
    } catch (err: any) {
      // If network doesn't exist, add it
      if (err.code === 4902) {
        await addNetwork(chainId)
      } else {
        console.error('Failed to switch network:', err)
        throw err
      }
    }
  }, [wallet])

  // Add network
  const addNetwork = async (chainId: string) => {
    const networks: Record<string, any> = {
      '0x2105': { // Base (8453)
        chainName: 'Base',
        rpcUrls: ['https://mainnet.base.org'],
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        blockExplorerUrls: ['https://basescan.org']
      },
      '0x13': { // Flare (19)
        chainName: 'Flare',
        rpcUrls: ['https://flare-api.flare.network/ext/C/rpc'],
        nativeCurrency: { name: 'Flare', symbol: 'FLR', decimals: 18 },
        blockExplorerUrls: ['https://flare-explorer.flare.network']
      }
    }

    const params = networks[chainId]
    if (!params) {
      throw new Error('Unknown network')
    }

    const ethereum = (window as any).ethereum
    await ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [{ chainId, ...params }]
    })
  }

  // Monitor transaction status
  const monitorTransaction = async (txHash: string) => {
    const ethereum = (window as any).ethereum
    
    const checkStatus = async () => {
      try {
        const receipt = await ethereum.request({
          method: 'eth_getTransactionReceipt',
          params: [txHash]
        })
        
        if (receipt) {
          const status = receipt.status === '0x1' ? 'confirmed' : 'failed'
          console.log(`Transaction ${txHash} ${status}`)
          return true
        }
        return false
      } catch (err) {
        console.error('Failed to check transaction:', err)
        return false
      }
    }

    // Check every 3 seconds for up to 2 minutes
    let attempts = 0
    const interval = setInterval(async () => {
      const confirmed = await checkStatus()
      attempts++
      
      if (confirmed || attempts > 40) {
        clearInterval(interval)
      }
    }, 3000)
  }

  // Get network name from chain ID
  const getNetworkName = (chainId: string): string => {
    const networks: Record<string, string> = {
      '0x1': 'ethereum',
      '0x89': 'polygon',
      '0xa4b1': 'arbitrum',
      '0xa': 'optimism',
      '0x2105': 'base',
      '0x13': 'flare',
      '0x72': 'coston2'
    }
    return networks[chainId] || 'unknown'
  }

  // Get transaction history
  const getTransactionHistory = useCallback(async (limit: number = 10) => {
    if (!wallet) {
      return []
    }

    try {
      const response = await axios.get(`/api/wallet/history/${wallet.address}`, {
        params: { limit }
      })
      return response.data.transactions
    } catch (err: any) {
      console.error('Failed to get history:', err)
      return []
    }
  }, [wallet])

  // Auto-reconnect on page load
  useEffect(() => {
    const storedWallet = sessionStorage.getItem('coinbase_wallet')
    if (storedWallet) {
      try {
        const walletData = JSON.parse(storedWallet)
        setWallet(walletData)
      } catch (err) {
        console.error('Failed to restore wallet:', err)
      }
    }
  }, [])

  // Listen for account changes
  useEffect(() => {
    const ethereum = (window as any).ethereum
    if (!ethereum) return

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnectWallet()
      } else if (wallet && accounts[0] !== wallet.address) {
        // Re-connect with new account
        connectWallet()
      }
    }

    const handleChainChanged = (chainId: string) => {
      if (wallet) {
        const network = getNetworkName(chainId)
        const updatedWallet = { ...wallet, network }
        setWallet(updatedWallet)
        sessionStorage.setItem('coinbase_wallet', JSON.stringify(updatedWallet))
      }
    }

    ethereum.on('accountsChanged', handleAccountsChanged)
    ethereum.on('chainChanged', handleChainChanged)

    return () => {
      ethereum.removeListener('accountsChanged', handleAccountsChanged)
      ethereum.removeListener('chainChanged', handleChainChanged)
    }
  }, [wallet, connectWallet, disconnectWallet])

  return {
    wallet,
    loading,
    error,
    isConnecting,
    connectWallet,
    disconnectWallet,
    getBalance,
    sendTransaction,
    signMessage,
    switchNetwork,
    getTransactionHistory
  }
}