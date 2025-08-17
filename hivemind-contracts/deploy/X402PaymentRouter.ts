import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'

const deployX402PaymentRouter: DeployFunction = async (hre) => {
    const { deployments, getNamedAccounts } = hre
    const { deploy, get } = deployments
    const { deployer } = await getNamedAccounts()

    console.log(`Network: ${hre.network.name}`)
    console.log(`Deployer: ${deployer}`)

    // Get deployed PYUSD
    const mockPYUSD = await get('MockPYUSD')

    // Get LayerZero endpoint for this network
    const endpointAddress = hre.network.config.eid === 10161 
        ? '0x6EDCE65403992e310A62460808c4b910D972f10f' // Sepolia endpoint
        : '0x0000000000000000000000000000000000000000'

    // Deploy X402PaymentRouter
    const x402PaymentRouter = await deploy('X402PaymentRouter', {
        from: deployer,
        args: [
            mockPYUSD.address,
            endpointAddress,
            deployer
        ],
        log: true,
        waitConfirmations: 1,
    })

    console.log(`X402PaymentRouter deployed at: ${x402PaymentRouter.address}`)

    // Set TokenSwapComposer and PYUSDOFTAdapter addresses
    const tokenSwapComposer = await get('TokenSwapComposer')
    const pyusdOFTAdapter = await get('PYUSDOFTAdapter')

    const router = await ethers.getContractAt('X402PaymentRouter', x402PaymentRouter.address)
    
    console.log('Setting TokenSwapComposer address...')
    await router.setTokenSwapComposer(tokenSwapComposer.address)
    
    console.log('Setting PYUSDOFTAdapter address...')
    await router.setPYUSDOFTAdapter(pyusdOFTAdapter.address)
    
    console.log('✅ X402PaymentRouter configured successfully!')
}

deployX402PaymentRouter.tags = ['X402PaymentRouter']
deployX402PaymentRouter.dependencies = ['PYUSDOFTAdapter', 'TokenSwapComposer']

export default deployX402PaymentRouter