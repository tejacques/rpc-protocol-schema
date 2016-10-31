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

CREATE STRUCT quz<T> {
    wark: foo
    zorp: T
}

CREATE UNION Option<T> {
    none: void
    some: T
}

CREATE NAMESPACE Namespace0

CREATE NAMESPACE Namespace0.Namespace1

CREATE INTERFACE Calculator {
    add<T>(calculation: Calculation<T>, value: T) => (calculation: Calculation<T>)
    subtract<T>(calculation: Calculation<T>, value: T) => (calculation: Calculation<T>)
    multiply<T>(calculation: Calculation<T>, value: T) => (calculation: Calculation<T>)
    divide<T>(calculation: Calculation<T>, value: T) => (calculation: Calculation<T>)
}

CREATE STRUCT Container<T> {
    content: Option<Option<T>>
}
`

const lexer = tokenize(command)

const parsed = parse_commands(lexer)

console.log(JSON.stringify(parsed, null, 4))


const constant_commands = `
CREATE CONSTANT Namespace0.person: foo = {
    bar: 32
    baz: 57.5
}

CREATE CONSTANT Namespace0.quzzy: quz<quz<foo>> = {
    wark: {
        bar: 0
        baz: 0.0
    }
    zorp: {
        wark: {
            bar: 1
            baz: 1.0
        }
        zorp: {
            bar: 2
            baz: -2.0
        }
    }
}

CREATE CONSTANT Namespace0.someValue: Namespace0.Namespace1.Option<Namespace0.Namespace1.Option<foo>> = {
    some: {
        some: {
            bar: 3
            baz: 3.0
        }
    }
}

CREATE CONSTANT Namespace0.someOtherValue: Container<foo> = {
    some: {
        some: {
            bar: 4
            baz: 4.0
        }
    }
}
`

const tokens = tokenize(constant_commands)
const parsed_constant = parse_commands(tokens)
console.log(JSON.stringify(parsed_constant, null, 4))