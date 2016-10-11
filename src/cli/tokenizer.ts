function is_whitespace(character: string) {
    return character === ' ' || character === '\t'
}

export interface lexer_token {
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

    const delimiter_characters = /[{}<>,:.=]/

    const next_token = () => {
        const token = command.substring(start_index, end_index)
        
        const next: lexer_token = {
            token: token,
            start_index: start_index,
            end_index: end_index
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

        if (delimiter_characters.test(current_char)) {
            const next = next_token()
            if (!is_whitespace(prev_char) && prev_char !== '') {
                yield *yieldVal(next)
            }
            end_index++
            yield *yieldVal(next_token())
        }
    } while(yield *yieldVal(next_token()), end_index < len)
}