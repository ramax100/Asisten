import mongoose, { Schema, Document } from 'mongoose'

export interface IUser extends Document {
  odId: string
  odUsername: string
  botId: string
  joinedChannels: string[]
  isVerified: boolean
  lastChecked: Date
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    odId: { type: String, required: true },
    odUsername: { type: String, default: '' },
    botId: { type: String, required: true },
    joinedChannels: [{ type: String }],
    isVerified: { type: Boolean, default: false },
    lastChecked: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

UserSchema.index({ odId: 1, botId: 1 }, { unique: true })

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema)
