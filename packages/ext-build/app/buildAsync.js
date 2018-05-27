const chalk = require('chalk');
const util = require('../util.js')
//const sencha = require('@extjs/sencha-cmd')
//const spawn = require('child_process').spawn
const app = `${chalk.green('ℹ ｢ext｣:')} ext-build:`;

class buildAsync {
  constructor(options) {
    this.environment = options.parms[2]
  }

  executeAsync() {
    var me = this
    return new Promise(async function(resolve, reject) {
      var parms = ['app','build',me.environment]
      console.log(`${app} passing to 'sencha app build ${me.environment}'`);
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