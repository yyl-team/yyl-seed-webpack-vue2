const TEST_CTRL = require('../test.config.js');
const seed = require('../../index.js');

module.exports['@disabled'] = !TEST_CTRL.INIT;

seed.examples.forEach((type) => {
  module.exports[`test init ${type}`] = function (client) {
    return client
      .perform(async (done) => {

      })
  };
});



