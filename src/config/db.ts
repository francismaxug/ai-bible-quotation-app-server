import "dotenv/config"
import mongoose from "mongoose"

export async function connectDb(bdString: string) {
  try {
    await mongoose.connect(bdString)
    console.log("Connected to Database")
  } catch (error) {
    console.log("Error Connecting to Database", error)
    process.exit(1)
  }
}
