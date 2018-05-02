const chalk = require('chalk');
const util = require('../util.js')

class buildAsync {
  constructor(options) {
//    console.log(`${chalk.black("[INF] sencha-build app build development")}`)
//    util.senchaCmd(['app','build','development']);
  }

  executeAsync() {
    return new Promise(function(resolve, reject) {
      setTimeout(function(){ 
        resolve(0) 
      }, 5000);
    })
  }



}
module.exports = buildAsync