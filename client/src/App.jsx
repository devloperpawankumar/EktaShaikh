import { useEffect, useRef, useState, lazy, Suspense } from 'react'
import { io } from 'socket.io-client'
import { getSocketUrl } from './config.js'
import { motion, AnimatePresence } from 'framer-motion'
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
const Booth = lazy(() => import('./components/Booth.jsx'))
const Archive = lazy(() => import('./components/Archive.jsx'))
const Recorder = lazy(() => import('./components/Recorder.jsx'))
const Story = lazy(() => import('./components/Story.jsx'))
const Landing = lazy(() => import('./components/Landing.jsx'))
const AdminUpload = lazy(() => import('./components/AdminUpload.jsx'))
import Tabs from './components/shared/Tabs.jsx'
import DialLoader from './components/shared/DialLoader.jsx'

export default function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const socketRef = useRef(null)
  const [viewReady, setViewReady] = useState({ landing: true, booth: false, archive: false, record: false, story: false, admin: true })

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
      case 'booth': navigate('/booth'); break
      case 'archive': navigate('/archive'); break
      case 'record': navigate('/record'); break
      case 'admin': navigate('/admin'); break
      default: navigate('/');
    }
  }

  return (
    <div className="min-h-full relative overflow-hidden">

      <header className="flex items-center justify-center p-4 sm:p-6">
        {pathToTab(location.pathname) !== 'landing' && (
          <nav className="w-full">
            <Tabs
              tabs={[
                { id: 'landing', label: 'Landing' },
                { id: 'booth', label: 'Booth' },
                { id: 'archive', label: 'Archive' },
                { id: 'record', label: 'Record' },
                { id: 'admin', label: 'Admin' },
              ]}
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
              path="/booth"
              element={
                <motion.div key="booth" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                  <Suspense fallback={viewReady.booth ? null : <DialLoader message="Loading booth…" />}> 
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
                  <Suspense fallback={viewReady.archive ? null : <DialLoader message="Loading archive…" />}> 
                    <Archive onReady={() => markReady('archive')} />
                  </Suspense>
                </motion.div>
              }
            />
            <Route
              path="/record"
              element={
                <motion.div key="record" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                  <Suspense fallback={viewReady.record ? null : <DialLoader message="Loading recorder…" />}> 
                    <Recorder socket={socketRef.current} onReady={() => markReady('record')} />
                  </Suspense>
                </motion.div>
              }
            />
            <Route
              path="/admin"
              element={
                <motion.div key="admin" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                  <Suspense fallback={viewReady.admin ? null : <DialLoader message="Loading admin…" />}> 
                    <AdminUpload />
                  </Suspense>
                </motion.div>
              }
            />
          </Routes>
        </AnimatePresence>
      </main>
    </div>
  )
}

