import { tokenize, lexer_token } from './tokenizer'

let command = `CREATE TYPE foo {
    bar: Int32
}`

let command2 = `  CREATE TYPE foo2 { bar:    Int32, baz: Int8 }`

let tokens = tokenize(command2)

let all_tokens: lexer_token[] = []
for (const token of tokens) {
    all_tokens.push(token)
    console.log(`token: ${JSON.stringify(token)}`)
}

console.log("\n\nReseting\n")

tokens = tokenize(command2)

tokens.next(all_tokens[1])

console.log(`token: ${JSON.stringify(tokens.next().value)}`)


/*
function functional(api, userid) {
    return api
        .getUser(userid)
        .handleError(error => {
            // Handle Error
        }).do(user => api.branch(
            api.equal(user.name, 'bob'),
            api.heWasBob,
            api.heWasNotBob))
        .transform(user => api.transform(user.name, user.dob, (name, dob) => {
            return { name, dob }
        }))
}

function imperative(api, userid) {
    let user = api.getUser(userid)
    let handledUser = api.onError(user, (error) => {
        // Handle error
    });

    let isBob = api.equal(user.name, 'bob')

    let isBobRes = api.branch(isBob, () => {
        return api.heWasBob()
    }, () => {
        return api.heWasNotBob()
    })

    let observed = api.transform(handledUser.name, handledUser.dob, (name, dob) => {
        return { name, dob }
    })

    return observed
}
*/