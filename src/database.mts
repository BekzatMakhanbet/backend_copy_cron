import { MongoClient } from 'mongodb'
import * as dotenv from 'dotenv'

dotenv.config()

export const connectToDatabase = async () => {
    try {
        const mongoClient = new MongoClient(`${process.env.DB_URI}`)
        await mongoClient.connect()

        const db = mongoClient.db('online_store')

        return db
    } catch (error) {
        console.error('Connection to MongoDB Atlas failed!', error)
        process.exit()
    }
}
