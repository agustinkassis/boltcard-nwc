'use client'

import type React from 'react'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { WalletContextType, WalletState } from '@/types/wallet'
import { getPublicKeyFromPrivate } from '@/lib/nostr'
import { nip19 } from 'nostr-tools'

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [walletState, setWalletState] = useState<WalletState>({
    privateKey: null,
    publicKey: null,
    lightningAddress: null,
    nwcUri: null,
    balance: 125000, // Mock balance in sats
    isInitialized: false // Added initialization state
  })
  const [isHydrated, setIsHydrated] = useState(false) // Track hydration

  const npub = useMemo(() => {
    if (!walletState.publicKey) return ''
    try {
      return nip19.npubEncode(walletState.publicKey)
    } catch (e) {
      return null
    }
  }, [walletState.publicKey])

  // Load wallet data from localStorage on mount
  useEffect(() => {
    const savedWallet = localStorage.getItem('wallet')
    if (savedWallet) {
      try {
        const parsed = JSON.parse(savedWallet)
        let publicKey = parsed.publicKey
        if (parsed.privateKey) {
          try {
            publicKey = getPublicKeyFromPrivate(parsed.privateKey)
          } catch (e) {
            publicKey = null
          }
        }
        setWalletState(prev => ({
          ...prev,
          ...parsed,
          publicKey,
          isInitialized: !!parsed.privateKey
        }))
      } catch (error) {
        console.error('Failed to parse saved wallet data:', error)
      }
    }
    setIsHydrated(true) // Mark as hydrated after attempting to load
  }, [])

  // Save wallet data to localStorage whenever it changes
  useEffect(() => {
    if (walletState.privateKey) {
      localStorage.setItem('wallet', JSON.stringify(walletState))
    }
  }, [walletState])

  const setPrivateKey = (privateKeyHex: string) => {
    try {
      const publicKey = getPublicKeyFromPrivate(privateKeyHex)
      setWalletState(prev => ({
        ...prev,
        privateKey: privateKeyHex,
        publicKey,
        isInitialized: true // Set initialized when private key is set
      }))
    } catch (error) {
      console.error('Failed to set private key:', error)
      throw new Error('Invalid private key')
    }
  }

  const setLightningAddress = (address: string) => {
    setWalletState(prev => ({ ...prev, lightningAddress: address }))
  }

  const setNwcUri = (uri: string) => {
    setWalletState(prev => ({ ...prev, nwcUri: uri }))
  }

  const logout = () => {
    setWalletState({
      privateKey: null,
      publicKey: null,
      lightningAddress: null,
      nwcUri: null,
      balance: 125000,
      isInitialized: false // Reset initialization on logout
    })
    localStorage.removeItem('wallet')
  }

  const contextValue: WalletContextType = {
    ...walletState,
    setPrivateKey,
    setLightningAddress,
    setNwcUri,
    logout,
    npub,
    isHydrated // Expose hydration state
  }

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}
