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
    welcomeMessage: { type: String, default: '' },
    greetingPagi: { type: String, default: '' },
    greetingSiang: { type: String, default: '' },
    greetingSore: { type: String, default: '' },
    greetingMalam: { type: String, default: '' },
    // Multiple random text variations per time slot (added via dashboard panel).
    greetingTemplatesPagi: { type: [String], default: [] },
    greetingTemplatesSiang: { type: [String], default: [] },
    greetingTemplatesSore: { type: [String], default: [] },
    greetingTemplatesMalam: { type: [String], default: [] },
    bannedWords: [{ type: String }],
    bannedWordsAction: { type: String, default: 'delete_warn' },
    bannedWordsMessage: { type: String, default: '' },
    antiSpamEnabled: { type: Boolean, default: false },
    antiSpamLimit: { type: Number, default: 5 },
    antiSpamInterval: { type: Number, default: 10 },
    antiSpamMuteDuration: { type: String, default: '5m' },
    antiSpamMessage: { type: String, default: '' },
    antiForwardWarningLimit: { type: Number, default: 3 },
    antiForwardMuteDuration: { type: String, default: '1h' },
    antiForwardWarningMessage: { type: String, default: '' },
    antiForwardMuteMessage: { type: String, default: '' },
    // Custom text for moderation commands (empty = use built-in default).
    moderationMuteMessage: { type: String, default: '' },
    moderationUnmuteMessage: { type: String, default: '' },
    moderationKickMessage: { type: String, default: '' },
    moderationBanMessage: { type: String, default: '' },
    moderationUnbanMessage: { type: String, default: '' },
    enabledFeatures: [{ type: String }],
  },
  { timestamps: true }
)

export default mongoose.models.Bot || mongoose.model<IBot>('Bot', BotSchema)
