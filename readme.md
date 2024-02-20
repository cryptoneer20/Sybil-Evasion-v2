
# Sybil Evasion BOT

## Requirements

Marco Functionality for our SOL routes

We are going to make it so that each wallet will get activity from all of the swaps and bridges we have created

The code is going to run on each batch of walllets for 3 days and will be following a specified, unique route from the list of routes we have created

A route is a logical series of swaps

- Jupiter swap : 17 ~ 23 times
- Phoenix swap : 12 ~ 15 times
- Mayan swap : 4 ~ 8 times
- Mayan swap cross chain & Debridge : 6 ~ 8

Mainly, no dapp should be repeated consecutively

After bridging on mayan swap you MUST do bridging back with debridge and if you bridge on debridge after that you MUST do bridging back on mayan swap

And very important thig - The tokens that you bridge and bridge back should be the same

For our functionality, Swaps that have a token in of SOL only should use between 60 ~ 80 %(Random int) of the total volume available

All other token in other that SOL in should use 100% of the total available amount

- Would be nice if they finished within 4 hours or so with each other
- We'll using between 50 ~ 200 dollars for these wallets

## Implement

1. Prepare wallets and proxies

First, you need to list solana wallets and deposit SOL to them

You have to create wallets.txt and write wallet private keys line by line. You can get private key(base58 encoded) in "Show private key" part of wallet

For example:

```wallets.txt
3XcsYWCSyRfEyKyW1VzCCTR2ouV5mPfKaQHS9BnyPBPFxbFGMfXANzmCNhdUQaz3pMAwL4ASXbnLGaHacVaaXd6H
BPFxbFGMfXANzmCNhdUQaz3pMAwL4ASXbnLGaHacVaaXd6H3XcsYWCSyRfEyKyW1VzCCTR2omPfKaQHS9BnyPBPF
... ...
```

You have to buy proxies in proxy services such as IPRoyal( https://iproyal.com ) and ProxyScrape( https://proxyscrape.com )

Ethereum wallet is created randomly and stored in proper file of 'details' foder

2. Install Node.js on your PC

This bot was built by using Node.js. To run this bot, you need to install Node.js on your PC

Node. js (Node) is an Open Source, cross-platform runtime environment for executing JavaScript code. Node is used extensively for server-side programming, making it possible for developers to use JavaScript for client-side and server-side code without needing to learn an additional language.

Please check https://nodejs.org/en/download

3. Install Node modules and Run the bot program

```
    npm install

    npm start
```

## Result

When you run the bot, it will make swap transactions for all wallets

You can check current state of wallets in "details" folder

```
<wallet name>.json
    solWallet: Solana wallet private key
    ethWallet: Evm wallet private key
    count: total swap transaction count
    countJupiter, countPhoneix..... : swap transaction count for each defi
    lastDefi : last Defi swap transaction happened. Its used for that no dapp is repeated
    prevBridge, prevBridgeRoute, prevBridgeSide : Mayan & Debridge state
```

Also you can see csv files/file contains transaction history in details folder: <wallet name>.csv

```
Jupiter,SOL,0.18,USDT,42bN4jSKfJbfo91CjUGNVYoJjbyYcvVbBmXtyMndrTwZga9PViHEQWtE3RFr6AQKzPtmgWv1CfEXa31qZRJNGQxD
Mayan Bridge,USDT/solana,19.87126,ETH/arbitrum,4wNmp7WFRnDv8iMutBCC2zAeeVNzn83SQbZK92WqTKnabc5sMSLqZwb9hrH6HpUYPTnsJ8a66xKsYp2iKmDDogvW
Debridge,ETH/arbitrum,0.002967902750049392,USDT/solana,0xa04ea449b6d47673fa84d915723d6db946164193be75f67d5bfa3c16feb38956
Mayan Swap,SOL/solana,0.22,USDT/solana,yrU5jh18JgMxNiyrSV6wWLsZR1KeZ1LEMeAggByBwrswzpiFe4nR8aWJ88nntTGFk3dvnsqnyv3xH46TQ9po4bA
Jupiter,SOL,0.1,USDT,2zeYyL9YCBRfKo4TNAyYnNbSTz4t2uEhPEDZayyJtZZS3BvT231Q1UfWMnHuMSSWgLmJoGB7vDKx8eSaJzYhPHy2
Phoenix,USDT,33.21466,SOL,2g3MK4vK52pm1Rf1RwS3xKQN8xb5aJLw9EKtBJj8qHTvqux2QQUKFenJfs1iJUhjbSPudKiHP4NaUYwYtybiCdNq
Debridge,SOL/solana,0.24,ETH/arbitrum,4qa4i9LV6HtdRB2any2LN4M99e3wdy6UQnPxLca4nx1Pux5dhSCJhfXYqRzgBtD6sceAsRdnAq6bJyHHrnQxsxNh
Mayan Bridge,ETH/arbitrum,0.0379578353,SOL/solana,0xb1781ab3f7660240c8cf945285c0b87858bc372c2298cc5d6bb711457725e47f
Jupiter,SOL,0.06,USDT,48sBEWFB84T1yqsdd3qmSND1Pv3BYbeJGU8mX6mp7evnGfzYoUY163yuGfUnFhZrLkF5nr638urugTnXy9eZY53K
Phoenix,SOL,0.01,USDT,5BpLYfWEGsdttYqMTkmgEiDXe6CxqoB2gWXD8VWRrqzAxMWsmUb9vw6is3iUkSX8z7ZyuJsdnAuzosXbngFSzGR6
Mayan Swap,USDT/solana,7.79061,SOL/solana,3M7Z1nFGWaJSyuHyrTnY7TUgVuzWkhWUTdUzGA7h7XKg6S92aUF1gPf9Zz8reC5WJP6isJgzCfuCVexWDDp4RonB
Jupiter,USDC,0.067764,SOL,3bzMLzo7XoTBHWuUwG7mdRrGsL3F8s4XSw1P4b68KoqKa3PiSpe1y6VKzRTqxEkQXKC2rbDTQguDjUfKxS6kN67e
Phoenix,SOL,0.04,USDT,uLGSHxgqHm2DbmMEsYAVUj6knUKv9fWzatz8rJPu7rcyT229p21rfRfZgkjbGX5qTDY4Y4YjoEgoW7HDYmKudLg
Jupiter,USDT,4.39652,SOL,4t12bQ5rQST1AYE1at5KicthLhhLEqkFr58Qt64RbSLx1Zaj1mCms5EmCQUy4otBZxHGtxUjfjLRgvUbi1UP7ddR
```

Enjoy it!!!