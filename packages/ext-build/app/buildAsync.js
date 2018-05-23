const chalk = require('chalk');
const util = require('../util.js')
const sencha = require('@extjs/sencha-cmd')
const spawn = require('child_process').spawn
const app = `${chalk.green('ℹ ｢ext｣:')} ext-build:`;

class buildAsync {
  // constructor(options) {
  // }

  executeAsync() {
    var me = this
    //console.log(`${app} start`) 
    return new Promise(async function(resolve, reject) {
      var parms = ['app','build','development']
      console.log(`${app} passing to 'sencha app build development'`);

      // me.executeAsync2(parms).then(function() {
      //   resolve(0)
      // })

      try {
        await util.senchaCmdAsync(parms);
        resolve(0);
      } catch(err) {
        console.log(`${app} ${chalk.red(" [ERR]")} ${err}`) ;
      }

    })
  }


}
module.exports = buildAsync