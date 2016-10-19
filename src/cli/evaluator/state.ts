import {
    Type,
} from '../types'

import {
    Value
} from '../value'

export interface State {

}

export interface FieldState {
    [name: string]: {
        type: StructState | UnionState
        default: void | ValueState
    }
}

export interface StructState {
    kind: 'StructState'
    id: VersionID
    name: string
    fields: FieldState[]
}

export interface UnionState {
    kind: 'UnionState'
    id: VersionID
    name: string
    fields: FieldState[]
}

export interface ValueState {
    kind: 'ValueState'
    id: VersionID
    type: TypeState
    value: Value
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
    [low: number]: {
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
    dependencies: StateVersion
    structs: StateVersion
    unions: StateVersion
    values: StateVersion
}

export interface NamespaceState {
    kind: 'NamespaceState'
    id: VersionID
    namespace: string[]
    name: string
    version: VersionNumber
    dependencies: StateVersion
    structs: StateVersion
    unions: StateVersion
    values: StateVersion
}

export interface NamespaceHistory {
    id: VersionID
    history: {
        [version: number]: NamespaceState
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

export interface ListTypeState {
    type: 'List'
    id: VersionID,
    generic: TypeState
}
export function ListTypeState(id: VersionID, generic: TypeState): ListTypeState {
    return {
        type: 'List',
        id,
        generic
    }
}

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

export type TypeState = PrimitiveTypeState | GenericTypeState | ListTypeState

export interface TypeMap {
    [name: string]: VersionID
}

export function type_to_type_state(type: Type, typeMap: TypeMap): TypeState {
    if (type.kind === 'Primitive') {
        // Primitive
        return PrimitiveTypeState(typeMap[type.name])
    } else if (type.kind === 'List') {
        // List
        return ListTypeState(typeMap[type.kind], type_to_type_state(type.generic, typeMap))
    } else {
        // Generic
        return GenericTypeState(
            typeMap[type.generics.join('.') + type.name],
            type.generics.map(generic => type_to_type_state(generic, typeMap)))
    }
}

export type VersionMap = IdentifierTo<void | StructState | UnionState | NamespaceState>

function version_to_state(
    versionID: VersionID,
    map: VersionMap) {
    const highMap = map[versionID.low]
    if (highMap) {
        return highMap[versionID.high]
    }
    return undefined
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