import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'

const deployTokenSwapComposer: DeployFunction = async (hre) => {
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

    // Deploy TokenSwapComposer
    const tokenSwapComposer = await deploy('TokenSwapComposer', {
        from: deployer,
        args: [
            endpointAddress,
            mockPYUSD.address,
            deployer
        ],
        log: true,
        waitConfirmations: 1,
    })

    console.log(`TokenSwapComposer deployed at: ${tokenSwapComposer.address}`)
}

deployTokenSwapComposer.tags = ['TokenSwapComposer']
deployTokenSwapComposer.dependencies = ['PYUSDOFTAdapter']

export default deployTokenSwapComposer