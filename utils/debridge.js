const { VersionedTransaction, SystemProgram, sendAndConfirmTransaction } = require('@solana/web3.js');
const { SolTokenList, getSwapAmountForSol, getSwapAmountForEvm, sleep, EVMContract, conn, ethProvider, bscProvider, arbProvider, saveTransaction } = require('./constants');
const fetch = require('node-fetch');

const DebridgeChainId = {
    ethereum: 1, bsc: 56, solana: 7565164, arbitrum: 42161
}

const DebridgeRoutes = [
    [
        {fromChain: "solana", fromToken: "SOL", toChain: "arbitrum", toToken: "ETH"},
        {fromChain: "solana", fromToken: "USDT", toChain: "arbitrum", toToken: "ETH"},
        {fromChain: "solana", fromToken: "USDC", toChain: "arbitrum", toToken: "ETH"},
    ],
    [
        {fromChain: "arbitrum", fromToken: "ETH", toChain: "solana", toToken: "SOL"},
        {fromChain: "arbitrum", fromToken: "ETH", toChain: "solana", toToken: "USDT"},
        {fromChain: "arbitrum", fromToken: "ETH", toChain: "solana", toToken: "USDC"},
    ],
    // [
    //     {fromChain: "bsc", fromToken: "BNB", toChain: "solana", toToken: "SOL"},
    //     {fromChain: "bsc", fromToken: "BNB", toChain: "solana", toToken: "USDC"},
    //     {fromChain: "bsc", fromToken: "BNB", toChain: "solana", toToken: "USDT"},
    // ]
]

const bridgeInDebridge = async(solWallet, ethWallet, side, route) => {
    const rand = new Date().getTime()
    if(side==0){
        const selectedRoute = DebridgeRoutes[0][route]//DebridgeRoutes[0][rand % DebridgeRoutes[0].length]
        const swapAmount = await getSwapAmountForSol(solWallet.publicKey, selectedRoute.fromToken)
        if(swapAmount==0) return false;
        console.log("Debridge -> ",solWallet.publicKey.toBase58()+"  :  "+swapAmount+selectedRoute.fromToken+" -> "+selectedRoute.toToken)
        const amount = swapAmount*(10 ** (selectedRoute.fromToken=="SOL" ? 9 : 6))
        const dataQuote = await (await fetch('https://api.dln.trade/v1.0/dln/order/quote?'+new URLSearchParams({
            srcChainId: DebridgeChainId['solana'],
            srcChainTokenIn: selectedRoute.fromToken==="SOL" ? SystemProgram.programId : SolTokenList.find((item)=> {return item.name===selectedRoute.fromToken}).mint,
            srcChainTokenInAmount: amount,
            dstChainId: DebridgeChainId[selectedRoute.toChain],
            dstChainTokenOut: EVMContract,
            prependOperatingExpense: true,
        }))).json()
        const dataRequestingOrder = await (await fetch('https://api.dln.trade/v1.0/dln/order/create-tx?'+new URLSearchParams({
            srcChainId: DebridgeChainId['solana'],
            srcChainTokenIn: selectedRoute.fromToken==="SOL" ? SystemProgram.programId : SolTokenList.find((item)=> {return item.name===selectedRoute.fromToken}).mint,
            srcChainTokenInAmount: amount,
            dstChainId: DebridgeChainId[selectedRoute.toChain],
            dstChainTokenOut: EVMContract,
            prependOperatingExpense: true,
            dstChainTokenOutAmount: dataQuote.estimation.dstChainTokenOut.amount,
            srcChainOrderAuthorityAddress: solWallet.publicKey.toBase58(),
            dstChainTokenOutRecipient: ethWallet.address,
            dstChainOrderAuthorityAddress: ethWallet.address,
        }))).json()
        if(dataRequestingOrder.errorId!=undefined && dataRequestingOrder.errorId!=null){
            throw new Error(dataRequestingOrder.errorMessage)
        }
        const tx = VersionedTransaction.deserialize(Buffer.from(dataRequestingOrder.tx.data.slice(2), 'hex'))
        const {blockhash} = await conn.getLatestBlockhash()
        tx.message.recentBlockhash = blockhash
        tx.sign([solWallet])
        console.log("Bridging...")
        let txId = await sendAndConfirmTransaction(conn, tx,{maxRetries:5, skipPreflight: true})
        saveTransaction(solWallet.publicKey.toBase58(), "Debridge", selectedRoute.fromToken+"/"+selectedRoute.fromChain, swapAmount, selectedRoute.toToken+"/"+selectedRoute.toChain, txId)
        console.log(txId)
    }else{
        const selectedRoute = DebridgeRoutes[1][route]//DebridgeRoutes[1][rand % DebridgeRoutes[1].length]
        const swapAmount = await getSwapAmountForEvm(ethWallet.address, selectedRoute.fromChain)
        if(swapAmount==0) return false;
        let provider = selectedRoute.fromChain==="ethereum" ? ethProvider : selectedRoute.fromChain==="bsc" ? bscProvider : arbProvider
        const wallet = ethWallet.connect(provider)
        const gasPrice = (await provider.getGasPrice())
        const tempDataRequestingOrder = await (await fetch('https://api.dln.trade/v1.0/dln/order/create-tx?'+new URLSearchParams({
            srcChainId: DebridgeChainId[selectedRoute.fromChain],
            srcChainTokenIn: EVMContract,
            srcChainTokenInAmount: swapAmount,
            dstChainId: DebridgeChainId['solana'],
            dstChainTokenOut: selectedRoute.toToken==="SOL" ? SystemProgram.programId : SolTokenList.find((item)=> {return item.name===selectedRoute.toToken}).mint,
            prependOperatingExpense: true,
            dstChainTokenOutAmount: 'auto',
            srcChainOrderAuthorityAddress: ethWallet.address,
            dstChainTokenOutRecipient: solWallet.publicKey.toBase58(),
            dstChainOrderAuthorityAddress: solWallet.publicKey.toBase58(),
        }))).json()
        if(tempDataRequestingOrder.errorId!=undefined && tempDataRequestingOrder.errorId!=null){
            throw new Error(tempDataRequestingOrder.errorMessage)
        }
        const gasLimit = (await provider.estimateGas(tempDataRequestingOrder.tx))
        const gas = gasPrice.mul(gasLimit).mul(4)
        console.log(gasLimit)
        console.log(Number(gas)/(10**18))
        console.log((swapAmount - Number(gas))/10**18)
        const dataQuote = await (await fetch('https://api.dln.trade/v1.0/dln/order/quote?'+new URLSearchParams({
            srcChainId: DebridgeChainId[selectedRoute.fromChain],
            srcChainTokenIn: EVMContract,
            srcChainTokenInAmount: swapAmount - Number(gas),
            dstChainId: DebridgeChainId['solana'],
            dstChainTokenOut: selectedRoute.toToken==="SOL" ? SystemProgram.programId : SolTokenList.find((item)=> {return item.name===selectedRoute.toToken}).mint,
            prependOperatingExpense: true,
        }))).json()
        console.log(dataQuote)
        const dataRequestingOrder = await (await fetch('https://api.dln.trade/v1.0/dln/order/create-tx?'+new URLSearchParams({
            srcChainId: DebridgeChainId[selectedRoute.fromChain],
            srcChainTokenIn: EVMContract,
            srcChainTokenInAmount: swapAmount - Number(gas),
            dstChainId: DebridgeChainId['solana'],
            dstChainTokenOut: selectedRoute.toToken==="SOL" ? SystemProgram.programId : SolTokenList.find((item)=> {return item.name===selectedRoute.toToken}).mint,
            prependOperatingExpense: true,
            dstChainTokenOutAmount: dataQuote.estimation.dstChainTokenOut.amount,
            srcChainOrderAuthorityAddress: ethWallet.address,
            dstChainTokenOutRecipient: solWallet.publicKey.toBase58(),
            dstChainOrderAuthorityAddress: solWallet.publicKey.toBase58(),
            enableEstimate: true,
            senderAddress: ethWallet.address
        }))).json()
        console.log("Debridge -> ",ethWallet.address+"  :  "+((swapAmount - Number(gas))/(10**18))+selectedRoute.fromToken+"/"+selectedRoute.fromChain+" -> "+selectedRoute.toToken)
        if(dataRequestingOrder.errorId!=undefined && dataRequestingOrder.errorId!=null){
            throw new Error(dataRequestingOrder.errorMessage)
        }
        console.log(dataRequestingOrder.tx)
        console.log("Bridging...")
        const txId = await wallet.sendTransaction({...dataRequestingOrder.tx, gasPrice: gasPrice})
        saveTransaction(solWallet.publicKey.toBase58(), "Debridge", selectedRoute.fromToken+"/"+selectedRoute.fromChain, (swapAmount-Number(gas))/(10**18), selectedRoute.toToken+"/"+selectedRoute.toChain, txId.hash)
        console.log(txId.hash)
    }
    const duration = (rand % 50) + 100 // 10s ~ 60s
    await sleep(duration)
    return true;
}

module.exports = {
    bridgeInDebridge
}