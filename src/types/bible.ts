import  { Document, Types, Model } from "mongoose"

export interface IBible {
  book: string
  chapter: number
  verse: number
  text: string
  fullReference: string
}

export interface IBibleSchema extends IBible, Document {
  _id: Types.ObjectId
  createdAt: Date
}

export interface IBibleModel extends Model<IBibleSchema> {}
