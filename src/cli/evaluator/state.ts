import {
    Type,
} from '../types'

import {
    Value
} from '../value'

export interface State {

}

export interface StructState {
    id: VersionID
}

export interface UnionState {
    id: VersionID
}

export interface ValueState {
    id: VersionID
    type: TypeState
    value: Value
}

export interface VersionState {
    minimumCompatible: number
    current: number
}

export interface VersionID {
    low: number
    high: number
}

export interface NamespaceVersion {
    [namespace: string]: VersionState
}

export interface NamespaceState {
    id: VersionID
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

export interface NamespaceHistory {
    id: VersionID
    history: {
        [version: number]: NamespaceState
    }
    version: NamespaceVersion
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

export type VersionMap = {
    [low: number]: {
        [high: number]: void | StructState | UnionState | NamespaceState
    }
}

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