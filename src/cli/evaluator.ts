import {
    Command
} from './parser'

interface State {

}

interface StructState {

}

interface UnionState {

}

interface ValueState {

}

interface VersionState {
    minimumCompatible: number
    current: number
}

interface NamespaceVersion {
    [namespace: string]: VersionState
}

interface NamespaceState {
    version: VersionState
    dependencies: NamespaceVersion
    structs: {
        [name: string]: StructState
    }
    unions: {
        [name: string]: UnionState
    }
    values: {
        [name: string]: ValueState
    }
}

interface NamespaceHistory {
    name: string
    history: {
        [version: number]: NamespaceState
    }
    version: NamespaceVersion
}

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