const chalk = require('chalk');
const util = require('../util.js')
const sencha = require('@extjs/sencha-cmd')
const spawn = require('child_process').spawn
const app = `${chalk.green('ℹ ｢ext｣:')} ext-build:`;

class buildAsync {
  // constructor(options) {
  // }

  async executeAsync() {
    var me = this
    //console.log(`${app} start`) 
    return new Promise(function(resolve, reject) {
      var parms = ['app','build','development']
      console.log(`${app}  passing to 'sencha app build development'`);

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

  async executeAsync2(parms) {
    return new Promise(function(resolve, reject) {
      var child = spawn(sencha, parms)
      child.on('exit', function (code, signal) {
        resolve(0) 
      })
      child.stdout.on('data', (data) => {
        var substrings = ["[INF] Writing contentx", '[ERR]', '[WRN]', '[INF] Processing', "[INF] Server", "[INF] Loading Build", "[INF] Waiting", "[LOG] Fashion waiting"]
        if (substrings.some(function(v) { return data.indexOf(v) >= 0; })) { 
          var str = data.toString()
          var s = str.replace(/\r?\n|\r/g, " ")
          var s2 = s.replace("[INF]", "")
          console.log(`${app} ${s2}`) 
        }
      })
      child.stderr.on('data', (data) => {
        var str = data.toString()
        var s = str.replace(/\r?\n|\r/g, " ")
        console.log(`${app} ${chalk.black(" [ERR]")} ${s}`) 
      })
    })
  }
}
module.exports = buildAsync