import {
    Command
} from '../parser'

import {
    State
} from './state'

export function evaluate_commands(oldState: State, commands: Command[]) {
    let state: State = oldState
    
    for(let command of commands) {
        state = evaluate_command(state, command)
    }

    return state
}

export function evaluate_command(state: State, command: Command): State {
    // TODO
    if (!command) {
        throw Error('Error: No command to run!')
    }
    return state
}