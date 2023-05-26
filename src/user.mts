export interface Adress {
    line1: string
    line2: string
    postcode: string
    city: string
    state: string
    country: string
}

export interface User {
    firstName: string
    lastName: string
    email: string
    address: Adress
    createdAt: Date
}
