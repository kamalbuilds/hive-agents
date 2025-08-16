import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

// PYUSD has 6 decimals like USDC
const PYUSD_DECIMALS = 6;

// Contract ABIs
const PYUSD_ABI = [
    'function balanceOf(address owner) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function decimals() view returns (uint8)'
];

const ORCHESTRATOR_ABI = [
    'function initiatePayment(address recipient, uint256 amount, uint32 dstEid, bytes32 serviceId, bytes metadata, bytes options) payable returns (bytes32)',
    'function registerServiceAccount(address account)',
    'function getPayment(bytes32 paymentId) view returns (tuple(address payer, address recipient, uint256 amount, uint32 sourceChainId, uint32 destinationChainId, uint256 timestamp, uint8 status, bytes32 serviceId, bytes metadata))',
    'function getChainBalance(address account, uint32 chainId) view returns (uint256)',
    'function serviceAccounts(address) view returns (uint256 balance, uint256 totalSpent, uint256 totalReceived, bool isActive)'
];

// Chain configurations
const CHAIN_CONFIGS: Record<string, any> = {
    'base-sepolia': {
        rpc: process.env.BASE_SEPOLIA_RPC || 'https://sepolia.base.org',
        chainId: 84532,
        lzEndpointId: 40245,
        pyusdAddress: process.env.PYUSD_ADDRESS_BASE || '0x0000000000000000000000000000000000000000',
        orchestratorAddress: process.env.ORCHESTRATOR_ADDRESS_BASE || '0x0000000000000000000000000000000000000000'
    },
    'arbitrum-sepolia': {
        rpc: process.env.ARB_SEPOLIA_RPC || 'https://sepolia-rollup.arbitrum.io/rpc',
        chainId: 421614,
        lzEndpointId: 40231,
        pyusdAddress: process.env.PYUSD_ADDRESS_ARB || '0x0000000000000000000000000000000000000000',
        orchestratorAddress: process.env.ORCHESTRATOR_ADDRESS_ARB || '0x0000000000000000000000000000000000000000'
    },
    'ethereum': {
        rpc: process.env.ETHEREUM_RPC || 'https://eth.llamarpc.com',
        chainId: 1,
        lzEndpointId: 30101,
        pyusdAddress: '0x6c3ea9036406852006290770bedfcaba0e23a0e8', // Real PYUSD on Ethereum
        orchestratorAddress: process.env.ORCHESTRATOR_ADDRESS_ETH || '0x0000000000000000000000000000000000000000'
    }
};

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, params } = body;

        switch (action) {
            case 'initiate-payment':
                return await initiatePayment(params);
            
            case 'check-balance':
                return await checkPYUSDBalance(params);
            
            case 'approve-spending':
                return await approvePYUSDSpending(params);
            
            case 'get-payment-status':
                return await getPaymentStatus(params);
            
            case 'register-service':
                return await registerService(params);
            
            case 'get-account-info':
                return await getAccountInfo(params);
            
            case 'estimate-fees':
                return await estimateFees(params);
            
            default:
                return NextResponse.json(
                    { error: 'Invalid action' },
                    { status: 400 }
                );
        }
    } catch (error: any) {
        console.error('X402 PYUSD Payment Error:', error);
        return NextResponse.json(
            { error: error.message || 'Payment processing failed' },
            { status: 500 }
        );
    }
}

async function initiatePayment(params: any) {
    const {
        sourceChain = 'base-sepolia',
        destinationChain = 'base-sepolia',
        recipient,
        amount,
        serviceId,
        metadata = '0x'
    } = params;

    const sourceConfig = CHAIN_CONFIGS[sourceChain];
    const destConfig = CHAIN_CONFIGS[destinationChain];

    if (!sourceConfig || !destConfig) {
        throw new Error('Invalid chain configuration');
    }

    // Convert amount to PYUSD units (6 decimals)
    const amountInUnits = ethers.utils.parseUnits(amount.toString(), PYUSD_DECIMALS);

    // Generate service ID if not provided
    const actualServiceId = serviceId || ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes(`service-${Date.now()}`)
    );

    // Estimate LayerZero fees for cross-chain payment
    let lzFee = ethers.BigNumber.from(0);
    if (sourceChain !== destinationChain) {
        lzFee = ethers.utils.parseEther('0.001'); // Simplified fee estimation
    }

    // Build LayerZero options (simplified)
    const options = '0x00030100110100000000000000000000000000030d40'; // Standard options

    // Prepare transaction data
    const provider = new ethers.providers.JsonRpcProvider(sourceConfig.rpc);
    const orchestrator = new ethers.Contract(
        sourceConfig.orchestratorAddress,
        ORCHESTRATOR_ABI,
        provider
    );

    // Encode the transaction
    const txData = orchestrator.interface.encodeFunctionData('initiatePayment', [
        recipient,
        amountInUnits,
        destConfig.lzEndpointId,
        actualServiceId,
        metadata,
        options
    ]);

    return NextResponse.json({
        success: true,
        transaction: {
            to: sourceConfig.orchestratorAddress,
            data: txData,
            value: lzFee.toHexString(),
            chainId: sourceConfig.chainId
        },
        payment: {
            sourceChain,
            destinationChain,
            recipient,
            amount: amount.toString(),
            amountInUnits: amountInUnits.toString(),
            serviceId: actualServiceId,
            lzFee: ethers.utils.formatEther(lzFee),
            estimatedGas: '200000'
        }
    });
}

async function checkPYUSDBalance(params: any) {
    const { address, chain = 'base-sepolia' } = params;
    
    const config = CHAIN_CONFIGS[chain];
    if (!config || config.pyusdAddress === '0x0000000000000000000000000000000000000000') {
        return NextResponse.json({
            success: false,
            balance: '0',
            message: 'PYUSD not deployed on this chain'
        });
    }

    const provider = new ethers.providers.JsonRpcProvider(config.rpc);
    const pyusd = new ethers.Contract(config.pyusdAddress, PYUSD_ABI, provider);

    const balance = await pyusd.balanceOf(address);
    const decimals = await pyusd.decimals();

    return NextResponse.json({
        success: true,
        balance: ethers.utils.formatUnits(balance, decimals),
        balanceRaw: balance.toString(),
        decimals,
        chain,
        tokenAddress: config.pyusdAddress
    });
}

async function approvePYUSDSpending(params: any) {
    const { chain = 'base-sepolia', amount, spender } = params;
    
    const config = CHAIN_CONFIGS[chain];
    if (!config) {
        throw new Error('Invalid chain configuration');
    }

    const amountInUnits = ethers.utils.parseUnits(amount.toString(), PYUSD_DECIMALS);
    const provider = new ethers.providers.JsonRpcProvider(config.rpc);
    const pyusd = new ethers.Contract(config.pyusdAddress, PYUSD_ABI, provider);

    const txData = pyusd.interface.encodeFunctionData('approve', [
        spender || config.orchestratorAddress,
        amountInUnits
    ]);

    return NextResponse.json({
        success: true,
        transaction: {
            to: config.pyusdAddress,
            data: txData,
            chainId: config.chainId
        },
        approval: {
            token: 'PYUSD',
            spender: spender || config.orchestratorAddress,
            amount: amount.toString(),
            amountInUnits: amountInUnits.toString()
        }
    });
}

async function getPaymentStatus(params: any) {
    const { paymentId, chain = 'base-sepolia' } = params;
    
    const config = CHAIN_CONFIGS[chain];
    if (!config) {
        throw new Error('Invalid chain configuration');
    }

    const provider = new ethers.providers.JsonRpcProvider(config.rpc);
    const orchestrator = new ethers.Contract(
        config.orchestratorAddress,
        ORCHESTRATOR_ABI,
        provider
    );

    try {
        const payment = await orchestrator.getPayment(paymentId);
        
        const statusMap = ['Pending', 'Processing', 'Completed', 'Failed', 'Refunded'];
        
        return NextResponse.json({
            success: true,
            payment: {
                id: paymentId,
                payer: payment.payer,
                recipient: payment.recipient,
                amount: ethers.utils.formatUnits(payment.amount, PYUSD_DECIMALS),
                sourceChainId: payment.sourceChainId.toString(),
                destinationChainId: payment.destinationChainId.toString(),
                timestamp: payment.timestamp.toString(),
                status: statusMap[payment.status] || 'Unknown',
                serviceId: payment.serviceId,
                metadata: payment.metadata
            }
        });
    } catch (error) {
        return NextResponse.json({
            success: false,
            message: 'Payment not found',
            paymentId
        });
    }
}

async function registerService(params: any) {
    const { 
        name,
        description,
        pricePerCall,
        endpoint,
        capabilities = [],
        chain = 'base-sepolia'
    } = params;

    // Generate service ID
    const serviceId = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes(`${name}-${Date.now()}`)
    );

    // Store service metadata (in production, this would go to a database)
    const serviceData = {
        id: serviceId,
        name,
        description,
        pricePerCall: ethers.utils.parseUnits(pricePerCall.toString(), PYUSD_DECIMALS).toString(),
        endpoint,
        capabilities,
        registeredAt: Date.now(),
        chain,
        status: 'active'
    };

    return NextResponse.json({
        success: true,
        service: serviceData,
        message: 'Service registered successfully'
    });
}

async function getAccountInfo(params: any) {
    const { address, chain = 'base-sepolia' } = params;
    
    const config = CHAIN_CONFIGS[chain];
    if (!config) {
        throw new Error('Invalid chain configuration');
    }

    const provider = new ethers.providers.JsonRpcProvider(config.rpc);
    const orchestrator = new ethers.Contract(
        config.orchestratorAddress,
        ORCHESTRATOR_ABI,
        provider
    );

    try {
        const account = await orchestrator.serviceAccounts(address);
        const chainBalance = await orchestrator.getChainBalance(
            address,
            config.lzEndpointId
        );

        return NextResponse.json({
            success: true,
            account: {
                address,
                balance: ethers.utils.formatUnits(account.balance, PYUSD_DECIMALS),
                totalSpent: ethers.utils.formatUnits(account.totalSpent, PYUSD_DECIMALS),
                totalReceived: ethers.utils.formatUnits(account.totalReceived, PYUSD_DECIMALS),
                isActive: account.isActive,
                chainBalance: ethers.utils.formatUnits(chainBalance, PYUSD_DECIMALS),
                chain
            }
        });
    } catch (error) {
        return NextResponse.json({
            success: false,
            message: 'Account not found',
            address
        });
    }
}

async function estimateFees(params: any) {
    const {
        sourceChain = 'base-sepolia',
        destinationChain = 'base-sepolia',
        amount
    } = params;

    const amountInUnits = ethers.utils.parseUnits(amount.toString(), PYUSD_DECIMALS);
    
    // Estimate fees
    let lzFee = ethers.BigNumber.from(0);
    let gasEstimate = ethers.BigNumber.from('150000'); // Base gas for local transfer
    
    if (sourceChain !== destinationChain) {
        lzFee = ethers.utils.parseEther('0.001'); // Simplified LayerZero fee
        gasEstimate = ethers.BigNumber.from('300000'); // Higher gas for cross-chain
    }

    const gasPrice = ethers.utils.parseUnits('20', 'gwei'); // Estimated gas price
    const estimatedGasCost = gasEstimate.mul(gasPrice);

    return NextResponse.json({
        success: true,
        fees: {
            layerZeroFee: ethers.utils.formatEther(lzFee),
            estimatedGas: gasEstimate.toString(),
            estimatedGasCost: ethers.utils.formatEther(estimatedGasCost),
            totalEstimatedCost: ethers.utils.formatEther(lzFee.add(estimatedGasCost)),
            paymentAmount: ethers.utils.formatUnits(amountInUnits, PYUSD_DECIMALS),
            sourceChain,
            destinationChain
        }
    });
}

export async function GET(request: NextRequest) {
    return NextResponse.json({
        service: 'X402 PYUSD Payment Gateway',
        version: '1.0.0',
        endpoints: {
            'POST /api/x402/pyusd/payment': {
                actions: [
                    'initiate-payment',
                    'check-balance',
                    'approve-spending',
                    'get-payment-status',
                    'register-service',
                    'get-account-info',
                    'estimate-fees'
                ]
            }
        },
        supportedChains: Object.keys(CHAIN_CONFIGS),
        pyusdDecimals: PYUSD_DECIMALS
    });
}