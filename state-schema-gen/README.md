# Codegenning the GameState schema for use with Unity

1. Make sure `typescript-json-schema` is installed. The instructions on the NPM page say to install it globally. I was unable to add it as a dev dependency and wasn't too keen on adding it as regular dependency.
   `npm install typescript-json-schema -g`

2. Build core
   Safest way to do this is to build the whole game with the usual `make dev`

3. Run the json schema generator from the `core` folder
   `npx typescript-json-schema tsconfig.json GameState -o dist/json-schema.json`

    NOTE: If it fails due to bigint not being serialisable, You need to add the following decorator to the bigint typed field
    `/** @TJS-type string */`

4. Build the release version of `state-schema-gen` (I used Visual Studio to do this but it should be possible with command line tools)
   This will build to `json-schema/bin/Release/net7.0/json-schema`

5. A workaround hack until we find the right config - Do a find a replace for `anyOf` to `oneOf` in the generated schema found in `core/dist/json-schema.json`
   For some reason NJsonSchema that does the conversion to C# doesn't recognise `anyOf` and it won't generated the expected properties for that object!

6. then from the root of ds repo run:  
   `state-schema-gen/json-schema/bin/Release/net7.0/state-schema-gen core/dist/json-schema.json map/Assets/Scripts/Cog/StateSchema.cs`

7. Another unfortunate manual part of the process until we work out the correct config. You need to do a find an replace on the generated `StateSchema.cs` for the following
   `DisallowNull` to `Default` (Allows all fields to be nullable. We only require a couple but it's fiddly to target just those)
