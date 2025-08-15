// CDP AgentKit Integration for Autonomous Agent Wallets
import { Wallet, Cdp } from '@coinbase/cdp-sdk';
import { AgentKit } from '@coinbase/agentkit';
import { ethers } from 'ethers';

class CDPAgentKit {
  constructor(config) {
    this.apiKeyName = config.apiKeyName || process.env.CDP_API_KEY_NAME;
    this.apiKeyPrivate = config.apiKeyPrivate || process.env.CDP_API_KEY_PRIVATE;
    this.network = config.network || 'base-sepolia';
    
    // Initialize CDP SDK
    Cdp.configure({
      apiKeyName: this.apiKeyName,
      apiKeyPrivateKey: this.apiKeyPrivate
    });
    
    this.wallets = new Map();
    this.agents = new Map();
  }

  // Create autonomous agent with wallet
  async createAgent(agentConfig) {
    try {
      // Create CDP wallet for agent
      const wallet = await Wallet.create({
        networkId: this.network
      });
      
      // Wait for wallet to be ready
      await wallet.waitForActivation();
      
      // Get wallet address and save seed
      const address = await wallet.getDefaultAddress();
      const seed = wallet.export();
      
      // Initialize AgentKit for the agent
      const agentKit = new AgentKit({
        wallet,
        network: this.network,
        capabilities: agentConfig.capabilities || ['trade', 'transfer', 'swap'],
        name: agentConfig.name,
        description: agentConfig.description
      });
      
      const agent = {
        id: agentConfig.id || `agent-${Date.now()}`,
        name: agentConfig.name,
        address: address.toString(),
        wallet,
        agentKit,
        seed, // Store securely in production
        capabilities: agentConfig.capabilities,
        created: new Date()
      };
      
      this.agents.set(agent.id, agent);
      this.wallets.set(address.toString(), wallet);
      
      console.log(`✅ Created CDP agent ${agent.name} with address ${address}`);
      return agent;
      
    } catch (error) {
      console.error('Failed to create CDP agent:', error);
      throw error;
    }
  }

  // Fund agent wallet
  async fundAgent(agentId, amount, currency = 'ETH') {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);
    
    try {
      // Request funds from faucet (testnet only)
      if (this.network.includes('sepolia')) {
        const faucetTx = await agent.wallet.faucet(amount);
        await faucetTx.wait();
        console.log(`💰 Funded agent ${agentId} with ${amount} ${currency} from faucet`);
        return faucetTx;
      }
      
      // For mainnet, would need real funding mechanism
      throw new Error('Mainnet funding not implemented');
      
    } catch (error) {
      console.error(`Failed to fund agent ${agentId}:`, error);
      throw error;
    }
  }

  // Execute autonomous trade
  async executeTrade(agentId, tradeParams) {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);
    
    try {
      // Use AgentKit to execute trade
      const trade = await agent.agentKit.trade({
        action: tradeParams.action, // 'buy' or 'sell'
        token: tradeParams.token,
        amount: tradeParams.amount,
        slippage: tradeParams.slippage || 0.01, // 1% default
        dex: tradeParams.dex || 'uniswap'
      });
      
      // Wait for transaction confirmation
      const receipt = await trade.wait();
      
      console.log(`📈 Agent ${agentId} executed ${tradeParams.action} trade for ${tradeParams.amount} ${tradeParams.token}`);
      return {
        success: true,
        txHash: receipt.transactionHash,
        agentId,
        trade: tradeParams
      };
      
    } catch (error) {
      console.error(`Trade execution failed for agent ${agentId}:`, error);
      throw error;
    }
  }

  // Transfer assets between agents
  async transferBetweenAgents(fromAgentId, toAgentId, amount, asset = 'ETH') {
    const fromAgent = this.agents.get(fromAgentId);
    const toAgent = this.agents.get(toAgentId);
    
    if (!fromAgent || !toAgent) {
      throw new Error('One or both agents not found');
    }
    
    try {
      const transfer = await fromAgent.wallet.createTransfer({
        amount,
        assetId: asset,
        destination: toAgent.address
      });
      
      // Wait for confirmation
      const result = await transfer.wait();
      
      console.log(`💸 Transferred ${amount} ${asset} from ${fromAgentId} to ${toAgentId}`);
      return {
        success: true,
        txHash: result.getTransactionHash(),
        from: fromAgent.address,
        to: toAgent.address,
        amount,
        asset
      };
      
    } catch (error) {
      console.error('Transfer failed:', error);
      throw error;
    }
  }

  // Deploy smart contract from agent
  async deployContract(agentId, contractConfig) {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);
    
    try {
      const deployment = await agent.wallet.deployContract({
        name: contractConfig.name,
        symbol: contractConfig.symbol,
        totalSupply: contractConfig.totalSupply,
        type: contractConfig.type || 'ERC20'
      });
      
      const result = await deployment.wait();
      const contractAddress = result.getContractAddress();
      
      console.log(`📝 Agent ${agentId} deployed contract at ${contractAddress}`);
      return {
        success: true,
        contractAddress,
        deploymentTx: result.getTransactionHash(),
        agentId
      };
      
    } catch (error) {
      console.error(`Contract deployment failed for agent ${agentId}:`, error);
      throw error;
    }
  }

  // Interact with smart contracts
  async callContract(agentId, contractAddress, method, params) {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);
    
    try {
      const invocation = await agent.wallet.invokeContract({
        contractAddress,
        method,
        args: params
      });
      
      const result = await invocation.wait();
      
      console.log(`🔧 Agent ${agentId} called ${method} on ${contractAddress}`);
      return {
        success: true,
        txHash: result.getTransactionHash(),
        contractAddress,
        method,
        agentId
      };
      
    } catch (error) {
      console.error(`Contract call failed for agent ${agentId}:`, error);
      throw error;
    }
  }

  // Get agent balance
  async getAgentBalance(agentId, asset = 'ETH') {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);
    
    try {
      const balances = await agent.wallet.listBalances();
      const balance = balances.find(b => b.asset.assetId === asset);
      
      return {
        agentId,
        address: agent.address,
        asset,
        balance: balance ? balance.amount : '0',
        balances: balances.map(b => ({
          asset: b.asset.assetId,
          amount: b.amount
        }))
      };
      
    } catch (error) {
      console.error(`Failed to get balance for agent ${agentId}:`, error);
      throw error;
    }
  }

  // Mass onboard users with CDP Onramp
  async onboardUser(userEmail, amount) {
    try {
      // Generate onramp URL for user
      const onrampUrl = await Cdp.generateOnrampUrl({
        destinationWallets: [{
          address: await this.getCollectorAddress(),
          blockchains: [this.network]
        }],
        email: userEmail,
        presetFiatAmount: amount,
        fiatCurrency: 'USD'
      });
      
      console.log(`🔗 Generated onramp URL for ${userEmail}`);
      return {
        success: true,
        onrampUrl,
        email: userEmail,
        amount
      };
      
    } catch (error) {
      console.error('Failed to generate onramp URL:', error);
      throw error;
    }
  }

  // Get collector wallet address for onramp
  async getCollectorAddress() {
    // Return first agent address or create dedicated collector
    const agents = Array.from(this.agents.values());
    if (agents.length > 0) {
      return agents[0].address;
    }
    
    // Create collector agent if none exist
    const collector = await this.createAgent({
      name: 'Collector',
      description: 'Onramp collector agent',
      capabilities: ['transfer']
    });
    
    return collector.address;
  }

  // List all agents
  getAgents() {
    return Array.from(this.agents.values()).map(agent => ({
      id: agent.id,
      name: agent.name,
      address: agent.address,
      capabilities: agent.capabilities,
      created: agent.created
    }));
  }

  // Export agent seed for backup
  exportAgentSeed(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);
    
    // In production, encrypt this before returning
    return {
      agentId,
      seed: agent.seed,
      address: agent.address,
      warning: 'Store this seed securely! Anyone with access can control the agent wallet.'
    };
  }

  // Import agent from seed
  async importAgent(seed, agentConfig) {
    try {
      const wallet = await Wallet.import({
        seed,
        networkId: this.network
      });
      
      const address = await wallet.getDefaultAddress();
      
      const agentKit = new AgentKit({
        wallet,
        network: this.network,
        capabilities: agentConfig.capabilities || ['trade', 'transfer', 'swap'],
        name: agentConfig.name,
        description: agentConfig.description
      });
      
      const agent = {
        id: agentConfig.id || `agent-${Date.now()}`,
        name: agentConfig.name,
        address: address.toString(),
        wallet,
        agentKit,
        seed,
        capabilities: agentConfig.capabilities,
        created: new Date(),
        imported: true
      };
      
      this.agents.set(agent.id, agent);
      this.wallets.set(address.toString(), wallet);
      
      console.log(`✅ Imported CDP agent ${agent.name} with address ${address}`);
      return agent;
      
    } catch (error) {
      console.error('Failed to import agent:', error);
      throw error;
    }
  }
}

export default CDPAgentKit;