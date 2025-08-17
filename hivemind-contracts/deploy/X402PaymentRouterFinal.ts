import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'

const deployX402PaymentRouterFinal: DeployFunction = async (hre) => {
    const { deployments, getNamedAccounts } = hre
    const { deploy, get } = deployments
    const { deployer } = await getNamedAccounts()

    console.log(`\n========================================`)
    console.log(`Deploying X402 Payment Router (Final)`)
    console.log(`========================================`)
    console.log(`Network: ${hre.network.name}`)
    console.log(`Deployer: ${deployer}`)

    // Get deployed MockPYUSDV2
    let pyusdAddress: string
    try {
        const mockPYUSDV2 = await get('MockPYUSDV2')
        pyusdAddress = mockPYUSDV2.address
        console.log(`Using MockPYUSDV2 at: ${pyusdAddress}`)
    } catch {
        console.log('MockPYUSDV2 not found, using existing MockPYUSD')
        pyusdAddress = '0x8f8863423c13844c042Ef85708607D094a05B2bE'
    }

    // Get LayerZero endpoint
    const endpointAddress = hre.network.config.eid === 10161 
        ? '0x6EDCE65403992e310A62460808c4b910D972f10f' // Sepolia endpoint
        : '0x6EDCE65403992e310A62460808c4b910D972f10f' // Default to Sepolia

    // Deploy X402PaymentRouter
    const x402PaymentRouter = await deploy('X402PaymentRouter', {
        from: deployer,
        args: [
            pyusdAddress,
            endpointAddress,
            deployer
        ],
        log: true,
        waitConfirmations: 2,
        gasPrice: ethers.utils.parseUnits('20', 'gwei'),
        gasLimit: 3000000
    })

    console.log(`✅ X402PaymentRouter deployed at: ${x402PaymentRouter.address}`)

    // Get other deployed contracts
    try {
        const tokenSwapComposer = await get('TokenSwapComposer')
        const pyusdOFTAdapter = await get('PYUSDOFTAdapter')

        const router = await ethers.getContractAt('X402PaymentRouter', x402PaymentRouter.address)
        
        console.log('\nConfiguring X402PaymentRouter...')
        
        console.log('Setting TokenSwapComposer...')
        const tx1 = await router.setTokenSwapComposer(tokenSwapComposer.address, {
            gasPrice: ethers.utils.parseUnits('20', 'gwei')
        })
        await tx1.wait()
        console.log('✅ TokenSwapComposer set')
        
        console.log('Setting PYUSDOFTAdapter...')
        const tx2 = await router.setPYUSDOFTAdapter(pyusdOFTAdapter.address, {
            gasPrice: ethers.utils.parseUnits('20', 'gwei')
        })
        await tx2.wait()
        console.log('✅ PYUSDOFTAdapter set')
        
        console.log('\n✅ X402PaymentRouter fully configured!')
    } catch (error) {
        console.log('⚠️  Could not configure router dependencies (they may not be deployed)')
    }

    return x402PaymentRouter
}

deployX402PaymentRouterFinal.tags = ['X402PaymentRouterFinal']
deployX402PaymentRouterFinal.dependencies = []

export default deployX402PaymentRouterFinal