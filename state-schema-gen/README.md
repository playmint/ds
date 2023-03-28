# Codegenning the GameState schema for use with Unity

1. Make sure `typescript-json-schema` is installed. The instructions on the NPM page say to install it globally. I was unable to add it as a dev dependency and wasn't too keen on adding it as regular dependency.
   `npm install typescript-json-schema -g`

2. Build core
   Safest way to do this is to build the whole game with the usual `make dev`

3. Run the json schema generator from the `core` folder
   `npx typescript-json-schema tsconfig.json GameState -o dist/json-schema.json`

    NOTE: If it fails to compile then it's probably because of our use of typescript 4.9 when `typescript-json-schema` still uses 4.8 and therefore is missing the `satisfies` keyword. The project seems to be in active development so hopefully they'll update soon but if not, just globally replace `satisfies` for `as` to make it work.

    NOTE: If it fails due to bigint not being serialisable, You need to add the following decorator to the bigint typed field
    `/** @TJS-type string */`

4. Build the release version of `state-schema-gen` (I used Visual Studio to do this but it should be possible with command line tools)
   This will build to `json-schema/bin/Release/net7.0/json-schema`

5. then from the root of ds repo run:  
   `state-schema-gen/json-schema/bin/Release/net7.0/state-schema-gen core/dist/json-schema.json DawnSeekersUnity/Assets/Scripts/Cog/StateSchema.cs`
