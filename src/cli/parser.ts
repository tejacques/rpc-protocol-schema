import {
    parse_token,
    try_parse_token,
    parse_inner_series,
    parse_name_token,
} from './parser_helper'

import {
    tokenize,
    Tokenizer,
    InstantiatedTokenizer,
    LexerIterator,
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

export interface NamespaceSuccess {
    kind: 'NamespaceSuccess'
    namespace: string[]
    lexer: LexerIterator
}

export function NamespaceSuccess(lexer: LexerIterator, names: string[]): NamespaceSuccess {
    return {
        kind: 'NamespaceSuccess',
        namespace: names,
        lexer,
    }
}

export interface NamespaceError {
    kind: 'NamespaceError'
    error: string
    lexer: LexerIterator
}

export function NamespaceError(lexer: LexerIterator, error: string): NamespaceError {
    return {
        kind: 'NamespaceError',
        error,
        lexer,
    }
}

export type NamespaceResult = NamespaceSuccess | NamespaceError

/**
 * This function takes a LexerIterator, and returns either a successfully
 * parsed namespace and the continuation iterator, or a NamespaceError
 * with the accompanying failure message and lexer state.
 * 
 * @param iterArg The LexerIterator
 */
export function parse_namespace(iterArg: LexerIterator): NamespaceResult {
    const names: string[] = []
    let iter = iterArg

    let next_dot_token: lexer_token
    while(true) {
        const nameRes = parse_name_token(iter)
        if (nameRes.kind === 'NameSuccess') {
            names.push(nameRes.name)
            iter = nameRes.lexer
        } else {
            return NamespaceError(nameRes.lexer, nameRes.error)
        }

        const next_dot = iter.next()
        next_dot_token = next_dot.current().value
        if (!is_dot_character(next_dot_token)) {
            return NamespaceSuccess(iter, names)
        }
    }
}

export function parse_namespace_token(token: lexer_token) {
    if (/[A-Z][a-z0-9]*/.test(token.token)) {
        return token.token
    } else {
        throw Error(`Namespace must begin with an uppercase alpha character, followed by lowercase alphanumeric characters`)
    }
}

export function parse_method(iterArg: LexerIterator): Method {
    const nameRes = parse_name(iterArg)
    if (nameRes.kind == 'NameError') {
        throw Error(nameRes.error)
    }
    const name = nameRes.name
    let iter = nameRes.lexer

    let generics: string[] = []
    let request: Field[] = []
    let response: Field[] = []
    
    const iterRes = iter.next().current();

    switch(iterRes.value.token) {
    case '<':
        generics = parse_generics(iter)
        // Fall through
    case '(':
        const requestFieldsRes = parse_fields('L_PAREN', 'R_PAREN', iter)
        if (requestFieldsRes.kind == 'FieldError') {
            throw Error(requestFieldsRes.error)
        }
        request = requestFieldsRes.fields
        try {
            iter = parse_token('=', iter)
            iter = parse_token('>', iter)
        } catch(e) {
            throw Error(`Error: expected '=>' to follow method declaration`)
        }
        const responseFieldsRes = parse_fields('L_PAREN', 'R_PAREN', iter)
        if (responseFieldsRes.kind == 'FieldError') {
            throw Error(responseFieldsRes.error)
        }
        response = responseFieldsRes.fields
        break
    default:
        throw Error(`Error: expected generic arguments beginning with '<', or fields beginning with '{' but got ${token.token}`)
    }

    return Method(name, generics, request, response)
}

export function parse_methods(
    start_token: token_type,
    end_token: token_type,
    lexer: LexerIterator): Method[] {
    return parse_inner_series(
        'methods',
        start_token,
        end_token,
        ['COMMA', 'NEWLINE'],
        parse_method,
        lexer)
}

export function parse_interface(lexer: LexerIterator): Interface {
    const namespace = parse_namespace(lexer)
    const name = namespace.pop()

    if (!name) {
        throw Error(`Error: Interface has no name`)
    }

    const methods = parse_methods('L_BRACE', 'R_BRACE', lexer)

    return Interface(name, namespace, methods)
}

export function parse_constant(lexer: LexerIterator) {
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

export function parse_create(lexer: LexerIterator): CreateCommand {
    return {
        kind: 'CREATE',
        type: parse_create_type(lexer)
    }
}

export function parse_create_type(lexer: LexerIterator): CreateCommandType {
    const next = lexer.next()
    if (next.done) {
        throw Error('Error unexpected end of command while trying to parse CREATE statement')
    }
    const nextToken = next.value

    switch(nextToken.token.toUpperCase()) {
    case 'STRUCT':
        return parse_data_type('STRUCT', lexer)
    case 'UNION':
        return parse_data_type('UNION', lexer)
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

export function DataType(
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
    value?: Value
}
export function Field(name: string, type: Type, value?: Value): Field {
    return {
        name,
        type,
        value,
    }
}

export function parse_name(iter: LexerIterator) {
    return parse_name_token(iter)
}

export interface ParseTypeSuccess {
    kind: 'ParseTypeSuccess'
    type: Type
    lexer: LexerIterator
}
export function ParseTypeSuccess(lexer: LexerIterator, type: Type): ParseTypeSuccess {
    return {
        kind: 'ParseTypeSuccess',
        type,
        lexer,
    }
}

export interface ParseTypeError {
    kind: 'ParseTypeError'
    error: string
    lexer: LexerIterator
}
export function ParseTypeError(lexer: LexerIterator, error: string): ParseTypeError {
    return {
        kind: 'ParseTypeError',
        error,
        lexer,
    }
}

export type ParseTypeResult = ParseTypeSuccess | ParseTypeError

export function parse_type(lexer: LexerIterator): ParseTypeResult {
    const namespace_res = parse_namespace(lexer)
    if (namespace_res.kind === 'NamespaceError') {
        return ParseTypeError(namespace_res.lexer, namespace_res.error)
    }
    const name = namespace.pop()

    if (!name) {
        throw Error(`Error: Type has no name`)
    }

    if(is_primitive_type(name)) {
        return ParseTypeSuccess(namespace_res.lexer, PrimitiveType(name))
    } else {
        const [matches, parsed_token] = try_parse_token('<', lexer)
        let types: Type[] = []
        if (matches) {
            // Reset
            lexer.reset(parsed_token)
            types = parse_generic_types(lexer)
        }
        return GenericType(name, namespace, types)
    }
}

export function parse_generic_type(lexer: LexerIterator): Type {
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

export function parse_generic_types(lexer: LexerIterator): Type[] {
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

export function parse_generics(lexer: LexerIterator): string[] {
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

export interface FieldSuccess {
    kind: 'FieldSuccess'
    field: Field
    lexer: LexerIterator
}
export function FieldSuccess(lexer: LexerIterator, field: Field): FieldSuccess {
    return {
        kind: 'FieldSuccess',
        field,
        lexer,
    }
}

export interface FieldError {
    kind: 'FieldError'
    error: string
    lexer: LexerIterator
}
export function FieldError(lexer: LexerIterator, error: string): FieldError {
    return {
        kind: 'FieldError',
        error,
        lexer,
    }
}

export type FieldResult = FieldSuccess | FieldError

export function parse_field(lexer: LexerIterator): FieldResult {
    const name_res = parse_name_token(lexer)
    if (name_res.kind === 'NameError') {
        return FieldError(name_res.lexer, name_res.error)
    }
    let iter = name_res.lexer
    iter = parse_token(':', iter)
    const typeRes = parse_type(iter)
    return FieldSuccess(iter, Field(name_res.name, type))
}

export function parse_fields(
    start_token: token_type,
    end_token: token_type,
    lexer: LexerIterator): FieldResult[] {
        return parse_inner_series(
            'fields',
            start_token,
            end_token,
            ['COMMA', 'NEWLINE'],
            parse_field,
            lexer)
}

export interface DataTypeSuccess {
    kind: 'DataTypeSuccess'
    dataType: Struct | Union
    lexer: LexerIterator
}
export function DataTypeSuccess(lexer: LexerIterator, dataType: Struct | Union): DataTypeSuccess {
    return {
        kind: 'DataTypeSuccess',
        dataType,
        lexer,
    }
}

export interface DataTypeError {
    kind: 'DataTypeError'
    error: string
    lexer: LexerIterator
}
export function DataTypeError(lexer: LexerIterator, error: string): DataTypeError {
    return {
        kind: 'DataTypeError',
        error,
        lexer,
    }
}

export type DataTypeResult = DataTypeSuccess | DataTypeError

export function parse_data_type(kind: 'STRUCT' | 'UNION', lexer: LexerIterator): DataTypeResult {
    const namespace_res = parse_namespace(lexer)
    if (namespace_res.kind === 'NamespaceError') {
        throw Error(namespace_res.error)
    }
    const namespace = namespace_res.namespace
    const name = namespace.pop()
    let iter = namespace_res.lexer

    if (!name) {
        throw Error(`Error: Interface has no name`)
    }

    let generics: string[] = []
    let fields: Field[] = []
    
    const token = iter.next().current().value;

    switch(token.token) {
    case '<':
        generics = parse_generics(iter)
        // Fall through
    case '{':
        const fields_res = parse_fields('L_BRACE', 'R_BRACE', iter)
        const field_errors = fields_res.filter(fr => fr.kind === 'FieldError') as FieldError[]
        if (field_errors.length) {
            // TODO: Make this work properly
            throw Error("Some shit happened")
        }
        fields = (fields_res.filter(fr => fr.kind === 'FieldSuccess') as FieldSuccess[])
            .map(f => f.field)
        break
    default:
        throw Error(`Error: expected generic arguments beginning with '<', or fields beginning with '{' but got ${token.token}`)
    }

    return DataTypeSuccess(iter, DataType(kind, name, namespace, generics, fields))
}

export function parse_command(lexer: InstantiatedTokenizer) {
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
        return parse_update(lexer)*/
    default:
        throw Error(`Expected one of {CREATE, DELETE, SHOW, ALTER}, but got: '${nextToken.token}'`)
    }

}

export function parse_commands(lexer: Tokenizer) {
    let iter: InstantiatedTokenizer = lexer.start()
    let lastIter = iter
    const commands: CreateCommand[] = []
    while((iter = iter.next()) && !iter.done()) {
        const nextToken = iter.current().value
        switch (nextToken.type) {
            case 'NEWLINE':
            case 'END':
                continue
            case 'IDENTIFIER':
                const parse_res = parse_command(lastIter)
                if (parse_res.kind == 'ParseError') {
                    return ParseCommandsError(parse_res.lexer, commands, parse_res.error)
                } else {
                    commands.push(parse_res.command)
                    iter = parse_res.lexer
                }
                break
        }

        lastIter = iter
    }

    return commands
}

export function parse(command: string) {
    const lexer = tokenize(command);
    return parse_commands(lexer)
}