import "dotenv/config"
import express from "express"
import { createServer } from "http"
import { Server } from "socket.io"
import OpenAI from "openai"
import { GoogleGenerativeAI } from "@google/generative-ai"

import { connectDb } from "./config/db"
import cors from "cors"
import Bible from "./models/bible.model"

// Initialize OpenAI and Google Gemini
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const gemini = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY!
).getGenerativeModel({ model: "gemini-1.5-flash" })

// Connect to MongoDB
connectDb(process.env.MONGO_URI!)

// Create Express app
const app = express()
app.use(cors())
//app.use(express.json())
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: "https://ai-bible-quotation-app-client.vercel.app/", // Your frontend URL
    methods: ["GET", "POST"],
    allowedHeaders: ["*"],
    credentials: true,
  },
})

// Track current reference for each client
const clientSessions = new Map<
  string,
  { book: string | undefined; chapter: number; verse: number }
>()

// Parse Bible references (e.g., "John 3:16" => { book: "John", chapter: 3, verse: 16 })
const parseReference = (ref: string) => {
  const match = ref.match(/(\d?\s?\w+)\s(\d+):(\d+)/)
  return match
    ? {
        book: match[1],
        chapter: parseInt(match[2]!),
        verse: parseInt(match[3]!),
      }
    : null
}

// Navigation logic
const navigate = async (
  current: { book: string | undefined; chapter: number; verse: number },
  command: string
) => {
  let newBook = current.book
  let newChapter = current.chapter
  let newVerse = current.verse

  switch (command.toLowerCase()) {
    case "next verse":
      newVerse++
      break
    case "previous verse":
      newVerse = Math.max(1, newVerse - 1)
      break
    case "next chapter":
      newChapter++
      newVerse = 1
      break
    case "previous chapter":
      newChapter = Math.max(1, newChapter - 1)
      newVerse = 1
      break
    default:
      return null
  }

  const newRef = `${newBook} ${newChapter}:${newVerse}`
  return await Bible.findOne({ fullReference: newRef })
}

// Socket.io connection handler
io.on("connection", (socket) => {
  console.log("New client connected:", socket.id)

  socket.on("audio", async (audioBlob) => {
    console.log("Received audio data:", {
      type: typeof audioBlob,
      size: audioBlob instanceof Blob ? audioBlob.size : "N/A",
      socketId: socket.id,
      typee: audioBlob.type,
    })

    const audioFile = new File([audioBlob], "audio.wav", { type: "audio/wav" })
    try {
      // Step 1: Transcribe audio using OpenAI Whisper
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
      })

      const text = transcription.text
      console.log("Transcription:", text)

      // Step 2: Detect command or reference using Gemini
      const prompt = `Identify either:
        1. A Bible reference (e.g., "John 3:16")
        2. A navigation command: "next verse", "previous verse", "next chapter", "previous chapter"
        From: "${text}". Respond ONLY with the reference or command.`

      const geminiResponse = await gemini.generateContent(prompt)
      const response = geminiResponse.response.text().trim()
      console.log("Gemini Response:", response)

      let quote
      if (
        [
          "next verse",
          "previous verse",
          "next chapter",
          "previous chapter",
        ].includes(response.toLowerCase())
      ) {
        // Handle navigation commands
        const current = clientSessions.get(socket.id)
        if (!current) throw new Error("No active session")
        quote = await navigate(current, response)
        if (quote)
          clientSessions.set(socket.id, parseReference(quote.fullReference)!)
      } else {
        // Handle Bible references
        const parsedRef = parseReference(response)
        if (!parsedRef) throw new Error("Invalid reference")
        quote = await Bible.findOne(parsedRef)
        if (quote) clientSessions.set(socket.id, parsedRef)
      }

      // Step 3: Send response
      if (quote) {
        socket.emit(
          "message",
          JSON.stringify({
            quote: quote.text,
            reference: quote.fullReference,
          })
        )
      } else {
        socket.emit("message", JSON.stringify({ error: "Not found" }))
      }
    } catch (error) {
      console.error("Error:", error)
      socket.emit(
        "message",
        JSON.stringify({
          error: `Server error: ${(error as Error).message || "Unknown error"}`,
        })
      )
    }
  })

  socket.on("disconnect", () => {
    clientSessions.delete(socket.id)
    console.log("Client disconnected:", socket.id)
  })
})

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" })
})

// Start the server
server.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`)
})

// Handle unhandled errors
process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error)
})
