const { fetchQuote, swapFromEvm, createSwapFromSolanaInstructions, getSwapFromEvmTxPayload } = require('./mayanfinance')
const { SolTokenList, getSwapAmountForSol, getSwapAmountForEvm, sleep, EVMContract, conn, ethProvider, bscProvider, saveTransaction, arbProvider } = require('./constants')
const { Transaction, sendAndConfirmTransaction } = require('@solana/web3.js')

const MayanRoutes = [
    [
        {fromChain: "solana", fromToken: "SOL", toChain: "arbitrum", toToken: "ETH"},
        {fromChain: "solana", fromToken: "USDT", toChain: "arbitrum", toToken: "ETH"},
        {fromChain: "solana", fromToken: "USDC", toChain: "arbitrum", toToken: "ETH"},
    ],
    [
        {fromChain: "arbitrum", fromToken: "ETH", toChain: "solana", toToken: "SOL"},
        {fromChain: "arbitrum", fromToken: "ETH", toChain: "solana", toToken: "USDT"},
        {fromChain: "arbitrum", fromToken: "ETH", toChain: "solana", toToken: "USDC"},
    ]
    // [
    //     {fromChain: "bsc", fromToken: "BNB", toChain: "solana", toToken: "SOL"},
    //     {fromChain: "bsc", fromToken: "BNB", toChain: "solana", toToken: "USDC"},
    //     {fromChain: "bsc", fromToken: "BNB", toChain: "solana", toToken: "USDT"},
    // ]
]

const bridgeInMayan = async(solWallet, ethWallet, side, route) => {
    const rand = new Date().getTime()
    if(side==0){
        const selectedRoute = MayanRoutes[0][route]//MayanRoutes[0][rand % MayanRoutes[0].length]
        const swapAmount = await getSwapAmountForSol(solWallet.publicKey, selectedRoute.fromToken)
        if(swapAmount==0) return false;
        console.log("Mayan Bridge -> ",solWallet.publicKey.toBase58()+"  :  "+swapAmount+selectedRoute.fromToken+" -> "+selectedRoute.toToken)
        const quote = await fetchQuote({
            amount: swapAmount,
            fromToken: SolTokenList.find((item)=>{return item.name===selectedRoute.fromToken}).mint,
            fromChain: "solana",
            toToken: EVMContract,
            toChain: selectedRoute.toChain,
            slippage: 0.05,
            gasDrop: 0,
            referrer: null
        })
        const {instructions, signers} = await createSwapFromSolanaInstructions(quote, solWallet.publicKey.toString(), ethWallet.address, 100, null, conn);
        signers.splice(0,0,solWallet)
        const tx = new Transaction()
        tx.add(...instructions)
        tx.recentBlockhash = (await conn.getLatestBlockhash()).blockhash
        console.log("Bridging...")
        let txId = await sendAndConfirmTransaction(conn, tx, signers, {maxRetries: 5, skipPreflight: true})
        saveTransaction(solWallet.publicKey.toBase58(), "Mayan Bridge", selectedRoute.fromToken+"/"+selectedRoute.fromChain, swapAmount, selectedRoute.toToken+"/"+selectedRoute.toChain, txId)
        console.log(txId)
    }else{
        const selectedRoute = MayanRoutes[1][route]//MayanRoutes[1][rand % MayanRoutes[1].length]
        const swapAmount = (await getSwapAmountForEvm(ethWallet.address, selectedRoute.fromChain))
        if(swapAmount==0) return false;
        let provider = selectedRoute.fromChain==="ethereum" ? ethProvider : selectedRoute.fromChain==="bsc" ? bscProvider : arbProvider
        const wallet = ethWallet.connect(provider)
        const chainId = await wallet.getChainId()
        const gasPrice = (await provider.getGasPrice())
        const tempQuote = await fetchQuote({
            amount: swapAmount/(10**18),
            fromToken: EVMContract,
            fromChain: selectedRoute.fromChain,
            toToken: SolTokenList.find((item)=>{return item.name===selectedRoute.toToken}).mint,
            toChain: "solana",
            slippage: 0.05,
            gasDrop: 0,
            referrer: null
        })
        const simulateTx = await getSwapFromEvmTxPayload(tempQuote, solWallet.publicKey.toBase58(), 100, null, wallet.address, chainId, provider)
        const gasLimit = (await provider.estimateGas(simulateTx))
        const gas = gasLimit.mul(gasPrice).mul(3).div(2)
        const quote = await fetchQuote({
            amount: (swapAmount - gas)/(10**18),
            fromToken: EVMContract,
            fromChain: selectedRoute.fromChain,
            toToken: SolTokenList.find((item)=>{return item.name===selectedRoute.toToken}).mint,
            toChain: "solana",
            slippage: 0.05,
            gasDrop: 0,
            referrer: null
        })
        console.log("Mayan Bridge -> ",ethWallet.address+"  :  "+((swapAmount - gas)/(10**18))+selectedRoute.fromToken+"/"+selectedRoute.fromChain+" -> "+selectedRoute.toToken)
        console.log("Bridging...")
        let txId = await swapFromEvm(quote, solWallet.publicKey.toBase58(), 100, null, provider, wallet)
        saveTransaction(solWallet.publicKey.toBase58(), "Mayan Bridge", selectedRoute.fromToken+"/"+selectedRoute.fromChain, swapAmount/(10**18), selectedRoute.toToken+"/"+selectedRoute.toChain, txId.hash)
        console.log(txId.hash)
    }
    const duration = (rand % 50) + 100 // 10s ~ 60s
    await sleep(duration)
    return true;
}

module.exports = {
    bridgeInMayan
}