import { defineConfig } from 'vite';
import path from 'path';
import react from '@vitejs/plugin-react';
import codegen from 'vite-plugin-graphql-codegen';
import dts from 'vite-plugin-dts';

export default defineConfig({
    plugins: [codegen(), react(), dts()],
    build: {
        lib: {
            entry: path.resolve(__dirname, 'src/lib.ts'),
            name: 'lib',
            fileName: (format) => `lib.${format}.js`,
        },

        rollupOptions: {
            external: ['react', 'react-dom'],
            output: {
                // Provide global variables to use in the UMD build
                // for externalized deps
                globals: {
                    react: 'React',
                    'react-dom': 'ReactDOM',
                },
            },
        },
    },
});
