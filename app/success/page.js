'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Check, Crown, Copy, ArrowLeft } from 'lucide-react'

export default function SuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  
  const sessionId = searchParams.get('session_id')
  const licenseKey = searchParams.get('license')
  
  useEffect(() => {
    // Auto-activate license when page loads
    if (licenseKey) {
      localStorage.setItem('silenceRemover_licenseKey', licenseKey)
      localStorage.setItem('silenceRemover_userTier', 'pro')
    }
  }, [licenseKey])
  
  const copyLicense = () => {
    if (licenseKey) {
      navigator.clipboard.writeText(licenseKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Success Card */}
        <div className="bg-slate-800/50 border border-green-500/30 rounded-xl p-8 text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-white" />
          </div>
          
          <h1 className="text-3xl font-bold text-green-400 mb-2">
            Payment Successful!
          </h1>
          
          <p className="text-slate-400 mb-6">
            Welcome to QuietCutter Pro! Your account has been upgraded.
          </p>
          
          {/* Pro Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-600 to-amber-600 rounded-full text-sm font-medium mb-6">
            <Crown className="w-4 h-4" />
            PRO Lifetime Activated
          </div>
          
          {/* License Key Box */}
          {licenseKey && (
            <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 mb-6">
              <div className="text-xs text-slate-400 mb-2">Your License Key (save this!)</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-lg text-blue-400 tracking-wider">
                  {licenseKey}
                </code>
                <button
                  onClick={copyLicense}
                  className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              <div className="text-xs text-slate-500 mt-2">
                Use this key to restore Pro on other devices
              </div>
            </div>
          )}
          
          {/* Pro Features */}
          <div className="bg-slate-900/30 rounded-lg p-4 mb-6 text-left">
            <div className="text-sm font-medium text-slate-300 mb-3">Your Pro Benefits:</div>
            <div className="space-y-2 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Unlimited videos per day
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Videos up to 2 hours
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Unlimited saved settings
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                50 items in history
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Priority processing
              </div>
            </div>
          </div>
          
          {/* Back Button */}
          <button
            onClick={() => router.push('/')}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Start Using QuietCutter Pro
          </button>
        </div>
        
        {/* Footer Note */}
        <p className="text-center text-slate-500 text-sm mt-4">
          A receipt has been sent to your email
        </p>
      </div>
    </div>
  )
}
