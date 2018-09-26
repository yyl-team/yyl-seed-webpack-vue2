const webpackMerge = require('webpack-merge');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const uglifyjsWebpackPlugin = require('uglifyjs-webpack-plugin');
const autoprefixer = require('autoprefixer');
const webpack = require('webpack');
const path = require('path');
const px2rem = require('postcss-px2rem');

const webpackBase = require('./webpack.base.js');
const util = require('yyl-util');

const init = (config) => {
  const webpackConfig = {
    mode: 'production',
    output: {
      publicPath: util.joinFormat(
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
        use: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: [
            'css-loader',
            {
              loader: 'postcss-loader',
              options: {
                ident: 'postcss',
                plugins: () => config.platform == 'pc'? [
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
            }
          ]
        })
      }, {
        test: /\.(scss|sass)$/,
        use: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: [
            'css-loader',
            {
              loader: 'postcss-loader',
              options: {
                ident: 'postcss',
                plugins: () => config.platform == 'pc'? [
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
            },
            'sass-loader'
          ]
        })
      }, {
        test: /\.(png|jpg|gif)$/,
        use: {
          loader: 'url-loader',
          options: {
            limit: 10000,
            name: util.joinFormat(
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
        'process.env.NODE_ENV': JSON.stringify('production')
      }),
      new uglifyjsWebpackPlugin(),
      // 样式分离插件
      new ExtractTextPlugin({
        filename: util.joinFormat(
          path.relative(
            config.alias.jsDest,
            path.join(config.alias.cssDest, '[name].css')
          )
        ),
        allChunks: true
      })
    ]
  };
  return webpackMerge(webpackBase(config), webpackConfig);
};

module.exports = init;