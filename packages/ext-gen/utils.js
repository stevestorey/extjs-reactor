const crossSpawn = require('cross-spawn');
var chalk = require('chalk');
const app = `${chalk.green('ℹ ｢ext｣:')} ext-gen:`;

exports.spawnPromise = (command, args, options, substrings) => {
  let child;
  let promise = new Promise((resolve, reject) => {
  child = crossSpawn(command, args, options)
    .on('close', (code, signal) => {
      resolve({ code, signal});
    })
    .on('error', (error) => {
      reject(error);
    })
  if (child.stdout) {
    console.log(`${app} has stdout`) 
    child.stdout
      .on('data', (data) => {
      //var substrings = options.substrings;
      if (substrings.some(function(v) { return data.indexOf(v) >= 0; })) { 
        var str = data.toString()
        var s = str.replace(/\r?\n|\r/g, " ")
        var s2 = s.replace("[INF]", "")
        console.log(`${app}${s2}`) 
      }
    })

      // child.stdout
      //     .on('data', (data) => {
      //         stdout = Buffer.concat([stdout, data]);
      //     });
  }
  if (child.stderr) {
    console.log(`${app} has stderr`) 
    child.stderr
      .on('data', (data) => {
        var str = data.toString()
        var s = str.replace(/\r?\n|\r/g, " ")
        console.log(`${app} ${chalk.black("[ERR]")} ${s}`)
      });
  }
  });
  promise.child = child;
  return promise;
}
