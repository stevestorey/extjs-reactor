var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

const chalk = require('chalk');
const path = require('path');
const fs = require('fs');
const validateOptions = require('schema-utils');
const uniq = require('lodash.uniq');
const isGlob = require('is-glob');
//const resolve = require('path')
const recursiveReadSync = require('recursive-readdir-sync');

// import chalk from 'chalk';
// import path from 'path'
// import fs from 'fs';
// import validateOptions from 'schema-utils';
// import uniq from 'lodash.uniq';
// import isGlob from 'is-glob';
// import { resolve } from 'path';
// import recursiveReadSync from 'recursive-readdir-sync';


const app = `${chalk.green('ℹ ｢ext｣:')} ext-webpack-plugin: `;

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
    contextDependencies: cds
  };
}

export default class ExtWebpackPlugin {
  // static defaults = {
  //   cwd: process.cwd(),
  //   files: [],
  //   dirs: ['./app'],
  // };

  constructor(options = {}) {
    validateOptions(require('../options.json'), options, 'ExtraWatchWebpackPlugin'); // eslint-disable-line
    this.options = _extends({}, ExtWebpackPlugin.defaults, options);

    var defaults = {
      cwd: process.cwd(),
      files: [],
      dirs: ['./app']

      //    this.options = { ...defaults, ...options };


    };
  }

  apply(compiler) {

    if (this.webpackVersion == undefined) {
      var pluginPath = path.resolve(__dirname, '..');
      var pluginPkg = fs.existsSync(pluginPath + '/package.json') && JSON.parse(fs.readFileSync(pluginPath + '/package.json', 'utf-8')) || {};
      var pluginVersion = pluginPkg.version;

      var extPath = path.resolve(pluginPath, '../ext');
      var extPkg = fs.existsSync(extPath + '/package.json') && JSON.parse(fs.readFileSync(extPath + '/package.json', 'utf-8')) || {};
      var extVersion = extPkg.sencha.version;

      var cmdPath = path.resolve(pluginPath, '../sencha-cmd');
      var cmdPkg = fs.existsSync(cmdPath + '/package.json') && JSON.parse(fs.readFileSync(cmdPath + '/package.json', 'utf-8')) || {};
      var cmdVersion = cmdPkg.version_full;

      const isWebpack4 = compiler.hooks;
      if (isWebpack4) {
        this.webpackVersion = 'IS webpack 4';
      } else {
        this.webpackVersion = 'NOT webpack 4';
      }
      process.stdout.cursorTo(0);console.log(app + 'v' + pluginVersion + ', Ext JS v' + extVersion + ', Sencha Cmd v' + cmdVersion + ', ' + this.webpackVersion);
    }

    let { files, dirs } = this.options;
    const { cwd } = this.options;
    files = typeof files === 'string' ? [files] : files;
    dirs = typeof dirs === 'string' ? [dirs] : dirs;

    if (compiler.hooks) {
      compiler.hooks.afterCompile.tap('ext-after-compile', compilation => {
        process.stdout.cursorTo(0);console.log(app + 'ext-after-compile');
        const {
          fileDependencies,
          contextDependencies
        } = getFileAndContextDeps(compilation, files, dirs, cwd);
        if (files.length > 0) {
          fileDependencies.forEach(file => {
            compilation.fileDependencies.add(path.resolve(file));
          });
        }
        if (dirs.length > 0) {
          contextDependencies.forEach(context => {
            compilation.contextDependencies.add(context);
          });
        }
      });
    } else {
      compiler.plugin('after-compile', (compilation, cb) => {
        console.log(app + 'after-compile');
        const {
          fileDependencies,
          contextDependencies
        } = getFileAndContextDeps(compilation, files, dirs, cwd);
        if (files.length > 0) {
          compilation.fileDependencies = fileDependencies; // eslint-disable-line
        }
        if (dirs.length > 0) {
          compilation.contextDependencies = contextDependencies; // eslint-disable-line
        }
        cb();
      });
    }

    if (compiler.hooks) {
      var me = this;
      compiler.hooks.emit.tapAsync('ext-emit-async', function (compilation, cb) {
        process.stdout.cursorTo(0);console.log(app + 'ext-emit-async');

        var watchedFiles = [];
        try {
          watchedFiles = recursiveReadSync('./app');
        } catch (err) {
          if (err.errno === 34) {
            console.log('Path does not exist');
          } else {
            throw err;
          }
        }

        var doBuild = false;
        for (var file in watchedFiles) {
          if (me.lastMilliseconds < fs.statSync(watchedFiles[file]).mtimeMs) {
            if (watchedFiles[file].indexOf("scss") != -1) {
              doBuild = true;break;
            }
          }
        }
        me.lastMilliseconds = new Date().getTime();

        var currentNumFiles = watchedFiles.length;
        var filesource = 'this file enables client reload';
        compilation.assets[currentNumFiles + 'FilesUnderAppFolder.md'] = {
          source: function () {
            return filesource;
          },
          size: function () {
            return filesource.length;
          }
        };

        if (currentNumFiles != me.lastNumFiles || doBuild) {
          me.lastNumFiles = currentNumFiles;
          var buildAsync = require('@extjs/ext-build/app/buildAsync.js');
          var options = { parms: ['app', 'build', 'development'] };
          new buildAsync(options).executeAsync().then(function () {
            cb();
          });

          // var build = require('@extjs/ext-build/app/build.js')
          // new build({})
          //var refresh = require('@extjs/ext-build/app/refresh.js')
          //new refresh({})
        } else {
          me.lastNumFiles = currentNumFiles;
          console.log(app + 'call to ext-build not needed, no new files');
          cb();
        }
      });

      //      compiler.hooks.emit.tap('ext-emit', (compilation) => {
      //        process.stdout.cursorTo(0);console.log(app + 'ext-emit')

      //   var watchedFiles=[]
      //   try {watchedFiles = recursiveReadSync('./app')} 
      //   catch(err) {if(err.errno === 34){console.log('Path does not exist');} else {throw err;}}

      //   var doBuild = false
      //   for (var file in watchedFiles) {
      //     if (this.lastMilliseconds < fs.statSync(watchedFiles[file]).mtimeMs) {
      //       if (watchedFiles[file].indexOf("scss") != -1) {doBuild=true;break;}
      //     }
      //   }
      //   this.lastMilliseconds = (new Date).getTime()

      //   var currentNumFiles = watchedFiles.length
      //   var filesource = 'this file enables client reload'
      //   compilation.assets[currentNumFiles + 'FilesUnderAppFolder.md'] = {
      //     source: function() {return filesource},
      //     size: function() {return filesource.length}
      //   }

      //   if (currentNumFiles != this.lastNumFiles || doBuild) {
      //     var build = require('@extjs/ext-build/app/build.js')
      //     new build({})
      //     //var refresh = require('@extjs/sencha-build/app/refresh.js')
      //     //new refresh({})
      //   }
      //   else {
      //     console.log(app + 'Call to Sencha Build not needed, no new files')
      //   }
      //   this.lastNumFiles = currentNumFiles

      //      })
    } else {
      compiler.plugin('emit', (compilation, cb) => {
        console.log(app + 'emit');
        var filelist = 'this file enables client reload';
        compilation.assets['ForReload.md'] = {
          source: function () {
            return filelist;
          },
          size: function () {
            return filelist.length;
          }
        };
        var refresh = require('@extjs/ext-build/app/refresh.js');
        new refresh({});

        // console.log('THIS IS IT')
        // var buildAsync = require('@extjs/ext-build/app/buildAsync.js')
        // console.log(buildAsync)
        // new buildAsync().executeAsync().then(function() {
        //   console.log('then call');
        //   cb();
        // })


        //cb()
        //this.emitStats.bind(this)

      });
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

module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9pbmRleC5qcyJdLCJuYW1lcyI6WyJjaGFsayIsInJlcXVpcmUiLCJwYXRoIiwiZnMiLCJ2YWxpZGF0ZU9wdGlvbnMiLCJ1bmlxIiwiaXNHbG9iIiwicmVjdXJzaXZlUmVhZFN5bmMiLCJhcHAiLCJncmVlbiIsImdldEZpbGVBbmRDb250ZXh0RGVwcyIsImNvbXBpbGF0aW9uIiwiZmlsZXMiLCJkaXJzIiwiY3dkIiwiZmlsZURlcGVuZGVuY2llcyIsImNvbnRleHREZXBlbmRlbmNpZXMiLCJpc1dlYnBhY2s0IiwiaG9va3MiLCJmZHMiLCJjZHMiLCJsZW5ndGgiLCJjb25jYXQiLCJFeHRXZWJwYWNrUGx1Z2luIiwiY29uc3RydWN0b3IiLCJvcHRpb25zIiwiZGVmYXVsdHMiLCJwcm9jZXNzIiwiYXBwbHkiLCJjb21waWxlciIsIndlYnBhY2tWZXJzaW9uIiwidW5kZWZpbmVkIiwicGx1Z2luUGF0aCIsInJlc29sdmUiLCJfX2Rpcm5hbWUiLCJwbHVnaW5Qa2ciLCJleGlzdHNTeW5jIiwiSlNPTiIsInBhcnNlIiwicmVhZEZpbGVTeW5jIiwicGx1Z2luVmVyc2lvbiIsInZlcnNpb24iLCJleHRQYXRoIiwiZXh0UGtnIiwiZXh0VmVyc2lvbiIsInNlbmNoYSIsImNtZFBhdGgiLCJjbWRQa2ciLCJjbWRWZXJzaW9uIiwidmVyc2lvbl9mdWxsIiwic3Rkb3V0IiwiY3Vyc29yVG8iLCJjb25zb2xlIiwibG9nIiwiYWZ0ZXJDb21waWxlIiwidGFwIiwiZm9yRWFjaCIsImZpbGUiLCJhZGQiLCJjb250ZXh0IiwicGx1Z2luIiwiY2IiLCJtZSIsImVtaXQiLCJ0YXBBc3luYyIsIndhdGNoZWRGaWxlcyIsImVyciIsImVycm5vIiwiZG9CdWlsZCIsImxhc3RNaWxsaXNlY29uZHMiLCJzdGF0U3luYyIsIm10aW1lTXMiLCJpbmRleE9mIiwiRGF0ZSIsImdldFRpbWUiLCJjdXJyZW50TnVtRmlsZXMiLCJmaWxlc291cmNlIiwiYXNzZXRzIiwic291cmNlIiwic2l6ZSIsImxhc3ROdW1GaWxlcyIsImJ1aWxkQXN5bmMiLCJwYXJtcyIsImV4ZWN1dGVBc3luYyIsInRoZW4iLCJmaWxlbGlzdCIsInJlZnJlc2giXSwibWFwcGluZ3MiOiI7O0FBQUEsTUFBTUEsUUFBUUMsUUFBUSxPQUFSLENBQWQ7QUFDQSxNQUFNQyxPQUFPRCxRQUFRLE1BQVIsQ0FBYjtBQUNBLE1BQU1FLEtBQUtGLFFBQVEsSUFBUixDQUFYO0FBQ0EsTUFBTUcsa0JBQWtCSCxRQUFRLGNBQVIsQ0FBeEI7QUFDQSxNQUFNSSxPQUFPSixRQUFRLGFBQVIsQ0FBYjtBQUNBLE1BQU1LLFNBQVNMLFFBQVEsU0FBUixDQUFmO0FBQ0E7QUFDQSxNQUFNTSxvQkFBb0JOLFFBQVEsd0JBQVIsQ0FBMUI7O0FBSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBR0EsTUFBTU8sTUFBTyxHQUFFUixNQUFNUyxLQUFOLENBQVksVUFBWixDQUF3Qix1QkFBdkM7O0FBRUEsU0FBU0MscUJBQVQsQ0FBK0JDLFdBQS9CLEVBQTRDQyxLQUE1QyxFQUFtREMsSUFBbkQsRUFBeURDLEdBQXpELEVBQThEO0FBQzVELFFBQU0sRUFBRUMsZ0JBQUYsRUFBb0JDLG1CQUFwQixLQUE0Q0wsV0FBbEQ7QUFDQSxRQUFNTSxhQUFhTixZQUFZTyxLQUEvQjtBQUNBLE1BQUlDLE1BQU1GLGFBQWEsQ0FBQyxHQUFHRixnQkFBSixDQUFiLEdBQXFDQSxnQkFBL0M7QUFDQSxNQUFJSyxNQUFNSCxhQUFhLENBQUMsR0FBR0QsbUJBQUosQ0FBYixHQUF3Q0EsbUJBQWxEO0FBQ0EsTUFBSUgsS0FBS1EsTUFBTCxHQUFjLENBQWxCLEVBQXFCO0FBQ25CRCxVQUFNZixLQUFLZSxJQUFJRSxNQUFKLENBQVdULElBQVgsQ0FBTCxDQUFOO0FBQ0Q7QUFDRCxTQUFPO0FBQ0xFLHNCQUFrQkksR0FEYjtBQUVMSCx5QkFBcUJJO0FBRmhCLEdBQVA7QUFJRDs7QUFFRCxlQUFlLE1BQU1HLGdCQUFOLENBQXVCO0FBQ3BDO0FBQ0E7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QTs7O0FBR0E7QUFDQTs7QUFJRCxPQXhCRDtBQXlCRDtBQUVGOztBQUdEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOzs7QUFoUG9DOztBQTJQcEM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBR0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSTtBQUNBO0FBQ0E7O0FBRUo7OztBQU1ROztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImluZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgY2hhbGsgPSByZXF1aXJlKCdjaGFsaycpXG5jb25zdCBwYXRoID0gcmVxdWlyZSgncGF0aCcpXG5jb25zdCBmcyA9IHJlcXVpcmUoJ2ZzJylcbmNvbnN0IHZhbGlkYXRlT3B0aW9ucyA9IHJlcXVpcmUoJ3NjaGVtYS11dGlscycpXG5jb25zdCB1bmlxID0gcmVxdWlyZSgnbG9kYXNoLnVuaXEnKVxuY29uc3QgaXNHbG9iID0gcmVxdWlyZSgnaXMtZ2xvYicpXG4vL2NvbnN0IHJlc29sdmUgPSByZXF1aXJlKCdwYXRoJylcbmNvbnN0IHJlY3Vyc2l2ZVJlYWRTeW5jID0gcmVxdWlyZSgncmVjdXJzaXZlLXJlYWRkaXItc3luYycpXG5cblxuXG4vLyBpbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuLy8gaW1wb3J0IHBhdGggZnJvbSAncGF0aCdcbi8vIGltcG9ydCBmcyBmcm9tICdmcyc7XG4vLyBpbXBvcnQgdmFsaWRhdGVPcHRpb25zIGZyb20gJ3NjaGVtYS11dGlscyc7XG4vLyBpbXBvcnQgdW5pcSBmcm9tICdsb2Rhc2gudW5pcSc7XG4vLyBpbXBvcnQgaXNHbG9iIGZyb20gJ2lzLWdsb2InO1xuLy8gaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnO1xuLy8gaW1wb3J0IHJlY3Vyc2l2ZVJlYWRTeW5jIGZyb20gJ3JlY3Vyc2l2ZS1yZWFkZGlyLXN5bmMnO1xuXG5cbmNvbnN0IGFwcCA9IGAke2NoYWxrLmdyZWVuKCfihLkg772iZXh0772jOicpfSBleHQtd2VicGFjay1wbHVnaW46IGA7XG5cbmZ1bmN0aW9uIGdldEZpbGVBbmRDb250ZXh0RGVwcyhjb21waWxhdGlvbiwgZmlsZXMsIGRpcnMsIGN3ZCkge1xuICBjb25zdCB7IGZpbGVEZXBlbmRlbmNpZXMsIGNvbnRleHREZXBlbmRlbmNpZXMgfSA9IGNvbXBpbGF0aW9uO1xuICBjb25zdCBpc1dlYnBhY2s0ID0gY29tcGlsYXRpb24uaG9va3M7XG4gIGxldCBmZHMgPSBpc1dlYnBhY2s0ID8gWy4uLmZpbGVEZXBlbmRlbmNpZXNdIDogZmlsZURlcGVuZGVuY2llcztcbiAgbGV0IGNkcyA9IGlzV2VicGFjazQgPyBbLi4uY29udGV4dERlcGVuZGVuY2llc10gOiBjb250ZXh0RGVwZW5kZW5jaWVzO1xuICBpZiAoZGlycy5sZW5ndGggPiAwKSB7XG4gICAgY2RzID0gdW5pcShjZHMuY29uY2F0KGRpcnMpKTtcbiAgfVxuICByZXR1cm4ge1xuICAgIGZpbGVEZXBlbmRlbmNpZXM6IGZkcyxcbiAgICBjb250ZXh0RGVwZW5kZW5jaWVzOiBjZHMsXG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEV4dFdlYnBhY2tQbHVnaW4ge1xuICAvLyBzdGF0aWMgZGVmYXVsdHMgPSB7XG4gIC8vICAgY3dkOiBwcm9jZXNzLmN3ZCgpLFxuICAvLyAgIGZpbGVzOiBbXSxcbiAgLy8gICBkaXJzOiBbJy4vYXBwJ10sXG4gIC8vIH07XG5cbiAgY29uc3RydWN0b3Iob3B0aW9ucyA9IHt9KSB7XG4gICAgdmFsaWRhdGVPcHRpb25zKHJlcXVpcmUoJy4uL29wdGlvbnMuanNvbicpLCBvcHRpb25zLCAnRXh0cmFXYXRjaFdlYnBhY2tQbHVnaW4nKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZVxuICAgIHRoaXMub3B0aW9ucyA9IHsgLi4uRXh0V2VicGFja1BsdWdpbi5kZWZhdWx0cywgLi4ub3B0aW9ucyB9O1xuXG4gICAgdmFyIGRlZmF1bHRzID0ge1xuICAgICAgY3dkOiBwcm9jZXNzLmN3ZCgpLFxuICAgICAgZmlsZXM6IFtdLFxuICAgICAgZGlyczogWycuL2FwcCddLFxuICAgIH1cblxuLy8gICAgdGhpcy5vcHRpb25zID0geyAuLi5kZWZhdWx0cywgLi4ub3B0aW9ucyB9O1xuXG5cblxuICB9XG5cbiAgYXBwbHkoY29tcGlsZXIpIHtcblxuICAgIGlmICh0aGlzLndlYnBhY2tWZXJzaW9uID09IHVuZGVmaW5lZCkge1xuICAgICAgdmFyIHBsdWdpblBhdGggPSBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCcuLicpXG4gICAgICB2YXIgcGx1Z2luUGtnID0gKGZzLmV4aXN0c1N5bmMocGx1Z2luUGF0aCsnL3BhY2thZ2UuanNvbicpICYmIEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKHBsdWdpblBhdGgrJy9wYWNrYWdlLmpzb24nLCAndXRmLTgnKSkgfHwge30pO1xuICAgICAgdmFyIHBsdWdpblZlcnNpb24gPSBwbHVnaW5Qa2cudmVyc2lvblxuICBcbiAgICAgIHZhciBleHRQYXRoID0gcGF0aC5yZXNvbHZlKHBsdWdpblBhdGgsJy4uL2V4dCcpXG4gICAgICB2YXIgZXh0UGtnID0gKGZzLmV4aXN0c1N5bmMoZXh0UGF0aCsnL3BhY2thZ2UuanNvbicpICYmIEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKGV4dFBhdGgrJy9wYWNrYWdlLmpzb24nLCAndXRmLTgnKSkgfHwge30pO1xuICAgICAgdmFyIGV4dFZlcnNpb24gPSBleHRQa2cuc2VuY2hhLnZlcnNpb25cblxuICAgICAgdmFyIGNtZFBhdGggPSBwYXRoLnJlc29sdmUocGx1Z2luUGF0aCwnLi4vc2VuY2hhLWNtZCcpXG4gICAgICB2YXIgY21kUGtnID0gKGZzLmV4aXN0c1N5bmMoY21kUGF0aCsnL3BhY2thZ2UuanNvbicpICYmIEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKGNtZFBhdGgrJy9wYWNrYWdlLmpzb24nLCAndXRmLTgnKSkgfHwge30pO1xuICAgICAgdmFyIGNtZFZlcnNpb24gPSBjbWRQa2cudmVyc2lvbl9mdWxsXG5cbiAgICAgIGNvbnN0IGlzV2VicGFjazQgPSBjb21waWxlci5ob29rcztcbiAgICAgIGlmIChpc1dlYnBhY2s0KSB7dGhpcy53ZWJwYWNrVmVyc2lvbiA9ICdJUyB3ZWJwYWNrIDQnfVxuICAgICAgZWxzZSB7dGhpcy53ZWJwYWNrVmVyc2lvbiA9ICdOT1Qgd2VicGFjayA0J31cbiAgICAgIHByb2Nlc3Muc3Rkb3V0LmN1cnNvclRvKDApO2NvbnNvbGUubG9nKGFwcCArICd2JyArIHBsdWdpblZlcnNpb24gKyAnLCBFeHQgSlMgdicgKyBleHRWZXJzaW9uICsgJywgU2VuY2hhIENtZCB2JyArIGNtZFZlcnNpb24gKyAnLCAnICsgdGhpcy53ZWJwYWNrVmVyc2lvbilcbiAgICB9XG5cbiAgICBsZXQgeyBmaWxlcywgZGlycyB9ID0gdGhpcy5vcHRpb25zO1xuICAgIGNvbnN0IHsgY3dkIH0gPSB0aGlzLm9wdGlvbnM7XG4gICAgZmlsZXMgPSB0eXBlb2YgZmlsZXMgPT09ICdzdHJpbmcnID8gW2ZpbGVzXSA6IGZpbGVzO1xuICAgIGRpcnMgPSB0eXBlb2YgZGlycyA9PT0gJ3N0cmluZycgPyBbZGlyc10gOiBkaXJzO1xuXG4gICAgaWYgKGNvbXBpbGVyLmhvb2tzKSB7XG4gICAgICBjb21waWxlci5ob29rcy5hZnRlckNvbXBpbGUudGFwKCdleHQtYWZ0ZXItY29tcGlsZScsIChjb21waWxhdGlvbikgPT4ge1xuICAgICAgICBwcm9jZXNzLnN0ZG91dC5jdXJzb3JUbygwKTtjb25zb2xlLmxvZyhhcHAgKyAnZXh0LWFmdGVyLWNvbXBpbGUnKVxuICAgICAgICBjb25zdCB7XG4gICAgICAgICAgZmlsZURlcGVuZGVuY2llcyxcbiAgICAgICAgICBjb250ZXh0RGVwZW5kZW5jaWVzLFxuICAgICAgICB9ID0gZ2V0RmlsZUFuZENvbnRleHREZXBzKGNvbXBpbGF0aW9uLCBmaWxlcywgZGlycywgY3dkKTtcbiAgICAgICAgaWYgKGZpbGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBmaWxlRGVwZW5kZW5jaWVzLmZvckVhY2goKGZpbGUpID0+IHtcbiAgICAgICAgICAgIGNvbXBpbGF0aW9uLmZpbGVEZXBlbmRlbmNpZXMuYWRkKHBhdGgucmVzb2x2ZShmaWxlKSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRpcnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGNvbnRleHREZXBlbmRlbmNpZXMuZm9yRWFjaCgoY29udGV4dCkgPT4ge1xuICAgICAgICAgICAgY29tcGlsYXRpb24uY29udGV4dERlcGVuZGVuY2llcy5hZGQoY29udGV4dCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb21waWxlci5wbHVnaW4oJ2FmdGVyLWNvbXBpbGUnLCAoY29tcGlsYXRpb24sIGNiKSA9PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKGFwcCArICdhZnRlci1jb21waWxlJylcbiAgICAgICAgY29uc3Qge1xuICAgICAgICAgIGZpbGVEZXBlbmRlbmNpZXMsXG4gICAgICAgICAgY29udGV4dERlcGVuZGVuY2llcyxcbiAgICAgICAgfSA9IGdldEZpbGVBbmRDb250ZXh0RGVwcyhjb21waWxhdGlvbiwgZmlsZXMsIGRpcnMsIGN3ZCk7XG4gICAgICAgIGlmIChmaWxlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgY29tcGlsYXRpb24uZmlsZURlcGVuZGVuY2llcyA9IGZpbGVEZXBlbmRlbmNpZXM7IC8vIGVzbGludC1kaXNhYmxlLWxpbmVcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGlycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgY29tcGlsYXRpb24uY29udGV4dERlcGVuZGVuY2llcyA9IGNvbnRleHREZXBlbmRlbmNpZXM7IC8vIGVzbGludC1kaXNhYmxlLWxpbmVcbiAgICAgICAgfVxuICAgICAgICBjYigpXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAoY29tcGlsZXIuaG9va3MpIHtcbiAgICAgIHZhciBtZSA9IHRoaXNcbiAgICAgIGNvbXBpbGVyLmhvb2tzLmVtaXQudGFwQXN5bmMoJ2V4dC1lbWl0LWFzeW5jJywgZnVuY3Rpb24gKGNvbXBpbGF0aW9uLCBjYikge1xuICAgICAgICBwcm9jZXNzLnN0ZG91dC5jdXJzb3JUbygwKTtjb25zb2xlLmxvZyhhcHAgKyAnZXh0LWVtaXQtYXN5bmMnKVxuXG4gICAgICAgIHZhciB3YXRjaGVkRmlsZXM9W11cbiAgICAgICAgdHJ5IHt3YXRjaGVkRmlsZXMgPSByZWN1cnNpdmVSZWFkU3luYygnLi9hcHAnKX0gXG4gICAgICAgIGNhdGNoKGVycikge2lmKGVyci5lcnJubyA9PT0gMzQpe2NvbnNvbGUubG9nKCdQYXRoIGRvZXMgbm90IGV4aXN0Jyk7fSBlbHNlIHt0aHJvdyBlcnI7fX1cblxuICAgICAgICB2YXIgZG9CdWlsZCA9IGZhbHNlXG4gICAgICAgIGZvciAodmFyIGZpbGUgaW4gd2F0Y2hlZEZpbGVzKSB7XG4gICAgICAgICAgaWYgKG1lLmxhc3RNaWxsaXNlY29uZHMgPCBmcy5zdGF0U3luYyh3YXRjaGVkRmlsZXNbZmlsZV0pLm10aW1lTXMpIHtcbiAgICAgICAgICAgIGlmICh3YXRjaGVkRmlsZXNbZmlsZV0uaW5kZXhPZihcInNjc3NcIikgIT0gLTEpIHtkb0J1aWxkPXRydWU7YnJlYWs7fVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBtZS5sYXN0TWlsbGlzZWNvbmRzID0gKG5ldyBEYXRlKS5nZXRUaW1lKClcblxuICAgICAgICB2YXIgY3VycmVudE51bUZpbGVzID0gd2F0Y2hlZEZpbGVzLmxlbmd0aFxuICAgICAgICB2YXIgZmlsZXNvdXJjZSA9ICd0aGlzIGZpbGUgZW5hYmxlcyBjbGllbnQgcmVsb2FkJ1xuICAgICAgICBjb21waWxhdGlvbi5hc3NldHNbY3VycmVudE51bUZpbGVzICsgJ0ZpbGVzVW5kZXJBcHBGb2xkZXIubWQnXSA9IHtcbiAgICAgICAgICBzb3VyY2U6IGZ1bmN0aW9uKCkge3JldHVybiBmaWxlc291cmNlfSxcbiAgICAgICAgICBzaXplOiBmdW5jdGlvbigpIHtyZXR1cm4gZmlsZXNvdXJjZS5sZW5ndGh9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY3VycmVudE51bUZpbGVzICE9IG1lLmxhc3ROdW1GaWxlcyB8fCBkb0J1aWxkKSB7XG4gICAgICAgICAgbWUubGFzdE51bUZpbGVzID0gY3VycmVudE51bUZpbGVzXG4gICAgICAgICAgdmFyIGJ1aWxkQXN5bmMgPSByZXF1aXJlKCdAZXh0anMvZXh0LWJ1aWxkL2FwcC9idWlsZEFzeW5jLmpzJylcbiAgICAgICAgICB2YXIgb3B0aW9ucyA9IHtwYXJtczogWydhcHAnLCdidWlsZCcsJ2RldmVsb3BtZW50J119XG4gICAgICAgICAgbmV3IGJ1aWxkQXN5bmMob3B0aW9ucykuZXhlY3V0ZUFzeW5jKCkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNiKClcbiAgICAgICAgICB9KVxuICAgICAgICAgIFxuICAgICAgICAgIC8vIHZhciBidWlsZCA9IHJlcXVpcmUoJ0BleHRqcy9leHQtYnVpbGQvYXBwL2J1aWxkLmpzJylcbiAgICAgICAgICAvLyBuZXcgYnVpbGQoe30pXG4gICAgICAgICAgLy92YXIgcmVmcmVzaCA9IHJlcXVpcmUoJ0BleHRqcy9leHQtYnVpbGQvYXBwL3JlZnJlc2guanMnKVxuICAgICAgICAgIC8vbmV3IHJlZnJlc2goe30pXG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgbWUubGFzdE51bUZpbGVzID0gY3VycmVudE51bUZpbGVzXG4gICAgICAgICAgY29uc29sZS5sb2coYXBwICsgJ2NhbGwgdG8gZXh0LWJ1aWxkIG5vdCBuZWVkZWQsIG5vIG5ldyBmaWxlcycpXG4gICAgICAgICAgY2IoKVxuICAgICAgICB9XG4gICAgICB9KVxuXG5cbi8vICAgICAgY29tcGlsZXIuaG9va3MuZW1pdC50YXAoJ2V4dC1lbWl0JywgKGNvbXBpbGF0aW9uKSA9PiB7XG4vLyAgICAgICAgcHJvY2Vzcy5zdGRvdXQuY3Vyc29yVG8oMCk7Y29uc29sZS5sb2coYXBwICsgJ2V4dC1lbWl0JylcblxuICAgICAgLy8gICB2YXIgd2F0Y2hlZEZpbGVzPVtdXG4gICAgICAvLyAgIHRyeSB7d2F0Y2hlZEZpbGVzID0gcmVjdXJzaXZlUmVhZFN5bmMoJy4vYXBwJyl9IFxuICAgICAgLy8gICBjYXRjaChlcnIpIHtpZihlcnIuZXJybm8gPT09IDM0KXtjb25zb2xlLmxvZygnUGF0aCBkb2VzIG5vdCBleGlzdCcpO30gZWxzZSB7dGhyb3cgZXJyO319XG5cbiAgICAgIC8vICAgdmFyIGRvQnVpbGQgPSBmYWxzZVxuICAgICAgLy8gICBmb3IgKHZhciBmaWxlIGluIHdhdGNoZWRGaWxlcykge1xuICAgICAgLy8gICAgIGlmICh0aGlzLmxhc3RNaWxsaXNlY29uZHMgPCBmcy5zdGF0U3luYyh3YXRjaGVkRmlsZXNbZmlsZV0pLm10aW1lTXMpIHtcbiAgICAgIC8vICAgICAgIGlmICh3YXRjaGVkRmlsZXNbZmlsZV0uaW5kZXhPZihcInNjc3NcIikgIT0gLTEpIHtkb0J1aWxkPXRydWU7YnJlYWs7fVxuICAgICAgLy8gICAgIH1cbiAgICAgIC8vICAgfVxuICAgICAgLy8gICB0aGlzLmxhc3RNaWxsaXNlY29uZHMgPSAobmV3IERhdGUpLmdldFRpbWUoKVxuXG4gICAgICAvLyAgIHZhciBjdXJyZW50TnVtRmlsZXMgPSB3YXRjaGVkRmlsZXMubGVuZ3RoXG4gICAgICAvLyAgIHZhciBmaWxlc291cmNlID0gJ3RoaXMgZmlsZSBlbmFibGVzIGNsaWVudCByZWxvYWQnXG4gICAgICAvLyAgIGNvbXBpbGF0aW9uLmFzc2V0c1tjdXJyZW50TnVtRmlsZXMgKyAnRmlsZXNVbmRlckFwcEZvbGRlci5tZCddID0ge1xuICAgICAgLy8gICAgIHNvdXJjZTogZnVuY3Rpb24oKSB7cmV0dXJuIGZpbGVzb3VyY2V9LFxuICAgICAgLy8gICAgIHNpemU6IGZ1bmN0aW9uKCkge3JldHVybiBmaWxlc291cmNlLmxlbmd0aH1cbiAgICAgIC8vICAgfVxuXG4gICAgICAvLyAgIGlmIChjdXJyZW50TnVtRmlsZXMgIT0gdGhpcy5sYXN0TnVtRmlsZXMgfHwgZG9CdWlsZCkge1xuICAgICAgLy8gICAgIHZhciBidWlsZCA9IHJlcXVpcmUoJ0BleHRqcy9leHQtYnVpbGQvYXBwL2J1aWxkLmpzJylcbiAgICAgIC8vICAgICBuZXcgYnVpbGQoe30pXG4gICAgICAvLyAgICAgLy92YXIgcmVmcmVzaCA9IHJlcXVpcmUoJ0BleHRqcy9zZW5jaGEtYnVpbGQvYXBwL3JlZnJlc2guanMnKVxuICAgICAgLy8gICAgIC8vbmV3IHJlZnJlc2goe30pXG4gICAgICAvLyAgIH1cbiAgICAgIC8vICAgZWxzZSB7XG4gICAgICAvLyAgICAgY29uc29sZS5sb2coYXBwICsgJ0NhbGwgdG8gU2VuY2hhIEJ1aWxkIG5vdCBuZWVkZWQsIG5vIG5ldyBmaWxlcycpXG4gICAgICAvLyAgIH1cbiAgICAgIC8vICAgdGhpcy5sYXN0TnVtRmlsZXMgPSBjdXJyZW50TnVtRmlsZXNcblxuLy8gICAgICB9KVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGNvbXBpbGVyLnBsdWdpbignZW1pdCcsIChjb21waWxhdGlvbiwgY2IpID0+IHtcbiAgICAgICAgY29uc29sZS5sb2coYXBwICsgJ2VtaXQnKVxuICAgICAgICB2YXIgZmlsZWxpc3QgPSAndGhpcyBmaWxlIGVuYWJsZXMgY2xpZW50IHJlbG9hZCdcbiAgICAgICAgY29tcGlsYXRpb24uYXNzZXRzWydGb3JSZWxvYWQubWQnXSA9IHtcbiAgICAgICAgICBzb3VyY2U6IGZ1bmN0aW9uKCkge3JldHVybiBmaWxlbGlzdH0sXG4gICAgICAgICAgc2l6ZTogZnVuY3Rpb24oKSB7cmV0dXJuIGZpbGVsaXN0Lmxlbmd0aH1cbiAgICAgICAgfVxuICAgICAgICB2YXIgcmVmcmVzaCA9IHJlcXVpcmUoJ0BleHRqcy9leHQtYnVpbGQvYXBwL3JlZnJlc2guanMnKVxuICAgICAgICBuZXcgcmVmcmVzaCh7fSlcblxuICAgICAgICAvLyBjb25zb2xlLmxvZygnVEhJUyBJUyBJVCcpXG4gICAgICAgIC8vIHZhciBidWlsZEFzeW5jID0gcmVxdWlyZSgnQGV4dGpzL2V4dC1idWlsZC9hcHAvYnVpbGRBc3luYy5qcycpXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGJ1aWxkQXN5bmMpXG4gICAgICAgIC8vIG5ldyBidWlsZEFzeW5jKCkuZXhlY3V0ZUFzeW5jKCkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gICBjb25zb2xlLmxvZygndGhlbiBjYWxsJyk7XG4gICAgICAgIC8vICAgY2IoKTtcbiAgICAgICAgLy8gfSlcblxuXG4gICAgICAgIC8vY2IoKVxuICAgICAgICAvL3RoaXMuZW1pdFN0YXRzLmJpbmQodGhpcylcblxuXG5cbiAgICAgIH0pXG4gICAgfVxuXG4gIH1cblxuXG4gIC8vIGVtaXRTdGF0cyhjdXJDb21waWxlciwgY2FsbGJhY2spIHtcbiAgLy8gICAvLyBHZXQgc3RhdHMuXG4gIC8vICAgLy8gKipOb3RlKio6IEluIGZ1dHVyZSwgY291bGQgcGFzcyBzb21ldGhpbmcgbGlrZSBgeyBzaG93QXNzZXRzOiB0cnVlIH1gXG4gIC8vICAgLy8gdG8gdGhlIGBnZXRTdGF0cygpYCBmdW5jdGlvbiBmb3IgbW9yZSBsaW1pdGVkIG9iamVjdCByZXR1cm5lZC5cbiAgLy8gICBsZXQgc3RhdHMgPSBjdXJDb21waWxlci5nZXRTdGF0cygpLnRvSnNvbigpO1xuICBcbiAgLy8gICAvLyBGaWx0ZXIgdG8gZmllbGRzLlxuICAvLyAgIGlmICh0aGlzLm9wdHMuZmllbGRzKSB7XG4gIC8vICAgICBzdGF0cyA9IHRoaXMub3B0cy5maWVsZHMucmVkdWNlKChtZW1vLCBrZXkpID0+IHtcbiAgLy8gICAgICAgbWVtb1trZXldID0gc3RhdHNba2V5XTtcbiAgLy8gICAgICAgcmV0dXJuIG1lbW87XG4gIC8vICAgICB9LCB7fSk7XG4gIC8vICAgfVxuICBcbiAgLy8gICAvLyBUcmFuc2Zvcm0gdG8gc3RyaW5nLlxuICAvLyAgIGxldCBlcnI7XG4gIC8vICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpXG4gIFxuICAvLyAgICAgLy8gVHJhbnNmb3JtLlxuICAvLyAgICAgLnRoZW4oKCkgPT4gdGhpcy5vcHRzLnRyYW5zZm9ybShzdGF0cywge1xuICAvLyAgICAgICBjb21waWxlcjogY3VyQ29tcGlsZXJcbiAgLy8gICAgIH0pKVxuICAvLyAgICAgLmNhdGNoKChlKSA9PiB7IGVyciA9IGU7IH0pXG4gIFxuICAvLyAgICAgLy8gRmluaXNoIHVwLlxuICAvLyAgICAgLnRoZW4oKHN0YXRzU3RyKSA9PiB7XG4gIC8vICAgICAgIC8vIEhhbmRsZSBlcnJvcnMuXG4gIC8vICAgICAgIGlmIChlcnIpIHtcbiAgLy8gICAgICAgICBjdXJDb21waWxlci5lcnJvcnMucHVzaChlcnIpO1xuICAvLyAgICAgICAgIGlmIChjYWxsYmFjaykgeyByZXR1cm4gdm9pZCBjYWxsYmFjayhlcnIpOyB9XG4gIC8vICAgICAgICAgdGhyb3cgZXJyO1xuICAvLyAgICAgICB9XG4gIFxuICAvLyAgICAgICAvLyBBZGQgdG8gYXNzZXRzLlxuICAvLyAgICAgICBjdXJDb21waWxlci5hc3NldHNbdGhpcy5vcHRzLmZpbGVuYW1lXSA9IHtcbiAgLy8gICAgICAgICBzb3VyY2UoKSB7XG4gIC8vICAgICAgICAgICByZXR1cm4gc3RhdHNTdHI7XG4gIC8vICAgICAgICAgfSxcbiAgLy8gICAgICAgICBzaXplKCkge1xuICAvLyAgICAgICAgICAgcmV0dXJuIHN0YXRzU3RyLmxlbmd0aDtcbiAgLy8gICAgICAgICB9XG4gIC8vICAgICAgIH07XG4gIFxuICAvLyAgICAgICBpZiAoY2FsbGJhY2spIHsgcmV0dXJuIHZvaWQgY2FsbGJhY2soKTsgfVxuICAvLyAgICAgfSk7XG4gIC8vIH1cbiAgXG5cblxufVxuXG5cblxuXG5cblxuICAvLyBpZiAoZmlsZXMubGVuZ3RoID4gMCkge1xuICAvLyAgIGZpbGVzLmZvckVhY2goKHBhdHRlcm4pID0+IHtcbiAgLy8gICAgIGxldCBmID0gcGF0dGVybjtcbiAgLy8gICAgIGlmIChpc0dsb2IocGF0dGVybikpIHtcbiAgLy8gICAgICAgZiA9IGdsb2Iuc3luYyhwYXR0ZXJuLCB7XG4gIC8vICAgICAgICAgY3dkLFxuICAvLyAgICAgICAgIGRvdDogdHJ1ZSxcbiAgLy8gICAgICAgICBhYnNvbHV0ZTogdHJ1ZSxcbiAgLy8gICAgICAgfSk7XG4gIC8vICAgICB9XG4gIC8vICAgICBmZHMgPSBmZHMuY29uY2F0KGYpO1xuICAvLyAgIH0pO1xuICAvLyAgIGZkcyA9IHVuaXEoZmRzKTtcbiAgLy8gfVxuXG5cbi8vIGZ1bmN0aW9uIGhvb2tfc3Rkb3V0KGNhbGxiYWNrKSB7XG4vLyAgIHZhciBvbGRfd3JpdGUgPSBwcm9jZXNzLnN0ZG91dC53cml0ZVxuLy8gICBjb25zb2xlLmxvZygnaW4gaG9vaycpXG4vLyAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlID0gKGZ1bmN0aW9uKHdyaXRlKSB7XG4vLyAgICAgICByZXR1cm4gZnVuY3Rpb24oc3RyaW5nLCBlbmNvZGluZywgZmQpIHtcbi8vICAgICAgICAgICB3cml0ZS5hcHBseShwcm9jZXNzLnN0ZG91dCwgYXJndW1lbnRzKVxuLy8gICAgICAgICAgIGNhbGxiYWNrKHN0cmluZywgZW5jb2RpbmcsIGZkKVxuLy8gICAgICAgfVxuLy8gICB9KShwcm9jZXNzLnN0ZG91dC53cml0ZSlcblxuLy8gICByZXR1cm4gZnVuY3Rpb24oKSB7XG4vLyAgICAgICBwcm9jZXNzLnN0ZG91dC53cml0ZSA9IG9sZF93cml0ZVxuLy8gICAgICAgY29uc29sZS5sb2coJ2luIHVuaG9vaycpXG4vLyAgICAgfVxuLy8gfVxuICAgIC8vIHRoaXMudW5ob29rID0gaG9va19zdGRvdXQoZnVuY3Rpb24oc3RyaW5nLCBlbmNvZGluZywgZmQpIHtcbiAgICAvLyAgIGNvbnNvbGUubG9nKCdzdGRvdXQ6ICcgKyBzdHJpbmcpXG4gICAgLy8gfSlcblxuLy8gICAgICAgIHRoaXMudW5ob29rKClcblxuXG5cblxuXG4gICAgICAgIC8vIHZhciBmaWxlbGlzdCA9ICdJbiB0aGlzIGJ1aWxkOlxcblxcbic7XG5cbiAgICAgICAgLy8gLy8gTG9vcCB0aHJvdWdoIGFsbCBjb21waWxlZCBhc3NldHMsXG4gICAgICAgIC8vIC8vIGFkZGluZyBhIG5ldyBsaW5lIGl0ZW0gZm9yIGVhY2ggZmlsZW5hbWUuXG4gICAgICAgIC8vIGZvciAodmFyIGZpbGVuYW1lIGluIGNvbXBpbGF0aW9uLmFzc2V0cykge1xuICAgICAgICAvLyAgIGZpbGVsaXN0ICs9ICgnLSAnKyBmaWxlbmFtZSArJ1xcbicpO1xuICAgICAgICAvLyB9XG4gICAgXG4gICAgICAgIC8vIC8vIEluc2VydCB0aGlzIGxpc3QgaW50byB0aGUgd2VicGFjayBidWlsZCBhcyBhIG5ldyBmaWxlIGFzc2V0OlxuICAgICAgICAvLyBjb21waWxhdGlvbi5hc3NldHNbJ2ZpbGVsaXN0Lm1kJ10gPSB7XG4gICAgICAgIC8vICAgc291cmNlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gICAgIHJldHVybiBmaWxlbGlzdDtcbiAgICAgICAgLy8gICB9LFxuICAgICAgICAvLyAgIHNpemU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyAgICAgcmV0dXJuIGZpbGVsaXN0Lmxlbmd0aDtcbiAgICAgICAgLy8gICB9XG4gICAgICAgIC8vIH07XG5cblxuXG5cblxuICAgICAgICAvLyAvL3ZhciBkID0gbmV3IERhdGUoKVxuICAgICAgICAvLyB2YXIgZCA9ICdtamcnXG4gICAgICAgIC8vIHZhciBmaWxlbGlzdCA9ICdJbiB0aGlzIGJ1aWxkOlxcblxcbicgKyBkICsgJ1xcblxcbic7XG4gICAgICAgIC8vIC8vIExvb3AgdGhyb3VnaCBhbGwgY29tcGlsZWQgYXNzZXRzLFxuICAgICAgICAvLyAvLyBhZGRpbmcgYSBuZXcgbGluZSBpdGVtIGZvciBlYWNoIGZpbGVuYW1lLlxuICAgICAgICAvLyBmb3IgKHZhciBmaWxlbmFtZSBpbiBjb21waWxhdGlvbi5hc3NldHMpIHtcbiAgICAgICAgLy8gICBmaWxlbGlzdCArPSAoJy0gJysgZmlsZW5hbWUgKydcXG4nKTtcbiAgICAgICAgLy8gfVxuICAgICAgICAvLyAvLyBJbnNlcnQgdGhpcyBsaXN0IGludG8gdGhlIHdlYnBhY2sgYnVpbGQgYXMgYSBuZXcgZmlsZSBhc3NldDpcbiAgICAgICAgLy8gY29tcGlsYXRpb24uYXNzZXRzW2QgKyAnLm1kJ10gPSB7XG4gICAgICAgIC8vICAgc291cmNlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gICAgIHJldHVybiBmaWxlbGlzdDtcbiAgICAgICAgLy8gICB9LFxuICAgICAgICAvLyAgIHNpemU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyAgICAgcmV0dXJuIGZpbGVsaXN0Lmxlbmd0aDtcbiAgICAgICAgLy8gICB9XG4gICAgICAgIC8vIH07Il19