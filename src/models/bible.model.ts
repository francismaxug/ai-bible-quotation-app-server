import mongoose, { models, model } from "mongoose"
import { IBibleModel, IBibleSchema } from "../types/bible"

const bibleSchema = new mongoose.Schema(
  {
    book: { type: String, required: true },
    chapter: { type: Number, required: true },
    verse: { type: Number, required: true },
    text: { type: String, required: true },
    fullReference: { type: String, required: true, unique: true },
  },
  {
    timestamps: true,
  }
)
const Bible = model<IBibleSchema, IBibleModel>("Bible", bibleSchema)
export default Bible
