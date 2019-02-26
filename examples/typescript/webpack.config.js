/* eslint import/no-dynamic-require: 0 */
const path = require('path');
const querystring = require('querystring');
const fs = require('fs');
const extFs = require('yyl-fs');
const HtmlWebpackPlugin = require('html-webpack-plugin');

// + vars
const CONFIG_PATH = path.join(__dirname, 'config.js');
// - vars

const config = require(CONFIG_PATH);

const wConfig = {
  entry: (() => {
    const r = {};
    // multi entry
    const entryPath = path.resolve(__dirname, config.alias.srcRoot, 'entry');

    if (fs.existsSync(entryPath)) {
      const fileList = extFs.readFilesSync(entryPath, /\.ts$/);
      fileList.forEach((str) => {
        const key = path.basename(str).replace(/\.[^.]+$/, '');
        if (key) {
          r[key] = [str];
        }

        const queryObj = {
          name: key
        };

        if (config.localserver && config.localserver.port) {
          queryObj.path = `http://127.0.0.1:${config.localserver.port}/__webpack_hmr`;
        }

        const iQuery = querystring.stringify(queryObj);
        // hotreload
        if (/watch/.test(process.argv.join(' '))) {
          r[key].unshift(`webpack-hot-middleware/client?${iQuery}`);
        }
      });
    }
    return r;
  })(),
  module: {
    rules: [{
      test: /\.tsx?$/,
      use: 'ts-loader',
      exclude: /node_modules/
    }]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, config.alias.srcRoot, 'entry/index/index.pug'),
      filename: path.relative(path.resolve(__dirname, config.alias.jsDest), path.join(config.alias.htmlDest, 'index.html')),
      chunks: ['index'],
      inlineSource: '.(js|ts|css)\\?__inline$',
      minify: false
    })
  ]
};
module.exports = wConfig;

