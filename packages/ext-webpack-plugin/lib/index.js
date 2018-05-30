var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

import chalk from 'chalk';
import path from 'path';
import fs from 'fs';
import validateOptions from 'schema-utils';
import uniq from 'lodash.uniq';
import isGlob from 'is-glob';
import { resolve } from 'path';
import recursiveReadSync from 'recursive-readdir-sync';
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

  constructor(options = {}) {
    validateOptions(require('../options.json'), options, 'ExtraWatchWebpackPlugin'); // eslint-disable-line
    this.options = _extends({}, ExtWebpackPlugin.defaults, options);
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
            compilation.fileDependencies.add(resolve(file));
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

ExtWebpackPlugin.defaults = {
  cwd: process.cwd(),
  files: [],
  dirs: ['./app']
};
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9pbmRleC5qcyJdLCJuYW1lcyI6WyJjaGFsayIsInBhdGgiLCJmcyIsInZhbGlkYXRlT3B0aW9ucyIsInVuaXEiLCJpc0dsb2IiLCJyZXNvbHZlIiwicmVjdXJzaXZlUmVhZFN5bmMiLCJhcHAiLCJncmVlbiIsImdldEZpbGVBbmRDb250ZXh0RGVwcyIsImNvbXBpbGF0aW9uIiwiZmlsZXMiLCJkaXJzIiwiY3dkIiwiZmlsZURlcGVuZGVuY2llcyIsImNvbnRleHREZXBlbmRlbmNpZXMiLCJpc1dlYnBhY2s0IiwiaG9va3MiLCJmZHMiLCJjZHMiLCJsZW5ndGgiLCJjb25jYXQiLCJFeHRXZWJwYWNrUGx1Z2luIiwiY29uc3RydWN0b3IiLCJvcHRpb25zIiwicmVxdWlyZSIsImRlZmF1bHRzIiwiYXBwbHkiLCJjb21waWxlciIsIndlYnBhY2tWZXJzaW9uIiwidW5kZWZpbmVkIiwicGx1Z2luUGF0aCIsIl9fZGlybmFtZSIsInBsdWdpblBrZyIsImV4aXN0c1N5bmMiLCJKU09OIiwicGFyc2UiLCJyZWFkRmlsZVN5bmMiLCJwbHVnaW5WZXJzaW9uIiwidmVyc2lvbiIsImV4dFBhdGgiLCJleHRQa2ciLCJleHRWZXJzaW9uIiwic2VuY2hhIiwiY21kUGF0aCIsImNtZFBrZyIsImNtZFZlcnNpb24iLCJ2ZXJzaW9uX2Z1bGwiLCJwcm9jZXNzIiwic3Rkb3V0IiwiY3Vyc29yVG8iLCJjb25zb2xlIiwibG9nIiwiYWZ0ZXJDb21waWxlIiwidGFwIiwiZm9yRWFjaCIsImZpbGUiLCJhZGQiLCJjb250ZXh0IiwicGx1Z2luIiwiY2IiLCJtZSIsImVtaXQiLCJ0YXBBc3luYyIsIndhdGNoZWRGaWxlcyIsImVyciIsImVycm5vIiwiZG9CdWlsZCIsImxhc3RNaWxsaXNlY29uZHMiLCJzdGF0U3luYyIsIm10aW1lTXMiLCJpbmRleE9mIiwiRGF0ZSIsImdldFRpbWUiLCJjdXJyZW50TnVtRmlsZXMiLCJmaWxlc291cmNlIiwiYXNzZXRzIiwic291cmNlIiwic2l6ZSIsImxhc3ROdW1GaWxlcyIsImJ1aWxkQXN5bmMiLCJwYXJtcyIsImV4ZWN1dGVBc3luYyIsInRoZW4iLCJmaWxlbGlzdCIsInJlZnJlc2giXSwibWFwcGluZ3MiOiI7O0FBQUEsT0FBT0EsS0FBUCxNQUFrQixPQUFsQjtBQUNBLE9BQU9DLElBQVAsTUFBaUIsTUFBakI7QUFDQSxPQUFPQyxFQUFQLE1BQWUsSUFBZjtBQUNBLE9BQU9DLGVBQVAsTUFBNEIsY0FBNUI7QUFDQSxPQUFPQyxJQUFQLE1BQWlCLGFBQWpCO0FBQ0EsT0FBT0MsTUFBUCxNQUFtQixTQUFuQjtBQUNBLFNBQVNDLE9BQVQsUUFBd0IsTUFBeEI7QUFDQSxPQUFPQyxpQkFBUCxNQUE4Qix3QkFBOUI7QUFDQSxNQUFNQyxNQUFPLEdBQUVSLE1BQU1TLEtBQU4sQ0FBWSxVQUFaLENBQXdCLHVCQUF2Qzs7QUFFQSxTQUFTQyxxQkFBVCxDQUErQkMsV0FBL0IsRUFBNENDLEtBQTVDLEVBQW1EQyxJQUFuRCxFQUF5REMsR0FBekQsRUFBOEQ7QUFDNUQsUUFBTSxFQUFFQyxnQkFBRixFQUFvQkMsbUJBQXBCLEtBQTRDTCxXQUFsRDtBQUNBLFFBQU1NLGFBQWFOLFlBQVlPLEtBQS9CO0FBQ0EsTUFBSUMsTUFBTUYsYUFBYSxDQUFDLEdBQUdGLGdCQUFKLENBQWIsR0FBcUNBLGdCQUEvQztBQUNBLE1BQUlLLE1BQU1ILGFBQWEsQ0FBQyxHQUFHRCxtQkFBSixDQUFiLEdBQXdDQSxtQkFBbEQ7QUFDQSxNQUFJSCxLQUFLUSxNQUFMLEdBQWMsQ0FBbEIsRUFBcUI7QUFDbkJELFVBQU1oQixLQUFLZ0IsSUFBSUUsTUFBSixDQUFXVCxJQUFYLENBQUwsQ0FBTjtBQUNEO0FBQ0QsU0FBTztBQUNMRSxzQkFBa0JJLEdBRGI7QUFFTEgseUJBQXFCSTtBQUZoQixHQUFQO0FBSUQ7O0FBRUQsZUFBZSxNQUFNRyxnQkFBTixDQUF1Qjs7QUFPcENDLGNBQVlDLFVBQVUsRUFBdEIsRUFBMEI7QUFDeEJ0QixvQkFBZ0J1QixRQUFRLGlCQUFSLENBQWhCLEVBQTRDRCxPQUE1QyxFQUFxRCx5QkFBckQsRUFEd0IsQ0FDeUQ7QUFDakYsU0FBS0EsT0FBTCxnQkFBb0JGLGlCQUFpQkksUUFBckMsRUFBa0RGLE9BQWxEO0FBQ0Q7O0FBRURHLFFBQU1DLFFBQU4sRUFBZ0I7O0FBRWQsUUFBSSxLQUFLQyxjQUFMLElBQXVCQyxTQUEzQixFQUFzQztBQUNwQyxVQUFJQyxhQUFhL0IsS0FBS0ssT0FBTCxDQUFhMkIsU0FBYixFQUF1QixJQUF2QixDQUFqQjtBQUNBLFVBQUlDLFlBQWFoQyxHQUFHaUMsVUFBSCxDQUFjSCxhQUFXLGVBQXpCLEtBQTZDSSxLQUFLQyxLQUFMLENBQVduQyxHQUFHb0MsWUFBSCxDQUFnQk4sYUFBVyxlQUEzQixFQUE0QyxPQUE1QyxDQUFYLENBQTdDLElBQWlILEVBQWxJO0FBQ0EsVUFBSU8sZ0JBQWdCTCxVQUFVTSxPQUE5Qjs7QUFFQSxVQUFJQyxVQUFVeEMsS0FBS0ssT0FBTCxDQUFhMEIsVUFBYixFQUF3QixRQUF4QixDQUFkO0FBQ0EsVUFBSVUsU0FBVXhDLEdBQUdpQyxVQUFILENBQWNNLFVBQVEsZUFBdEIsS0FBMENMLEtBQUtDLEtBQUwsQ0FBV25DLEdBQUdvQyxZQUFILENBQWdCRyxVQUFRLGVBQXhCLEVBQXlDLE9BQXpDLENBQVgsQ0FBMUMsSUFBMkcsRUFBekg7QUFDQSxVQUFJRSxhQUFhRCxPQUFPRSxNQUFQLENBQWNKLE9BQS9COztBQUVBLFVBQUlLLFVBQVU1QyxLQUFLSyxPQUFMLENBQWEwQixVQUFiLEVBQXdCLGVBQXhCLENBQWQ7QUFDQSxVQUFJYyxTQUFVNUMsR0FBR2lDLFVBQUgsQ0FBY1UsVUFBUSxlQUF0QixLQUEwQ1QsS0FBS0MsS0FBTCxDQUFXbkMsR0FBR29DLFlBQUgsQ0FBZ0JPLFVBQVEsZUFBeEIsRUFBeUMsT0FBekMsQ0FBWCxDQUExQyxJQUEyRyxFQUF6SDtBQUNBLFVBQUlFLGFBQWFELE9BQU9FLFlBQXhCOztBQUVBLFlBQU0vQixhQUFhWSxTQUFTWCxLQUE1QjtBQUNBLFVBQUlELFVBQUosRUFBZ0I7QUFBQyxhQUFLYSxjQUFMLEdBQXNCLGNBQXRCO0FBQXFDLE9BQXRELE1BQ0s7QUFBQyxhQUFLQSxjQUFMLEdBQXNCLGVBQXRCO0FBQXNDO0FBQzVDbUIsY0FBUUMsTUFBUixDQUFlQyxRQUFmLENBQXdCLENBQXhCLEVBQTJCQyxRQUFRQyxHQUFSLENBQVk3QyxNQUFNLEdBQU4sR0FBWStCLGFBQVosR0FBNEIsWUFBNUIsR0FBMkNJLFVBQTNDLEdBQXdELGdCQUF4RCxHQUEyRUksVUFBM0UsR0FBd0YsSUFBeEYsR0FBK0YsS0FBS2pCLGNBQWhIO0FBQzVCOztBQUVELFFBQUksRUFBRWxCLEtBQUYsRUFBU0MsSUFBVCxLQUFrQixLQUFLWSxPQUEzQjtBQUNBLFVBQU0sRUFBRVgsR0FBRixLQUFVLEtBQUtXLE9BQXJCO0FBQ0FiLFlBQVEsT0FBT0EsS0FBUCxLQUFpQixRQUFqQixHQUE0QixDQUFDQSxLQUFELENBQTVCLEdBQXNDQSxLQUE5QztBQUNBQyxXQUFPLE9BQU9BLElBQVAsS0FBZ0IsUUFBaEIsR0FBMkIsQ0FBQ0EsSUFBRCxDQUEzQixHQUFvQ0EsSUFBM0M7O0FBRUEsUUFBSWdCLFNBQVNYLEtBQWIsRUFBb0I7QUFDbEJXLGVBQVNYLEtBQVQsQ0FBZW9DLFlBQWYsQ0FBNEJDLEdBQTVCLENBQWdDLG1CQUFoQyxFQUFzRDVDLFdBQUQsSUFBaUI7QUFDcEVzQyxnQkFBUUMsTUFBUixDQUFlQyxRQUFmLENBQXdCLENBQXhCLEVBQTJCQyxRQUFRQyxHQUFSLENBQVk3QyxNQUFNLG1CQUFsQjtBQUMzQixjQUFNO0FBQ0pPLDBCQURJO0FBRUpDO0FBRkksWUFHRk4sc0JBQXNCQyxXQUF0QixFQUFtQ0MsS0FBbkMsRUFBMENDLElBQTFDLEVBQWdEQyxHQUFoRCxDQUhKO0FBSUEsWUFBSUYsTUFBTVMsTUFBTixHQUFlLENBQW5CLEVBQXNCO0FBQ3BCTiwyQkFBaUJ5QyxPQUFqQixDQUEwQkMsSUFBRCxJQUFVO0FBQ2pDOUMsd0JBQVlJLGdCQUFaLENBQTZCMkMsR0FBN0IsQ0FBaUNwRCxRQUFRbUQsSUFBUixDQUFqQztBQUNELFdBRkQ7QUFHRDtBQUNELFlBQUk1QyxLQUFLUSxNQUFMLEdBQWMsQ0FBbEIsRUFBcUI7QUFDbkJMLDhCQUFvQndDLE9BQXBCLENBQTZCRyxPQUFELElBQWE7QUFDdkNoRCx3QkFBWUssbUJBQVosQ0FBZ0MwQyxHQUFoQyxDQUFvQ0MsT0FBcEM7QUFDRCxXQUZEO0FBR0Q7QUFDRixPQWhCRDtBQWlCRCxLQWxCRCxNQWtCTztBQUNMOUIsZUFBUytCLE1BQVQsQ0FBZ0IsZUFBaEIsRUFBaUMsQ0FBQ2pELFdBQUQsRUFBY2tELEVBQWQsS0FBcUI7QUFDcERULGdCQUFRQyxHQUFSLENBQVk3QyxNQUFNLGVBQWxCO0FBQ0EsY0FBTTtBQUNKTywwQkFESTtBQUVKQztBQUZJLFlBR0ZOLHNCQUFzQkMsV0FBdEIsRUFBbUNDLEtBQW5DLEVBQTBDQyxJQUExQyxFQUFnREMsR0FBaEQsQ0FISjtBQUlBLFlBQUlGLE1BQU1TLE1BQU4sR0FBZSxDQUFuQixFQUFzQjtBQUNwQlYsc0JBQVlJLGdCQUFaLEdBQStCQSxnQkFBL0IsQ0FEb0IsQ0FDNkI7QUFDbEQ7QUFDRCxZQUFJRixLQUFLUSxNQUFMLEdBQWMsQ0FBbEIsRUFBcUI7QUFDbkJWLHNCQUFZSyxtQkFBWixHQUFrQ0EsbUJBQWxDLENBRG1CLENBQ29DO0FBQ3hEO0FBQ0Q2QztBQUNELE9BYkQ7QUFjRDs7QUFFRCxRQUFJaEMsU0FBU1gsS0FBYixFQUFvQjtBQUNsQixVQUFJNEMsS0FBSyxJQUFUO0FBQ0FqQyxlQUFTWCxLQUFULENBQWU2QyxJQUFmLENBQW9CQyxRQUFwQixDQUE2QixnQkFBN0IsRUFBK0MsVUFBVXJELFdBQVYsRUFBdUJrRCxFQUF2QixFQUEyQjtBQUN4RVosZ0JBQVFDLE1BQVIsQ0FBZUMsUUFBZixDQUF3QixDQUF4QixFQUEyQkMsUUFBUUMsR0FBUixDQUFZN0MsTUFBTSxnQkFBbEI7O0FBRTNCLFlBQUl5RCxlQUFhLEVBQWpCO0FBQ0EsWUFBSTtBQUFDQSx5QkFBZTFELGtCQUFrQixPQUFsQixDQUFmO0FBQTBDLFNBQS9DLENBQ0EsT0FBTTJELEdBQU4sRUFBVztBQUFDLGNBQUdBLElBQUlDLEtBQUosS0FBYyxFQUFqQixFQUFvQjtBQUFDZixvQkFBUUMsR0FBUixDQUFZLHFCQUFaO0FBQW9DLFdBQXpELE1BQStEO0FBQUMsa0JBQU1hLEdBQU47QUFBVztBQUFDOztBQUV4RixZQUFJRSxVQUFVLEtBQWQ7QUFDQSxhQUFLLElBQUlYLElBQVQsSUFBaUJRLFlBQWpCLEVBQStCO0FBQzdCLGNBQUlILEdBQUdPLGdCQUFILEdBQXNCbkUsR0FBR29FLFFBQUgsQ0FBWUwsYUFBYVIsSUFBYixDQUFaLEVBQWdDYyxPQUExRCxFQUFtRTtBQUNqRSxnQkFBSU4sYUFBYVIsSUFBYixFQUFtQmUsT0FBbkIsQ0FBMkIsTUFBM0IsS0FBc0MsQ0FBQyxDQUEzQyxFQUE4QztBQUFDSix3QkFBUSxJQUFSLENBQWE7QUFBTztBQUNwRTtBQUNGO0FBQ0ROLFdBQUdPLGdCQUFILEdBQXVCLElBQUlJLElBQUosRUFBRCxDQUFXQyxPQUFYLEVBQXRCOztBQUVBLFlBQUlDLGtCQUFrQlYsYUFBYTVDLE1BQW5DO0FBQ0EsWUFBSXVELGFBQWEsaUNBQWpCO0FBQ0FqRSxvQkFBWWtFLE1BQVosQ0FBbUJGLGtCQUFrQix3QkFBckMsSUFBaUU7QUFDL0RHLGtCQUFRLFlBQVc7QUFBQyxtQkFBT0YsVUFBUDtBQUFrQixXQUR5QjtBQUUvREcsZ0JBQU0sWUFBVztBQUFDLG1CQUFPSCxXQUFXdkQsTUFBbEI7QUFBeUI7QUFGb0IsU0FBakU7O0FBS0EsWUFBSXNELG1CQUFtQmIsR0FBR2tCLFlBQXRCLElBQXNDWixPQUExQyxFQUFtRDtBQUNqRE4sYUFBR2tCLFlBQUgsR0FBa0JMLGVBQWxCO0FBQ0EsY0FBSU0sYUFBYXZELFFBQVEsb0NBQVIsQ0FBakI7QUFDQSxjQUFJRCxVQUFVLEVBQUN5RCxPQUFPLENBQUMsS0FBRCxFQUFPLE9BQVAsRUFBZSxhQUFmLENBQVIsRUFBZDtBQUNBLGNBQUlELFVBQUosQ0FBZXhELE9BQWYsRUFBd0IwRCxZQUF4QixHQUF1Q0MsSUFBdkMsQ0FBNEMsWUFBVztBQUNyRHZCO0FBQ0QsV0FGRDs7QUFJQTtBQUNBO0FBQ0E7QUFDQTtBQUNELFNBWkQsTUFhSztBQUNIQyxhQUFHa0IsWUFBSCxHQUFrQkwsZUFBbEI7QUFDQXZCLGtCQUFRQyxHQUFSLENBQVk3QyxNQUFNLDRDQUFsQjtBQUNBcUQ7QUFDRDtBQUNGLE9BeENEOztBQTJDTjtBQUNBOztBQUVNO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRU47QUFDSyxLQS9FRCxNQWdGSztBQUNIaEMsZUFBUytCLE1BQVQsQ0FBZ0IsTUFBaEIsRUFBd0IsQ0FBQ2pELFdBQUQsRUFBY2tELEVBQWQsS0FBcUI7QUFDM0NULGdCQUFRQyxHQUFSLENBQVk3QyxNQUFNLE1BQWxCO0FBQ0EsWUFBSTZFLFdBQVcsaUNBQWY7QUFDQTFFLG9CQUFZa0UsTUFBWixDQUFtQixjQUFuQixJQUFxQztBQUNuQ0Msa0JBQVEsWUFBVztBQUFDLG1CQUFPTyxRQUFQO0FBQWdCLFdBREQ7QUFFbkNOLGdCQUFNLFlBQVc7QUFBQyxtQkFBT00sU0FBU2hFLE1BQWhCO0FBQXVCO0FBRk4sU0FBckM7QUFJQSxZQUFJaUUsVUFBVTVELFFBQVEsaUNBQVIsQ0FBZDtBQUNBLFlBQUk0RCxPQUFKLENBQVksRUFBWjs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQTs7QUFJRCxPQXhCRDtBQXlCRDtBQUVGOztBQUdEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOzs7QUFyT29DOztBQWdQcEM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBR0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSTtBQUNBO0FBQ0E7O0FBRUo7OztBQU1ROztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQS9UYS9ELGdCLENBQ1pJLFEsR0FBVztBQUNoQmIsT0FBS21DLFFBQVFuQyxHQUFSLEVBRFc7QUFFaEJGLFNBQU8sRUFGUztBQUdoQkMsUUFBTSxDQUFDLE9BQUQ7QUFIVSxDIiwiZmlsZSI6ImluZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnXG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHZhbGlkYXRlT3B0aW9ucyBmcm9tICdzY2hlbWEtdXRpbHMnO1xuaW1wb3J0IHVuaXEgZnJvbSAnbG9kYXNoLnVuaXEnO1xuaW1wb3J0IGlzR2xvYiBmcm9tICdpcy1nbG9iJztcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdwYXRoJztcbmltcG9ydCByZWN1cnNpdmVSZWFkU3luYyBmcm9tICdyZWN1cnNpdmUtcmVhZGRpci1zeW5jJztcbmNvbnN0IGFwcCA9IGAke2NoYWxrLmdyZWVuKCfihLkg772iZXh0772jOicpfSBleHQtd2VicGFjay1wbHVnaW46IGA7XG5cbmZ1bmN0aW9uIGdldEZpbGVBbmRDb250ZXh0RGVwcyhjb21waWxhdGlvbiwgZmlsZXMsIGRpcnMsIGN3ZCkge1xuICBjb25zdCB7IGZpbGVEZXBlbmRlbmNpZXMsIGNvbnRleHREZXBlbmRlbmNpZXMgfSA9IGNvbXBpbGF0aW9uO1xuICBjb25zdCBpc1dlYnBhY2s0ID0gY29tcGlsYXRpb24uaG9va3M7XG4gIGxldCBmZHMgPSBpc1dlYnBhY2s0ID8gWy4uLmZpbGVEZXBlbmRlbmNpZXNdIDogZmlsZURlcGVuZGVuY2llcztcbiAgbGV0IGNkcyA9IGlzV2VicGFjazQgPyBbLi4uY29udGV4dERlcGVuZGVuY2llc10gOiBjb250ZXh0RGVwZW5kZW5jaWVzO1xuICBpZiAoZGlycy5sZW5ndGggPiAwKSB7XG4gICAgY2RzID0gdW5pcShjZHMuY29uY2F0KGRpcnMpKTtcbiAgfVxuICByZXR1cm4ge1xuICAgIGZpbGVEZXBlbmRlbmNpZXM6IGZkcyxcbiAgICBjb250ZXh0RGVwZW5kZW5jaWVzOiBjZHMsXG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEV4dFdlYnBhY2tQbHVnaW4ge1xuICBzdGF0aWMgZGVmYXVsdHMgPSB7XG4gICAgY3dkOiBwcm9jZXNzLmN3ZCgpLFxuICAgIGZpbGVzOiBbXSxcbiAgICBkaXJzOiBbJy4vYXBwJ10sXG4gIH07XG5cbiAgY29uc3RydWN0b3Iob3B0aW9ucyA9IHt9KSB7XG4gICAgdmFsaWRhdGVPcHRpb25zKHJlcXVpcmUoJy4uL29wdGlvbnMuanNvbicpLCBvcHRpb25zLCAnRXh0cmFXYXRjaFdlYnBhY2tQbHVnaW4nKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZVxuICAgIHRoaXMub3B0aW9ucyA9IHsgLi4uRXh0V2VicGFja1BsdWdpbi5kZWZhdWx0cywgLi4ub3B0aW9ucyB9O1xuICB9XG5cbiAgYXBwbHkoY29tcGlsZXIpIHtcblxuICAgIGlmICh0aGlzLndlYnBhY2tWZXJzaW9uID09IHVuZGVmaW5lZCkge1xuICAgICAgdmFyIHBsdWdpblBhdGggPSBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCcuLicpXG4gICAgICB2YXIgcGx1Z2luUGtnID0gKGZzLmV4aXN0c1N5bmMocGx1Z2luUGF0aCsnL3BhY2thZ2UuanNvbicpICYmIEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKHBsdWdpblBhdGgrJy9wYWNrYWdlLmpzb24nLCAndXRmLTgnKSkgfHwge30pO1xuICAgICAgdmFyIHBsdWdpblZlcnNpb24gPSBwbHVnaW5Qa2cudmVyc2lvblxuICBcbiAgICAgIHZhciBleHRQYXRoID0gcGF0aC5yZXNvbHZlKHBsdWdpblBhdGgsJy4uL2V4dCcpXG4gICAgICB2YXIgZXh0UGtnID0gKGZzLmV4aXN0c1N5bmMoZXh0UGF0aCsnL3BhY2thZ2UuanNvbicpICYmIEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKGV4dFBhdGgrJy9wYWNrYWdlLmpzb24nLCAndXRmLTgnKSkgfHwge30pO1xuICAgICAgdmFyIGV4dFZlcnNpb24gPSBleHRQa2cuc2VuY2hhLnZlcnNpb25cblxuICAgICAgdmFyIGNtZFBhdGggPSBwYXRoLnJlc29sdmUocGx1Z2luUGF0aCwnLi4vc2VuY2hhLWNtZCcpXG4gICAgICB2YXIgY21kUGtnID0gKGZzLmV4aXN0c1N5bmMoY21kUGF0aCsnL3BhY2thZ2UuanNvbicpICYmIEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKGNtZFBhdGgrJy9wYWNrYWdlLmpzb24nLCAndXRmLTgnKSkgfHwge30pO1xuICAgICAgdmFyIGNtZFZlcnNpb24gPSBjbWRQa2cudmVyc2lvbl9mdWxsXG5cbiAgICAgIGNvbnN0IGlzV2VicGFjazQgPSBjb21waWxlci5ob29rcztcbiAgICAgIGlmIChpc1dlYnBhY2s0KSB7dGhpcy53ZWJwYWNrVmVyc2lvbiA9ICdJUyB3ZWJwYWNrIDQnfVxuICAgICAgZWxzZSB7dGhpcy53ZWJwYWNrVmVyc2lvbiA9ICdOT1Qgd2VicGFjayA0J31cbiAgICAgIHByb2Nlc3Muc3Rkb3V0LmN1cnNvclRvKDApO2NvbnNvbGUubG9nKGFwcCArICd2JyArIHBsdWdpblZlcnNpb24gKyAnLCBFeHQgSlMgdicgKyBleHRWZXJzaW9uICsgJywgU2VuY2hhIENtZCB2JyArIGNtZFZlcnNpb24gKyAnLCAnICsgdGhpcy53ZWJwYWNrVmVyc2lvbilcbiAgICB9XG5cbiAgICBsZXQgeyBmaWxlcywgZGlycyB9ID0gdGhpcy5vcHRpb25zO1xuICAgIGNvbnN0IHsgY3dkIH0gPSB0aGlzLm9wdGlvbnM7XG4gICAgZmlsZXMgPSB0eXBlb2YgZmlsZXMgPT09ICdzdHJpbmcnID8gW2ZpbGVzXSA6IGZpbGVzO1xuICAgIGRpcnMgPSB0eXBlb2YgZGlycyA9PT0gJ3N0cmluZycgPyBbZGlyc10gOiBkaXJzO1xuXG4gICAgaWYgKGNvbXBpbGVyLmhvb2tzKSB7XG4gICAgICBjb21waWxlci5ob29rcy5hZnRlckNvbXBpbGUudGFwKCdleHQtYWZ0ZXItY29tcGlsZScsIChjb21waWxhdGlvbikgPT4ge1xuICAgICAgICBwcm9jZXNzLnN0ZG91dC5jdXJzb3JUbygwKTtjb25zb2xlLmxvZyhhcHAgKyAnZXh0LWFmdGVyLWNvbXBpbGUnKVxuICAgICAgICBjb25zdCB7XG4gICAgICAgICAgZmlsZURlcGVuZGVuY2llcyxcbiAgICAgICAgICBjb250ZXh0RGVwZW5kZW5jaWVzLFxuICAgICAgICB9ID0gZ2V0RmlsZUFuZENvbnRleHREZXBzKGNvbXBpbGF0aW9uLCBmaWxlcywgZGlycywgY3dkKTtcbiAgICAgICAgaWYgKGZpbGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBmaWxlRGVwZW5kZW5jaWVzLmZvckVhY2goKGZpbGUpID0+IHtcbiAgICAgICAgICAgIGNvbXBpbGF0aW9uLmZpbGVEZXBlbmRlbmNpZXMuYWRkKHJlc29sdmUoZmlsZSkpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkaXJzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBjb250ZXh0RGVwZW5kZW5jaWVzLmZvckVhY2goKGNvbnRleHQpID0+IHtcbiAgICAgICAgICAgIGNvbXBpbGF0aW9uLmNvbnRleHREZXBlbmRlbmNpZXMuYWRkKGNvbnRleHQpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29tcGlsZXIucGx1Z2luKCdhZnRlci1jb21waWxlJywgKGNvbXBpbGF0aW9uLCBjYikgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZyhhcHAgKyAnYWZ0ZXItY29tcGlsZScpXG4gICAgICAgIGNvbnN0IHtcbiAgICAgICAgICBmaWxlRGVwZW5kZW5jaWVzLFxuICAgICAgICAgIGNvbnRleHREZXBlbmRlbmNpZXMsXG4gICAgICAgIH0gPSBnZXRGaWxlQW5kQ29udGV4dERlcHMoY29tcGlsYXRpb24sIGZpbGVzLCBkaXJzLCBjd2QpO1xuICAgICAgICBpZiAoZmlsZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGNvbXBpbGF0aW9uLmZpbGVEZXBlbmRlbmNpZXMgPSBmaWxlRGVwZW5kZW5jaWVzOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lXG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRpcnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGNvbXBpbGF0aW9uLmNvbnRleHREZXBlbmRlbmNpZXMgPSBjb250ZXh0RGVwZW5kZW5jaWVzOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lXG4gICAgICAgIH1cbiAgICAgICAgY2IoKVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKGNvbXBpbGVyLmhvb2tzKSB7XG4gICAgICB2YXIgbWUgPSB0aGlzXG4gICAgICBjb21waWxlci5ob29rcy5lbWl0LnRhcEFzeW5jKCdleHQtZW1pdC1hc3luYycsIGZ1bmN0aW9uIChjb21waWxhdGlvbiwgY2IpIHtcbiAgICAgICAgcHJvY2Vzcy5zdGRvdXQuY3Vyc29yVG8oMCk7Y29uc29sZS5sb2coYXBwICsgJ2V4dC1lbWl0LWFzeW5jJylcblxuICAgICAgICB2YXIgd2F0Y2hlZEZpbGVzPVtdXG4gICAgICAgIHRyeSB7d2F0Y2hlZEZpbGVzID0gcmVjdXJzaXZlUmVhZFN5bmMoJy4vYXBwJyl9IFxuICAgICAgICBjYXRjaChlcnIpIHtpZihlcnIuZXJybm8gPT09IDM0KXtjb25zb2xlLmxvZygnUGF0aCBkb2VzIG5vdCBleGlzdCcpO30gZWxzZSB7dGhyb3cgZXJyO319XG5cbiAgICAgICAgdmFyIGRvQnVpbGQgPSBmYWxzZVxuICAgICAgICBmb3IgKHZhciBmaWxlIGluIHdhdGNoZWRGaWxlcykge1xuICAgICAgICAgIGlmIChtZS5sYXN0TWlsbGlzZWNvbmRzIDwgZnMuc3RhdFN5bmMod2F0Y2hlZEZpbGVzW2ZpbGVdKS5tdGltZU1zKSB7XG4gICAgICAgICAgICBpZiAod2F0Y2hlZEZpbGVzW2ZpbGVdLmluZGV4T2YoXCJzY3NzXCIpICE9IC0xKSB7ZG9CdWlsZD10cnVlO2JyZWFrO31cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgbWUubGFzdE1pbGxpc2Vjb25kcyA9IChuZXcgRGF0ZSkuZ2V0VGltZSgpXG5cbiAgICAgICAgdmFyIGN1cnJlbnROdW1GaWxlcyA9IHdhdGNoZWRGaWxlcy5sZW5ndGhcbiAgICAgICAgdmFyIGZpbGVzb3VyY2UgPSAndGhpcyBmaWxlIGVuYWJsZXMgY2xpZW50IHJlbG9hZCdcbiAgICAgICAgY29tcGlsYXRpb24uYXNzZXRzW2N1cnJlbnROdW1GaWxlcyArICdGaWxlc1VuZGVyQXBwRm9sZGVyLm1kJ10gPSB7XG4gICAgICAgICAgc291cmNlOiBmdW5jdGlvbigpIHtyZXR1cm4gZmlsZXNvdXJjZX0sXG4gICAgICAgICAgc2l6ZTogZnVuY3Rpb24oKSB7cmV0dXJuIGZpbGVzb3VyY2UubGVuZ3RofVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGN1cnJlbnROdW1GaWxlcyAhPSBtZS5sYXN0TnVtRmlsZXMgfHwgZG9CdWlsZCkge1xuICAgICAgICAgIG1lLmxhc3ROdW1GaWxlcyA9IGN1cnJlbnROdW1GaWxlc1xuICAgICAgICAgIHZhciBidWlsZEFzeW5jID0gcmVxdWlyZSgnQGV4dGpzL2V4dC1idWlsZC9hcHAvYnVpbGRBc3luYy5qcycpXG4gICAgICAgICAgdmFyIG9wdGlvbnMgPSB7cGFybXM6IFsnYXBwJywnYnVpbGQnLCdkZXZlbG9wbWVudCddfVxuICAgICAgICAgIG5ldyBidWlsZEFzeW5jKG9wdGlvbnMpLmV4ZWN1dGVBc3luYygpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjYigpXG4gICAgICAgICAgfSlcbiAgICAgICAgICBcbiAgICAgICAgICAvLyB2YXIgYnVpbGQgPSByZXF1aXJlKCdAZXh0anMvZXh0LWJ1aWxkL2FwcC9idWlsZC5qcycpXG4gICAgICAgICAgLy8gbmV3IGJ1aWxkKHt9KVxuICAgICAgICAgIC8vdmFyIHJlZnJlc2ggPSByZXF1aXJlKCdAZXh0anMvZXh0LWJ1aWxkL2FwcC9yZWZyZXNoLmpzJylcbiAgICAgICAgICAvL25ldyByZWZyZXNoKHt9KVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIG1lLmxhc3ROdW1GaWxlcyA9IGN1cnJlbnROdW1GaWxlc1xuICAgICAgICAgIGNvbnNvbGUubG9nKGFwcCArICdjYWxsIHRvIGV4dC1idWlsZCBub3QgbmVlZGVkLCBubyBuZXcgZmlsZXMnKVxuICAgICAgICAgIGNiKClcbiAgICAgICAgfVxuICAgICAgfSlcblxuXG4vLyAgICAgIGNvbXBpbGVyLmhvb2tzLmVtaXQudGFwKCdleHQtZW1pdCcsIChjb21waWxhdGlvbikgPT4ge1xuLy8gICAgICAgIHByb2Nlc3Muc3Rkb3V0LmN1cnNvclRvKDApO2NvbnNvbGUubG9nKGFwcCArICdleHQtZW1pdCcpXG5cbiAgICAgIC8vICAgdmFyIHdhdGNoZWRGaWxlcz1bXVxuICAgICAgLy8gICB0cnkge3dhdGNoZWRGaWxlcyA9IHJlY3Vyc2l2ZVJlYWRTeW5jKCcuL2FwcCcpfSBcbiAgICAgIC8vICAgY2F0Y2goZXJyKSB7aWYoZXJyLmVycm5vID09PSAzNCl7Y29uc29sZS5sb2coJ1BhdGggZG9lcyBub3QgZXhpc3QnKTt9IGVsc2Uge3Rocm93IGVycjt9fVxuXG4gICAgICAvLyAgIHZhciBkb0J1aWxkID0gZmFsc2VcbiAgICAgIC8vICAgZm9yICh2YXIgZmlsZSBpbiB3YXRjaGVkRmlsZXMpIHtcbiAgICAgIC8vICAgICBpZiAodGhpcy5sYXN0TWlsbGlzZWNvbmRzIDwgZnMuc3RhdFN5bmMod2F0Y2hlZEZpbGVzW2ZpbGVdKS5tdGltZU1zKSB7XG4gICAgICAvLyAgICAgICBpZiAod2F0Y2hlZEZpbGVzW2ZpbGVdLmluZGV4T2YoXCJzY3NzXCIpICE9IC0xKSB7ZG9CdWlsZD10cnVlO2JyZWFrO31cbiAgICAgIC8vICAgICB9XG4gICAgICAvLyAgIH1cbiAgICAgIC8vICAgdGhpcy5sYXN0TWlsbGlzZWNvbmRzID0gKG5ldyBEYXRlKS5nZXRUaW1lKClcblxuICAgICAgLy8gICB2YXIgY3VycmVudE51bUZpbGVzID0gd2F0Y2hlZEZpbGVzLmxlbmd0aFxuICAgICAgLy8gICB2YXIgZmlsZXNvdXJjZSA9ICd0aGlzIGZpbGUgZW5hYmxlcyBjbGllbnQgcmVsb2FkJ1xuICAgICAgLy8gICBjb21waWxhdGlvbi5hc3NldHNbY3VycmVudE51bUZpbGVzICsgJ0ZpbGVzVW5kZXJBcHBGb2xkZXIubWQnXSA9IHtcbiAgICAgIC8vICAgICBzb3VyY2U6IGZ1bmN0aW9uKCkge3JldHVybiBmaWxlc291cmNlfSxcbiAgICAgIC8vICAgICBzaXplOiBmdW5jdGlvbigpIHtyZXR1cm4gZmlsZXNvdXJjZS5sZW5ndGh9XG4gICAgICAvLyAgIH1cblxuICAgICAgLy8gICBpZiAoY3VycmVudE51bUZpbGVzICE9IHRoaXMubGFzdE51bUZpbGVzIHx8IGRvQnVpbGQpIHtcbiAgICAgIC8vICAgICB2YXIgYnVpbGQgPSByZXF1aXJlKCdAZXh0anMvZXh0LWJ1aWxkL2FwcC9idWlsZC5qcycpXG4gICAgICAvLyAgICAgbmV3IGJ1aWxkKHt9KVxuICAgICAgLy8gICAgIC8vdmFyIHJlZnJlc2ggPSByZXF1aXJlKCdAZXh0anMvc2VuY2hhLWJ1aWxkL2FwcC9yZWZyZXNoLmpzJylcbiAgICAgIC8vICAgICAvL25ldyByZWZyZXNoKHt9KVxuICAgICAgLy8gICB9XG4gICAgICAvLyAgIGVsc2Uge1xuICAgICAgLy8gICAgIGNvbnNvbGUubG9nKGFwcCArICdDYWxsIHRvIFNlbmNoYSBCdWlsZCBub3QgbmVlZGVkLCBubyBuZXcgZmlsZXMnKVxuICAgICAgLy8gICB9XG4gICAgICAvLyAgIHRoaXMubGFzdE51bUZpbGVzID0gY3VycmVudE51bUZpbGVzXG5cbi8vICAgICAgfSlcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBjb21waWxlci5wbHVnaW4oJ2VtaXQnLCAoY29tcGlsYXRpb24sIGNiKSA9PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKGFwcCArICdlbWl0JylcbiAgICAgICAgdmFyIGZpbGVsaXN0ID0gJ3RoaXMgZmlsZSBlbmFibGVzIGNsaWVudCByZWxvYWQnXG4gICAgICAgIGNvbXBpbGF0aW9uLmFzc2V0c1snRm9yUmVsb2FkLm1kJ10gPSB7XG4gICAgICAgICAgc291cmNlOiBmdW5jdGlvbigpIHtyZXR1cm4gZmlsZWxpc3R9LFxuICAgICAgICAgIHNpemU6IGZ1bmN0aW9uKCkge3JldHVybiBmaWxlbGlzdC5sZW5ndGh9XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHJlZnJlc2ggPSByZXF1aXJlKCdAZXh0anMvZXh0LWJ1aWxkL2FwcC9yZWZyZXNoLmpzJylcbiAgICAgICAgbmV3IHJlZnJlc2goe30pXG5cbiAgICAgICAgLy8gY29uc29sZS5sb2coJ1RISVMgSVMgSVQnKVxuICAgICAgICAvLyB2YXIgYnVpbGRBc3luYyA9IHJlcXVpcmUoJ0BleHRqcy9leHQtYnVpbGQvYXBwL2J1aWxkQXN5bmMuanMnKVxuICAgICAgICAvLyBjb25zb2xlLmxvZyhidWlsZEFzeW5jKVxuICAgICAgICAvLyBuZXcgYnVpbGRBc3luYygpLmV4ZWN1dGVBc3luYygpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vICAgY29uc29sZS5sb2coJ3RoZW4gY2FsbCcpO1xuICAgICAgICAvLyAgIGNiKCk7XG4gICAgICAgIC8vIH0pXG5cblxuICAgICAgICAvL2NiKClcbiAgICAgICAgLy90aGlzLmVtaXRTdGF0cy5iaW5kKHRoaXMpXG5cblxuXG4gICAgICB9KVxuICAgIH1cblxuICB9XG5cblxuICAvLyBlbWl0U3RhdHMoY3VyQ29tcGlsZXIsIGNhbGxiYWNrKSB7XG4gIC8vICAgLy8gR2V0IHN0YXRzLlxuICAvLyAgIC8vICoqTm90ZSoqOiBJbiBmdXR1cmUsIGNvdWxkIHBhc3Mgc29tZXRoaW5nIGxpa2UgYHsgc2hvd0Fzc2V0czogdHJ1ZSB9YFxuICAvLyAgIC8vIHRvIHRoZSBgZ2V0U3RhdHMoKWAgZnVuY3Rpb24gZm9yIG1vcmUgbGltaXRlZCBvYmplY3QgcmV0dXJuZWQuXG4gIC8vICAgbGV0IHN0YXRzID0gY3VyQ29tcGlsZXIuZ2V0U3RhdHMoKS50b0pzb24oKTtcbiAgXG4gIC8vICAgLy8gRmlsdGVyIHRvIGZpZWxkcy5cbiAgLy8gICBpZiAodGhpcy5vcHRzLmZpZWxkcykge1xuICAvLyAgICAgc3RhdHMgPSB0aGlzLm9wdHMuZmllbGRzLnJlZHVjZSgobWVtbywga2V5KSA9PiB7XG4gIC8vICAgICAgIG1lbW9ba2V5XSA9IHN0YXRzW2tleV07XG4gIC8vICAgICAgIHJldHVybiBtZW1vO1xuICAvLyAgICAgfSwge30pO1xuICAvLyAgIH1cbiAgXG4gIC8vICAgLy8gVHJhbnNmb3JtIHRvIHN0cmluZy5cbiAgLy8gICBsZXQgZXJyO1xuICAvLyAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKVxuICBcbiAgLy8gICAgIC8vIFRyYW5zZm9ybS5cbiAgLy8gICAgIC50aGVuKCgpID0+IHRoaXMub3B0cy50cmFuc2Zvcm0oc3RhdHMsIHtcbiAgLy8gICAgICAgY29tcGlsZXI6IGN1ckNvbXBpbGVyXG4gIC8vICAgICB9KSlcbiAgLy8gICAgIC5jYXRjaCgoZSkgPT4geyBlcnIgPSBlOyB9KVxuICBcbiAgLy8gICAgIC8vIEZpbmlzaCB1cC5cbiAgLy8gICAgIC50aGVuKChzdGF0c1N0cikgPT4ge1xuICAvLyAgICAgICAvLyBIYW5kbGUgZXJyb3JzLlxuICAvLyAgICAgICBpZiAoZXJyKSB7XG4gIC8vICAgICAgICAgY3VyQ29tcGlsZXIuZXJyb3JzLnB1c2goZXJyKTtcbiAgLy8gICAgICAgICBpZiAoY2FsbGJhY2spIHsgcmV0dXJuIHZvaWQgY2FsbGJhY2soZXJyKTsgfVxuICAvLyAgICAgICAgIHRocm93IGVycjtcbiAgLy8gICAgICAgfVxuICBcbiAgLy8gICAgICAgLy8gQWRkIHRvIGFzc2V0cy5cbiAgLy8gICAgICAgY3VyQ29tcGlsZXIuYXNzZXRzW3RoaXMub3B0cy5maWxlbmFtZV0gPSB7XG4gIC8vICAgICAgICAgc291cmNlKCkge1xuICAvLyAgICAgICAgICAgcmV0dXJuIHN0YXRzU3RyO1xuICAvLyAgICAgICAgIH0sXG4gIC8vICAgICAgICAgc2l6ZSgpIHtcbiAgLy8gICAgICAgICAgIHJldHVybiBzdGF0c1N0ci5sZW5ndGg7XG4gIC8vICAgICAgICAgfVxuICAvLyAgICAgICB9O1xuICBcbiAgLy8gICAgICAgaWYgKGNhbGxiYWNrKSB7IHJldHVybiB2b2lkIGNhbGxiYWNrKCk7IH1cbiAgLy8gICAgIH0pO1xuICAvLyB9XG4gIFxuXG5cbn1cblxuXG5cblxuXG5cbiAgLy8gaWYgKGZpbGVzLmxlbmd0aCA+IDApIHtcbiAgLy8gICBmaWxlcy5mb3JFYWNoKChwYXR0ZXJuKSA9PiB7XG4gIC8vICAgICBsZXQgZiA9IHBhdHRlcm47XG4gIC8vICAgICBpZiAoaXNHbG9iKHBhdHRlcm4pKSB7XG4gIC8vICAgICAgIGYgPSBnbG9iLnN5bmMocGF0dGVybiwge1xuICAvLyAgICAgICAgIGN3ZCxcbiAgLy8gICAgICAgICBkb3Q6IHRydWUsXG4gIC8vICAgICAgICAgYWJzb2x1dGU6IHRydWUsXG4gIC8vICAgICAgIH0pO1xuICAvLyAgICAgfVxuICAvLyAgICAgZmRzID0gZmRzLmNvbmNhdChmKTtcbiAgLy8gICB9KTtcbiAgLy8gICBmZHMgPSB1bmlxKGZkcyk7XG4gIC8vIH1cblxuXG4vLyBmdW5jdGlvbiBob29rX3N0ZG91dChjYWxsYmFjaykge1xuLy8gICB2YXIgb2xkX3dyaXRlID0gcHJvY2Vzcy5zdGRvdXQud3JpdGVcbi8vICAgY29uc29sZS5sb2coJ2luIGhvb2snKVxuLy8gICBwcm9jZXNzLnN0ZG91dC53cml0ZSA9IChmdW5jdGlvbih3cml0ZSkge1xuLy8gICAgICAgcmV0dXJuIGZ1bmN0aW9uKHN0cmluZywgZW5jb2RpbmcsIGZkKSB7XG4vLyAgICAgICAgICAgd3JpdGUuYXBwbHkocHJvY2Vzcy5zdGRvdXQsIGFyZ3VtZW50cylcbi8vICAgICAgICAgICBjYWxsYmFjayhzdHJpbmcsIGVuY29kaW5nLCBmZClcbi8vICAgICAgIH1cbi8vICAgfSkocHJvY2Vzcy5zdGRvdXQud3JpdGUpXG5cbi8vICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuLy8gICAgICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUgPSBvbGRfd3JpdGVcbi8vICAgICAgIGNvbnNvbGUubG9nKCdpbiB1bmhvb2snKVxuLy8gICAgIH1cbi8vIH1cbiAgICAvLyB0aGlzLnVuaG9vayA9IGhvb2tfc3Rkb3V0KGZ1bmN0aW9uKHN0cmluZywgZW5jb2RpbmcsIGZkKSB7XG4gICAgLy8gICBjb25zb2xlLmxvZygnc3Rkb3V0OiAnICsgc3RyaW5nKVxuICAgIC8vIH0pXG5cbi8vICAgICAgICB0aGlzLnVuaG9vaygpXG5cblxuXG5cblxuICAgICAgICAvLyB2YXIgZmlsZWxpc3QgPSAnSW4gdGhpcyBidWlsZDpcXG5cXG4nO1xuXG4gICAgICAgIC8vIC8vIExvb3AgdGhyb3VnaCBhbGwgY29tcGlsZWQgYXNzZXRzLFxuICAgICAgICAvLyAvLyBhZGRpbmcgYSBuZXcgbGluZSBpdGVtIGZvciBlYWNoIGZpbGVuYW1lLlxuICAgICAgICAvLyBmb3IgKHZhciBmaWxlbmFtZSBpbiBjb21waWxhdGlvbi5hc3NldHMpIHtcbiAgICAgICAgLy8gICBmaWxlbGlzdCArPSAoJy0gJysgZmlsZW5hbWUgKydcXG4nKTtcbiAgICAgICAgLy8gfVxuICAgIFxuICAgICAgICAvLyAvLyBJbnNlcnQgdGhpcyBsaXN0IGludG8gdGhlIHdlYnBhY2sgYnVpbGQgYXMgYSBuZXcgZmlsZSBhc3NldDpcbiAgICAgICAgLy8gY29tcGlsYXRpb24uYXNzZXRzWydmaWxlbGlzdC5tZCddID0ge1xuICAgICAgICAvLyAgIHNvdXJjZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vICAgICByZXR1cm4gZmlsZWxpc3Q7XG4gICAgICAgIC8vICAgfSxcbiAgICAgICAgLy8gICBzaXplOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gICAgIHJldHVybiBmaWxlbGlzdC5sZW5ndGg7XG4gICAgICAgIC8vICAgfVxuICAgICAgICAvLyB9O1xuXG5cblxuXG5cbiAgICAgICAgLy8gLy92YXIgZCA9IG5ldyBEYXRlKClcbiAgICAgICAgLy8gdmFyIGQgPSAnbWpnJ1xuICAgICAgICAvLyB2YXIgZmlsZWxpc3QgPSAnSW4gdGhpcyBidWlsZDpcXG5cXG4nICsgZCArICdcXG5cXG4nO1xuICAgICAgICAvLyAvLyBMb29wIHRocm91Z2ggYWxsIGNvbXBpbGVkIGFzc2V0cyxcbiAgICAgICAgLy8gLy8gYWRkaW5nIGEgbmV3IGxpbmUgaXRlbSBmb3IgZWFjaCBmaWxlbmFtZS5cbiAgICAgICAgLy8gZm9yICh2YXIgZmlsZW5hbWUgaW4gY29tcGlsYXRpb24uYXNzZXRzKSB7XG4gICAgICAgIC8vICAgZmlsZWxpc3QgKz0gKCctICcrIGZpbGVuYW1lICsnXFxuJyk7XG4gICAgICAgIC8vIH1cbiAgICAgICAgLy8gLy8gSW5zZXJ0IHRoaXMgbGlzdCBpbnRvIHRoZSB3ZWJwYWNrIGJ1aWxkIGFzIGEgbmV3IGZpbGUgYXNzZXQ6XG4gICAgICAgIC8vIGNvbXBpbGF0aW9uLmFzc2V0c1tkICsgJy5tZCddID0ge1xuICAgICAgICAvLyAgIHNvdXJjZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vICAgICByZXR1cm4gZmlsZWxpc3Q7XG4gICAgICAgIC8vICAgfSxcbiAgICAgICAgLy8gICBzaXplOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gICAgIHJldHVybiBmaWxlbGlzdC5sZW5ndGg7XG4gICAgICAgIC8vICAgfVxuICAgICAgICAvLyB9OyJdfQ==