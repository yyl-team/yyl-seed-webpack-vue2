
const path = require('path');

const config = {};

// + setting
const setting = {
  localserver: {
    root: './dist',
    port: 5000
  },
  dest: {
    basePath: '/pc',
    jsPath: 'js',
    jslibPath: 'js/lib',
    cssPath: 'css',
    htmlPath: 'html',
    imagesPath: 'images',
    tplPath: 'tpl',
    revPath: 'assets'
  }
};
// - setting

const DEST_BASE_PATH = path.join(setting.localserver.root, setting.dest.basePath);
const COMMON_PATH = '../commons';

// + base
Object.assign(config, {
  localserver: setting.localserver,
  dest: setting.dest,
  platform: 'pc',
  entry: {
    'vendors': path.join(__dirname, './src/js/vendors.js')
  }
});
// - base

// + alias
Object.assign(config, {
  alias: {
    // 输出目录中 到 html, js, css, image 层 的路径
    'root': DEST_BASE_PATH,
    // rev 输出内容的相对地址
    'revRoot': DEST_BASE_PATH,
    // dest 地址
    'destRoot': setting.localserver.root,
    // src 地址
    'srcRoot': './src',
    // 项目根目录
    'dirname': './',
    // 公用组件地址
    'commons': COMMON_PATH,
    // 公用 components 目录
    'globalcomponents': path.join(COMMON_PATH, 'components'),
    'globallib': path.join(COMMON_PATH, 'lib'),
    // js 输出地址
    'jsDest': path.join(DEST_BASE_PATH, setting.dest.jsPath),
    // js lib 输出地址
    'jslibDest': path.join(DEST_BASE_PATH, setting.dest.jslibPath),
    // html 输出地址
    'htmlDest': path.join(DEST_BASE_PATH, setting.dest.htmlPath),
    // css 输出地址
    'cssDest': path.join(DEST_BASE_PATH, setting.dest.cssPath),
    // images 输出地址
    'imagesDest': path.join(DEST_BASE_PATH, setting.dest.imagesPath),
    // assets 输出地址
    'revDest': path.join(DEST_BASE_PATH, setting.dest.revPath),
    // tpl 输出地址
    'tplDest': path.join(DEST_BASE_PATH, setting.dest.tplPath),
    // webpackconfig 中的 alias
    'jquery': path.join('./src/js/lib/jquery/jquery-1.11.1.js'),
    'babel-polyfill': path.join('./src/js/lib/babel-polyfill/babel-polyfill.js')
    // + yyl make
    // - yyl make
  }
});
// - alias

Object.assign(config, {
  providePlugin: {
    '$': 'jquery'
  }
});


// + commit
Object.assign(config, {
  commit: {
    hostname: '//yyweb.yystatic.com/',
    revAddr: `//yyweb.yystatic.com/${setting.dest.basePath}/${setting.dest.revPath}/rev-manifest.json`
  }
});
// - commit

module.exports = config;

