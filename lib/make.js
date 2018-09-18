const fs = require('fs');
const path = require('path');
const SeedResponse = require('yyl-seed-response');
const extFs = require('yyl-fs');


const TEMPLATE = {
  VUE(op) {
    return [
      '<template lang="pug">',
      '</template>',
      '',
      '<style lang="scss">',
      '</style>',
      '',
      '<script>',
      '  export  default {',
      `    name: '${op.name}',`,
      '    components: {},',
      '    computed: {},',
      '    methods: {},',
      '    data() {',
      '      return {};',
      '    },',
      '    mounted() {}',
      '  }',
      '</script>'
    ].join('\r\n');
  }
};

const REG = {
  PAGE_COMPONENT: /^p-/,
  WIDGET_COMPONENT: /^[wv]-/
};

const make = function (name, config) {
  const iRes = new SeedResponse();
  iRes.trigger('start', ['make']);
  if (!name) {
    iRes.trigger('error', ['error', `make arguments name (${name}) is not exists`]);
    return iRes;
  }

  if (!config || !config.alias || !config.alias.srcRoot) {
    iRes.trigger('error', ['error', 'config.alias.srcRoot is not exists']);
    return iRes;
  }

  const targetPath = config.alias.srcRoot;

  let type = null;

  if (name.match(REG.PAGE_COMPONENT)) { // 页面模块
    type = 'page';
  } else if (name.match(REG.WIDGET_COMPONENT)) { // 组件模块
    type = 'widget';
  } else {
    type = 'default';
  }

  let dirName = '';
  if (type === 'page') {
    dirName = 'page';
  } else {
    dirName = 'widget';
  }
  const fPath01 = path.join(targetPath, 'components', dirName);
  const fPath02 = path.join(targetPath, 'components');

  let initPath = '';
  if (fs.existsSync(fPath01)) {
    initPath = fPath01;
  } else if (fs.existsSync(fPath02)) {
    initPath = fPath02;
  } else {
    extFs.mkdirSync(fPath02);
    initPath = fPath02;
  }

  initPath = path.join(initPath, name);

  extFs.mkdirSync(initPath);

  // 创建 文件
  const vuePath = path.join(initPath, `${name}.vue`);

  if (fs.existsSync(vuePath)) {
    iRes.trigger('msg', ['warn', `${vuePath} already exists, file build fail`]);
  } else {
    fs.writeFileSync(vuePath, TEMPLATE.VUE({ name }));
    iRes.trigger('msg', ['create', vuePath]);
  }

  iRes.trigger('finished', []);
  return iRes;
};

module.exports = make;
