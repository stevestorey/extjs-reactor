'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var npmScope = '@sencha';
var chalk = require('chalk');
var path = require('path');
var fs = require('fs');
var validateOptions = require('schema-utils');
var uniq = require('lodash.uniq');
var isGlob = require('is-glob');
var recursiveReadSync = require('recursive-readdir-sync');

var prefix = '';
var platform = require('os').platform();
if (platform == 'darwin') {
  prefix = '\u2139 \uFF62ext\uFF63:';
} else {
  prefix = 'i [ext]:';
}
var app = chalk.green(prefix) + ' ext-webpack-plugin: ';

function getFileAndContextDeps(compilation, files, dirs, cwd) {
  var fileDependencies = compilation.fileDependencies,
      contextDependencies = compilation.contextDependencies;

  var isWebpack4 = compilation.hooks;
  var fds = isWebpack4 ? [].concat(_toConsumableArray(fileDependencies)) : fileDependencies;
  var cds = isWebpack4 ? [].concat(_toConsumableArray(contextDependencies)) : contextDependencies;

  if (files.length > 0) {
    files.forEach(function (pattern) {
      var f = pattern;
      if (isGlob(pattern)) {
        f = glob.sync(pattern, {
          cwd: cwd,
          dot: true,
          absolute: true
        });
      }
      fds = fds.concat(f);
    });
    fds = uniq(fds);
  }

  if (dirs.length > 0) {
    cds = uniq(cds.concat(dirs));
  }
  return {
    fileDependencies: fds,
    contextDependencies: cds
  };
}

var ExtWebpackPlugin = function () {
  // static defaults = {
  //   cwd: process.cwd(),
  //   files: [],
  //   dirs: ['./app'],
  // };

  function ExtWebpackPlugin() {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : { profile: 'desktop', environment: 'development', verbose: 'no' };

    _classCallCheck(this, ExtWebpackPlugin);

    validateOptions(require('../options.json'), options, 'ExtraWatchWebpackPlugin'); // eslint-disable-line
    //this.options = { ...ExtWebpackPlugin.defaults, ...options };

    var defaults = {
      cwd: process.cwd(),
      files: ['./app.json'],
      dirs: ['./app']
    };

    this.options = _extends({}, defaults, options);
  }

  _createClass(ExtWebpackPlugin, [{
    key: 'apply',
    value: function apply(compiler) {

      if (this.webpackVersion == undefined) {
        var pluginPath = path.resolve(__dirname, '..');
        var pluginPkg = fs.existsSync(pluginPath + '/package.json') && JSON.parse(fs.readFileSync(pluginPath + '/package.json', 'utf-8')) || {};
        var pluginVersion = pluginPkg.version;

        var extPath = path.resolve(pluginPath, '../ext');
        var extPkg = fs.existsSync(extPath + '/package.json') && JSON.parse(fs.readFileSync(extPath + '/package.json', 'utf-8')) || {};
        var extVersion = extPkg.sencha.version;

        var cmdPath = path.resolve(pluginPath, '../cmd');
        var cmdPkg = fs.existsSync(cmdPath + '/package.json') && JSON.parse(fs.readFileSync(cmdPath + '/package.json', 'utf-8')) || {};
        var cmdVersion = cmdPkg.version_full;

        var isWebpack4 = compiler.hooks;
        if (isWebpack4) {
          this.webpackVersion = 'IS webpack 4';
        } else {
          this.webpackVersion = 'NOT webpack 4';
        }
        process.stdout.cursorTo(0);console.log(app + 'v' + pluginVersion + ', Ext JS v' + extVersion + ', Sencha Cmd v' + cmdVersion + ', ' + this.webpackVersion);
      }

      var _options = this.options,
          files = _options.files,
          dirs = _options.dirs;
      var cwd = this.options.cwd;

      files = typeof files === 'string' ? [files] : files;
      dirs = typeof dirs === 'string' ? [dirs] : dirs;

      if (compiler.hooks) {
        compiler.hooks.afterCompile.tap('ext-after-compile', function (compilation) {
          process.stdout.cursorTo(0);console.log(app + 'ext-after-compile');

          var _getFileAndContextDep = getFileAndContextDeps(compilation, files, dirs, cwd),
              fileDependencies = _getFileAndContextDep.fileDependencies,
              contextDependencies = _getFileAndContextDep.contextDependencies;

          if (files.length > 0) {
            fileDependencies.forEach(function (file) {
              //console.log(`${app}${path.resolve(file)} changed ${file}`)
              compilation.fileDependencies.add(path.resolve(file));
            });
          }
          if (dirs.length > 0) {
            contextDependencies.forEach(function (context) {
              compilation.contextDependencies.add(context);
            });
          }
        });
      } else {
        compiler.plugin('after-compile', function (compilation, cb) {
          console.log(app + 'after-compile');

          var _getFileAndContextDep2 = getFileAndContextDeps(compilation, files, dirs, cwd),
              fileDependencies = _getFileAndContextDep2.fileDependencies,
              contextDependencies = _getFileAndContextDep2.contextDependencies;

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

          if (me.lastMillisecondsAppJson < fs.statSync('./app.json').mtimeMs) {
            doBuild = true;
          }

          me.lastMilliseconds = new Date().getTime();
          me.lastMillisecondsAppJson = new Date().getTime();

          var currentNumFiles = watchedFiles.length;
          var filesource = 'this file enables client reload';
          compilation.assets[currentNumFiles + 'FilesUnderAppFolder.md'] = {
            source: function source() {
              return filesource;
            },
            size: function size() {
              return filesource.length;
            }
          };

          if (currentNumFiles != me.lastNumFiles || doBuild) {
            me.lastNumFiles = currentNumFiles;
            var buildAsync = require(npmScope + '/ext-build/app/buildAsync.js');
            var buildOptions = { parms: ['app', 'build', me.options.profile, me.options.environment, me.options.verbose] };
            new buildAsync(buildOptions).executeAsync().then(function () {
              cb();
            }, function (reason) {
              var prefixErr = '✖ [ext]:';
              var err = chalk.red(prefixErr) + ' ext-webpack-plugin: ';
              var errorString = err + ' ' + chalk.red(reason.error);
              compilation.errors.push(new Error(errorString));
              cb();
            });
          } else {
            me.lastNumFiles = currentNumFiles;
            console.log(app + 'call to ext-build not needed, no new files');
            cb();
          }
        });
      } else {
        compiler.plugin('emit', function (compilation, cb) {
          console.log(app + 'emit');
          var filelist = 'this file enables client reload';
          compilation.assets['ForReload.md'] = {
            source: function source() {
              return filelist;
            },
            size: function size() {
              return filelist.length;
            }
          };
          var refresh = require(npmScope + '/ext-build/app/refresh.js');
          new refresh({});

          // console.log('THIS IS IT')
          // var buildAsync = require(`${npmScope}/ext-build/app/buildAsync.js`)
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


  }]);

  return ExtWebpackPlugin;
}();

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


exports.default = ExtWebpackPlugin;
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9pbmRleC5qcyJdLCJuYW1lcyI6WyJucG1TY29wZSIsImNoYWxrIiwicmVxdWlyZSIsInBhdGgiLCJmcyIsInZhbGlkYXRlT3B0aW9ucyIsInVuaXEiLCJpc0dsb2IiLCJyZWN1cnNpdmVSZWFkU3luYyIsInByZWZpeCIsInBsYXRmb3JtIiwiYXBwIiwiZ3JlZW4iLCJnZXRGaWxlQW5kQ29udGV4dERlcHMiLCJjb21waWxhdGlvbiIsImZpbGVzIiwiZGlycyIsImN3ZCIsImZpbGVEZXBlbmRlbmNpZXMiLCJjb250ZXh0RGVwZW5kZW5jaWVzIiwiaXNXZWJwYWNrNCIsImhvb2tzIiwiZmRzIiwiY2RzIiwibGVuZ3RoIiwiZm9yRWFjaCIsInBhdHRlcm4iLCJmIiwiZ2xvYiIsInN5bmMiLCJkb3QiLCJhYnNvbHV0ZSIsImNvbmNhdCIsIkV4dFdlYnBhY2tQbHVnaW4iLCJvcHRpb25zIiwicHJvZmlsZSIsImVudmlyb25tZW50IiwidmVyYm9zZSIsImRlZmF1bHRzIiwicHJvY2VzcyIsImNvbXBpbGVyIiwid2VicGFja1ZlcnNpb24iLCJ1bmRlZmluZWQiLCJwbHVnaW5QYXRoIiwicmVzb2x2ZSIsIl9fZGlybmFtZSIsInBsdWdpblBrZyIsImV4aXN0c1N5bmMiLCJKU09OIiwicGFyc2UiLCJyZWFkRmlsZVN5bmMiLCJwbHVnaW5WZXJzaW9uIiwidmVyc2lvbiIsImV4dFBhdGgiLCJleHRQa2ciLCJleHRWZXJzaW9uIiwic2VuY2hhIiwiY21kUGF0aCIsImNtZFBrZyIsImNtZFZlcnNpb24iLCJ2ZXJzaW9uX2Z1bGwiLCJzdGRvdXQiLCJjdXJzb3JUbyIsImNvbnNvbGUiLCJsb2ciLCJhZnRlckNvbXBpbGUiLCJ0YXAiLCJmaWxlIiwiYWRkIiwiY29udGV4dCIsInBsdWdpbiIsImNiIiwibWUiLCJlbWl0IiwidGFwQXN5bmMiLCJ3YXRjaGVkRmlsZXMiLCJlcnIiLCJlcnJubyIsImRvQnVpbGQiLCJsYXN0TWlsbGlzZWNvbmRzIiwic3RhdFN5bmMiLCJtdGltZU1zIiwiaW5kZXhPZiIsImxhc3RNaWxsaXNlY29uZHNBcHBKc29uIiwiRGF0ZSIsImdldFRpbWUiLCJjdXJyZW50TnVtRmlsZXMiLCJmaWxlc291cmNlIiwiYXNzZXRzIiwic291cmNlIiwic2l6ZSIsImxhc3ROdW1GaWxlcyIsImJ1aWxkQXN5bmMiLCJidWlsZE9wdGlvbnMiLCJwYXJtcyIsImV4ZWN1dGVBc3luYyIsInRoZW4iLCJyZWFzb24iLCJwcmVmaXhFcnIiLCJyZWQiLCJlcnJvclN0cmluZyIsImVycm9yIiwiZXJyb3JzIiwicHVzaCIsIkVycm9yIiwiZmlsZWxpc3QiLCJyZWZyZXNoIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUFBLElBQU1BLFdBQVcsU0FBakI7QUFDQSxJQUFNQyxRQUFRQyxRQUFRLE9BQVIsQ0FBZDtBQUNBLElBQU1DLE9BQU9ELFFBQVEsTUFBUixDQUFiO0FBQ0EsSUFBTUUsS0FBS0YsUUFBUSxJQUFSLENBQVg7QUFDQSxJQUFNRyxrQkFBa0JILFFBQVEsY0FBUixDQUF4QjtBQUNBLElBQU1JLE9BQU9KLFFBQVEsYUFBUixDQUFiO0FBQ0EsSUFBTUssU0FBU0wsUUFBUSxTQUFSLENBQWY7QUFDQSxJQUFNTSxvQkFBb0JOLFFBQVEsd0JBQVIsQ0FBMUI7O0FBRUEsSUFBSU8sV0FBSjtBQUNBLElBQUlDLFdBQVdSLFFBQVEsSUFBUixFQUFjUSxRQUFkLEVBQWY7QUFDQSxJQUFJQSxZQUFZLFFBQWhCLEVBQTBCO0FBQ3hCRDtBQUNELENBRkQsTUFHSztBQUNIQTtBQUNEO0FBQ0QsSUFBSUUsTUFBTVYsTUFBTVcsS0FBTixDQUFZSCxNQUFaLElBQXNCLHVCQUFoQzs7QUFFQSxTQUFTSSxxQkFBVCxDQUErQkMsV0FBL0IsRUFBNENDLEtBQTVDLEVBQW1EQyxJQUFuRCxFQUF5REMsR0FBekQsRUFBOEQ7QUFBQSxNQUNwREMsZ0JBRG9ELEdBQ1ZKLFdBRFUsQ0FDcERJLGdCQURvRDtBQUFBLE1BQ2xDQyxtQkFEa0MsR0FDVkwsV0FEVSxDQUNsQ0ssbUJB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QkEzU2F6RSxnQiIsImZpbGUiOiJpbmRleC5qcyIsInNvdXJjZXNDb250ZW50IjpbImNvbnN0IG5wbVNjb3BlID0gJ0BzZW5jaGEnXG5jb25zdCBjaGFsayA9IHJlcXVpcmUoJ2NoYWxrJylcbmNvbnN0IHBhdGggPSByZXF1aXJlKCdwYXRoJylcbmNvbnN0IGZzID0gcmVxdWlyZSgnZnMnKVxuY29uc3QgdmFsaWRhdGVPcHRpb25zID0gcmVxdWlyZSgnc2NoZW1hLXV0aWxzJylcbmNvbnN0IHVuaXEgPSByZXF1aXJlKCdsb2Rhc2gudW5pcScpXG5jb25zdCBpc0dsb2IgPSByZXF1aXJlKCdpcy1nbG9iJylcbmNvbnN0IHJlY3Vyc2l2ZVJlYWRTeW5jID0gcmVxdWlyZSgncmVjdXJzaXZlLXJlYWRkaXItc3luYycpXG5cbnZhciBwcmVmaXggPSBgYFxudmFyIHBsYXRmb3JtID0gcmVxdWlyZSgnb3MnKS5wbGF0Zm9ybSgpXG5pZiAocGxhdGZvcm0gPT0gJ2RhcndpbicpIHtcbiAgcHJlZml4ID0gYOKEuSDvvaJleHTvvaM6YFxufVxuZWxzZSB7XG4gIHByZWZpeCA9IGBpIFtleHRdOmBcbn1cbnZhciBhcHAgPSBjaGFsay5ncmVlbihwcmVmaXgpICsgJyBleHQtd2VicGFjay1wbHVnaW46ICc7XG5cbmZ1bmN0aW9uIGdldEZpbGVBbmRDb250ZXh0RGVwcyhjb21waWxhdGlvbiwgZmlsZXMsIGRpcnMsIGN3ZCkge1xuICBjb25zdCB7IGZpbGVEZXBlbmRlbmNpZXMsIGNvbnRleHREZXBlbmRlbmNpZXMgfSA9IGNvbXBpbGF0aW9uO1xuICBjb25zdCBpc1dlYnBhY2s0ID0gY29tcGlsYXRpb24uaG9va3M7XG4gIGxldCBmZHMgPSBpc1dlYnBhY2s0ID8gWy4uLmZpbGVEZXBlbmRlbmNpZXNdIDogZmlsZURlcGVuZGVuY2llcztcbiAgbGV0IGNkcyA9IGlzV2VicGFjazQgPyBbLi4uY29udGV4dERlcGVuZGVuY2llc10gOiBjb250ZXh0RGVwZW5kZW5jaWVzO1xuICBcbiAgaWYgKGZpbGVzLmxlbmd0aCA+IDApIHtcbiAgICBmaWxlcy5mb3JFYWNoKChwYXR0ZXJuKSA9PiB7XG4gICAgICBsZXQgZiA9IHBhdHRlcm47XG4gICAgICBpZiAoaXNHbG9iKHBhdHRlcm4pKSB7XG4gICAgICAgIGYgPSBnbG9iLnN5bmMocGF0dGVybiwge1xuICAgICAgICAgIGN3ZCxcbiAgICAgICAgICBkb3Q6IHRydWUsXG4gICAgICAgICAgYWJzb2x1dGU6IHRydWUsXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgZmRzID0gZmRzLmNvbmNhdChmKTtcbiAgICB9KTtcbiAgICBmZHMgPSB1bmlxKGZkcyk7XG4gIH1cbiAgXG4gIGlmIChkaXJzLmxlbmd0aCA+IDApIHtcbiAgICBjZHMgPSB1bmlxKGNkcy5jb25jYXQoZGlycykpO1xuICB9XG4gIHJldHVybiB7XG4gICAgZmlsZURlcGVuZGVuY2llczogZmRzLFxuICAgIGNvbnRleHREZXBlbmRlbmNpZXM6IGNkcyxcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRXh0V2VicGFja1BsdWdpbiB7XG4gIC8vIHN0YXRpYyBkZWZhdWx0cyA9IHtcbiAgLy8gICBjd2Q6IHByb2Nlc3MuY3dkKCksXG4gIC8vICAgZmlsZXM6IFtdLFxuICAvLyAgIGRpcnM6IFsnLi9hcHAnXSxcbiAgLy8gfTtcblxuICBjb25zdHJ1Y3RvcihvcHRpb25zID0ge3Byb2ZpbGU6ICdkZXNrdG9wJywgZW52aXJvbm1lbnQ6ICdkZXZlbG9wbWVudCcsIHZlcmJvc2U6ICdubyd9ICkge1xuICAgIHZhbGlkYXRlT3B0aW9ucyhyZXF1aXJlKCcuLi9vcHRpb25zLmpzb24nKSwgb3B0aW9ucywgJ0V4dHJhV2F0Y2hXZWJwYWNrUGx1Z2luJyk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmVcbiAgICAvL3RoaXMub3B0aW9ucyA9IHsgLi4uRXh0V2VicGFja1BsdWdpbi5kZWZhdWx0cywgLi4ub3B0aW9ucyB9O1xuXG4gICAgdmFyIGRlZmF1bHRzID0ge1xuICAgICAgY3dkOiBwcm9jZXNzLmN3ZCgpLFxuICAgICAgZmlsZXM6IFsnLi9hcHAuanNvbiddLFxuICAgICAgZGlyczogWycuL2FwcCddLFxuICAgIH1cblxuICAgIHRoaXMub3B0aW9ucyA9IHsgLi4uZGVmYXVsdHMsIC4uLm9wdGlvbnMgfTtcbiAgfVxuXG4gIGFwcGx5KGNvbXBpbGVyKSB7XG5cbiAgICBpZiAodGhpcy53ZWJwYWNrVmVyc2lvbiA9PSB1bmRlZmluZWQpIHtcbiAgICAgIHZhciBwbHVnaW5QYXRoID0gcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwnLi4nKVxuICAgICAgdmFyIHBsdWdpblBrZyA9IChmcy5leGlzdHNTeW5jKHBsdWdpblBhdGgrJy9wYWNrYWdlLmpzb24nKSAmJiBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhwbHVnaW5QYXRoKycvcGFja2FnZS5qc29uJywgJ3V0Zi04JykpIHx8IHt9KTtcbiAgICAgIHZhciBwbHVnaW5WZXJzaW9uID0gcGx1Z2luUGtnLnZlcnNpb25cbiAgXG4gICAgICB2YXIgZXh0UGF0aCA9IHBhdGgucmVzb2x2ZShwbHVnaW5QYXRoLCcuLi9leHQnKVxuICAgICAgdmFyIGV4dFBrZyA9IChmcy5leGlzdHNTeW5jKGV4dFBhdGgrJy9wYWNrYWdlLmpzb24nKSAmJiBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhleHRQYXRoKycvcGFja2FnZS5qc29uJywgJ3V0Zi04JykpIHx8IHt9KTtcbiAgICAgIHZhciBleHRWZXJzaW9uID0gZXh0UGtnLnNlbmNoYS52ZXJzaW9uXG5cbiAgICAgIHZhciBjbWRQYXRoID0gcGF0aC5yZXNvbHZlKHBsdWdpblBhdGgsJy4uL2NtZCcpXG4gICAgICB2YXIgY21kUGtnID0gKGZzLmV4aXN0c1N5bmMoY21kUGF0aCsnL3BhY2thZ2UuanNvbicpICYmIEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKGNtZFBhdGgrJy9wYWNrYWdlLmpzb24nLCAndXRmLTgnKSkgfHwge30pO1xuICAgICAgdmFyIGNtZFZlcnNpb24gPSBjbWRQa2cudmVyc2lvbl9mdWxsXG5cbiAgICAgIGNvbnN0IGlzV2VicGFjazQgPSBjb21waWxlci5ob29rcztcbiAgICAgIGlmIChpc1dlYnBhY2s0KSB7dGhpcy53ZWJwYWNrVmVyc2lvbiA9ICdJUyB3ZWJwYWNrIDQnfVxuICAgICAgZWxzZSB7dGhpcy53ZWJwYWNrVmVyc2lvbiA9ICdOT1Qgd2VicGFjayA0J31cbiAgICAgIHByb2Nlc3Muc3Rkb3V0LmN1cnNvclRvKDApO2NvbnNvbGUubG9nKGFwcCArICd2JyArIHBsdWdpblZlcnNpb24gKyAnLCBFeHQgSlMgdicgKyBleHRWZXJzaW9uICsgJywgU2VuY2hhIENtZCB2JyArIGNtZFZlcnNpb24gKyAnLCAnICsgdGhpcy53ZWJwYWNrVmVyc2lvbilcbiAgICB9XG5cbiAgICBsZXQgeyBmaWxlcywgZGlycyB9ID0gdGhpcy5vcHRpb25zO1xuICAgIGNvbnN0IHsgY3dkIH0gPSB0aGlzLm9wdGlvbnM7XG4gICAgZmlsZXMgPSB0eXBlb2YgZmlsZXMgPT09ICdzdHJpbmcnID8gW2ZpbGVzXSA6IGZpbGVzO1xuICAgIGRpcnMgPSB0eXBlb2YgZGlycyA9PT0gJ3N0cmluZycgPyBbZGlyc10gOiBkaXJzO1xuXG4gICAgaWYgKGNvbXBpbGVyLmhvb2tzKSB7XG4gICAgICBjb21waWxlci5ob29rcy5hZnRlckNvbXBpbGUudGFwKCdleHQtYWZ0ZXItY29tcGlsZScsIChjb21waWxhdGlvbikgPT4ge1xuICAgICAgICBwcm9jZXNzLnN0ZG91dC5jdXJzb3JUbygwKTtjb25zb2xlLmxvZyhhcHAgKyAnZXh0LWFmdGVyLWNvbXBpbGUnKVxuICAgICAgICBjb25zdCB7XG4gICAgICAgICAgZmlsZURlcGVuZGVuY2llcyxcbiAgICAgICAgICBjb250ZXh0RGVwZW5kZW5jaWVzLFxuICAgICAgICB9ID0gZ2V0RmlsZUFuZENvbnRleHREZXBzKGNvbXBpbGF0aW9uLCBmaWxlcywgZGlycywgY3dkKTtcbiAgICAgICAgaWYgKGZpbGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBmaWxlRGVwZW5kZW5jaWVzLmZvckVhY2goKGZpbGUpID0+IHtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coYCR7YXBwfSR7cGF0aC5yZXNvbHZlKGZpbGUpfSBjaGFuZ2VkICR7ZmlsZX1gKVxuICAgICAgICAgICAgY29tcGlsYXRpb24uZmlsZURlcGVuZGVuY2llcy5hZGQocGF0aC5yZXNvbHZlKGZpbGUpKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGlycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgY29udGV4dERlcGVuZGVuY2llcy5mb3JFYWNoKChjb250ZXh0KSA9PiB7XG4gICAgICAgICAgICBjb21waWxhdGlvbi5jb250ZXh0RGVwZW5kZW5jaWVzLmFkZChjb250ZXh0KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbXBpbGVyLnBsdWdpbignYWZ0ZXItY29tcGlsZScsIChjb21waWxhdGlvbiwgY2IpID0+IHtcbiAgICAgICAgY29uc29sZS5sb2coYXBwICsgJ2FmdGVyLWNvbXBpbGUnKVxuICAgICAgICBjb25zdCB7XG4gICAgICAgICAgZmlsZURlcGVuZGVuY2llcyxcbiAgICAgICAgICBjb250ZXh0RGVwZW5kZW5jaWVzLFxuICAgICAgICB9ID0gZ2V0RmlsZUFuZENvbnRleHREZXBzKGNvbXBpbGF0aW9uLCBmaWxlcywgZGlycywgY3dkKTtcbiAgICAgICAgaWYgKGZpbGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBjb21waWxhdGlvbi5maWxlRGVwZW5kZW5jaWVzID0gZmlsZURlcGVuZGVuY2llczsgLy8gZXNsaW50LWRpc2FibGUtbGluZVxuICAgICAgICB9XG4gICAgICAgIGlmIChkaXJzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBjb21waWxhdGlvbi5jb250ZXh0RGVwZW5kZW5jaWVzID0gY29udGV4dERlcGVuZGVuY2llczsgLy8gZXNsaW50LWRpc2FibGUtbGluZVxuICAgICAgICB9XG4gICAgICAgIGNiKClcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmIChjb21waWxlci5ob29rcykge1xuICAgICAgdmFyIG1lID0gdGhpc1xuICAgICAgY29tcGlsZXIuaG9va3MuZW1pdC50YXBBc3luYygnZXh0LWVtaXQtYXN5bmMnLCBmdW5jdGlvbiAoY29tcGlsYXRpb24sIGNiKSB7XG4gICAgICAgIHByb2Nlc3Muc3Rkb3V0LmN1cnNvclRvKDApO2NvbnNvbGUubG9nKGFwcCArICdleHQtZW1pdC1hc3luYycpXG5cbiAgICAgICAgdmFyIHdhdGNoZWRGaWxlcz1bXVxuICAgICAgICB0cnkge3dhdGNoZWRGaWxlcyA9IHJlY3Vyc2l2ZVJlYWRTeW5jKCcuL2FwcCcpfSBcbiAgICAgICAgY2F0Y2goZXJyKSB7aWYoZXJyLmVycm5vID09PSAzNCl7Y29uc29sZS5sb2coJ1BhdGggZG9lcyBub3QgZXhpc3QnKTt9IGVsc2Uge3Rocm93IGVycjt9fVxuXG4gICAgICAgIHZhciBkb0J1aWxkID0gZmFsc2VcbiAgICAgICAgZm9yICh2YXIgZmlsZSBpbiB3YXRjaGVkRmlsZXMpIHtcbiAgICAgICAgICBpZiAobWUubGFzdE1pbGxpc2Vjb25kcyA8IGZzLnN0YXRTeW5jKHdhdGNoZWRGaWxlc1tmaWxlXSkubXRpbWVNcykge1xuICAgICAgICAgICAgaWYgKHdhdGNoZWRGaWxlc1tmaWxlXS5pbmRleE9mKFwic2Nzc1wiKSAhPSAtMSkge2RvQnVpbGQ9dHJ1ZTticmVhazt9XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG1lLmxhc3RNaWxsaXNlY29uZHNBcHBKc29uIDwgZnMuc3RhdFN5bmMoJy4vYXBwLmpzb24nKS5tdGltZU1zKSB7XG4gICAgICAgICAgZG9CdWlsZD10cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgbWUubGFzdE1pbGxpc2Vjb25kcyA9IChuZXcgRGF0ZSkuZ2V0VGltZSgpXG4gICAgICAgIG1lLmxhc3RNaWxsaXNlY29uZHNBcHBKc29uID0gKG5ldyBEYXRlKS5nZXRUaW1lKClcblxuICAgICAgICB2YXIgY3VycmVudE51bUZpbGVzID0gd2F0Y2hlZEZpbGVzLmxlbmd0aFxuICAgICAgICB2YXIgZmlsZXNvdXJjZSA9ICd0aGlzIGZpbGUgZW5hYmxlcyBjbGllbnQgcmVsb2FkJ1xuICAgICAgICBjb21waWxhdGlvbi5hc3NldHNbY3VycmVudE51bUZpbGVzICsgJ0ZpbGVzVW5kZXJBcHBGb2xkZXIubWQnXSA9IHtcbiAgICAgICAgICBzb3VyY2U6IGZ1bmN0aW9uKCkge3JldHVybiBmaWxlc291cmNlfSxcbiAgICAgICAgICBzaXplOiBmdW5jdGlvbigpIHtyZXR1cm4gZmlsZXNvdXJjZS5sZW5ndGh9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY3VycmVudE51bUZpbGVzICE9IG1lLmxhc3ROdW1GaWxlcyB8fCBkb0J1aWxkKSB7XG4gICAgICAgICAgbWUubGFzdE51bUZpbGVzID0gY3VycmVudE51bUZpbGVzXG4gICAgICAgICAgdmFyIGJ1aWxkQXN5bmMgPSByZXF1aXJlKGAke25wbVNjb3BlfS9leHQtYnVpbGQvYXBwL2J1aWxkQXN5bmMuanNgKVxuICAgICAgICAgIHZhciBidWlsZE9wdGlvbnMgPSB7cGFybXM6IFsnYXBwJywnYnVpbGQnLG1lLm9wdGlvbnMucHJvZmlsZSwgbWUub3B0aW9ucy5lbnZpcm9ubWVudCwgbWUub3B0aW9ucy52ZXJib3NlXX1cbiAgICAgICAgICBuZXcgYnVpbGRBc3luYyhidWlsZE9wdGlvbnMpLmV4ZWN1dGVBc3luYygpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjYigpXG4gICAgICAgICAgfSwgZnVuY3Rpb24ocmVhc29uKXtcbiAgICAgICAgICAgIHZhciBwcmVmaXhFcnIgPSAn4pyWIFtleHRdOic7XG4gICAgICAgICAgICB2YXIgZXJyID0gY2hhbGsucmVkKHByZWZpeEVycikgKyAnIGV4dC13ZWJwYWNrLXBsdWdpbjogJ1xuICAgICAgICAgICAgdmFyIGVycm9yU3RyaW5nID0gYCR7ZXJyfSAke2NoYWxrLnJlZChyZWFzb24uZXJyb3IpfWBcbiAgICAgICAgICAgIGNvbXBpbGF0aW9uLmVycm9ycy5wdXNoKG5ldyBFcnJvcihlcnJvclN0cmluZykpXG4gICAgICAgICAgICBjYigpXG4gICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBtZS5sYXN0TnVtRmlsZXMgPSBjdXJyZW50TnVtRmlsZXNcbiAgICAgICAgICBjb25zb2xlLmxvZyhhcHAgKyAnY2FsbCB0byBleHQtYnVpbGQgbm90IG5lZWRlZCwgbm8gbmV3IGZpbGVzJylcbiAgICAgICAgICBjYigpXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgY29tcGlsZXIucGx1Z2luKCdlbWl0JywgKGNvbXBpbGF0aW9uLCBjYikgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZyhhcHAgKyAnZW1pdCcpXG4gICAgICAgIHZhciBmaWxlbGlzdCA9ICd0aGlzIGZpbGUgZW5hYmxlcyBjbGllbnQgcmVsb2FkJ1xuICAgICAgICBjb21waWxhdGlvbi5hc3NldHNbJ0ZvclJlbG9hZC5tZCddID0ge1xuICAgICAgICAgIHNvdXJjZTogZnVuY3Rpb24oKSB7cmV0dXJuIGZpbGVsaXN0fSxcbiAgICAgICAgICBzaXplOiBmdW5jdGlvbigpIHtyZXR1cm4gZmlsZWxpc3QubGVuZ3RofVxuICAgICAgICB9XG4gICAgICAgIHZhciByZWZyZXNoID0gcmVxdWlyZShgJHtucG1TY29wZX0vZXh0LWJ1aWxkL2FwcC9yZWZyZXNoLmpzYClcbiAgICAgICAgbmV3IHJlZnJlc2goe30pXG5cbiAgICAgICAgLy8gY29uc29sZS5sb2coJ1RISVMgSVMgSVQnKVxuICAgICAgICAvLyB2YXIgYnVpbGRBc3luYyA9IHJlcXVpcmUoYCR7bnBtU2NvcGV9L2V4dC1idWlsZC9hcHAvYnVpbGRBc3luYy5qc2ApXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGJ1aWxkQXN5bmMpXG4gICAgICAgIC8vIG5ldyBidWlsZEFzeW5jKCkuZXhlY3V0ZUFzeW5jKCkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gICBjb25zb2xlLmxvZygndGhlbiBjYWxsJyk7XG4gICAgICAgIC8vICAgY2IoKTtcbiAgICAgICAgLy8gfSlcblxuXG4gICAgICAgIC8vY2IoKVxuICAgICAgICAvL3RoaXMuZW1pdFN0YXRzLmJpbmQodGhpcylcblxuXG5cbiAgICAgIH0pXG4gICAgfVxuXG4gIH1cblxuXG4gIC8vIGVtaXRTdGF0cyhjdXJDb21waWxlciwgY2FsbGJhY2spIHtcbiAgLy8gICAvLyBHZXQgc3RhdHMuXG4gIC8vICAgLy8gKipOb3RlKio6IEluIGZ1dHVyZSwgY291bGQgcGFzcyBzb21ldGhpbmcgbGlrZSBgeyBzaG93QXNzZXRzOiB0cnVlIH1gXG4gIC8vICAgLy8gdG8gdGhlIGBnZXRTdGF0cygpYCBmdW5jdGlvbiBmb3IgbW9yZSBsaW1pdGVkIG9iamVjdCByZXR1cm5lZC5cbiAgLy8gICBsZXQgc3RhdHMgPSBjdXJDb21waWxlci5nZXRTdGF0cygpLnRvSnNvbigpO1xuICBcbiAgLy8gICAvLyBGaWx0ZXIgdG8gZmllbGRzLlxuICAvLyAgIGlmICh0aGlzLm9wdHMuZmllbGRzKSB7XG4gIC8vICAgICBzdGF0cyA9IHRoaXMub3B0cy5maWVsZHMucmVkdWNlKChtZW1vLCBrZXkpID0+IHtcbiAgLy8gICAgICAgbWVtb1trZXldID0gc3RhdHNba2V5XTtcbiAgLy8gICAgICAgcmV0dXJuIG1lbW87XG4gIC8vICAgICB9LCB7fSk7XG4gIC8vICAgfVxuICBcbiAgLy8gICAvLyBUcmFuc2Zvcm0gdG8gc3RyaW5nLlxuICAvLyAgIGxldCBlcnI7XG4gIC8vICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpXG4gIFxuICAvLyAgICAgLy8gVHJhbnNmb3JtLlxuICAvLyAgICAgLnRoZW4oKCkgPT4gdGhpcy5vcHRzLnRyYW5zZm9ybShzdGF0cywge1xuICAvLyAgICAgICBjb21waWxlcjogY3VyQ29tcGlsZXJcbiAgLy8gICAgIH0pKVxuICAvLyAgICAgLmNhdGNoKChlKSA9PiB7IGVyciA9IGU7IH0pXG4gIFxuICAvLyAgICAgLy8gRmluaXNoIHVwLlxuICAvLyAgICAgLnRoZW4oKHN0YXRzU3RyKSA9PiB7XG4gIC8vICAgICAgIC8vIEhhbmRsZSBlcnJvcnMuXG4gIC8vICAgICAgIGlmIChlcnIpIHtcbiAgLy8gICAgICAgICBjdXJDb21waWxlci5lcnJvcnMucHVzaChlcnIpO1xuICAvLyAgICAgICAgIGlmIChjYWxsYmFjaykgeyByZXR1cm4gdm9pZCBjYWxsYmFjayhlcnIpOyB9XG4gIC8vICAgICAgICAgdGhyb3cgZXJyO1xuICAvLyAgICAgICB9XG4gIFxuICAvLyAgICAgICAvLyBBZGQgdG8gYXNzZXRzLlxuICAvLyAgICAgICBjdXJDb21waWxlci5hc3NldHNbdGhpcy5vcHRzLmZpbGVuYW1lXSA9IHtcbiAgLy8gICAgICAgICBzb3VyY2UoKSB7XG4gIC8vICAgICAgICAgICByZXR1cm4gc3RhdHNTdHI7XG4gIC8vICAgICAgICAgfSxcbiAgLy8gICAgICAgICBzaXplKCkge1xuICAvLyAgICAgICAgICAgcmV0dXJuIHN0YXRzU3RyLmxlbmd0aDtcbiAgLy8gICAgICAgICB9XG4gIC8vICAgICAgIH07XG4gIFxuICAvLyAgICAgICBpZiAoY2FsbGJhY2spIHsgcmV0dXJuIHZvaWQgY2FsbGJhY2soKTsgfVxuICAvLyAgICAgfSk7XG4gIC8vIH1cbiAgXG5cblxufVxuXG5cblxuXG5cblxuICAvLyBpZiAoZmlsZXMubGVuZ3RoID4gMCkge1xuICAvLyAgIGZpbGVzLmZvckVhY2goKHBhdHRlcm4pID0+IHtcbiAgLy8gICAgIGxldCBmID0gcGF0dGVybjtcbiAgLy8gICAgIGlmIChpc0dsb2IocGF0dGVybikpIHtcbiAgLy8gICAgICAgZiA9IGdsb2Iuc3luYyhwYXR0ZXJuLCB7XG4gIC8vICAgICAgICAgY3dkLFxuICAvLyAgICAgICAgIGRvdDogdHJ1ZSxcbiAgLy8gICAgICAgICBhYnNvbHV0ZTogdHJ1ZSxcbiAgLy8gICAgICAgfSk7XG4gIC8vICAgICB9XG4gIC8vICAgICBmZHMgPSBmZHMuY29uY2F0KGYpO1xuICAvLyAgIH0pO1xuICAvLyAgIGZkcyA9IHVuaXEoZmRzKTtcbiAgLy8gfVxuXG5cbi8vIGZ1bmN0aW9uIGhvb2tfc3Rkb3V0KGNhbGxiYWNrKSB7XG4vLyAgIHZhciBvbGRfd3JpdGUgPSBwcm9jZXNzLnN0ZG91dC53cml0ZVxuLy8gICBjb25zb2xlLmxvZygnaW4gaG9vaycpXG4vLyAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlID0gKGZ1bmN0aW9uKHdyaXRlKSB7XG4vLyAgICAgICByZXR1cm4gZnVuY3Rpb24oc3RyaW5nLCBlbmNvZGluZywgZmQpIHtcbi8vICAgICAgICAgICB3cml0ZS5hcHBseShwcm9jZXNzLnN0ZG91dCwgYXJndW1lbnRzKVxuLy8gICAgICAgICAgIGNhbGxiYWNrKHN0cmluZywgZW5jb2RpbmcsIGZkKVxuLy8gICAgICAgfVxuLy8gICB9KShwcm9jZXNzLnN0ZG91dC53cml0ZSlcblxuLy8gICByZXR1cm4gZnVuY3Rpb24oKSB7XG4vLyAgICAgICBwcm9jZXNzLnN0ZG91dC53cml0ZSA9IG9sZF93cml0ZVxuLy8gICAgICAgY29uc29sZS5sb2coJ2luIHVuaG9vaycpXG4vLyAgICAgfVxuLy8gfVxuICAgIC8vIHRoaXMudW5ob29rID0gaG9va19zdGRvdXQoZnVuY3Rpb24oc3RyaW5nLCBlbmNvZGluZywgZmQpIHtcbiAgICAvLyAgIGNvbnNvbGUubG9nKCdzdGRvdXQ6ICcgKyBzdHJpbmcpXG4gICAgLy8gfSlcblxuLy8gICAgICAgIHRoaXMudW5ob29rKClcblxuXG5cblxuXG4gICAgICAgIC8vIHZhciBmaWxlbGlzdCA9ICdJbiB0aGlzIGJ1aWxkOlxcblxcbic7XG5cbiAgICAgICAgLy8gLy8gTG9vcCB0aHJvdWdoIGFsbCBjb21waWxlZCBhc3NldHMsXG4gICAgICAgIC8vIC8vIGFkZGluZyBhIG5ldyBsaW5lIGl0ZW0gZm9yIGVhY2ggZmlsZW5hbWUuXG4gICAgICAgIC8vIGZvciAodmFyIGZpbGVuYW1lIGluIGNvbXBpbGF0aW9uLmFzc2V0cykge1xuICAgICAgICAvLyAgIGZpbGVsaXN0ICs9ICgnLSAnKyBmaWxlbmFtZSArJ1xcbicpO1xuICAgICAgICAvLyB9XG4gICAgXG4gICAgICAgIC8vIC8vIEluc2VydCB0aGlzIGxpc3QgaW50byB0aGUgd2VicGFjayBidWlsZCBhcyBhIG5ldyBmaWxlIGFzc2V0OlxuICAgICAgICAvLyBjb21waWxhdGlvbi5hc3NldHNbJ2ZpbGVsaXN0Lm1kJ10gPSB7XG4gICAgICAgIC8vICAgc291cmNlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gICAgIHJldHVybiBmaWxlbGlzdDtcbiAgICAgICAgLy8gICB9LFxuICAgICAgICAvLyAgIHNpemU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyAgICAgcmV0dXJuIGZpbGVsaXN0Lmxlbmd0aDtcbiAgICAgICAgLy8gICB9XG4gICAgICAgIC8vIH07XG5cblxuXG5cblxuICAgICAgICAvLyAvL3ZhciBkID0gbmV3IERhdGUoKVxuICAgICAgICAvLyB2YXIgZCA9ICdtamcnXG4gICAgICAgIC8vIHZhciBmaWxlbGlzdCA9ICdJbiB0aGlzIGJ1aWxkOlxcblxcbicgKyBkICsgJ1xcblxcbic7XG4gICAgICAgIC8vIC8vIExvb3AgdGhyb3VnaCBhbGwgY29tcGlsZWQgYXNzZXRzLFxuICAgICAgICAvLyAvLyBhZGRpbmcgYSBuZXcgbGluZSBpdGVtIGZvciBlYWNoIGZpbGVuYW1lLlxuICAgICAgICAvLyBmb3IgKHZhciBmaWxlbmFtZSBpbiBjb21waWxhdGlvbi5hc3NldHMpIHtcbiAgICAgICAgLy8gICBmaWxlbGlzdCArPSAoJy0gJysgZmlsZW5hbWUgKydcXG4nKTtcbiAgICAgICAgLy8gfVxuICAgICAgICAvLyAvLyBJbnNlcnQgdGhpcyBsaXN0IGludG8gdGhlIHdlYnBhY2sgYnVpbGQgYXMgYSBuZXcgZmlsZSBhc3NldDpcbiAgICAgICAgLy8gY29tcGlsYXRpb24uYXNzZXRzW2QgKyAnLm1kJ10gPSB7XG4gICAgICAgIC8vICAgc291cmNlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gICAgIHJldHVybiBmaWxlbGlzdDtcbiAgICAgICAgLy8gICB9LFxuICAgICAgICAvLyAgIHNpemU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyAgICAgcmV0dXJuIGZpbGVsaXN0Lmxlbmd0aDtcbiAgICAgICAgLy8gICB9XG4gICAgICAgIC8vIH07Il19