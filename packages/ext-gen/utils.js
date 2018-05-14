
exports.spawnPromise = (command, args, options) => {
let child;
    let promise = new Promise((resolve, reject) => {
    let stdout = Buffer.alloc(0);
    let stderr = Buffer.alloc(0);
    child = require('child_process')
                .spawn(command, args, options)
                .on('close', (code, signal) => {
                    resolve({ code, signal, stderr, stdout});
                })
                .on('error', (error) => {
                    error.stdout = stdout;
                    error.stderr = stderr;
                    reject(error);
                });
    if (child.stdout) {
        child.stdout
            .on('data', (data) => {
                stdout = Buffer.concat([stdout, data]);
            });
    }
    if (child.stderr) {
        child.stderr
            .on('data', (data) => {
                stderr = Buffer.concat([stderr, data]);
            });
    }
    });
    promise.child = child;
    return promise;
}
