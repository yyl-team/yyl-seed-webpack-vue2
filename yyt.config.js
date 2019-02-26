module.exports = {
  default: {
    src_folders: ['ui-test/test'],
    custom_commands_path: ['ui-test/commands'],
    output_folder: false,
    test_settings: {
      default: {
        globals: {
          asyncHookTimeout : 20000
        }
      }
    },
    __extend: {
      headless: true
    }
  }
};
