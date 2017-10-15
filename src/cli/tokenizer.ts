export type operator_token =
      'PLUS'
    | 'MINUS'
    | 'MULTIPLY'
    | 'DIVIDE'
    | 'DOT'
    | 'BACKSLASH'
    | 'COLON'
    | 'PERCENT'
    | 'PIPE'
    | 'EXCLAMATION'
    | 'QUESTION'
    | 'POUND'
    | 'AMPERSAND'
    | 'SEMI'
    | 'COMMA'
    | 'L_PAREN'
    | 'R_PAREN'
    | 'L_ANG'
    | 'R_ANG'
    | 'L_BRACE'
    | 'R_BRACE'
    | 'L_BRACKET'
    | 'R_BRACKET'
    | 'EQUALS'

export type token_type = 'NUMBER'
    | 'IDENTIFIER'
    | 'QUOTE'
    | 'COMMENT'
    | 'NEWLINE'
    | 'START'
    | 'END'
    | operator_token

// Operator table, mapping operator -> token name
const optable: { [name: string]: void | operator_token } = {
    '+':  'PLUS' as 'PLUS',
    '-':  'MINUS' as 'MINUS',
    '*':  'MULTIPLY' as 'MULTIPLY',
    '.':  'DOT' as 'DOT',
    '/': 'DIVIDE' as 'DIVIDE',
    '\\': 'BACKSLASH' as 'BACKSLASH',
    ':':  'COLON' as 'COLON',
    '%':  'PERCENT' as 'PERCENT',
    '|':  'PIPE' as 'PIPE',
    '!':  'EXCLAMATION' as 'EXCLAMATION',
    '?':  'QUESTION' as 'QUESTION',
    '#':  'POUND' as 'POUND',
    '&':  'AMPERSAND' as 'AMPERSAND',
    ';':  'SEMI' as 'SEMI',
    ',':  'COMMA' as 'COMMA',
    '(':  'L_PAREN' as 'L_PAREN',
    ')':  'R_PAREN' as 'R_PAREN',
    '<':  'L_ANG' as 'L_ANG',
    '>':  'R_ANG' as 'R_ANG',
    '{':  'L_BRACE' as 'L_BRACE',
    '}':  'R_BRACE' as 'R_BRACE',
    '[':  'L_BRACKET' as 'L_BRACKET',
    ']':  'R_BRACKET' as 'R_BRACKET',
    '=':  'EQUALS' as 'EQUALS',
}

function whitespace_width(character: string) {
    return character === ' ' ? 1 : character === '\t' ? 4 : 0
}

function is_newline(character: string) {
    return character === '\r' || character === '\n'
}

const alpha_characters: { [character: string]: boolean } = {}
const numeric_characters: { [character: string]: boolean } = {}
const alphanumeric_characters: {[alphanumeric: string]: boolean} = {}
for (let i = 'a'.charCodeAt(0); i <= 'z'.charCodeAt(0); i++) {
    alpha_characters[String.fromCharCode(i)] = true
    alphanumeric_characters[String.fromCharCode(i)] = true
}
for (let i = 'A'.charCodeAt(0); i <= 'Z'.charCodeAt(0); i++) {
    alpha_characters[String.fromCharCode(i)] = true
    alphanumeric_characters[String.fromCharCode(i)] = true
}
for (let i = '0'.charCodeAt(0); i <= '9'.charCodeAt(0); i++) {
    numeric_characters[String.fromCharCode(i)] = true
    alphanumeric_characters[String.fromCharCode(i)] = true
}
alpha_characters['_'] = true
alphanumeric_characters['_'] = true

function is_alpha(character: string) {
    return alpha_characters[character] || false
}

function is_numeric(character: string) {
    return numeric_characters[character] || false
}

function is_alphanumeric(character: string) {
    return alphanumeric_characters[character] || false
}

export interface lexer_state {
    start_index: number
    end_index: number
    line: number
    column: number
    input: string
}

export interface lexer_token {
    type: token_type
    token: string
}

export interface lexer_result {
    state: lexer_state
    value: lexer_token
}

export interface LexerIterator extends Iterable<lexer_result> {
    next: () => LexerIterator
    current: () => lexer_result
    done: () => boolean
}

function *IterateTokens(state: lexer_state) {
    let res = next_result(state, 'START')
    console.log(res.value, res.state.line, res.state.column)
    while(true) {
        res = next(res.state)
        console.log(res.value, res.state.line, res.state.column)
        if (res.value.type !== 'END') {
            yield res
        } else {
            return res
        }
    }
}

export class Tokenizer implements Iterable<lexer_result> {
    readonly state: lexer_state
    constructor(input: string) {
        this.state = {
            start_index: 0,
            end_index: 0,
            line: 1,
            column: 1,
            input: input,
        }
    }

    start(): InstantiatedTokenizer {
        const result = next_result(this.state, 'START')
        return new InstantiatedTokenizer(result)
    }

    [Symbol.iterator]() {
        return IterateTokens(this.state)
    }
}

export interface TokenSuccess {
    kind: 'TokenSuccess'
    token: lexer_token
    lexer: InstantiatedTokenizer
}
export function TokenSuccess(lexer: InstantiatedTokenizer, token: lexer_token): TokenSuccess {
    return {
        kind: 'TokenSuccess',
        token,
        lexer,
    }
}

export interface TokenError {
    kind: 'TokenError'
    error: string
    lexer: InstantiatedTokenizer
}
export function TokenError(lexer: InstantiatedTokenizer, error: string): TokenError {
    return {
        kind: 'TokenError',
        error,
        lexer,
    }
}

export type TokenResult = TokenSuccess | TokenError

export class InstantiatedTokenizer implements LexerIterator {
    readonly result: lexer_result
    constructor(result: lexer_result) {
        this.result = result
    }

    current(): lexer_result {
        return this.result
    }

    next(): InstantiatedTokenizer {
        const result = next(this.result.state)
        return new InstantiatedTokenizer(result)
    }

    done(): boolean {
        return this.result.value.type !== 'END'
    }

    [Symbol.iterator]() {
        return IterateTokens(this.result.state)
    }

    matchType<TOut>(
        type: token_type,
        onMatch: (token: lexer_token) => TOut,
        noMatch: (token: lexer_token) => TOut): TOut {
        if (this.result.value.type === type) {
            return onMatch(this.result.value)
        }

        return noMatch(this.result.value)
    }

    matchText<TOut>(
        token: string,
        onMatch: (token: lexer_token) => TOut,
        noMatch: (token: lexer_token) => TOut): TOut {
        if (this.result.value.token === token) {
            return onMatch(this.result.value)
        }

        return noMatch(this.result.value)
    }

    consumeType(type: token_type): TokenResult {
        return this.matchType<TokenResult>(type,
            token =>
                TokenSuccess(this.next(), token),
            token =>
                TokenError(this, `Expected ${type} but got ${token.type} with value: '${token.token}'`)
        )
    }

    consumeText(text: string): TokenResult {
        return this.matchText<TokenResult>(text,
            token =>
                TokenSuccess(this.next(), token),
            token =>
                TokenError(this, `Expected '${text}' but got '${token.token}'`)
        )
    }
}

export function tokenize(input: string): Tokenizer {
    return new Tokenizer(input)
}


const update_state = (state: lexer_state, partial: Partial<lexer_state>): lexer_state => {
    return {
        ...state,
        ...partial
    }
}

const next_result = (state: lexer_state, type: token_type): lexer_result => {
    const token = state.input.substring(state.start_index, state.end_index)
    
    const current_token = {
        type,
        token,
    }

    return {
        state: state,
        value: current_token
    }
}

const process_non_tokens = (state: lexer_state) => {
    let num_whitespace: number

    let end_index = state.end_index
    let column = state.column

    while((num_whitespace = whitespace_width(state.input[end_index])) > 0) {
        end_index++,
        column += num_whitespace
    }

    return update_state(state, {
        start_index: end_index,
        end_index,
        column,
    })
}

const process_quote = (state: lexer_state, quote_literal: string) => {
    let st = update_state(state, {
        end_index: state.input.indexOf(
            quote_literal, state.start_index+quote_literal.length)
    })

    if (st.end_index === -1) {
        throw Error(`Error: Unterminated quote starting at line: ${st.line}`
            +`, column: ${st.column}, index: ${st.start_index}`);
    }

    return next_result(st, 'QUOTE')
}

const process_identifier = (state: lexer_state) => {
    let end_index = state.end_index+1
    const len = state.input.length
    while (end_index < len && is_alphanumeric(state.input[end_index])) {
        end_index++
    }

    return next_result(update_state(state, { end_index }), 'IDENTIFIER')
}

const process_number = (state: lexer_state) => {
    let end_index = state.end_index
    while (is_numeric(state.input[end_index])) {
        end_index++
    }

    return next_result(update_state(state, { end_index }), 'NUMBER')
}

const process_newline = (state: lexer_state) => {
    let end_index = state.end_index
    let line = state.line
    let column = state.column
    while(is_newline(state.input[end_index])) {
        end_index++
        line++
        column = 0
    }

    return next_result(
        update_state(state, { end_index, line, column }), 'NEWLINE')
}

function next(st: lexer_state): lexer_result {
    const new_state = update_state(st, {
        start_index: st.end_index,
        column: st.column + (st.end_index - st.start_index)
    })
    if (new_state.start_index >= new_state.input.length) {
        return next_result(new_state, 'END') 
    }
    let state = process_non_tokens(new_state)

    const current_char = state.input[state.end_index]

    const operator = optable[current_char]
    if (operator) {
        return next_result(
            update_state(state, { end_index: state.end_index+1 }), operator)
    }

    if (is_newline(current_char)) {
        return process_newline(state)
    }

    if (is_alpha(current_char)) {
        return process_identifier(state)
    }

    if (is_numeric(current_char)) {
        return process_number(state)
    }

    if (current_char === '"' || current_char === "'") {
        return process_quote(state, current_char)
    }

    throw new Error(`Error processing next token at `
        +`line: ${state.line}, column: ${state.column}, `
        +`position: ${state.start_index}, char: '${current_char}'`)
}