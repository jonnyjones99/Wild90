import { motion } from 'framer-motion'

interface ConfettiPieceProps {
  delay: number
  color: string
  x: number
}

function ConfettiPiece({ delay, color, x }: ConfettiPieceProps) {
  return (
    <motion.div
      className="confetti-piece"
      style={{
        backgroundColor: color,
        left: `${x}%`,
      }}
      initial={{ y: -20, opacity: 0, rotate: 0 }}
      animate={{
        y: 600,
        opacity: [0, 1, 1, 0],
        rotate: 360,
      }}
      transition={{
        duration: 2,
        delay,
        ease: 'easeOut',
      }}
    />
  )
}

export function Confetti() {
  const colors = ['#667eea', '#764ba2', '#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1']
  const pieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    delay: Math.random() * 0.5,
    color: colors[Math.floor(Math.random() * colors.length)],
    x: Math.random() * 100,
  }))

  return (
    <div className="confetti-container">
      {pieces.map((piece) => (
        <ConfettiPiece
          key={piece.id}
          delay={piece.delay}
          color={piece.color}
          x={piece.x}
        />
      ))}
    </div>
  )
}

