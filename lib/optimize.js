const util = require('yyl-util');
const SeedResponse = require('yyl-seed-response');
const webpack = require('webpack');
const fs = require('fs');
const devMiddleware = require('webpack-dev-middleware');
const hotMiddleware = require('webpack-hot-middleware');

const devConfig = require('./config/webpack.dev.js');
const remoteConfig = require('./config/webpack.remote.js');
const publishConfig = require('./config/webpack.publish.js');
const proxyConfig = require('./config/webpack.proxy.js');


const USAGE = {
  watch: 'watch',
  all: 'all'
};

let config;
let iRes = null;

const cache = {
  compiler: null,
  config: null
};

const fn = {
  envInit: function (op) {
    let rEnv;
    if (typeof op !== 'object') {
      rEnv = {};
    } else {
      rEnv = op;
    }

    if (rEnv.ver == 'remote') {
      rEnv.remote = true;
    }
    if (rEnv.remote) {
      rEnv.ver = 'remote';
    }

    rEnv.staticRemotePath = (rEnv.remote || rEnv.isCommit || rEnv.proxy) ? (config.commit.staticHost || config.commit.hostname) : '/';
    rEnv.mainRemotePath = (rEnv.remote || rEnv.isCommit || rEnv.proxy) ? (config.commit.mainHost || config.commit.hostname) : '/';
    return rEnv;
  },
  buildWConfig: function (iEnv) {
    let iWconfig;
    if (iEnv.isCommit) {
      iWconfig = publishConfig;
    } else if (iEnv.remote) {
      iWconfig = remoteConfig;
    } else if (iEnv.proxy) {
      iWconfig = proxyConfig;
    } else {
      iWconfig = devConfig;
    }
    return iWconfig(config, iEnv);
  },
  webpackFinishedHandle: function(iRes, iEnv, done) {
    return (err, stats) => {
      if (err) {
        iRes.trigger('msg', ['error', err.message || err.details || err]);
      } else {
        iRes.trigger('msg', ['success', 'webpack run pass']);
      }

      if (iEnv.logLevel == 2) {
        console.log(stats.toString({
          chunks: false,  // 使构建过程更静默无输出
          colors: true    // 在控制台展示颜色
        }));
      } else {
        iRes.trigger('msg', ['info', stats.toString()]);
      }

      const compilation = stats.compilation;
      const basePath = compilation.outputOptions.path;
      Object.keys(compilation.assets).forEach((key) => {
        const iPath = util.path.join(basePath, key);
        iRes.trigger('msg', [fs.existsSync(iPath)? 'update': 'create', iPath]);
      });
      compilation.errors.forEach((err) => {
        iRes.trigger('msg', ['error', err.message || err.details || err]);
      });
      compilation.warnings.forEach((warn) => {
        iRes.trigger('msg', ['warn', warn.details]);
      });
      iRes.trigger('finished', []);
      return done && done();
    };
  }
};

const task = {
  all(iEnv, done) {
    const iRes = new SeedResponse();
    if (!cache.compiler) {
      cache.config = fn.buildWConfig(iEnv);
      cache.compiler = webpack(cache.config);
    }

    iRes.trigger('clear', []);
    iRes.trigger('start', ['watch']);

    cache.compiler.run(fn.webpackFinishedHandle(iRes, iEnv, done));
    return iRes;
  },
  watch(iEnv) {
    const iRes = new SeedResponse();
    if (!cache.compiler) {
      cache.config = fn.buildWConfig(iEnv);
      cache.compiler = webpack(cache.config);
    }

    cache.compiler.hooks.beforeCompile.tapPromise('beforeCompile', async () => {
      iRes.trigger('clear', []);
      iRes.trigger('start', ['watch']);
    });


    cache.compiler.watch({
      aggregateTimeout: 1000
    }, fn.webpackFinishedHandle(iRes, iEnv));

    return iRes;
  }
};

const wOpzer = function (iConfig) {
  config = util.extend(true, {}, iConfig);

  const opzer = {};

  Object.keys(USAGE).forEach((key) => {
    opzer[key] = function(op) {
      return task[key](fn.envInit(op));
    };
  });

  opzer.getConfigSync = function() {
    return config;
  };

  opzer.response = iRes;

  opzer.ignoreLiveReload = true;

  opzer.initServerMiddleWare = function (app, iEnv) {
    if (app) {
      if (!cache.compiler) {
        cache.config = fn.buildWConfig(iEnv);
        cache.compiler = webpack(cache.config);
      }
      app.use(devMiddleware(cache.compiler, {
        noInfo: true,
        publicPath: cache.config.output.publicPath
      }));

      app.use(hotMiddleware(cache.compiler));
    }
  };

  return opzer;
};

wOpzer.handles = Object.keys(USAGE);
wOpzer.withServer = true;

module.exports = wOpzer;
