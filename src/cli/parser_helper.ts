import {
    lexer_token,
    token_type,
} from './tokenizer'

export function parse_token(token_string: string, lexer: IterableIterator<lexer_token>) {
    const next = lexer.next()
    if (next.done) {
        throw Error(`Error: unexpected end of stream`)
    }

    if (next.value.token !== token_string) {
        throw Error(`Error: Expected '${token_string}' but got '${next.value.token}'`)
    }
}

export function try_parse_token(token_string: string, lexer: IterableIterator<lexer_token>): [boolean, lexer_token] {
    const next = lexer.next()
    if (next.done) {
        throw Error(`Error: unexpected end of stream`)
    }

    if (next.value.token === token_string) {
        return [true, next.value]
    } else {
        lexer.next(next.value)
        return [false, next.value]
    }
}

export function try_parse_type(type: token_type, lexer: IterableIterator<lexer_token>): [boolean, lexer_token] {
    const next = lexer.next()
    if (next.done) {
        throw Error(`Error: unexpected end of stream`)
    }

    if (next.value.type === type) {
        return [true, next.value]
    } else {
        lexer.next(next.value)
        return [false, next.value]
    }
}

export function try_parse_types(types: token_type[], lexer: IterableIterator<lexer_token>): [boolean, lexer_token] {
    const next = lexer.next()
    if (next.done) {
        throw Error(`Error: unexpected end of stream`)
    }

    if (types.indexOf(next.value.type) !== -1) {
        return [true, next.value]
    } else {
        lexer.next(next.value)
        return [false, next.value]
    }
}

export function parse_name_token(token: lexer_token) {
    if (/[a-zA-Z0-9_]+/.test(token.token)) {
        return token.token
    } else {
        throw Error(`Name: '${token.token}' must be lowercase snake_case and alphanumeric, beginning with an alpha character`)
    }
}

export function parse_inner_series<InnerType>(
    name: string,
    start_token: token_type,
    end_token: token_type,
    separator_tokens: token_type[],
    parse_inner: (lexer: IterableIterator<lexer_token>) => InnerType,
    lexer: IterableIterator<lexer_token>
): InnerType[] {
    let next_token = lexer.next().value
    if (next_token.type !== start_token) {
        throw Error(`Error: expected ${name} beginning with ${start_token}, but got '${next_token.type}'`)
    }
    next_token = lexer.next().value
    if (next_token.type !== 'NEWLINE') {
        // Reset
        lexer.next(next_token)
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
                lexer.next(next_token)
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
