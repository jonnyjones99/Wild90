import { motion, AnimatePresence } from 'framer-motion'
import './ChallengeContributionIndicator.css'

interface ChallengeContributionIndicatorProps {
  challengeId: string
}

const CHALLENGE_INFO: Record<string, { icon: string; name: string }> = {
  'butterfly-challenge': { icon: '🦋', name: 'Butterfly Migration' },
  'bee-challenge': { icon: '🐝', name: 'Bee Colony' },
  'rare-challenge': { icon: '✨', name: 'Rare Discovery' },
}

export function ChallengeContributionIndicator({ challengeId }: ChallengeContributionIndicatorProps) {
  const challenge = CHALLENGE_INFO[challengeId]

  if (!challenge) return null

  return (
    <motion.div
      className="challenge-contribution-indicator"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 25,
      }}
    >
        <motion.div
          className="contribution-content"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 15,
            delay: 0.1,
          }}
        >
          <div className="contribution-icon">{challenge.icon}</div>
          <div className="contribution-text">
            <div className="contribution-title">Community Challenge!</div>
            <div className="contribution-message">
              You contributed to {challenge.name}
            </div>
          </div>
        </motion.div>
      </motion.div>
  )
}
