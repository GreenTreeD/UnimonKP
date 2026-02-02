const HtmlWebpackPlugin = require("html-webpack-plugin");
const HtmlInlineScriptPlugin = require('html-inline-script-webpack-plugin');
const path = require("path");

module.exports = {
  mode: "production", 
  target: "web",
  entry: {
    code: "./src/code.js",
    ui: './src/ui.js'
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
    publicPath: ""
  },
  module: { rules: [] },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/ui.html',
      inject: 'body',          // ВСТАВИТЬ СКРИПТ В КОНЕЦ body
      chunks:['ui']
    }),
    new HtmlInlineScriptPlugin()
  ],  
  performance: { hints: false }
};