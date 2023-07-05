using NJsonSchema;
using NJsonSchema.CodeGeneration.CSharp;

namespace Downstream
{
    class Program
    {

        static void Main(string[] args) // string type parameters  
        {
            if (args.Length < 2)
            {
                Console.Write("Usage: state-schema-gen {input-json-path} {output-csharp-class-path}\n");
                return;
            }

            var inputPath = args[0];
            var outputPath = args[1];

            Run(inputPath, outputPath);
        }

        static async void Run(string inputPath, string outputPath)
        {
            Console.WriteLine($"State Schema Gen: Attempting to generate\nfrom schema: {inputPath}\nto class: {outputPath}");

            var schemaFromFile = await JsonSchema.FromFileAsync(inputPath);
            var classGenerator = new CSharpGenerator(schemaFromFile, new CSharpGeneratorSettings
            {
                ClassStyle = CSharpClassStyle.Poco,
                Namespace = "Cog" // technically incorrect but unity is expecting this
            });
            var codeFile = classGenerator.GenerateFile();
            File.WriteAllText(outputPath, codeFile);
        }
    }
}