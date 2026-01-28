'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from './components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Progress } from './components/ui/progress'
import { Upload, Download, Play, Loader2, Video, FileVideo, History, Clock, Star, Trash2, RotateCcw, Crown, X, Check, Zap, CreditCard, LogIn, LogOut, Mail } from 'lucide-react'

// Plan limits - simplified to focus on real value
const PLAN_LIMITS = {
  free: {
    videosPerDay: 3,
    maxDurationMinutes: 10,
  },
  pro: {
    videosPerDay: Infinity,
    maxDurationMinutes: 120,
  }
}

// Shared limits (same for everyone)
const SHARED_LIMITS = {
  maxSavedSettings: 5,
  maxHistoryItems: 10,
}

export default function VideoSilenceRemover() {
  const [loaded, setLoaded] = useState(true) // Server-side FFmpeg is always ready
  const [videoFile, setVideoFile] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [processedVideoUrl, setProcessedVideoUrl] = useState('')
  const [duration, setDuration] = useState(0)
  const [dragActive, setDragActive] = useState(false)
  const [statusMessage, setStatusMessage] = useState('Ready to process video')
  const [threshold, setThreshold] = useState(-30)
  const [minSilenceDuration, setMinSilenceDuration] = useState(0.5)
  const [activePreset, setActivePreset] = useState('custom')
  const [videoMetadata, setVideoMetadata] = useState(null)
  const [processingStats, setProcessingStats] = useState(null)
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(null)
  const [currentStep, setCurrentStep] = useState('')
  const [comparisonMode, setComparisonMode] = useState(false)
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)
  
  // Phase 3: History & Settings state
  const [processingHistory, setProcessingHistory] = useState([])
  const [savedSettings, setSavedSettings] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [showSavedSettings, setShowSavedSettings] = useState(false)
  const [lastUsedSettings, setLastUsedSettings] = useState(null)
  
  // Freemium state
  const [userTier, setUserTier] = useState('free') // 'free' or 'pro'
  const [dailyUsage, setDailyUsage] = useState({ date: '', count: 0 })
  const [licenseKey, setLicenseKey] = useState('')
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showLicenseModal, setShowLicenseModal] = useState(false)
  const [licenseKeyInput, setLicenseKeyInput] = useState('')
  const [licenseError, setLicenseError] = useState('')
  
  // Auth state
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true) // Loading auth state
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginMessage, setLoginMessage] = useState('')
  const [loginError, setLoginError] = useState('')
  
  const videoPreviewRef = useRef(null)
  const metadataVideoRef = useRef(null) // Hidden video element for metadata extraction
  const fileInputRef = useRef(null)
  const processingStartTime = useRef(null)
  const processedVideoRef = useRef(null)
  
  // Get current plan limits
  const planLimits = PLAN_LIMITS[userTier]
  const isPro = userTier === 'pro'
  
  // Preset configurations
  const presets = {
    podcast: { name: 'Podcast', threshold: -35, duration: 1.0, icon: '🎙️', description: 'Remove long pauses between speech' },
    screenRecording: { name: 'Screen Recording', threshold: -40, duration: 0.3, icon: '🖥️', description: 'Remove short pauses in tutorials' },
    lecture: { name: 'Lecture', threshold: -30, duration: 0.8, icon: '👨‍🏫', description: 'Balanced for educational content' },
    interview: { name: 'Interview', threshold: -25, duration: 0.5, icon: '🎬', description: 'Keep natural conversation flow' },
    custom: { name: 'Custom', threshold: -30, duration: 0.5, icon: '⚙️', description: 'Manual adjustment' }
  }
  
  // Apply preset
  const applyPreset = (presetName) => {
    const preset = presets[presetName]
    setThreshold(preset.threshold)
    setMinSilenceDuration(preset.duration)
    setActivePreset(presetName)
  }
  
  // Check if daily limit reached
  const isDailyLimitReached = () => {
    const today = new Date().toDateString()
    if (dailyUsage.date !== today) return false
    return dailyUsage.count >= planLimits.videosPerDay
  }
  
  // Get remaining videos today
  const getRemainingVideos = () => {
    const today = new Date().toDateString()
    if (dailyUsage.date !== today) return planLimits.videosPerDay
    return Math.max(0, planLimits.videosPerDay - dailyUsage.count)
  }
  
  // Increment daily usage
  const incrementDailyUsage = () => {
    const today = new Date().toDateString()
    let newUsage
    if (dailyUsage.date !== today) {
      newUsage = { date: today, count: 1 }
    } else {
      newUsage = { date: today, count: dailyUsage.count + 1 }
    }
    setDailyUsage(newUsage)
    localStorage.setItem('silenceRemover_dailyUsage', JSON.stringify(newUsage))
  }
  
  // Check video duration limit
  const isVideoDurationAllowed = (durationSeconds) => {
    const durationMinutes = durationSeconds / 60
    return durationMinutes <= planLimits.maxDurationMinutes
  }
  
  // Validate license key (simple format: LIFE-XXXX-XXXX-XXXX)
  const validateLicenseKey = (key) => {
    // Simple validation - in production, you'd verify against a server
    const pattern = /^LIFE-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/
    return pattern.test(key.toUpperCase())
  }
  
  // Activate license key
  const activateLicenseKey = () => {
    const key = licenseKeyInput.trim().toUpperCase()
    if (validateLicenseKey(key)) {
      setLicenseKey(key)
      setUserTier('pro')
      setLicenseError('')
      setShowLicenseModal(false)
      localStorage.setItem('silenceRemover_licenseKey', key)
      localStorage.setItem('silenceRemover_userTier', 'pro')
    } else {
      setLicenseError('Invalid license key format. Should be: LIFE-XXXX-XXXX-XXXX')
    }
  }
  
  // Handle Stripe checkout
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  
  const handleCheckout = async (planType) => {
    setCheckoutLoading(true)
    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planType }),
      })
      
      const data = await response.json()
      
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error(data.error || 'Failed to create checkout session')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Failed to start checkout. Please try again.')
      setCheckoutLoading(false)
    }
  }
  
  // Auth functions
  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/me')
      const data = await response.json()
      if (data.user) {
        setUser(data.user)
        if (data.user.plan === 'pro') {
          setUserTier('pro')
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error)
    }
  }
  
  const handleSendMagicLink = async (e) => {
    e.preventDefault()
    if (!loginEmail) return
    
    setLoginLoading(true)
    setLoginError('')
    setLoginMessage('')
    
    try {
      const response = await fetch('/api/auth/send-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail }),
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setLoginMessage('Check your email for a sign-in link!')
        setLoginEmail('')
      } else {
        setLoginError(data.error || 'Failed to send magic link')
      }
    } catch (error) {
      setLoginError('Something went wrong. Please try again.')
    } finally {
      setLoginLoading(false)
    }
  }
  
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      setUser(null)
      setUserTier('free')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }
  
  // Check auth on mount
  useEffect(() => {
    checkAuthStatus()
  }, [])
  
  // Load user tier and usage from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTier = localStorage.getItem('silenceRemover_userTier')
      const savedKey = localStorage.getItem('silenceRemover_licenseKey')
      const savedUsage = localStorage.getItem('silenceRemover_dailyUsage')
      
      if (savedTier === 'pro' && savedKey && validateLicenseKey(savedKey)) {
        setUserTier('pro')
        setLicenseKey(savedKey)
      }
      
      if (savedUsage) {
        try {
          setDailyUsage(JSON.parse(savedUsage))
        } catch (e) {
          console.error('Failed to load daily usage')
        }
      }
    }
  }, [])
  
  // Load history and settings from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedHistory = localStorage.getItem('videoSilenceRemover_history')
        if (savedHistory) {
          setProcessingHistory(JSON.parse(savedHistory))
        }
        
        const savedSettingsData = localStorage.getItem('videoSilenceRemover_savedSettings')
        if (savedSettingsData) {
          setSavedSettings(JSON.parse(savedSettingsData))
        }
        
        const lastSettings = localStorage.getItem('videoSilenceRemover_lastSettings')
        if (lastSettings) {
          setLastUsedSettings(JSON.parse(lastSettings))
        }
      } catch (error) {
        console.error('Failed to load from localStorage:', error)
      }
    }
  }, [])
  
  // Save history to localStorage
  const saveHistoryToStorage = (history) => {
    try {
      localStorage.setItem('videoSilenceRemover_history', JSON.stringify(history))
    } catch (error) {
      console.error('Failed to save history:', error)
    }
  }
  
  // Save settings to localStorage
  const saveSettingsToStorage = (settings) => {
    try {
      localStorage.setItem('videoSilenceRemover_savedSettings', JSON.stringify(settings))
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  }
  
  // Save last used settings
  const saveLastUsedSettings = (settings) => {
    try {
      localStorage.setItem('videoSilenceRemover_lastSettings', JSON.stringify(settings))
      setLastUsedSettings(settings)
    } catch (error) {
      console.error('Failed to save last settings:', error)
    }
  }
  
  // Add to processing history
  const addToHistory = (fileName, stats, settings) => {
    const historyItem = {
      id: Date.now(),
      fileName,
      timestamp: new Date().toISOString(),
      originalDuration: stats.originalDuration,
      processedDuration: stats.processedDuration,
      reductionPercent: stats.reductionPercent,
      settings: {
        threshold: settings.threshold,
        minDuration: settings.minDuration,
        preset: settings.preset
      }
    }
    
    // Respect plan limits for history
    const maxItems = SHARED_LIMITS.maxHistoryItems
    const newHistory = [historyItem, ...processingHistory].slice(0, maxItems)
    setProcessingHistory(newHistory)
    saveHistoryToStorage(newHistory)
  }
  
  // Clear history
  const clearHistory = () => {
    setProcessingHistory([])
    localStorage.removeItem('videoSilenceRemover_history')
  }
  
  // Save current settings as favorite
  const saveCurrentSettings = () => {
    // Check shared limit
    if (savedSettings.length >= SHARED_LIMITS.maxSavedSettings) {
      alert(`Maximum ${SHARED_LIMITS.maxSavedSettings} saved settings allowed. Delete one to add a new one.`)
      return
    }
    
    const settingName = prompt('Name for this preset:', `Custom ${savedSettings.length + 1}`)
    if (!settingName) return
    
    const newSetting = {
      id: Date.now(),
      name: settingName,
      threshold,
      minDuration: minSilenceDuration,
      preset: activePreset,
      createdAt: new Date().toISOString()
    }
    
    const newSettings = [...savedSettings, newSetting]
    setSavedSettings(newSettings)
    saveSettingsToStorage(newSettings)
  }
  
  // Delete a saved setting
  const deleteSavedSetting = (id) => {
    const newSettings = savedSettings.filter(s => s.id !== id)
    setSavedSettings(newSettings)
    saveSettingsToStorage(newSettings)
  }
  
  // Apply saved setting
  const applySavedSetting = (setting) => {
    setThreshold(setting.threshold)
    setMinSilenceDuration(setting.minDuration)
    setActivePreset('custom')
    setShowSavedSettings(false)
  }
  
  // Apply last used settings
  const applyLastUsedSettings = () => {
    if (lastUsedSettings) {
      setThreshold(lastUsedSettings.threshold)
      setMinSilenceDuration(lastUsedSettings.minDuration)
      setActivePreset(lastUsedSettings.preset || 'custom')
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Don't trigger shortcuts if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      
      switch(e.key.toLowerCase()) {
        case 'u':
          // Upload (trigger file input)
          if (!processing) fileInputRef.current?.click()
          break
        case 'r':
          // Remove silence (process)
          if (videoFile && !processing && loaded) processVideo()
          break
        case 'd':
          // Download
          if (processedVideoUrl && !processing) downloadVideo()
          break
        case 'c':
          // Toggle comparison mode
          if (processedVideoUrl) setComparisonMode(!comparisonMode)
          break
        case 'h':
          // Toggle history panel
          setShowHistory(!showHistory)
          setShowSavedSettings(false)
          break
        case 's':
          // Toggle saved settings panel
          setShowSavedSettings(!showSavedSettings)
          setShowHistory(false)
          break
        case 'l':
          // Apply last used settings
          if (lastUsedSettings && !processing) applyLastUsedSettings()
          break
        case '?':
          // Show keyboard help
          setShowKeyboardHelp(!showKeyboardHelp)
          break
        case '1':
        case '2':
        case '3':
        case '4':
          // Quick preset selection
          const presetKeys = ['podcast', 'screenRecording', 'lecture', 'interview']
          const presetIndex = parseInt(e.key) - 1
          if (presetIndex >= 0 && presetIndex < presetKeys.length && !processing) {
            applyPreset(presetKeys[presetIndex])
          }
          break
        case 'escape':
          // Close any open panels
          setShowHistory(false)
          setShowSavedSettings(false)
          setShowKeyboardHelp(false)
          break
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [videoFile, processing, loaded, processedVideoUrl, comparisonMode, showKeyboardHelp, showHistory, showSavedSettings, lastUsedSettings])

  // Handle file selection
  const handleFileChange = (file) => {
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file)
      setProcessedVideoUrl('')
      setProgress(0)
      setProcessingStats(null)
      setStatusMessage(`Selected: ${file.name}`)
      
      // Set basic metadata immediately
      setVideoMetadata({
        duration: 0, // Will be updated when video loads
        width: 0,
        height: 0,
        size: file.size,
        name: file.name,
        type: file.type
      })
      
      // Create a hidden video element for metadata extraction
      const url = URL.createObjectURL(file)
      
      // Use the hidden metadata video element
      if (metadataVideoRef.current) {
        metadataVideoRef.current.src = url
        
        metadataVideoRef.current.onloadedmetadata = () => {
          console.log('Metadata loaded:', {
            duration: metadataVideoRef.current.duration,
            width: metadataVideoRef.current.videoWidth,
            height: metadataVideoRef.current.videoHeight
          })
          setVideoMetadata({
            duration: metadataVideoRef.current.duration,
            width: metadataVideoRef.current.videoWidth,
            height: metadataVideoRef.current.videoHeight,
            size: file.size,
            name: file.name,
            type: file.type
          })
        }
        
        metadataVideoRef.current.onerror = (e) => {
          console.error('Error loading video metadata:', e)
        }
      }
    } else if (file) {
      setStatusMessage('Please select a valid video file')
    }
  }

  // Handle drag and drop
  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0])
    }
  }

  // Process video to remove silence (SERVER-SIDE)
  const processVideo = async () => {
    if (!videoFile || !loaded) return
    
    // Check plan limits
    if (isDailyLimitReached()) {
      setShowUpgradeModal(true)
      return
    }
    
    const videoDurationMinutes = (videoMetadata?.duration || 0) / 60
    if (videoDurationMinutes > planLimits.maxDurationMinutes) {
      setStatusMessage(`Video too long (${videoDurationMinutes.toFixed(1)} min). Free plan allows up to ${planLimits.maxDurationMinutes} min.`)
      setShowUpgradeModal(true)
      return
    }
    
    setProcessing(true)
    setProgress(0)
    setCurrentStep('Uploading')
    setStatusMessage('Uploading video to server...')
    processingStartTime.current = Date.now()
    
    // Animated progress simulation based on video duration
    const videoDuration = videoMetadata?.duration || 60
    // For longer videos, processing takes longer - estimate ~1s per second of video for full re-encode
    const estimatedProcessingTime = Math.max(videoDuration * 1.0, 30) 
    let progressInterval = null
    let currentProgress = 5
    
    // Start progress animation
    progressInterval = setInterval(() => {
      const elapsed = (Date.now() - processingStartTime.current) / 1000
      // Cap at 90% - the last 10% is for actual download
      const expectedProgress = Math.min(90, 5 + (elapsed / estimatedProcessingTime) * 85)
      
      // Smoothly update progress
      if (currentProgress < expectedProgress) {
        currentProgress = Math.min(currentProgress + 1, expectedProgress)
        setProgress(Math.round(currentProgress))
        
        // Update step based on progress
        if (currentProgress < 10) {
          setCurrentStep('Uploading')
          setStatusMessage('Uploading video to server...')
        } else if (currentProgress < 25) {
          setCurrentStep('Detecting Silence')
          setStatusMessage('Analyzing audio for silent segments...')
        } else if (currentProgress < 85) {
          setCurrentStep('Processing')
          const mins = Math.floor(elapsed / 60)
          const secs = Math.floor(elapsed % 60)
          setStatusMessage(`Removing silence and re-encoding... (${mins}:${secs.toString().padStart(2, '0')} elapsed)`)
        } else {
          setCurrentStep('Finalizing')
          setStatusMessage('Almost done, finalizing video...')
        }
        
        // Update time remaining
        const remaining = Math.max(0, Math.ceil(estimatedProcessingTime - elapsed))
        const remMins = Math.floor(remaining / 60)
        const remSecs = remaining % 60
        setEstimatedTimeRemaining(remaining)
      }
    }, 1000)
    
    try {
      // Prepare form data
      const formData = new FormData()
      formData.append('video', videoFile)
      formData.append('threshold', threshold.toString())
      formData.append('minDuration', minSilenceDuration.toString())
      
      // Upload and process on server
      const response = await fetch('/api/process-video', {
        method: 'POST',
        body: formData,
      })
      
      // Stop progress animation
      if (progressInterval) clearInterval(progressInterval)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.details || 'Processing failed')
      }
      
      setProgress(95)
      setCurrentStep('Finalizing')
      setStatusMessage('Downloading processed video...')
      
      // Get duration metadata from headers
      const originalDuration = parseFloat(response.headers.get('X-Original-Duration') || '0')
      const processedDuration = parseFloat(response.headers.get('X-Processed-Duration') || '0')
      const removedDuration = parseFloat(response.headers.get('X-Removed-Duration') || '0')
      
      console.log('Processing complete:', { originalDuration, processedDuration, removedDuration })
      
      // Get video blob
      const blob = await response.blob()
      console.log('Blob received:', blob.size, 'bytes')
      
      if (blob.size === 0) {
        throw new Error('Received empty video file from server')
      }
      
      const url = URL.createObjectURL(blob)
      setProcessedVideoUrl(url)
      
      // Calculate processing stats (handle edge cases)
      const processingTime = (Date.now() - processingStartTime.current) / 1000
      const reductionPercent = originalDuration > 0 
        ? ((removedDuration / originalDuration) * 100).toFixed(1) 
        : '0'
      
      setProcessingStats({
        originalDuration: originalDuration || 0,
        processedDuration: processedDuration || 0,
        removedDuration: removedDuration || 0,
        processingTime,
        reductionPercent,
        originalSize: videoMetadata?.size || 0,
        processedSize: blob.size
      })
      
      // Save to history and last used settings
      addToHistory(videoFile.name, {
        originalDuration: originalDuration || 0,
        processedDuration: processedDuration || 0,
        reductionPercent
      }, {
        threshold,
        minDuration: minSilenceDuration,
        preset: activePreset
      })
      
      saveLastUsedSettings({
        threshold,
        minDuration: minSilenceDuration,
        preset: activePreset
      })
      
      // Increment daily usage on successful processing
      incrementDailyUsage()
      
      setProgress(100)
      setCurrentStep('Complete')
      const message = removedDuration > 0 
        ? `Complete! Removed ${removedDuration.toFixed(1)}s of silence (${reductionPercent}% reduction). Video shortened from ${originalDuration.toFixed(1)}s to ${processedDuration.toFixed(1)}s.`
        : `Complete! No significant silence detected. Video is ready for download.`
      setStatusMessage(message)
      setEstimatedTimeRemaining(null)
      
    } catch (error) {
      // Stop progress animation on error
      if (progressInterval) clearInterval(progressInterval)
      
      console.error('Error processing video:', error)
      
      // Provide user-friendly error messages
      let errorMessage = 'An error occurred during processing.'
      
      if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = 'Network error: Please check your connection and try again.'
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Processing timeout: Video may be too large. Try a shorter video.'
      } else if (error.message.includes('format') || error.message.includes('codec')) {
        errorMessage = 'Unsupported format: Please convert your video to MP4 and try again.'
      } else if (error.message.includes('memory')) {
        errorMessage = 'Out of memory: Video file is too large. Try a smaller file.'
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`
      }
      
      setStatusMessage(errorMessage)
      setProgress(0)
      setCurrentStep('')
      setEstimatedTimeRemaining(null)
      
      // Show retry suggestion
      setTimeout(() => {
        if (!processing) {
          setStatusMessage(`${errorMessage} - Click "Remove Silence" to retry.`)
        }
      }, 3000)
    } finally {
      setProcessing(false)
    }
  }

  // Download processed video (Safari-compatible)
  const downloadVideo = () => {
    console.log('Download button clicked!')
    console.log('processedVideoUrl:', processedVideoUrl)
    
    if (!processedVideoUrl) {
      console.error('No processed video URL available')
      setStatusMessage('Error: No processed video available to download')
      return
    }
    
    try {
      // Safari-compatible download: Use link with target=_blank
      const a = document.createElement('a')
      a.href = processedVideoUrl
      a.download = `processed_${videoFile?.name || 'video.mp4'}`
      a.target = '_blank'  // Safari needs this
      a.rel = 'noopener noreferrer'
      
      // Safari requires the link to be in DOM and clicked synchronously
      document.body.appendChild(a)
      
      // For Safari: Use MouseEvent instead of click()
      const clickEvent = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true
      })
      
      console.log('Triggering download:', a.download)
      a.dispatchEvent(clickEvent)
      
      // Cleanup after a delay
      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(processedVideoUrl)
      }, 100)
      
      setStatusMessage('Download started! Check your Downloads folder.')
      console.log('Download triggered successfully')
    } catch (error) {
      console.error('Download error:', error)
      setStatusMessage(`Download failed: ${error.message}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100">
      {/* Hidden video element for metadata extraction */}
      <video 
        ref={metadataVideoRef} 
        style={{ display: 'none' }} 
        preload="metadata"
      />
      
      <div className="container mx-auto px-4 py-4 md:py-8 max-w-5xl">
        {/* User Auth & Plan Badge */}
        <div className="flex justify-between items-center mb-2">
          {/* User Login/Profile */}
          <div>
            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">{user.email}</span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                >
                  <LogOut className="w-3 h-3" />
                  Sign out
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 border border-slate-700 hover:border-blue-500 rounded-lg text-sm text-slate-300 transition-all"
              >
                <LogIn className="w-4 h-4" />
                Sign in
              </button>
            )}
          </div>
          
          {/* Plan Badge */}
          {isPro ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-yellow-600 to-amber-600 rounded-full text-sm font-medium">
              <Crown className="w-4 h-4" />
              PRO Lifetime
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="text-sm text-slate-400">
                {getRemainingVideos()}/{planLimits.videosPerDay} videos today
              </div>
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-full text-sm font-medium transition-all"
              >
                <Zap className="w-4 h-4" />
                Upgrade to Pro
              </button>
            </div>
          )}
        </div>
        
        {/* Header */}
        <div className="text-center mb-6 md:mb-8">
          <img 
            src="/quietcutter-logo.png" 
            alt="QuietCutter - Make every second count" 
            className="h-36 md:h-48 mx-auto mb-4"
          />
          
          {/* Quick Action Buttons */}
          <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
            <button
              onClick={() => { setShowHistory(!showHistory); setShowSavedSettings(false); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                showHistory 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-800 border border-slate-700 text-slate-300 hover:border-blue-500'
              }`}
            >
              <History className="w-4 h-4" />
              History
              {processingHistory.length > 0 && (
                <span className="bg-slate-700 text-xs px-1.5 rounded-full">{processingHistory.length}/{SHARED_LIMITS.maxHistoryItems}</span>
              )}
            </button>
            <button
              onClick={() => { setShowSavedSettings(!showSavedSettings); setShowHistory(false); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                showSavedSettings 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-800 border border-slate-700 text-slate-300 hover:border-blue-500'
              }`}
            >
              <Star className="w-4 h-4" />
              Saved
              {savedSettings.length > 0 && (
                <span className="bg-slate-700 text-xs px-1.5 rounded-full">
                  {savedSettings.length}/{SHARED_LIMITS.maxSavedSettings}
                </span>
              )}
            </button>
            {lastUsedSettings && (
              <button
                onClick={applyLastUsedSettings}
                disabled={processing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-green-900/30 border border-green-700/50 text-green-400 hover:bg-green-900/50 disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                Last Settings
              </button>
            )}
          </div>
        </div>
        
        {/* History Panel */}
        {showHistory && (
          <Card className="mb-6 bg-slate-800/50 border-slate-700">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-slate-100 flex items-center gap-2">
                    <History className="w-5 h-5" />
                    Processing History
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Last {processingHistory.length} processed videos
                  </CardDescription>
                </div>
                {processingHistory.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {processingHistory.length === 0 ? (
                <p className="text-slate-500 text-center py-4">No processing history yet</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {processingHistory.map((item) => (
                    <div 
                      key={item.id}
                      className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg border border-slate-700"
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-200 truncate">{item.fileName}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-2 mt-1">
                          <Clock className="w-3 h-3" />
                          {new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-semibold text-green-400">-{item.reductionPercent}%</div>
                          <div className="text-xs text-slate-400">
                            {item.originalDuration.toFixed(1)}s → {item.processedDuration.toFixed(1)}s
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setThreshold(item.settings.threshold)
                            setMinSilenceDuration(item.settings.minDuration)
                            setActivePreset(item.settings.preset || 'custom')
                            setShowHistory(false)
                          }}
                          className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                        >
                          Use Settings
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* Saved Settings Panel */}
        {showSavedSettings && (
          <Card className="mb-6 bg-slate-800/50 border-slate-700">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-slate-100 flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    Saved Settings
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Your favorite presets
                  </CardDescription>
                </div>
                <button
                  onClick={saveCurrentSettings}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  <Star className="w-4 h-4" />
                  Save Current
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {savedSettings.length === 0 ? (
                <p className="text-slate-500 text-center py-4">No saved settings yet. Click "Save Current" to save your first preset.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {savedSettings.map((setting) => (
                    <div 
                      key={setting.id}
                      className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg border border-slate-700"
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-200">{setting.name}</div>
                        <div className="text-xs text-slate-400 mt-1">
                          {setting.threshold}dB • {setting.minDuration}s min duration
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => applySavedSetting(setting)}
                          className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                        >
                          Apply
                        </button>
                        <button
                          onClick={() => deleteSavedSetting(setting.id)}
                          className="px-2 py-1 text-xs text-red-400 hover:bg-red-900/20 rounded"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* Upload Section */}
        <Card className="mb-6 bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-100">Upload Video</CardTitle>
            <CardDescription className="text-slate-400">
              Drag and drop your video file or click to browse
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 transition-all ${
                dragActive
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-slate-600 hover:border-slate-500 bg-slate-900/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                className="hidden"
              />
              
              <div className="flex flex-col items-center justify-center text-center cursor-pointer">
                {videoFile ? (
                  <>
                    <FileVideo className="w-16 h-16 text-green-500 mb-4" />
                    <p className="text-slate-200 font-medium mb-2">{videoFile.name}</p>
                    <p className="text-slate-400 text-sm">
                      {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className="w-16 h-16 text-slate-500 mb-4" />
                    <p className="text-slate-300 mb-2">
                      <span className="font-semibold text-blue-400">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-slate-500 text-sm">MP4, AVI, MOV, MKV supported</p>
                  </>
                )}
              </div>
            </div>

            {/* Preset Buttons */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Quick Presets
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(presets).filter(([key]) => key !== 'custom').map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => applyPreset(key)}
                    disabled={processing}
                    className={`p-3 rounded-lg border transition-all ${
                      activePreset === key
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-blue-500 hover:bg-slate-750'
                    } ${processing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="text-2xl mb-1">{preset.icon}</div>
                    <div className="text-xs font-semibold">{preset.name}</div>
                  </button>
                ))}
              </div>
              
              {/* Active Preset Info Box */}
              {activePreset !== 'custom' && (
                <div className="mt-4 p-4 bg-blue-900/20 border border-blue-700/30 rounded-lg">
                  <div className="text-base font-semibold text-blue-300 mb-2">
                    {presets[activePreset].icon} {presets[activePreset].name}
                  </div>
                  <p className="text-base text-slate-300 mb-3">
                    {presets[activePreset].description}
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-slate-800/50 p-2 rounded">
                      <div className="text-slate-400 text-xs">Threshold</div>
                      <div className="text-blue-300 font-semibold">{presets[activePreset].threshold}dB</div>
                    </div>
                    <div className="bg-slate-800/50 p-2 rounded">
                      <div className="text-slate-400 text-xs">Min Duration</div>
                      <div className="text-blue-300 font-semibold">{presets[activePreset].duration}s</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Manual Controls */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Manual Adjustment
              </label>
              <button
                onClick={() => applyPreset('custom')}
                disabled={processing}
                className={`w-full p-2 mb-3 rounded-lg border text-sm transition-all ${
                  activePreset === 'custom'
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-blue-500'
                } ${processing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                ⚙️ Custom Settings
              </button>
              
              {activePreset === 'custom' && (
                <div className="space-y-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                  {/* Threshold Control */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Silence Threshold: {threshold}dB
                    </label>
                    <input
                      type="range"
                      min="-60"
                      max="-10"
                      value={threshold}
                      onChange={(e) => setThreshold(parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      disabled={processing}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Lower values detect more silence (-60dB quietest, -10dB loudest)
                    </p>
                  </div>

                  {/* Duration Control */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Minimum Silence Duration: {minSilenceDuration.toFixed(1)}s
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="2.0"
                      step="0.1"
                      value={minSilenceDuration}
                      onChange={(e) => setMinSilenceDuration(parseFloat(e.target.value))}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      disabled={processing}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Only remove silence longer than this duration
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Process Button */}
            <Button
              onClick={processVideo}
              disabled={!videoFile || !loaded || processing}
              className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white h-12 text-base font-semibold"
            >
              {processing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  Remove Silence
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Video Information Display */}
        {videoMetadata && (
          <Card className="mb-6 bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-100">Video Information</CardTitle>
              <CardDescription className="text-slate-400">
                Original video details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-900/50 p-3 rounded-lg">
                  <div className="text-xs text-slate-500 mb-1">Duration</div>
                  <div className="text-lg font-semibold text-slate-200">
                    {videoMetadata.duration > 0 
                      ? `${Math.floor(videoMetadata.duration / 60)}:${String(Math.floor(videoMetadata.duration % 60)).padStart(2, '0')}`
                      : 'Loading...'}
                  </div>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-lg">
                  <div className="text-xs text-slate-500 mb-1">Resolution</div>
                  <div className="text-lg font-semibold text-slate-200">
                    {videoMetadata.width > 0 && videoMetadata.height > 0
                      ? `${videoMetadata.width}x${videoMetadata.height}`
                      : 'Loading...'}
                  </div>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-lg">
                  <div className="text-xs text-slate-500 mb-1">File Size</div>
                  <div className="text-lg font-semibold text-slate-200">
                    {(videoMetadata.size / (1024 * 1024)).toFixed(2)} MB
                  </div>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-lg">
                  <div className="text-xs text-slate-500 mb-1">Format</div>
                  <div className="text-lg font-semibold text-slate-200">
                    {videoMetadata.type ? videoMetadata.type.split('/')[1]?.toUpperCase() || 'VIDEO' : 'VIDEO'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress Section */}
        {(processing || processedVideoUrl) && (
          <Card className="mb-6 bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-100">Processing Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Step-by-step progress */}
                {processing && currentStep && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${currentStep === 'Uploading' ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`} />
                      <span className={currentStep === 'Uploading' ? 'text-blue-400' : 'text-slate-500'}>Uploading</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${currentStep === 'Detecting Silence' ? 'bg-blue-500 animate-pulse' : currentStep === 'Uploading' ? 'bg-slate-600' : 'bg-green-500'}`} />
                      <span className={currentStep === 'Detecting Silence' ? 'text-blue-400' : currentStep === 'Uploading' ? 'text-slate-500' : 'text-slate-500'}>Detecting</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${currentStep === 'Cutting Segments' ? 'bg-blue-500 animate-pulse' : ['Uploading', 'Detecting Silence'].includes(currentStep) ? 'bg-slate-600' : 'bg-green-500'}`} />
                      <span className={currentStep === 'Cutting Segments' ? 'text-blue-400' : ['Uploading', 'Detecting Silence'].includes(currentStep) ? 'text-slate-500' : 'text-slate-500'}>Cutting</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${currentStep === 'Finalizing' ? 'bg-blue-500 animate-pulse' : currentStep === 'Complete' ? 'bg-green-500' : 'bg-slate-600'}`} />
                      <span className={currentStep === 'Finalizing' ? 'text-blue-400' : currentStep === 'Complete' ? 'text-green-400' : 'text-slate-500'}>Finalizing</span>
                    </div>
                  </div>
                )}
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-slate-400">{statusMessage}</span>
                    <span className="text-sm font-medium text-slate-300">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  
                  {/* Time estimate */}
                  {estimatedTimeRemaining && processing && (
                    <div className="mt-2 text-xs text-slate-500">
                      Estimated time remaining: ~{estimatedTimeRemaining}s
                    </div>
                  )}
                </div>

                {processedVideoUrl && (
                  <div className="pt-4 space-y-3">
                    {/* Processing Statistics */}
                    {processingStats && (
                      <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-4">
                        <div className="text-sm font-semibold text-green-300 mb-3">Processing Results</div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          <div>
                            <div className="text-xs text-slate-400">Time Saved</div>
                            <div className="text-lg font-semibold text-green-400">{processingStats.removedDuration.toFixed(1)}s</div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-400">Reduction</div>
                            <div className="text-lg font-semibold text-green-400">{processingStats.reductionPercent}%</div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-400">Processing Time</div>
                            <div className="text-lg font-semibold text-blue-400">{processingStats.processingTime.toFixed(1)}s</div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-400">Original</div>
                            <div className="text-sm font-semibold text-slate-300">{processingStats.originalDuration.toFixed(1)}s</div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-400">Processed</div>
                            <div className="text-sm font-semibold text-slate-300">{processingStats.processedDuration.toFixed(1)}s</div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-400">File Size</div>
                            <div className="text-sm font-semibold text-slate-300">
                              {(processingStats.processedSize / (1024 * 1024)).toFixed(2)} MB
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <Button
                      onClick={downloadVideo}
                      className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-base font-semibold"
                    >
                      <Download className="w-5 h-5 mr-2" />
                      Download Processed Video
                    </Button>
                    <div className="text-xs text-slate-400 text-center space-y-1">
                      <p>Click above to save the processed video to your device</p>
                      <p className="text-slate-500">
                        Safari users: If download doesn't start, the video will open in a new tab.
                        Right-click the video and select "Download Video" or "Save Video As..."
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Video Previews - Before/After Comparison */}
        {videoFile && processedVideoUrl && (
          <Card className="mb-6 bg-slate-800/50 border-slate-700">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-slate-100">Video Comparison</CardTitle>
                  <CardDescription className="text-slate-400">
                    Compare original and processed videos
                  </CardDescription>
                </div>
                <button
                  onClick={() => setComparisonMode(!comparisonMode)}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg"
                >
                  {comparisonMode ? 'Stack View' : 'Side-by-Side'}
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className={`grid ${comparisonMode ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                {/* Original Video */}
                <div>
                  <div className="text-sm font-medium text-slate-300 mb-2">
                    Original {videoMetadata && videoMetadata.duration > 0 && `(${Math.floor(videoMetadata.duration / 60)}:${String(Math.floor(videoMetadata.duration % 60)).padStart(2, '0')})`}
                  </div>
                  <video
                    ref={videoPreviewRef}
                    controls
                    className="w-full rounded-lg bg-black"
                    key={videoFile.name}
                    onLoadedMetadata={(e) => {
                      const video = e.target
                      if (video.duration && video.videoWidth) {
                        setVideoMetadata(prev => ({
                          ...prev,
                          duration: video.duration,
                          width: video.videoWidth,
                          height: video.videoHeight
                        }))
                      }
                    }}
                  >
                    <source src={URL.createObjectURL(videoFile)} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
                
                {/* Processed Video */}
                <div>
                  <div className="text-sm font-medium text-green-400 mb-2">
                    Processed {processingStats && `(${Math.floor(processingStats.processedDuration / 60)}:${String(Math.floor(processingStats.processedDuration % 60)).padStart(2, '0')})`}
                    {processingStats && ` - ${processingStats.reductionPercent}% shorter`}
                  </div>
                  <video
                    ref={processedVideoRef}
                    controls
                    className="w-full rounded-lg bg-black"
                    key="processed-video"
                  >
                    <source src={processedVideoUrl} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-400 text-center">
                {comparisonMode ? 'Side-by-side comparison mode (press C to toggle)' : 'Stacked view (press C for side-by-side)'}
              </p>
            </CardContent>
          </Card>
        )}
        
        {/* Original Video Preview (when no processed video yet) */}
        {videoFile && !processedVideoUrl && (
          <Card className="mb-6 bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-100">Original Video Preview</CardTitle>
              <CardDescription className="text-slate-400">
                Your uploaded video before processing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <video
                ref={videoPreviewRef}
                controls
                className="w-full rounded-lg bg-black"
                key={videoFile.name}
                onLoadedMetadata={(e) => {
                  // Fallback metadata extraction from visible video element
                  const video = e.target
                  if (video.duration && video.videoWidth) {
                    setVideoMetadata(prev => ({
                      ...prev,
                      duration: video.duration,
                      width: video.videoWidth,
                      height: video.videoHeight
                    }))
                  }
                }}
              >
                <source src={URL.createObjectURL(videoFile)} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </CardContent>
          </Card>
        )}

        {/* Info Footer */}
        <div className="mt-8 text-center text-slate-500 text-sm space-y-2">
          <p>All processing happens on your server. Videos are deleted after processing.</p>
          <p className="mt-1">Powered by FFmpeg</p>
          <button
            onClick={() => setShowKeyboardHelp(true)}
            className="text-blue-400 hover:text-blue-300 text-xs mt-2"
          >
            Press ? for keyboard shortcuts
          </button>
          
          {/* Safari compatibility note */}
          <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700/30 rounded-lg text-blue-300 text-xs">
            <p className="font-medium mb-1">💡 Browser Compatibility:</p>
            <p><strong>Recommended:</strong> Chrome 92+, Edge 92+, Firefox 95+</p>
            <p className="mt-1"><strong>Safari:</strong> Safari 15.2+ supported (macOS Monterey or iOS 15.2+)</p>
          </div>
        </div>
      </div>
      
      {/* Keyboard Shortcuts Overlay */}
      {showKeyboardHelp && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowKeyboardHelp(false)}>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-100">Keyboard Shortcuts</h3>
              <button onClick={() => setShowKeyboardHelp(false)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-300">Upload Video</span>
                <kbd className="px-2 py-1 bg-slate-700 rounded text-sm">U</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Remove Silence</span>
                <kbd className="px-2 py-1 bg-slate-700 rounded text-sm">R</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Download Video</span>
                <kbd className="px-2 py-1 bg-slate-700 rounded text-sm">D</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Toggle Comparison</span>
                <kbd className="px-2 py-1 bg-slate-700 rounded text-sm">C</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Processing History</span>
                <kbd className="px-2 py-1 bg-slate-700 rounded text-sm">H</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Saved Settings</span>
                <kbd className="px-2 py-1 bg-slate-700 rounded text-sm">S</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Last Used Settings</span>
                <kbd className="px-2 py-1 bg-slate-700 rounded text-sm">L</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Preset 1-4</span>
                <kbd className="px-2 py-1 bg-slate-700 rounded text-sm">1-4</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">This Help</span>
                <kbd className="px-2 py-1 bg-slate-700 rounded text-sm">?</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Close Panels</span>
                <kbd className="px-2 py-1 bg-slate-700 rounded text-sm">Esc</kbd>
              </div>
            </div>
            <div className="mt-4 text-xs text-slate-400">
              Shortcuts work when not typing in input fields
            </div>
          </div>
        </div>
      )}
      
      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowUpgradeModal(false)}>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                <Crown className="w-6 h-6 text-yellow-500" />
                Upgrade to Pro
              </h3>
              <button onClick={() => setShowUpgradeModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-slate-400 mb-6">Unlock unlimited processing and premium features</p>
            
            {/* Pricing Cards */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Monthly */}
              <div className="bg-slate-900/50 border border-slate-600 rounded-lg p-4">
                <div className="text-sm text-slate-400 mb-1">Monthly</div>
                <div className="text-2xl font-bold text-slate-100 mb-3">$9<span className="text-sm font-normal text-slate-400">/mo</span></div>
                <button 
                  className="w-full py-2 px-4 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-all disabled:opacity-50"
                  onClick={() => handleCheckout('monthly')}
                  disabled={checkoutLoading}
                >
                  {checkoutLoading ? 'Loading...' : 'Subscribe'}
                </button>
              </div>
              
              {/* Lifetime */}
              <div className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 border-2 border-blue-500 rounded-lg p-4 relative">
                <div className="absolute -top-2 -right-2 bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                  BEST VALUE
                </div>
                <div className="text-sm text-blue-300 mb-1">Lifetime</div>
                <div className="text-2xl font-bold text-slate-100 mb-1">$49</div>
                <div className="text-xs text-slate-400 mb-3">One-time payment</div>
                <button 
                  className="w-full py-2 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                  onClick={() => handleCheckout('lifetime')}
                  disabled={checkoutLoading}
                >
                  {checkoutLoading ? 'Loading...' : 'Buy Lifetime'}
                </button>
              </div>
            </div>
            
            {/* Features Comparison */}
            <div className="bg-slate-900/30 rounded-lg p-4 mb-6">
              <div className="text-sm font-medium text-slate-300 mb-3">What you get with Pro:</div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 text-slate-300">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <div>
                    <span className="font-medium">Unlimited videos per day</span>
                    <span className="text-slate-500 ml-2">(vs 3/day free)</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-slate-300">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <div>
                    <span className="font-medium">Videos up to 2 hours</span>
                    <span className="text-slate-500 ml-2">(vs 10 min free)</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Already have license key */}
            <div className="text-center">
              <button 
                onClick={() => { setShowUpgradeModal(false); setShowLicenseModal(true); }}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                Already have a license key? Click here
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* License Key Modal */}
      {showLicenseModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowLicenseModal(false)}>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-500" />
                Activate License
              </h3>
              <button onClick={() => setShowLicenseModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-slate-400 mb-4">Enter your license key to unlock Pro features</p>
            
            <div className="space-y-4">
              <div>
                <input
                  type="text"
                  value={licenseKeyInput}
                  onChange={(e) => setLicenseKeyInput(e.target.value.toUpperCase())}
                  placeholder="LIFE-XXXX-XXXX-XXXX"
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none font-mono tracking-wider"
                />
                {licenseError && (
                  <p className="text-red-400 text-sm mt-2">{licenseError}</p>
                )}
              </div>
              
              <button
                onClick={activateLicenseKey}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-lg font-medium transition-all"
              >
                Activate License
              </button>
              
              <div className="text-center">
                <button 
                  onClick={() => { setShowLicenseModal(false); setShowUpgradeModal(true); }}
                  className="text-sm text-slate-400 hover:text-slate-300"
                >
                  Don't have a key? Get one here
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowLoginModal(false)}>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-500" />
                Sign In
              </h3>
              <button onClick={() => setShowLoginModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-slate-400 mb-4">Enter your email and we'll send you a magic sign-in link</p>
            
            <form onSubmit={handleSendMagicLink} className="space-y-4">
              <div>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  disabled={loginLoading}
                  required
                />
                {loginError && (
                  <p className="text-red-400 text-sm mt-2">{loginError}</p>
                )}
                {loginMessage && (
                  <p className="text-green-400 text-sm mt-2">{loginMessage}</p>
                )}
              </div>
              
              <button
                type="submit"
                disabled={loginLoading || !loginEmail}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loginLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Send Magic Link
                  </>
                )}
              </button>
              
              <p className="text-xs text-slate-500 text-center">
                No password needed. We'll email you a secure sign-in link.
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
