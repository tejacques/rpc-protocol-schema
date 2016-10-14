import {
    parse_commands
} from './parser'

import {
    tokenize
} from './tokenizer'

const command = `
CREATE STRUCT foo {
    bar: Int32
    baz: Float32
}

CREATE UNION quz<T> {
    wark: foo
    zorp: T
}

CREATE NAMESPACE Namespace0

CREATE NAMESPACE Namespace0.Namespace1
`

const lexer = tokenize(command)

const parsed = parse_commands(lexer)

console.log(JSON.stringify(parsed, null, 4))