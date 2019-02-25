const fs = require('fs');
const path = require('path');
const SeedResponse = require('yyl-seed-response');
const util = require('yyl-util');
const extFs = require('yyl-fs');

const iRes = new SeedResponse();


const EXAMPLE_PATH = path.join(__dirname, '../examples');
const EXAMPLE_FILTER = /^(\..+|commons)/;

const COPY_FILTER = /gulpfile\.js|\.DS_Store|\.sass-cache|dist|config\.mine\.js|node_modules/;
const COMMONS_PATH = path.join(EXAMPLE_PATH, 'commons');


const EXAMPLES = (() => {
  const dirs = fs.readdirSync(EXAMPLE_PATH);
  return dirs.filter((dirname) => {
    return !dirname.match(EXAMPLE_FILTER);
  });
})();

const init = (type, targetPath) => {
  iRes.off();
  iRes.trigger('start', ['init']);
  const FROM_PATH = util.path.join(EXAMPLE_PATH, type);

  if (!~EXAMPLES.indexOf(type)) {
    iRes.trigger('error', ['error', `${type} is not exists`]);
    return iRes;
  }

  if (!fs.existsSync(targetPath)) {
    iRes.trigger('error', ['error', `${targetPath} is not exists`]);
    return iRes;
  }

  // copy commons file
  const task01 = new Promise((next, reject) => {
    iRes.trigger('msg', ['info', 'copy commons file start']);
    extFs.copyFiles(COMMONS_PATH, targetPath, (iPath) => {
      var relativePath = util.path.relative(FROM_PATH, iPath);
      if (relativePath.match(COPY_FILTER))  {
        return false;
      } else {
        return true;
      }
    }).then((data) => {
      data.add.forEach((iPath) => {
        iRes.trigger('msg', ['create', iPath]);
      });

      data.update.forEach((iPath) => {
        iRes.trigger('msg', ['update', iPath]);
      });
      iRes.trigger('msg', ['info', 'copy commons file finished']);
      next();
    }).catch((er) => {
      reject(['copy commons file error', er]);
    });
  });

  // copy examples file
  const task02 = new Promise((next, reject) => {
    iRes.trigger('msg', ['info', 'copy examples file start']);
    extFs.copyFiles(FROM_PATH, targetPath, (iPath) => {
      const relativePath = util.path.relative(FROM_PATH, iPath);
      if (relativePath.match(COPY_FILTER)) {
        return false;
      } else {
        return true;
      }
    }).then((data) => {
      data.add.forEach((iPath) => {
        iRes.trigger('msg', ['create', iPath]);
      });

      data.update.forEach((iPath) => {
        iRes.trigger('msg', ['update', iPath]);
      });
      iRes.trigger('msg', ['info', 'copy examples file finished']);
      next();
    }).catch((err) => {
      return reject(['copy example file error', err]);
    });
  });

  // create dist file
  const task03 = new Promise((next) => {
    iRes.trigger('msg', ['info', 'create dist document start']);
    const DIST_PATH = util.path.join(targetPath, 'dist');
    if (!fs.existsSync(DIST_PATH)) {
      fs.mkdirSync(DIST_PATH);
      iRes.trigger('msg', ['create', DIST_PATH]);
    }

    iRes.trigger('msg', ['info', 'create dist document finished']);
    return next();
  });

  // copy eslintrc editorconfig gitignore
  const task04 = new Promise((next, reject) => {
    iRes.trigger('msg', ['info', 'copy eslintrc, editorconfig start']);
    const copyMap = {

    };
    copyMap[path.join(EXAMPLE_PATH, '.eslintrc.js')] = path.join(targetPath, '.eslintrc.js');
    copyMap[path.join(EXAMPLE_PATH, '.editorconfig')] = path.join(targetPath, '.editorconfig');
    copyMap[path.join(EXAMPLE_PATH, '.ignore')] = path.join(targetPath, '.gitignore');

    extFs.copyFiles(copyMap).then((data) => {
      data.add.forEach((iPath) => {
        iRes.trigger('msg', ['create', iPath]);
      });

      data.update.forEach((iPath) => {
        iRes.trigger('msg', ['update', iPath]);
      });
      iRes.trigger('msg', ['info', 'copy eslintrc, editorconfig finished']);
      next();
    }).catch((err) => {
      return reject(['copy eslintrc, editorconfig error', err]);
    });

    return next();
  });

  Promise.all([task01, task02, task03, task04]).then(() => {
    return iRes.trigger('finished', ['init']);
  }).catch((er) => {
    iRes.trigger('error', [er]);
  });

  return iRes;
};


init.examples = EXAMPLES;
init.FILTER = {
  COPY_FILTER,
  EXAMPLE_FILTER
};

module.exports = init;
