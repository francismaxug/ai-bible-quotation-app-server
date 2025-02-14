export type Config = {
  app: {
    env: string
    name: string
  }
  server: {
    port: number
  }
  auth: {
    secret: string
  }
  mongoDb: {
    uri: string
  }
}
