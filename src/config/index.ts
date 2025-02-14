import "dotenv/config"
import { Config } from "./dev"

function getEnv(name: string): string {
  if (process.env[name] === undefined)
    throw new Error(`Environment Variable ${name} undefined`)
  return process.env[name]
}

const config = {
  app: {
    env: () => getEnv("NODE_ENV"),
    name: () => getEnv("APP_NAME"),
  },
  server: {
    port: () => {
      try {
        return getEnv("PORT")
      } catch (error) {
        console.log("Using Default Port")
        return 4000
      }
    },
  },
  auth: {
    secret: () => getEnv("AUTH_SECRET"),
  },
  mongoDb: {
    uri: () => getEnv("MONGO_URI"),
  },
}

export default config
