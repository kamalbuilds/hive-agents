/**
 * Renderer Process App - Embedded Wallet with OpenSea MCP
 * React app that runs in the Electron renderer process
 */

import React, { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { OpenSeaMCPClient } from './opensea-client'
import { X402Client } from './x402-client'
import { WalletManager } from './wallet-manager'
import './App.css'

function App() {
  const [wallet, setWallet] = useState(null)
  const [address, setAddress] = useState('')
  const [balance, setBalance] = useState('0')
  const [nfts, setNfts] = useState([])
  const [collections, setCollections] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('Initializing...')

  // Initialize clients
  const openSeaClient = new OpenSeaMCPClient()
  const x402Client = new X402Client()
  const walletManager = new WalletManager()

  // Initialize wallet on mount
  useEffect(() => {
    initializeWallet()
    setupIPCHandlers()
  }, [])

  const initializeWallet = async () => {
    try {
      setStatus('Creating wallet...')
      const newWallet = await walletManager.createWallet()
      setWallet(newWallet)
      setAddress(newWallet.address)
      
      // Get initial balance
      const provider = new ethers.JsonRpcProvider(process.env.REACT_APP_RPC_URL)
      const balance = await provider.getBalance(newWallet.address)
      setBalance(ethers.formatEther(balance))
      
      
      setStatus('Wallet ready')
    } catch (error) {
      console.error('Wallet initialization error:', error)
      setStatus('Error: ' + error.message)
    }
  }

  const setupIPCHandlers = () => {
    // Sign message handler
    window.electron.onSignMessage(async (message) => {
      if (!wallet) return null
      const signature = await wallet.signMessage(message)
      return signature
    })

    // Sign transaction handler
    window.electron.onSignTransaction(async (transaction) => {
      if (!wallet) return null
      const signedTx = await wallet.signTransaction(transaction)
      return signedTx
    })

    // OpenSea handlers
    window.electron.onSearchCollections(async ({ query, chain }) => {
      return await openSeaClient.searchCollections(query, chain)
    })

    window.electron.onGetFloorPrice(async (collectionSlug) => {
      const collection = await openSeaClient.getCollection(collectionSlug)
      return collection?.stats?.floor_price || null
    })

    window.electron.onGetWalletNFTs(async ({ address, chain }) => {
      return await openSeaClient.getNFTBalances(address, chain)
    })

    window.electron.onGetSwapQuote(async (params) => {
      return await openSeaClient.getSwapQuote(
        params.fromToken,
        params.toToken,
        params.amount,
        params.chain
      )
    })

    window.electron.onGetTrending(async ({ timeframe, chain }) => {
      return await openSeaClient.getTrendingCollections(timeframe, chain)
    })

    // x402 handlers
    window.electron.onDiscoverServices(async () => {
      return await x402Client.discoverServices()
    })

    window.electron.onCreatePaymentChannel(async ({ serviceId, amount, duration }) => {
      return await x402Client.createPaymentChannel(serviceId, amount, duration, wallet)
    })
  }

  // UI Actions
  const loadNFTs = async () => {
    if (!address) return
    
    setLoading(true)
    setStatus('Loading NFTs...')
    try {
      const nftData = await openSeaClient.getNFTBalances(address, 'ethereum')
      setNfts(nftData)
      setStatus(`Found ${nftData.length} NFTs`)
    } catch (error) {
      console.error('Error loading NFTs:', error)
      setStatus('Error loading NFTs')
    }
    setLoading(false)
  }

  const searchCollections = async (query) => {
    setLoading(true)
    setStatus('Searching collections...')
    try {
      const results = await openSeaClient.searchCollections(query, 'ethereum')
      setCollections(results)
      setStatus(`Found ${results.length} collections`)
    } catch (error) {
      console.error('Error searching collections:', error)
      setStatus('Error searching collections')
    }
    setLoading(false)
  }

  const discoverX402Services = async () => {
    setLoading(true)
    setStatus('Discovering x402 services...')
    try {
      const serviceList = await x402Client.discoverServices()
      setServices(serviceList)
      setStatus(`Found ${serviceList.length} services`)
    } catch (error) {
      console.error('Error discovering services:', error)
      setStatus('Error discovering services')
    }
    setLoading(false)
  }

  const createPaymentChannel = async (serviceId) => {
    if (!wallet) return
    
    setLoading(true)
    setStatus('Creating payment channel...')
    try {
      const channel = await x402Client.createPaymentChannel(
        serviceId,
        '0.01',
        3600,
        wallet
      )
      setStatus(`Payment channel created: ${channel.channelId}`)
    } catch (error) {
      console.error('Error creating payment channel:', error)
      setStatus('Error creating payment channel')
    }
    setLoading(false)
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>HiveMind MCP Wallet</h1>
        <p className="status">{status}</p>
      </header>

      <main className="app-main">
        <div className="wallet-section">
          <h2>Embedded Wallet</h2>
          <div className="wallet-info">
            <p><strong>Address:</strong> {address || 'Not initialized'}</p>
            <p><strong>Balance:</strong> {balance} ETH</p>
          </div>
          <button onClick={initializeWallet} disabled={loading}>
            Recreate Wallet
          </button>
        </div>

        <div className="opensea-section">
          <h2>OpenSea MCP</h2>
          <div className="search-box">
            <input
              type="text"
              placeholder="Search NFT collections..."
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  searchCollections(e.target.value)
                }
              }}
            />
          </div>
          <button onClick={loadNFTs} disabled={loading || !address}>
            Load My NFTs
          </button>
          
          {collections.length > 0 && (
            <div className="collections-list">
              <h3>Collections</h3>
              {collections.map((col, i) => (
                <div key={i} className="collection-item">
                  <span>{col.name}</span>
                  <span>{col.floor_price} ETH</span>
                </div>
              ))}
            </div>
          )}
          
          {nfts.length > 0 && (
            <div className="nfts-list">
              <h3>My NFTs</h3>
              {nfts.map((nft, i) => (
                <div key={i} className="nft-item">
                  <img src={nft.imageUrl} alt={nft.name} />
                  <span>{nft.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="x402-section">
          <h2>x402 Protocol</h2>
          <button onClick={discoverX402Services} disabled={loading}>
            Discover Services
          </button>
          
          {services.length > 0 && (
            <div className="services-list">
              <h3>Available Services</h3>
              {services.map((service, i) => (
                <div key={i} className="service-item">
                  <span>{service.name}</span>
                  <span>{service.pricing.amount} {service.pricing.currency}</span>
                  <button
                    onClick={() => createPaymentChannel(service.id)}
                    disabled={loading}
                  >
                    Create Channel
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
        </div>
      )}
    </div>
  )
}

// Expose functions to window for IPC access
window.getWalletAddress = () => {
  const walletDiv = document.querySelector('.wallet-info')
  return walletDiv?.dataset?.address || null
}

window.getNetwork = () => {
  return process.env.REACT_APP_NETWORK || 'ethereum'
}

export default App