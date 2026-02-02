const HtmlWebpackPlugin = require("html-webpack-plugin");
const fs = require("fs");
const path = require("path");

module.exports = {
  mode: "production", // можно оставить production
  target: "web",      // важно
  entry: {
    code: "./src/code.js"
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
  },
  module: { rules: [] },
  
  
  performance: { hints: false }
};