require('dotenv').config();

const { Keypair } = require('@solana/web3.js');
const ethers = require('ethers')
const fs = require('fs')
const bs58 = require('bs58')

const {swapInJupiter, swapInPhoenix, swapInMayan, bridgeInDebridge, bridgeInMayan, sleep, unwrapSol} = require('./utils');
const globalTunnel = require('global-tunnel-ng');
const fetch = require('node-fetch');
const proxy = require("node-global-proxy").default;

let walletList = []
let ProxyList = []

const saveWallet = (wallet) => {
    const fileName='./details/'+wallet.solWallet.publicKey.toBase58()
    fs.writeFileSync(fileName, JSON.stringify({
        ...wallet,
        solWallet: bs58.encode(wallet.solWallet.secretKey),
        ethWallet: wallet.ethWallet.privateKey
    }))
}

const loadWallet = (solWallet) => {
    try{
        const fileName='./details/'+solWallet.publicKey.toBase58()
        const rawData = fs.readFileSync(fileName,'utf-8')
        const jsonData = JSON.parse(rawData)
        return {
            ...jsonData,
            solWallet: solWallet,
            ethWallet: new ethers.Wallet(jsonData.ethWallet)
        }
    }catch(err){
        console.log(err)
        const ethWallet = ethers.Wallet.createRandom()
        const wallet = {
            solWallet: solWallet,
            ethWallet: ethWallet,
            count: 0,
            countJupiter: 0,
            countPhoenix: 0,
            countBridge: 0,
            countMayanSwap: 0,
            lastDefi: -1,
            prevBridge: 0,
            prevBridgeSide: 1,
            prevBridgeRoute: 0,
        }
        saveWallet(wallet)
        return wallet
    }
}

const loadWallets = () => {
    try{
        const fileName = './wallets.txt'
        const rawData = fs.readFileSync(fileName, 'utf-8')
        const wallets = rawData.split(/\r?\n/)
        for(let item of wallets){
            try{
                let solWallet = Keypair.fromSecretKey(bs58.decode(item))
                walletList.push(loadWallet(solWallet))
            }catch(err){
                console.log(err)
            }
        }
        for(let item of walletList){
            console.log(`${item.solWallet.publicKey.toBase58()}  &  ${item.ethWallet.address} - Total: ${item.count}  Jupiter: ${item.countJupiter}   Phoenix: ${item.countPhoenix}  Bridge: ${item.countBridge}  MayanSwap: ${item.countMayanSwap}`)
        }
    }catch(err){
        console.log(err)
    }
}

const loadProxy = () => {
    try{
        const fileName = "./proxy.txt"
        const rawData = fs.readFileSync(fileName, 'utf-8')
        ProxyList = rawData.split(/\r?\n/)
        console.log("Proxy Count: ", ProxyList.length)
    }catch(err){
    }
}

const setProxy = (proxyNum) => {
    const proxy = ProxyList[proxyNum]
    const infos = proxy.split(":")
    globalTunnel.initialize({
        host: infos[0],
        port: Number(infos[1]),
        proxyAuth: infos[2]+":"+infos[3],
        connect: "both"
    })
}

const MIN_COUNT = 35
const MIN_JUPITER_COUNT = 17
const MAX_JUPITER_COUNT = 23
const MIN_PHOENIX_COUNT = 12
const MAX_PHOENIX_COUNT = 15
const MIN_MAYAN_DEBRIDGE_COUNT = 3
const MAX_MAYAN_DEBRIDGE_COUNT = 4
const MIN_MAYAN_SWAP_COUNT = 4
const MAX_MAYAN_SWAP_COUNT = 8

const selectNextDefi = (wallet) => {
    let defi = -1
    if(wallet.lastDefi==2 && wallet.prevBridgeSide==0) return 2;
    if(wallet.count > MIN_COUNT){
        if(wallet.countJupiter<MIN_JUPITER_COUNT && wallet.lastDefi!=0) defi = 0;
        else if(wallet.countPhoenix<MIN_PHOENIX_COUNT && wallet.lastDefi!=1) defi = 1;
        else if(wallet.countBridge<MIN_MAYAN_DEBRIDGE_COUNT) defi = 2;
        else if(wallet.countMayanSwap<MIN_MAYAN_SWAP_COUNT && wallet.lastDefi!=3) defi = 3;
        else if(wallet.prevBridgeSide==0) defi = 2
        else defi = -1
    }else{
        let isFound = false;
        while(!isFound){
            const rand = Math.round(Math.random() * 100) % 40
            if(rand<22){ //Jupiter
                defi = 0
                if(wallet.countJupiter<MAX_JUPITER_COUNT)
                    isFound = true
            }else if(rand<34){ //Phoenix
                defi = 1
                if(wallet.countPhoenix<MAX_PHOENIX_COUNT)
                    isFound = true
            }else if (rand<37){ //Mayan & Debridge
                defi = 2
                if(wallet.countBridge<MAX_MAYAN_DEBRIDGE_COUNT)
                    isFound = true
            }else{ // Mayan Swap
                defi = 3
                if(wallet.countMayanSwap<MAX_MAYAN_SWAP_COUNT)
                    isFound = true
            }
        }
    }

    return defi
}

const scenario = async(wallet) => {
    let finish = false;
    let selectedDefi = -1
    while(!finish){
        try{
            selectedDefi = selectNextDefi(wallet)
            while(!(selectedDefi!=wallet.lastDefi || selectedDefi==-1 || selectedDefi==2)) selectedDefi = selectNextDefi(wallet);
            setProxy((new Date().getTime()) % ProxyList.length)
            // const response = await fetch("https://ident.me/ip")
            // console.log("Current IP: ",await response.text())
            await unwrapSol(wallet.solWallet)
            if(selectedDefi==-1){
                finish = true;
            }else{
                if(selectedDefi==0){
                    while(!(await swapInJupiter(wallet.solWallet))) await sleep(5);
                    wallet.countJupiter++
                    wallet.lastDefi = 0
                }else if(selectedDefi==1){
                    while(!(await swapInPhoenix(wallet.solWallet))) await sleep(5);
                    wallet.countPhoenix++
                    wallet.lastDefi = 1
                }else if(selectedDefi==2){
                    let mayanOrDebridge;
                    let route;
                    let side;
                    if(wallet.prevBridgeSide==1){
                        mayanOrDebridge = (new Date().getTime()) % 2
                        route = (new Date().getTime()) % 3
                        side = 0
                        if(mayanOrDebridge==0){
                            while(!(await bridgeInMayan(wallet.solWallet, wallet.ethWallet, side, route))) await sleep(5);
                        }else{
                            while(!(await bridgeInDebridge(wallet.solWallet, wallet.ethWallet, side, route))) await sleep(5);
                        }
                    }
                    else{
                        mayanOrDebridge = wallet.prevBridge==0 ? 1 : 0
                        route = wallet.prevBridgeRoute
                        side = 1
                        if(mayanOrDebridge==0){
                            await bridgeInMayan(wallet.solWallet, wallet.ethWallet, side, route)
                        }else{
                            await bridgeInDebridge(wallet.solWallet, wallet.ethWallet, side, route)
                        }
                    }
                    
                    wallet.countBridge++
                    wallet.prevBridge = mayanOrDebridge
                    wallet.prevBridgeRoute = route
                    wallet.prevBridgeSide = side
                    wallet.lastDefi = 2
                }else if(selectedDefi==3){
                    while(!(await swapInMayan(wallet.solWallet))) await sleep(5);
                    wallet.countMayanSwap++
                    wallet.lastDefi = 3
                }
                wallet.count++
                saveWallet(wallet)
            }
        }catch(err){
            console.log(err)
        }
    }
}

const main = () => {
    loadWallets()
    loadProxy()
    // setProxy(0)
    for(let item of walletList){
        scenario(item)
    }
}

main()
