import {
    CreateCommand
} from '../parser'

import {
    State
} from './state'

export function evaluate_commands(oldState: State, commands: CreateCommand[]) {
    let state: State = oldState
    
    for(let command of commands) {
        state = evaluate_command(state, command)
    }

    return state
}

export function evaluate_command(state: State, command: CreateCommand): State {
    // TODO
    if (!command) {
        throw Error('Error: No command to run!')
    }
    return state
}

export function check_command(state: State, command: CreateCommand): boolean {
    const namespace = command.namespace.join('.')
    const namespaceHistory = state.namespaces[namespace]

    switch (command.kind) {
        case 'NAMESPACE':
            return !namespaceHistory
        case 'CONSTANT':
            command.name
        case 'STRUCT':
        case 'UNION':
        case 'INTERFACE':
    }

    return false
}