import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import type { Bug, BugScan } from '../types/database'
import './CameraScanner.css'

export function CameraScanner() {
  const { user } = useAuth()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [scannedBug, setScannedBug] = useState<Bug | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Handle video stream attachment
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
      videoRef.current.play().catch(err => {
        console.error('Error playing video:', err)
        setError('Failed to start video playback')
      })
    }
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }
  }, [stream])

  const startCamera = async () => {
    try {
      // Stop any existing stream first
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
      
      // Try with back camera first (mobile), fallback to any camera
      let mediaStream: MediaStream | null = null
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment', // Use back camera on mobile
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        })
      } catch (envError) {
        // Fallback to any available camera (for desktop)
        console.log('Back camera not available, trying default camera')
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        })
      }
      
      if (mediaStream) {
        setStream(mediaStream)
        setError(null)
      }
    } catch (err: any) {
      const errorMessage = err.name === 'NotAllowedError' 
        ? 'Camera permission denied. Please allow camera access.'
        : err.name === 'NotFoundError'
        ? 'No camera found on this device.'
        : 'Unable to access camera. Please check permissions.'
      setError(errorMessage)
      console.error('Camera error:', err)
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context?.drawImage(video, 0, 0)

    return canvas.toDataURL('image/jpeg')
  }

  const scanBug = async () => {
    if (!user) return

    setIsScanning(true)
    setLoading(true)
    setError(null)

    try {
      // Capture photo
      const imageData = capturePhoto()
      if (!imageData) {
        throw new Error('Failed to capture image')
      }

      // For POC: Simulate bug detection
      // In production, you'd use ML/AI to identify the bug
      const detectedBug = await detectBug(imageData)

      if (detectedBug) {
        // Save scan to database
        const { data: scan, error: scanError } = await supabase
          .from('bug_scans')
          .insert({
            user_id: user.id,
            bug_id: detectedBug.id,
            image_url: imageData, // In production, upload to storage first
          })
          .select()
          .single()

        if (scanError) throw scanError

        // Update user score
        await supabase.rpc('increment_user_score', {
          user_id: user.id,
          points: detectedBug.points
        })

        setScannedBug(detectedBug)
        
        // Check for badge achievements
        checkBadges(user.id)
      } else {
        setError('No bug detected. Try scanning a different angle.')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to scan bug')
      console.error('Scan error:', err)
    } finally {
      setLoading(false)
      setIsScanning(false)
    }
  }

  // POC: Simulate bug detection by randomly selecting from database
  // In production, replace with actual ML model or API
  const detectBug = async (imageData: string): Promise<Bug | null> => {
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Get all bugs from database and randomly select one
      const { data: bugs, error } = await supabase
        .from('bugs')
        .select('*')
        .limit(100)

      if (error) {
        console.error('Error fetching bugs:', error)
        return null
      }

      if (!bugs || bugs.length === 0) {
        console.error('No bugs found in database')
        return null
      }

      // Randomly select a bug for POC
      const randomBug = bugs[Math.floor(Math.random() * bugs.length)]
      return randomBug as Bug
    } catch (err) {
      console.error('Error in detectBug:', err)
      return null
    }
  }

  const checkBadges = async (userId: string) => {
    try {
      // Call the database function to check and award badges
      const { error } = await supabase.rpc('check_and_award_badges', {
        p_user_id: userId
      })
      if (error) {
        console.error('Error checking badges:', error)
      }
    } catch (err) {
      console.error('Error in checkBadges:', err)
    }
  }

  const handleNewScan = () => {
    setScannedBug(null)
    setError(null)
  }

  return (
    <div className="camera-scanner">
      <div className="scanner-header">
        <h2>Scan a Bug</h2>
        {!stream && (
          <button onClick={startCamera} className="btn-primary">
            Start Camera
          </button>
        )}
        {stream && (
          <button onClick={stopCamera} className="btn-secondary">
            Stop Camera
          </button>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {scannedBug ? (
        <div className="scan-result">
          <div className="result-card">
            <h3>Bug Scanned! 🎉</h3>
            <div className="bug-info">
              <h4>{scannedBug.name}</h4>
              <p className="scientific-name">{scannedBug.scientific_name}</p>
              <div className="points-badge">
                +{scannedBug.points} points
              </div>
              <div className={`rarity-badge rarity-${scannedBug.rarity}`}>
                {scannedBug.rarity}
              </div>
            </div>
            <button onClick={handleNewScan} className="btn-primary">
              Scan Another Bug
            </button>
          </div>
        </div>
      ) : (
        <div className="camera-container">
          {stream ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="camera-video"
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              <button
                onClick={scanBug}
                disabled={loading || isScanning}
                className="scan-button"
              >
                {loading ? 'Scanning...' : '📸 Scan Bug'}
              </button>
            </>
          ) : (
            <div className="camera-placeholder">
              <p>Click "Start Camera" to begin scanning</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

