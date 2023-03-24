# Codegenning the schema

Make sure `typescript-json-schema` is installed in `core`
`npm install typescript-json-schema -g`
It wasn't adding as dev dependency when I tried to do this and I'm not sure why

Build core
I couldn't do this in isolation and had to build the whole game

Run the json schema generator from the `core` folder
`npx typescript-json-schema tsconfig.json MapState -o dist/json-schema.json`

NOTE: If it failes due to bigint not being serialisable, You need to add the following decorator to the field
`/** @TJS-type string */`

Build the release version of `state-schema-gen` (I used Visual Studio to do this but it should be possible with command line tools)
This will build to `json-schema/bin/Release/net7.0/json-schema`
(json-schema was the old project name)

then from the root of ds repo run:  
`state-schema-gen/json-schema/bin/Release/net7.0/state-schema-gen core/dist/json-schema.json DawnSeekersUnity/Assets/Scripts/Cog/StateSchema.cs`
