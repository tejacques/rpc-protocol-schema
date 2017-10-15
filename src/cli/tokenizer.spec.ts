import { 
    tokenize,
    lexer_result,
} from './tokenizer'
import { expect } from 'chai'
import 'mocha'

// let command = `CREATE TYPE foo {
//     bar: Int32
//}`

//let command2 = `  CREATE TYPE foo2 { bar:    Int32, baz: Int8 }`

let command3 = 
`CREATE STRUCT foo {
    bar: Int32
    baz: Float32
}`

describe('tokenizer', () => {
    describe('command3', () => {
        let tokenizer = tokenize(command3)
        let all_tokens: lexer_result[] = []
        let expected_tokens = [{
            type: 'IDENTIFIER',
            token: 'CREATE',
            line: 1,
            column: 1,
        }, {
            type: 'IDENTIFIER',
            token: 'STRUCT',
            line: 1,
            column: 8,
        }, {
            type: 'IDENTIFIER',
            token: 'foo',
            line: 1,
            column: 15,
        }, {
            type: 'L_BRACE',
            token: '{',
            line: 1,
            column: 19,
        }, {
            type: 'NEWLINE',
            token: '\n',
            line: 2,
            column: 0,
        }, {
            type: 'IDENTIFIER',
            token: 'bar',
            line: 2,
            column: 5,
        }, {
            type: 'COLON',
            token: ':',
            line: 2,
            column: 8,
        }, {
            type: 'IDENTIFIER',
            token: 'Int32',
            line: 2,
            column: 10,
        }, {
            type: 'NEWLINE',
            token: '\n',
            line: 3,
            column: 0,
        }, {
            type: 'IDENTIFIER',
            token: 'baz',
            line: 3,
            column: 5,
        }, {
            type: 'COLON',
            token: ':',
            line: 3,
            column: 8,
        }, {
            type: 'IDENTIFIER',
            token: 'Float32',
            line: 3,
            column: 10,
        }, {
            type: 'NEWLINE',
            token: '\n',
            line: 4,
            column: 0,
        }, {
            type: 'R_BRACE',
            token: '}',
            line: 4,
            column: 1,
        }]
        for (const token of tokenizer) {
            all_tokens.push(token)
        }
        const expectHelper = (token: lexer_result,
            expectedToken: {
                type: string,
                token: string,
                line: number,
                column: number
            }) => {
            expect(token.value.type).equals(expectedToken.type)
            expect(token.value.token).equals(expectedToken.token)
            expect(token.state.line).equals(expectedToken.line)
            expect(token.state.column).equals(expectedToken.column)
        }

        it('should produce tokens', () => {
            expect(all_tokens).length(14, 'should have lexed 14 tokens')
        })

        it('should hold correct type, token, line, and column for each token', () => {
            for (let i = 0; i < all_tokens.length; i++) {
                console.log(i)
                console.log(all_tokens[i].value)
                let filterInput = all_tokens[i].state
                filterInput.input = ''
                console.log(filterInput)
                console.log(expected_tokens[i])
                expectHelper(all_tokens[i], expected_tokens[i])
            }
        })
    })
})