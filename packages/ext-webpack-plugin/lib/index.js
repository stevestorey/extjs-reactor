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

module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9pbmRleC5qcyJdLCJuYW1lcyI6WyJjaGFsayIsInBhdGgiLCJmcyIsInZhbGlkYXRlT3B0aW9ucyIsInVuaXEiLCJpc0dsb2IiLCJyZXNvbHZlIiwicmVjdXJzaXZlUmVhZFN5bmMiLCJhcHAiLCJncmVlbiIsImdldEZpbGVBbmRDb250ZXh0RGVwcyIsImNvbXBpbGF0aW9uIiwiZmlsZXMiLCJkaXJzIiwiY3dkIiwiZmlsZURlcGVuZGVuY2llcyIsImNvbnRleHREZXBlbmRlbmNpZXMiLCJpc1dlYnBhY2s0IiwiaG9va3MiLCJmZHMiLCJjZHMiLCJsZW5ndGgiLCJjb25jYXQiLCJFeHRXZWJwYWNrUGx1Z2luIiwiY29uc3RydWN0b3IiLCJvcHRpb25zIiwicmVxdWlyZSIsImRlZmF1bHRzIiwicHJvY2VzcyIsImFwcGx5IiwiY29tcGlsZXIiLCJ3ZWJwYWNrVmVyc2lvbiIsInVuZGVmaW5lZCIsInBsdWdpblBhdGgiLCJfX2Rpcm5hbWUiLCJwbHVnaW5Qa2ciLCJleGlzdHNTeW5jIiwiSlNPTiIsInBhcnNlIiwicmVhZEZpbGVTeW5jIiwicGx1Z2luVmVyc2lvbiIsInZlcnNpb24iLCJleHRQYXRoIiwiZXh0UGtnIiwiZXh0VmVyc2lvbiIsInNlbmNoYSIsImNtZFBhdGgiLCJjbWRQa2ciLCJjbWRWZXJzaW9uIiwidmVyc2lvbl9mdWxsIiwic3Rkb3V0IiwiY3Vyc29yVG8iLCJjb25zb2xlIiwibG9nIiwiYWZ0ZXJDb21waWxlIiwidGFwIiwiZm9yRWFjaCIsImZpbGUiLCJhZGQiLCJjb250ZXh0IiwicGx1Z2luIiwiY2IiLCJtZSIsImVtaXQiLCJ0YXBBc3luYyIsIndhdGNoZWRGaWxlcyIsImVyciIsImVycm5vIiwiZG9CdWlsZCIsImxhc3RNaWxsaXNlY29uZHMiLCJzdGF0U3luYyIsIm10aW1lTXMiLCJpbmRleE9mIiwiRGF0ZSIsImdldFRpbWUiLCJjdXJyZW50TnVtRmlsZXMiLCJmaWxlc291cmNlIiwiYXNzZXRzIiwic291cmNlIiwic2l6ZSIsImxhc3ROdW1GaWxlcyIsImJ1aWxkQXN5bmMiLCJwYXJtcyIsImV4ZWN1dGVBc3luYyIsInRoZW4iLCJmaWxlbGlzdCIsInJlZnJlc2giXSwibWFwcGluZ3MiOiI7O0FBQUEsT0FBT0EsS0FBUCxNQUFrQixPQUFsQjtBQUNBLE9BQU9DLElBQVAsTUFBaUIsTUFBakI7QUFDQSxPQUFPQyxFQUFQLE1BQWUsSUFBZjtBQUNBLE9BQU9DLGVBQVAsTUFBNEIsY0FBNUI7QUFDQSxPQUFPQyxJQUFQLE1BQWlCLGFBQWpCO0FBQ0EsT0FBT0MsTUFBUCxNQUFtQixTQUFuQjtBQUNBLFNBQVNDLE9BQVQsUUFBd0IsTUFBeEI7QUFDQSxPQUFPQyxpQkFBUCxNQUE4Qix3QkFBOUI7QUFDQSxNQUFNQyxNQUFPLEdBQUVSLE1BQU1TLEtBQU4sQ0FBWSxVQUFaLENBQXdCLHVCQUF2Qzs7QUFFQSxTQUFTQyxxQkFBVCxDQUErQkMsV0FBL0IsRUFBNENDLEtBQTVDLEVBQW1EQyxJQUFuRCxFQUF5REMsR0FBekQsRUFBOEQ7QUFDNUQsUUFBTSxFQUFFQyxnQkFBRixFQUFvQkMsbUJBQXBCLEtBQTRDTCxXQUFsRDtBQUNBLFFBQU1NLGFBQWFOLFlBQVlPLEtBQS9CO0FBQ0EsTUFBSUMsTUFBTUYsYUFBYSxDQUFDLEdBQUdGLGdCQUFKLENBQWIsR0FBcUNBLGdCQUEvQztBQUNBLE1BQUlLLE1BQU1ILGFBQWEsQ0FBQyxHQUFHRCxtQkFBSixDQUFiLEdBQXdDQSxtQkFBbEQ7QUFDQSxNQUFJSCxLQUFLUSxNQUFMLEdBQWMsQ0FBbEIsRUFBcUI7QUFDbkJELFVBQU1oQixLQUFLZ0IsSUFBSUUsTUFBSixDQUFXVCxJQUFYLENBQUwsQ0FBTjtBQUNEO0FBQ0QsU0FBTztBQUNMRSxzQkFBa0JJLEdBRGI7QUFFTEgseUJBQXFCSTtBQUZoQixHQUFQO0FBSUQ7O0FBRUQsZUFBZSxNQUFNRyxnQkFBTixDQUF1QjtBQUNwQztBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBQyxjQUFZQyxVQUFVLEVBQXRCLEVBQTBCO0FBQ3hCdEIs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QUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7O0FBaFBvQzs7QUEyUHBDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQUdGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0k7QUFDQTtBQUNBOztBQUVKOzs7QUFNUTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJpbmRleC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJ1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCB2YWxpZGF0ZU9wdGlvbnMgZnJvbSAnc2NoZW1hLXV0aWxzJztcbmltcG9ydCB1bmlxIGZyb20gJ2xvZGFzaC51bmlxJztcbmltcG9ydCBpc0dsb2IgZnJvbSAnaXMtZ2xvYic7XG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgcmVjdXJzaXZlUmVhZFN5bmMgZnJvbSAncmVjdXJzaXZlLXJlYWRkaXItc3luYyc7XG5jb25zdCBhcHAgPSBgJHtjaGFsay5ncmVlbign4oS5IO+9omV4dO+9ozonKX0gZXh0LXdlYnBhY2stcGx1Z2luOiBgO1xuXG5mdW5jdGlvbiBnZXRGaWxlQW5kQ29udGV4dERlcHMoY29tcGlsYXRpb24sIGZpbGVzLCBkaXJzLCBjd2QpIHtcbiAgY29uc3QgeyBmaWxlRGVwZW5kZW5jaWVzLCBjb250ZXh0RGVwZW5kZW5jaWVzIH0gPSBjb21waWxhdGlvbjtcbiAgY29uc3QgaXNXZWJwYWNrNCA9IGNvbXBpbGF0aW9uLmhvb2tzO1xuICBsZXQgZmRzID0gaXNXZWJwYWNrNCA/IFsuLi5maWxlRGVwZW5kZW5jaWVzXSA6IGZpbGVEZXBlbmRlbmNpZXM7XG4gIGxldCBjZHMgPSBpc1dlYnBhY2s0ID8gWy4uLmNvbnRleHREZXBlbmRlbmNpZXNdIDogY29udGV4dERlcGVuZGVuY2llcztcbiAgaWYgKGRpcnMubGVuZ3RoID4gMCkge1xuICAgIGNkcyA9IHVuaXEoY2RzLmNvbmNhdChkaXJzKSk7XG4gIH1cbiAgcmV0dXJuIHtcbiAgICBmaWxlRGVwZW5kZW5jaWVzOiBmZHMsXG4gICAgY29udGV4dERlcGVuZGVuY2llczogY2RzLFxuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBFeHRXZWJwYWNrUGx1Z2luIHtcbiAgLy8gc3RhdGljIGRlZmF1bHRzID0ge1xuICAvLyAgIGN3ZDogcHJvY2Vzcy5jd2QoKSxcbiAgLy8gICBmaWxlczogW10sXG4gIC8vICAgZGlyczogWycuL2FwcCddLFxuICAvLyB9O1xuXG4gIGNvbnN0cnVjdG9yKG9wdGlvbnMgPSB7fSkge1xuICAgIHZhbGlkYXRlT3B0aW9ucyhyZXF1aXJlKCcuLi9vcHRpb25zLmpzb24nKSwgb3B0aW9ucywgJ0V4dHJhV2F0Y2hXZWJwYWNrUGx1Z2luJyk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmVcbiAgICB0aGlzLm9wdGlvbnMgPSB7IC4uLkV4dFdlYnBhY2tQbHVnaW4uZGVmYXVsdHMsIC4uLm9wdGlvbnMgfTtcblxuICAgIHZhciBkZWZhdWx0cyA9IHtcbiAgICAgIGN3ZDogcHJvY2Vzcy5jd2QoKSxcbiAgICAgIGZpbGVzOiBbXSxcbiAgICAgIGRpcnM6IFsnLi9hcHAnXSxcbiAgICB9XG5cbi8vICAgIHRoaXMub3B0aW9ucyA9IHsgLi4uZGVmYXVsdHMsIC4uLm9wdGlvbnMgfTtcblxuXG5cbiAgfVxuXG4gIGFwcGx5KGNvbXBpbGVyKSB7XG5cbiAgICBpZiAodGhpcy53ZWJwYWNrVmVyc2lvbiA9PSB1bmRlZmluZWQpIHtcbiAgICAgIHZhciBwbHVnaW5QYXRoID0gcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwnLi4nKVxuICAgICAgdmFyIHBsdWdpblBrZyA9IChmcy5leGlzdHNTeW5jKHBsdWdpblBhdGgrJy9wYWNrYWdlLmpzb24nKSAmJiBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhwbHVnaW5QYXRoKycvcGFja2FnZS5qc29uJywgJ3V0Zi04JykpIHx8IHt9KTtcbiAgICAgIHZhciBwbHVnaW5WZXJzaW9uID0gcGx1Z2luUGtnLnZlcnNpb25cbiAgXG4gICAgICB2YXIgZXh0UGF0aCA9IHBhdGgucmVzb2x2ZShwbHVnaW5QYXRoLCcuLi9leHQnKVxuICAgICAgdmFyIGV4dFBrZyA9IChmcy5leGlzdHNTeW5jKGV4dFBhdGgrJy9wYWNrYWdlLmpzb24nKSAmJiBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhleHRQYXRoKycvcGFja2FnZS5qc29uJywgJ3V0Zi04JykpIHx8IHt9KTtcbiAgICAgIHZhciBleHRWZXJzaW9uID0gZXh0UGtnLnNlbmNoYS52ZXJzaW9uXG5cbiAgICAgIHZhciBjbWRQYXRoID0gcGF0aC5yZXNvbHZlKHBsdWdpblBhdGgsJy4uL3NlbmNoYS1jbWQnKVxuICAgICAgdmFyIGNtZFBrZyA9IChmcy5leGlzdHNTeW5jKGNtZFBhdGgrJy9wYWNrYWdlLmpzb24nKSAmJiBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhjbWRQYXRoKycvcGFja2FnZS5qc29uJywgJ3V0Zi04JykpIHx8IHt9KTtcbiAgICAgIHZhciBjbWRWZXJzaW9uID0gY21kUGtnLnZlcnNpb25fZnVsbFxuXG4gICAgICBjb25zdCBpc1dlYnBhY2s0ID0gY29tcGlsZXIuaG9va3M7XG4gICAgICBpZiAoaXNXZWJwYWNrNCkge3RoaXMud2VicGFja1ZlcnNpb24gPSAnSVMgd2VicGFjayA0J31cbiAgICAgIGVsc2Uge3RoaXMud2VicGFja1ZlcnNpb24gPSAnTk9UIHdlYnBhY2sgNCd9XG4gICAgICBwcm9jZXNzLnN0ZG91dC5jdXJzb3JUbygwKTtjb25zb2xlLmxvZyhhcHAgKyAndicgKyBwbHVnaW5WZXJzaW9uICsgJywgRXh0IEpTIHYnICsgZXh0VmVyc2lvbiArICcsIFNlbmNoYSBDbWQgdicgKyBjbWRWZXJzaW9uICsgJywgJyArIHRoaXMud2VicGFja1ZlcnNpb24pXG4gICAgfVxuXG4gICAgbGV0IHsgZmlsZXMsIGRpcnMgfSA9IHRoaXMub3B0aW9ucztcbiAgICBjb25zdCB7IGN3ZCB9ID0gdGhpcy5vcHRpb25zO1xuICAgIGZpbGVzID0gdHlwZW9mIGZpbGVzID09PSAnc3RyaW5nJyA/IFtmaWxlc10gOiBmaWxlcztcbiAgICBkaXJzID0gdHlwZW9mIGRpcnMgPT09ICdzdHJpbmcnID8gW2RpcnNdIDogZGlycztcblxuICAgIGlmIChjb21waWxlci5ob29rcykge1xuICAgICAgY29tcGlsZXIuaG9va3MuYWZ0ZXJDb21waWxlLnRhcCgnZXh0LWFmdGVyLWNvbXBpbGUnLCAoY29tcGlsYXRpb24pID0+IHtcbiAgICAgICAgcHJvY2Vzcy5zdGRvdXQuY3Vyc29yVG8oMCk7Y29uc29sZS5sb2coYXBwICsgJ2V4dC1hZnRlci1jb21waWxlJylcbiAgICAgICAgY29uc3Qge1xuICAgICAgICAgIGZpbGVEZXBlbmRlbmNpZXMsXG4gICAgICAgICAgY29udGV4dERlcGVuZGVuY2llcyxcbiAgICAgICAgfSA9IGdldEZpbGVBbmRDb250ZXh0RGVwcyhjb21waWxhdGlvbiwgZmlsZXMsIGRpcnMsIGN3ZCk7XG4gICAgICAgIGlmIChmaWxlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgZmlsZURlcGVuZGVuY2llcy5mb3JFYWNoKChmaWxlKSA9PiB7XG4gICAgICAgICAgICBjb21waWxhdGlvbi5maWxlRGVwZW5kZW5jaWVzLmFkZChyZXNvbHZlKGZpbGUpKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGlycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgY29udGV4dERlcGVuZGVuY2llcy5mb3JFYWNoKChjb250ZXh0KSA9PiB7XG4gICAgICAgICAgICBjb21waWxhdGlvbi5jb250ZXh0RGVwZW5kZW5jaWVzLmFkZChjb250ZXh0KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbXBpbGVyLnBsdWdpbignYWZ0ZXItY29tcGlsZScsIChjb21waWxhdGlvbiwgY2IpID0+IHtcbiAgICAgICAgY29uc29sZS5sb2coYXBwICsgJ2FmdGVyLWNvbXBpbGUnKVxuICAgICAgICBjb25zdCB7XG4gICAgICAgICAgZmlsZURlcGVuZGVuY2llcyxcbiAgICAgICAgICBjb250ZXh0RGVwZW5kZW5jaWVzLFxuICAgICAgICB9ID0gZ2V0RmlsZUFuZENvbnRleHREZXBzKGNvbXBpbGF0aW9uLCBmaWxlcywgZGlycywgY3dkKTtcbiAgICAgICAgaWYgKGZpbGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBjb21waWxhdGlvbi5maWxlRGVwZW5kZW5jaWVzID0gZmlsZURlcGVuZGVuY2llczsgLy8gZXNsaW50LWRpc2FibGUtbGluZVxuICAgICAgICB9XG4gICAgICAgIGlmIChkaXJzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBjb21waWxhdGlvbi5jb250ZXh0RGVwZW5kZW5jaWVzID0gY29udGV4dERlcGVuZGVuY2llczsgLy8gZXNsaW50LWRpc2FibGUtbGluZVxuICAgICAgICB9XG4gICAgICAgIGNiKClcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmIChjb21waWxlci5ob29rcykge1xuICAgICAgdmFyIG1lID0gdGhpc1xuICAgICAgY29tcGlsZXIuaG9va3MuZW1pdC50YXBBc3luYygnZXh0LWVtaXQtYXN5bmMnLCBmdW5jdGlvbiAoY29tcGlsYXRpb24sIGNiKSB7XG4gICAgICAgIHByb2Nlc3Muc3Rkb3V0LmN1cnNvclRvKDApO2NvbnNvbGUubG9nKGFwcCArICdleHQtZW1pdC1hc3luYycpXG5cbiAgICAgICAgdmFyIHdhdGNoZWRGaWxlcz1bXVxuICAgICAgICB0cnkge3dhdGNoZWRGaWxlcyA9IHJlY3Vyc2l2ZVJlYWRTeW5jKCcuL2FwcCcpfSBcbiAgICAgICAgY2F0Y2goZXJyKSB7aWYoZXJyLmVycm5vID09PSAzNCl7Y29uc29sZS5sb2coJ1BhdGggZG9lcyBub3QgZXhpc3QnKTt9IGVsc2Uge3Rocm93IGVycjt9fVxuXG4gICAgICAgIHZhciBkb0J1aWxkID0gZmFsc2VcbiAgICAgICAgZm9yICh2YXIgZmlsZSBpbiB3YXRjaGVkRmlsZXMpIHtcbiAgICAgICAgICBpZiAobWUubGFzdE1pbGxpc2Vjb25kcyA8IGZzLnN0YXRTeW5jKHdhdGNoZWRGaWxlc1tmaWxlXSkubXRpbWVNcykge1xuICAgICAgICAgICAgaWYgKHdhdGNoZWRGaWxlc1tmaWxlXS5pbmRleE9mKFwic2Nzc1wiKSAhPSAtMSkge2RvQnVpbGQ9dHJ1ZTticmVhazt9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIG1lLmxhc3RNaWxsaXNlY29uZHMgPSAobmV3IERhdGUpLmdldFRpbWUoKVxuXG4gICAgICAgIHZhciBjdXJyZW50TnVtRmlsZXMgPSB3YXRjaGVkRmlsZXMubGVuZ3RoXG4gICAgICAgIHZhciBmaWxlc291cmNlID0gJ3RoaXMgZmlsZSBlbmFibGVzIGNsaWVudCByZWxvYWQnXG4gICAgICAgIGNvbXBpbGF0aW9uLmFzc2V0c1tjdXJyZW50TnVtRmlsZXMgKyAnRmlsZXNVbmRlckFwcEZvbGRlci5tZCddID0ge1xuICAgICAgICAgIHNvdXJjZTogZnVuY3Rpb24oKSB7cmV0dXJuIGZpbGVzb3VyY2V9LFxuICAgICAgICAgIHNpemU6IGZ1bmN0aW9uKCkge3JldHVybiBmaWxlc291cmNlLmxlbmd0aH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjdXJyZW50TnVtRmlsZXMgIT0gbWUubGFzdE51bUZpbGVzIHx8IGRvQnVpbGQpIHtcbiAgICAgICAgICBtZS5sYXN0TnVtRmlsZXMgPSBjdXJyZW50TnVtRmlsZXNcbiAgICAgICAgICB2YXIgYnVpbGRBc3luYyA9IHJlcXVpcmUoJ0BleHRqcy9leHQtYnVpbGQvYXBwL2J1aWxkQXN5bmMuanMnKVxuICAgICAgICAgIHZhciBvcHRpb25zID0ge3Bhcm1zOiBbJ2FwcCcsJ2J1aWxkJywnZGV2ZWxvcG1lbnQnXX1cbiAgICAgICAgICBuZXcgYnVpbGRBc3luYyhvcHRpb25zKS5leGVjdXRlQXN5bmMoKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY2IoKVxuICAgICAgICAgIH0pXG4gICAgICAgICAgXG4gICAgICAgICAgLy8gdmFyIGJ1aWxkID0gcmVxdWlyZSgnQGV4dGpzL2V4dC1idWlsZC9hcHAvYnVpbGQuanMnKVxuICAgICAgICAgIC8vIG5ldyBidWlsZCh7fSlcbiAgICAgICAgICAvL3ZhciByZWZyZXNoID0gcmVxdWlyZSgnQGV4dGpzL2V4dC1idWlsZC9hcHAvcmVmcmVzaC5qcycpXG4gICAgICAgICAgLy9uZXcgcmVmcmVzaCh7fSlcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBtZS5sYXN0TnVtRmlsZXMgPSBjdXJyZW50TnVtRmlsZXNcbiAgICAgICAgICBjb25zb2xlLmxvZyhhcHAgKyAnY2FsbCB0byBleHQtYnVpbGQgbm90IG5lZWRlZCwgbm8gbmV3IGZpbGVzJylcbiAgICAgICAgICBjYigpXG4gICAgICAgIH1cbiAgICAgIH0pXG5cblxuLy8gICAgICBjb21waWxlci5ob29rcy5lbWl0LnRhcCgnZXh0LWVtaXQnLCAoY29tcGlsYXRpb24pID0+IHtcbi8vICAgICAgICBwcm9jZXNzLnN0ZG91dC5jdXJzb3JUbygwKTtjb25zb2xlLmxvZyhhcHAgKyAnZXh0LWVtaXQnKVxuXG4gICAgICAvLyAgIHZhciB3YXRjaGVkRmlsZXM9W11cbiAgICAgIC8vICAgdHJ5IHt3YXRjaGVkRmlsZXMgPSByZWN1cnNpdmVSZWFkU3luYygnLi9hcHAnKX0gXG4gICAgICAvLyAgIGNhdGNoKGVycikge2lmKGVyci5lcnJubyA9PT0gMzQpe2NvbnNvbGUubG9nKCdQYXRoIGRvZXMgbm90IGV4aXN0Jyk7fSBlbHNlIHt0aHJvdyBlcnI7fX1cblxuICAgICAgLy8gICB2YXIgZG9CdWlsZCA9IGZhbHNlXG4gICAgICAvLyAgIGZvciAodmFyIGZpbGUgaW4gd2F0Y2hlZEZpbGVzKSB7XG4gICAgICAvLyAgICAgaWYgKHRoaXMubGFzdE1pbGxpc2Vjb25kcyA8IGZzLnN0YXRTeW5jKHdhdGNoZWRGaWxlc1tmaWxlXSkubXRpbWVNcykge1xuICAgICAgLy8gICAgICAgaWYgKHdhdGNoZWRGaWxlc1tmaWxlXS5pbmRleE9mKFwic2Nzc1wiKSAhPSAtMSkge2RvQnVpbGQ9dHJ1ZTticmVhazt9XG4gICAgICAvLyAgICAgfVxuICAgICAgLy8gICB9XG4gICAgICAvLyAgIHRoaXMubGFzdE1pbGxpc2Vjb25kcyA9IChuZXcgRGF0ZSkuZ2V0VGltZSgpXG5cbiAgICAgIC8vICAgdmFyIGN1cnJlbnROdW1GaWxlcyA9IHdhdGNoZWRGaWxlcy5sZW5ndGhcbiAgICAgIC8vICAgdmFyIGZpbGVzb3VyY2UgPSAndGhpcyBmaWxlIGVuYWJsZXMgY2xpZW50IHJlbG9hZCdcbiAgICAgIC8vICAgY29tcGlsYXRpb24uYXNzZXRzW2N1cnJlbnROdW1GaWxlcyArICdGaWxlc1VuZGVyQXBwRm9sZGVyLm1kJ10gPSB7XG4gICAgICAvLyAgICAgc291cmNlOiBmdW5jdGlvbigpIHtyZXR1cm4gZmlsZXNvdXJjZX0sXG4gICAgICAvLyAgICAgc2l6ZTogZnVuY3Rpb24oKSB7cmV0dXJuIGZpbGVzb3VyY2UubGVuZ3RofVxuICAgICAgLy8gICB9XG5cbiAgICAgIC8vICAgaWYgKGN1cnJlbnROdW1GaWxlcyAhPSB0aGlzLmxhc3ROdW1GaWxlcyB8fCBkb0J1aWxkKSB7XG4gICAgICAvLyAgICAgdmFyIGJ1aWxkID0gcmVxdWlyZSgnQGV4dGpzL2V4dC1idWlsZC9hcHAvYnVpbGQuanMnKVxuICAgICAgLy8gICAgIG5ldyBidWlsZCh7fSlcbiAgICAgIC8vICAgICAvL3ZhciByZWZyZXNoID0gcmVxdWlyZSgnQGV4dGpzL3NlbmNoYS1idWlsZC9hcHAvcmVmcmVzaC5qcycpXG4gICAgICAvLyAgICAgLy9uZXcgcmVmcmVzaCh7fSlcbiAgICAgIC8vICAgfVxuICAgICAgLy8gICBlbHNlIHtcbiAgICAgIC8vICAgICBjb25zb2xlLmxvZyhhcHAgKyAnQ2FsbCB0byBTZW5jaGEgQnVpbGQgbm90IG5lZWRlZCwgbm8gbmV3IGZpbGVzJylcbiAgICAgIC8vICAgfVxuICAgICAgLy8gICB0aGlzLmxhc3ROdW1GaWxlcyA9IGN1cnJlbnROdW1GaWxlc1xuXG4vLyAgICAgIH0pXG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgY29tcGlsZXIucGx1Z2luKCdlbWl0JywgKGNvbXBpbGF0aW9uLCBjYikgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZyhhcHAgKyAnZW1pdCcpXG4gICAgICAgIHZhciBmaWxlbGlzdCA9ICd0aGlzIGZpbGUgZW5hYmxlcyBjbGllbnQgcmVsb2FkJ1xuICAgICAgICBjb21waWxhdGlvbi5hc3NldHNbJ0ZvclJlbG9hZC5tZCddID0ge1xuICAgICAgICAgIHNvdXJjZTogZnVuY3Rpb24oKSB7cmV0dXJuIGZpbGVsaXN0fSxcbiAgICAgICAgICBzaXplOiBmdW5jdGlvbigpIHtyZXR1cm4gZmlsZWxpc3QubGVuZ3RofVxuICAgICAgICB9XG4gICAgICAgIHZhciByZWZyZXNoID0gcmVxdWlyZSgnQGV4dGpzL2V4dC1idWlsZC9hcHAvcmVmcmVzaC5qcycpXG4gICAgICAgIG5ldyByZWZyZXNoKHt9KVxuXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdUSElTIElTIElUJylcbiAgICAgICAgLy8gdmFyIGJ1aWxkQXN5bmMgPSByZXF1aXJlKCdAZXh0anMvZXh0LWJ1aWxkL2FwcC9idWlsZEFzeW5jLmpzJylcbiAgICAgICAgLy8gY29uc29sZS5sb2coYnVpbGRBc3luYylcbiAgICAgICAgLy8gbmV3IGJ1aWxkQXN5bmMoKS5leGVjdXRlQXN5bmMoKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyAgIGNvbnNvbGUubG9nKCd0aGVuIGNhbGwnKTtcbiAgICAgICAgLy8gICBjYigpO1xuICAgICAgICAvLyB9KVxuXG5cbiAgICAgICAgLy9jYigpXG4gICAgICAgIC8vdGhpcy5lbWl0U3RhdHMuYmluZCh0aGlzKVxuXG5cblxuICAgICAgfSlcbiAgICB9XG5cbiAgfVxuXG5cbiAgLy8gZW1pdFN0YXRzKGN1ckNvbXBpbGVyLCBjYWxsYmFjaykge1xuICAvLyAgIC8vIEdldCBzdGF0cy5cbiAgLy8gICAvLyAqKk5vdGUqKjogSW4gZnV0dXJlLCBjb3VsZCBwYXNzIHNvbWV0aGluZyBsaWtlIGB7IHNob3dBc3NldHM6IHRydWUgfWBcbiAgLy8gICAvLyB0byB0aGUgYGdldFN0YXRzKClgIGZ1bmN0aW9uIGZvciBtb3JlIGxpbWl0ZWQgb2JqZWN0IHJldHVybmVkLlxuICAvLyAgIGxldCBzdGF0cyA9IGN1ckNvbXBpbGVyLmdldFN0YXRzKCkudG9Kc29uKCk7XG4gIFxuICAvLyAgIC8vIEZpbHRlciB0byBmaWVsZHMuXG4gIC8vICAgaWYgKHRoaXMub3B0cy5maWVsZHMpIHtcbiAgLy8gICAgIHN0YXRzID0gdGhpcy5vcHRzLmZpZWxkcy5yZWR1Y2UoKG1lbW8sIGtleSkgPT4ge1xuICAvLyAgICAgICBtZW1vW2tleV0gPSBzdGF0c1trZXldO1xuICAvLyAgICAgICByZXR1cm4gbWVtbztcbiAgLy8gICAgIH0sIHt9KTtcbiAgLy8gICB9XG4gIFxuICAvLyAgIC8vIFRyYW5zZm9ybSB0byBzdHJpbmcuXG4gIC8vICAgbGV0IGVycjtcbiAgLy8gICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKClcbiAgXG4gIC8vICAgICAvLyBUcmFuc2Zvcm0uXG4gIC8vICAgICAudGhlbigoKSA9PiB0aGlzLm9wdHMudHJhbnNmb3JtKHN0YXRzLCB7XG4gIC8vICAgICAgIGNvbXBpbGVyOiBjdXJDb21waWxlclxuICAvLyAgICAgfSkpXG4gIC8vICAgICAuY2F0Y2goKGUpID0+IHsgZXJyID0gZTsgfSlcbiAgXG4gIC8vICAgICAvLyBGaW5pc2ggdXAuXG4gIC8vICAgICAudGhlbigoc3RhdHNTdHIpID0+IHtcbiAgLy8gICAgICAgLy8gSGFuZGxlIGVycm9ycy5cbiAgLy8gICAgICAgaWYgKGVycikge1xuICAvLyAgICAgICAgIGN1ckNvbXBpbGVyLmVycm9ycy5wdXNoKGVycik7XG4gIC8vICAgICAgICAgaWYgKGNhbGxiYWNrKSB7IHJldHVybiB2b2lkIGNhbGxiYWNrKGVycik7IH1cbiAgLy8gICAgICAgICB0aHJvdyBlcnI7XG4gIC8vICAgICAgIH1cbiAgXG4gIC8vICAgICAgIC8vIEFkZCB0byBhc3NldHMuXG4gIC8vICAgICAgIGN1ckNvbXBpbGVyLmFzc2V0c1t0aGlzLm9wdHMuZmlsZW5hbWVdID0ge1xuICAvLyAgICAgICAgIHNvdXJjZSgpIHtcbiAgLy8gICAgICAgICAgIHJldHVybiBzdGF0c1N0cjtcbiAgLy8gICAgICAgICB9LFxuICAvLyAgICAgICAgIHNpemUoKSB7XG4gIC8vICAgICAgICAgICByZXR1cm4gc3RhdHNTdHIubGVuZ3RoO1xuICAvLyAgICAgICAgIH1cbiAgLy8gICAgICAgfTtcbiAgXG4gIC8vICAgICAgIGlmIChjYWxsYmFjaykgeyByZXR1cm4gdm9pZCBjYWxsYmFjaygpOyB9XG4gIC8vICAgICB9KTtcbiAgLy8gfVxuICBcblxuXG59XG5cblxuXG5cblxuXG4gIC8vIGlmIChmaWxlcy5sZW5ndGggPiAwKSB7XG4gIC8vICAgZmlsZXMuZm9yRWFjaCgocGF0dGVybikgPT4ge1xuICAvLyAgICAgbGV0IGYgPSBwYXR0ZXJuO1xuICAvLyAgICAgaWYgKGlzR2xvYihwYXR0ZXJuKSkge1xuICAvLyAgICAgICBmID0gZ2xvYi5zeW5jKHBhdHRlcm4sIHtcbiAgLy8gICAgICAgICBjd2QsXG4gIC8vICAgICAgICAgZG90OiB0cnVlLFxuICAvLyAgICAgICAgIGFic29sdXRlOiB0cnVlLFxuICAvLyAgICAgICB9KTtcbiAgLy8gICAgIH1cbiAgLy8gICAgIGZkcyA9IGZkcy5jb25jYXQoZik7XG4gIC8vICAgfSk7XG4gIC8vICAgZmRzID0gdW5pcShmZHMpO1xuICAvLyB9XG5cblxuLy8gZnVuY3Rpb24gaG9va19zdGRvdXQoY2FsbGJhY2spIHtcbi8vICAgdmFyIG9sZF93cml0ZSA9IHByb2Nlc3Muc3Rkb3V0LndyaXRlXG4vLyAgIGNvbnNvbGUubG9nKCdpbiBob29rJylcbi8vICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUgPSAoZnVuY3Rpb24od3JpdGUpIHtcbi8vICAgICAgIHJldHVybiBmdW5jdGlvbihzdHJpbmcsIGVuY29kaW5nLCBmZCkge1xuLy8gICAgICAgICAgIHdyaXRlLmFwcGx5KHByb2Nlc3Muc3Rkb3V0LCBhcmd1bWVudHMpXG4vLyAgICAgICAgICAgY2FsbGJhY2soc3RyaW5nLCBlbmNvZGluZywgZmQpXG4vLyAgICAgICB9XG4vLyAgIH0pKHByb2Nlc3Muc3Rkb3V0LndyaXRlKVxuXG4vLyAgIHJldHVybiBmdW5jdGlvbigpIHtcbi8vICAgICAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlID0gb2xkX3dyaXRlXG4vLyAgICAgICBjb25zb2xlLmxvZygnaW4gdW5ob29rJylcbi8vICAgICB9XG4vLyB9XG4gICAgLy8gdGhpcy51bmhvb2sgPSBob29rX3N0ZG91dChmdW5jdGlvbihzdHJpbmcsIGVuY29kaW5nLCBmZCkge1xuICAgIC8vICAgY29uc29sZS5sb2coJ3N0ZG91dDogJyArIHN0cmluZylcbiAgICAvLyB9KVxuXG4vLyAgICAgICAgdGhpcy51bmhvb2soKVxuXG5cblxuXG5cbiAgICAgICAgLy8gdmFyIGZpbGVsaXN0ID0gJ0luIHRoaXMgYnVpbGQ6XFxuXFxuJztcblxuICAgICAgICAvLyAvLyBMb29wIHRocm91Z2ggYWxsIGNvbXBpbGVkIGFzc2V0cyxcbiAgICAgICAgLy8gLy8gYWRkaW5nIGEgbmV3IGxpbmUgaXRlbSBmb3IgZWFjaCBmaWxlbmFtZS5cbiAgICAgICAgLy8gZm9yICh2YXIgZmlsZW5hbWUgaW4gY29tcGlsYXRpb24uYXNzZXRzKSB7XG4gICAgICAgIC8vICAgZmlsZWxpc3QgKz0gKCctICcrIGZpbGVuYW1lICsnXFxuJyk7XG4gICAgICAgIC8vIH1cbiAgICBcbiAgICAgICAgLy8gLy8gSW5zZXJ0IHRoaXMgbGlzdCBpbnRvIHRoZSB3ZWJwYWNrIGJ1aWxkIGFzIGEgbmV3IGZpbGUgYXNzZXQ6XG4gICAgICAgIC8vIGNvbXBpbGF0aW9uLmFzc2V0c1snZmlsZWxpc3QubWQnXSA9IHtcbiAgICAgICAgLy8gICBzb3VyY2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyAgICAgcmV0dXJuIGZpbGVsaXN0O1xuICAgICAgICAvLyAgIH0sXG4gICAgICAgIC8vICAgc2l6ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vICAgICByZXR1cm4gZmlsZWxpc3QubGVuZ3RoO1xuICAgICAgICAvLyAgIH1cbiAgICAgICAgLy8gfTtcblxuXG5cblxuXG4gICAgICAgIC8vIC8vdmFyIGQgPSBuZXcgRGF0ZSgpXG4gICAgICAgIC8vIHZhciBkID0gJ21qZydcbiAgICAgICAgLy8gdmFyIGZpbGVsaXN0ID0gJ0luIHRoaXMgYnVpbGQ6XFxuXFxuJyArIGQgKyAnXFxuXFxuJztcbiAgICAgICAgLy8gLy8gTG9vcCB0aHJvdWdoIGFsbCBjb21waWxlZCBhc3NldHMsXG4gICAgICAgIC8vIC8vIGFkZGluZyBhIG5ldyBsaW5lIGl0ZW0gZm9yIGVhY2ggZmlsZW5hbWUuXG4gICAgICAgIC8vIGZvciAodmFyIGZpbGVuYW1lIGluIGNvbXBpbGF0aW9uLmFzc2V0cykge1xuICAgICAgICAvLyAgIGZpbGVsaXN0ICs9ICgnLSAnKyBmaWxlbmFtZSArJ1xcbicpO1xuICAgICAgICAvLyB9XG4gICAgICAgIC8vIC8vIEluc2VydCB0aGlzIGxpc3QgaW50byB0aGUgd2VicGFjayBidWlsZCBhcyBhIG5ldyBmaWxlIGFzc2V0OlxuICAgICAgICAvLyBjb21waWxhdGlvbi5hc3NldHNbZCArICcubWQnXSA9IHtcbiAgICAgICAgLy8gICBzb3VyY2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyAgICAgcmV0dXJuIGZpbGVsaXN0O1xuICAgICAgICAvLyAgIH0sXG4gICAgICAgIC8vICAgc2l6ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vICAgICByZXR1cm4gZmlsZWxpc3QubGVuZ3RoO1xuICAgICAgICAvLyAgIH1cbiAgICAgICAgLy8gfTsiXX0=