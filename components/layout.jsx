
/*
Rainbow & wagmi
*/
import '@rainbow-me/rainbowkit/styles.css';

import {
    ConnectButton,
    createAuthenticationAdapter,
    getDefaultWallets,
    RainbowKitAuthenticationProvider,
    RainbowKitProvider,
} from '@rainbow-me/rainbowkit';
import { configureChains, createClient, useAccount, WagmiConfig, useSigner } from 'wagmi';
import { mainnet, polygon, optimism, arbitrum } from 'wagmi/chains';
import { getContract, getProvider } from '@wagmi/core'
import { alchemyProvider } from 'wagmi/providers/alchemy';
import { publicProvider } from 'wagmi/providers/public';

import { useNetwork } from 'wagmi'
import { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider, useQuery } from 'react-query'

const { chains, provider } = configureChains(
    [mainnet],
    [
        publicProvider()
    ]
);

const { connectors } = getDefaultWallets({
    appName: 'dapploy',
    chains: [mainnet]
});

const wagmiClient = createClient({
    autoConnect: true,
    connectors,
    provider
})


export default function Layout({ children }) {
    const [authStatus, setAuthStatus] = useState('unauthenticated')
    const onVerify = (ok) => {
        setAuthStatus(ok ? 'authenticated' : 'unauthenticated')
    }

    return (
        <WagmiConfig client={wagmiClient}>
                <RainbowKitAuthenticationProvider
                    status={authStatus}
                    appInfo={{
                        appName: 'Dapploy',
                    }}
                >
                    <RainbowKitProvider modalSize="compact" chains={chains} initialChain={polygon}>
                        {children}
                    </RainbowKitProvider>
                </RainbowKitAuthenticationProvider>
            </WagmiConfig>
    )
}