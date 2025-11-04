import { v2 as cloudinary } from 'cloudinary'

const {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  CLOUDINARY_FOLDER
} = process.env

let configured = false

export function configureCloudinary() {
  if (configured) return
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    // eslint-disable-next-line no-console
    console.warn('Cloudinary env not fully configured; uploads will remain local.')
    return
  }
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET
  })
  configured = true
}

export async function uploadAudioFile(filePath, { publicId, folder } = {}) {
  configureCloudinary()
  if (!configured) return null
  const targetFolder = folder || CLOUDINARY_FOLDER || 'digital-phone-booth/audio'
  const options = {
    resource_type: 'video', // audio uses video resource type on Cloudinary
    folder: targetFolder,
    public_id: publicId || undefined,
    overwrite: false
  }
  const res = await cloudinary.uploader.upload(filePath, options)
  return res
}


