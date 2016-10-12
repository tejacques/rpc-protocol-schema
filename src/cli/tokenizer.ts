type operator_token =
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

type token_type = 'NUMBER'
    | 'IDENTIFIER'
    | 'QUOTE'
    | 'COMMENT'
    | operator_token

// Operator table, mapping operator -> token name
const optable: { [name: string]: void | operator_token } = {
    '+':  'PLUS' as 'PLUS',
    '-':  'MINUS' as 'MINUS',
    '*':  'MULTIPLY' as 'MULTIPLY',
    '.':  'DOT' as 'DOT',
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

function is_operator(character: string): void | operator_token {
    return optable[character]
}

function is_whitespace(character: string) {
    return character === ' ' || character === '\t'
}

function is_newline(character: string) {
    return character === '\r' || character === '\n'
}

export interface lexer_token {
    type: token_type
    token: string
    start_index: number
    end_index: number
}
export function *tokenize(command: string) {
    let start_index = 0
    let end_index = 0

    const len = command.length
    let current_char = ''
    let prev_char = ''

    const process_comment = () => {
        while(!is_newline(command[end_index]) && end_index < len) {
            end_index++
        }
    }

    const process_nontokens = () => {
        while(is_whitespace(command[end_index])) {
            end_index++
        }
        start_index = end_index
    }

    const process_quote = (quote_literal: string) => {
        end_index = command.indexOf(quote_literal, start_index+quote_literal.length)

        if (end_index === -1) {
            throw Error(`Error: Unterminated quote at ${start_index}`);
        }
    }

    const next_token = (type: token_type) => {
        const token = command.substring(start_index, end_index)
        
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
            end_index = reset.end_index
            current_char = command[end_index]
            yield token
        }
    }

    do for(current_char=command[end_index]; end_index < len;
        (prev_char = current_char, current_char = command[++end_index])) {

        // ignore consecutive whitespace
        if (is_whitespace(current_char)) {
            if (is_whitespace(prev_char) || prev_char === '' || prev_char === '{' || prev_char === '\n') {
                //start_index++
                next_token()
                continue
            } else {
                const next = next_token()
                yield *yieldVal(next)
                // This was a whitespace character so skip it
                start_index++
                continue
            }
        }

        // ignore consecutive newlines
        if (current_char === '\n') {
            if (prev_char === '\n' || prev_char === '' || prev_char === '{' || is_whitespace(prev_char)) {
                next_token()
                continue
            } else {
                // const next = next_token()
                // yield *yieldVal(next)
                // // This was a whitespace character so skip it
                // end_index++
                // yield *yieldVal(next_token())
                // continue
            }
        }

        let op = is_operator(current_char)
        if (op) {
            const next = next_token()
            if (!is_whitespace(prev_char) && prev_char !== '') {
                yield *yieldVal(next)
            }
            end_index++
            yield *yieldVal(next_token())
        }
    } while(yield *yieldVal(next_token()), end_index < len)
}