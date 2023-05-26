import { faker } from '@faker-js/faker'
import { Adress, User } from './user.mjs'
import { ResumeToken, WithId } from 'mongodb'
import { accessSync, readFileSync, writeFile } from 'fs'

const ANONYMISE_PATTERN = /[a-zA-Z\d]{8}/
const RESUME_TOKEN_SAVE_FILENAME = 'resumeToken.txt'

export const generateRandomNumber = (max: number, min: number) => {
    return Math.floor(Math.random() * max) + min
}

export const generateUser = (): User => {
    const address: Adress = {
        line1: faker.location.streetAddress(),
        line2: faker.location.streetAddress(),
        postcode: faker.location.zipCode('#####'),
        city: faker.location.city(),
        state: faker.location.state({ abbreviated: true }),
        country: faker.location.countryCode(),
    }

    const firstName = faker.person.firstName()
    const lastName = faker.person.lastName()

    return {
        firstName,
        lastName,
        email: faker.internet.email({ firstName, lastName }),
        address,
        createdAt: new Date(),
    }
}

export const anonymiseUser = (user: WithId<User>): WithId<User> => ({
    ...user,
    firstName: faker.helpers.fromRegExp(ANONYMISE_PATTERN),
    lastName: faker.helpers.fromRegExp(ANONYMISE_PATTERN),
    email: `${faker.helpers.fromRegExp(ANONYMISE_PATTERN)}@${
        user.email.split('@')[1]
    }`,
    address: {
        ...user.address,
        line1: faker.helpers.fromRegExp(ANONYMISE_PATTERN),
        line2: faker.helpers.fromRegExp(ANONYMISE_PATTERN),
        postcode: faker.helpers.fromRegExp(ANONYMISE_PATTERN),
    },
})

export const fileExists = () => {
    try {
        accessSync(RESUME_TOKEN_SAVE_FILENAME)
        return true
    } catch (error) {
        return false
    }
}

export const saveResumeToken = async (resumeToken: ResumeToken) => {
    await writeFile(
        RESUME_TOKEN_SAVE_FILENAME,
        JSON.stringify(resumeToken),
        () => {}
    )
}

export const getResumeToken = () => {
    const isFileExists = fileExists()
    if (isFileExists) {
        const data = readFileSync(RESUME_TOKEN_SAVE_FILENAME, 'utf-8')

        if (data) return JSON.parse(data)
        return false
    } else {
        return false
    }
}
