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
      // Using single-threaded core for better compatibility with COEP headers
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

      // Load FFmpeg with multi-threaded core - using toBlobURL with jsdelivr CDN
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript'),
      })
      
      setLoaded(true)
      setStatusMessage('FFmpeg loaded successfully')
    } catch (error) {
      console.error('Failed to load FFmpeg:', error)
      setStatusMessage('Failed to load FFmpeg. Please refresh the page.')
    } finally {
      setLoadingFFmpeg(false)
    }
  }

  // Auto-load FFmpeg on mount
  useEffect(() => {
    loadFFmpeg()
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
      // Write input file to FFmpeg virtual filesystem
      const inputFileName = 'input.mp4'
      const outputFileName = 'output.mp4'
      
      setStatusMessage('Loading video file...')
      await ffmpeg.writeFile(inputFileName, await fetchFile(videoFile))
      
      setStatusMessage('Analyzing audio for silence...')
      
      // Use silenceremove filter to remove silent segments
      // stop_periods=-1: remove all silent periods
      // stop_duration=0.5: consider segments longer than 0.5s as silence
      // stop_threshold=-30dB: volume threshold for silence detection
      const filterComplex = `silenceremove=stop_periods=-1:stop_duration=0.5:stop_threshold=${threshold}dB`
      
      setStatusMessage('Removing silent segments...')
      
      await ffmpeg.exec([
        '-i', inputFileName,
        '-af', filterComplex,
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-b:a', '192k',
        outputFileName
      ])
      
      setStatusMessage('Reading processed video...')
      
      // Read the output file
      const data = await ffmpeg.readFile(outputFileName)
      
      // Create blob URL for download
      const blob = new Blob([data], { type: 'video/mp4' })
      const url = URL.createObjectURL(blob)
      setProcessedVideoUrl(url)
      
      setStatusMessage('Processing complete!')
      setProgress(100)
      
      // Clean up FFmpeg filesystem
      await ffmpeg.deleteFile(inputFileName)
      await ffmpeg.deleteFile(outputFileName)
      
    } catch (error) {
      console.error('Error processing video:', error)
      setStatusMessage('Error processing video. Please try again.')
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
            Remove silent segments from your videos using AI-powered audio analysis
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
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-100">Video Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <video
                ref={videoPreviewRef}
                controls
                className="w-full rounded-lg bg-black"
              />
            </CardContent>
          </Card>
        )}

        {/* Info Footer */}
        <div className="mt-8 text-center text-slate-500 text-sm">
          <p>All processing happens in your browser. No data is uploaded to any server.</p>
          <p className="mt-1">Powered by FFmpeg WebAssembly</p>
        </div>
      </div>
    </div>
  )
}
