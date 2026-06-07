import mongoose, { Schema, Document } from 'mongoose'

export interface ICounter extends Document {
  key: string
  count: number
  firstMsg: number
  updatedAt: Date
}

const CounterSchema = new Schema<ICounter>(
  {
    key: { type: String, required: true, unique: true },
    count: { type: Number, default: 0 },
    firstMsg: { type: Number, default: 0 },
  },
  { timestamps: true }
)

// Auto-expire after 1 hour
CounterSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 3600 })

export default mongoose.models.Counter || mongoose.model<ICounter>('Counter', CounterSchema)
