import { parse_commands, parse_namespace } from "./parser";

import {
    tokenize
} from './tokenizer'

import { expect, assert } from "chai";
import 'mocha'
import { parse_name_token } from "./parser_helper";

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

describe('parser', () => {
    describe('parse name', () => {
        it('should parse "Name"', () => {
            const name = "Name"
            const lexer = tokenize(name).start().next()

            const name_res = parse_name_token(lexer)

            if (name_res.kind === 'NameError') {
                throw Error(name_res.error)
            }

            expect(name_res.name).equals(name)
        })
        it('should parse an error for "*"', () => {
            const name = "*"
            const lexer = tokenize(name).start().next()

            const name_res = parse_name_token(lexer)

            expect(name_res.kind).equals('NameError')
        })
    })
    describe('parse namespace', ()=> {
        it('should parse "Namespace0"', () => {
            const namespace = "Namespace0"
            const lexer = tokenize(namespace).start().next()

            const namespace_res = parse_namespace(lexer)

            if (namespace_res.kind === 'NamespaceError') {
                throw Error(namespace_res.error)
            }

            expect(namespace_res.namespace.join('.')).equals(namespace)
        })
        it('should parse "Namespace0.Namespace1"', () => {
            const namespace = "Namespace0.Namespace1"
            const lexer = tokenize(namespace).start().next()

            const namespace_res = parse_namespace(lexer)

            if (namespace_res.kind === 'NamespaceError') {
                throw Error(namespace_res.error)
            }

            expect(namespace_res.namespace.join('.')).equals(namespace)
        })
        it('should parse an error for "*"', ()=> {
            const not_a_namespace = "*"
            const lexer = tokenize(not_a_namespace).start().next()

            const namespace_res = parse_namespace(lexer)

            expect(namespace_res.kind).equals('NamespaceError')
        })
    })
    it('should parse without error', () => {
        const lexer = tokenize(command)
        const parsed = parse_commands(lexer)

        expect(parsed).to.have.length.above(0, "No commands parsed")
    })
})

/*
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
*/