import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'

const deployMockPYUSDV2: DeployFunction = async (hre) => {
    const { deployments, getNamedAccounts } = hre
    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    console.log(`\n========================================`)
    console.log(`Deploying MockPYUSDV2 with Minter Role`)
    console.log(`========================================`)
    console.log(`Network: ${hre.network.name}`)
    console.log(`Deployer: ${deployer}`)

    // Deploy MockPYUSDV2
    const mockPYUSDV2 = await deploy('MockPYUSDV2', {
        from: deployer,
        args: [],
        log: true,
        waitConfirmations: 1,
        gasPrice: ethers.utils.parseUnits('20', 'gwei')
    })

    console.log(`✅ MockPYUSDV2 deployed at: ${mockPYUSDV2.address}`)
    
    // Verify minter role
    const token = await ethers.getContractAt('MockPYUSDV2', mockPYUSDV2.address)
    const isMinter = await token.isMinter(deployer)
    console.log(`Deployer is minter: ${isMinter ? '✅ Yes' : '❌ No'}`)
    
    // Check initial balance
    const balance = await token.balanceOf(deployer)
    console.log(`Initial balance: ${ethers.utils.formatUnits(balance, 6)} PYUSD`)
    
    return mockPYUSDV2
}

deployMockPYUSDV2.tags = ['MockPYUSDV2']
deployMockPYUSDV2.dependencies = []

export default deployMockPYUSDV2