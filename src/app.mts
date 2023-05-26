import { connectToDatabase } from './database.mjs'
import { User } from './user.mjs'
import { generateRandomNumber, generateUser } from './helpers.mjs'

const DATABASE_COLLECTION_NAME = 'customers'
const APP_RUN_PERIOD_MILLISECONDS = 200
const MIN_NUMBER_OF_USERS_TO_GENERATE = 1
const MAX_NUMBER_OF_USERS_TO_GENERATE = 10

const database = await connectToDatabase()
const collection = database.collection<User>(DATABASE_COLLECTION_NAME)

const generateRandomNumberOfUsers = (): User[] => {
    const randomNumber = generateRandomNumber(
        MAX_NUMBER_OF_USERS_TO_GENERATE,
        MIN_NUMBER_OF_USERS_TO_GENERATE
    )
    return Array.from(Array(randomNumber)).map(() => generateUser())
}

const app = async () => {
    const users = generateRandomNumberOfUsers()
    await collection.insertMany(users)    
}

const appRunPeriodically = () => {
    setTimeout(async () => {
        try {
            await app()
            appRunPeriodically()
        } catch (err) {
            console.log('Got an error', err)
            process.exit(-1)
        }
    }, APP_RUN_PERIOD_MILLISECONDS)
}

appRunPeriodically()
