import mongoose from 'mongoose';
import { config } from './env.js';

export async function connectDB(uri = config.mongodbUri): Promise<typeof mongoose> {
  try {
    const conn = await mongoose.connect(uri);
    return conn;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

export async function disconnectDB(): Promise<void> {
  try {
    await mongoose.disconnect();
  } catch (error) {
    console.error('Failed to disconnect from MongoDB:', error);
  }
}
