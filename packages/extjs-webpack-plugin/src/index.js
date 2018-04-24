import chalk from 'chalk';
import fs from 'fs';
import validateOptions from 'schema-utils';
import uniq from 'lodash.uniq';
import isGlob from 'is-glob';
//import glob from 'glob';
import { resolve } from 'path';
import recursiveReadSync from 'recursive-readdir-sync';
//const recursiveReadSync = require('recursive-readdir-sync')

const app = `${chalk.green('ℹ ｢ext｣:')} extjs-webpack-plugin: `;

function getFileAndContextDeps(compilation, files, dirs, cwd) {
  const { fileDependencies, contextDependencies } = compilation;
  const isWebpack4 = compilation.hooks;
  let fds = isWebpack4 ? [...fileDependencies] : fileDependencies;
  let cds = isWebpack4 ? [...contextDependencies] : contextDependencies;
  if (dirs.length > 0) {
    cds = uniq(cds.concat(dirs));
  }
  return {
    fileDependencies: fds,
    contextDependencies: cds,
  };
}

export default class ExtJSWebpackPlugin {
  static defaults = {
    cwd: process.cwd(),
    files: [],
    dirs: ['./app'],
  };

  constructor(options = {}) {
    validateOptions(require('../options.json'), options, 'ExtraWatchWebpackPlugin'); // eslint-disable-line
    this.options = { ...ExtJSWebpackPlugin.defaults, ...options };
  }

  apply(compiler) {

    if (this.webpackVersion == undefined) {
      const isWebpack4 = compiler.hooks;
      if (isWebpack4) {this.webpackVersion = 'IS webpack 4'}
      else {this.webpackVersion = 'NOT webpack 4'}
      this.extjsVersion = '6.5.3'
      process.stdout.cursorTo(0);console.log(app + 'Ext JS v' + this.extjsVersion + ', ' + this.webpackVersion)
    }

    let { files, dirs } = this.options;
    const { cwd } = this.options;
    files = typeof files === 'string' ? [files] : files;
    dirs = typeof dirs === 'string' ? [dirs] : dirs;

    if (compiler.hooks) {
      compiler.hooks.afterCompile.tap('extjs-after-compile', (compilation) => {
        process.stdout.cursorTo(0);console.log(app + 'extjs-after-compile')
        const {
          fileDependencies,
          contextDependencies,
        } = getFileAndContextDeps(compilation, files, dirs, cwd);
        if (files.length > 0) {
          fileDependencies.forEach((file) => {
            compilation.fileDependencies.add(resolve(file));
          });
        }
        if (dirs.length > 0) {
          contextDependencies.forEach((context) => {
            compilation.contextDependencies.add(context);
          });
        }
      });
    } else {
      compiler.plugin('after-compile', (compilation, cb) => {
        console.log(app + 'after-compile')
        const {
          fileDependencies,
          contextDependencies,
        } = getFileAndContextDeps(compilation, files, dirs, cwd);
        if (files.length > 0) {
          compilation.fileDependencies = fileDependencies; // eslint-disable-line
        }
        if (dirs.length > 0) {
          compilation.contextDependencies = contextDependencies; // eslint-disable-line
        }
        cb()
      });
    }

    if (compiler.hooks) {
      compiler.hooks.emit.tap('extjs-emit', (compilation) => {
        process.stdout.cursorTo(0);console.log(app + 'extjs-emit')

        var watchedFiles=[]
        try {watchedFiles = recursiveReadSync('./app')} 
        catch(err) {if(err.errno === 34){console.log('Path does not exist');} else {throw err;}}

        var doBuild = false
        for (var file in watchedFiles) {
          if (this.lastMilliseconds < fs.statSync(watchedFiles[file]).mtimeMs) {
            if (watchedFiles[file].indexOf("scss") != -1) {doBuild=true;break;}
          }
        }
        this.lastMilliseconds = (new Date).getTime()

        var currentNumFiles = watchedFiles.length
        var filesource = 'this file enables client reload'
        compilation.assets[currentNumFiles + 'FilesUnderAppFolder.md'] = {
          source: function() {return filesource},
          size: function() {return filesource.length}
        }

        if (currentNumFiles != this.lastNumFiles || doBuild) {
          var build = require('@extjs/sencha-build/app/build.js')
          new build({})
          //var refresh = require('@extjs/sencha-build/app/refresh.js')
          //new refresh({})
        }
        else {
          console.log(app + 'Call to Sencha Build not needed, no new files')
        }
        this.lastNumFiles = currentNumFiles




      })
    }
    else {
      compiler.plugin('emit', (compilation, cb) => {
        console.log(app + 'emit')
        var filelist = 'this file enables client reload'
        compilation.assets['ForReload.md'] = {
          source: function() {return filelist},
          size: function() {return filelist.length}
        }
        var refresh = require('@extjs/sencha-node/app/refresh.js')
        new refresh({})
        //cb()
        //this.emitStats.bind(this)



      })
    }

  }


  // emitStats(curCompiler, callback) {
  //   // Get stats.
  //   // **Note**: In future, could pass something like `{ showAssets: true }`
  //   // to the `getStats()` function for more limited object returned.
  //   let stats = curCompiler.getStats().toJson();
  
  //   // Filter to fields.
  //   if (this.opts.fields) {
  //     stats = this.opts.fields.reduce((memo, key) => {
  //       memo[key] = stats[key];
  //       return memo;
  //     }, {});
  //   }
  
  //   // Transform to string.
  //   let err;
  //   return Promise.resolve()
  
  //     // Transform.
  //     .then(() => this.opts.transform(stats, {
  //       compiler: curCompiler
  //     }))
  //     .catch((e) => { err = e; })
  
  //     // Finish up.
  //     .then((statsStr) => {
  //       // Handle errors.
  //       if (err) {
  //         curCompiler.errors.push(err);
  //         if (callback) { return void callback(err); }
  //         throw err;
  //       }
  
  //       // Add to assets.
  //       curCompiler.assets[this.opts.filename] = {
  //         source() {
  //           return statsStr;
  //         },
  //         size() {
  //           return statsStr.length;
  //         }
  //       };
  
  //       if (callback) { return void callback(); }
  //     });
  // }
  


}






  // if (files.length > 0) {
  //   files.forEach((pattern) => {
  //     let f = pattern;
  //     if (isGlob(pattern)) {
  //       f = glob.sync(pattern, {
  //         cwd,
  //         dot: true,
  //         absolute: true,
  //       });
  //     }
  //     fds = fds.concat(f);
  //   });
  //   fds = uniq(fds);
  // }


// function hook_stdout(callback) {
//   var old_write = process.stdout.write
//   console.log('in hook')
//   process.stdout.write = (function(write) {
//       return function(string, encoding, fd) {
//           write.apply(process.stdout, arguments)
//           callback(string, encoding, fd)
//       }
//   })(process.stdout.write)

//   return function() {
//       process.stdout.write = old_write
//       console.log('in unhook')
//     }
// }
    // this.unhook = hook_stdout(function(string, encoding, fd) {
    //   console.log('stdout: ' + string)
    // })

//        this.unhook()





        // var filelist = 'In this build:\n\n';

        // // Loop through all compiled assets,
        // // adding a new line item for each filename.
        // for (var filename in compilation.assets) {
        //   filelist += ('- '+ filename +'\n');
        // }
    
        // // Insert this list into the webpack build as a new file asset:
        // compilation.assets['filelist.md'] = {
        //   source: function() {
        //     return filelist;
        //   },
        //   size: function() {
        //     return filelist.length;
        //   }
        // };





        // //var d = new Date()
        // var d = 'mjg'
        // var filelist = 'In this build:\n\n' + d + '\n\n';
        // // Loop through all compiled assets,
        // // adding a new line item for each filename.
        // for (var filename in compilation.assets) {
        //   filelist += ('- '+ filename +'\n');
        // }
        // // Insert this list into the webpack build as a new file asset:
        // compilation.assets[d + '.md'] = {
        //   source: function() {
        //     return filelist;
        //   },
        //   size: function() {
        //     return filelist.length;
        //   }
        // };