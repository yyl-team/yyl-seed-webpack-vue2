const os = require('os');

const fn = {
  getLocalServerAddress() {
    var ipObj = os.networkInterfaces();
    var ipArr;
    for (var key in ipObj) {
      if (ipObj.hasOwnProperty(key)) {
        ipArr = ipObj[key];
        for (var fip, i = 0, len = ipArr.length; i < len; i++) {
          fip = ipArr[i];
          if (fip.family.toLowerCase() == 'ipv4' && !fip.internal) {
            return fip.address;
          }
        }
      }
    }
    return '127.0.0.1';
  }
};

module.exports = fn;
