const fs = require('fs');
const path = require('path');
const util = require('yyl-util');
const extFs = require('yyl-fs');
const print = require('yyl-print');

const connect = require('connect');

const serveIndex = require('serve-index');
const serveStatic = require('serve-static');

const seed = require('../../index.js');

let config = {};

print.log.init({
  maxSize: 8,
  type: {
    rev: {name: 'rev', color: 'yellow', bgColor: 'bgBlack'},
    concat: {name: 'Concat', color: 'cyan', bgColor: 'bgBlue'},
    update: {name: 'Updated', color: 'cyan', bgColor: 'bgBlue'},
    optimize: {name: 'Optimize', color: 'green', bgColor: 'bgRed'},
    cmd: {name: 'CMD', color: 'gray', bgColor: 'bgBlack'}
  }
});

const fn = {
  clearDest() {
    return new Promise((next) => {
      extFs.removeFiles(config.alias.destRoot).then(() => {
        extFs.copyFiles(config.resource).then(() => {
          next();
        });
      });
    });
  },
  parseConfig(configPath) {
    const config = require(configPath);
    const dirname = path.dirname(configPath);

    // alias format to absolute
    Object.keys(config.alias).forEach((key) => {
      config.alias[key] = util.path.resolve(
        dirname,
        config.alias[key]
      );
    });

    if (config.resource) {
      Object.keys(config.resource).forEach((key) => {
        const curKey = util.path.resolve(dirname, key);
        config.resource[curKey] = util.path.resolve(dirname, config.resource[key]);
        delete config.resource[key];
      });
    }

    return config;
  }
};

const runner = {
  examples() {
    console.log(seed.examples);
  },
  init(iEnv) {
    if (!iEnv.path) {
      return print.log.warn('task need --path options');
    }
    const initPath = path.resolve(process.cwd(), iEnv.path);

    // build path
    util.mkdirSync(initPath);

    // init
    seed.init('single-project', initPath)
      .on('msg', (...argv) => {
        const [type, iArgv] = argv;
        let iType = type;
        if (!print.log[type]) {
          iType = 'info';
        }
        print.log[iType](iArgv);
      })
      .on('finished', () => {
        util.openPath(initPath);
      });
  },
  all(iEnv) {
    let configPath;
    if (iEnv.config) {
      configPath = path.resolve(process.cwd(), iEnv.config);
      if (!fs.existsSync(configPath)) {
        return print.log.warn(`config path not exists: ${configPath}`);
      } else {
        config = fn.parseConfig(configPath);
      }
    } else {
      return print.log.warn('task need --config options');
    }

    const CONFIG_DIR = path.dirname(configPath);
    const opzer = seed.optimize(config, CONFIG_DIR);

    fn.clearDest(config).then(() => {
      opzer.all(iEnv)
        .on('msg', (...argv) => {
          const [type, iArgv] = argv;
          let iType = type;
          if (!print.log[type]) {
            iType = 'info';
          }
          print.log[iType](iArgv);
        })
        .on('clear', () => {
          util.cleanScreen();
        })
        .on('finished', () => {
          print.log.success('task finished');
        });
    });
  },
  async watch(iEnv) {
    let configPath;
    if (iEnv.config) {
      configPath = path.resolve(process.cwd(), iEnv.config);
      if (!fs.existsSync(configPath)) {
        return print.log.warn(`config path not exists: ${configPath}`);
      } else {
        config = fn.parseConfig(configPath);
      }
    } else {
      return print.log.warn('task need --config options');
    }

    const CONFIG_DIR = path.dirname(configPath);
    const opzer = seed.optimize(config, CONFIG_DIR);

    let app = null;
    // 本地服务器
    app = connect();
    app.use(serveStatic(config.alias.destRoot, {
      'setHeaders': function(res) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    }));
    app.use(serveIndex(config.alias.destRoot));

    await opzer.initServerMiddleWare(app, iEnv, iEnv.platform);

    app.listen(config.localserver.port);

    fn.clearDest(config).then(() => {
      opzer.watch(iEnv)
        .on('clear', () => {
          if (!iEnv.silent) {
            util.cleanScreen();
          }
        })
        .on('msg', (...argv) => {
          const [type, iArgv] = argv;
          let iType = type;
          if (!print.log[type]) {
            iType = 'info';
          }
          if (!iEnv.silent) {
            print.log[iType](iArgv);
          }
        })
        .on('finished', () => {
          if (!iEnv.silent) {
            print.log.success('task finished');
          }
        });
    });
  },
  make(iEnv) {
    let configPath;
    if (iEnv.config) {
      configPath = path.resolve(process.cwd(), iEnv.config);
      if (!fs.existsSync(configPath)) {
        return print.log.warn(`config path not exists: ${configPath}`);
      } else {
        config = fn.parseConfig(configPath);
      }
    } else {
      return print.log.warn('task need --config options');
    }

    fn.clearDest(config).then(() => {
      seed.make(iEnv.name, config)
        .on('start', () => {
          util.cleanScreen();
        })
        .on('msg', (...argv) => {
          const [type, iArgv] = argv;
          let iType = type;
          if (!print.log[type]) {
            iType = 'info';
          }
          print.log[iType](iArgv);
        })
        .on('finished', () => {
          print.log.success('task finished');
        });
    });
  }
};

(() => {
  const ctrl = process.argv[2];
  const iEnv = util.envParse(process.argv.slice(3));

  if (ctrl in runner) {
    runner[ctrl](iEnv);
  } else {
    print.log.warn(`usage: ${Object.keys(runner).join(',')}`);
  }
})();


