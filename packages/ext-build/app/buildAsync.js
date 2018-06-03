const chalk = require('chalk');
const util = require('../util.js')
//const sencha = require('@extjs/sencha-cmd')
//const spawn = require('child_process').spawn

var prefix = ``
if (require('os').platform() == 'darwin') {
  prefix = `ℹ ｢ext｣:`
}
else {
  prefix = `i [ext]:`
}

var app = `${chalk.green(prefix)} ext-build:`;

class buildAsync {
  constructor(options) {
    this.profile = options.parms[2]
    this.environment = options.parms[3]
  }

  executeAsync() {
    var me = this
    return new Promise(async function(resolve, reject) {
      var parms = ['app','build', me.profile, me.environment]
      console.log(`${app} passing to 'sencha app build ${me.profile} ${me.environment}'`);
      try {
        await util.senchaCmdAsync(parms);
        resolve(0);
      } catch(err) {
        console.log(`${app} ${chalk.red(" [ERR]")}${err}`) ;
      }
    })
  }
}
module.exports = buildAsync