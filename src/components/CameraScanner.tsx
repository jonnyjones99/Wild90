import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import type { Bug, Badge } from '../types/database'
import { Confetti } from './Confetti'
import { BadgeNotification } from './BadgeNotification'
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
  const [flash, setFlash] = useState(false)
  const [earnedBadge, setEarnedBadge] = useState<Badge | null>(null)

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
      // Don't stop the stream here - only stop when explicitly stopping camera
      // This allows the stream to persist when switching views
    }
  }, [stream])

  // Keep video playing when camera view is shown
  useEffect(() => {
    if (!scannedBug && stream) {
      // When scan result is cleared, ensure video is visible and playing
      const playVideo = async () => {
        if (videoRef.current && stream) {
          // Check if stream is still active
          const tracks = stream.getVideoTracks()
          if (tracks.length === 0 || tracks[0].readyState !== 'live') {
            console.warn('Stream is not active, camera may need to be restarted')
            return
          }
          
          // Reattach stream if needed
          if (videoRef.current.srcObject !== stream) {
            videoRef.current.srcObject = stream
          }
          
          // Ensure video is playing
          try {
            if (videoRef.current.paused) {
              await videoRef.current.play()
            }
          } catch (err) {
            console.error('Error playing video:', err)
            // Retry once
            setTimeout(async () => {
              if (videoRef.current && stream) {
                try {
                  await videoRef.current.play()
                } catch (e) {
                  console.error('Retry play failed:', e)
                }
              }
            }, 300)
          }
        }
      }
      
      // Delay to ensure DOM is ready after display change
      const timeout = setTimeout(playVideo, 150)
      return () => clearTimeout(timeout)
    }
  }, [stream, scannedBug])

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
      videoRef.current.pause()
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
      // Flash effect
      setFlash(true)
      setTimeout(() => setFlash(false), 200)

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
        const { error: scanError } = await supabase
          .from('bug_scans')
          .insert({
            user_id: user.id,
            bug_id: detectedBug.id,
            image_url: imageData, // In production, upload to storage first
          })

        if (scanError) throw scanError

        // Get current badges before updating
        const { data: badgesBefore } = await supabase
          .from('user_badges')
          .select('badge_id')
          .eq('user_id', user.id)

        const badgeIdsBefore = new Set((badgesBefore || []).map(b => b.badge_id))

        // Update user score
        await supabase.rpc('increment_user_score', {
          user_id: user.id,
          points: detectedBug.points
        })

        setScannedBug(detectedBug)
        
        // Check for badge achievements with a small delay to let DB trigger complete
        setTimeout(async () => {
          await checkBadges(user.id, badgeIdsBefore)
        }, 500)
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
  const detectBug = async (_imageData: string): Promise<Bug | null> => {
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

  const checkBadges = async (userId: string, badgeIdsBefore: Set<string>) => {
    try {
      // Get current badges after potential award
      const { data: userBadges, error: fetchError } = await supabase
        .from('user_badges')
        .select('*, badge:badges(*)')
        .eq('user_id', userId)
        .order('earned_at', { ascending: false })

      if (fetchError) {
        console.error('Error fetching badges:', fetchError)
        return
      }

      // Find newly earned badges
      if (userBadges && userBadges.length > 0) {
        const newBadges = userBadges.filter(
          ub => !badgeIdsBefore.has(ub.badge_id) && ub.badge
        )

        // Show notification for the most recently earned badge
        if (newBadges.length > 0) {
          const latestBadge = newBadges[0].badge as Badge
          // Delay to show after scan result animation
          setTimeout(() => {
            setEarnedBadge(latestBadge)
          }, 2000)
        }
      }
    } catch (err) {
      console.error('Error in checkBadges:', err)
    }
  }

  const handleNewScan = async () => {
    setScannedBug(null)
    setError(null)
    
    // Small delay to ensure DOM is ready
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Ensure video continues playing when returning to camera view
    if (videoRef.current && stream) {
      // Reattach the stream
      videoRef.current.srcObject = stream
      
      // Force play
      try {
        await videoRef.current.play()
      } catch (err) {
        console.error('Error playing video after scan:', err)
        // If play fails, try again after a short delay
        setTimeout(async () => {
          if (videoRef.current && stream) {
            try {
              await videoRef.current.play()
            } catch (e) {
              console.error('Retry play failed:', e)
            }
          }
        }, 200)
      }
    }
  }

  // Test function to show badge notification (mock for testing)
  const testBadge = async () => {
    if (!user) return

    // Clear any existing badge first
    setEarnedBadge(null)
    
    // Small delay to ensure state clears
    await new Promise(resolve => setTimeout(resolve, 100))

    try {
      // Get a badge from the database to show (just for display)
      const { data: badges, error: badgeError } = await supabase
        .from('badges')
        .select('*')
        .limit(1)
        .single()

      if (badgeError || !badges) {
        // If no badge in DB, use a mock badge for testing
        const mockBadge: Badge = {
          id: 'test-badge-' + Date.now(),
          name: 'First Scan',
          description: 'Scan your first bug!',
          requirement_type: 'scan_count',
          requirement_value: '1',
          created_at: new Date().toISOString(),
        }
        setEarnedBadge(mockBadge)
        return
      }

      // Show the notification with a real badge (just for testing the UI)
      setEarnedBadge(badges as Badge)
    } catch (err) {
      console.error('Error testing badge:', err)
      // Fallback to mock badge
      const mockBadge: Badge = {
        id: 'test-badge-' + Date.now(),
        name: 'Test Badge',
        description: 'This is a test badge notification!',
        requirement_type: 'scan_count',
        requirement_value: '1',
        created_at: new Date().toISOString(),
      }
      setEarnedBadge(mockBadge)
    }
  }

  return (
    <div className="camera-scanner">
      <BadgeNotification
        badge={earnedBadge}
        onClose={() => setEarnedBadge(null)}
      />
      <div className="scanner-header">
        <h2>Wild90</h2>
        <div className="scanner-header-actions">
          {!stream && (
            <button onClick={startCamera} className="btn-primary">
              Start
            </button>
          )}
          {stream && (
            <button onClick={stopCamera} className="btn-secondary">
              Stop
            </button>
          )}
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Camera view - always visible, scan result overlays on top */}
      <div className="scanner-content">
        <div className="camera-container">
        {stream ? (
          <>
            <AnimatePresence>
              {flash && (
                <motion.div
                  className="camera-flash"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                />
              )}
            </AnimatePresence>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="camera-video"
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <motion.button
              onClick={scanBug}
              disabled={loading || isScanning}
              className="scan-button"
              whileHover={{ scale: loading ? 1 : 1.05 }}
              whileTap={{ scale: loading ? 1 : 0.95 }}
              animate={loading ? {
                boxShadow: [
                  "0 4px 12px rgba(0, 0, 0, 0.3), 0 0 0 0 rgba(102, 126, 234, 0.7)",
                  "0 4px 12px rgba(0, 0, 0, 0.3), 0 0 0 10px rgba(102, 126, 234, 0)",
                  "0 4px 12px rgba(0, 0, 0, 0.3), 0 0 0 0 rgba(102, 126, 234, 0.7)",
                ]
              } : {}}
              transition={{ duration: 1.5, repeat: loading ? Infinity : 0 }}
            >
              {loading ? (
                <>
                  <motion.span
                    className="scan-spinner"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                  />
                  Scanning...
                </>
              ) : (
                '📸 Scan Bug'
              )}
            </motion.button>
          </>
        ) : (
          <div className="camera-placeholder">
            <p>Click "Start Camera" to begin scanning</p>
          </div>
        )}
        </div>

        {/* Scan result - show on top when available */}
      <AnimatePresence>
        {scannedBug && (
          <motion.div
            key="result"
            className="scan-result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Confetti />
            <motion.div
              className="result-card"
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 25,
                delay: 0.2
              }}
            >
              <motion.div
                className="success-icon"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 15,
                  delay: 0.4
                }}
              >
                <svg
                  className="checkmark"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 52 52"
                >
                  <motion.circle
                    className="checkmark-circle"
                    cx="26"
                    cy="26"
                    r="25"
                    fill="none"
                    stroke="#4caf50"
                    strokeWidth="3"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                  />
                  <motion.path
                    className="checkmark-check"
                    fill="none"
                    stroke="#4caf50"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.1 27.2l7.1 7.2 16.7-16.8"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.3, delay: 1 }}
                  />
                </svg>
              </motion.div>

              <motion.h3
                className="result-title"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                Bug Scanned!
              </motion.h3>

              <div className="bug-info">
                <motion.h4
                  className="bug-name"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.9, type: "spring", stiffness: 200 }}
                >
                  {scannedBug.name}
                </motion.h4>

                <motion.p
                  className="scientific-name"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                >
                  {scannedBug.scientific_name}
                </motion.p>

                <motion.div
                  className="points-badge"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 200,
                    damping: 15,
                    delay: 1.1
                  }}
                >
                  +{scannedBug.points} points
                </motion.div>

                <motion.div
                  className={`rarity-badge rarity-${scannedBug.rarity}`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 200,
                    damping: 15,
                    delay: 1.3
                  }}
                >
                  {scannedBug.rarity}
                </motion.div>
              </div>

              <motion.button
                onClick={handleNewScan}
                className="btn-primary"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Scan Another Bug
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  )
}

