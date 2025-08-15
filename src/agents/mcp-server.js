// MCP Server for Agent Capabilities
import express from 'express';
import mcpay from 'mcpay';
const { MCPayProxy } = mcpay;
import X402PaymentGateway from './x402-gateway.js';

class AgentMCPServer {
  constructor(config) {
    this.app = express();
    this.port = config.port || 3000;
    this.agentId = config.agentId;
    this.capabilities = config.capabilities || [];
    
    // Initialize payment gateway
    this.paymentGateway = new X402PaymentGateway({
      walletAddress: config.walletAddress,
      network: config.network || 'base'
    });
    
    // Initialize MCPay proxy for monetization
    this.mcpayProxy = new MCPayProxy({
      pricePerRequest: config.pricePerRequest || 0.001,
      currency: 'USDC',
      paymentMethods: ['x402', 'lightning']
    });
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(express.json());
    
    // MCPay monetization middleware
    this.app.use('/api/*', (req, res, next) => {
      return this.mcpayProxy.handleRequest(req, res, next);
    });
  }

  setupRoutes() {
    // Agent info endpoint
    this.app.get('/info', (req, res) => {
      res.json({
        agentId: this.agentId,
        capabilities: this.capabilities,
        pricing: {
          pricePerRequest: 0.001,
          currency: 'USDC'
        },
        status: 'active'
      });
    });

    // List available tools/capabilities
    this.app.get('/api/tools', async (req, res) => {
      const tools = this.capabilities.map(cap => ({
        name: cap.name,
        description: cap.description,
        parameters: cap.parameters,
        price: cap.price || 0.001
      }));
      
      res.json({ tools });
    });

    // Execute a tool/capability
    this.app.post('/api/tools/:toolName/execute', async (req, res) => {
      await this.paymentGateway.handlePaymentRequest(
        req,
        res,
        async (params) => {
          const toolName = req.params.toolName;
          const capability = this.capabilities.find(c => c.name === toolName);
          
          if (!capability) {
            throw new Error('Tool not found');
          }
          
          // Execute the capability
          return await this.executeCapability(capability, params);
        }
      );
    });

    // Agent learning endpoint
    this.app.post('/api/learn', async (req, res) => {
      const { pattern, data } = req.body;
      
      try {
        const result = await this.learnPattern(pattern, data);
        res.json({ success: true, result });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Swarm communication endpoint
    this.app.post('/api/swarm/message', async (req, res) => {
      const { fromAgent, message, priority } = req.body;
      
      try {
        const response = await this.handleSwarmMessage(fromAgent, message, priority);
        res.json({ success: true, response });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Purchase new capability
    this.app.post('/api/capabilities/purchase', async (req, res) => {
      const { capabilityUrl, maxPrice } = req.body;
      
      try {
        const newCapability = await this.paymentGateway.purchaseCapability(
          capabilityUrl,
          maxPrice
        );
        
        // Add to agent's capabilities
        this.capabilities.push(newCapability);
        
        res.json({ 
          success: true, 
          capability: newCapability,
          totalCapabilities: this.capabilities.length
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Earnings report
    this.app.get('/api/earnings', (req, res) => {
      const earnings = this.paymentGateway.getEarnings();
      res.json(earnings);
    });
  }

  // Execute a specific capability
  async executeCapability(capability, params) {
    console.log(`Executing capability: ${capability.name}`);
    
    // Simulate capability execution based on type
    switch (capability.type) {
      case 'analysis':
        return this.performAnalysis(params);
      case 'prediction':
        return this.makePrediction(params);
      case 'optimization':
        return this.optimize(params);
      case 'data-fetch':
        return this.fetchData(params);
      default:
        // Generic execution
        return {
          capability: capability.name,
          result: `Executed with params: ${JSON.stringify(params)}`,
          timestamp: Date.now()
        };
    }
  }

  // Analysis capability
  async performAnalysis(params) {
    // Simulate complex analysis
    return {
      type: 'analysis',
      insights: [
        'Pattern detected in data',
        'Anomaly found at index 42',
        'Trend is upward with 87% confidence'
      ],
      confidence: 0.87,
      recommendations: ['Increase allocation', 'Monitor closely']
    };
  }

  // Prediction capability
  async makePrediction(params) {
    return {
      type: 'prediction',
      value: Math.random() * 100,
      confidence: 0.75,
      timeframe: '24h',
      factors: ['market sentiment', 'historical data', 'current trends']
    };
  }

  // Optimization capability
  async optimize(params) {
    return {
      type: 'optimization',
      originalValue: params.value || 100,
      optimizedValue: (params.value || 100) * 1.23,
      improvement: '23%',
      method: 'gradient descent'
    };
  }

  // Data fetching capability
  async fetchData(params) {
    // Could integrate with real data sources
    return {
      type: 'data',
      source: params.source || 'default',
      data: {
        value: Math.random() * 1000,
        timestamp: Date.now(),
        quality: 'high'
      }
    };
  }

  // Learn new pattern
  async learnPattern(pattern, data) {
    console.log(`Learning pattern: ${pattern}`);
    
    // Simulate learning process
    const success = Math.random() > 0.3;
    
    if (success) {
      // Add new capability based on learned pattern
      const newCapability = {
        name: `learned-${pattern}`,
        description: `Capability learned from ${pattern} pattern`,
        type: 'learned',
        parameters: [],
        price: 0.002
      };
      
      this.capabilities.push(newCapability);
      
      return {
        learned: true,
        pattern,
        newCapability: newCapability.name
      };
    }
    
    return {
      learned: false,
      pattern,
      reason: 'Insufficient data for pattern recognition'
    };
  }

  // Handle messages from swarm
  async handleSwarmMessage(fromAgent, message, priority = 'normal') {
    console.log(`Swarm message from ${fromAgent}: ${message.type}`);
    
    switch (message.type) {
      case 'task-request':
        return { accepted: true, estimatedTime: '5m' };
      case 'knowledge-share':
        await this.learnPattern(message.pattern, message.data);
        return { received: true, learned: true };
      case 'consensus-vote':
        return { vote: Math.random() > 0.5 ? 'yes' : 'no' };
      default:
        return { acknowledged: true };
    }
  }

  // Start the MCP server
  start() {
    this.app.listen(this.port, () => {
      console.log(`🚀 Agent MCP Server ${this.agentId} running on port ${this.port}`);
      console.log(`💰 Accepting payments via x402 and MCPay`);
      console.log(`🧠 Capabilities: ${this.capabilities.map(c => c.name).join(', ')}`);
    });
  }
}

export default AgentMCPServer;