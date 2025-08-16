/**
 * X402 PYUSD Payment Gateway
 * Handles micropayments for x402 services using PYUSD with LayerZero cross-chain support
 */

const { ethers } = require('ethers');
const crypto = require('crypto');

// LayerZero Endpoint IDs for supported chains
const CHAIN_IDS = {
    ethereum: 30101,
    baseSepolia: 40245,
    arbitrumSepolia: 40231,
    optimismSepolia: 40232,
    polygon: 30109,
    avalanche: 30106
};

// PYUSD addresses on different chains
const PYUSD_ADDRESSES = {
    ethereum: '0x6c3ea9036406852006290770bedfcaba0e23a0e8',
    baseSepolia: '0x0000000000000000000000000000000000000000', // Deploy MockPYUSD
    arbitrumSepolia: '0x0000000000000000000000000000000000000000',
    optimismSepolia: '0x0000000000000000000000000000000000000000'
};

// X402PaymentOrchestrator addresses (to be deployed)
const ORCHESTRATOR_ADDRESSES = {
    baseSepolia: '0x0000000000000000000000000000000000000000',
    arbitrumSepolia: '0x0000000000000000000000000000000000000000'
};

class X402PYUSDGateway {
    constructor(provider, signer, network = 'baseSepolia') {
        this.provider = provider;
        this.signer = signer;
        this.network = network;
        this.services = new Map();
        this.payments = new Map();
        this.subscriptions = new Map();
    }

    /**
     * Register a service for x402 micropayments
     */
    async registerService(serviceConfig) {
        const {
            name,
            description,
            pricePerCall,
            endpoint,
            capabilities,
            acceptedChains = ['baseSepolia', 'ethereum']
        } = serviceConfig;

        const serviceId = ethers.utils.keccak256(
            ethers.utils.toUtf8Bytes(`${name}-${Date.now()}`)
        );

        const service = {
            id: serviceId,
            name,
            description,
            pricePerCall: ethers.utils.parseUnits(pricePerCall.toString(), 6), // PYUSD has 6 decimals
            endpoint,
            capabilities,
            acceptedChains,
            owner: await this.signer.getAddress(),
            registeredAt: Date.now(),
            totalCalls: 0,
            totalRevenue: ethers.BigNumber.from(0),
            status: 'active'
        };

        this.services.set(serviceId, service);

        // Register on-chain if orchestrator is deployed
        if (ORCHESTRATOR_ADDRESSES[this.network] !== '0x0000000000000000000000000000000000000000') {
            await this._registerServiceOnChain(service);
        }

        console.log(`✅ Service registered: ${name} (${serviceId})`);
        return service;
    }

    /**
     * Create a payment channel for a service
     */
    async createPaymentChannel(serviceId, depositAmount, targetChain = null) {
        const service = this.services.get(serviceId);
        if (!service) {
            throw new Error('Service not found');
        }

        const channelId = ethers.utils.keccak256(
            ethers.utils.defaultAbiCoder.encode(
                ['bytes32', 'address', 'uint256'],
                [serviceId, await this.signer.getAddress(), Date.now()]
            )
        );

        const channel = {
            id: channelId,
            serviceId,
            consumer: await this.signer.getAddress(),
            provider: service.owner,
            deposit: ethers.utils.parseUnits(depositAmount.toString(), 6),
            spent: ethers.BigNumber.from(0),
            nonce: 0,
            sourceChain: this.network,
            targetChain: targetChain || this.network,
            createdAt: Date.now(),
            status: 'open'
        };

        // Approve PYUSD spending
        await this._approvePYUSD(channel.deposit);

        // Create channel on-chain if cross-chain
        if (targetChain && targetChain !== this.network) {
            await this._createCrossChainChannel(channel);
        } else {
            await this._createLocalChannel(channel);
        }

        this.payments.set(channelId, channel);
        console.log(`💳 Payment channel created: ${channelId}`);
        return channel;
    }

    /**
     * Execute a micropayment for a service call
     */
    async executePayment(channelId, amount = null) {
        const channel = this.payments.get(channelId);
        if (!channel) {
            throw new Error('Payment channel not found');
        }

        const service = this.services.get(channel.serviceId);
        const paymentAmount = amount || service.pricePerCall;

        if (channel.spent.add(paymentAmount).gt(channel.deposit)) {
            throw new Error('Insufficient channel balance');
        }

        channel.nonce++;
        channel.spent = channel.spent.add(paymentAmount);

        // Create payment proof
        const proof = await this._createPaymentProof(channel, paymentAmount);

        // If cross-chain, send via LayerZero
        if (channel.targetChain !== channel.sourceChain) {
            await this._sendCrossChainPayment(channel, proof);
        }

        console.log(`💸 Payment executed: ${ethers.utils.formatUnits(paymentAmount, 6)} PYUSD`);
        return proof;
    }

    /**
     * Create a subscription for recurring payments
     */
    async createSubscription(serviceId, duration, interval) {
        const service = this.services.get(serviceId);
        if (!service) {
            throw new Error('Service not found');
        }

        const subscriptionId = ethers.utils.keccak256(
            ethers.utils.toUtf8Bytes(`sub-${serviceId}-${Date.now()}`)
        );

        const totalCost = service.pricePerCall.mul(
            Math.floor(duration / interval)
        );

        const subscription = {
            id: subscriptionId,
            serviceId,
            subscriber: await this.signer.getAddress(),
            provider: service.owner,
            interval, // in seconds
            duration, // in seconds
            totalCost,
            nextPayment: Date.now() + interval * 1000,
            expiresAt: Date.now() + duration * 1000,
            status: 'active'
        };

        // Create payment channel for subscription
        const channel = await this.createPaymentChannel(
            serviceId,
            ethers.utils.formatUnits(totalCost, 6)
        );

        subscription.channelId = channel.id;
        this.subscriptions.set(subscriptionId, subscription);

        // Start automatic payments
        this._startSubscriptionPayments(subscription);

        console.log(`📅 Subscription created: ${subscriptionId}`);
        return subscription;
    }

    /**
     * Get service analytics
     */
    async getServiceAnalytics(serviceId) {
        const service = this.services.get(serviceId);
        if (!service) {
            throw new Error('Service not found');
        }

        const analytics = {
            serviceId,
            name: service.name,
            totalCalls: service.totalCalls,
            totalRevenue: ethers.utils.formatUnits(service.totalRevenue, 6),
            averageCallValue: service.totalCalls > 0 
                ? ethers.utils.formatUnits(
                    service.totalRevenue.div(service.totalCalls),
                    6
                ) : '0',
            activeChannels: Array.from(this.payments.values())
                .filter(c => c.serviceId === serviceId && c.status === 'open')
                .length,
            subscriptions: Array.from(this.subscriptions.values())
                .filter(s => s.serviceId === serviceId && s.status === 'active')
                .length
        };

        return analytics;
    }

    /**
     * Settle a payment channel
     */
    async settleChannel(channelId) {
        const channel = this.payments.get(channelId);
        if (!channel) {
            throw new Error('Payment channel not found');
        }

        // Create final settlement proof
        const settlementProof = await this._createSettlementProof(channel);

        // Submit on-chain settlement
        if (channel.targetChain !== channel.sourceChain) {
            await this._settleCrossChainChannel(channel, settlementProof);
        } else {
            await this._settleLocalChannel(channel, settlementProof);
        }

        channel.status = 'settled';
        
        // Update service revenue
        const service = this.services.get(channel.serviceId);
        service.totalRevenue = service.totalRevenue.add(channel.spent);
        service.totalCalls += channel.nonce;

        console.log(`✅ Channel settled: ${channelId}`);
        console.log(`   Total spent: ${ethers.utils.formatUnits(channel.spent, 6)} PYUSD`);
        
        return settlementProof;
    }

    // Private helper methods

    async _approvePYUSD(amount) {
        const pyusdAddress = PYUSD_ADDRESSES[this.network];
        if (pyusdAddress === '0x0000000000000000000000000000000000000000') {
            console.log('⚠️ PYUSD not deployed on this network');
            return;
        }

        const pyusdAbi = [
            'function approve(address spender, uint256 amount) returns (bool)'
        ];

        const pyusd = new ethers.Contract(pyusdAddress, pyusdAbi, this.signer);
        const orchestrator = ORCHESTRATOR_ADDRESSES[this.network];
        
        const tx = await pyusd.approve(orchestrator, amount);
        await tx.wait();
        
        console.log(`✅ PYUSD approval granted: ${ethers.utils.formatUnits(amount, 6)}`);
    }

    async _createPaymentProof(channel, amount) {
        const message = ethers.utils.solidityKeccak256(
            ['bytes32', 'uint256', 'uint256', 'uint256'],
            [channel.id, channel.nonce, amount, Date.now()]
        );

        const signature = await this.signer.signMessage(
            ethers.utils.arrayify(message)
        );

        return {
            channelId: channel.id,
            nonce: channel.nonce,
            amount,
            timestamp: Date.now(),
            signature,
            message
        };
    }

    async _createSettlementProof(channel) {
        const message = ethers.utils.solidityKeccak256(
            ['bytes32', 'uint256', 'uint256', 'string'],
            [channel.id, channel.spent, channel.nonce, 'SETTLEMENT']
        );

        const signature = await this.signer.signMessage(
            ethers.utils.arrayify(message)
        );

        return {
            channelId: channel.id,
            finalAmount: channel.spent,
            finalNonce: channel.nonce,
            timestamp: Date.now(),
            signature,
            message
        };
    }

    async _sendCrossChainPayment(channel, proof) {
        // Estimate LayerZero fees
        const fees = await this._estimateLayerZeroFees(
            channel.targetChain,
            proof
        );

        console.log(`🌉 Sending cross-chain payment to ${channel.targetChain}`);
        console.log(`   LayerZero fee: ${ethers.utils.formatEther(fees)} ETH`);

        // Implementation would call X402PaymentOrchestrator.initiatePayment
        // with appropriate parameters and LayerZero options
    }

    async _estimateLayerZeroFees(targetChain, payload) {
        // Simplified fee estimation
        // In production, this would query LayerZero's fee estimation
        const baseFee = ethers.utils.parseEther('0.001');
        const perByteFee = ethers.utils.parseEther('0.000001');
        const payloadSize = ethers.utils.hexDataLength(
            ethers.utils.defaultAbiCoder.encode(['bytes'], [payload])
        );

        return baseFee.add(perByteFee.mul(payloadSize));
    }

    _startSubscriptionPayments(subscription) {
        const intervalId = setInterval(async () => {
            if (Date.now() > subscription.expiresAt) {
                clearInterval(intervalId);
                subscription.status = 'expired';
                console.log(`📅 Subscription expired: ${subscription.id}`);
                return;
            }

            try {
                const service = this.services.get(subscription.serviceId);
                await this.executePayment(
                    subscription.channelId,
                    service.pricePerCall
                );
                
                subscription.nextPayment = Date.now() + subscription.interval * 1000;
                console.log(`📅 Subscription payment executed: ${subscription.id}`);
            } catch (error) {
                console.error(`❌ Subscription payment failed: ${error.message}`);
                subscription.status = 'failed';
                clearInterval(intervalId);
            }
        }, subscription.interval * 1000);
    }

    async _registerServiceOnChain(service) {
        // This would interact with the X402PaymentOrchestrator contract
        console.log('📝 Registering service on-chain...');
    }

    async _createLocalChannel(channel) {
        console.log('📝 Creating local payment channel...');
    }

    async _createCrossChainChannel(channel) {
        console.log('🌉 Creating cross-chain payment channel...');
    }

    async _settleLocalChannel(channel, proof) {
        console.log('📝 Settling local channel...');
    }

    async _settleCrossChainChannel(channel, proof) {
        console.log('🌉 Settling cross-chain channel...');
    }
}

module.exports = X402PYUSDGateway;