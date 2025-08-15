/**
 * Preload Script for Electron
 * Exposes secure IPC communication between renderer and main process
 */

const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // Wallet operations
  onSignMessage: (callback) =>
    ipcRenderer.on('sign-message', (event, message) => {
      callback(message).then(signature => {
        console.log('sign-message-response', signature)
        ipcRenderer.send('sign-message-response', signature)
      })
    }),

  onSignTransaction: (callback) =>
    ipcRenderer.on('sign-transaction', (event, transaction) => {
      callback(transaction).then(signedTx => {
        console.log('sign-transaction-response', signedTx)
        ipcRenderer.send('sign-transaction-response', signedTx)
      })
    }),

  // OpenSea MCP operations
  onSearchCollections: (callback) =>
    ipcRenderer.on('opensea-search-collections', (event, params) => {
      callback(params).then(collections => {
        console.log('opensea-search-collections-response', collections)
        ipcRenderer.send('opensea-search-collections-response', collections)
      })
    }),

  onGetFloorPrice: (callback) =>
    ipcRenderer.on('opensea-get-floor-price', (event, collectionSlug) => {
      callback(collectionSlug).then(price => {
        console.log('opensea-floor-price-response', price)
        ipcRenderer.send('opensea-floor-price-response', price)
      })
    }),

  onGetWalletNFTs: (callback) =>
    ipcRenderer.on('opensea-get-wallet-nfts', (event, params) => {
      callback(params).then(nfts => {
        console.log('opensea-wallet-nfts-response', nfts)
        ipcRenderer.send('opensea-wallet-nfts-response', nfts)
      })
    }),

  onGetSwapQuote: (callback) =>
    ipcRenderer.on('opensea-swap-quote', (event, params) => {
      callback(params).then(quote => {
        console.log('opensea-swap-quote-response', quote)
        ipcRenderer.send('opensea-swap-quote-response', quote)
      })
    }),

  onGetTrending: (callback) =>
    ipcRenderer.on('opensea-trending', (event, params) => {
      callback(params).then(trending => {
        console.log('opensea-trending-response', trending)
        ipcRenderer.send('opensea-trending-response', trending)
      })
    }),

  // x402 Protocol operations
  onDiscoverServices: (callback) =>
    ipcRenderer.on('x402-discover', (event) => {
      callback().then(services => {
        console.log('x402-discover-response', services)
        ipcRenderer.send('x402-discover-response', services)
      })
    }),

  onCreatePaymentChannel: (callback) =>
    ipcRenderer.on('x402-create-channel', (event, params) => {
      callback(params).then(channel => {
        console.log('x402-channel-response', channel)
        ipcRenderer.send('x402-channel-response', channel)
      })
    }),

  // Direct invoke methods
  ipcRenderer: {
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args)
  },

  // Store API for persistent data
  store: {
    get: (key) => ipcRenderer.invoke('store-get', key),
    set: (key, value) => ipcRenderer.invoke('store-set', key, value),
    delete: (key) => ipcRenderer.invoke('store-delete', key)
  }
})