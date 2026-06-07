import mongoose from 'mongoose'

// Database connection - hardcoded langsung
const DB_URL = 'mongodb+srv://botpanel:%40Admin001002@cluster0.hfenfpl.mongodb.net/telegrampanel?retryWrites=true&w=majority'

let cached = (global as any).mongoose

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null }
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(DB_URL).then((mongoose) => {
      return mongoose
    })
  }

  cached.conn = await cached.promise
  return cached.conn
}

export default connectDB
