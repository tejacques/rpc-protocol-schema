import {
    parse_token,
    try_parse_token,
    parse_inner_series,
    parse_name_token,
} from './parser_helper'

import {
    tokenize,
    lexer_token,
    token_type,
} from './tokenizer'

import {
    Type,
    is_primitive_type,
    PrimitiveType,
    //ListType,
    GenericType,
} from './types'

import {
    Value,
    parse_value,
} from './value'

export function parse_namespace(lexer: IterableIterator<lexer_token>) {
    const names: string[] = []

    let next_token: lexer_token
    do {
        const next = lexer.next()
        next_token = next.value
        names.push(parse_name_token(next_token))
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

export function parse_method(lexer: IterableIterator<lexer_token>): Method {
    const name = parse_name(lexer)

    let generics: string[] = []
    let request: Field[] = []
    let response: Field[] = []
    
    const token = lexer.next().value;

    // Reset token
    lexer.next(token)
    switch(token.token) {
    case '<':
        generics = parse_generics(lexer)
        // Fall through
    case '(':
        request = parse_fields('L_PAREN', 'R_PAREN', lexer)
        try {
            parse_token('=', lexer)
            parse_token('>', lexer)
        } catch(e) {
            throw Error(`Error: expected '=>' to follow method declaration`)
        }
        response = parse_fields('L_PAREN', 'R_PAREN', lexer)
        break
    default:
        throw Error(`Error: expected generic arguments beginning with '<', or fields beginning with '{' but got ${token.token}`)
    }

    return Method(name, generics, request, response)
}

export function parse_methods(
    start_token: token_type,
    end_token: token_type,
    lexer: IterableIterator<lexer_token>): Method[] {
    return parse_inner_series(
        'methods',
        start_token,
        end_token,
        ['COMMA', 'NEWLINE'],
        parse_method,
        lexer)
}

export function parse_interface(lexer: IterableIterator<lexer_token>): Interface {
    const namespace = parse_namespace(lexer)
    const name = namespace.pop()

    if (!name) {
        throw Error(`Error: Interface has no name`)
    }

    const methods = parse_methods('L_BRACE', 'R_BRACE', lexer)

    return Interface(name, namespace, methods)
}

export function parse_constant(lexer: IterableIterator<lexer_token>) {
    const namespace = parse_namespace(lexer)
    const name = namespace.pop()

    if (!name) {
        throw Error(`Error: Constant has no name`)
    }

    parse_token(':', lexer)
    const type = parse_type(lexer)
    parse_token('=', lexer)
    const value = parse_value(lexer)

    return Constant(name, namespace, type, value)
}

export function parse_create(lexer: IterableIterator<lexer_token>): CreateCommand {
    const next = lexer.next()
    if (next.done) {
        throw Error('Error unexpected end of command while trying to parse CREATE statement')
    }
    const nextToken = next.value

    switch(nextToken.token.toUpperCase()) {
    case 'STRUCT':
        return parse_kind('STRUCT', lexer)
    case 'UNION':
        return parse_kind('UNION', lexer)
    case 'INTERFACE':
        return parse_interface(lexer)
    case 'NAMESPACE':
        return {
            kind: 'NAMESPACE',
            namespace: parse_namespace(lexer)
        }
    case 'CONSTANT':
        return parse_constant(lexer)
    }
    throw Error(`Expected one of {STRUCT, UNION, INTERFACE, NAMESPACE}, but got ${nextToken.token}`)
}

export interface Struct {
    kind: 'STRUCT'
    generics: string[]
    namespace: string[]
    name: string
    fields: Field[]
}
export interface Union {
    kind: 'UNION'
    generics: string[]
    namespace: string[]
    name: string
    fields: Field[]
}
export interface Method {
    kind: 'METHOD'
    generics: string[]
    name: string
    request: Field[]
    response: Field[]
}
export interface Namespace {
    kind: 'NAMESPACE'
    namespace: string[]
}
export interface Interface {
    kind: 'INTERFACE'
    namespace: string[]
    name: string
    methods: Method[]
}
export interface Constant {
    kind: 'CONSTANT'
    namespace: string[]
    name: string
    type: Type
    value: Value
}

export type CreateCommandType = Struct | Union | Interface | Namespace | Constant

export type CreateCommand = {
    kind: 'CREATE'
    type: CreateCommandType
}

export interface DeleteCommand {
    kind: 'DELETE'
    namespace: string[]
    name: string
}

export interface UpdateCommand {
    kind: 'UPDATE'
}

export type Command = CreateCommand | DeleteCommand | UpdateCommand

export function Struct(name: string, namespace: string[], generics: string[], fields: Field[]): Struct {
    return {
        kind: 'STRUCT',
        generics,
        name,
        namespace,
        fields
    }
}

export function Union(name: string, namespace: string[], generics: string[], fields: Field[]): Union {
    return {
        kind: 'UNION',
        generics,
        name,
        namespace,
        fields
    }
}

export function Kind(
    kind: 'STRUCT' | 'UNION',
    name: string,
    namespace: string[],
    generics: string[],
    fields: Field[]): Struct | Union {
    if(kind === 'STRUCT') {
        return Struct(name, namespace, generics, fields)
    } else {
        return Union(name, namespace, generics, fields)
    }
}

export function Interface(name: string, namespace: string[], methods: Method[]): Interface {
    return {
        kind: 'INTERFACE',
        name,
        namespace,
        methods
    }
}

export function Method(name: string, generics: string[], request: Field[], response: Field[]): Method {
    return {
        kind: 'METHOD',
        generics,
        name,
        request,
        response
    }
}

export function Constant(name: string, namespace: string[], type: Type, value: Value): Constant {
    return {
        kind: 'CONSTANT',
        name,
        namespace,
        type,
        value,
    }
}

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

export function parse_name(lexer: IterableIterator<lexer_token>) {
    const next = lexer.next()
    if (next.done) {
        throw Error('Error unexpected end of command while trying to parse CREATE statement')
    }
    return parse_name_token(next.value)
}

export function parse_type(lexer: IterableIterator<lexer_token>): Type {
    const namespace = parse_namespace(lexer)
    const name = namespace.pop()

    if (!name) {
        throw Error(`Error: Type has no name`)
    }

    if(is_primitive_type(name)) {
        return PrimitiveType(name)
    } else {
        // if (name === 'List') {
        //     return ListType(parse_generic_type(lexer))
        // }

        const [matches, parsed_token] = try_parse_token('<', lexer)
        let types: Type[] = []
        if (matches) {
            // Reset
            lexer.next(parsed_token)
            types = parse_generic_types(lexer)
        }
        return GenericType(name, namespace, types)
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

// function is_close_brace(closing_brace_token: lexer_token) {
//     return closing_brace_token.token === '}'
// }

function is_dot_character(dot_token: lexer_token) {
    return dot_token.token === '.'
}

export function parse_field(lexer: IterableIterator<lexer_token>) {
    const name_token = lexer.next().value
    const name = parse_name_token(name_token)
    parse_token(':', lexer)
    const type = parse_type(lexer)
    return Field(name, type)
}

export function parse_fields(
    start_token: token_type,
    end_token: token_type,
    lexer: IterableIterator<lexer_token>): Field[] {
        return parse_inner_series(
            'fields',
            start_token,
            end_token,
            ['COMMA', 'NEWLINE'],
            parse_field,
            lexer)
}

export function parse_kind(kind: 'STRUCT' | 'UNION', lexer: IterableIterator<lexer_token>) {
    const namespace = parse_namespace(lexer)
    const name = namespace.pop()

    if (!name) {
        throw Error(`Error: Interface has no name`)
    }

    let generics: string[] = []
    let fields: Field[] = []
    
    const token = lexer.next().value;
    // Reset
    lexer.next(token)
    switch(token.token) {
    case '<':
        generics = parse_generics(lexer)
        // Fall through
    case '{':
        fields = parse_fields('L_BRACE', 'R_BRACE', lexer)
        break
    default:
        throw Error(`Error: expected generic arguments beginning with '<', or fields beginning with '{' but got ${token.token}`)
    }

    return Kind(kind, name, namespace, generics, fields)
}

export function parse_command(lexer: IterableIterator<lexer_token>) {
    const next = lexer.next()
    if (next.done) {
        throw Error('Error unexpected end of command while trying to parse a command')
    }
    const nextToken = next.value

    switch (nextToken.token.toUpperCase()) {
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

export function parse_commands(lexer: IterableIterator<lexer_token>) {
    let next: IteratorResult<lexer_token>
    const commands: CreateCommand[] = []
    while((next = lexer.next()) && !next.done) {
        const nextToken = next.value
        switch (nextToken.type) {
            case 'NEWLINE':
            case 'END':
                continue
            case 'IDENTIFIER':
                // Reset Lexer
                lexer.next(nextToken)
                commands.push(parse_command(lexer))
                break
        }
    }

    return commands
}

export function parse(command: string) {
    const lexer = tokenize(command);
    return parse_commands(lexer)
}