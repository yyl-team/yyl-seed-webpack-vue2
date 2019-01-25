const extOs = require('yyl-os');
const path = require('path');
const extFs = require('yyl-fs');
const fs = require('fs');

const util = require('yyl-util');
const request = require('yyl-request');
const tUtil = require('yyl-seed-test-util');

require('http-shutdown').extend();

const Seed = require('../../index.js');

const TEST_CTRL = require('../test.config.js');

const DEMO_PATH = path.join(__dirname, '../../test/demo');
const FRAG_PATH = path.join(__dirname, '../__frag');
const FRAG_DIST_PATH = path.join(FRAG_PATH, 'dist');
const FRAG_DIST_HTML_PATH = path.join(FRAG_DIST_PATH, 'pc/html/index.html');
const FRAG_COLOR_SASS_PATH = path.join(FRAG_PATH, 'src/components/page/p-index/p-index.scss');

const SERVER_PORT = 5000;

tUtil.frag.init(FRAG_PATH);


const cache = {
  server: null,
  app: null
};

module.exports = {
  '@disabled': !TEST_CTRL.WATCH,
  'test seed.watch': function(client) {
    client
      .perform(async (done) => {
        await tUtil.frag.build();

        await extFs.copyFiles(DEMO_PATH, FRAG_PATH);
        await extFs.removeFiles(FRAG_DIST_PATH);

        const configPath = path.join(FRAG_PATH, 'config.js');

        const config = tUtil.parseConfig(configPath);

        const opzer = Seed.optimize(config, configPath);

        const iEnv = {
          silent: true
        };



        await tUtil.server.start();
        opzer.initServerMiddleWare(cache.app, iEnv);

        await util.makeAwait((next) => {
          opzer.watch(iEnv).on('finished', () => {
            next();
          });
        });

        client.verify.ok(fs.existsSync(FRAG_DIST_HTML_PATH), `html path exists ${FRAG_DIST_HTML_PATH}`);

        const htmls = await extFs.readFilePaths(FRAG_DIST_PATH, (iPath) => /\.html$/.test(iPath));

        client.verify.ok(htmls.length !== 0, `build ${htmls.length} html files`);

        const serverIndex = `http://${extOs.LOCAL_IP}:${SERVER_PORT}/pc/html/index.html`;

        const [ err, res ] = await request(serverIndex);

        client.verify.ok(err === null, `server no error ${err}`);
        if (res && res.statusCode) {
          client.verify.ok(res.statusCode === 200, `GET ${serverIndex} ${res.statusCode}`);
        }

        client.checkPageError(serverIndex);
        done();
      })
      // 改个 颜色
      .perform((done) => {
        let scssCnt = fs.readFileSync(FRAG_COLOR_SASS_PATH).toString();
        scssCnt += '\nbody {background-color: red;}';
        fs.writeFileSync(FRAG_COLOR_SASS_PATH, scssCnt);
        done();
      })
      .waitFor(3000)
      .getCssProperty('body', 'background-color', function (result) {
        this.assert.equal(result.value, 'rgba(255, 0, 0, 1)');
      })
      .end(async () => {
        await tUtil.server.abort();
        await extFs.removeFiles(FRAG_PATH, true);
      });
  }
};
