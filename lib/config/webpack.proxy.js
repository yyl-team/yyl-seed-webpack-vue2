const webpackMerge = require('webpack-merge');
const webpack = require('webpack');
const autoprefixer = require('autoprefixer');
const path = require('path');
const px2rem = require('postcss-px2rem');

const webpackBase = require('./webpack.base.js');
const util = require('yyl-util');

const init = (config, iEnv) => {
  const MODE = iEnv.NODE_ENV || 'development';
  // + 生成 空白 css 插件
  class BuildBlankCssPlugin {
    apply(compiler) {
      compiler.hooks.emit.tapAsync(
        'buildBlankCss',
        (compilation, done) => {
          const files = [];
          for (let filename in compilation.assets) {
            let iPath = util.path.join(filename);
            if (
              !/^\.\.\//.test(iPath) &&
              path.extname(iPath) === '.js' &&
              iPath.split('/').length === 1
            ) {
              files.push(iPath.replace(/\.js/, ''));
            }
          }

          files.forEach((name) => {
            const rPath = path.relative(
              config.alias.jsDest,
              path.join(config.alias.cssDest, `${name}.css`)
            );
            compilation.assets[rPath] = {
              source() {
                return '';
              },
              size() {
                return 0;
              }
            };
          });
          done();
        }
      );
    }
  }
  // - 生成 空白 css 插件


  const webpackConfig = {
    mode: MODE,
    output: {
      publicPath: util.path.join(
        config.commit.hostname,
        config.dest.basePath,
        path.relative(
          config.alias.root,
          config.alias.jsDest
        ),
        '/'
      )
    },
    module: {
      rules: [{
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
          {
            loader: 'postcss-loader',
            options: {
              ident: 'postcss',
              plugins() {
                const r = [];
                if (config.platform === 'pc') {
                  r.push(autoprefixer({
                    browsers: ['> 1%', 'last 2 versions']
                  }));
                } else {
                  r.push(autoprefixer({
                    browsers: ['iOS >= 7', 'Android >= 4']
                  }));
                  if (config.px2rem !== false) {
                    r.push(px2rem({remUnit: 75}));
                  }
                }
                return r;
              }
            }
          }
        ]
      }, {
        test: /\.(scss|sass)$/,
        use: [
          'style-loader',
          'css-loader',
          {
            loader: 'postcss-loader',
            options: {
              ident: 'postcss',
              plugins() {
                const r = [];
                if (config.platform === 'pc') {
                  r.push(autoprefixer({
                    browsers: ['> 1%', 'last 2 versions']
                  }));
                } else {
                  r.push(autoprefixer({
                    browsers: ['iOS >= 7', 'Android >= 4']
                  }));
                  if (config.px2rem !== false) {
                    r.push(px2rem({remUnit: 75}));
                  }
                }
                return r;
              }
            }
          },
          'sass-loader'
        ]
      }, {
        test: /\.(png|jpg|gif)$/,
        use: {
          loader: 'url-loader',
          options: {
            limit: 0,
            name: util.path.join(
              path.relative(
                config.alias.jsDest,
                path.join(config.alias.imagesDest, '[name].[ext]')
              )
            )
          }
        }
      }]
    },
    plugins: [
      // 环境变量 (全局替换 含有这 变量的 js)
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(MODE)
      }),
      new BuildBlankCssPlugin()
    ]
  };
  return webpackMerge(webpackBase(config, iEnv), webpackConfig);
};

module.exports = init;
