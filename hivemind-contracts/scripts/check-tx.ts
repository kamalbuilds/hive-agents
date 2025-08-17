import { ethers } from 'hardhat'

async function main() {
    const txHash = '0x90a6b3b6a1c1654ed0f3203a951888c72842f9590997b9b3d44e89c0a65b5abc'
    
    console.log('Checking transaction:', txHash)
    
    try {
        const tx = await ethers.provider.getTransaction(txHash)
        const receipt = await ethers.provider.getTransactionReceipt(txHash)
        
        if (receipt) {
            console.log('Transaction Status:', receipt.status === 1 ? '✅ Success' : '❌ Failed')
            if (receipt.contractAddress) {
                console.log('Contract Deployed at:', receipt.contractAddress)
            }
            console.log('Gas Used:', receipt.gasUsed.toString())
        } else if (tx) {
            console.log('Transaction is pending...')
        } else {
            console.log('Transaction not found')
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