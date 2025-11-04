/*
  Migrates VoiceMessage.audioUrl values that point to local /uploads/* files
  to Cloudinary, updates the document to the secure_url, and deletes the local file.

  Usage:
    node src/scripts/migrateUploadsToCloudinary.js

  Requirements:
    - MONGO_URI
    - CLOUDINARY_* env vars (cloud, key, secret)
*/

import 'dotenv/config'
import path from 'path'
import fs from 'fs'
import mongoose from 'mongoose'
import VoiceMessage from '../models/VoiceMessage.js'
import { uploadAudioFile } from '../services/cloudinary.js'

async function migrate() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/digital_phone_booth'
  await mongoose.connect(mongoUri)
  const query = { audioUrl: { $regex: '^/uploads/' } }
  const items = await VoiceMessage.find(query).lean()
  let migrated = 0
  for (const item of items) {
    try {
      const rel = item.audioUrl.replace(/^\//, '') // uploads/filename
      const filePath = path.resolve(rel)
      if (!fs.existsSync(filePath)) {
        // eslint-disable-next-line no-console
        console.warn(`Skip missing file: ${filePath} for id=${item._id}`)
        continue
      }
      const publicId = path.basename(filePath, path.extname(filePath))
      const res = await uploadAudioFile(filePath, { publicId })
      if (res && res.secure_url) {
        await mongoose.model('VoiceMessage').updateOne({ _id: item._id }, { $set: { audioUrl: res.secure_url } })
        try { fs.unlinkSync(filePath) } catch {}
        migrated++
        // eslint-disable-next-line no-console
        console.log(`Migrated ${item._id} -> ${res.secure_url}`)
      } else {
        // eslint-disable-next-line no-console
        console.warn(`Cloudinary upload not configured or failed for ${filePath}`)
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(`Failed migrating id=${item._id}:`, e?.message || e)
    }
  }
  // eslint-disable-next-line no-console
  console.log(`Migration complete. Updated ${migrated} of ${items.length} items.`)
  await mongoose.disconnect()
}

migrate().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('Migration crashed:', e)
  process.exit(1)
})


