# 版本信息
## 0.5.15
* [ADD] 添加 对 `.ico` 格式支持

## 0.5.14
* [DEL] 去掉 自带的 `yyl-flexlayout` 插件

## 0.5.13
* [FIX] `init` bugfix

## 0.5.12
* [FIX] `init` bugfix

## 0.5.9
* [FIX] `init` bugfix

## 0.5.8
* [ADD] 新增 `example` `typescript`

## 0.5.7
* [EDIT] 将 vue 降级到 `2.5.22`

## 0.5.6
* [ADD] 添加`babel-polyfill` 以兼容旧版

## 0.5.5
* [EDIT] `@bebel/preset-env` 新增 `{ modules: 'commonjs' }` 来兼容老项目

## 0.5.4
* [EDIT] 锁定 `webpack` 到 `4.28.4`

## 0.5.3
* [EDIT] 调整配置

## 0.5.2
* [EDIT] 升级 `webpack` 到 `4.29.3`
* [EDIT] 升级 `vue-loader` 到 `15`
* [EDIT] 升级 `babel-loader` 到 `7`
* [EDIT] 升级 `vue` 到 `2.6.6`
* [EDIT] 对应配置调整

## 0.5.1 (2019-01-30)
* [FIX] 锁死 webpack 版本为 `4.19.0`

## 0.5.0 (2019-01-30)
* [ADD] 支持项目中配置 自己的 `package.json` 和 `webpack.config.js`
* [ADD] `---anything 123` 会映射到 项目中的 `proccess.env.anything === 123`

## 0.4.2 (2019-01-03)
* [FIX] 修复 `multi entry` 时 js 打包 没有独立分开问题

## 0.4.1 (2018-12-25)
* [ADD] 新增 `config.px2rem` 配置项

## 0.4.0 (2018-12-24)
* [ADD] 引入 `yyt` e2e test
* [EDIT] 调整 `webpack-dev-middleware` 配置

## 0.3.8 (2018-11-30)
* [FIX] 去掉多余的代码

## 0.3.7 (2018-11-30)
* [FIX] `webpack-hot-middleware` 中 `__webpack_hmr` 地址 改为 `${localAddress}:${port}/__webpack_hmr`

## 0.3.6 (2018-11-30)
* [FIX] `webpack-hot-middleware` 中 `__webpack_hmr` 地址 改为 `${localAddress}:${port}/__webpack_hmr`

## 0.3.5 (2018-11-27)
* [FIX] `webpack-hot-middleware` 中 `__webpack_hmr` 地址 改为 `localhost:5000/__webpack_hmr`

## 0.3.4 (2018-11-27)
* [FIX] `single-project` example 补全配置项

## 0.3.3 (2018-11-19)
* [FIX] 调整 `--remote` 模式下配置， mode 默认为 `development`, 使用样式分离

## 0.3.1 (2018-11-18)
* [FIX] hmr bugfix

## 0.3.0 (2018-11-18)
* [ADD] 新增 `seed.optimize.initServerMiddleWare(app)` 方法
* [ADD] 新增 `seed.optimize.ignoreLiveReload` 属性
* [ADD] `seed.optimize(iEnv).watch` 新增 `hmr` 模式

## 0.2.8 (2018-11-15)
* [ADD] 新增 `svg-loader`

## 0.2.6 (2018-11-13)
* [FIX] 构建 `entry` 排序修改， `p-xx` 会放到最后面

## 0.2.5 (2018-11-13)
* [FIX] 修复 `yyl` `--NODE_ENV` 不生效问题

## 0.2.4 (2018-11-12)
* [ADD] 新增 `--NODE_ENV` 变量用于配置 webpack `mode` 属性

## 0.2.3 (2018-11-08)
* [ADD] 新增 `.webp` 格式文件支持

## 0.2.2 (2018-10-31)
* [FIX] 修复 `config.proxy.js` 配置不正确问题
* [ADD] 新增 `config.px2rem` 配置项

## 0.2.1 (2018-10-15)
* [EDIT] 当传入 `env.proxy` 时， 生成出来的页面采用绝对路径
* [FIX] 执行 `seed.init` 时自动生成 `.gitignore`

## 0.1.7 (2018-10-12)
* [EDIT] 调整 `eslintrc` 配置

## 0.1.6 (2018-09-29)
* [FIX] 修复 `config.resolveModule` 无效问题

## 0.1.5 (2018-09-29)
* [ADD] 新增 `config.resolveModule` 参数用于 配置 webpack `node_modules` 位置

## 0.1.4 (2018-09-26)
* [EDIT] 调整 config

## 0.1.2 (2018-09-25)
* [EDIT] 调整 config

## 0.1.1 (2018-09-21)
* [FIX] 修复 `single-project` 内代码地址不对问题
* [FIX] 修复 seed 包在 `yyl` 调用时 `node_modules` 不正确问题

## 0.1.0 (2018-09-20)
* [ADD] 诞生
