import {
    Type,
} from '../types'

import {
    Value
} from '../value'

/**
 * ProtocolState represents the overall state of the protocol.
 * It holds a TypeMap which maps a named type to its unique
 * VersionID, and VersionMap which maps a VersionID to its
 * state.
 */
export interface ProtocolState {
    versionMap: VersionMap
    namespaces: NamespaceToState
    typeMap: TypeMap
}

/**
 * FieldState holds a mapping of the field name to its
 * TypeStateReference and default value
 */
export interface FieldState {
    [name: string]: void | {
        type: TypeStateReference
        default: void | Value
    }
}

/**
 * FilledFieldState represents a FieldState whose
 * TypeStateReferences have had their references
 * filled into a fully specified TypeState
 */
export interface FilledFieldState {
    [name: string]: void | {
        type: TypeState
        default: void | Value
    }
}

/**
 * PrimitiveTypeState represents an intrinsic primitive
 * type identified by its name and its `id` field
 */
export interface PrimitiveState {
    kind: 'PrimitiveState'
    id: VersionID
    name: string
}

/**
 * ListState represents the state for a List
 */
export interface ListState {
    kind: 'ListState'
    id: VersionID
    name: string
}

/**
 * StructState holds the state for a struct.
 * @id: The unique identifier for this struct
 * @name: The fully qualified name of the struct
 * @fields: The FieldState for the fields of the struct
 * @numberOfGenerics: The number of generic arguments this struct receives
 */
export interface StructState {
    kind: 'StructState'
    id: VersionID
    name: string
    fields: FieldState
    numberOfGenerics: number
}

/**
 * UnionState holds the state for a union.
 * @id: The unique identifier for this union
 * @name: The fully qualified name of the union
 * @fields: The FieldState for the fields of the union
 * @numberOfGenerics: The number of generic arguments this union receives
 */
export interface UnionState {
    kind: 'UnionState'
    id: VersionID
    name: string
    fields: FieldState
    numberOfGenerics: number
}

/**
 * ValueState represents a created constant constant
 * @id: The unique identifier for this constant
 * @name: The fully qualified name of the constant
 * @type: The TypeState of this value
 * @value: The value of this constant
 */
export interface ValueState {
    kind: 'ValueState'
    id: VersionID
    name: string
    type: TypeState
    value: Value
}

/**
 * A generic type reference is a reference to one of
 * the generic type arguments in a Type
 */
export interface GenericTypeReference {
    kind: 'GenericTypeReference'
    index: number
}

/**
 * A type reference is a reference to a Type by VersionID
 */
export interface TypeReference {
    kind: 'TypeReference'
    versionID: VersionID
}

export interface VersionNumber {
    minimumCompatible: number
    current: number
}

export interface VersionID {
    low: number
    high: number
}

export type IdentifierTo<T> = {
    [low: number]: void | {
        [high: number]: T
    }
}

export type StateVersion = IdentifierTo<void | VersionNumber>

export interface NamespaceState {
    kind: 'NamespaceState'
    id: VersionID
    namespace: string[]
    name: string
    version: VersionNumber
    structs: StateVersion
    unions: StateVersion
    values: StateVersion
}

export interface NamespaceHistory {
    id: VersionID
    history: {
        [version: number]: void | NamespaceState
    }
    version: VersionNumber
}

// ==== Types =====

export interface PrimitiveTypeState {
    type: 'Primitive'
    id: VersionID
}
export function PrimitiveTypeState(id: VersionID): PrimitiveTypeState {
    return {
        type: 'Primitive',
        id,
    }
}

// export interface ListTypeState {
//     type: 'List'
//     id: VersionID,
//     generic: TypeState
// }
// export function ListTypeState(id: VersionID, generic: TypeState): ListTypeState {
//     return {
//         type: 'List',
//         id,
//         generic
//     }
// }

export interface GenericTypeState {
    type: 'Generic'
    id: VersionID
    generics: TypeState[]
}

export function GenericTypeState(id: VersionID, generics: TypeState[]): GenericTypeState {
    return {
        type: 'Generic',
        id,
        generics
    }
}

export type TypeState = PrimitiveTypeState | GenericTypeState// | ListTypeState

export interface GenericTypeStateReference {
    type: 'GenericTypeStateReference'
    reference: GenericTypeReference | TypeReference
    generics: TypeStateReference[]
}

export type TypeStateReference = TypeState | GenericTypeStateReference

/**
 * Maps a fully qualified name to its VersionID, if present
 */
export interface TypeMap {
    [name: string]: void | VersionID
}

export function type_to_type_state(type: Type, typeMap: TypeMap): TypeState {
    if (type.kind === 'Primitive') {
        // Primitive
        const versionID = typeMap[type.name]
        if (!versionID) {
            throw Error(`Error: type: ${type.name} does not exist`)
        }
        return PrimitiveTypeState(versionID)
    } else {
        // Generic
        const namespacedTypeName = type.generics.join('.') + type.name
        const versionID = typeMap[namespacedTypeName]
        if (!versionID) {
            throw Error(`Error: type: ${namespacedTypeName} does not exist`)
        }
        const genericTypeStates = type.generics.map(generic => type_to_type_state(generic, typeMap))
        return GenericTypeState(
                versionID,
                genericTypeStates)
    }
}

export type FilledTypeState = PrimitiveState | ListState | StructState | UnionState
export type VersionMap = IdentifierTo<void | FilledTypeState | NamespaceState>

export function version_to_state(
    versionID: VersionID,
    map: VersionMap) {
    const highMap = map[versionID.low]
    if (highMap) {
        return highMap[versionID.high]
    }
    return undefined
}

export function field_state_to_filled(
    type_state: GenericTypeState,
    field_state: FieldState,
    ): FilledFieldState {
    const filled_field_state: FilledFieldState = {}

    for(const name in field_state) {
        const state = field_state[name]
        if (!state) {
            continue
        }

        const new_type_state = type_state_reference_to_type_state(state.type, type_state.generics)

        filled_field_state[name] = {
            type: new_type_state,
            default: state.default
        }
    }

    return filled_field_state;
}

export function type_state_reference_to_type_state(
    fieldType: TypeStateReference,
    generics: TypeState[]
    ): TypeState {
    if (fieldType.type !== 'GenericTypeStateReference') {
        return fieldType;
    }

    // Get filled generics
    const filled_generics = fieldType.generics.map(reference => type_state_reference_to_type_state(reference, generics))

    if (fieldType.reference.kind === 'TypeReference') {
        // Could be a primitive type
        return GenericTypeState(fieldType.reference.versionID, filled_generics)
    }
    
    const referenceTypeState = generics[fieldType.reference.index]

    if (referenceTypeState.type === 'Generic') {
        // Both have filled generics -- error
        if (referenceTypeState.generics.length && fieldType.generics.length) {
            // TODO: Make this error good
            // Error: Generics supplied both by reference and by field
            throw Error(`Error: Generics supplied both by reference type and field type`)
        }

        // Only the field has generics
        if (fieldType.generics.length) {
            return GenericTypeState(referenceTypeState.id, filled_generics)
        }

        // Either no generics, or the reference has generics
        return referenceTypeState
    }

    if (fieldType.generics.length) {
        // TODO: Make this error good
        // Error: Generics supplied to nongeneric type
        throw Error(`Error: Generics supplied to nongeneric type`)
    }

    return referenceTypeState
}

export function random_int32(): number {
    return Math.random()*0xFFFFFFF|0
}

// Creates a new unique versionID
export function create_version_id(idMap: VersionMap): VersionID {
    while(true) {
        let versionId = {
            low: random_int32(),
            high: random_int32(),
        }

        if (!version_to_state(versionId, idMap)) {
            return versionId
        }
    }
}


export interface NamespaceToState {
    [namespace: string]: void | NamespaceHistory
}