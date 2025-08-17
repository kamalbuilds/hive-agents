import { ethers } from 'hardhat'
import fs from 'fs'
import path from 'path'

async function main() {
    const network = await ethers.provider.getNetwork()
    const [deployer] = await ethers.getSigners()
    
    console.log('=========================================')
    console.log('🚀 LayerZero Payment System Deployment')
    console.log('=========================================')
    console.log('Network:', network.name, `(chainId: ${network.chainId})`)
    console.log('Deployer:', deployer.address)
    console.log('=========================================\n')
    
    // Check deployment files
    const deploymentPath = path.join(__dirname, `../deployments/${network.name}`)
    
    try {
        // Read deployment files
        const files = fs.readdirSync(deploymentPath)
        const deployments: any = {}
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                const name = file.replace('.json', '')
                const data = JSON.parse(fs.readFileSync(path.join(deploymentPath, file), 'utf8'))
                deployments[name] = data.address
            }
        }
        
        console.log('✅ Deployed Contracts:')
        console.log('----------------------')
        
        if (deployments.MockPYUSD) {
            console.log('📝 Mock PYUSD:', deployments.MockPYUSD)
            const code = await ethers.provider.getCode(deployments.MockPYUSD)
            console.log('   Status:', code !== '0x' ? '✅ Verified' : '❌ Not deployed')
        }
        
        if (deployments.PYUSDOFTAdapter) {
            console.log('\n🔗 PYUSD OFT Adapter:', deployments.PYUSDOFTAdapter)
            const code = await ethers.provider.getCode(deployments.PYUSDOFTAdapter)
            console.log('   Status:', code !== '0x' ? '✅ Verified' : '❌ Not deployed')
            console.log('   Features: Cross-chain PYUSD transfers via LayerZero V2')
        }
        
        if (deployments.TokenSwapComposer) {
            console.log('\n💱 Token Swap Composer:', deployments.TokenSwapComposer)
            const code = await ethers.provider.getCode(deployments.TokenSwapComposer)
            console.log('   Status:', code !== '0x' ? '✅ Verified' : '❌ Not deployed')
            console.log('   Features: Automatic PYUSD to any token swaps')
        }
        
        if (deployments.X402PaymentRouter) {
            console.log('\n🚦 X402 Payment Router:', deployments.X402PaymentRouter)
            const code = await ethers.provider.getCode(deployments.X402PaymentRouter)
            console.log('   Status:', code !== '0x' ? '✅ Verified' : '❌ Not deployed')
            console.log('   Features: x402 microservice payments with cross-chain routing')
        }
        
        console.log('\n=========================================')
        console.log('📊 Deployment Summary')
        console.log('=========================================')
        console.log('Total contracts deployed:', Object.keys(deployments).length)
        console.log('\n🎯 Hackathon Qualifications:')
        console.log('✅ LayerZero Track - Omnichain payment routing')
        console.log('✅ PYUSD Track - PYUSD as primary payment token')
        console.log('✅ x402 Track - Microservice payment infrastructure')
        
        console.log('\n📋 Next Steps:')
        console.log('1. Configure cross-chain peers on other networks')
        console.log('2. Set up LayerZero DVNs and executors')
        console.log('3. Test cross-chain PYUSD transfers')
        console.log('4. Register x402 services')
        
    } catch (error) {
        console.log('❌ No deployments found for this network')
        console.log('Run: npx hardhat deploy --network', network.name)
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })