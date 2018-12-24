const extOs = require('yyl-os');
const path = require('path');
const extFs = require('yyl-fs');
const fs = require('fs');

const DEMO_PATH = path.join(__dirname, '../../runner/demo');
const FRAG_PATH = path.join(__dirname, '../../__frag');
const FRAG_DIST_PATH = path.join(FRAG_PATH, 'dist');
const FRAG_DIST_HTML_PATH = path.join(FRAG_DIST_PATH, 'pc/html/index.html');

const fn = {
  checkHtml() {
    return new Promise((next) => {
      const checkIt = function () {
        return fs.existsSync(FRAG_DIST_HTML_PATH);
      };
      const LIMIT = 10;
      let padding = 0;

      const iKey = setInterval(() => {
        const r = checkIt();
        if (padding > LIMIT  || r) {
          clearInterval(iKey);
          next(r);
        }
      }, 1000);
    });
  }
};
module.exports = {
  'test seed.watch': function(client) {
    client
      .perform(async (done) => {
        await extFs.removeFiles(FRAG_PATH, true);
        await extFs.mkdirSync(FRAG_PATH);
        await extFs.copyFiles(DEMO_PATH, FRAG_PATH);
        await extFs.removeFiles(FRAG_DIST_PATH);
        extOs.runCMD(`node ../../runner/run.js watch --config ${path.join(FRAG_PATH, 'config.js')} --ignoreClear`, __dirname);
        const r = await fn.checkHtml();
        client.assert.equal(r, true);
        done();
      })
      .url('http://127.0.0.1:5000/pc/html/index.html')
      .maximizeWindow()
      .end(async () => {
        await extOs.rm(FRAG_PATH);
        process.exit(1);
      });
  }
};
