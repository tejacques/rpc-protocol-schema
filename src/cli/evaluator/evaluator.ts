import {
    CreateCommand,
    Constant,
    Struct,
    Union,
    Interface,
} from '../parser'

import {
    Type,
} from '../types'

import {
    Value,
} from '../value'

import {
    State,
    TypeState,
    //ValueState,
    version_to_state,
    type_to_type_state,
    field_state_to_filled,
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

export const enum NamespaceResultState {
    Ok,
    AlreadyExists,
}

export interface NamespaceResult {
    kind: 'NamespaceResult'
    status: NamespaceResultState
}

export function NamespaceResult(status: NamespaceResultState): NamespaceResult {
    return {
        kind: 'NamespaceResult',
        status,
    }
}

export const enum ConstantResultState {
    Ok,
    AlreadyExists,
    InvalidNamespace,
    InvalidType,
    InvalidValue,
    ValueNotAssignableToType,
}

export interface PrimitiveResult {
    kind: 'PrimitiveResult'
    status: ConstantResultState
}

export interface ListResult {
    kind: 'ListResult'
    status: ConstantResultState
    results: ConstantResult[]
}

export interface GenericTypeResult {
    kind: 'GenericTypeResult'
    status: ConstantResultState
}

export type ConstantResult = PrimitiveResult | ListResult | GenericTypeResult

export function PrimitiveResult(status: ConstantResultState): PrimitiveResult {
    return {
        kind: 'PrimitiveResult',
        status,
    }
}

export function ListResult(status: ConstantResultState, results: ConstantResult[]): ListResult {
    return {
        kind: 'ListResult',
        status,
        results,
    }
}

export function GenericTypeResult(status: ConstantResultState): GenericTypeResult {
    return {
        kind: 'GenericTypeResult',
        status,
    }
}

export type StructResult = PrimitiveResult

export type UnionResult = PrimitiveResult

export type InterfaceResult = PrimitiveResult

export type CommandResult = NamespaceResult | ConstantResult | StructResult | UnionResult | InterfaceResult

export function check_command(state: State, command: CreateCommand)
    : CommandResult {
    const namespace = command.type.namespace.join('.')
    const namespaceHistory = state.namespaces[namespace]

    switch (command.type.kind) {
        case 'NAMESPACE':
            return {
                kind: 'NamespaceResult',
                status: !namespaceHistory ? NamespaceResultState.Ok : NamespaceResultState.AlreadyExists
            }
        case 'CONSTANT':
            return check_constant(state, command.type)
        case 'STRUCT':
            return check_struct(state, command.type)
        case 'UNION':
            return check_union(state, command.type)
        case 'INTERFACE':
            return check_interface(state, command.type)
    }

    throw Error(`Error: Invalid command ${command.kind}`)
}

export function check_constant(state: State, constant_command: Constant): ConstantResult {

    return check_constant_value(state, constant_command.type, constant_command.value)
}

export function check_constant_value(state: State, type: Type, value: Value): ConstantResult {
    // type_state holds the type ID of the type, and the IDs of its generics
    const type_state = type_to_type_state(type, state.typeMap)

    // const namespaceHistory = state.namespaces[type.namespace.join('.')]
    
    // if (!namespaceHistory) {
    //     return GenericTypeResult(ConstantResultState.InvalidNamespace)
    // }

    //const namespace_state = namespaceHistory.history[namespaceHistory.version.current]

    return check_constant_state_value(state, type_state, value)
}

export function check_constant_state_value(
    state: State,
    type_state: TypeState,
    value: Value): ConstantResult {

    switch(type_state.type) {
    case 'Primitive':
        if (value.type === 'Object'
            || value.type === 'List') {
            return GenericTypeResult(ConstantResultState.InvalidValue)
        }
        const primitive_type = version_to_state(type_state.id, state.versionMap)

        if (!primitive_type || primitive_type.kind !== 'PrimitiveState') {
            return GenericTypeResult(ConstantResultState.InvalidType)
        }

        // TODO: Check values better
        if (value.type === primitive_type.name) {
            return GenericTypeResult(ConstantResultState.Ok)
        }

        if (value.type === 'Int64' || value.type === 'Float64') {
            if (primitive_type.name.substr(0, 'Int'.length) === 'Int'
                || primitive_type.name.substr(0, 'UInt'.length) === 'UInt'
                || primitive_type.name.substr(0, 'Float'.length) === 'Float') {
                return GenericTypeResult(ConstantResultState.Ok)
            }
        }

        return GenericTypeResult(ConstantResultState.ValueNotAssignableToType)

    case 'Generic':
        if (value.type !== 'Object'
            && value.type !== 'List') {
            return GenericTypeResult(ConstantResultState.InvalidValue)
        }

        const generic_type = version_to_state(type_state.id, state.versionMap)

        if (!generic_type || generic_type.kind === 'NamespaceState') {
            return GenericTypeResult(ConstantResultState.InvalidType)
        }

        if (value.type === 'List') {
            if (generic_type.kind !== 'ListState') {
                return GenericTypeResult(ConstantResultState.InvalidValue)
            }
            // List -- check that every field matches the type
            if (value.type !== 'List') {
                return GenericTypeResult(ConstantResultState.ValueNotAssignableToType)
            }
            if (type_state.generics.length !== 1) {
                return GenericTypeResult(ConstantResultState.InvalidType)
            }
            const generic_list_type = type_state.generics[0]
            const results = value.values.map(value => check_constant_state_value(state, generic_list_type, value))
            let status = ConstantResultState.Ok
            for (const result of results) {
                if (result.status != ConstantResultState.Ok) {
                    status = ConstantResultState.InvalidValue
                    break
                }
            }
            return ListResult(status, results)
        }
        if (generic_type.kind === 'StructState') {
            // Struct -- Check that each field in the generic object is present,
            // or there is a default, and that there are no extra fields
            const filledFieldState = field_state_to_filled(type_state, generic_type.fields)

            const allFields = Object.keys(filledFieldState)
            for(const field of allFields) {
                const fieldState = filledFieldState[field]

                if (!fieldState) {
                    return GenericTypeResult(ConstantResultState.InvalidValue)
                }

                const properties = value.properties.filter(v => v.property === field)

                if (properties.length === 0 && !fieldState.default) {
                    // Property doesn't exist and there is no default
                    return GenericTypeResult(ConstantResultState.InvalidValue)
                }

                if (properties.length > 1) {
                    // Shouldn't have more than one value
                    return GenericTypeResult(ConstantResultState.InvalidValue)
                }
            }

            // For all of the fields that do exist, ensure that the types match the supplied type
            for(const field of value.properties) {

                // fieldState represents the type that should be held at this property
                const fieldState = filledFieldState[field.property]
                if (!fieldState) {
                    return GenericTypeResult(ConstantResultState.InvalidValue)
                }

                const field_res = check_constant_state_value(state, fieldState.type, field.value)
                if (field_res.status != ConstantResultState.Ok) {
                    return GenericTypeResult(ConstantResultState.InvalidValue) // type mismatch
                }
            }
        } else if (generic_type.kind === 'UnionState') {
            // Union -- Check that only one field is present
            // Only one field
            if (value.properties.length !== 1) {
                return GenericTypeResult(ConstantResultState.InvalidValue)
            }

            const filledFieldState = field_state_to_filled(type_state, generic_type.fields)
            const fieldState = filledFieldState[value.properties[0].property]

            if (!fieldState) {
                return GenericTypeResult(ConstantResultState.InvalidValue)
            }

            const field_res = check_constant_state_value(state, fieldState.type, value.properties[0].value)
            if (field_res.status != ConstantResultState.Ok) {
                return GenericTypeResult(ConstantResultState.InvalidValue) // type mismatch
            }
        }
        
        //const type_state = version_to_state(namespace_state.state.versionMap
    }

    return GenericTypeResult(ConstantResultState.Ok)
}

export function check_struct(
    state: State,
    struct_command: Struct): StructResult {
    return PrimitiveResult(ConstantResultState.InvalidValue)
}