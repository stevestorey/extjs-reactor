const chalk = require('chalk');
const util = require('../util.js')
//const sencha = require('@extjs/sencha-cmd')
//const spawn = require('child_process').spawn
const app = `${chalk.green('ℹ ｢ext｣:')} ext-build:`;

class buildAsync {
  executeAsync() {
    var me = this
    return new Promise(async function(resolve, reject) {
      var parms = ['app','build','development']
      console.log(`${app} passing to 'sencha app build development'`);
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