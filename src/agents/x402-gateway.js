// x402 Payment Gateway for Agent Services
import { X402Client } from '@coinbase/x402';
import axios from 'axios';
import { x402Axios } from 'x402-axios';

class X402PaymentGateway {
  constructor(config) {
    this.client = new X402Client({
      facilitatorUrl: config.facilitatorUrl || 'https://facilitator.x402.org',
      network: config.network || 'base',
      walletAddress: config.walletAddress
    });
    
    // Configure axios with x402 interceptor
    this.httpClient = x402Axios(axios.create(), {
      client: this.client,
      autoRetry: true
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

  // Register service with x402 Bazaar
  async registerWithBazaar(service) {
    try {
      const response = await this.httpClient.post(
        'https://bazaar.x402.org/api/services',
        {
          name: service.name,
          description: service.description,
          price: service.pricePerCall,
          endpoint: service.endpoint,
          capabilities: service.capabilities,
          type: 'ai-agent'
        }
      );
      
      console.log(`✅ Service ${service.name} registered in x402 Bazaar`);
      return response.data;
    } catch (error) {
      console.error('Failed to register with Bazaar:', error);
    }
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

  // Verify payment with facilitator
  async verifyPayment(paymentToken, expectedAmount) {
    try {
      const response = await axios.post(
        'https://facilitator.x402.org/verify',
        {
          token: paymentToken,
          expectedAmount,
          currency: 'USDC'
        }
      );
      
      return response.data.valid;
    } catch (error) {
      console.error('Payment verification failed:', error);
      return false;
    }
  }

  // Make payment to another agent service
  async callAgentService(serviceUrl, params, maxPrice = 0.01) {
    try {
      // Use x402-enabled axios client
      const response = await this.httpClient.post(serviceUrl, params, {
        headers: {
          'X-Max-Price': maxPrice,
          'X-Currency': 'USDC'
        }
      });
      
      return response.data;
    } catch (error) {
      if (error.response?.status === 402) {
        console.log('Payment required:', error.response.data);
        // Auto-retry with payment is handled by x402Axios
      }
      throw error;
    }
  }

  // Discover available services from Bazaar
  async discoverServices(query = {}) {
    try {
      const response = await axios.get('https://bazaar.x402.org/api/services', {
        params: {
          type: 'ai-agent',
          ...query
        }
      });
      
      return response.data.services;
    } catch (error) {
      console.error('Service discovery failed:', error);
      return [];
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