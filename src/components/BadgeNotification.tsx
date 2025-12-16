import { motion, AnimatePresence } from 'framer-motion'
import type { Badge } from '../types/database'
import './BadgeNotification.css'

interface BadgeNotificationProps {
  badge: Badge | null
  onClose: () => void
}

export function BadgeNotification({ badge, onClose }: BadgeNotificationProps) {
  if (!badge) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, pointerEvents: 'none' }}>
      <AnimatePresence>
        {badge && (
          <>
            {/* Backdrop */}
            <motion.div
              className="badge-backdrop"
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={onClose}
            />

            {/* Notification Card */}
            <motion.div
              className="badge-notification"
              key="notification"
              initial={{ y: -200, opacity: 0, scale: 0.8 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -200, opacity: 0, scale: 0.8 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
              }}
              onClick={(e) => e.stopPropagation()}
            >
            {/* Shine effect */}
            <motion.div
              className="badge-shine"
              initial={{ x: '-100%' }}
              animate={{ x: '200%' }}
              transition={{
                duration: 1.5,
                delay: 0.5,
                ease: "easeInOut",
              }}
            />

            {/* Badge Icon */}
            <motion.div
              className="badge-icon-container"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ 
                scale: [0, 1.2, 1],
                rotate: [180, 0]
              }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 15,
                delay: 0.2,
              }}
            >
              {badge.icon_url ? (
                <motion.img
                  src={badge.icon_url}
                  alt={badge.name}
                  className="badge-icon-image"
                  animate={{
                    rotate: [0, 10, -10, 0],
                  }}
                  transition={{
                    duration: 0.5,
                    delay: 0.5,
                  }}
                />
              ) : (
                <motion.div
                  className="badge-icon"
                  animate={{
                    rotate: [0, 10, -10, 0],
                  }}
                  transition={{
                    duration: 0.5,
                    delay: 0.5,
                  }}
                >
                  🏆
                </motion.div>
              )}
              
              {/* Glow effect */}
              <motion.div
                className="badge-glow"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ 
                  scale: [0, 2, 2.5, 0],
                  opacity: [0, 0.6, 0.3, 0]
                }}
                transition={{
                  duration: 2,
                  delay: 0.3,
                  times: [0, 0.3, 0.7, 1],
                }}
              />
            </motion.div>

            {/* Badge Content */}
            <div className="badge-content">
              <motion.h3
                className="badge-title"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                Badge Earned!
              </motion.h3>

              <motion.h4
                className="badge-name"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                {badge.name}
              </motion.h4>

              <motion.p
                className="badge-description"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                {badge.description}
              </motion.p>
            </div>

            {/* Close button */}
            <motion.button
              className="badge-close"
              onClick={onClose}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              ✕
            </motion.button>
          </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

