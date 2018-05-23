const crossSpawn = require('cross-spawn');
var chalk = require('chalk');
const app = `${chalk.green('ℹ ｢ext｣:')} ext-gen:`;

exports.spawnPromise = (command, args, options) => {
let child;
    let promise = new Promise((resolve, reject) => {
//    let stdout = Buffer.alloc(0);
//    let stderr = Buffer.alloc(0);
    child = crossSpawn(command, args, options)
              .on('close', (code, signal) => {
                //resolve({ code, signal, stderr, stdout});
                resolve({ code, signal});
              })
              .on('error', (error) => {
//                  error.stdout = stdout;
//                  error.stderr = stderr;
                  reject(error);
              });
    if (child.stdout) {
      child.stdout
        .on('data', (data) => {
        var substrings = options.substrings;
        if (substrings.some(function(v) { return data.indexOf(v) >= 0; })) { 
          var str = data.toString()
          var s = str.replace(/\r?\n|\r/g, " ")
          var s2 = s.replace("[INF]", "")
          console.log(`${app}${s2}`) 
//                stdout = Buffer.concat([stdout, Buffer.from(`${app} ${s2}`, 'utf-8')]);
        }
      })

        // child.stdout
        //     .on('data', (data) => {
        //         stdout = Buffer.concat([stdout, data]);
        //     });
    }
    if (child.stderr) {
      child.stderr
            .on('data', (data) => {
              var str = data.toString()
              var s = str.replace(/\r?\n|\r/g, " ")
              console.log(`${app} ${chalk.black("[ERR]")} ${s}`)
              //stderr = Buffer.concat([stderr, Buffer.from(`${app} ${chalk.black(" [ERR]")} ${s}`, 'utf-8')]);  
            });
    }
    });
    promise.child = child;
    return promise;
}
