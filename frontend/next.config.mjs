const nextConfig = {
    reactStrictMode: true,
    compiler: {
        styledComponents: true,
    },
    output: 'standalone',

    transpilePackages: ['@downstream/cli', '@downstream/core', 'solc'],

    webpack: (config, options) => {
        // stub out the fs module, as we have some escripten
        // compiled wasm that thinks it's running outside browser
        // during compilation
        config.resolve.fallback = {
            ...config.resolve.fallback,
            fs: false,
            solc: false,
            glob: false,
        };
        return config;
    },
    images: {
        unoptimized: true
    },

    pageExtensions: ['md', 'mdx', 'tsx', 'ts', 'jsx', 'js'],
};

export default nextConfig;
