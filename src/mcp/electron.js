/**
 * Electron Main Process for MCP Embedded Wallet with OpenSea Integration
 * Provides secure wallet operations and OpenSea MCP tools through IPC
 */

const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { OpenSeaMCPBridge } = require('./opensea-bridge')
const logger = require('./logger')
require('dotenv').config()

let mainWindow = null
let openSeaBridge = null

// Operation definitions for MCP tools
const operations = {
  // Wallet Operations
  signMessage: {
    title: "Sign Message",
    description: "Sign a message with the embedded wallet",
    tool: async (message) => {
      logger.info("signMessage called", message)
      mainWindow?.webContents.send("sign-message", message)
      return new Promise(resolve => {
        ipcMain.once("sign-message-response", (event, signature) => {
          logger.info("sign-message-response from main", signature)
          resolve(signature)
        })
      })
    }
  },

  signTransaction: {
    title: "Sign Transaction",
    description: "Sign a transaction with the embedded wallet",
    tool: async (transaction) => {
      logger.info("signTransaction called", transaction)
      mainWindow?.webContents.send("sign-transaction", transaction)
      return new Promise(resolve => {
        ipcMain.once("sign-transaction-response", (event, signedTx) => {
          logger.info("sign-transaction-response from main", signedTx)
          resolve(signedTx)
        })
      })
    }
  },

  // OpenSea MCP Operations
  searchNFTCollections: {
    title: "Search NFT Collections",
    description: "Search for NFT collections on OpenSea",
    tool: async (query, chain) => {
      logger.info("searchNFTCollections called", { query, chain })
      mainWindow?.webContents.send("opensea-search-collections", { query, chain })
      return new Promise(resolve => {
        ipcMain.once("opensea-search-collections-response", (event, collections) => {
          logger.info("opensea-search-collections-response", collections)
          resolve(collections)
        })
      })
    }
  },

  getNFTFloorPrice: {
    title: "Get NFT Floor Price",
    description: "Get the floor price of an NFT collection",
    tool: async (collectionSlug) => {
      logger.info("getNFTFloorPrice called", collectionSlug)
      mainWindow?.webContents.send("opensea-get-floor-price", collectionSlug)
      return new Promise(resolve => {
        ipcMain.once("opensea-floor-price-response", (event, price) => {
          logger.info("opensea-floor-price-response", price)
          resolve(price)
        })
      })
    }
  },

  getWalletNFTs: {
    title: "Get Wallet NFTs",
    description: "Get all NFTs owned by a wallet address",
    tool: async (address, chain) => {
      logger.info("getWalletNFTs called", { address, chain })
      mainWindow?.webContents.send("opensea-get-wallet-nfts", { address, chain })
      return new Promise(resolve => {
        ipcMain.once("opensea-wallet-nfts-response", (event, nfts) => {
          logger.info("opensea-wallet-nfts-response", nfts)
          resolve(nfts)
        })
      })
    }
  },

  getTokenSwapQuote: {
    title: "Get Token Swap Quote",
    description: "Get a swap quote for token exchange",
    tool: async (fromToken, toToken, amount, chain) => {
      logger.info("getTokenSwapQuote called", { fromToken, toToken, amount, chain })
      mainWindow?.webContents.send("opensea-swap-quote", { fromToken, toToken, amount, chain })
      return new Promise(resolve => {
        ipcMain.once("opensea-swap-quote-response", (event, quote) => {
          logger.info("opensea-swap-quote-response", quote)
          resolve(quote)
        })
      })
    }
  },

  getTrendingCollections: {
    title: "Get Trending Collections",
    description: "Get trending NFT collections from OpenSea",
    tool: async (timeframe, chain) => {
      logger.info("getTrendingCollections called", { timeframe, chain })
      mainWindow?.webContents.send("opensea-trending", { timeframe, chain })
      return new Promise(resolve => {
        ipcMain.once("opensea-trending-response", (event, trending) => {
          logger.info("opensea-trending-response", trending)
          resolve(trending)
        })
      })
    }
  },

  // x402 Protocol Operations
  discoverServices: {
    title: "Discover x402 Services",
    description: "Discover available services through x402 protocol",
    tool: async () => {
      logger.info("discoverServices called")
      mainWindow?.webContents.send("x402-discover")
      return new Promise(resolve => {
        ipcMain.once("x402-discover-response", (event, services) => {
          logger.info("x402-discover-response", services)
          resolve(services)
        })
      })
    }
  },

  createPaymentChannel: {
    title: "Create Payment Channel",
    description: "Create an x402 payment channel for service access",
    tool: async (serviceId, amount, duration) => {
      logger.info("createPaymentChannel called", { serviceId, amount, duration })
      mainWindow?.webContents.send("x402-create-channel", { serviceId, amount, duration })
      return new Promise(resolve => {
        ipcMain.once("x402-channel-response", (event, channel) => {
          logger.info("x402-channel-response", channel)
          resolve(channel)
        })
      })
    }
  }
}

// Create Electron window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 10, y: 10 }
  })

  // Load the embedded wallet UI
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../frontend/build/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// Note: MCP Server is now run separately as mcp-standalone.js
// This Electron app focuses on the embedded wallet UI

// Initialize OpenSea Bridge
function initializeOpenSeaBridge() {
  openSeaBridge = new OpenSeaMCPBridge({
    accessToken: process.env.OPENSEA_ACCESS_TOKEN,
    mcpUrl: process.env.OPENSEA_MCP_URL || 'https://mcp.opensea.io/sse'
  })
  
  logger.info('OpenSea MCP Bridge initialized')
}

// IPC Handlers for direct communication
ipcMain.handle('get-wallet-address', async () => {
  return mainWindow?.webContents.executeJavaScript('window.getWalletAddress()')
})

ipcMain.handle('get-network', async () => {
  return mainWindow?.webContents.executeJavaScript('window.getNetwork()')
})

ipcMain.handle('opensea-direct-call', async (event, tool, params) => {
  return openSeaBridge.callTool(tool, params)
})

// App event handlers
app.whenReady().then(() => {
  createWindow()
  initializeOpenSeaBridge()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

module.exports = { operations }