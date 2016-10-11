import {
    tokenize,
    lexer_token,
} from './tokenizer'

import { 
    primitive_type,
    is_primitive_type } from './types'

export function parse_namespace(lexer: IterableIterator<lexer_token>) {
    const next = lexer.next()
    const names: string[] = []
    let next_token = next.value
    let prev_token: lexer_token
    do {
        prev_token = next_token
        names.push(parse_namespace_token(next_token))
        next_token = lexer.next().value
    } while (is_dot_character(next_token))

    // Reset lexer to previous token
    lexer.next(next_token)

    return names
}

export function parse_namespace_token(token: lexer_token) {
    if (/[A-Z][a-z0-9]*/.test(token.token)) {
        return token.token
    } else {
        throw Error(`Namespace must begin with an uppercase alpha character, followed by lowercase alphanumeric characters`)
    }
}

export function parse_create(lexer: IterableIterator<lexer_token>): Struct | Union | Namespace {
    const next = lexer.next()
    if (next.done) {
        throw Error('Error unexpected end of command while trying to parse CREATE statement')
    }
    const nextToken = next.value

    switch(nextToken.token) {
    case 'STRUCT':
        return parse_kind('STRUCT', lexer)
    case 'UNION':
        return parse_kind('UNION', lexer)
    case 'NAMESPACE':
        return {
            kind: 'NAMESPACE',
            namespace: parse_namespace(lexer)
        }
    }
    throw Error(`Expected one of {STRUCT, UNION, NAMESPACE}, but got ${nextToken.token}`)
}

export interface Struct {
    kind: 'STRUCT'
    generics: string[]
    name: string
    fields: Field[]
}
export interface Union {
    kind: 'UNION'
    generics: string[]
    name: string
    fields: Field[]
}
export interface Namespace {
    kind: 'NAMESPACE'
    namespace: string[]
}

export function Kind(kind: 'STRUCT' | 'UNION', name: string, generics: string[], fields: Field[]): Struct | Union {
    return {
        kind,
        generics,
        name,
        fields
    } as Struct | Union
}

export interface PrimitiveType {
    name: primitive_type 
}
export function PrimitiveType(name: primitive_type): PrimitiveType {
    return {
        name
    }
}

export interface ListType {
    name: 'List'
    type: Type
}
export function ListType(type: Type): ListType {
    return {
        name: 'List',
        type
    }
}

export interface GenericType {
    name: string
    types: Type[]
}
export function GenericType(name: string, types: Type[]): GenericType {
    return {
        name,
        types
    }
}

export type Type = PrimitiveType | GenericType | ListType

export interface Field {
    name: string
    type: Type
}
export function Field(name: string, type: Type): Field {
    return {
        name,
        type
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

export function parse_name(lexer: IterableIterator<lexer_token>) {
    const next = lexer.next()
    if (next.done) {
        throw Error('Error unexpected end of command while trying to parse CREATE statement')
    }
    return parse_name_token(next.value)
}

export function parse_name_token(token: lexer_token) {
    if (/[a-z][a-z0-9_]*/.test(token.token)) {
        return token.token
    } else {
        throw Error(`Name must be lowercase snake_case and alphanumeric, beginning with an alpha character`)
    }
}

export function parse_type(lexer: IterableIterator<lexer_token>): Type {
    const next_token = lexer.next()
    if (next_token.done) {
        throw Error('Error unexpected end of command while trying to parse a command')
    }

    const token = next_token.value

    if(is_primitive_type(token.token)) {
        return PrimitiveType(token.token)
    } else {
        if (token.token === 'List') {
            return ListType(parse_generic_type(lexer))
        }

        const [matches, next_token] = try_parse_token('<', lexer)
        let types: Type[] = []
        if (matches) {
            // Reset
            lexer.next(next_token)
            types = parse_generic_types(lexer)
        }
        return GenericType(token.token, types)
    }
}

export function parse_generic_type(lexer: IterableIterator<lexer_token>): Type {
    let [res, token] = try_parse_token('<', lexer)
    if (!res) {
        throw Error(`Error: Expected '<' token but got ${token.token}`)
    }

    const type = parse_type(lexer)
    const [closed, last_token] = try_parse_token('>', lexer)
    if (closed) {
        return type
    }
    throw Error(`Error: Expected '>' closing token but got ${last_token.token}`)
}

export function parse_generic_types(lexer: IterableIterator<lexer_token>): Type[] {
    let [res, token] = try_parse_token('<', lexer)
    if (!res) {
        throw Error(`Error: Expected '<' token but got ${token.token}`)
    }

    const types: Type[] = []
    let next_token: lexer_token
    do {
        types.push(parse_type(lexer))
        next_token = lexer.next().value
    } while(next_token.token === ',')

    if (next_token.token === '>') {
        return types
    }
    throw Error(`Error: Expected '>' closing token but got ${next_token.token}`)
}

export function parse_generics(lexer: IterableIterator<lexer_token>): string[] {
    const generics: string[] = []
    const open_square_bracket = lexer.next().value
    if (open_square_bracket.token !== '<') {
        throw Error(`Error: expected generics to begin with '<' but got: ${open_square_bracket.token}`)
    }
    let next_token: lexer_token
    do {
        next_token = lexer.next().value
        if (/[A-Z][a-z0-9]*/.test(next_token.token)) {
            generics.push(next_token.token)
        }
        next_token = lexer.next().value
    } while (next_token.token === ',')
    if (next_token.token !== '>') {
        throw Error(`Error: expected generics to end with '>' but got: ${next_token.token}`)
    }
    return generics
}

function is_close_brace(closing_brace_token: lexer_token) {
    return closing_brace_token.token === '}'
}

function is_dot_character(dot_token: lexer_token) {
    return dot_token.token === '.'
}

export function parse_field(name_token: lexer_token, lexer: IterableIterator<lexer_token>) {
    const name = parse_name_token(name_token)
    const type = parse_type(lexer)
    return Field(name, type)
}

export function parse_fields(lexer: IterableIterator<lexer_token>) {
    let next_token = lexer.next().value;
    if (next_token.token !== '{') {
        throw Error(`Error: expected fields beginning with '{' following generic parameters, but got '${next_token.token}'`)
    }
    const fields: Field[] = []
    do {
        fields.push(parse_field(next_token, lexer))
        next_token = lexer.next().value
    } while(!is_close_brace(next_token))

    return fields
}

export function parse_kind(kind: 'STRUCT' | 'UNION', lexer: IterableIterator<lexer_token>) {
    const name = parse_name(lexer)

    let generics: string[] = []
    let fields: Field[] = []
    
    const token = lexer.next().value;
    switch(token.token) {
    case '<':
        lexer.next(token)
        generics = parse_generics(lexer)
        fields = parse_fields(lexer)
        break
    case '{':
        lexer.next(token)
        fields = parse_fields(lexer)
        break
    default:
        throw Error(`Error: expected generic arguments beginning with '<', or fields beginning with '{' but got ${token.token}`)
    }

    return Kind(kind, name, generics, fields)
}

export function parse_command(lexer: IterableIterator<lexer_token>) {
    const next = lexer.next()
    if (next.done) {
        throw Error('Error unexpected end of command while trying to parse a command')
    }
    const nextToken = next.value

    switch (nextToken.token) {
    case 'CREATE':
        return parse_create(lexer)
        /*
    case 'DELETE':
        return parse_delete(lexer)
    case 'SHOW':
        return parse_show(lexer)
    case 'ALTER':
        return parse_alter(lexer)*/
    default:
        throw Error(`Expected one of {CREATE, DELETE, SHOW, ALTER}, but got: '${nextToken.token}'`)
    }

}

export function parse(command: string) {
    const lexer = tokenize(command);
    return parse_command(lexer)
}