const tUtil = require('yyl-seed-test-util');
const path = require('path');
const util = require('yyl-util');
const extFs = require('yyl-fs');
const fs = require('fs');

const request = require('yyl-request');

const seed = require('../../index.js');
const TEST_CTRL = require('../test.config.js');

const FRAG_PATH = path.join(__dirname, '../__frag');

module.exports['@disabled'] = !TEST_CTRL.INIT;

tUtil.frag.init(FRAG_PATH);

seed.examples.forEach((type, index) => {
  module.exports[`test init ${type}`] = function (client) {
    const pjPath = path.join(FRAG_PATH, `init-${type}`);
    let remoteIndex = '';

    const waitTime = index === 0? 0: 2000;

    return client
      .waitFor(waitTime)
      .perform(async (done) => {
        await tUtil.frag.build();
        await extFs.mkdirSync(pjPath);
        await util.makeAwait((next) => {
          seed.init(type, pjPath)
            .on('finished', () => {
              next();
            });
        });

        const configPath = path.join(pjPath, 'config.js');
        const destPath = path.join(pjPath, 'dist');
        const config = tUtil.parseConfig(configPath);
        const opzer = seed.optimize(config, pjPath);

        await extFs.mkdirSync(destPath);

        await tUtil.server.start(destPath, 5000);

        opzer.initServerMiddleWare(tUtil.server.getAppSync(), {});

        await util.makeAwait((next) => {
          opzer.watch({})
            .on('finished', () => {
              next();
            });
        });

        const htmls = await extFs.readFilePaths(destPath, (iPath) => /\.html$/.test(iPath));
        client.verify.ok(htmls.length !== 0, `expect build ${htmls.length} html files`);

        remoteIndex = `http://127.0.0.1:5000/${util.path.relative(destPath, htmls[0])}`;
        const [, res] = await request.get(remoteIndex);
        client.verify.ok(typeof res !== 'undefined', `expect remoteIndex [${remoteIndex}] request no error`);
        client.verify.ok(res.statusCode === 200, `expect statusCode ${res.statusCode}`);

        client
          .checkPageError(remoteIndex);

        done();
      })
      .perform(async (done) => {
        const scssPaths = await extFs.readFilePaths(path.join(pjPath, 'src/entry'), (iPath) => /\.scss$/.test(iPath));
        client.verify.ok(scssPaths.length !== 0, `expect have ${scssPaths.length} scss files: [${scssPaths[0]}]`);
        const iScss = scssPaths[0];
        let scssCnt = fs.readFileSync(iScss).toString();
        scssCnt += '\nbody {background-color: red;}';
        fs.writeFileSync(iScss, scssCnt);
        done();
      })
      .waitFor(2000)
      .getCssProperty('body', 'background-color', (result) => {
        console.log(result.value);
        client.verify.ok(result.value === 'rgba(255, 0, 0, 1)', `expect body turning red ${result.value}`);
      })
      .end(async () => {
        await tUtil.server.abort();
        await tUtil.frag.destroy();
      });
  };
});
