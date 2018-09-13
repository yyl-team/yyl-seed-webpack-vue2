const util = require('yyl-util');
const SeedResponse = require('yyl-seed-response');

const USAGE = {
  watch: 'watch',
  all: 'all'
};

let config;
let iEnv;
let PROJECT_PATH = '';
let iRes = null;

const fn = {
  envInit: function (op) {
    let rEnv;
    if (typeof op !== 'object') {
      rEnv = {};
    } else {
      rEnv = op;
    }

    if (rEnv.ver == 'remote') {
      rEnv.remote = true;
    }
    if (rEnv.remote) {
      rEnv.ver = 'remote';
    }

    rEnv.staticRemotePath = (rEnv.remote || rEnv.isCommit) ? (config.commit.staticHost || config.commit.hostname) : '/';
    rEnv.mainRemotePath = (rEnv.remote || rEnv.isCommit) ? (config.commit.mainHost || config.commit.hostname) : '/';
    return rEnv;
  }
};

const wOpzer = function (iConfig, root) {
  config = util.extend(true, {}, iConfig);
  if (iRes) {
    iRes.off();
  }
  iRes = new SeedResponse();

  PROJECT_PATH = root;

  const opzer = {};

  Object.keys(USAGE).forEach((key) => {
    opzer[key] = function(op) {
      iEnv = fn.envInit(op);
      iRes.off();
      iRes.trigger('start', [key]);
      // gulp.series(USAGE[key], (done) => {
      //   iRes.trigger('finished', [USAGE[key]]);
      //   done();
      // })();

      return iRes;
    };
  });

  opzer.getConfigSync = function() {
    return config;
  };

  opzer.response = iRes;

  return opzer;
};

wOpzer.handles = Object.keys(USAGE);

module.exports = wOpzer;
