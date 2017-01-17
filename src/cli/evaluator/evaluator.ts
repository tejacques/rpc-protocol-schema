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
    ProtocolState,
    TypeState,
    TypeStateReference,
    FilledTypeState,
    //ValueState,
    version_to_state,
    type_to_type_state,
    field_state_to_filled,
    TypeID,
} from './state'

export function evaluate_commands(oldState: ProtocolState, commands: CreateCommand[]) {
    let state: ProtocolState = oldState
    
    for(let command of commands) {
        state = evaluate_command(state, command)
    }

    return state
}

export function evaluate_command(state: ProtocolState, command: CreateCommand): ProtocolState {
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

export interface NamespaceOk {
    kind: 'NamespaceResult'
    status: NamespaceResultState.Ok
}

export function NamespaceOk(): NamespaceOk {
    return {
        kind: 'NamespaceResult',
        status: NamespaceResultState.Ok,
    }
}

export interface NamespaceAlreadyExists {
    kind: 'NamespaceResult'
    status: NamespaceResultState.AlreadyExists
    namespace: string[]
}

export function NamespaceAlreadyExists(namespace: string[]): NamespaceAlreadyExists {
    return {
        kind: 'NamespaceResult',
        status: NamespaceResultState.AlreadyExists,
        namespace,
    }
}

export interface NamespaceResult {
    kind: 'NamespaceResult'
    status: NamespaceResultState
}

export const enum ConstantResultState {
    Ok,
    AlreadyExists,
    InvalidNamespace,
    InvalidType,
    InvalidValue,
    InvalidProperties,
    InvalidElements,
    ValueNotAssignableToType,
}

export interface ConstantOk {
    kind: 'ConstantResult'
    status: ConstantResultState.Ok
}

export function ConstantOk(): ConstantOk {
    return {
        kind: 'ConstantResult',
        status: ConstantResultState.Ok,
    }
}

export interface ConstantAlreadyExists {
    kind: 'ConstantResult'
    status: ConstantResultState.AlreadyExists
    name: string
}

export function ConstantAlreadyExists(name: string): ConstantAlreadyExists {
    return {
        kind: 'ConstantResult',
        status: ConstantResultState.AlreadyExists,
        name,
    }
}

export interface ConstantInvalidNamespace {
    kind: 'ConstantResult'
    status: ConstantResultState.InvalidNamespace
    namespace: string[]
}

export function ConstantInvalidNamespace(namespace: string[]): ConstantInvalidNamespace {
    return {
        kind: 'ConstantResult',
        status: ConstantResultState.InvalidNamespace,
        namespace,
    }
}

export interface ConstantInvalidType {
    kind: 'ConstantResult'
    status: ConstantResultState.InvalidType
    id: TypeID
}

export function ConstantInvalidType(id: TypeID): ConstantInvalidType {
    return {
        kind: 'ConstantResult',
        status: ConstantResultState.InvalidType,
        id,
    }
}

export interface ConstantInvalidValue {
    kind: 'ConstantResult'
    status: ConstantResultState.InvalidValue
    error: string
}

export function ConstantInvalidValue(error: string)
    : ConstantInvalidValue {
    return {
        kind: 'ConstantResult',
        status: ConstantResultState.InvalidValue,
        error,
    }
}

export interface ConstantValueNotAssignableToType {
    kind: 'ConstantResult'
    status: ConstantResultState.ValueNotAssignableToType
    value: Value
    type: FilledTypeState
}

export function ConstantValueNotAssignableToType(value: Value, type: FilledTypeState)
    : ConstantValueNotAssignableToType {
    return {
        kind: 'ConstantResult',
        status: ConstantResultState.ValueNotAssignableToType,
        value,
        type,
    }
}

export interface ConstantInvalidElements {
    kind: 'ConstantResult'
    status: ConstantResultState.InvalidElements
    results: ConstantResult[]
}

export function ConstantInvalidElements(
    results: ConstantResult[])
    : ConstantInvalidElements {
    return {
        kind: 'ConstantResult',
        status: ConstantResultState.InvalidElements,
        results,
    }
}

export interface ConstantInvalidProperties {
    kind: 'ConstantResult'
    status: ConstantResultState.InvalidProperties
    results: { field: string, status: ConstantResult }[]
}

export function ConstantInvalidProperties(
    results: { field: string, status: ConstantResult }[])
    : ConstantInvalidProperties {
    return {
        kind: 'ConstantResult',
        status: ConstantResultState.InvalidProperties,
        results,
    }
}

export interface ConstantResult {
    kind: 'ConstantResult'
    status: ConstantResultState
}

export const enum StructResultState {
    Ok,
}
export interface StructResult {
    kind: 'StructResult'
    status: StructResultState
}

export interface StructOk {
    kind: 'StructResult'
    status: StructResultState.Ok
}

export function StructOk(): StructOk {
    return {
        kind: 'StructResult',
        status: StructResultState.Ok,
    }
}

export const enum UnionResultState {
    Ok,
}
export interface UnionResult {
    kind: 'UnionResult'
    status: UnionResultState
}

export const enum InterfaceResultState {
    Ok,
}
export interface InterfaceResult {
    kind: 'InterfaceResult'
    status: InterfaceResultState
}

export type CommandResult = NamespaceResult | ConstantResult | StructResult | UnionResult | InterfaceResult

export function check_command(state: ProtocolState, command: CreateCommand)
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

export function check_constant(state: ProtocolState, constant_command: Constant): ConstantResult {

    return check_constant_value(state, constant_command.type, constant_command.value)
}

export function check_constant_value(state: ProtocolState, type: Type, value: Value): ConstantResult {
    // type_state holds the type ID of the type, and the IDs of its generics
    const type_state = type_to_type_state(type, state.typeMap)

    // const namespaceHistory = state.namespaces[type.namespace.join('.')]
    
    // if (!namespaceHistory) {
    //     return GenericTypeResult(ConstantResultState.InvalidNamespace)
    // }

    //const namespace_state = namespaceHistory.history[namespaceHistory.version.current]

    return check_constant_state_value(state, type_state, value)
}


/**
 * The idea of this function is that it takes the ProtocolState, along with
 * a specific type, and a specific value, and it typechecks the value
 */
export function check_constant_state_value(
    state: ProtocolState,
    type_state: TypeState,
    value: Value): ConstantResult {

    switch(type_state.type) {
    case 'Primitive':
        if (value.type === 'Object'
            || value.type === 'List') {
            return ConstantInvalidValue(`Expected primitive type, but got ${value.type}`)
        }
        const primitive_type = version_to_state(type_state.id, state.versionMap)

        if (!primitive_type || primitive_type.kind !== 'PrimitiveState') {
            return ConstantInvalidType(type_state.id)
        }

        // TODO: Check values better
        if (value.type === primitive_type.name) {
            return ConstantOk()
        }

        if (value.type === 'Int64' || value.type === 'Float64') {
            if (primitive_type.name.substr(0, 'Int'.length) === 'Int'
                || primitive_type.name.substr(0, 'UInt'.length) === 'UInt'
                || primitive_type.name.substr(0, 'Float'.length) === 'Float') {
                return ConstantOk()
            }
        }

        return ConstantValueNotAssignableToType(value, primitive_type)
    case 'Generic':
        if (value.type !== 'Object'
            && value.type !== 'List') {
            return ConstantInvalidValue(`Expected object or list type, but got ${value.type}`)
        }

        const generic_type = version_to_state(type_state.id, state.versionMap)

        if (!generic_type || generic_type.kind === 'NamespaceState') {
            return ConstantInvalidType(type_state.id)
        }

        if (value.type === 'List') {
            if (generic_type.kind !== 'ListState' || generic_type.name !== 'List') {
                return ConstantValueNotAssignableToType(value, generic_type)
            }
            // List -- check that every field matches the type
            if (type_state.generics.length !== 1) {
                return ConstantInvalidType(generic_type.id)
            }
            const generic_list_type = type_state.generics[0]
            const results = value.values.map(value => check_constant_state_value(state, generic_list_type, value))
            const failed_elements = results.filter(res => res.status != ConstantResultState.Ok)
            if (failed_elements.length > 0) {
                return ConstantInvalidElements(results)
            }
            return ConstantOk()
        }
        if (generic_type.kind === 'StructState') {
            // Struct -- Check that each field in the generic object is present,
            // or there is a default, and that there are no extra fields
            const filledFieldState = field_state_to_filled(type_state, generic_type.fields)

            const allFields = Object.keys(filledFieldState)

            const allFieldsResults: { field: string, status: ConstantResult }[] = allFields.map(field => {
                const fieldState = filledFieldState[field]

                if (!fieldState) {
                    return {
                        field,
                        status: ConstantInvalidValue(
                            `No field state present in struct: ${generic_type.name} for field: ${field}`)
                    }
                }

                const properties = value.properties.filter(v => v.property === field)

                if (properties.length === 0 && !fieldState.default) {
                    // Property doesn't exist and there is no default
                    return {
                        field,
                        status: ConstantInvalidValue(`Value is missing field: ${field}, which doesn't have a default value in ${generic_type.name}`)
                    }
                }

                if (properties.length > 1) {
                    // Shouldn't have more than one value
                    return {
                        field,
                        status: ConstantInvalidValue(`Value declared field: ${field} more than once`)
                    }
                }

                return { field, status: ConstantOk() }
            })

            // For all of the fields that do exist, ensure that
            // the types match the supplied type
            const valuePropertiesResults = value.properties.map(field => {

                // fieldState represents the type that should be held at this property
                const fieldState = filledFieldState[field.property]
                if (!fieldState) {
                    return {
                        field: field.property,
                        status: ConstantInvalidValue(
                            `Struct: ${generic_type.name} provided with unknown field: ${field.property}`)
                    }
                }

                const field_res = check_constant_state_value(state, fieldState.type, field.value)
                return {
                    field: field.property,
                    status: field_res
                }
            })

            const allStructResults = allFieldsResults.concat(valuePropertiesResults)
            const errors = allStructResults.filter(res => res.status.status !== ConstantResultState.Ok)
            if (errors.length > 0) {
                return ConstantInvalidProperties(allStructResults)
            }
        } else if (generic_type.kind === 'UnionState') {
            // Union -- Check that only one field is present
            // Only one field
            if (value.properties.length !== 1) {
                return ConstantInvalidValue(
                    `Unions must provide only a single field, but ${value.properties.length} were provided`)
            }

            const filledFieldState = field_state_to_filled(type_state, generic_type.fields)
            const field = value.properties[0].property
            const fieldState = filledFieldState[field]

            if (!fieldState) {
                const valid_properties = Object.keys(filledFieldState)
                return ConstantInvalidValue(
                    `Property: ${field} does not correspond to a valid property in ${generic_type.name}, valid options are: ${valid_properties.join(', ')}`)
            }

            const field_res = check_constant_state_value(state, fieldState.type, value.properties[0].value)
            if (field_res.status != ConstantResultState.Ok) {
                return ConstantInvalidProperties([{field: field, status: field_res }])
            }
        }
        
        //const type_state = version_to_state(namespace_state.state.versionMap
        return ConstantOk()
    }
}

export function check_struct(
    state: ProtocolState,
    struct: Struct): StructResult {
    // Ensure that the referenced types are valid
    const fieldResults = struct.fields.map(field => {
        return {
            field: field.name,
            status: field.value
                ? check_constant_value(
                    state,
                    field.type,
                    field.value)
                : ConstantOk()
        }
    })
    // If the struct already exists, compare it
    return StructOk()
}