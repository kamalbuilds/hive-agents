import { ethers } from 'hardhat'

async function main() {
    const [deployer] = await ethers.getSigners()
    const balance = await deployer.getBalance()
    
    console.log('=================================')
    console.log('Wallet Information:')
    console.log('=================================')
    console.log('Address:', deployer.address)
    console.log('Balance:', ethers.utils.formatEther(balance), 'ETH')
    console.log('=================================')
    
    if (balance.eq(0)) {
        console.log('\n⚠️  WALLET NEEDS FUNDING!')
        console.log('Please send Sepolia ETH to:', deployer.address)
        console.log('\nYou can get Sepolia ETH from:')
        console.log('- https://sepoliafaucet.com')
        console.log('- https://faucet.sepolia.dev')
        console.log('- https://www.alchemy.com/faucets/ethereum-sepolia')
    } else {
        console.log('\n✅ Wallet has funds and is ready for deployment!')
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })