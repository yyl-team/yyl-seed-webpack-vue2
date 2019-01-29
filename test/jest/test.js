const util = require('yyl-util');
const tUtil = require('yyl-seed-test-util');
const path = require('path');
const extFs = require('yyl-fs');
const fs = require('fs');
const frp = require('yyl-file-replacer');
const http = require('http');

const seed = require('../../index.js');

jest.setTimeout(30000);

const TEST_CTRL = {
  EXAMPLES: true,
  INIT: true,
  MAKE: true,
  ALL: true
};

const FRAG_PATH = path.join(__dirname, '__frag');
const RUNNER_PATH = path.join(__dirname, '../case/demo');

tUtil.frag.init(FRAG_PATH);


const fn = {
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
  }
};

const linkCheck = function (config, next) {
  const htmlArr = extFs.readFilesSync(config.alias.destRoot, /\.html$/);
  const cssArr = extFs.readFilesSync(config.alias.destRoot, /\.css$/);
  const jsArr = extFs.readFilesSync(config.alias.destRoot, /\.js$/);

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
        tUtil.hideUrlTail(
          util.path.join(destRoot, iPath.replace(LOCAL_SOURCE_REG, ''))
        )
      );
    } else if (iPath.match(ABSOLUTE_SOURCE_REG)) {
      localSource.push(
        tUtil.hideUrlTail(
          util.path.join(destRoot, iPath.replace(LOCAL_SOURCE_REG, '$1'))
        )
      );
    } else if (iPath.match(REMOTE_SOURCE_REG)) {
      remoteSource.push(iPath);
    } else if (iPath.match(RELATIVE_SOURCE_REG)) {
      localSource.push(
        tUtil.hideUrlTail(
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

// 检查 assets async components
async function checkAsyncComponent (config) {
  const asyncPath = path.join(config.alias.jsDest, 'async_component');
  if (fs.existsSync(asyncPath) && fs.readdirSync(asyncPath).length) {
    const assetsPath = path.join(config.alias.revDest, 'rev-manifest.json');
    expect(fs.existsSync(assetsPath)).toEqual(true);
    const assetJson = JSON.parse(fs.readFileSync(assetsPath).toString());

    Object.keys(assetJson).forEach((key) => {
      const aPath = path.join(config.alias.revRoot, key);
      const bPath = path.join(config.alias.revRoot, assetJson[key]);
      const aPathExists = fs.existsSync(aPath);
      const bPathExists = fs.existsSync(bPath);

      expect([aPath, aPathExists]).toEqual([aPath, true]);
      expect([bPath, bPathExists]).toEqual([bPath, true]);
    });
  }
}

// 检查 blank css file
async function checkCssFiles (config) {
  const htmlArr = await extFs.readFilePaths(config.alias.htmlDest, /\.html$/, true);
  htmlArr.forEach((htmlPath) => {
    const filename = path.relative(config.alias.htmlDest, htmlPath);
    const cssFile = filename.replace(/\.html$/, '.css');
    const cssPath = path.join(config.alias.cssDest, cssFile);

    expect(fs.existsSync(cssPath)).toEqual(true);
  });
}

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

    const fromCommons = extFs.readFilesSync(COMMONS_PATH, (iPath) => {
      const relativePath = util.path.relative(COMMONS_PATH, iPath);
      return !relativePath.match(seed.init.FILTER.COPY_FILTER);
    });

    const fromMains = extFs.readFilesSync(MAIN_PATH, (iPath) => {
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

    // other
    ['.gitignore', '.editorconfig', '.eslintrc.js'].forEach((fromPath) => {
      const toPath = util.path.join(targetPath, fromPath);
      expect(fs.existsSync(toPath)).toEqual(true);
    });
  };

  // 可以性校验
  const checkUsage = (configPath) => {
    const config = tUtil.parseConfig(configPath);
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
      await tUtil.frag.build();
      const targetPath = path.join(FRAG_PATH, type);
      extFs.mkdirSync(targetPath);

      const timePadding = {
        start: 0,
        msg: 0,
        finished: 0
      };
      await util.makeAwait((next) => {
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

      await tUtil.frag.destroy();
    });
  });
}

if (TEST_CTRL.MAKE) {
  test('seed.make()', async () => {
    await tUtil.frag.build();
    await extFs.copyFiles(RUNNER_PATH, FRAG_PATH);

    const configPath = path.join(FRAG_PATH, 'config.js');
    const config = tUtil.parseConfig(configPath);

    // page components
    const pName = 'p-maketest';
    await util.makeAwait((next) => {
      seed.make(pName, config)
        .on('finished', () => {
          next();
        });
    });


    const pagePath = path.join(config.alias.srcRoot, `components/page/${pName}/${pName}.vue`);

    expect(fs.existsSync(pagePath)).toEqual(true);

    // widget components
    const wName = 'w-maketest';
    await util.makeAwait((next) => {
      seed.make(wName, config)
        .on('finished', () => {
          next();
        });
    });

    const widgetPath = path.join(config.alias.srcRoot, `components/widget/${wName}/${wName}.vue`);
    expect(fs.existsSync(widgetPath)).toEqual(true);

    // default components
    const dName = 'maketest';
    await util.makeAwait((next) => {
      seed.make(dName, config)
        .on('finished', () => {
          next();
        });
    });

    const dPath = path.join(config.alias.srcRoot, `components/widget/${dName}/${dName}.vue`);
    expect(fs.existsSync(dPath)).toEqual(true);

    await tUtil.frag.destroy();
  });
}

if (TEST_CTRL.ALL) {
  test('seed.all()', async () => {
    await tUtil.frag.build();
    await extFs.copyFiles(RUNNER_PATH, FRAG_PATH);

    const configPath = path.join(FRAG_PATH, 'config.js');
    const config = tUtil.parseConfig(configPath);

    const opzer = seed.optimize(config, path.dirname(configPath));

    await fn.clearDest(config);

    // all
    await util.makeAwait((next) => {
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

    await checkAsyncComponent(config);
    await checkCssFiles(config);

    await fn.clearDest(config);

    // all --remote
    await util.makeAwait((next) => {
      opzer.all({ remote: true })
        .on('finished', () => {
          linkCheck(config, () => {
            next();
          });
        });
    });

    await checkAsyncComponent(config);
    await checkCssFiles(config);

    await fn.clearDest(config);

    // all --isCommit
    await util.makeAwait((next) => {
      opzer.all({ isCommit: true })
        .on('finished', () => {
          linkCheck(config, () => {
            next();
          });
        });
    });

    await checkAsyncComponent(config);
    await checkCssFiles(config);

    await tUtil.frag.destroy();
  });
}
