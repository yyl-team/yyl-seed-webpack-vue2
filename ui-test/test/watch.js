const extOs = require('yyl-os');
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

module.exports['@disabled'] = !TEST_CTRL.WATCH;

const casePath = path.join(__dirname, '../../test/case');
const projectDir = fs.readdirSync(casePath);
projectDir.forEach((pjName) => {
  const oPath = path.join(casePath, pjName);
  module.exports[`test ${pjName}`] = function(client) {
    const pjPath = path.join(FRAG_PATH, pjName);
    let remoteIndex = '';
    return client
      .perform(async (done) => {
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
        opzer.initServerMiddleWare(tUtil.server.getAppSync(), {});

        await util.makeAwait((next) => {
          opzer.watch({})
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
