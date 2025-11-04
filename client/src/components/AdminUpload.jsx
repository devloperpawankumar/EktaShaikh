import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { withApiBase } from '../config.js'

export default function AdminUpload() {
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [assemblyAIStatus, setAssemblyAIStatus] = useState(null)
  const [transcriptionResult, setTranscriptionResult] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    phoneNumber: '',
    transcript: ''
  })

  // Check AssemblyAI status on component mount
  useEffect(() => {
    const checkAssemblyAIStatus = async () => {
      try {
        const response = await fetch(withApiBase('/api/messages/transcription/status'))
        const status = await response.json()
        setAssemblyAIStatus(status)
      } catch (error) {
        setAssemblyAIStatus({ status: 'error', message: 'Failed to check AssemblyAI status' })
      }
    }
    checkAssemblyAIStatus()
  }, [])

  const handleFileSelect = (event) => {
    const file = event.target.files[0]
    if (file) {
      setSelectedFile(file)
      setUploaded(false)
      
      // Auto-fill title with filename (without extension)
      const fileName = file.name
      const nameWithoutExtension = fileName.replace(/\.[^/.]+$/, "")
      setFormData(prev => ({ ...prev, title: nameWithoutExtension }))
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploading(true)
    setUploaded(false)

    try {
      const form = new FormData()
      form.append('audio', selectedFile)
      form.append('title', formData.title || 'Dial Recording')
      form.append('phoneNumber', formData.phoneNumber)
      form.append('transcript', formData.transcript)
      form.append('type', 'dial')

      const response = await fetch(withApiBase('/api/messages/upload'), {
        method: 'POST',
        body: form
      })

      if (response.ok) {
        const result = await response.json()
        setUploaded(true)
        setTranscriptionResult(result)
        setFormData({ title: '', phoneNumber: '', transcript: '' })
        setSelectedFile(null)
        // Reset file input
        const fileInput = document.querySelector('input[type="file"]')
        if (fileInput) fileInput.value = ''
      } else {
        alert('Upload failed')
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">Upload Dial Recording</h2>
        <p className="text-sm opacity-80">
          Upload audio files to make them available through the rotary dial interface.
          These recordings will be accessible to users when they dial specific numbers.
          and will be automatically transcribed for accessibility.
        </p>
      </div>

      {/* AssemblyAI Status */}
      {assemblyAIStatus && (
        <div className="mb-6 p-4 glass rounded-xl">
          <h3 className="text-sm font-semibold mb-2">AssemblyAI Status</h3>
          {assemblyAIStatus.status === 'ok' ? (
            <div className="flex items-center space-x-2 text-green-400">
              <span>✓</span>
              <span className="text-sm">{assemblyAIStatus.message}</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-red-400">
              <span>✗</span>
              <span className="text-sm">{assemblyAIStatus.message}</span>
            </div>
          )}
        </div>
      )}

      <div className="glass rounded-2xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Audio File</label>
          <input
            type="file"
            accept="audio/*"
            onChange={handleFileSelect}
            disabled={uploading}
            className="w-full px-3 py-2 glass rounded-lg border border-white/10 focus:border-neon-blue/50 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Title</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Recording title"
            className="w-full px-3 py-2 glass rounded-lg border border-white/10 focus:border-neon-blue/50 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Phone Number (Optional)</label>
          <input
            type="text"
            value={formData.phoneNumber}
            onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
            placeholder="e.g., 1234"
            className="w-full px-3 py-2 glass rounded-lg border border-white/10 focus:border-neon-blue/50 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Transcript (Optional)</label>
          <textarea
            value={formData.transcript}
            onChange={(e) => setFormData(prev => ({ ...prev, transcript: e.target.value }))}
            placeholder="Audio transcript"
            rows={4}
            className="w-full px-3 py-2 glass rounded-lg border border-white/10 focus:border-neon-blue/50 focus:outline-none"
          />
        </div>

        {selectedFile && (
          <div className="p-3 glass rounded-lg border border-white/20">
            <div className="text-sm font-medium mb-2">Selected File:</div>
            <div className="text-sm opacity-80">{selectedFile.name}</div>
            <div className="text-xs opacity-60 mt-1">
              Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="flex-1 px-4 py-2 bg-neon-blue text-black font-medium rounded-lg hover:bg-neon-blue/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? 'Uploading...' : 'Upload Audio'}
          </button>
          {selectedFile && (
            <button
              onClick={() => {
                setSelectedFile(null)
                const fileInput = document.querySelector('input[type="file"]')
                if (fileInput) fileInput.value = ''
              }}
              disabled={uploading}
              className="px-4 py-2 glass border border-white/20 text-white font-medium rounded-lg hover:border-white/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {uploading && (
          <div className="text-center py-4">
            <div className="text-sm opacity-80">Uploading...</div>
          </div>
        )}

        {uploaded && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-4"
          >
            <div className="text-sm text-green-400">✓ Upload successful!</div>
            {transcriptionResult?.transcript && (
              <div className="mt-4 p-3 glass rounded-lg text-left">
                <h4 className="text-sm font-semibold mb-2">Auto-generated Transcript:</h4>
                <p className="text-xs opacity-80 leading-relaxed">{transcriptionResult.transcript}</p>
              </div>
            )}
          </motion.div>
        )}
      </div>

      <div className="mt-6 p-4 glass rounded-xl">
        <h3 className="text-sm font-semibold mb-2">Instructions:</h3>
        <ul className="text-xs opacity-80 space-y-1">
          <li>• Select audio files in common formats (MP3, WAV, WEBM)</li>
          <li>• Provide a descriptive title for the recording</li>
          <li>• Phone number is optional - used for identification in archives</li>
          <li>• Audio will be automatically transcribed using AssemblyAI</li>
          <li>• Transcript helps with accessibility and search functionality</li>
          <li>• Click "Upload Audio" button to upload and transcribe the file</li>
          <li>• Recordings will be available immediately in the dial interface</li>
        </ul>
      </div>
    </div>
  )
}
