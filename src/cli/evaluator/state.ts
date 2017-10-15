/**
 * The intention of the `state` types is to model the interactions between
 * commands and the internal state of types.
 */

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
    version: VersionNumber<ProtocolState>
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
    id: TypeID
    name: string
}

/**
 * ListState represents the state for a List
 */
export interface ListState {
    kind: 'ListState'
    id: TypeID
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
    id: TypeID
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
    id: TypeID
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
    id: TypeID
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
    versionID: TypeID
}

/**
 * A VersionNumber is the version of a state. Backwards compatible
 * changes bump the @current version number, and backwards incompatible
 * changes bump the @minimumCompatible version number to a version it is
 * backwards compatible with.
 */
export interface VersionNumber<T> {
    minimumCompatible: number
    current: number
    type: undefined | T
}

/**
 * A TypeID is the unique identifier of a particular type
 */
export interface TypeID {
    low: number
    high: number
}

/**
 * Maps a TypeID to the provided type, or void
 */
export type TypeIDTo<T> = {
    [low: number]: void | {
        [high: number]: void | T
    }
}

/**
 * Maps a VersionID to the provided type, or void
 */
export type VersionIDTo<T> = {
    [minimumCompatible: number]: void | {
        [current: number]: void | T
    }
}

/**
 * This is a helper type to map a TypeID to a VersionNumber
 * inside of a NameSpaceState.
 */
export type StateVersion<T> = TypeIDTo<VersionNumber<T>>

/**
 * This type holds the state for a NameSpace. Basically a namespace
 * needs to be able to refer to any of the types within in, which
 * can be a struct, union, or value. It's clear that each of these
 * should be a map, because we not only want to be able to look up
 * which types are within the namespace, but access them quickly.
 * This also makes moving types from one namespace to another quick.
 * 
 * Rather than mapping to the state of the struct/union/value directly
 * mapping to the version gives us a very convenient way to serialize
 * the state because there are no circular references.
 * 
 * @kind: This differentiates this type of state from others
 * @id: This is a TypeID uniquely identifying this NamespaceState
 * @namespace: Refers to the parent namespace portion of the fully
 * qualified name.
 * @name: The string name of this namespace.
 * @structs: A StateVersion representing the structs in this namespace
 * @unions: A StateVersion representing the unions in this namespace
 * @values: A StateVersion representing the values in this namespace
 */
export interface NamespaceState {
    kind: 'NamespaceState'
    id: TypeID
    namespace: string[]
    name: string
    version: VersionNumber<NamespaceState>
    structs: StateVersion<StructState>
    unions: StateVersion<UnionState>
    values: StateVersion<ValueState>
}

/**
 * Namespace history holds  
 */
export interface NamespaceHistory {
    id: TypeID
    history: { [version: number]: void | NamespaceState }
    minimumCompatibleVersion: VersionNumber<NamespaceToState>
    currentVersion: VersionNumber<NamespaceToState>
}

// ==== Types =====

export interface PrimitiveTypeState {
    type: 'Primitive'
    id: TypeID
}
export function PrimitiveTypeState(id: TypeID): PrimitiveTypeState {
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
    id: TypeID
    generics: TypeState[]
}

export function GenericTypeState(id: TypeID, generics: TypeState[]): GenericTypeState {
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
    [name: string]: void | TypeID
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
export type VersionMap = TypeIDTo<void | FilledTypeState | NamespaceState>

export function version_to_state(
    versionID: TypeID,
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

/**
 * Creates a new unique versionID
 * @idMap: The current existing map of VersionID to FilledTypeState
 */
export function create_version_id(idMap: VersionMap): TypeID {
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