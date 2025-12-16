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
  const colors = ['#65a30d', '#84cc16', '#ca8a04', '#fbbf24', '#f59e0b', '#92400e', '#a16207', '#78716c']
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

