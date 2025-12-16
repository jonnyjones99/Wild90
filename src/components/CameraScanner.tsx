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
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [challengeProgress, setChallengeProgress] = useState<{
    challengeId: string
    name: string
    icon: string
    current: number
    target: number
  } | null>(null)

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
      
      // Store captured image for display
      setCapturedImage(imageData)

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
        
        // Trigger haptic feedback on successful scan
        triggerHapticFeedback('success')
        
        // Check if this bug contributes to a community challenge and load progress
        checkChallengeContribution(detectedBug)
        
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
    setCapturedImage(null)
    setChallengeProgress(null)
    triggerHapticFeedback('light')
    
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
  const triggerHapticFeedback = (type: 'success' | 'error' | 'light' | 'medium' | 'heavy') => {
    if ('vibrate' in navigator) {
      try {
        switch (type) {
          case 'success':
            // Success pattern: medium, pause, light
            navigator.vibrate([50, 30, 50])
            break
          case 'error':
            navigator.vibrate([100, 50, 100])
            break
          case 'light':
            navigator.vibrate(10)
            break
          case 'medium':
            navigator.vibrate(50)
            break
          case 'heavy':
            navigator.vibrate(100)
            break
        }
      } catch (err) {
        // Haptics not supported or failed
        console.log('Haptic feedback not available')
      }
    }
  }

  const checkChallengeContribution = async (bug: Bug) => {
    const bugNameLower = bug.name.toLowerCase()
    
    // Determine which challenge this bug contributes to
    let challengeId: string | null = null
    let challengeName = ''
    let challengeIcon = ''
    
    if (bugNameLower.includes('butterfly')) {
      challengeId = 'butterfly-challenge'
      challengeName = 'Butterfly Migration'
      challengeIcon = '🦋'
    } else if (bugNameLower.includes('bee') || bugNameLower.includes('honeybee')) {
      challengeId = 'bee-challenge'
      challengeName = 'Bee Colony'
      challengeIcon = '🐝'
    } else if (['rare', 'epic', 'legendary'].includes(bug.rarity)) {
      challengeId = 'rare-challenge'
      challengeName = 'Rare Discovery'
      challengeIcon = '✨'
    }
    
    if (challengeId) {
      // Load current progress for this challenge
      await loadChallengeProgress(challengeId, challengeName, challengeIcon)
    }
  }

  const loadChallengeProgress = async (challengeId: string, challengeName: string, challengeIcon: string) => {
    try {
      let current = 0
      
      if (challengeId === 'rare-challenge') {
        // Count rare/epic/legendary bugs
        const { data: rareBugs, error: rareBugsError } = await supabase
          .from('bugs')
          .select('id')
          .in('rarity', ['rare', 'epic', 'legendary'])

        if (!rareBugsError && rareBugs && rareBugs.length > 0) {
          const rareBugIds = rareBugs.map(b => b.id)
          const { data: scans, error: scansError } = await supabase
            .from('bug_scans')
            .select('bug_id')
            .in('bug_id', rareBugIds)

          if (!scansError && scans) {
            const distinctBugs = new Set(scans.map(scan => scan.bug_id))
            current = distinctBugs.size
          }
        }
      } else {
        // Count specific bug type
        const bugType = challengeId === 'butterfly-challenge' ? 'butterfly' : 'bee'
        const { data: bugs, error: bugsError } = await supabase
          .from('bugs')
          .select('id, name')
          .ilike('name', `%${bugType}%`)

        if (!bugsError && bugs && bugs.length > 0) {
          const bugIds = bugs.map(b => b.id)
          const { data: scans, error: scansError } = await supabase
            .from('bug_scans')
            .select('bug_id')
            .in('bug_id', bugIds)

          if (!scansError && scans) {
            const distinctBugs = new Set(scans.map(scan => scan.bug_id))
            current = distinctBugs.size
          }
        }
      }

      // Set challenge progress (targets match CommunityChallenges component)
      const target = challengeId === 'butterfly-challenge' ? 30 : challengeId === 'bee-challenge' ? 50 : 20
      
      setChallengeProgress({
        challengeId,
        name: challengeName,
        icon: challengeIcon,
        current,
        target,
      })
    } catch (err) {
      console.error('Error loading challenge progress:', err)
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
            {!scannedBug && (
              <motion.button
                onClick={scanBug}
                disabled={loading || isScanning}
                className="scan-button"
                initial={{ x: '-50%', opacity: 0 }}
                animate={{ 
                  x: '-50%',
                  opacity: 1,
                  ...(loading ? {
                    boxShadow: [
                      "0 4px 12px rgba(0, 0, 0, 0.3), 0 0 0 0 rgba(101, 163, 13, 0.7)",
                      "0 4px 12px rgba(0, 0, 0, 0.3), 0 0 0 10px rgba(101, 163, 13, 0)",
                      "0 4px 12px rgba(0, 0, 0, 0.3), 0 0 0 0 rgba(101, 163, 13, 0.7)",
                    ]
                  } : {})
                }}
                whileHover={loading ? {} : { 
                  scale: 1.05,
                  x: '-50%'
                }}
                whileTap={loading ? {} : { 
                  scale: 0.95,
                  x: '-50%'
                }}
                transition={{ 
                  duration: loading ? 1.5 : 0.2,
                  repeat: loading ? Infinity : 0,
                  x: { duration: 0 },
                  opacity: { duration: 0.3 }
                }}
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
            )}
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
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 25
              }}
            >
              {/* Bug Image */}
              <motion.div
                className="bug-image-container"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 15,
                  delay: 0.2
                }}
              >
                {capturedImage ? (
                  <img
                    src={capturedImage}
                    alt={scannedBug.name}
                    className="bug-captured-image"
                  />
                ) : scannedBug.image_url ? (
                  <img
                    src={scannedBug.image_url}
                    alt={scannedBug.name}
                    className="bug-captured-image"
                  />
                ) : (
                  <div className="bug-image-placeholder-large">🐛</div>
                )}
                <div className="bug-image-overlay">
                  <motion.div
                    className="success-check"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 200,
                      damping: 15,
                      delay: 0.5
                    }}
                  >
                    ✓
                  </motion.div>
                </div>
              </motion.div>

              {/* Bug Info */}
              <div className="bug-info-section">
                <motion.h3
                  className="bug-name"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  {scannedBug.name}
                </motion.h3>

                <motion.p
                  className="scientific-name"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  {scannedBug.scientific_name}
                </motion.p>

                <div className="bug-stats-row">
                  <motion.div
                    className="points-badge"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 200,
                      damping: 15,
                      delay: 0.6
                    }}
                  >
                    <span className="points-icon">⭐</span>
                    <span className="points-value">+{scannedBug.points}</span>
                  </motion.div>

                  <motion.div
                    className={`rarity-badge rarity-${scannedBug.rarity}`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 200,
                      damping: 15,
                      delay: 0.7
                    }}
                  >
                    {scannedBug.rarity}
                  </motion.div>
                </div>
              </div>

              {/* Community Challenge Progress */}
              {challengeProgress && (
                <motion.div
                  className="challenge-progress-section"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                >
                  <div className="challenge-progress-header">
                    <span className="challenge-icon">{challengeProgress.icon}</span>
                    <div className="challenge-info">
                      <div className="challenge-title">Community Challenge</div>
                      <div className="challenge-name">{challengeProgress.name}</div>
                    </div>
                  </div>
                  <div className="challenge-progress-bar-container">
                    <motion.div
                      className="challenge-progress-bar-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((challengeProgress.current / challengeProgress.target) * 100, 100)}%` }}
                      transition={{ duration: 1, delay: 1, ease: "easeOut" }}
                    />
                  </div>
                  <div className="challenge-progress-stats">
                    <span className="progress-current">{challengeProgress.current}</span>
                    <span className="progress-separator">/</span>
                    <span className="progress-target">{challengeProgress.target}</span>
                    <span className="progress-contribution">✓ You contributed!</span>
                  </div>
                </motion.div>
              )}

              <div style={{ padding: '0 20px 24px', width: '100%', boxSizing: 'border-box' }}>
                <motion.button
                  onClick={handleNewScan}
                  className="scan-another-button"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: challengeProgress ? 1.1 : 0.8 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Scan Another Bug
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  )
}

