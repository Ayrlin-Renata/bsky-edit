const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = (env) => {
    const browser = env.browser || 'chrome';
    const manifestFile = `manifest.${browser}.json`;

    return {
        mode: "production",
        entry: {
            popup: path.resolve(__dirname, "src/popup.tsx"),
            background: path.resolve(__dirname, "src/background.ts"),
            content: path.resolve(__dirname, "src/content.tsx"),
        },
        output: {
            path: path.join(__dirname, "dist", browser),
            filename: "[name].js",
            clean: true,
        },
        resolve: {
            extensions: [".ts", ".tsx", ".js", ".jsx"],
        },
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    use: [
                        {
                            loader: "ts-loader",
                            options: {
                                transpileOnly: true,
                            },
                        },
                    ],
                    exclude: /node_modules/,
                },
            ],
        },
        plugins: [
            new CopyPlugin({
                patterns: [
                    { from: `public/${manifestFile}`, to: "manifest.json" },
                    { from: "public/bsky-edit.png", to: "bsky-edit.png" },
                    { from: "public/popup.html", to: "popup.html" },
                    { from: "LICENSE", to: "." },
                    { from: "README.md", to: "." },
                ],
            }),
        ],
        performance: {
            hints: false,
            maxEntrypointSize: 2048000,
            maxAssetSize: 2048000,
        },
    };
};
