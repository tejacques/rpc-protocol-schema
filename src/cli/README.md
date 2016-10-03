Command Line Interface
----------------------

The CLI allows you to create and modify RPC types and interfaces.

Much like tables in SQL, RPC types can be created and modified, resulting in schema files. These schema files can then be compiled into a target language runtime.

## Why bother?

So what, why bother with a CLI tool to create types? Why not just use an IDL format such as what protocal buffers, Avro, Cap'n Proto, or Thrift provide?

Glad you asked!

First, IDLs can be an enormous improvement to productivity, making it clear and human readably the variety of different types and method calls available. However they are not without significant downsides. Namely the biggest downsides occur when trying to make changes.

IDLs will allow you to make breaking changes very easily, and problems are often not caught until much later at runtime. A CLI tool can be much more aware, because a series of new changes can be compared to the previous saved instance, and the tool can let you know when there will be issues upgrading, and either prevent them, or create an upgrade plan.

Further, a CLI can continue to do this, while providing a clear view of the most up to date version of each type in a very human readable format.

The design of this project is meant to be incredibly modular. Different backends can consume the intermediary format. For example, you could use rpc-protocol-schema to create types which are then utilized to create a Cap'n Proto IDL file.

The recommended approach would be to use the rpc-protocol-schema backend `okproto`.

## Primitive types

* Void: `Void`
* Boolean: `Bool`
* Integer
    * Signed
        * `Int8`
        * `Int16`
        * `Int32`
        * `Int64`
    * Unsigned
        * `UInt8`
        * `UInt16`
        * `UInt32`
        * `UInt64`
* Floating point
    * `Float32`
    * `Float64`
* String: `UTF-8` Encoded string, with `\0` terminator, and additional length attribute
* Data: An arbitrary byte sequence
* Lists:
    * `List<Type>`
        * `Type`: Some RPC Type
        * `Format`: `Row | Column`
        * `Size`

## Additional types

All additional types are created, and must be given a `namespace`. By default, the current directory will be used to recursively load and store namespaces in a folder hierarchy.

For example:

```
CREATE NAMESPACE Namespace0
```

Will create a folder `Namespace0` in the current directory

```
CREATE NAMESPACE Namespace0.Namespace00
```

Will create a folder `Namespace0/Namespace00`. This command is the same as:

```
NAMESPACE Namespace0
CREATE NAMESPACE Namespace00
```

#### Basic Syntax

```
CREATE <TYPE> <NAME> <ARGS>
```

```
DELETE <TYPE> <NAME>
```

Args are generally in the form:

```
{ <FIELD_NAME>: <TYPE>, ... }
```

Where comma delimeters can also be replaced with newlines:

```
{
    <FIELD_0>: <TYPE_0>
    <FIELD_1>: <TYPE_1>
    ...
}
```

To list the items of a certain type:

```
SHOW <TYPE> [LIKE <REGEX>]
```

### Structs

Syntax:

```
CREATE STRUCT <STRUCT_NAME> { <FIELD_DEFINITION>, [<FIELD_DEFINITION>] }
```

`<FIELD_DEFINITION>`:
```
<FIELD_NAME>: <FIELD_TYPE> [= <VALUE>]
```

To delete a struct:

```
DELETE STRUCT <STRUCT_NAME>
```

To update a struct:

```
ATLER STRUCT <STRUCT_NAME> <SPECIFICATION>
```

`<SPECIFICATION>`:

```
 | ADD FIELD <FIELD_DEFINITION>
 | ALTER FIELD <FIELD_NAME> <ALTER_SPECIFICATION>
 | DELETE FIELD <FIELD_NAME>
```

`<ALTER_SPECIFICATION>`:

```
 | SET NAME <FIELD_NAME>
 | SET TYPE <FIELD_TYPE> [= <VALUE>]
 | SET DEFAULT <VALUE>
```

#### Example

```
CREATE STRUCT Person {
    name: String
    date_of_birth: Int64
}
```

### Unions

Unions are tagged unions, comprised of a tag value and the data corresponding to the tag.

A union is really just an enum, a mapping of an enum value to a type, and a size. The size can be implied from the size of the largest type in the union.

Syntax:
```
CREATE UNION <UNION_NAME> { <FIELD_DEFINITION>, [<FIELD_DEFINITION>] }
```

To update a union:

```
ALTER UNION <UNION_NAME> <SPECIFICATION>
```

To delete a union:

```
DELETE UNION <UNION_NAME>
```

#### Example

```
CREATE NAMESPACE Shapes
NAMESPACE Shapes

CREATE STRUCT Circle {
    radius: Float64
}

CREATE STRUCT Square {
    length: Float64
}

CREATE STRUCT Rectangle {
    width: Float64
    height: Float64
}

CREATE UNION ShapeType {
    circle: Circle
    square: Square
    rectange: Rectangle
}

CREATE STRUCT Shape {
    area: Float64
    type: ShapeType
}
```

### Constants and Default Values

Both constants and default values can be specified:

#### Constants

```
CREATE CONSTANT <NAME>: <TYPE> = <VALUE>
```

Where `<VALUE>` is either a literal primitive value, or a reference to another const.

##### Example

```
CREATE CONSTANT fred: Person = Person(name = "Fred", date_of_birth = Date(1990-01-01))
```

```
DELETE CONSTANT fred
```

#### Default Values

Default values can be specified on any type declaration within a `struct` or `union`

The general syntax is:
```
<FIELD_NAME>: <TYPE> = <VALUE>
```

```
CREATE UNION ContainerValues<T> {
    empty: Void
    elements: List<T>
}
CREATE STRUCT Container<T> {
    count: Int32 = 0
    max_count: Int32 = 1000
    name: String = "Container"
    values: ContainerValues<T> = void
}
```


### Interface

An interface describes functions which take some number of arguments, and return a single result or error

```
CREATE STRUCT Calculation<T> {
    value: T
}
CREATE INTERFACE Calculator {
    add<T>(calculation: Calculation<T>, value: T) => (calculation: Calculation<T>)
    subtract<T>(calculation: Calculation<T>, value: T) => (calculation: Calculation<T>)
    multiply<T>(calculation: Calculation<T>, value: T) => (calculation: Calculation<T>)
    divide<T>(calculation: Calculation<T>, value: T) => (calculation: Calculation<T>)
}
```

An interface has an implicit type created for arguments. For example, the `Calculator::add<T>` function has an automatically created `Request` and `Response` type, which look as follows:

```
CREATE STRUCT Calculator.add.Request<T> {
    calculation: Calculation<T>
}
CREATE STRUCT Calculator.add.Response<T> {
    calculation: Calculation<T>
}
```

In fact, all that an interface really does is create a new namespace with the appropriate types. They are simply displayed jointly in the CLI.