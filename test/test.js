const util = require('yyl-util');
const path = require('path');
const extFs = require('yyl-fs');
const fs = require('fs');
const frp = require('yyl-file-replacer');
const http = require('http');

const seed = require('../index.js');

jest.setTimeout(30000);

const TEST_CTRL = {
  EXAMPLES: true,
  INIT: true,
  MAKE: true,
  ALL: true
};

const FRAG_PATH = path.join(__dirname, '__frag');


const fn = {
  makeAwait(fn) {
    return new Promise(fn);
  },
  parseConfig(configPath) {
    const config = util.requireJs(configPath);
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
  },
  hideUrlTail: function(url) {
    return url
      .replace(/\?.*?$/g, '')
      .replace(/#.*?$/g, '');
  },
  frag: {
    clearDest(config, copyFont) {
      return new Promise((next) => {
        extFs.removeFiles(config.alias.destRoot).then(() => {
          if (copyFont) {
            extFs.copyFiles(config.resource).then(() => {
              next();
            });
          } else {
            next();
          }
        });
      });
    },
    here(f, done) {
      new util.Promise((next) => {
        fn.frag.build().then(() => {
          next();
        });
      }).then((next) => {
        f(next);
      }).then(() => {
        fn.frag.destroy().then(() => {
          done();
        });
      }).start();
    },
    build() {
      if (fs.existsSync(FRAG_PATH)) {
        return extFs.removeFiles(FRAG_PATH);
      } else {
        return extFs.mkdirSync(FRAG_PATH);
      }
    },
    destroy() {
      return extFs.removeFiles(FRAG_PATH, true);
    }
  }
};

const linkCheck = function (config, next) {
  const htmlArr = util.readFilesSync(config.alias.destRoot, /\.html$/);
  const cssArr = util.readFilesSync(config.alias.destRoot, /\.css$/);
  const jsArr = util.readFilesSync(config.alias.destRoot, /\.js$/);

  const destRoot = config.alias.destRoot;
  const LOCAL_SOURCE_REG = new RegExp(`^(${config.commit.hostname})`);
  const REMOTE_SOURCE_REG = /^(http[s]?:|\/\/\w)/;
  const ABSOLUTE_SOURCE_REG = /^\/(\w)/;
  const RELATIVE_SOURCE_REG = /^\./;
  const NO_PROTOCOL = /^\/\/(\w)/;

  const localSource = [];
  const remoteSource = [];
  const notMatchLocalSource = [];

  const sourcePickup = function (iPath, dir) {
    if (iPath.match(LOCAL_SOURCE_REG)) {
      localSource.push(
        fn.hideUrlTail(
          util.path.join(destRoot, iPath.replace(LOCAL_SOURCE_REG, ''))
        )
      );
    } else if (iPath.match(ABSOLUTE_SOURCE_REG)) {
      localSource.push(
        fn.hideUrlTail(
          util.path.join(destRoot, iPath.replace(LOCAL_SOURCE_REG, '$1'))
        )
      );
    } else if (iPath.match(REMOTE_SOURCE_REG)) {
      remoteSource.push(iPath);
    } else if (iPath.match(RELATIVE_SOURCE_REG)) {
      localSource.push(
        fn.hideUrlTail(
          util.path.join(dir, iPath)
        )
      );
    }
  };

  htmlArr.forEach((iPath) => {
    frp.htmlPathMatch(fs.readFileSync(iPath).toString(), (mPath) => {
      sourcePickup(mPath, path.dirname(iPath));
      return mPath;
    });
  });

  cssArr.forEach((iPath) => {
    frp.cssPathMatch(fs.readFileSync(iPath).toString(), (mPath) => {
      sourcePickup(mPath, path.dirname(iPath));
      return mPath;
    });
  });

  jsArr.forEach((iPath) => {
    frp.jsPathMatch(fs.readFileSync(iPath).toString(), (mPath) => {
      sourcePickup(mPath, path.dirname(iPath));
      return mPath;
    });
  });

  localSource.forEach((iPath) => {
    if (!fs.existsSync(iPath)) {
      notMatchLocalSource.push(iPath);
    }
  });

  let padding = remoteSource.length +  notMatchLocalSource.length;
  const paddingCheck = function () {
    if (!padding) {
      next();
    }
  };

  remoteSource.forEach((iPath) => {
    var rPath = iPath;
    if (rPath.match(NO_PROTOCOL)) {
      rPath = rPath.replace(NO_PROTOCOL, 'http://$1');
    }


    http.get(rPath, (res) => {
      expect([rPath, res.statusCode]).toEqual([rPath, 200]);
      padding--;
      paddingCheck();
    });
  });

  notMatchLocalSource.forEach((iPath) => {
    var rPath = util.path.join(
      config.commit.hostname,
      util.path.relative(config.alias.destRoot, iPath)
    );
    if (rPath.match(NO_PROTOCOL)) {
      rPath = rPath.replace(NO_PROTOCOL, 'http://$1');
    }

    http.get(rPath, (res) => {
      expect([iPath, rPath, res.statusCode]).toEqual([iPath, rPath, 200]);
      padding--;
      paddingCheck();
    });
  });
  paddingCheck();
};

if (TEST_CTRL.EXAMPLES) {
  it('seed.examples', async () => {
    expect(seed.examples.length).not.toEqual(0);
    seed.examples.forEach((type) => {
      expect(/^\./.test(type)).not.toEqual(true);
    });
  });
}

if (TEST_CTRL.INIT) {
  const COMMONS_PATH = util.path.join(seed.path, 'commons');

  // 完整性校验
  const checkComplatable = (type, targetPath) => {
    const MAIN_PATH = util.path.join(seed.path, 'examples', type);

    const fromCommons = util.readFilesSync(COMMONS_PATH, (iPath) => {
      const relativePath = util.path.relative(COMMONS_PATH, iPath);
      return !relativePath.match(seed.init.FILTER.COPY_FILTER);
    });

    const fromMains = util.readFilesSync(MAIN_PATH, (iPath) => {
      const relativePath = util.path.relative(MAIN_PATH, iPath);
      return !relativePath.match(seed.init.FILTER.COPY_FILTER);
    });

    fromCommons.forEach((fromPath) => {
      const toPath = util.path.join(
        targetPath,
        util.path.relative(COMMONS_PATH, fromPath)
      );
      expect(fs.existsSync(toPath)).toEqual(true);
    });

    fromMains.forEach((fromPath) => {
      const toPath = util.path.join(
        targetPath,
        util.path.relative(MAIN_PATH, fromPath)
      );
      expect(fs.existsSync(toPath)).toEqual(true);
    });
  };

  // 可以性校验
  const checkUsage = (configPath) => {
    const config = fn.parseConfig(configPath);
    const dirname = path.dirname(configPath);
    const configKeys = Object.keys(config);
    const runner = (next) => {
      expect(configKeys.length).not.toEqual(0);
      seed.optimize(config, dirname).all().on('finished', () => {
        expect(fs.readdirSync(path.join(dirname, 'dist')).length).not.toEqual(0);
        next();
      });
    };
    return new Promise(runner);
  };

  seed.examples.forEach((type) => {
    test(`seed.init ${type}`, async () => {
      await fn.frag.build();
      const targetPath = path.join(FRAG_PATH, type);
      extFs.mkdirSync(targetPath);

      const timePadding = {
        start: 0,
        msg: 0,
        finished: 0
      };
      await fn.makeAwait((next) => {
        seed.init(type, targetPath)
          .on('start', () => {
            timePadding.start++;
          })
          .on('msg', () => {
            timePadding.msg++;
          })
          .on('finished', () => {
            timePadding.finished++;

            // times check
            expect(timePadding.start).toEqual(1);
            expect(timePadding.msg).not.toEqual(0);
            expect(timePadding.finished).toEqual(1);

            checkComplatable(type, targetPath);
            const configPath = path.join(targetPath, 'config.js');

            checkUsage(configPath).then(() => {
              next();
            });
          });
      });

      await fn.frag.destroy();
    });
  });
}

if (TEST_CTRL.MAKE) {
  test('seed.make()', async () => {
    await fn.frag.build();
    await extFs.copyFiles(path.join(__dirname, './demo'), FRAG_PATH);

    const configPath = path.join(FRAG_PATH, 'config.js');
    const config = fn.parseConfig(configPath);

    // page components
    const pName = 'p-maketest';
    await fn.makeAwait((next) => {
      seed.make(pName, config)
        .on('finished', () => {
          next();
        });
    });


    const pagePath = path.join(config.alias.srcRoot, `components/page/${pName}/${pName}.vue`);

    expect(fs.existsSync(pagePath)).toEqual(true);

    // widget components
    const wName = 'w-maketest';
    await fn.makeAwait((next) => {
      seed.make(wName, config)
        .on('finished', () => {
          next();
        });
    });

    const widgetPath = path.join(config.alias.srcRoot, `components/widget/${wName}/${wName}.vue`);
    expect(fs.existsSync(widgetPath)).toEqual(true);

    // default components
    const dName = 'maketest';
    await fn.makeAwait((next) => {
      seed.make(dName, config)
        .on('finished', () => {
          next();
        });
    });

    const dPath = path.join(config.alias.srcRoot, `components/widget/${dName}/${dName}.vue`);
    expect(fs.existsSync(dPath)).toEqual(true);

    await fn.frag.destroy();
  });
}

if (TEST_CTRL.ALL) {
  test('seed.all()', async () => {
    await fn.frag.build();
    await extFs.copyFiles(path.join(__dirname, './demo'), FRAG_PATH);

    const configPath = path.join(FRAG_PATH, 'config.js');
    const config = fn.parseConfig(configPath);

    const opzer = seed.optimize(config, path.dirname(configPath));

    await fn.frag.clearDest(config);

    await fn.makeAwait((next) => {
      const timePadding = {
        start: 0,
        msg: 0,
        finished: 0
      };

      opzer.all()
        .on('start', () => {
          timePadding.start++;
        })
        .on('msg', () => {
          timePadding.msg++;
        })
        .on('finished', () => {
          timePadding.finished++;
          // times check
          expect(timePadding.start).toEqual(1);
          expect(timePadding.msg).not.toEqual(0);
          expect(timePadding.finished).toEqual(1);

          linkCheck(config, () => {
            next();
          });
        });
    });

    await fn.frag.clearDest(config);

    await fn.makeAwait((next) => {
      opzer.all({ remote: true })
        .on('finished', () => {
          linkCheck(config, () => {
            next();
          });
        });
    });

    await fn.frag.clearDest(config);

    await fn.makeAwait((next) => {
      opzer.all({ isCommit: true })
        .on('finished', () => {
          linkCheck(config, () => {
            next();
          });
        });
    });
  });
}
