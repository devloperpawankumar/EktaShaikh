import { motion } from 'framer-motion'

export default function Touchpad({ onDigit }) {
  const keys = [
    '1','2','3',
    '4','5','6',
    '7','8','9',
    '*','0','#'
  ]
  return (
    <div className="grid grid-cols-3 gap-3 p-4 glass rounded-2xl w-64">
      {keys.map((k) => (
        <motion.button
          key={k}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => { if (/\d/.test(k)) onDigit?.(Number(k)) }}
          className="h-14 rounded-xl bg-white/10 border border-white/20 shadow-lg text-xl tracking-widest neon-glow"
        >
          {k}
        </motion.button>
      ))}
    </div>
  )
}


