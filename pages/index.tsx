import Image from 'next/image'
import { Inter } from 'next/font/google'
import { useEffect } from 'react'
import Link from 'next/link'
const inter = Inter({ subsets: ['latin'] })

export default function Home() {
  // Detect the enter press for the input.
  // If the input is not empty, redirect to the ENS page.
  // If the input is empty, show an error message.

  useEffect(() => {
    const input = document.querySelector('input')
    if(!input) return

    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const name = input.value
        if (name) {
          window.location.href = `/ens/${name}`
        } else {
          alert('Please enter a valid ENS name.')
        }
      }
    })
  }, [])

  const examples = 'kwenta.eth uniswap.eth 1inch.eth app.ens.eth vitalik.eth'.split(' ')

  return (
    <main>
      <h1>Welcome to Dapploy</h1>
      <p>Dapploy allows you to deploy your content to Dappnet.</p>
      <p>This tool is in alpha, and under development.</p>

      <label className="relative block">
        <span className="sr-only">Search</span>
        <span className="absolute inset-y-0 left-0 flex items-center pl-2">
          <svg className="h-5 w-5 fill-slate-300" viewBox="0 0 20 20"></svg>
        </span>
        <input className="placeholder:italic placeholder:text-slate-400 block bg-white w-full border border-slate-300 rounded-md py-2 pl-9 pr-3 shadow-sm focus:outline-none focus:border-sky-500 focus:ring-sky-500 focus:ring-1 sm:text-sm" placeholder="Enter your .eth name..." type="text" name="search" />
      </label>

      <p>Or view some examples:</p>
      <ul className='list-disc list-inside'>
        {examples.map((example) => (
          <li key={example}>
            <Link href={`/ens/${example}`}>{example}</Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
