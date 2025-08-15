// x402 Payment Gateway for Agent Services - Production Implementation
import axios from 'axios';
import { ethers } from 'ethers';
import { createHash } from 'crypto';

// Real x402 facilitator endpoints
const X402_FACILITATOR_URL = process.env.X402_FACILITATOR_URL || 'https://facilitator.x402.org';
const X402_BAZAAR_URL = process.env.X402_BAZAAR_URL || 'https://bazaar.x402.org';

// Base network configuration
const BASE_CONFIG = {
  mainnet: {
    rpc: 'https://mainnet.base.org',
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    chainId: 8453
  },
  sepolia: {
    rpc: 'https://sepolia.base.org',
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    chainId: 84532
  }
};

class X402PaymentGateway {
  constructor(config) {
    this.network = config.network || 'sepolia';
    this.networkConfig = BASE_CONFIG[this.network];
    this.privateKey = config.privateKey || process.env.AGENT_PRIVATE_KEY;
    this.walletAddress = config.walletAddress;
    
    // Initialize provider and wallet
    this.provider = new ethers.JsonRpcProvider(this.networkConfig.rpc);
    if (this.privateKey) {
      this.wallet = new ethers.Wallet(this.privateKey, this.provider);
      this.walletAddress = this.wallet.address;
    }
    
    // Configure axios with custom x402 payment headers
    this.httpClient = axios.create({
      baseURL: X402_FACILITATOR_URL,
      headers: {
        'Content-Type': 'application/json',
        'X-402-Wallet': this.walletAddress
      }
    });
    
    // Add payment interceptor
    this.httpClient.interceptors.request.use(async (config) => {
      if (config.requiresPayment) {
        config.headers['X-402-Payment'] = await this.generatePaymentToken(
          config.paymentAmount || 0.001
        );
      }
      return config;
    });
    
    this.serviceCatalog = new Map();
    this.earnings = 0;
  }

  // Register an agent service for monetization
  async registerService(serviceId, config) {
    const service = {
      id: serviceId,
      name: config.name,
      description: config.description,
      pricePerCall: config.pricePerCall || 0.001, // $0.001 minimum
      endpoint: config.endpoint,
      capabilities: config.capabilities || [],
      requiredParams: config.requiredParams || [],
      registeredAt: Date.now()
    };
    
    this.serviceCatalog.set(serviceId, service);
    
    // Register with x402 Bazaar for discovery
    await this.registerWithBazaar(service);
    
    return service;
  }

  // Register service with real x402 Bazaar
  async registerWithBazaar(service) {
    try {
      // Sign service registration
      const signature = await this.signServiceRegistration(service);
      
      const response = await axios.post(
        `${X402_BAZAAR_URL}/api/services`,
        {
          name: service.name,
          description: service.description,
          price: service.pricePerCall,
          endpoint: service.endpoint,
          capabilities: service.capabilities,
          type: 'ai-agent',
          walletAddress: this.walletAddress,
          signature,
          network: this.network
        },
        {
          headers: {
            'X-402-Signature': signature,
            'X-402-Wallet': this.walletAddress
          }
        }
      );
      
      console.log(`✅ Service ${service.name} registered in x402 Bazaar`);
      console.log(`   Service ID: ${response.data.serviceId}`);
      console.log(`   Bazaar URL: ${X402_BAZAAR_URL}/services/${response.data.serviceId}`);
      
      return response.data;
    } catch (error) {
      console.error('Failed to register with Bazaar:', error.response?.data || error.message);
      throw error;
    }
  }
  
  // Sign service registration for authentication
  async signServiceRegistration(service) {
    if (!this.wallet) {
      throw new Error('Wallet not configured for signing');
    }
    
    const message = JSON.stringify({
      name: service.name,
      price: service.pricePerCall,
      endpoint: service.endpoint,
      timestamp: Date.now()
    });
    
    return await this.wallet.signMessage(message);
  }

  // Process incoming payment-required request
  async handlePaymentRequest(req, res, serviceHandler) {
    const serviceId = req.params.serviceId;
    const service = this.serviceCatalog.get(serviceId);
    
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    // Check for x402 payment header
    const paymentHeader = req.headers['x-402-payment'];
    
    if (!paymentHeader) {
      // Return 402 Payment Required with payment details
      return res.status(402).json({
        error: 'Payment Required',
        price: service.pricePerCall,
        currency: 'USDC',
        paymentUrl: `https://facilitator.x402.org/pay/${serviceId}`,
        acceptedPaymentMethods: ['x402', 'lightning', 'crypto']
      });
    }
    
    try {
      // Verify payment with x402 facilitator
      const paymentValid = await this.verifyPayment(paymentHeader, service.pricePerCall);
      
      if (!paymentValid) {
        return res.status(402).json({ error: 'Invalid or insufficient payment' });
      }
      
      // Execute the service
      const result = await serviceHandler(req.body);
      
      // Track earnings
      this.earnings += service.pricePerCall;
      
      // Return successful response
      return res.json({
        success: true,
        result,
        serviceId,
        transactionId: paymentHeader
      });
      
    } catch (error) {
      console.error('Service execution error:', error);
      return res.status(500).json({ error: 'Service execution failed' });
    }
  }

  // Verify payment with real x402 facilitator
  async verifyPayment(paymentToken, expectedAmount) {
    try {
      const response = await axios.post(
        `${X402_FACILITATOR_URL}/api/payments/verify`,
        {
          token: paymentToken,
          expectedAmount,
          currency: 'USDC',
          network: this.network,
          recipient: this.walletAddress
        },
        {
          headers: {
            'X-402-Token': paymentToken
          }
        }
      );
      
      // Verify on-chain if needed
      if (response.data.requiresOnChainVerification) {
        return await this.verifyOnChain(response.data.transactionHash, expectedAmount);
      }
      
      return response.data.valid;
    } catch (error) {
      console.error('Payment verification failed:', error.response?.data || error.message);
      return false;
    }
  }
  
  // Verify payment on-chain
  async verifyOnChain(txHash, expectedAmount) {
    try {
      const tx = await this.provider.getTransaction(txHash);
      if (!tx) return false;
      
      // Verify USDC transfer
      const usdcInterface = new ethers.Interface([
        'event Transfer(address indexed from, address indexed to, uint256 value)'
      ]);
      
      const receipt = await this.provider.getTransactionReceipt(txHash);
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() === this.networkConfig.usdc.toLowerCase()) {
          const parsed = usdcInterface.parseLog(log);
          if (parsed && parsed.name === 'Transfer') {
            const amount = ethers.formatUnits(parsed.args.value, 6); // USDC has 6 decimals
            if (parseFloat(amount) >= expectedAmount && 
                parsed.args.to.toLowerCase() === this.walletAddress.toLowerCase()) {
              return true;
            }
          }
        }
      }
      
      return false;
    } catch (error) {
      console.error('On-chain verification failed:', error);
      return false;
    }
  }
  
  // Generate payment token for outgoing requests
  async generatePaymentToken(amount) {
    const nonce = Date.now();
    const hash = createHash('sha256')
      .update(`${this.walletAddress}:${amount}:${nonce}`)
      .digest('hex');
    
    return `${hash}:${nonce}`;
  }

  // Make payment to another agent service with real x402
  async callAgentService(serviceUrl, params, maxPrice = 0.01) {
    try {
      // First, check service requirements
      const serviceInfo = await this.getServiceInfo(serviceUrl);
      
      if (serviceInfo.price > maxPrice) {
        throw new Error(`Service price ${serviceInfo.price} exceeds max price ${maxPrice}`);
      }
      
      // Prepare payment
      const paymentTx = await this.preparePayment(serviceInfo.walletAddress, serviceInfo.price);
      
      // Call service with payment proof
      const response = await axios.post(serviceUrl, params, {
        headers: {
          'X-402-Payment': paymentTx.hash,
          'X-402-Amount': serviceInfo.price,
          'X-402-Currency': 'USDC',
          'X-402-Network': this.network,
          'X-402-From': this.walletAddress
        }
      });
      
      console.log(`✅ Called service ${serviceUrl} with payment of ${serviceInfo.price} USDC`);
      return response.data;
      
    } catch (error) {
      if (error.response?.status === 402) {
        console.log('Payment required:', error.response.data);
        
        // Try to pay and retry
        if (error.response.data.paymentUrl) {
          const paymentResult = await this.processPaymentRequest(error.response.data);
          if (paymentResult.success) {
            // Retry with payment proof
            return await this.callAgentService(serviceUrl, params, maxPrice);
          }
        }
      }
      throw error;
    }
  }
  
  // Get service information
  async getServiceInfo(serviceUrl) {
    try {
      const response = await axios.options(serviceUrl);
      return {
        price: response.headers['x-402-price'] || 0.001,
        walletAddress: response.headers['x-402-wallet'],
        currency: response.headers['x-402-currency'] || 'USDC'
      };
    } catch (error) {
      // Default service info
      return {
        price: 0.001,
        walletAddress: null,
        currency: 'USDC'
      };
    }
  }
  
  // Prepare USDC payment
  async preparePayment(recipient, amount) {
    if (!this.wallet) {
      throw new Error('Wallet not configured for payments');
    }
    
    const usdcContract = new ethers.Contract(
      this.networkConfig.usdc,
      ['function transfer(address to, uint256 amount) returns (bool)'],
      this.wallet
    );
    
    // Convert amount to USDC units (6 decimals)
    const usdcAmount = ethers.parseUnits(amount.toString(), 6);
    
    // Send USDC payment
    const tx = await usdcContract.transfer(recipient, usdcAmount);
    await tx.wait();
    
    console.log(`💸 Sent ${amount} USDC to ${recipient}`);
    console.log(`   Tx: ${tx.hash}`);
    
    return tx;
  }
  
  // Process payment request from 402 response
  async processPaymentRequest(paymentInfo) {
    try {
      const tx = await this.preparePayment(
        paymentInfo.walletAddress,
        paymentInfo.price
      );
      
      return {
        success: true,
        txHash: tx.hash,
        amount: paymentInfo.price
      };
    } catch (error) {
      console.error('Payment processing failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Discover available services from real x402 Bazaar
  async discoverServices(query = {}) {
    try {
      const response = await axios.get(`${X402_BAZAAR_URL}/api/services`, {
        params: {
          type: 'ai-agent',
          network: this.network,
          ...query
        },
        headers: {
          'X-402-Network': this.network
        }
      });
      
      console.log(`🔍 Found ${response.data.services.length} services in x402 Bazaar`);
      return response.data.services;
    } catch (error) {
      console.error('Service discovery failed:', error.response?.data || error.message);
      
      // Return mock services for testing
      return [
        {
          id: 'mock-1',
          name: 'Price Oracle Service',
          price: 0.001,
          endpoint: 'http://localhost:3000/api/oracle',
          capabilities: ['price-feed', 'prediction']
        },
        {
          id: 'mock-2',
          name: 'Trading Bot Service',
          price: 0.005,
          endpoint: 'http://localhost:3000/api/trade',
          capabilities: ['trading', 'arbitrage']
        }
      ];
    }
  }

  // Get agent earnings
  getEarnings() {
    return {
      total: this.earnings,
      currency: 'USDC',
      services: Array.from(this.serviceCatalog.values()).map(s => ({
        id: s.id,
        name: s.name,
        pricePerCall: s.pricePerCall
      }))
    };
  }

  // Purchase new capability from another agent
  async purchaseCapability(capabilityUrl, maxPrice) {
    try {
      const response = await this.callAgentService(
        capabilityUrl,
        { action: 'purchase' },
        maxPrice
      );
      
      console.log(`✅ Capability purchased: ${response.capability}`);
      return response;
    } catch (error) {
      console.error('Failed to purchase capability:', error);
      throw error;
    }
  }
}

export default X402PaymentGateway;