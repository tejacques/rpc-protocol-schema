import {
    parse_command
} from './parser'

import {
    tokenize
} from './tokenizer'

const command = `
CREATE STRUCT foo {
    bar: Int32
    baz: Float32
}`

const lexer = tokenize(command)

const parsed = parse_command(lexer)

console.log(parsed)