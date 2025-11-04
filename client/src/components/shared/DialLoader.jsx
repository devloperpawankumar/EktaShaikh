import { motion } from 'framer-motion'

export default function DialLoader({ message = 'Fetching data…' }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6">
        <div className="relative w-32 h-32">
          {/* Outer ring */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-white/15"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, ease: 'linear', duration: 6 }}
          />
          {/* Dial plate */}
          <div className="absolute inset-3 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 shadow-2xl" />
          {/* Finger holes */}
          {[...Array(10)].map((_, i) => {
            const angle = (i * 300) / 10 + 120
            const rad = (Math.PI / 180) * angle
            const r = 42
            const x = 64 + r * Math.cos(rad)
            const y = 64 + r * Math.sin(rad)
            return (
              <motion.div
                key={i}
                className="absolute w-6 h-6 rounded-full bg-slate-700/70 border border-white/10 shadow"
                style={{ left: x - 12, top: y - 12 }}
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ delay: i * 0.05, repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
              />
            )
          })}
          {/* Dial spinner */}
          <motion.div
            className="absolute left-1/2 top-1/2 -ml-1 -mt-12 h-12 w-0.5 bg-gradient-to-b from-cyan-400/80 to-transparent"
            animate={{ rotate: [0, 280, 0] }}
            transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
            style={{ transformOrigin: 'bottom center' }}
          />
          {/* Center cap */}
          <div className="absolute inset-10 rounded-full bg-slate-900 border border-white/10" />
        </div>
        <div className="text-sm tracking-wide opacity-90">
          {message}
        </div>
      </div>
    </div>
  )
}


