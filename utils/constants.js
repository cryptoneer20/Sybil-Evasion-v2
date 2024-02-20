const { Connection, PublicKey, LAMPORTS_PER_SOL, Transaction, sendAndConfirmTransaction } = require('@solana/web3.js')
const { getAssociatedTokenAddressSync, NATIVE_MINT, createCloseAccountInstruction } = require('@solana/spl-token');
const ethers = require('ethers')
const fs = require('fs')

require('dotenv').config()

const conn = new Connection(process.env.SOLANA_RPC_NODE_URL, {commitment:"finalized"})
const ethProvider = ethers.getDefaultProvider(process.env.ETH_RPC_NODE_URL)
const bscProvider = ethers.getDefaultProvider(process.env.BSC_RPC_NODE_URL)
const arbProvider = ethers.getDefaultProvider(process.env.ARB_RPC_NODE_URL)

const SolTokenList = [
    {name: 'SOL', mint: 'So11111111111111111111111111111111111111112', decimals: 9},
    {name: 'USDC', mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6},
    {name: 'USDT', mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', decimals: 6},
]

const EVMContract = "0x0000000000000000000000000000000000000000"

const sleep = (ms) => {return new Promise(resolve => setTimeout(resolve, ms * 1000))}

const saveTransaction = (solWallet, market, tokenIn, inputAmount, tokenOut, tx) => {
    try{
        const logFileName = `./details/${solWallet}.csv`
        let line = `${market},${tokenIn},${inputAmount},${tokenOut},${tx}\r\n`
        fs.appendFileSync(logFileName, line)
    }catch(err){
    }
}

const unwrapSol = async(wallet) => {
    try{
        let solAccount = getAssociatedTokenAddressSync(NATIVE_MINT, wallet.publicKey)
        if(await conn.getAccountInfo(solAccount)==null) return;
        let tx = new Transaction()
        tx.add(createCloseAccountInstruction(solAccount, wallet.publicKey, wallet.publicKey))
        await sendAndConfirmTransaction(conn, tx, [wallet])
    }catch(err){
    }
}

const getTokenAmount = async(wallet, token) => {
    try{
        if(token=='SOL'){
            return (await conn.getBalance(wallet) / LAMPORTS_PER_SOL)
        }else{
            let tokenMint = new PublicKey(SolTokenList.find((item)=>{return item.name==token}).mint)
            let tokenAccount = getAssociatedTokenAddressSync(tokenMint, wallet)
            if(await conn.getAccountInfo(tokenAccount) != null){
                return Number((await conn.getTokenAccountBalance(tokenAccount)).value.uiAmount)
            }
        }
        return 0
    }catch(err){
        return 0
    }
}

const getSwapAmountForSol = async(wallet, token) => {
    try{
        let balance = await getTokenAmount(wallet, token)
        if(token=='SOL'){
            const ratio = ((new Date().getTime()) % 100) / 500 + 0.6
            return Math.floor(balance*ratio * 100) / 100
        }else
            return balance
    }catch(err){
        console.log(err)
        return 0
    }
}

const getSwapAmountForEvm = async(wallet, chain) => {
    let coinAmount;
    if(chain==='ethereum'){
        coinAmount = await ethProvider.getBalance(wallet)
    }else if(chain==='bsc'){
        coinAmount = await bscProvider.getBalance(wallet)
    }else if(chain==='arbitrum'){
        coinAmount = await arbProvider.getBalance(wallet)
    }
    return Number(coinAmount)
}

module.exports = {
    conn, ethProvider, bscProvider, arbProvider,
    SolTokenList, EVMContract,
    sleep, saveTransaction, unwrapSol,
    getSwapAmountForSol, getSwapAmountForEvm,
}

