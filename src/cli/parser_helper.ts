import {
    lexer_token,
    LexerIterator,
    token_type,
} from './tokenizer'

export function parse_token(token_string: string, lexer: LexerIterator): LexerIterator {
    const next = lexer.next()
    if (next.done()) {
        throw Error(`Error: unexpected end of stream`)
    }

    if (next.current().value.token !== token_string) {
        throw Error(`Error: Expected '${token_string}' but got '${next.current().value.token}'`)
    }

    return next
}

export function try_parse_token(token_string: string, lexer: LexerIterator): [boolean, lexer_token] {
    const next = lexer.next()
    if (next.done) {
        throw Error(`Error: unexpected end of stream`)
    }

    if (next.value.token === token_string) {
        return [true, next.value]
    } else {
        lexer.reset(next.value)
        return [false, next.value]
    }
}

export function try_parse_type(type: token_type, lexer: LexerIterator): [boolean, lexer_token] {
    const next = lexer.next()
    if (next.done) {
        throw Error(`Error: unexpected end of stream`)
    }

    if (next.value.type === type) {
        return [true, next.value]
    } else {
        lexer.reset(next.value)
        return [false, next.value]
    }
}

export function try_parse_types(types: token_type[], lexer: LexerIterator): [boolean, lexer_token] {
    const next = lexer.next()
    if (next.done) {
        throw Error(`Error: unexpected end of stream`)
    }

    if (types.indexOf(next.value.type) !== -1) {
        return [true, next.value]
    } else {
        lexer.reset(next.value)
        return [false, next.value]
    }
}


export interface NameSuccess {
    kind: 'NameSuccess'
    name: string
    lexer: LexerIterator
}
export function NameSuccess(lexer: LexerIterator, name: string): NameSuccess {
    return {
        kind: 'NameSuccess',
        name,
        lexer,
    }
}

export interface NameError {
    kind: 'NameError'
    error: string
    lexer: LexerIterator
}
export function NameError(lexer: LexerIterator, error: string): NameError {
    return {
        kind: 'NameError',
        error,
        lexer,
    }
}

export type NameResult = NameSuccess | NameError

export function parse_name_token(iter: LexerIterator): NameResult {
    const next = iter.next()
    const token = next.current().value
    if (token.type !== 'IDENTIFIER') {
        return NameError(
            next,
            `Expected IDENTIFIER token, but parsed ${token.type}`
        )
    }
    if (/[a-zA-Z_][a-zA-Z0-9_]*/.test(token.token)) {
        return NameSuccess(next, token.token)
    } else {
        return NameError(
            next,
            `Name: '${token.token}' must be lowercase snake_case and alphanumeric, beginning with an alpha character`)
    }
}

export function parse_inner_series<InnerType>(
    name: string,
    start_token: token_type,
    end_token: token_type,
    separator_tokens: token_type[],
    parse_inner: (lexer: LexerIterator) => InnerType,
    lexer: LexerIterator
): InnerType[] {
    let next_token = lexer.next().value
    if (next_token.type !== start_token) {
        throw Error(`Error: expected ${name} beginning with ${start_token}, but got '${next_token.type}'`)
    }
    next_token = lexer.next().value
    if (next_token.type !== 'NEWLINE') {
        // Reset
        lexer.reset(next_token)
    }
    const inner: InnerType[] = []
    do {
        inner.push(parse_inner(lexer))
        next_token = lexer.next().value
        if (separator_tokens.indexOf(next_token.type) !== -1) {
            next_token = lexer.next().value
            // If it's the end token end successfully
            // If it's the end of the token stream, error
            if (next_token.type === end_token || next_token.type === 'END') {
                break
            } else {
                lexer.reset(next_token)
            }
        } else if (next_token.type !== end_token && next_token.type !== 'END' ) {
            throw Error('Error: expected separator, or end token')
        }
    } while(next_token.type !== end_token && next_token.type !== 'END')

    if (next_token.type !== end_token) {
        throw Error(`Error: Expected ${end_token} but got ${next_token.type}: '${next_token.token}'`)
    }

    return inner
}
