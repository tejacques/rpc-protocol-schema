export type signed_integer_type = 'Int8' | 'Int16' | 'Int32' | 'Int64'
export function is_signed_integer_type(type: string): type is signed_integer_type {
    return type === 'Int8'
        || type === 'Int16'
        || type === 'Int32'
        || type === 'Int64'
}

export type unsigned_integer_type = 'UInt8' | 'UInt16' | 'UInt32' | 'UInt64'
export function is_unsigned_integer_type(type: string): type is signed_integer_type {
    return type === 'UInt8'
        || type === 'UInt16'
        || type === 'UInt32'
        || type === 'UInt64'
}

export type integer_type = signed_integer_type | unsigned_integer_type
export function is_integer_type(type: string): type is integer_type {
    return is_signed_integer_type(type) || is_unsigned_integer_type(type)
} 

export type float_type = 'Float32' | 'Float64'
export function is_float_type(type: string): type is float_type {
    return type === 'Float32'
        || type === 'Float64'
}

export type list_type = 'List'

export type primitive_type = 'Void' | 'Boolean' | integer_type | float_type | 'String' | 'Data' | list_type
export function is_primitive_type(type: string): type is primitive_type {
    return is_integer_type(type)
        || is_float_type(type)
        || type === 'Void'
        || type === 'Boolean'
        || type === 'String'
        || type === 'Data'
}