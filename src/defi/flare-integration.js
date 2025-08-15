// Flare Network Integration - FTSO & FAssets
import { ethers } from 'ethers';
import axios from 'axios';

class FlareIntegration {
  constructor(config) {
    this.network = config.network || 'flare';
    this.rpcUrl = this.getRPCUrl();
    this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
    
    // Contract addresses (Flare Mainnet)
    this.contracts = {
      ftsoRegistry: '0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019',
      ftsoManager: '0xbfA12e4E1411B62EdA8B035d71735667422A6A9e',
      priceSubmitter: '0x1000000000000000000000000000000000000003',
      wnat: '0x1D80c49BbBCd1C0911346656B529DF9E5c2F783d', // Wrapped Native Token
      fassets: {
        fxrp: '0x0000000000000000000000000000000000000000' // FAssets XRP (when deployed)
      }
    };
    
    this.ftsoSymbols = ['FLR/USD', 'XRP/USD', 'BTC/USD', 'ETH/USD', 'LTC/USD'];
    this.priceCache = new Map();
    this.cacheTimeout = 30000; // 30 seconds
  }

  getRPCUrl() {
    const urls = {
      'flare': 'https://flare-api.flare.network/ext/C/rpc',
      'coston': 'https://coston-api.flare.network/ext/C/rpc',
      'coston2': 'https://coston2-api.flare.network/ext/C/rpc'
    };
    return urls[this.network] || urls.flare;
  }

  // Get FTSO Registry contract
  getFTSORegistry() {
    const abi = [
      'function getFtsoBySymbol(string memory _symbol) external view returns(address)',
      'function getSupportedSymbols() external view returns(string[] memory)',
      'function getFtsos(uint256[] memory _indices) external view returns(address[] memory)'
    ];
    
    return new ethers.Contract(this.contracts.ftsoRegistry, abi, this.provider);
  }

  // Get current price from FTSO
  async getCurrentPrice(symbol) {
    // Check cache first
    const cached = this.priceCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    
    try {
      const ftsoRegistry = this.getFTSORegistry();
      const ftsoAddress = await ftsoRegistry.getFtsoBySymbol(symbol);
      
      if (ftsoAddress === ethers.ZeroAddress) {
        throw new Error(`FTSO not found for symbol: ${symbol}`);
      }
      
      const ftsoAbi = [
        'function getCurrentPrice() external view returns (uint256 _price, uint256 _timestamp)',
        'function getCurrentPriceWithDecimals() external view returns (uint256 _price, uint256 _timestamp, uint256 _decimals)'
      ];
      
      const ftso = new ethers.Contract(ftsoAddress, ftsoAbi, this.provider);
      const [price, timestamp, decimals] = await ftso.getCurrentPriceWithDecimals();
      
      const priceData = {
        symbol,
        price: Number(price) / Math.pow(10, Number(decimals)),
        timestamp: Number(timestamp),
        decimals: Number(decimals),
        ftsoAddress
      };
      
      // Cache the result
      this.priceCache.set(symbol, {
        data: priceData,
        timestamp: Date.now()
      });
      
      return priceData;
      
    } catch (error) {
      console.error(`Failed to get FTSO price for ${symbol}:`, error);
      
      // Return mock data for development
      return {
        symbol,
        price: this.getMockPrice(symbol),
        timestamp: Date.now(),
        decimals: 5,
        mock: true
      };
    }
  }

  // Get mock price for development
  getMockPrice(symbol) {
    const prices = {
      'FLR/USD': 0.02 + Math.random() * 0.002,
      'XRP/USD': 0.50 + Math.random() * 0.05,
      'BTC/USD': 45000 + Math.random() * 1000,
      'ETH/USD': 2500 + Math.random() * 100,
      'LTC/USD': 65 + Math.random() * 5
    };
    return prices[symbol] || 100;
  }

  // Get multiple prices at once
  async getMultiplePrices(symbols) {
    const pricePromises = symbols.map(symbol => this.getCurrentPrice(symbol));
    const prices = await Promise.all(pricePromises);
    
    return prices.reduce((acc, price) => {
      acc[price.symbol] = price;
      return acc;
    }, {});
  }

  // Subscribe to price updates (polling-based)
  subscribeToPriceUpdates(symbols, callback, interval = 30000) {
    const updatePrices = async () => {
      try {
        const prices = await this.getMultiplePrices(symbols);
        callback(prices);
      } catch (error) {
        console.error('Price update error:', error);
      }
    };
    
    // Initial fetch
    updatePrices();
    
    // Set up polling
    const intervalId = setInterval(updatePrices, interval);
    
    // Return unsubscribe function
    return () => clearInterval(intervalId);
  }

  // Get supported FTSO symbols
  async getSupportedSymbols() {
    try {
      const ftsoRegistry = this.getFTSORegistry();
      const symbols = await ftsoRegistry.getSupportedSymbols();
      return symbols;
    } catch (error) {
      console.error('Failed to get supported symbols:', error);
      return this.ftsoSymbols; // Return default list
    }
  }

  // Calculate FAssets collateral requirements
  calculateCollateralRequirement(assetAmount, assetPrice, collateralRatio = 1.5) {
    const assetValueUSD = assetAmount * assetPrice;
    const requiredCollateral = assetValueUSD * collateralRatio;
    
    return {
      assetAmount,
      assetPrice,
      assetValueUSD,
      collateralRatio,
      requiredCollateral,
      currency: 'USD'
    };
  }

  // Mint FAssets (when available)
  async mintFAssets(assetType, amount, collateral) {
    console.log(`Minting ${amount} ${assetType} with ${collateral} USD collateral`);
    
    // This would interact with FAssets contracts when deployed
    // For now, return mock response
    return {
      success: true,
      assetType,
      amount,
      collateral,
      txHash: `0x${crypto.randomBytes(32).toString('hex')}`,
      fassetAddress: this.contracts.fassets[assetType.toLowerCase()] || '0x0',
      mock: true
    };
  }

  // Redeem FAssets
  async redeemFAssets(assetType, amount) {
    console.log(`Redeeming ${amount} ${assetType}`);
    
    // Mock redemption
    return {
      success: true,
      assetType,
      amount,
      underlyingAmount: amount * 0.99, // 1% fee
      txHash: `0x${crypto.randomBytes(32).toString('hex')}`,
      mock: true
    };
  }

  // Get secure random number from Flare
  async getSecureRandom() {
    try {
      const randomAbi = [
        'function getCurrentRandom() external view returns (uint256, bool, uint256)'
      ];
      
      // Flare's secure random contract
      const randomAddress = '0x1000000000000000000000000000000000000002';
      const randomContract = new ethers.Contract(randomAddress, randomAbi, this.provider);
      
      const [randomNumber, isSecure, timestamp] = await randomContract.getCurrentRandom();
      
      return {
        value: randomNumber.toString(),
        isSecure,
        timestamp: Number(timestamp),
        normalized: Number(randomNumber % 1000000n) / 1000000 // 0-1 range
      };
      
    } catch (error) {
      console.error('Failed to get secure random:', error);
      
      // Fallback to pseudo-random
      return {
        value: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(),
        isSecure: false,
        timestamp: Date.now(),
        normalized: Math.random(),
        mock: true
      };
    }
  }

  // Wrap native FLR tokens
  async wrapNativeTokens(amount, signer) {
    try {
      const wnatAbi = [
        'function deposit() external payable',
        'function withdraw(uint256) external',
        'function balanceOf(address) external view returns (uint256)'
      ];
      
      const wnat = new ethers.Contract(this.contracts.wnat, wnatAbi, signer);
      
      // Wrap FLR to WFLR
      const tx = await wnat.deposit({ value: ethers.parseEther(amount.toString()) });
      await tx.wait();
      
      return {
        success: true,
        amount,
        txHash: tx.hash,
        wnatAddress: this.contracts.wnat
      };
      
    } catch (error) {
      console.error('Failed to wrap tokens:', error);
      throw error;
    }
  }

  // Get reward epoch info
  async getRewardEpochInfo() {
    try {
      const ftsoManagerAbi = [
        'function getCurrentRewardEpoch() external view returns (uint256)',
        'function getRewardEpochStartTimestamp(uint256 _rewardEpoch) external view returns (uint256)',
        'function getRewardEpochDurationSeconds() external view returns (uint256)'
      ];
      
      const ftsoManager = new ethers.Contract(
        this.contracts.ftsoManager, 
        ftsoManagerAbi, 
        this.provider
      );
      
      const currentEpoch = await ftsoManager.getCurrentRewardEpoch();
      const startTimestamp = await ftsoManager.getRewardEpochStartTimestamp(currentEpoch);
      const duration = await ftsoManager.getRewardEpochDurationSeconds();
      
      return {
        currentEpoch: Number(currentEpoch),
        startTimestamp: Number(startTimestamp),
        duration: Number(duration),
        endTimestamp: Number(startTimestamp) + Number(duration)
      };
      
    } catch (error) {
      console.error('Failed to get reward epoch info:', error);
      
      // Mock data
      return {
        currentEpoch: Math.floor(Date.now() / (3.5 * 24 * 60 * 60 * 1000)),
        startTimestamp: Date.now() - (24 * 60 * 60 * 1000),
        duration: 3.5 * 24 * 60 * 60,
        endTimestamp: Date.now() + (2.5 * 24 * 60 * 60 * 1000),
        mock: true
      };
    }
  }

  // Get price history (mock implementation)
  async getPriceHistory(symbol, periods = 24) {
    const currentPrice = await this.getCurrentPrice(symbol);
    const history = [];
    
    for (let i = periods; i > 0; i--) {
      const variation = (Math.random() - 0.5) * 0.1;
      const historicalPrice = currentPrice.price * (1 + variation);
      
      history.push({
        timestamp: Date.now() - (i * 60 * 60 * 1000),
        price: historicalPrice,
        symbol
      });
    }
    
    history.push({
      timestamp: Date.now(),
      price: currentPrice.price,
      symbol
    });
    
    return history;
  }

  // Calculate price statistics
  calculatePriceStats(priceHistory) {
    const prices = priceHistory.map(p => p.price);
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    
    const variance = prices.reduce((sum, price) => {
      return sum + Math.pow(price - mean, 2);
    }, 0) / prices.length;
    
    const stdDev = Math.sqrt(variance);
    
    return {
      mean,
      min: Math.min(...prices),
      max: Math.max(...prices),
      stdDev,
      volatility: (stdDev / mean) * 100,
      trend: prices[prices.length - 1] > prices[0] ? 'up' : 'down'
    };
  }
}

export default FlareIntegration;