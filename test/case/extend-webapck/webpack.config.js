const path = require('path');
const querystring = require('querystring');
const fs = require('fs');
const extFs = require('yyl-fs');

const config = require('./config.js');

const wConfig = {
  entry: (() => {
    const r = {};
    // multi entry
    const entryPath = path.join(__dirname, './src/entry');

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
  }
};
module.exports = wConfig;
