/* eslint prefer-arrow-callback: 0 */
const path = require('path');
const extFs = require('yyl-fs');
const fs = require('fs');

const util = require('yyl-util');
const request = require('yyl-request');
const tUtil = require('yyl-seed-test-util');

const seed = require('../../index.js');

const FRAG_PATH = path.join(__dirname, '../__frag');
const TEST_CTRL = require('../test.config.js');

const PORT = 5000;

tUtil.frag.init(FRAG_PATH);

module.exports['@disabled'] = !TEST_CTRL.ENV;

const envList = [
  [{}, 'development'],
  [{ proxy: true }, 'development'],
  [{ proxy: true, remote: true }, 'development'],
  [{ isCommit: true }, 'production'],
  [{ isCommit: true, proxy: true }, 'production'],
  [{ isCommit: true, remote: true }, 'production'],
  [{ isCommit: true, remote: true, proxy: true }, 'production'],
  [{ isCommit: true, remote: true, proxy: true, NODE_ENV: 'development' }, 'development']
];

const oPath = path.join(__dirname, '../../test/case/env-test');

envList.forEach(([iEnv, mode]) => {
  module.exports[`test env ${util.envStringify(iEnv)}`] = function(client) {
    let remoteIndex = '';

    const pjName = `test-${util.envStringify(iEnv).split(' ').join('-')}`;
    const pjPath = path.join(FRAG_PATH, pjName);

    return client
      .perform(async(done) => {
        await tUtil.frag.build();
        await extFs.mkdirSync(pjPath);
        await extFs.copyFiles(oPath, pjPath);

        const configPath = path.join(pjPath, 'config.js');
        const destPath = path.join(pjPath, 'dist');
        const config = tUtil.parseConfig(configPath);

        client.verify.ok(fs.existsSync(configPath) === true, `check config path exists: ${configPath}`);

        const opzer = seed.optimize(config, pjPath);

        await extFs.mkdirSync(destPath);
        await tUtil.server.start(destPath, PORT);
        // opzer.initServerMiddleWare(tUtil.server.getAppSync(), {});

        await util.makeAwait((next) => {
          opzer.watch(iEnv)
            .on('finished', () => {
              next();
            });
        });

        const htmls = await extFs.readFilePaths(destPath, (iPath) => /\.html$/.test(iPath));
        client.verify.ok(htmls.length !== 0, `expect build ${htmls.length} html files`);

        remoteIndex = `http://127.0.0.1:${PORT}/${util.path.relative(destPath, htmls[0])}`;
        const [, res] = await request.get(remoteIndex);
        client.verify.ok(typeof res !== 'undefined', `expect remoteIndex [${remoteIndex}] request no error`);
        client.verify.ok(res.statusCode === 200, `expect statusCode ${res.statusCode}`);

        client
          .checkPageError(remoteIndex);

        done();
      })
      .executeAsync(function (ctx, done) {
        done(window.mode);
      }, [''], (result) => {
        client.verify.ok(result.value === mode, `expect mode equal ${mode} but ${result.value}`);
      })
      .end(async() => {
        await tUtil.server.abort();
        await tUtil.frag.destroy();
      });
  };
});
