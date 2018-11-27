'use strict';
const path = require('path');
const fs = require('fs');
const combine = require('webpack-combine-loaders');
const autoprefixer = require('autoprefixer');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const px2rem = require('postcss-px2rem');
const webpack = require('webpack');
const querystring = require('querystring');

const util = require('yyl-util');

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
            const iPath = util.joinFormat(config.alias.jsDest, filename);
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
            util.mkdirSync(config.alias.revDest);
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
        var fileList = util.readFilesSync(entryPath, /\.js$/);
        fileList.forEach((str) => {
          var key = path.basename(str).replace(/\.[^.]+$/, '');
          if (key) {
            r[key] = [str];
          }

          const queryObj = {
            name: key
          };

          if (config.localserver && config.localserver.port) {
            queryObj.path = `http://localhost:${config.localserver.port}/__webpack_hmr`;
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
        exclude: /node_modules/,
        use: [{
          loader: 'babel-loader',
          query: {
            babelrc: false,
            cacheDirectory: true,
            presets: [
              'babel-preset-env',
              'babel-preset-stage-2'
            ].map(require.resolve)
          }
        }]
      }, {
        test: /\.vue$/,
        loader: 'vue-loader',
        options: {
          loaders: {
            js: combine([{
              loader: 'babel-loader',
              query: {
                babelrc: false,
                cacheDirectory: true,
                presets: [
                  'babel-preset-env',
                  'babel-preset-stage-2'
                ].map(require.resolve)
              }
            }])
          },
          postcss: config.platform == 'pc'? [
            autoprefixer({
              browsers: ['> 1%', 'last 2 versions']
            })
          ] : [
            autoprefixer({
              browsers: ['iOS >= 7', 'Android >= 4']
            }),
            px2rem({remUnit: 75})
          ]
        }
      }, {
        test: /\.html$/,
        use: [{
          loader: 'html-loader'
        }]
      }, {
        test: /\.pug$/,
        loaders: ['pug-loader']
      }, {
        test: /\.jade$/,
        loaders: ['pug-loader']
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
    const bootPath = util.joinFormat(config.alias.srcRoot, 'boot');
    const entryPath = util.joinFormat(config.alias.srcRoot, 'entry');
    let outputPath = [];
    const r = [];

    if (fs.existsSync(bootPath)) {
      outputPath = outputPath.concat(util.readFilesSync(bootPath, /(\.jade|\.pug|\.html)$/));
    }

    if (fs.existsSync(entryPath)) {
      outputPath = outputPath.concat(util.readFilesSync(entryPath, /(\.jade|\.pug|\.html)$/));
    }


    var entrys = [];

    entrys = Object.keys(webpackconfig.entry);

    for (var key in webpackconfig.entry) {
      if (webpackconfig.entry.hasOwnProperty(key)) {
        entrys.push(key);
      }
    }

    outputPath.forEach((iPath) => {
      var iBaseName = path.basename(iPath).replace(/(\.jade|.pug|\.html)$/, '');
      var iExclude = [].concat(entrys);
      var fPath;


      for (var i = 0; i < iExclude.length;) {
        if (util.type(iExclude[i]) == 'array') {
          i++;
        } else {
          fPath = webpackconfig.entry[iExclude[i]];
          if (util.type(fPath) == 'array') {
            fPath = fPath[0];
          }
          if (webpackconfig.resolve.alias[fPath]) {
            fPath = webpackconfig.resolve.alias[fPath];
          }
          fPath = util.joinFormat(fPath);

          if (
            iExclude[i] == iBaseName ||
            (
              fPath.substr(0, entryPath.length) != entryPath &&
              fPath.substr(0, bootPath.length) != bootPath
            )
          ) {
            iExclude.splice(i, 1);
          } else {
            i++;
          }
        }
      }

      // sort
      iExclude.sort((a, b) => {
        if (a === iBaseName) {
          return -1;
        } else if (b === iBaseName) {
          return 1;
        } else {
          return a.localeCompare(b);
        }
      });

      r.push(new HtmlWebpackPlugin({
        template: iPath,
        filename: path.relative(config.alias.jsDest, path.join(config.alias.htmlDest, `${iBaseName}.html`)),
        excludeChunks: iExclude,
        inlineSource: '.(js|css)\\?__inline$',
        minify: false
      }));
    });

    return r;
  })());

  // config.module 继承
  if (config.moduleRules) {
    webpackconfig.module.rules = webpackconfig.module.rules.concat(config.moduleRules);
  }

  // extend node_modules
  if (config.resolveModule) {
    webpackconfig.resolve.modules.push(config.resolveModule);
    webpackconfig.resolveLoader.modules.push(config.resolveModule);
  }

  return webpackconfig;
};





module.exports = init;

