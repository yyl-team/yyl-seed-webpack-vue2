const extOs = require('yyl-os');
const path = require('path');
const extFs = require('yyl-fs');
const fs = require('fs');

const DEMO_PATH = path.join(__dirname, '../../runner/demo');
const FRAG_PATH = path.join(__dirname, '../../__frag');
const FRAG_DIST_PATH = path.join(FRAG_PATH, 'dist');
const FRAG_DIST_HTML_PATH = path.join(FRAG_DIST_PATH, 'pc/html/index.html');
const FRAG_COLOR_SASS_PATH = path.join(FRAG_PATH, 'src/components/page/p-index/p-index.scss');

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
        extOs.runCMD(`node ../../runner/run.js watch --config ${path.join(FRAG_PATH, 'config.js')} --ignoreClear --silent`, __dirname);
        const r = await fn.checkHtml();
        client.assert.equal(r, true);
        done();
      })
      .url('http://127.0.0.1:5000/pc/html/index.html')
      .maximizeWindow()
      // 检查是否存在错误
      .getLog('browser', (logs) => {
        let errors = [];
        logs.forEach((log) => {
          if (log.level === 'SEVERE' && log.message.split('favicon').length === 1) {
            errors.push(log.message);
          }
        });
        client.assert.equal(errors.join(' '), '');
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
        process.exit(1);
      });
  }
};
