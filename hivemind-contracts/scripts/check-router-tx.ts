import { ethers } from 'hardhat'

async function main() {
    const txHash = '0x66ab220fadd8879442cdf42d982b2216c9204b656c4e9ff0086a3df84768a58f'
    
    console.log('Checking X402PaymentRouter deployment transaction...')
    console.log('Transaction:', txHash)
    
    try {
        const receipt = await ethers.provider.getTransactionReceipt(txHash)
        
        if (receipt) {
            console.log('Transaction Status:', receipt.status === 1 ? '✅ Success' : '❌ Failed')
            if (receipt.contractAddress) {
                console.log('X402PaymentRouter deployed at:', receipt.contractAddress)
            }
            console.log('Gas Used:', receipt.gasUsed.toString())
            console.log('Block Number:', receipt.blockNumber)
        } else {
            console.log('Transaction still pending...')
        }
    } catch (error) {
        console.error('Error checking transaction:', error)
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })