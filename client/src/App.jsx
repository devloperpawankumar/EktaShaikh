import { useEffect, useRef, useState, lazy, Suspense } from 'react'
import { io } from 'socket.io-client'
import { getSocketUrl } from './config.js'
import { motion, AnimatePresence } from 'framer-motion'
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom'
const Booth = lazy(() => import('./components/Booth.jsx'))
const Archive = lazy(() => import('./components/Archive.jsx'))
const Recorder = lazy(() => import('./components/Recorder.jsx'))
const Story = lazy(() => import('./components/Story.jsx'))
const Landing = lazy(() => import('./components/Landing.jsx'))
const Home = lazy(() => import('./components/Home.jsx'))
const AdminUpload = lazy(() => import('./components/AdminUpload.jsx'))
import Tabs from './components/shared/Tabs.jsx'
import DialLoader from './components/shared/DialLoader.jsx'

function useEnableSoundOnce() {
  useEffect(() => {
    const handler = async () => {
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext
        if (Ctx) {
          const ctx = new Ctx()
          if (ctx.state === 'suspended') {
            await ctx.resume()
          }
          try { await ctx.close() } catch {}
        }
      } catch {}
      window.removeEventListener('click', handler, { capture: true })
      window.removeEventListener('touchstart', handler, { capture: true })
    }
    window.addEventListener('click', handler, { capture: true, once: true })
    window.addEventListener('touchstart', handler, { capture: true, once: true })
    return () => {
      window.removeEventListener('click', handler, { capture: true })
      window.removeEventListener('touchstart', handler, { capture: true })
    }
  }, [])
}

export default function App() {
  useEnableSoundOnce()
  const location = useLocation()
  const navigate = useNavigate()
  const socketRef = useRef(null)
  const [viewReady, setViewReady] = useState({ landing: true, booth: false, archive: false, record: false, story: false, admin: true })
  const isProd = import.meta.env.PROD === true

  // Connect socket only on routes that need it
  useEffect(() => {
    const path = location.pathname
    const needsSocket = path === '/booth' || path === '/record'
    if (needsSocket && !socketRef.current) {
      const url = getSocketUrl()
      const socket = url ? io(url) : io()
      socketRef.current = socket
      return () => {
        try { socket.disconnect() } catch {}
        socketRef.current = null
      }
    }
    return
  }, [location.pathname])

  const markReady = (id) => {
    setViewReady((prev) => (prev[id] ? prev : { ...prev, [id]: true }))
  }

  const startMockTranscription = () => {
    socketRef.current?.emit('start-transcription')
  }

  const pathToTab = (path) => {
    switch (path) {
      case '/': return 'landing'
      case '/home': return 'home'
      case '/booth': return 'booth'
      case '/archive': return 'archive'
      case '/record': return 'record'
      case '/admin': return 'admin'
      default: return 'landing'
    }
  }

  const goTo = (id) => {
    switch (id) {
      case 'landing': navigate('/'); break
      case 'home': navigate('/home'); break
      case 'booth': navigate('/booth'); break
      case 'archive': navigate('/archive'); break
      case 'record': navigate('/record'); break
      case 'admin': navigate('/admin'); break
      default: navigate('/');
    }
  }

  const tabsConfig = [
    { id: 'home', label: 'Home' },
    { id: 'booth', label: 'Booth' },
    { id: 'archive', label: 'Archive' },
    { id: 'record', label: 'Record' },
  ]
  if (!isProd) {
    tabsConfig.push({ id: 'admin', label: 'Admin' })
  }

  return (
    <div className="min-h-full relative overflow-hidden">

      <header className="flex flex-col items-center justify-center p-4 sm:p-6">
        {pathToTab(location.pathname) !== 'landing' && (
          <>
            <h1 
              onClick={() => navigate('/')}
              className="landing-heading-white font-extrabold tracking-tight leading-none text-[21px] md:text-[30px] md:mb-10 mb-4 cursor-pointer hover:opacity-80 transition-opacity"
            >
              Invite The One You Can't Touch
            </h1>
            <nav className="w-full">
              <Tabs
                tabs={tabsConfig}
                activeId={pathToTab(location.pathname)}
                onChange={goTo}
                hoverReveal={false}
                maskUntilHover
                maskLabel="Ring"
                unstyledContainer
                className="w-full max-w-8xl mx-auto justify-between px-2 sm:px-6"
                gapOverride="gap-2 sm:gap-8 md:gap-16"
                size="sm"
                fontClass="heading-archivogrotesk font-extrabold text-[11px] sm:text-sm md:text-[25px] tracking-wide"
              />
            </nav>
          </>
        )}
      </header>

      <main className="p-4 sm:p-6">
        <AnimatePresence mode="wait">
          <Routes>
            <Route
              path="/"
              element={
                <motion.div key="landing" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                  <Suspense fallback={null}>
                    <Landing />
                  </Suspense>
                </motion.div>
              }
            />
            <Route
              path="/home"
              element={
                <motion.div key="home" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                  <Suspense fallback={null}>
                    <Home />
                  </Suspense>
                </motion.div>
              }
            />
            <Route
              path="/booth"
              element={
                <motion.div key="booth" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                  <Suspense fallback={null}> 
                    <Booth 
                      onStartTranscription={startMockTranscription} 
                      socket={socketRef.current}
                      onReady={() => markReady('booth')}
                    />
                  </Suspense>
                </motion.div>
              }
            />
            <Route
              path="/archive"
              element={
                <motion.div key="archive" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                  <Suspense fallback={null}> 
                    <Archive onReady={() => markReady('archive')} />
                  </Suspense>
                </motion.div>
              }
            />
            <Route
              path="/record"
              element={
                <motion.div key="record" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                  <Suspense fallback={null}> 
                    <Recorder socket={socketRef.current} onReady={() => markReady('record')} />
                  </Suspense>
                </motion.div>
              }
            />
            {!isProd ? (
              <Route
                path="/admin"
                element={
                  <motion.div key="admin" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                    <Suspense fallback={null}> 
                      <AdminUpload />
                    </Suspense>
                  </motion.div>
                }
              />
            ) : (
              <Route path="/admin" element={<Navigate to="/" replace />} />
            )}
          </Routes>
        </AnimatePresence>
      </main>
    </div>
  )
}

