'use strict';
const path = require('path');
const fs = require('fs');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const querystring = require('querystring');
const extFs = require('yyl-fs');
const VueLoaderPlugin = require('vue-loader/lib/plugin');

const util = require('yyl-util');

const map2Babel = function (str) {
  const nodeModulePath1 = path.join(__dirname, '../../');
  const nodeModulePath2 = path.join(__dirname, '../../../');
  const path1 = path.join(nodeModulePath1, 'node_modules/@babel');
  if (fs.existsSync(path1)) {
    return util.path.join(nodeModulePath1, 'node_modules', str);
  } else {
    return util.path.join(nodeModulePath2, str);
  }
};


const init = (config, iEnv) => {
  // + 生成 async_component 中 rev-manifest 插件
  class BuildAsyncRevPlugin {
    apply(compiler) {
      compiler.hooks.emit.tapAsync(
        'buildAsyncRev',
        (compilation, done) => {
          let revMap = {};
          const NO_HASH_REG = /-\w{8}\.js$/;
          for (let filename in compilation.assets) {
            const iPath = util.path.join(config.alias.jsDest, filename);
            const revPath = util.path.relative(config.alias.revRoot, iPath);
            if (/async_component/.test(iPath)) {
              revMap[revPath.replace(NO_HASH_REG, '.js')] = revPath;

              // 生成不带hash 的文件
              compilation.assets[filename.replace(NO_HASH_REG, '.js')] = {
                source() {
                  return compilation.assets[filename].source();
                },
                size() {
                  return compilation.assets[filename].size();
                }
              };
            }
          }
          const revPath = util.path.join(config.alias.revDest, 'rev-manifest.json');
          let originRev = null;
          if (fs.existsSync(revPath)) {
            try {
              originRev = util.requireJs(revPath);
            } catch (er) {}
          } else {
            extFs.mkdirSync(config.alias.revDest);
          }
          revMap = util.extend(true, originRev, revMap);

          fs.writeFile(revPath, JSON.stringify(revMap, null, 2), () => {
            done();
          });
        }
      );
    }
  }
  // - 生成 async_component 中 rev-manifest 插件
  const webpackconfig = {
    entry: (function() {
      const iSrcRoot = path.isAbsolute(config.alias.srcRoot) ?
        config.alias.srcRoot :
        path.join(__dirname, config.alias.srcRoot);

      let r = {
        // 'boot': path.join(path.isAbsolute(config.alias.srcRoot)? '': __dirname, config.alias.srcRoot, 'boot/boot.js'),
      };

      // 合并 config 中的 entry 字段
      if (config.entry) {
        r = util.extend(true, r, config.entry);
      }

      // single entry
      var bootPath = path.join(iSrcRoot, 'boot/boot.js');
      if (fs.existsSync(bootPath)) {
        r.boot = bootPath;
      }

      // multi entry
      var entryPath = path.join(iSrcRoot, 'entry');

      if (fs.existsSync(entryPath)) {
        var fileList = extFs.readFilesSync(entryPath, /\.js$/);
        fileList.forEach((str) => {
          var key = path.basename(str).replace(/\.[^.]+$/, '');
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
          if (iEnv.hot) {
            r[key].unshift(`webpack-hot-middleware/client?${iQuery}`);
          }
        });
      }

      return r;
    })(),
    output: {
      path: path.resolve(__dirname, config.alias.jsDest),
      filename: '[name].js',
      chunkFilename: `async_component/[name]${config.disableHash? '' : '-[chunkhash:8]'}.js`
    },
    module: {
      rules: [{
        test: /\.js$/,
        exclude: (file) => (
          /node_modules/.test(file) &&
          !/\.vue\.js/.test(file)
        ),
        use: [{
          loader: 'babel-loader',
          query: {
            babelrc: false,
            cacheDirectory: true,
            presets: [
              [map2Babel('@babel/preset-env'), { modules: 'commonjs' }]
            ],
            plugins: [
              // Stage 2
              [map2Babel('@babel/plugin-proposal-decorators'), { 'legacy': true }],
              map2Babel('@babel/plugin-proposal-function-sent'),
              map2Babel('@babel/plugin-proposal-export-namespace-from'),
              map2Babel('@babel/plugin-proposal-numeric-separator'),
              map2Babel('@babel/plugin-proposal-throw-expressions'),
              map2Babel('@babel/plugin-syntax-dynamic-import')
            ]
          }
        }]
      }, {
        test: /\.vue$/,
        loader: 'vue-loader'
      }, {
        test: /\.html$/,
        use: [{
          loader: 'html-loader'
        }]
      }, {
        test: /\.pug$/,
        oneOf: [{
          resourceQuery: /^\?vue/,
          use: ['pug-plain-loader']
        }, {
          use: ['pug-loader']
        }]
      }, {
        test: /\.jade$/,
        oneOf: [{
          resourceQuery: /^\?vue/,
          use: ['pug-plain-loader']
        }, {
          use: ['pug-loader']
        }]
      }, {
        test: /\.svg$/,
        use: {
          loader: 'svg-inline-loader'
        }
      }, {
        test: /\.webp$/,
        loaders: ['file-loader']
      }, {
        // shiming the module
        test: path.join(config.alias.srcRoot, 'js/lib/'),
        use: {
          loader: 'imports-loader?this=>window'
        }
      }, {
        // shiming the global module
        test: path.join(config.alias.commons, 'lib'),
        use: {
          loader: 'imports-loader?this=>window'
        }
      }]
    },
    resolveLoader: {
      modules: [
        path.join( __dirname, '../../node_modules'),
        path.join( __dirname, '../../../'),
        path.join(config.alias.dirname, 'node_modules')
      ]
    },
    resolve: {
      modules: [
        path.join( __dirname, '../../node_modules'),
        path.join( __dirname, '../../../'),
        path.join(config.alias.dirname, 'node_modules')
      ],
      alias: util.extend({
        'actions': path.join(config.alias.srcRoot, 'vuex/actions.js'),
        'getters': path.join(config.alias.srcRoot, 'vuex/getters.js'),
        'vue$': 'vue/dist/vue.common.js'
      }, config.alias)
    },
    plugins: [
      new VueLoaderPlugin(),
      new BuildAsyncRevPlugin(),
      new webpack.HotModuleReplacementPlugin()
    ]
  };

  // providePlugin
  if (config.providePlugin) {
    webpackconfig.plugins.push(new webpack.ProvidePlugin(config.providePlugin));
  }

  // html output
  webpackconfig.plugins = webpackconfig.plugins.concat((function() { // html 输出
    const bootPath = util.path.join(config.alias.srcRoot, 'boot');
    const entryPath = util.path.join(config.alias.srcRoot, 'entry');
    let outputPath = [];
    const r = [];

    if (fs.existsSync(bootPath)) {
      outputPath = outputPath.concat(extFs.readFilesSync(bootPath, /(\.jade|\.pug|\.html)$/));
    }

    if (fs.existsSync(entryPath)) {
      outputPath = outputPath.concat(extFs.readFilesSync(entryPath, /(\.jade|\.pug|\.html)$/));
    }

    const outputMap = {};
    const ignoreExtName = function (iPath) {
      return iPath.replace(/(\.jade|.pug|\.html|\.js|\.css)$/, '');
    };

    outputPath.forEach((iPath) => {
      outputMap[ignoreExtName(iPath)] = iPath;
    });

    const commonChunks = [];
    const pageChunkMap = {};
    Object.keys(webpackconfig.entry).forEach((key) => {
      let iPaths = [];
      if (util.type(webpackconfig.entry[key]) === 'array') {
        iPaths = webpackconfig.entry[key];
      } else if (util.type(webpackconfig.entry[key]) === 'string') {
        iPaths.push(webpackconfig.entry[key]);
      }

      let isPageModule = null;
      iPaths.some((iPath) => {
        const baseName = ignoreExtName(iPath);
        if (outputMap[baseName]) {
          isPageModule = baseName;
          return true;
        }
        return false;
      });

      if (!isPageModule) {
        commonChunks.push(key);
      } else {
        pageChunkMap[isPageModule] = key;
      }
    });

    // env defined
    // 环境变量 (全局替换 含有这 变量的 js)
    webpackconfig.plugins.push((() => {
      const r = {};
      Object.keys(iEnv).forEach((key) => {
        if ( typeof iEnv[key] === 'string') {
          r[`process.env.${key}`] = JSON.stringify(iEnv[key]);
        } else {
          r[`process.env.${key}`] = iEnv[key];
        }
      });

      return new webpack.DefinePlugin(r);
    })());



    outputPath.forEach((iPath) => {
      const iBaseName = ignoreExtName(iPath);
      const iChunkName = pageChunkMap[iBaseName];
      const fileName = ignoreExtName(path.basename(iPath));
      let iChunks = [];

      iChunks = iChunks.concat(commonChunks);
      if (iChunkName) {
        iChunks.push(iChunkName);
      }


      const opts = {
        template: iPath,
        filename: path.relative(config.alias.jsDest, path.join(config.alias.htmlDest, `${fileName}.html`)),
        chunks: iChunks,
        chunksSortMode (a, b) {
          return iChunks.indexOf(a.names[0]) - iChunks.indexOf(b.names[0]);
        },
        inlineSource: '.(js|css)\\?__inline$',
        minify: false
      };

      r.push(new HtmlWebpackPlugin(opts));
    });

    return r;
  })());

  // config.module 继承
  if (config.moduleRules) {
    webpackconfig.module.rules = webpackconfig.module.rules.concat(config.moduleRules);
  }

  // extend node_modules
  if (config.resolveModule) {
    webpackconfig.resolve.modules.unshift(config.resolveModule);
    webpackconfig.resolveLoader.modules.unshift(config.resolveModule);
  }

  return webpackconfig;
};





module.exports = init;



