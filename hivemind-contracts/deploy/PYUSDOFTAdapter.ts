import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'

const deployPYUSDOFTAdapter: DeployFunction = async (hre) => {
    const { deployments, getNamedAccounts } = hre
    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    console.log(`Network: ${hre.network.name}`)
    console.log(`Deployer: ${deployer}`)

    // Deploy Mock PYUSD for testing
    const mockPYUSD = await deploy('MockPYUSD', {
        from: deployer,
        contract: 'MockPYUSD',
        args: [],
        log: true,
        waitConfirmations: 1,
    })

    console.log(`Mock PYUSD deployed at: ${mockPYUSD.address}`)

    // Get LayerZero endpoint for this network
    const endpointAddress = hre.network.config.eid === 10161 
        ? '0x6EDCE65403992e310A62460808c4b910D972f10f' // Sepolia endpoint
        : '0x0000000000000000000000000000000000000000'

    // Deploy PYUSDOFTAdapter
    const pyusdOFTAdapter = await deploy('PYUSDOFTAdapter', {
        from: deployer,
        args: [
            mockPYUSD.address,
            endpointAddress,
            deployer
        ],
        log: true,
        waitConfirmations: 1,
    })

    console.log(`PYUSDOFTAdapter deployed at: ${pyusdOFTAdapter.address}`)
}

deployPYUSDOFTAdapter.tags = ['PYUSDOFTAdapter']
deployPYUSDOFTAdapter.dependencies = []

export default deployPYUSDOFTAdapter