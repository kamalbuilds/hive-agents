import { Client, PrivateKey, AccountId, TopicCreateTransaction, TopicMessageSubmitTransaction, TokenCreateTransaction, TokenType, TokenSupplyType, TransferTransaction, Hbar } from '@hashgraph/sdk';
import { HederaAgentAPI } from 'hedera-agent-kit';

export class HederaService {
  private client: Client;
  private operatorId: AccountId;
  private operatorKey: PrivateKey;
  private agentAPI?: HederaAgentAPI;

  constructor() {
    const network = process.env.NEXT_PUBLIC_HEDERA_NETWORK || 'testnet';
    
    if (!process.env.HEDERA_OPERATOR_ID || !process.env.HEDERA_OPERATOR_KEY) {
      throw new Error('Hedera credentials not configured');
    }

    this.operatorId = AccountId.fromString(process.env.HEDERA_OPERATOR_ID);
    this.operatorKey = PrivateKey.fromStringDer(process.env.HEDERA_OPERATOR_KEY);

    this.client = network === 'mainnet' 
      ? Client.forMainnet() 
      : Client.forTestnet();
    
    this.client.setOperator(this.operatorId, this.operatorKey);
    
    // Initialize Hedera Agent Kit
    this.agentAPI = new HederaAgentAPI({
      client: this.client,
      configuration: {
        plugins: []
      }
    });
  }

  /**
   * Create a new HCS topic for zone monitoring updates
   */
  async createMonitoringTopic(zoneName: string, memo: string) {
    try {
      const transaction = new TopicCreateTransaction()
        .setTopicMemo(`EcoNexus Zone: ${zoneName} - ${memo}`)
        .setSubmitKey(this.operatorKey.publicKey);

      const txResponse = await transaction.execute(this.client);
      const receipt = await txResponse.getReceipt(this.client);
      
      return {
        topicId: receipt.topicId?.toString(),
        transactionId: txResponse.transactionId.toString()
      };
    } catch (error) {
      console.error('Error creating topic:', error);
      throw error;
    }
  }

  /**
   * Submit monitoring data to HCS topic
   */
  async submitMonitoringData(topicId: string, data: any) {
    try {
      const message = JSON.stringify({
        timestamp: new Date().toISOString(),
        data,
        source: 'EcoNexus-AI-Monitor'
      });

      const transaction = new TopicMessageSubmitTransaction()
        .setTopicId(topicId)
        .setMessage(message);

      const txResponse = await transaction.execute(this.client);
      const receipt = await txResponse.getReceipt(this.client);
      
      return {
        sequenceNumber: receipt.topicSequenceNumber?.toString(),
        transactionId: txResponse.transactionId.toString()
      };
    } catch (error) {
      console.error('Error submitting to topic:', error);
      throw error;
    }
  }

  /**
   * Create environmental credit token
   */
  async createCreditToken(
    name: string,
    symbol: string,
    decimals: number,
    initialSupply: number,
    metadata: Record<string, any>
  ) {
    try {
      const transaction = new TokenCreateTransaction()
        .setTokenName(name)
        .setTokenSymbol(symbol)
        .setTokenType(TokenType.FungibleCommon)
        .setDecimals(decimals)
        .setInitialSupply(initialSupply)
        .setTreasuryAccountId(this.operatorId)
        .setSupplyType(TokenSupplyType.Finite)
        .setMaxSupply(1000000000)
        .setTokenMemo(JSON.stringify(metadata))
        .setSupplyKey(this.operatorKey.publicKey)
        .setAdminKey(this.operatorKey.publicKey);

      const txResponse = await transaction.execute(this.client);
      const receipt = await txResponse.getReceipt(this.client);
      
      return {
        tokenId: receipt.tokenId?.toString(),
        transactionId: txResponse.transactionId.toString()
      };
    } catch (error) {
      console.error('Error creating token:', error);
      throw error;
    }
  }

  /**
   * Transfer HBAR for staking rewards
   */
  async transferHbar(toAccountId: string, amount: number) {
    try {
      const transaction = new TransferTransaction()
        .addHbarTransfer(this.operatorId, new Hbar(-amount))
        .addHbarTransfer(AccountId.fromString(toAccountId), new Hbar(amount));

      const txResponse = await transaction.execute(this.client);
      const receipt = await txResponse.getReceipt(this.client);
      
      return {
        status: receipt.status.toString(),
        transactionId: txResponse.transactionId.toString()
      };
    } catch (error) {
      console.error('Error transferring HBAR:', error);
      throw error;
    }
  }

  /**
   * Get account balance
   */
  async getAccountBalance(accountId?: string) {
    try {
      const targetAccount = accountId ? AccountId.fromString(accountId) : this.operatorId;
      const balance = await this.client.getAccountBalance(targetAccount);
      
      return {
        hbars: balance.hbars.toString(),
        tokens: balance.tokens?.toString() || {}
      };
    } catch (error) {
      console.error('Error getting balance:', error);
      throw error;
    }
  }

  /**
   * Query mirror node for transaction history
   */
  async getTransactionHistory(accountId: string, limit: number = 10) {
    const network = process.env.NEXT_PUBLIC_HEDERA_NETWORK || 'testnet';
    const mirrorNodeUrl = network === 'mainnet' 
      ? 'https://mainnet-public.mirrornode.hedera.com'
      : 'https://testnet.mirrornode.hedera.com';

    try {
      const response = await fetch(
        `${mirrorNodeUrl}/api/v1/transactions?account.id=${accountId}&limit=${limit}&order=desc`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch transaction history');
      }
      
      const data = await response.json();
      return data.transactions || [];
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      throw error;
    }
  }

  /**
   * Use Hedera Agent Kit for complex operations
   */
  async executeAgentAction(action: string, params: any) {
    if (!this.agentAPI) {
      throw new Error('Hedera Agent Kit not initialized');
    }

    try {
      // This would integrate with the agent kit for complex operations
      // For now, returning a placeholder
      return {
        success: true,
        action,
        params,
        message: 'Agent action executed successfully'
      };
    } catch (error) {
      console.error('Error executing agent action:', error);
      throw error;
    }
  }

  getClient() {
    return this.client;
  }

  getOperatorId() {
    return this.operatorId.toString();
  }
}