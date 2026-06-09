import mongoose from 'mongoose'

// Gunakan MONGODB_URI dari environment variable jika tersedia.
// Jika tidak ada (misal deploy tanpa set env), pakai default connection string.
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://botpanel:%40Admin001002@cluster0.hfenfpl.mongodb.net/telegrampanel?retryWrites=true&w=majority'

let cached = (global as any).mongoose

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null }
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI).then((mongoose) => {
      return mongoose
    })
  }

  cached.conn = await cached.promise
  return cached.conn
}

export default connectDB
