import mongoose, { Schema, Document } from 'mongoose'

// Dedup record so each greeting slot is sent at most once per group per day.
// Separate from Counter because Counter has a 1-hour TTL (too short - a slot
// can span several hours and the endpoint may be called many times).
export interface IGreetingDedup extends Document {
  key: string
  date: Date
}

const GreetingDedupSchema = new Schema<IGreetingDedup>({
  key: { type: String, required: true, unique: true },
  date: { type: Date, default: Date.now },
})

// Auto-expire after ~25 hours so it survives a full day but cleans itself up.
GreetingDedupSchema.index({ date: 1 }, { expireAfterSeconds: 90000 })

export default mongoose.models.GreetingDedup ||
  mongoose.model<IGreetingDedup>('GreetingDedup', GreetingDedupSchema)
