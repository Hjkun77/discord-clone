import { ApolloServer } from 'apollo-server-express'
import * as bodyParser from 'body-parser'
import * as cors from 'cors'
import * as express from 'express'
import * as cookieParser from 'cookie-parser'
import { createServer } from 'http'
import * as passport from 'passport'
import { createConnection } from 'typeorm'
import schema from './modules/schema'
import './config/passport'
import auth from './modules/auth'
import { jwtConfig } from './config/passport'
import * as Redis from 'ioredis'
import { onConnect, onDisconnect } from './config/subscriptions'
import redisConf from './config/redisConf'

const PORT = 5000
const path = '/graphql'
// Setup redis
export const redisClient = new Redis(redisConf)

const startServer = async () => {
  let retries = 10
  while (retries) {
    try {
      await createConnection()
      const app = express()
        .use(cookieParser(jwtConfig.jwt.secret, jwtConfig.cookie))
        .use(cors())
        .use(bodyParser.json())

      app.use(passport.initialize())
      app.get('/check', (_, res) => res.status(200).send('hello'))
      app.use('/auth', auth)
      app.use((err, _, res, next) => {
        console.log('ERROR: ', err)
        res.status(500)
        next(err)
      })

      const apolloServer = new ApolloServer({
        schema,
        context: ({ req, res }) => ({ req, res }),
        subscriptions: {
          onConnect,
          onDisconnect
        }
      })

      app.use(path, passport.authenticate('jwt', { session: false }))
      apolloServer.applyMiddleware({ app, path })

      const ws = createServer(app)
      apolloServer.installSubscriptionHandlers(ws)

      ws.listen(PORT, () => {
        console.log(
          `--------------- Listening on PORT ${PORT} -----------------`
        )
      })
    } catch (error) {
      retries -= 1
      console.log(error)
      console.log(`Failed to connect db...${retries} retries left`)
    }
  }
}
console.log('SECRET: ', process.env.PGPASSWORD)
console.log('SECRET: ', process.env.JWT_SECRET)
console.log('SECRET: ', process.env.NODE_ENV)
startServer()
// createConnection().then(async () => {
//   const app = express()
//     .use(cookieParser(jwtConfig.jwt.secret, jwtConfig.cookie))
//     .use(cors())
//     .use(bodyParser.json())

//   app.use(passport.initialize())
//   app.get('/check', (_, res) => res.status(200).send('hello'))
//   app.use('/auth', auth)
//   app.use((err, _, res, next) => {
//     console.log('ERROR: ', err)
//     res.status(500)
//     next(err)
//   })

//   const apolloServer = new ApolloServer({
//     schema,
//     context: ({ req, res }) => ({ req, res }),
//     subscriptions: {
//       onConnect,
//       onDisconnect
//     }
//   })

//   app.use(path, passport.authenticate('jwt', { session: false }))
//   apolloServer.applyMiddleware({ app, path })

//   const ws = createServer(app)
//   apolloServer.installSubscriptionHandlers(ws)

//   ws.listen(PORT, () => {
//     console.log(`--------------- Listening on PORT ${PORT} -----------------`)
//   })
// })

/**
 * TODO - Create error handlers for repositories
 * TODO - Create tests for graphql resolvers
 */
