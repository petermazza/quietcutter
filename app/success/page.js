'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Check, Crown, ArrowLeft, Loader2 } from 'lucide-react'

function SuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [upgrading, setUpgrading] = useState(true)
  const [error, setError] = useState('')
  
  const sessionId = searchParams.get('session_id')
  
  useEffect(() => {
    // Upgrade user's plan on the server
    const upgradePlan = async () => {
      if (!sessionId) {
        setUpgrading(false)
        return
      }
      
      try {
        const response = await fetch('/api/stripe/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        })
        
        const data = await response.json()
        
        if (!response.ok) {
          setError(data.error || 'Failed to verify payment')
        }
      } catch (error) {
        console.error('Upgrade error:', error)
        setError('Failed to verify payment')
      } finally {
        setUpgrading(false)
      }
    }
    
    upgradePlan()
  }, [sessionId])
  
  if (upgrading) {
    return (
      <div className="max-w-md w-full text-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
        <p className="text-slate-400">Verifying your payment...</p>
      </div>
    )
  }
  
  return (
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
        
        {error && (
          <p className="text-amber-400 text-sm mb-4">
            Note: {error}. Your payment was received - please contact support if Pro features aren't activated.
          </p>
        )}
        
        {/* Pro Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-600 to-amber-600 rounded-full text-sm font-medium mb-6">
          <Crown className="w-4 h-4" />
          PRO Activated
        </div>
        
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
  )
}

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100 flex items-center justify-center p-4">
      <Suspense fallback={
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      }>
        <SuccessContent />
      </Suspense>
    </div>
  )
}
