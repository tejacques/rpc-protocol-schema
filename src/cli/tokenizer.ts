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

function is_whitespace(character: string) {
    return character === ' ' || character === '\t'
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


export interface lexer_token {
    type: token_type
    token: string
    start_index: number
    end_index: number
}
export function *tokenize(input: string) {
    let start_index = 0
    let end_index = 0

    const len = input.length
    let current_char = ''

    // const process_comment = () => {
    //     while(!is_newline(input[end_index]) && end_index < len) {
    //         end_index++
    //     }
    // }

    const process_non_tokens = () => {
        while(is_whitespace(input[end_index])) {
            end_index++
        }
        start_index = end_index
    }

    const process_quote = (quote_literal: string) => {
        end_index = input.indexOf(quote_literal, start_index+quote_literal.length)

        if (end_index === -1) {
            throw Error(`Error: Unterminated quote at ${start_index}`);
        }

        return yieldVal(next_token('QUOTE'))
    }

    const process_identifier = () => {
        end_index++
        while (end_index < len && is_alphanumeric(input[end_index])) {
            end_index++
        }

        return yieldVal(next_token('IDENTIFIER'))
    }

    const process_number = () => {
        while (is_numeric(input[end_index])) {
            end_index++
        }

        return yieldVal(next_token('NUMBER'))
    }

    const process_newline = () => {
        const saved_start = start_index
        while(is_newline(input[end_index])) {
            end_index++
            process_non_tokens()
        }
        start_index = saved_start

        return yieldVal(next_token('NEWLINE'))
    }

    const next_token = (type: token_type) => {
        const token = input.substring(start_index, end_index)
        
        const next: lexer_token = {
            type,
            token,
            start_index,
            end_index,
        }

        start_index = end_index

        return next
    }

    const yieldVal = function *(token: lexer_token) {
        const reset: void | lexer_token = yield token
        if (reset) {
            start_index = reset.start_index
            end_index = reset.start_index
            current_char = input[end_index]
            yield token
        }
    }

    while(true) {
        process_non_tokens()

        const current_char = input[end_index]

        const operator = optable[current_char]
        if (operator) {
            end_index++
            yield *yieldVal(next_token(operator))
            continue
        }

        if (is_newline(current_char)) {
            yield *process_newline()
            continue
        }

        if (is_alpha(current_char)) {
            yield *process_identifier()
            continue
        }

        if (is_numeric(current_char)) {
            yield *process_number()
            continue
        }

        if (current_char === '"' || current_char === "'") {
            yield *process_quote(current_char)
            continue
        }

        if (start_index >= len) {
            yield *yieldVal(next_token('END'))
            if (start_index >= len) {
                break
            }
            continue
        }

        throw new Error(`Error processing next token at position: ${start_index}, char: '${current_char}'`)
    }
}