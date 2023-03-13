import { defineConfig } from 'vite';
import path from 'path';
import react from '@vitejs/plugin-react';
import codegen from 'vite-plugin-graphql-codegen';
import dts from 'vite-plugin-dts';

export default defineConfig({
    plugins: [codegen(), react(), dts()],
    build: {
        emptyOutDir: false,
        rollupOptions: {
            input: {
                playground: path.resolve(__dirname, 'index.html'),
            },
        },
    },
});
