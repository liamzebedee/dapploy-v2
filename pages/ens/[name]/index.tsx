import Image from 'next/image'
import { Inter } from 'next/font/google'
import { useRouter } from 'next/router'
import Layout from '@/components/layout'

import { getContract, getProvider } from '@wagmi/core'
import { useEffect, useState } from 'react'
import { useQuery } from 'react-query'
import { ethers } from 'ethers'
const bs58 = require('bs58')

const { default: ENS, getEnsAddress } = require('@ensdomains/ensjs')

const inter = Inter({ subsets: ['latin'] })

// @ts-ignore
import * as contentHash from 'content-hash'


const codecToHumanised = {
    'ipfs-ns': 'IPFS',
    'ipns-ns': 'IPNS',
    'swarm-ns': 'Swarm',
    'onion': 'Tor',
    'dnslink': 'DNS via DNSLink',
}

const codecInfoUrls = {
    'IPFS': 'https://docs.ipfs.io/concepts/content-addressing/#identifier-formats',
    'IPNS': 'https://docs.ipfs.io/concepts/ipns/',
    'Swarm': 'https://swarm-guide.readthedocs.io/en/latest/usage.html#bzz-urls',
    'DNSLink': 'https://docs.ipfs.io/concepts/dnslink/',
}

function decodeContentHash(hashHex: string) {
    let contenthash = {
        raw: null,
        codec: null,
        codecHumanized: null,
        hash: null
    }

    const hash = contentHash.decode(hashHex)
    const codec = contentHash.getCodec(hashHex)
    contenthash.hash = hash
    contenthash.codec = codec
    contenthash.raw = hashHex as any
    

    // Special-case: DNSLink.
    const contentHashBuf = Buffer.from(hashHex.slice(2), 'hex')

    // Multihash constants.
    const NAMESPACE_IPNS = 0xe5
    const CONTENT_TYPE_DAG_PB = 0x70
    const IDENTITY_FN = 0x00

    // FIX for https://github.com/ensdomains/ens-app/issues/849#issuecomment-660179328
    const isSpecialCaseRawDnsLink =
        contentHashBuf[0] == NAMESPACE_IPNS
        && contentHashBuf[3] == CONTENT_TYPE_DAG_PB
        && contentHashBuf[4] == IDENTITY_FN

    if (isSpecialCaseRawDnsLink) {
        // > i believe that specifying 0xe5 for IPNS, 0x01 for the CID version (i'm confused by the second instance of 0x01 which appears after the first in all the 1577 examples, but ignoring that for now), 0x70 for dag-pb (not 100% sure what this does), and 0x00 as the identity transformation, followed by the length of the IPNS identifier and (in the case of DNSLink) the identifier itself in utf-8 is enough to satisfy the requirements
        // > the 0x00 identity transformation (as compared to e.g. 0x12 for sha2-256) is meant to be the hint!
        // > for example, using multihashes, multihashes.encode(Buffer.from('noahzinsmeister.com'), 'identity') produces the multihash of < Buffer 00 13 6e 6f 61 68 7a 69 6e 73 6d 65 69 73 74 65 72 2e 63 6f 6d > i.e. 00136e6f61687a696e736d6569737465722e636f6d.converting to CIDv1 via cids, new CID(1, 'dag-pb', multihashes.encode(Buffer.from('noahzinsmeister.com'), 'identity')) yields a CID whose prefix is < Buffer 01 70 00 13 > i.e. 01700013.so, if you see the 0x00 as the multihash function code, the content is utf - 8.
        //
        // ...
        //
        // I'm gonna kill someone.
        // Everyone except this guy - https://github.com/ensdomains/ens-app/issues/849#issuecomment-777088950.
        // See https://github.com/ensdomains/ui/blob/3790d35dcfa010897eae9707f2b383d2b983525e/src/utils/contents.js#L6 for more code to help parse this.
        //
        // If the codec is ipfs-ns, then the hash could be....yet another hash.
        console.log(hash)
        let hashDecoded = bs58.decode(hash)
        let hashBuffer = Buffer.from(hashDecoded)
        let dnsLinkName = hashBuffer.slice(2).toString()
        console.log(`dnsLink ${dnsLinkName}`)

        // @ts-ignore
        contenthash.hash = dnsLinkName
        // @ts-ignore
        contenthash.codec = 'dnslink'
    }

    contenthash.codecHumanized = codecToHumanised[contenthash.codec!] || 'Unknown'
    return contenthash
}

function toHumanisedList(strs: any[]) {
    if(strs.length == 1) return strs[0]
    else if(strs.length == 2) return strs.join(' and ')
    else if(strs.length > 2) {
        const last = strs.pop()
        return strs.join(', ') + ', and ' + last
    }
}

export default function ViewENS() {
    // Get the ENS name from the URL
    const { name } = useRouter().query
    // Get the provider from wagmi.
    const provider = getProvider()
    // Get the ENS contract.
    const ens = new ENS({ provider, ensAddress: getEnsAddress('1') })
    
    const { data, isLoading, isSuccess } = useQuery(['ens', name], async () => {
        // const ENSRegistry = new ethers.Contract(
        //     '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
        //     [
        //         'function resolver(bytes32 node) external view returns (address)'
        //     ],
        //     provider
        // )


        // // https://github.com/mds1/multicall
        // const ETHEREUM_MULTICALL_ADDRESS = `0xcA11bde05977b3631167028862bE2a173976CA11`
        // const Multicall = new ethers.Contract(
        //     ETHEREUM_MULTICALL_ADDRESS,
        //     [
        //         // https://github.com/mds1/multicall
        //         'function aggregate(tuple(address target, bytes callData)[] calls) payable returns (uint256 blockNumber, bytes[] returnData)',
        //         'function aggregate3(tuple(address target, bool allowFailure, bytes callData)[] calls) payable returns (tuple(bool success, bytes returnData)[] returnData)',
        //         'function aggregate3Value(tuple(address target, bool allowFailure, uint256 value, bytes callData)[] calls) payable returns (tuple(bool success, bytes returnData)[] returnData)',
        //         'function blockAndAggregate(tuple(address target, bytes callData)[] calls) payable returns (uint256 blockNumber, bytes32 blockHash, tuple(bool success, bytes returnData)[] returnData)',
        //         'function getBasefee() view returns (uint256 basefee)',
        //         'function getBlockHash(uint256 blockNumber) view returns (bytes32 blockHash)',
        //         'function getBlockNumber() view returns (uint256 blockNumber)',
        //         'function getChainId() view returns (uint256 chainid)',
        //         'function getCurrentBlockCoinbase() view returns (address coinbase)',
        //         'function getCurrentBlockDifficulty() view returns (uint256 difficulty)',
        //         'function getCurrentBlockGasLimit() view returns (uint256 gaslimit)',
        //         'function getCurrentBlockTimestamp() view returns (uint256 timestamp)',
        //         'function getEthBalance(address addr) view returns (uint256 balance)',
        //         'function getLastBlockHash() view returns (bytes32 blockHash)',
        //         'function tryAggregate(bool requireSuccess, tuple(address target, bytes callData)[] calls) payable returns (tuple(bool success, bytes returnData)[] returnData)',
        //         'function tryBlockAndAggregate(bool requireSuccess, tuple(address target, bytes callData)[] calls) payable returns (uint256 blockNumber, bytes32 blockHash, tuple(bool success, bytes returnData)[] returnData)',
        //     ],
        //     provider
        // )


        // Get the ENS details.
        const ensName = await ens.name(name)
        
        // Get:
        // - owner
        // - resolver
        // - text
        // - contenthash
        const owner = await ensName.getOwner()
        const address = await ensName.getAddress()
        const resolverAddr = await ensName.getResolver()
        const torrent = await ensName.getText('torrentv1')

        const Resolver = new ethers.Contract(
            resolverAddr,
            [
                'function text(bytes32 node, string calldata key) external view returns (string memory)',
                'function contenthash(bytes32 node) external view returns (bytes memory)'
            ],
            provider
        )

        // const contenthash = await ensName.getContent()
        const contenthash_raw = await Resolver.contenthash(ethers.utils.namehash(name as string))

        // Determine the type of contenthash.
        let contenthash = {
            raw: null,
            codec: null,
            codecHumanized: null,
            hash: null
        }
        
        if(contenthash_raw != '0x') {
            contenthash.raw = contenthash_raw
            contenthash = decodeContentHash(contenthash_raw)
        }

        let resolutionMethods = []
        // Torrent.
        if(torrent != '') resolutionMethods.push('BitTorrent')
        // IPFS, IPNS, Swarm, Onion.
        if(contenthash.raw) {
            const humanisedCodec = codecToHumanised[contenthash.codec!]
            resolutionMethods.push(humanisedCodec)
        }

        const details = {
            owner,
            address,
            resolver: resolverAddr,
            torrent,
            contenthash,
            resolutionMethods
        }

        console.log(details)

        return details
    })

    // Lookup ENS details using ethers.js.

    // There are these ways to configure a name:
    // 1. Resolve to a torrent hash.
    // 2. Resolve to an IPNS hash.
    // 3. Resolve to an IPFS hash.
    // 4. Resolve to an IP.

    // These are the UX flows:
    // 1. Simple mode.
    // 2. Advanced mode.

    const [mode, setMode] = useState('simple')

    let tabActiveClass = 'bg-white inline-flex items-center px-1 pt-1 border-b-2 border-indigo-500 text-sm font-medium leading-5 text-gray-900 focus:outline-none focus:border-indigo-700 transition duration-150 ease-in-out'
    let tabInactiveClass = 'bg-white inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium leading-5 text-gray-500 hover:text-gray-700 hover:border-gray-300 focus:outline-none focus:text-gray-700 focus:border-gray-300 transition duration-150 ease-in-out'

    return (
        <Layout>
            <main>
                {/* title class */}

                <h2 className='text-3xl font-bold leading-9 text-gray-900 sm:text-4xl sm:leading-10 md:text-5xl md:leading-14'>
                    {name}
                </h2>

                {/* Two Tailwind tabs: simple and advanced */}
                <div className="flex flex-col">
                    <div className="-mb-px flex justify-center">
                        <button onClick={() => setMode('simple')} className={mode == "simple" ? tabActiveClass : tabInactiveClass}>
                            Simple
                        </button>
                        
                        <button onClick={() => setMode('advanced')} className={' ml-8 ' + (mode == "advanced" ? tabActiveClass : tabInactiveClass)}>
                            Advanced
                        </button>
                    </div>
                </div>

                {isLoading && <p>Loading...</p>}

                {/* Simple mode */}
                {
                    mode == 'simple' && 
                    isSuccess &&
                    <div className="mt-4">
                        <p>This name resolves to content on {toHumanisedList(data.resolutionMethods)}
                        </p>
                        <br/>
                        <div className="flex flex-col pd-5">
                            <div className="flex flex-col">
                                <label htmlFor="torrent" className="block text-sm font-medium leading-5 text-gray-700">
                                    BitTorrent magnet link
                                </label>
                                <div className="mt-1 relative rounded-md shadow-sm">
                                    <input id="torrent" className="form-input block w-full sm:text-sm sm:leading-5" placeholder="magnet:?xt=urn:btih:..." value={data.torrent} />
                                </div>
                            </div>
                            
                            <div className="flex flex-col">
                                <label htmlFor="torrent" className="block text-sm font-medium leading-5 text-gray-700">
                                {data.contenthash.codecHumanized}
                                </label>
                                <div className="mt-1 relative rounded-md shadow-sm">
                                    <input id="torrent" className="form-input block w-full sm:text-sm sm:leading-5" placeholder="" value={data.contenthash.hash!} />
                                </div>
                            </div>
                        </div>
                    </div>
                }
                

                {/* Advanced mode */}
                {
                    mode == 'advanced' &&
                    isSuccess &&
                    <div className="mt-4">
                        {/* Show a table of the important ENS keys, with buttons to change them. */}
                        <div className="flex flex-col">
                        {isSuccess && <pre>{JSON.stringify(data, null, 1)}</pre>}
                        </div>
                    </div>
                }

                
            </main>
        </Layout>
    )
}

