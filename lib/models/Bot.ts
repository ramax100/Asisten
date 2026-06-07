import mongoose, { Schema, Document } from 'mongoose'

export interface IBot extends Document {
  token: string
  botId: string
  botUsername: string
  botName: string
  channels: {
    channelId: string
    channelUsername: string
    channelTitle: string
  }[]
  groups: {
    groupId: string
    groupTitle: string
  }[]
  isActive: boolean
  webhookUrl: string
  forceJoinEnabled: boolean
  forceJoinMessage: string
  successMessage: string
  createdAt: Date
  updatedAt: Date
}

const BotSchema = new Schema<IBot>(
  {
    token: { type: String, required: true, unique: true },
    botId: { type: String, required: true, unique: true },
    botUsername: { type: String, required: true },
    botName: { type: String, required: true },
    channels: [
      {
        channelId: { type: String, required: true },
        channelUsername: { type: String, default: '' },
        channelTitle: { type: String, required: true },
      },
    ],
    groups: [
      {
        groupId: { type: String, required: true },
        groupTitle: { type: String, required: true },
      },
    ],
    isActive: { type: Boolean, default: true },
    webhookUrl: { type: String, default: '' },
    forceJoinEnabled: { type: Boolean, default: true },
    forceJoinMessage: { type: String, default: '' },
    successMessage: { type: String, default: '' },
    enabledFeatures: [{ type: String }],
  },
  { timestamps: true }
)

export default mongoose.models.Bot || mongoose.model<IBot>('Bot', BotSchema)
