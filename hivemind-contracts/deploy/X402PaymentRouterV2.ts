import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'

const deployX402PaymentRouterV2: DeployFunction = async (hre) => {
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

    // Deploy X402PaymentRouter with higher gas
    const x402PaymentRouter = await deploy('X402PaymentRouterV2', {
        contract: 'X402PaymentRouter',
        from: deployer,
        args: [
            mockPYUSD.address,
            endpointAddress,
            deployer
        ],
        log: true,
        waitConfirmations: 1,
        gasPrice: ethers.utils.parseUnits('30', 'gwei'),
        gasLimit: 3000000
    })

    console.log(`X402PaymentRouter deployed at: ${x402PaymentRouter.address}`)

    // Set TokenSwapComposer and PYUSDOFTAdapter addresses
    const tokenSwapComposer = await get('TokenSwapComposer')
    const pyusdOFTAdapter = await get('PYUSDOFTAdapter')

    const router = await ethers.getContractAt('X402PaymentRouter', x402PaymentRouter.address)
    
    console.log('Setting TokenSwapComposer address...')
    const tx1 = await router.setTokenSwapComposer(tokenSwapComposer.address, {
        gasPrice: ethers.utils.parseUnits('30', 'gwei')
    })
    await tx1.wait()
    
    console.log('Setting PYUSDOFTAdapter address...')
    const tx2 = await router.setPYUSDOFTAdapter(pyusdOFTAdapter.address, {
        gasPrice: ethers.utils.parseUnits('30', 'gwei')
    })
    await tx2.wait()
    
    console.log('✅ X402PaymentRouter configured successfully!')
}

deployX402PaymentRouterV2.tags = ['X402PaymentRouterV2']
deployX402PaymentRouterV2.dependencies = ['PYUSDOFTAdapter', 'TokenSwapComposer']

export default deployX402PaymentRouterV2