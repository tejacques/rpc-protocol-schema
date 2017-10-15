import {
    primitive_type,
} from './types'

import {
    LexerIterator,
} from './tokenizer'

import {
    parse_token,
    try_parse_token,
    try_parse_type,
    try_parse_types,
    parse_inner_series,
    parse_name_token,
} from './parser_helper'

export interface PrimitiveValue {
    type: primitive_type
    value: string
}
export function PrimitiveValue(type: primitive_type, value: string): PrimitiveValue {
    return {
        type,
        value,
    }
}

export interface ListValue {
    type: 'List'
    values: Value[]
}
export function ListValue(values: Value[]): ListValue {
    return {
        type: 'List',
        values,
    }
}

export interface ObjectProperty {
    type: 'ObjectProperty'
    property: string
    value: Value
}
export function ObjectProperty(property: string, value: Value): ObjectProperty {
    return {
        type: 'ObjectProperty',
        property,
        value,
    }
}

export interface ObjectValue {
    type: 'Object'
    properties: ObjectProperty[]
}

export function ObjectValue(properties: ObjectProperty[]): ObjectValue {
    return {
        type: 'Object',
        properties,
    }
} 

export interface DateValue {
    type: 'Date'
    value: string
}

export function DateValue(value: string): DateValue {
    return {
        type: 'Date',
        value,
    }
}

export type Value = PrimitiveValue | ObjectValue | ListValue | DateValue

export function parse_object_property(lexer: LexerIterator): ObjectProperty {
    const name_token = lexer.next().value
    const name = parse_name_token(name_token)
    parse_token(':', lexer)
    const value = parse_value(lexer)
    return ObjectProperty(name, value)
}

export function parse_object_value(lexer: LexerIterator): ObjectValue {
    return ObjectValue(parse_inner_series(
        'object value',
        'L_BRACE',
        'R_BRACE',
        ['COMMA', 'NEWLINE'],
        parse_object_property,
        lexer))
}

export function parse_number(lexer: LexerIterator) {
    let next_token = lexer.next().value
    let value: string = ''
    let success: boolean
    let hasDot = false
    let type: primitive_type = 'Int64'
    let iterations = 0

    while(iterations < 2) {
        iterations++
        switch(next_token.type) {
        case 'MINUS':
            [success, next_token] = try_parse_types(['NUMBER', 'DOT'], lexer)
            value += '-'
            if (!success) {
                throw Error(`Error: Expected number to follow '-' value literal`)
            }
        case 'DOT':
            if (next_token.type === 'DOT') {
                [success, next_token] = try_parse_type('NUMBER', lexer)
                type = 'Float64' 
                hasDot = true
                value += '.'
                if (!success) {
                    throw Error(`Error: Expected number to follow '.' value literal`)
                }
            }
        case 'NUMBER':
            value += next_token.token
            if (!hasDot) {
                [success, next_token] = try_parse_token('.', lexer)
                if (success) {
                    continue
                }
            }
            return PrimitiveValue(type, value)
        }
    }

    throw Error(`Error: Failed to parse number`)
}

export function parse_value(lexer: LexerIterator): Value {
    const next_token = lexer.next().value

    switch(next_token.type) {
    case 'QUOTE':
        return PrimitiveValue('String', next_token.token)
    case 'MINUS': 
    case 'DOT':
    case 'NUMBER':
        // Reset
        lexer.reset(next_token)
        return parse_number(lexer)
    case 'L_BRACE':
        // type: <value>
        // Reset
        lexer.reset(next_token)
        return parse_object_value(lexer)
    case 'IDENTIFIER':
        if (next_token.token === 'true' || next_token.token === 'false') {
            return PrimitiveValue('Boolean', next_token.token)
        }
        if (next_token.token === 'void') {
            return PrimitiveValue('Void', 'void')
        }
        if (next_token.token === 'Date') {
            parse_token('(', lexer)
            const date_token = lexer.next().value
            if (date_token.type !== 'QUOTE') {
                throw Error(`Error: Expected string date within Date object`)
            }
            parse_token(')', lexer)
            return DateValue(date_token.token)
        }
    }

    throw Error(`Error: Invalid value`)
}

export function parse_list(lexer: LexerIterator): ListValue {
    return ListValue(parse_inner_series(
        'list value',
        'L_BRACKET',
        'R_BRACKET',
        ['COMMA', 'NEWLINE'],
        parse_value,
        lexer))
}