import { defineConfig } from 'vite';
import path from 'path';
import react from '@vitejs/plugin-react';
import codegen from 'vite-plugin-graphql-codegen';
import dts from 'vite-plugin-dts';

export default defineConfig({
    plugins: [codegen(), react(), dts()],
    build: {
        emptyOutDir: false,
        lib: {
            entry: [path.resolve(__dirname, 'src/lib.ts')],
            name: '[name]',
            fileName: (format) => `[name].${format}.js`,
            formats: ['cjs', 'es'],
        },

        rollupOptions: {
            external: ['react', 'react-dom'],
            input: {
                lib: path.resolve(__dirname, 'src/lib.ts'),
            },
            output: {
                // Provide global variables to use in the UMD build
                // for externalized deps
                globals: {
                    react: 'React',
                    'react-dom': 'ReactDOM',
                },
                inlineDynamicImports: false,
            },
        },
    },
});
