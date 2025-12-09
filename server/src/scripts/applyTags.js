/**
 * Bulk-assign tags to existing VoiceMessage documents.
 *
 * Usage:
 *   1. Fill the `tagAssignments` array with { id, tags } entries.
 *   2. Ensure MONGO_URI points to your database (env var or .env file).
 *   3. Run: node src/scripts/applyTags.js
 */

import 'dotenv/config'
import mongoose from 'mongoose'
import VoiceMessage from '../models/VoiceMessage.js'

const MONGO_URI =
  process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/digital_phone_booth'

const tagAssignments = [
  { id: '690b21a652628a7167eee62e', tags: ['absent beloved'] },
  { id: '690b4a0305138cd2d61e6293', tags: ['ancestral beloved '] },
  { id: '690b385e6c1f8e672f727df2', tags: ['absent beloved  '] },
  { id: '690b481b05138cd2d61e6290', tags: ['absent beloved  '] },

  






  // **********************************************************
  // { id: '690b200e52628a7167eee5f4', tags: ['absent beloved'] },
  // { id: '690b203c52628a7167eee5fd', tags: ['absent beloved'] },
  // { id: '690b221052628a7167eee639', tags: ['ancestral beloved '] },
  // { id: '690b241a52628a7167eee652', tags: ['imagined beloved  '] },
  // { id: '690b244f52628a7167eee65b', tags: ['absent beloved'] },
  // { id: '690b246552628a7167eee65e', tags: ['absent beloved'] },
  // { id: '690b247952628a7167eee661', tags: ['first beloved '] },
  // { id: '690b265252628a7167eee66c', tags: [' ancestral beloved  '] },
  // { id: '690b267752628a7167eee66f', tags: ['first beloved '] },
  // { id: '690b269052628a7167eee672', tags: [' imagined beloved  '] },
  // { id: '690b26b352628a7167eee67b', tags: ['estranged beloved '] },
  // { id: '690b26cc52628a7167eee67e', tags: ['estranged beloved'] },
  // { id: '690b26e552628a7167eee681', tags: ['estranged beloved '] },
  // { id: '690b26fa52628a7167eee684', tags: ['absent beloved '] },
  // { id: '690b272152628a7167eee68d', tags: [' imagined beloved  '] },
  // { id: '690b274152628a7167eee690', tags: ['estranged beloved'] },
  // { id: '690b36e9a5797f39bdf2462c', tags: ['absent beloved  '] },
  // { id: '690b373e6c1f8e672f727dcb', tags: ['ancestral beloved  '] },
  // { id: '690b377f6c1f8e672f727dd4', tags: ['absent beloved  '] },
  // { id: '690b37bf6c1f8e672f727ddb', tags: ['absent beloved  '] },
  // { id: '690b37d96c1f8e672f727dde', tags: ['ancestral beloved  '] },
  // { id: '690b38096c1f8e672f727de5', tags: [' absent beloved   '] },
  // { id: '690b38246c1f8e672f727de8', tags: ['absent beloved '] },
  // { id: '690b4b43748a075e9812f6e7', tags: ['absent beloved '] },
 // **********************************************************






  // Add the remaining 29 recordings here:

]

const normalizeTags = (input) => {
  if (!input) return []
  if (Array.isArray(input)) {
    return input.map((tag) => String(tag || '').trim()).filter(Boolean)
  }
  return String(input)
    .split(/[;,]/)
    .map((tag) => tag.trim())
    .filter(Boolean)
}

async function applyTags() {
  if (!tagAssignments.length) {
    console.warn('No tag assignments configured.')
    return
  }

  await mongoose.connect(MONGO_URI)
  let updated = 0

  for (const entry of tagAssignments) {
    const { id, tags: rawTags } = entry || {}
    const tags = normalizeTags(rawTags)
    if (!id || !tags.length) {
      console.warn('Skipping entry with missing id or tags:', entry)
      continue
    }
    try {
      const res = await VoiceMessage.updateOne({ _id: id }, { $set: { tags } })
      if (res.matchedCount === 0) {
        console.warn(`No recording found for id=${id}`)
        continue
      }
      updated += res.modifiedCount
      console.log(`Set tags ${JSON.stringify(tags)} for id=${id}`)
    } catch (err) {
      console.error(`Failed to update id=${id}:`, err?.message || err)
    }
  }

  console.log(`Tag assignment complete. Updated ${updated} recording(s).`)
  await mongoose.disconnect()
}

applyTags().catch((err) => {
  console.error('Tag assignment script failed:', err)
  process.exit(1)
})


