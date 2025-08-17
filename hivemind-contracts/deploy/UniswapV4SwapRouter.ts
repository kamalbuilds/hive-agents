import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'

const deployUniswapV4SwapRouter: DeployFunction = async (hre) => {
    const { deployments, getNamedAccounts } = hre
    const { deploy, get } = deployments
    const { deployer } = await getNamedAccounts()

    console.log(`\n========================================`)
    console.log(`Deploying Uniswap V4 Swap Router`)
    console.log(`========================================`)
    console.log(`Network: ${hre.network.name}`)
    console.log(`Deployer: ${deployer}`)

    // Deploy UniswapV4SwapRouter
    const uniswapV4SwapRouter = await deploy('UniswapV4SwapRouter', {
        from: deployer,
        args: [deployer], // Pass deployer as owner
        log: true,
        waitConfirmations: 1,
        gasPrice: ethers.utils.parseUnits('20', 'gwei'),
        gasLimit: 2000000
    })

    console.log(`✅ UniswapV4SwapRouter deployed at: ${uniswapV4SwapRouter.address}`)

    // Configure the router
    const router = await ethers.getContractAt('UniswapV4SwapRouter', uniswapV4SwapRouter.address)
    
    console.log('\nConfiguring Uniswap V4 Router...')
    
    // Get MockPYUSDV2 and configure pool
    try {
        const mockPYUSDV2 = await get('MockPYUSDV2')
        
        // Configure PYUSD/USDC pool (for testing)
        // In production, USDC address would be the actual USDC contract
        const mockUSDC = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' // Sepolia USDC
        
        console.log('Configuring PYUSD/USDC pool...')
        const tx = await router.configurePool(
            mockPYUSDV2.address,
            mockUSDC,
            3000, // 0.3% fee tier
            60,   // tick spacing
            ethers.constants.AddressZero, // no hooks for now
            {
                gasPrice: ethers.utils.parseUnits('20', 'gwei')
            }
        )
        await tx.wait()
        console.log('✅ PYUSD/USDC pool configured')
        
        // Update TokenSwapComposer with the new router
        try {
            const tokenSwapComposer = await get('TokenSwapComposer')
            const composer = await ethers.getContractAt('TokenSwapComposer', tokenSwapComposer.address)
            
            console.log('Updating TokenSwapComposer with Uniswap V4 router...')
            const tx2 = await composer.setUniswapV4Router(uniswapV4SwapRouter.address, {
                gasPrice: ethers.utils.parseUnits('20', 'gwei')
            })
            await tx2.wait()
            console.log('✅ TokenSwapComposer updated')
            
            // Add USDC as supported token with Uniswap V4 router
            console.log('Adding USDC as supported token...')
            const tx3 = await composer.addSupportedToken(mockUSDC, uniswapV4SwapRouter.address, {
                gasPrice: ethers.utils.parseUnits('20', 'gwei')
            })
            await tx3.wait()
            console.log('✅ USDC added as supported token')
            
        } catch (error) {
            console.log('⚠️  Could not update TokenSwapComposer (may not be deployed)')
        }
        
    } catch (error) {
        console.log('⚠️  Could not configure pools (MockPYUSDV2 may not be deployed)')
    }

    console.log('\n✅ Uniswap V4 Swap Router deployment complete!')
    
    return uniswapV4SwapRouter
}

deployUniswapV4SwapRouter.tags = ['UniswapV4SwapRouter']
deployUniswapV4SwapRouter.dependencies = []

export default deployUniswapV4SwapRouter