import {
    AnyBulkWriteOperation,
    WithId,
    ChangeStreamInsertDocument,
    ChangeStreamUpdateDocument,
    ResumeToken,
    ChangeStreamOptions,
    Timestamp,
} from 'mongodb'
import { connectToDatabase } from './database.mjs'
import { User } from './user.mjs'
import { anonymiseUser, getResumeToken, saveResumeToken } from './helpers.mjs'

const DATABASE_COLLECTION_NAME_TO_LISTEN = 'customers'
const DATABASE_COLLECTION_NAME_TO_COPY = 'customers_anonymised'
const SYNC_RUN_PERIOD_MILLISECONDS = 1000
const AMOUNT_OF_ENOUGH_DATA_TO_COPY = 1000

const database = await connectToDatabase()
const collection = database.collection<User>(DATABASE_COLLECTION_NAME_TO_LISTEN)
const collectionToWrite = database.collection<User>(
    DATABASE_COLLECTION_NAME_TO_COPY
)

type CollectionData = {
    document: WithId<User>
    resumeToken?: ResumeToken
}

let collectingData: CollectionData[] = []
let syncTimer: ReturnType<typeof setTimeout> | null = null

const getAndClearCollectingData = () => {
    const temp = collectingData
    collectingData = []

    let lastWillBeExecuted = temp[temp.length - 1]?.resumeToken

    const bulkOperations: AnyBulkWriteOperation<User>[] = temp.map(
        ({ document }) => {
            const { _id, ...rest } = document

            return {
                replaceOne: {
                    filter: { _id },
                    replacement: rest,
                    upsert: true,
                },
            }
        }
    )

    return { bulkOperations, lastWillBeExecuted }
}

const sync = async () => {
    const { bulkOperations, lastWillBeExecuted } = getAndClearCollectingData()
    syncTimer?.refresh()

    try {
        await collectionToWrite.bulkWrite(bulkOperations, { ordered: false })
        lastWillBeExecuted && (await saveResumeToken(lastWillBeExecuted))
    } catch (err) {
        console.log(err)
    }
}

const syncTimerExecution = () => {
    if (collectingData.length) sync()
    syncTimer = null
}

const startSyncTimer = () => {
    syncTimer = setTimeout(syncTimerExecution, SYNC_RUN_PERIOD_MILLISECONDS)
}

const syncIfEnoughDataOrRunTimer = () => {
    if (!syncTimer) startSyncTimer()

    if (collectingData.length >= AMOUNT_OF_ENOUGH_DATA_TO_COPY) sync()
}

const handleStreamChange = (
    changeChunk:
        | ChangeStreamUpdateDocument<WithId<User>>
        | ChangeStreamInsertDocument<WithId<User>>,
    resumeToken: ResumeToken
) => {
    if (!changeChunk.fullDocument) return

    collectingData.push({
        document: anonymiseUser(changeChunk.fullDocument),
        resumeToken,
    })
}

const getFirstElementInsertedTimeStamp = async () => {
    const first = await collection.find().sort({ _id: 1 }).limit(1).next()
    return first?._id.getTimestamp()
}

const runStream = async (defaultResumeToken: ResumeToken | null) => {
    const resumeToken = defaultResumeToken || (await getResumeToken())

    const streamOptions: ChangeStreamOptions = {
        fullDocument: 'updateLookup',
    }

    if (resumeToken) streamOptions.startAfter = resumeToken
    else {
        const timestamp = await getFirstElementInsertedTimeStamp()

        if (timestamp) {
            streamOptions.startAtOperationTime = new Timestamp({
                t: timestamp.getTime() / 1000,
                i: 1,
            })
        }
    }

    let changeStream = collection.watch<WithId<User>>([], streamOptions)

    changeStream.on('change', (changeChunk) => {
        const streamResumeToken = changeStream.resumeToken
        switch (changeChunk.operationType) {
            case 'insert':
            case 'update':
                handleStreamChange(changeChunk, streamResumeToken)
                break
            case 'invalidate':
                console.log("CAME to invalidate");
                
                changeStream.close()
                runStream(streamResumeToken)
        }
        syncIfEnoughDataOrRunTimer()
    })
}

const fullReindex = async () => {
    try {
        const users = await collection.find().toArray()

        users.forEach((user) => {
            collectingData.push({
                document: anonymiseUser(user),
            })
        })
        await sync()

        console.log('Successfully finished task')
        process.exit(0)
    } catch (err) {
        throw err
    }
}

if (process.argv.indexOf('--full-reindex') > 0) {
    fullReindex()
} else {
    runStream(null)
}
