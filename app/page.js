'use client'

import { useState, useRef, useEffect } from 'react'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import { Button } from './components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Progress } from './components/ui/progress'
import { Upload, Download, Play, Loader2, Video, FileVideo } from 'lucide-react'

export default function VideoSilenceRemover() {
  const [loaded, setLoaded] = useState(false)
  const [videoFile, setVideoFile] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [processedVideoUrl, setProcessedVideoUrl] = useState('')
  const [duration, setDuration] = useState(0)
  const [dragActive, setDragActive] = useState(false)
  const [loadingFFmpeg, setLoadingFFmpeg] = useState(false)
  const [statusMessage, setStatusMessage] = useState('Ready to process video')
  const [threshold, setThreshold] = useState(-30)
  
  const ffmpegRef = useRef(null)
  const videoPreviewRef = useRef(null)
  const fileInputRef = useRef(null)

  // Load FFmpeg
  const loadFFmpeg = async () => {
    // Initialize FFmpeg only on client
    if (!ffmpegRef.current) {
      ffmpegRef.current = new FFmpeg()
    }
    
    const ffmpeg = ffmpegRef.current
    if (loaded) return
    
    setLoadingFFmpeg(true)
    setStatusMessage('Loading FFmpeg WebAssembly...')
    
    try {
      // Detect browser and check for required features
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
      const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined'
      const isCrossOriginIsolated = crossOriginIsolated
      
      if (!hasSharedArrayBuffer || !isCrossOriginIsolated) {
        const message = isSafari 
          ? 'Safari detected. Checking compatibility...'
          : 'Browser may have limited support for FFmpeg.wasm'
        setStatusMessage(message)
        console.warn('SharedArrayBuffer:', hasSharedArrayBuffer, 'crossOriginIsolated:', isCrossOriginIsolated)
      }
      
      // Use single-threaded core for better Safari compatibility
      const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd'
      
      ffmpeg.on('log', ({ message }) => {
        console.log(message)
        
        // Parse duration from FFmpeg output
        if (message.includes('Duration:')) {
          const match = message.match(/Duration: (\d{2}):(\d{2}):(\d{2})\.(\d{2})/)
          if (match) {
            const hours = parseInt(match[1])
            const minutes = parseInt(match[2])
            const seconds = parseInt(match[3])
            const totalSeconds = hours * 3600 + minutes * 60 + seconds
            setDuration(totalSeconds)
          }
        }
        
        // Parse progress from FFmpeg output
        if (message.includes('time=')) {
          const match = message.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/)
          if (match && duration > 0) {
            const hours = parseInt(match[1])
            const minutes = parseInt(match[2])
            const seconds = parseInt(match[3])
            const currentTime = hours * 3600 + minutes * 60 + seconds
            const progressPercent = Math.min((currentTime / duration) * 100, 100)
            setProgress(Math.round(progressPercent))
          }
        }
      })

      // Load FFmpeg with single-threaded core for better compatibility
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      })
      
      setLoaded(true)
      setStatusMessage('FFmpeg loaded successfully')
    } catch (error) {
      console.error('Failed to load FFmpeg:', error)
      setStatusMessage(`Failed to load FFmpeg: ${error.message}. Please refresh the page.`)
    } finally {
      setLoadingFFmpeg(false)
    }
  }

  // Auto-load FFmpeg on mount
  useEffect(() => {
    // Check if browser supports required features
    if (typeof window !== 'undefined') {
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
      const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined'
      const isCrossOriginIsolated = crossOriginIsolated
      
      // Check for SharedArrayBuffer support
      if (!isCrossOriginIsolated) {
        console.warn('crossOriginIsolated not available - FFmpeg may have limited functionality')
        if (isSafari) {
          setStatusMessage('Safari detected. Loading FFmpeg... (Safari 15.2+ required)')
        } else {
          setStatusMessage('Browser compatibility: Limited. Chrome/Edge recommended.')
        }
      }
      
      loadFFmpeg()
    }
  }, [])

  // Handle file selection
  const handleFileChange = (file) => {
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file)
      setProcessedVideoUrl('')
      setProgress(0)
      setStatusMessage(`Selected: ${file.name}`)
      
      // Create preview URL
      const url = URL.createObjectURL(file)
      if (videoPreviewRef.current) {
        videoPreviewRef.current.src = url
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

  // Process video to remove silence
  const processVideo = async () => {
    if (!videoFile || !loaded) return
    
    setProcessing(true)
    setProgress(0)
    setDuration(0)
    setStatusMessage('Processing video...')
    
    const ffmpeg = ffmpegRef.current
    
    try {
      const inputFileName = 'input.mp4'
      const outputFileName = 'output.mp4'
      
      setStatusMessage('Loading video file...')
      await ffmpeg.writeFile(inputFileName, await fetchFile(videoFile))
      setProgress(10)
      
      // Step 1: Detect silence and parse timestamps
      setStatusMessage('Detecting silent segments...')
      setProgress(20)
      
      let silenceRanges = []
      let currentSilenceStart = null
      
      // Listen for FFmpeg logs to capture silencedetect output
      const logHandler = ({ message }) => {
        // Parse silence_start
        if (message.includes('silence_start:')) {
          const match = message.match(/silence_start: ([\d.]+)/)
          if (match) {
            currentSilenceStart = parseFloat(match[1])
          }
        }
        // Parse silence_end
        if (message.includes('silence_end:') && currentSilenceStart !== null) {
          const match = message.match(/silence_end: ([\d.]+)/)
          if (match) {
            const silenceEnd = parseFloat(match[1])
            silenceRanges.push({ start: currentSilenceStart, end: silenceEnd })
            currentSilenceStart = null
          }
        }
        // Parse duration
        if (message.includes('Duration:')) {
          const match = message.match(/Duration: (\d{2}):(\d{2}):(\d{2})\.(\d{2})/)
          if (match) {
            const hours = parseInt(match[1])
            const minutes = parseInt(match[2])
            const seconds = parseInt(match[3])
            const totalSeconds = hours * 3600 + minutes * 60 + seconds
            setDuration(totalSeconds)
          }
        }
      }
      
      ffmpeg.on('log', logHandler)
      
      // Run silencedetect
      await ffmpeg.exec([
        '-i', inputFileName,
        '-af', `silencedetect=noise=${threshold}dB:d=0.5`,
        '-f', 'null',
        '-'
      ])
      
      ffmpeg.off('log', logHandler)
      
      setProgress(40)
      setStatusMessage(`Found ${silenceRanges.length} silent segments. Building cut filter...`)
      
      // Step 2: Build filter to keep only non-silent segments
      if (silenceRanges.length === 0) {
        setStatusMessage('No silence detected. Copying original video...')
        // No silence found, just copy
        await ffmpeg.exec([
          '-i', inputFileName,
          '-c', 'copy',
          '-y',
          outputFileName
        ])
      } else {
        // Build time ranges for non-silent segments
        let nonSilentRanges = []
        let lastEnd = 0
        
        silenceRanges.sort((a, b) => a.start - b.start)
        
        for (const silence of silenceRanges) {
          if (silence.start > lastEnd) {
            nonSilentRanges.push({ start: lastEnd, end: silence.start })
          }
          lastEnd = silence.end
        }
        
        // Add final segment if exists
        if (duration && lastEnd < duration) {
          nonSilentRanges.push({ start: lastEnd, end: duration })
        }
        
        setStatusMessage(`Removing ${silenceRanges.length} silent segments...`)
        setProgress(50)
        
        // Build select filter expression
        const videoSelect = nonSilentRanges
          .map(r => `between(t,${r.start},${r.end})`)
          .join('+')
        
        // Process with select filter to actually remove silence
        await ffmpeg.exec([
          '-i', inputFileName,
          '-vf', `select='${videoSelect}',setpts=N/FRAME_RATE/TB`,
          '-af', `aselect='${videoSelect}',asetpts=N/SR/TB`,
          '-y',
          outputFileName
        ])
      }
      
      setProgress(80)
      setStatusMessage('Reading processed video...')
      
      const data = await ffmpeg.readFile(outputFileName)
      const blob = new Blob([data], { type: 'video/mp4' })
      const url = URL.createObjectURL(blob)
      setProcessedVideoUrl(url)
      
      const removedDuration = silenceRanges.reduce((sum, r) => sum + (r.end - r.start), 0)
      setStatusMessage(`Complete! Removed ${removedDuration.toFixed(1)}s of silence from ${duration.toFixed(1)}s video.`)
      setProgress(100)
      
      await ffmpeg.deleteFile(inputFileName)
      await ffmpeg.deleteFile(outputFileName)
      
    } catch (error) {
      console.error('Error processing video:', error)
      setStatusMessage(`Error: ${error.message}`)
      setProgress(0)
    } finally {
      setProcessing(false)
    }
  }

  // Download processed video
  const downloadVideo = () => {
    if (!processedVideoUrl) return
    
    const a = document.createElement('a')
    a.href = processedVideoUrl
    a.download = `processed_${videoFile?.name || 'video.mp4'}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Video className="w-10 h-10 text-blue-500" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Video Silence Remover
            </h1>
          </div>
          <p className="text-slate-400 text-lg">
            Automatically detect and remove silent segments to shorten your videos
          </p>
          <p className="text-slate-500 text-sm mt-2">
            Uses FFmpeg silencedetect + select filters to actually cut out silence and reduce video duration
          </p>
        </div>

        {/* FFmpeg Loading Status */}
        {loadingFFmpeg && (
          <Card className="mb-6 bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                <p className="text-slate-300">Loading FFmpeg WebAssembly engine...</p>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* FFmpeg Status Card */}
        {!loadingFFmpeg && (
          <Card className={`mb-6 ${loaded ? 'bg-green-900/20 border-green-700' : 'bg-yellow-900/20 border-yellow-700'}`}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                {loaded ? (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <p className="text-green-400 font-medium">FFmpeg Loaded Successfully - Ready to Process Videos</p>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                    <p className="text-yellow-400 font-medium">{statusMessage}</p>
                  </>
                )}
              </div>
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

            {/* Threshold Control */}
            <div className="mt-6">
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

        {/* Progress Section */}
        {(processing || processedVideoUrl) && (
          <Card className="mb-6 bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-100">Processing Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-slate-400">{statusMessage}</span>
                    <span className="text-sm font-medium text-slate-300">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>

                {processedVideoUrl && (
                  <div className="pt-4">
                    <Button
                      onClick={downloadVideo}
                      className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-base font-semibold"
                    >
                      <Download className="w-5 h-5 mr-2" />
                      Download Processed Video
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Video Preview */}
        {videoFile && (
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
              >
                <source src={URL.createObjectURL(videoFile)} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </CardContent>
          </Card>
        )}
        
        {/* Processed Video Preview */}
        {processedVideoUrl && (
          <Card className="mb-6 bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-100">Processed Video Preview</CardTitle>
              <CardDescription className="text-slate-400">
                Your video after silence removal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <video
                controls
                className="w-full rounded-lg bg-black"
                key="processed-video"
              >
                <source src={processedVideoUrl} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
              <p className="mt-3 text-sm text-slate-400 text-center">
                Click the download button above to save this video
              </p>
            </CardContent>
          </Card>
        )}

        {/* Info Footer */}
        <div className="mt-8 text-center text-slate-500 text-sm space-y-2">
          <p>All processing happens in your browser. No data is uploaded to any server.</p>
          <p className="mt-1">Powered by FFmpeg WebAssembly</p>
          
          {/* Safari compatibility note */}
          <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700/30 rounded-lg text-blue-300 text-xs">
            <p className="font-medium mb-1">💡 Browser Compatibility:</p>
            <p><strong>Recommended:</strong> Chrome 92+, Edge 92+, Firefox 95+</p>
            <p className="mt-1"><strong>Safari:</strong> Safari 15.2+ supported (macOS Monterey or iOS 15.2+)</p>
            <p className="mt-1">Access: <strong className="text-blue-400">https://quietcutter.preview.emergentagent.com</strong></p>
          </div>
        </div>
      </div>
    </div>
  )
}
