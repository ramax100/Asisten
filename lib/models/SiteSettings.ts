import mongoose, { Schema, Document } from 'mongoose'

export interface ISiteSettings extends Document {
  brandName: string
  logoUrl: string // base64 data URI or path
  updatedAt: Date
}

const SiteSettingsSchema = new Schema<ISiteSettings>(
  {
    brandName: { type: String, default: 'Rich Bot' },
    logoUrl: { type: String, default: '' },
  },
  { timestamps: true }
)

export default mongoose.models.SiteSettings || mongoose.model<ISiteSettings>('SiteSettings', SiteSettingsSchema)
