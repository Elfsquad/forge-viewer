const path = require("path");

module.exports = {
  entry: "./src/index.ts",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: "ts-loader",
          },
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        loader: 'css-loader'
      },
      {
        test: /\.svg$/,
        loader: 'svg-inline-loader'
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js" ],
  },
  experiments: {
    outputModule: true,
  },
  output: {
    filename: "index.js",
    path: path.resolve(__dirname, "dist"),
    library: {
      type: "module",
    },
  },
};