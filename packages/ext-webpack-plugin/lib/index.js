'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _chalk = require('chalk');

var _chalk2 = _interopRequireDefault(_chalk);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _schemaUtils = require('schema-utils');

var _schemaUtils2 = _interopRequireDefault(_schemaUtils);

var _lodash = require('lodash.uniq');

var _lodash2 = _interopRequireDefault(_lodash);

var _isGlob = require('is-glob');

var _isGlob2 = _interopRequireDefault(_isGlob);

var _recursiveReaddirSync = require('recursive-readdir-sync');

var _recursiveReaddirSync2 = _interopRequireDefault(_recursiveReaddirSync);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var app = _chalk2.default.green('ℹ ｢ext｣:') + ' ext-webpack-plugin: ';

function getFileAndContextDeps(compilation, files, dirs, cwd) {
  var fileDependencies = compilation.fileDependencies,
      contextDependencies = compilation.contextDependencies;

  var isWebpack4 = compilation.hooks;
  var fds = isWebpack4 ? [].concat(_toConsumableArray(fileDependencies)) : fileDependencies;
  var cds = isWebpack4 ? [].concat(_toConsumableArray(contextDependencies)) : contextDependencies;
  if (dirs.length > 0) {
    cds = (0, _lodash2.default)(cds.concat(dirs));
  }
  return {
    fileDependencies: fds,
    contextDependencies: cds
  };
}

var ExtWebpackPlugin = function () {
  function ExtWebpackPlugin() {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, ExtWebpackPlugin);

    (0, _schemaUtils2.default)(require('../options.json'), options, 'ExtraWatchWebpackPlugin'); // eslint-disable-line
    this.options = _extends({}, ExtWebpackPlugin.defaults, options);
  }

  _createClass(ExtWebpackPlugin, [{
    key: 'apply',
    value: function apply(compiler) {

      if (this.webpackVersion == undefined) {
        var pluginPath = _path2.default.resolve(__dirname, '..');
        var pluginPkg = _fs2.default.existsSync(pluginPath + '/package.json') && JSON.parse(_fs2.default.readFileSync(pluginPath + '/package.json', 'utf-8')) || {};
        var pluginVersion = pluginPkg.version;

        var extPath = _path2.default.resolve(pluginPath, '../ext');
        var extPkg = _fs2.default.existsSync(extPath + '/package.json') && JSON.parse(_fs2.default.readFileSync(extPath + '/package.json', 'utf-8')) || {};
        var extVersion = extPkg.version;

        var isWebpack4 = compiler.hooks;
        if (isWebpack4) {
          this.webpackVersion = 'IS webpack 4';
        } else {
          this.webpackVersion = 'NOT webpack 4';
        }
        process.stdout.cursorTo(0);console.log(app + 'v' + pluginVersion + '. Ext JS v' + extVersion + ', ' + this.webpackVersion);
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
              compilation.fileDependencies.add((0, _path.resolve)(file));
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
            watchedFiles = (0, _recursiveReaddirSync2.default)('./app');
          } catch (err) {
            if (err.errno === 34) {
              console.log('Path does not exist');
            } else {
              throw err;
            }
          }

          var doBuild = false;
          for (var file in watchedFiles) {
            if (me.lastMilliseconds < _fs2.default.statSync(watchedFiles[file]).mtimeMs) {
              if (watchedFiles[file].indexOf("scss") != -1) {
                doBuild = true;break;
              }
            }
          }
          me.lastMilliseconds = new Date().getTime();

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
            var buildAsync = require('@extjs/ext-build/app/buildAsync.js');
            new buildAsync().executeAsync().then(function () {
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


ExtWebpackPlugin.defaults = {
  cwd: process.cwd(),
  files: [],
  dirs: ['./app']
};
exports.default = ExtWebpackPlugin;
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9pbmRleC5qcyJdLCJuYW1lcyI6WyJhcHAiLCJjaGFsayIsImdyZWVuIiwiZ2V0RmlsZUFuZENvbnRleHREZXBzIiwiY29tcGlsYXRpb24iLCJmaWxlcyIsImRpcnMiLCJjd2QiLCJmaWxlRGVwZW5kZW5jaWVzIiwiY29udGV4dERlcGVuZGVuY2llcyIsImlzV2VicGFjazQiLCJob29rcyIsImZkcyIsImNkcyIsImxlbmd0aCIsImNvbmNhdCIsIkV4dFdlYnBhY2tQbHVnaW4iLCJvcHRpb25zIiwicmVxdWlyZSIsImRlZmF1bHRzIiwiY29tcGlsZXIiLCJ3ZWJwYWNrVmVyc2lvbiIsInVuZGVmaW5lZCIsInBsdWdpblBhdGgiLCJwYXRoIiwicmVzb2x2ZSIsIl9fZGlybmFtZSIsInBsdWdpblBrZyIsImZzIiwiZXhpc3RzU3luYyIsIkpTT04iLCJwYXJzZSIsInJlYWRGaWxlU3luYyIsInBsdWdpblZlcnNpb24iLCJ2ZXJzaW9uIiwiZXh0UGF0aCIsImV4dFBrZyIsImV4dFZlcnNpb24iLCJwcm9jZXNzIiwic3Rkb3V0IiwiY3Vyc29yVG8iLCJjb25zb2xlIiwibG9nIiwiYWZ0ZXJDb21waWxlIiwidGFwIiwiZm9yRWFjaCIsImZpbGUiLCJhZGQiLCJjb250ZXh0IiwicGx1Z2luIiwiY2IiLCJtZSIsImVtaXQiLCJ0YXBBc3luYyIsIndhdGNoZWRGaWxlcyIsImVyciIsImVycm5vIiwiZG9CdWlsZCIsImxhc3RNaWxsaXNlY29uZHMiLCJzdGF0U3luYyIsIm10aW1lTXMiLCJpbmRleE9mIiwiRGF0ZSIsImdldFRpbWUiLCJjdXJyZW50TnVtRmlsZXMiLCJmaWxlc291cmNlIiwiYXNzZXRzIiwic291cmNlIiwic2l6ZSIsImxhc3ROdW1GaWxlcyIsImJ1aWxkQXN5bmMiLCJleGVjdXRlQXN5bmMiLCJ0aGVuIiwiZmlsZWxpc3QiLCJyZWZyZXNoIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUE7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7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a0JBRENVLGdCIiwiZmlsZSI6ImluZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnXG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHZhbGlkYXRlT3B0aW9ucyBmcm9tICdzY2hlbWEtdXRpbHMnO1xuaW1wb3J0IHVuaXEgZnJvbSAnbG9kYXNoLnVuaXEnO1xuaW1wb3J0IGlzR2xvYiBmcm9tICdpcy1nbG9iJztcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdwYXRoJztcbmltcG9ydCByZWN1cnNpdmVSZWFkU3luYyBmcm9tICdyZWN1cnNpdmUtcmVhZGRpci1zeW5jJztcbmNvbnN0IGFwcCA9IGAke2NoYWxrLmdyZWVuKCfihLkg772iZXh0772jOicpfSBleHQtd2VicGFjay1wbHVnaW46IGA7XG5cbmZ1bmN0aW9uIGdldEZpbGVBbmRDb250ZXh0RGVwcyhjb21waWxhdGlvbiwgZmlsZXMsIGRpcnMsIGN3ZCkge1xuICBjb25zdCB7IGZpbGVEZXBlbmRlbmNpZXMsIGNvbnRleHREZXBlbmRlbmNpZXMgfSA9IGNvbXBpbGF0aW9uO1xuICBjb25zdCBpc1dlYnBhY2s0ID0gY29tcGlsYXRpb24uaG9va3M7XG4gIGxldCBmZHMgPSBpc1dlYnBhY2s0ID8gWy4uLmZpbGVEZXBlbmRlbmNpZXNdIDogZmlsZURlcGVuZGVuY2llcztcbiAgbGV0IGNkcyA9IGlzV2VicGFjazQgPyBbLi4uY29udGV4dERlcGVuZGVuY2llc10gOiBjb250ZXh0RGVwZW5kZW5jaWVzO1xuICBpZiAoZGlycy5sZW5ndGggPiAwKSB7XG4gICAgY2RzID0gdW5pcShjZHMuY29uY2F0KGRpcnMpKTtcbiAgfVxuICByZXR1cm4ge1xuICAgIGZpbGVEZXBlbmRlbmNpZXM6IGZkcyxcbiAgICBjb250ZXh0RGVwZW5kZW5jaWVzOiBjZHMsXG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEV4dFdlYnBhY2tQbHVnaW4ge1xuICBzdGF0aWMgZGVmYXVsdHMgPSB7XG4gICAgY3dkOiBwcm9jZXNzLmN3ZCgpLFxuICAgIGZpbGVzOiBbXSxcbiAgICBkaXJzOiBbJy4vYXBwJ10sXG4gIH07XG5cbiAgY29uc3RydWN0b3Iob3B0aW9ucyA9IHt9KSB7XG4gICAgdmFsaWRhdGVPcHRpb25zKHJlcXVpcmUoJy4uL29wdGlvbnMuanNvbicpLCBvcHRpb25zLCAnRXh0cmFXYXRjaFdlYnBhY2tQbHVnaW4nKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZVxuICAgIHRoaXMub3B0aW9ucyA9IHsgLi4uRXh0V2VicGFja1BsdWdpbi5kZWZhdWx0cywgLi4ub3B0aW9ucyB9O1xuICB9XG5cbiAgYXBwbHkoY29tcGlsZXIpIHtcblxuICAgIGlmICh0aGlzLndlYnBhY2tWZXJzaW9uID09IHVuZGVmaW5lZCkge1xuICAgICAgdmFyIHBsdWdpblBhdGggPSBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCcuLicpXG4gICAgICB2YXIgcGx1Z2luUGtnID0gKGZzLmV4aXN0c1N5bmMocGx1Z2luUGF0aCsnL3BhY2thZ2UuanNvbicpICYmIEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKHBsdWdpblBhdGgrJy9wYWNrYWdlLmpzb24nLCAndXRmLTgnKSkgfHwge30pO1xuICAgICAgdmFyIHBsdWdpblZlcnNpb24gPSBwbHVnaW5Qa2cudmVyc2lvblxuICBcbiAgICAgIHZhciBleHRQYXRoID0gcGF0aC5yZXNvbHZlKHBsdWdpblBhdGgsJy4uL2V4dCcpXG4gICAgICB2YXIgZXh0UGtnID0gKGZzLmV4aXN0c1N5bmMoZXh0UGF0aCsnL3BhY2thZ2UuanNvbicpICYmIEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKGV4dFBhdGgrJy9wYWNrYWdlLmpzb24nLCAndXRmLTgnKSkgfHwge30pO1xuICAgICAgdmFyIGV4dFZlcnNpb24gPSBleHRQa2cudmVyc2lvblxuXG4gICAgICBjb25zdCBpc1dlYnBhY2s0ID0gY29tcGlsZXIuaG9va3M7XG4gICAgICBpZiAoaXNXZWJwYWNrNCkge3RoaXMud2VicGFja1ZlcnNpb24gPSAnSVMgd2VicGFjayA0J31cbiAgICAgIGVsc2Uge3RoaXMud2VicGFja1ZlcnNpb24gPSAnTk9UIHdlYnBhY2sgNCd9XG4gICAgICBwcm9jZXNzLnN0ZG91dC5jdXJzb3JUbygwKTtjb25zb2xlLmxvZyhhcHAgKyAndicgKyBwbHVnaW5WZXJzaW9uICsgJy4gRXh0IEpTIHYnICsgZXh0VmVyc2lvbiArICcsICcgKyB0aGlzLndlYnBhY2tWZXJzaW9uKVxuICAgIH1cblxuICAgIGxldCB7IGZpbGVzLCBkaXJzIH0gPSB0aGlzLm9wdGlvbnM7XG4gICAgY29uc3QgeyBjd2QgfSA9IHRoaXMub3B0aW9ucztcbiAgICBmaWxlcyA9IHR5cGVvZiBmaWxlcyA9PT0gJ3N0cmluZycgPyBbZmlsZXNdIDogZmlsZXM7XG4gICAgZGlycyA9IHR5cGVvZiBkaXJzID09PSAnc3RyaW5nJyA/IFtkaXJzXSA6IGRpcnM7XG5cbiAgICBpZiAoY29tcGlsZXIuaG9va3MpIHtcbiAgICAgIGNvbXBpbGVyLmhvb2tzLmFmdGVyQ29tcGlsZS50YXAoJ2V4dC1hZnRlci1jb21waWxlJywgKGNvbXBpbGF0aW9uKSA9PiB7XG4gICAgICAgIHByb2Nlc3Muc3Rkb3V0LmN1cnNvclRvKDApO2NvbnNvbGUubG9nKGFwcCArICdleHQtYWZ0ZXItY29tcGlsZScpXG4gICAgICAgIGNvbnN0IHtcbiAgICAgICAgICBmaWxlRGVwZW5kZW5jaWVzLFxuICAgICAgICAgIGNvbnRleHREZXBlbmRlbmNpZXMsXG4gICAgICAgIH0gPSBnZXRGaWxlQW5kQ29udGV4dERlcHMoY29tcGlsYXRpb24sIGZpbGVzLCBkaXJzLCBjd2QpO1xuICAgICAgICBpZiAoZmlsZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGZpbGVEZXBlbmRlbmNpZXMuZm9yRWFjaCgoZmlsZSkgPT4ge1xuICAgICAgICAgICAgY29tcGlsYXRpb24uZmlsZURlcGVuZGVuY2llcy5hZGQocmVzb2x2ZShmaWxlKSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRpcnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGNvbnRleHREZXBlbmRlbmNpZXMuZm9yRWFjaCgoY29udGV4dCkgPT4ge1xuICAgICAgICAgICAgY29tcGlsYXRpb24uY29udGV4dERlcGVuZGVuY2llcy5hZGQoY29udGV4dCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb21waWxlci5wbHVnaW4oJ2FmdGVyLWNvbXBpbGUnLCAoY29tcGlsYXRpb24sIGNiKSA9PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKGFwcCArICdhZnRlci1jb21waWxlJylcbiAgICAgICAgY29uc3Qge1xuICAgICAgICAgIGZpbGVEZXBlbmRlbmNpZXMsXG4gICAgICAgICAgY29udGV4dERlcGVuZGVuY2llcyxcbiAgICAgICAgfSA9IGdldEZpbGVBbmRDb250ZXh0RGVwcyhjb21waWxhdGlvbiwgZmlsZXMsIGRpcnMsIGN3ZCk7XG4gICAgICAgIGlmIChmaWxlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgY29tcGlsYXRpb24uZmlsZURlcGVuZGVuY2llcyA9IGZpbGVEZXBlbmRlbmNpZXM7IC8vIGVzbGludC1kaXNhYmxlLWxpbmVcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGlycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgY29tcGlsYXRpb24uY29udGV4dERlcGVuZGVuY2llcyA9IGNvbnRleHREZXBlbmRlbmNpZXM7IC8vIGVzbGludC1kaXNhYmxlLWxpbmVcbiAgICAgICAgfVxuICAgICAgICBjYigpXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAoY29tcGlsZXIuaG9va3MpIHtcbiAgICAgIHZhciBtZSA9IHRoaXNcbiAgICAgIGNvbXBpbGVyLmhvb2tzLmVtaXQudGFwQXN5bmMoJ2V4dC1lbWl0LWFzeW5jJywgZnVuY3Rpb24gKGNvbXBpbGF0aW9uLCBjYikge1xuICAgICAgICBwcm9jZXNzLnN0ZG91dC5jdXJzb3JUbygwKTtjb25zb2xlLmxvZyhhcHAgKyAnZXh0LWVtaXQtYXN5bmMnKVxuXG4gICAgICAgIHZhciB3YXRjaGVkRmlsZXM9W11cbiAgICAgICAgdHJ5IHt3YXRjaGVkRmlsZXMgPSByZWN1cnNpdmVSZWFkU3luYygnLi9hcHAnKX0gXG4gICAgICAgIGNhdGNoKGVycikge2lmKGVyci5lcnJubyA9PT0gMzQpe2NvbnNvbGUubG9nKCdQYXRoIGRvZXMgbm90IGV4aXN0Jyk7fSBlbHNlIHt0aHJvdyBlcnI7fX1cblxuICAgICAgICB2YXIgZG9CdWlsZCA9IGZhbHNlXG4gICAgICAgIGZvciAodmFyIGZpbGUgaW4gd2F0Y2hlZEZpbGVzKSB7XG4gICAgICAgICAgaWYgKG1lLmxhc3RNaWxsaXNlY29uZHMgPCBmcy5zdGF0U3luYyh3YXRjaGVkRmlsZXNbZmlsZV0pLm10aW1lTXMpIHtcbiAgICAgICAgICAgIGlmICh3YXRjaGVkRmlsZXNbZmlsZV0uaW5kZXhPZihcInNjc3NcIikgIT0gLTEpIHtkb0J1aWxkPXRydWU7YnJlYWs7fVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBtZS5sYXN0TWlsbGlzZWNvbmRzID0gKG5ldyBEYXRlKS5nZXRUaW1lKClcblxuICAgICAgICB2YXIgY3VycmVudE51bUZpbGVzID0gd2F0Y2hlZEZpbGVzLmxlbmd0aFxuICAgICAgICB2YXIgZmlsZXNvdXJjZSA9ICd0aGlzIGZpbGUgZW5hYmxlcyBjbGllbnQgcmVsb2FkJ1xuICAgICAgICBjb21waWxhdGlvbi5hc3NldHNbY3VycmVudE51bUZpbGVzICsgJ0ZpbGVzVW5kZXJBcHBGb2xkZXIubWQnXSA9IHtcbiAgICAgICAgICBzb3VyY2U6IGZ1bmN0aW9uKCkge3JldHVybiBmaWxlc291cmNlfSxcbiAgICAgICAgICBzaXplOiBmdW5jdGlvbigpIHtyZXR1cm4gZmlsZXNvdXJjZS5sZW5ndGh9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY3VycmVudE51bUZpbGVzICE9IG1lLmxhc3ROdW1GaWxlcyB8fCBkb0J1aWxkKSB7XG4gICAgICAgICAgbWUubGFzdE51bUZpbGVzID0gY3VycmVudE51bUZpbGVzXG4gICAgICAgICAgdmFyIGJ1aWxkQXN5bmMgPSByZXF1aXJlKCdAZXh0anMvZXh0LWJ1aWxkL2FwcC9idWlsZEFzeW5jLmpzJylcbiAgICAgICAgICBuZXcgYnVpbGRBc3luYygpLmV4ZWN1dGVBc3luYygpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjYigpXG4gICAgICAgICAgfSlcbiAgICAgICAgICBcbiAgICAgICAgICAvLyB2YXIgYnVpbGQgPSByZXF1aXJlKCdAZXh0anMvZXh0LWJ1aWxkL2FwcC9idWlsZC5qcycpXG4gICAgICAgICAgLy8gbmV3IGJ1aWxkKHt9KVxuICAgICAgICAgIC8vdmFyIHJlZnJlc2ggPSByZXF1aXJlKCdAZXh0anMvZXh0LWJ1aWxkL2FwcC9yZWZyZXNoLmpzJylcbiAgICAgICAgICAvL25ldyByZWZyZXNoKHt9KVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIG1lLmxhc3ROdW1GaWxlcyA9IGN1cnJlbnROdW1GaWxlc1xuICAgICAgICAgIGNvbnNvbGUubG9nKGFwcCArICdjYWxsIHRvIGV4dC1idWlsZCBub3QgbmVlZGVkLCBubyBuZXcgZmlsZXMnKVxuICAgICAgICAgIGNiKClcbiAgICAgICAgfVxuICAgICAgfSlcblxuXG4vLyAgICAgIGNvbXBpbGVyLmhvb2tzLmVtaXQudGFwKCdleHQtZW1pdCcsIChjb21waWxhdGlvbikgPT4ge1xuLy8gICAgICAgIHByb2Nlc3Muc3Rkb3V0LmN1cnNvclRvKDApO2NvbnNvbGUubG9nKGFwcCArICdleHQtZW1pdCcpXG5cbiAgICAgIC8vICAgdmFyIHdhdGNoZWRGaWxlcz1bXVxuICAgICAgLy8gICB0cnkge3dhdGNoZWRGaWxlcyA9IHJlY3Vyc2l2ZVJlYWRTeW5jKCcuL2FwcCcpfSBcbiAgICAgIC8vICAgY2F0Y2goZXJyKSB7aWYoZXJyLmVycm5vID09PSAzNCl7Y29uc29sZS5sb2coJ1BhdGggZG9lcyBub3QgZXhpc3QnKTt9IGVsc2Uge3Rocm93IGVycjt9fVxuXG4gICAgICAvLyAgIHZhciBkb0J1aWxkID0gZmFsc2VcbiAgICAgIC8vICAgZm9yICh2YXIgZmlsZSBpbiB3YXRjaGVkRmlsZXMpIHtcbiAgICAgIC8vICAgICBpZiAodGhpcy5sYXN0TWlsbGlzZWNvbmRzIDwgZnMuc3RhdFN5bmMod2F0Y2hlZEZpbGVzW2ZpbGVdKS5tdGltZU1zKSB7XG4gICAgICAvLyAgICAgICBpZiAod2F0Y2hlZEZpbGVzW2ZpbGVdLmluZGV4T2YoXCJzY3NzXCIpICE9IC0xKSB7ZG9CdWlsZD10cnVlO2JyZWFrO31cbiAgICAgIC8vICAgICB9XG4gICAgICAvLyAgIH1cbiAgICAgIC8vICAgdGhpcy5sYXN0TWlsbGlzZWNvbmRzID0gKG5ldyBEYXRlKS5nZXRUaW1lKClcblxuICAgICAgLy8gICB2YXIgY3VycmVudE51bUZpbGVzID0gd2F0Y2hlZEZpbGVzLmxlbmd0aFxuICAgICAgLy8gICB2YXIgZmlsZXNvdXJjZSA9ICd0aGlzIGZpbGUgZW5hYmxlcyBjbGllbnQgcmVsb2FkJ1xuICAgICAgLy8gICBjb21waWxhdGlvbi5hc3NldHNbY3VycmVudE51bUZpbGVzICsgJ0ZpbGVzVW5kZXJBcHBGb2xkZXIubWQnXSA9IHtcbiAgICAgIC8vICAgICBzb3VyY2U6IGZ1bmN0aW9uKCkge3JldHVybiBmaWxlc291cmNlfSxcbiAgICAgIC8vICAgICBzaXplOiBmdW5jdGlvbigpIHtyZXR1cm4gZmlsZXNvdXJjZS5sZW5ndGh9XG4gICAgICAvLyAgIH1cblxuICAgICAgLy8gICBpZiAoY3VycmVudE51bUZpbGVzICE9IHRoaXMubGFzdE51bUZpbGVzIHx8IGRvQnVpbGQpIHtcbiAgICAgIC8vICAgICB2YXIgYnVpbGQgPSByZXF1aXJlKCdAZXh0anMvZXh0LWJ1aWxkL2FwcC9idWlsZC5qcycpXG4gICAgICAvLyAgICAgbmV3IGJ1aWxkKHt9KVxuICAgICAgLy8gICAgIC8vdmFyIHJlZnJlc2ggPSByZXF1aXJlKCdAZXh0anMvc2VuY2hhLWJ1aWxkL2FwcC9yZWZyZXNoLmpzJylcbiAgICAgIC8vICAgICAvL25ldyByZWZyZXNoKHt9KVxuICAgICAgLy8gICB9XG4gICAgICAvLyAgIGVsc2Uge1xuICAgICAgLy8gICAgIGNvbnNvbGUubG9nKGFwcCArICdDYWxsIHRvIFNlbmNoYSBCdWlsZCBub3QgbmVlZGVkLCBubyBuZXcgZmlsZXMnKVxuICAgICAgLy8gICB9XG4gICAgICAvLyAgIHRoaXMubGFzdE51bUZpbGVzID0gY3VycmVudE51bUZpbGVzXG5cbi8vICAgICAgfSlcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBjb21waWxlci5wbHVnaW4oJ2VtaXQnLCAoY29tcGlsYXRpb24sIGNiKSA9PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKGFwcCArICdlbWl0JylcbiAgICAgICAgdmFyIGZpbGVsaXN0ID0gJ3RoaXMgZmlsZSBlbmFibGVzIGNsaWVudCByZWxvYWQnXG4gICAgICAgIGNvbXBpbGF0aW9uLmFzc2V0c1snRm9yUmVsb2FkLm1kJ10gPSB7XG4gICAgICAgICAgc291cmNlOiBmdW5jdGlvbigpIHtyZXR1cm4gZmlsZWxpc3R9LFxuICAgICAgICAgIHNpemU6IGZ1bmN0aW9uKCkge3JldHVybiBmaWxlbGlzdC5sZW5ndGh9XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHJlZnJlc2ggPSByZXF1aXJlKCdAZXh0anMvZXh0LWJ1aWxkL2FwcC9yZWZyZXNoLmpzJylcbiAgICAgICAgbmV3IHJlZnJlc2goe30pXG5cbiAgICAgICAgLy8gY29uc29sZS5sb2coJ1RISVMgSVMgSVQnKVxuICAgICAgICAvLyB2YXIgYnVpbGRBc3luYyA9IHJlcXVpcmUoJ0BleHRqcy9leHQtYnVpbGQvYXBwL2J1aWxkQXN5bmMuanMnKVxuICAgICAgICAvLyBjb25zb2xlLmxvZyhidWlsZEFzeW5jKVxuICAgICAgICAvLyBuZXcgYnVpbGRBc3luYygpLmV4ZWN1dGVBc3luYygpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vICAgY29uc29sZS5sb2coJ3RoZW4gY2FsbCcpO1xuICAgICAgICAvLyAgIGNiKCk7XG4gICAgICAgIC8vIH0pXG5cblxuICAgICAgICAvL2NiKClcbiAgICAgICAgLy90aGlzLmVtaXRTdGF0cy5iaW5kKHRoaXMpXG5cblxuXG4gICAgICB9KVxuICAgIH1cblxuICB9XG5cblxuICAvLyBlbWl0U3RhdHMoY3VyQ29tcGlsZXIsIGNhbGxiYWNrKSB7XG4gIC8vICAgLy8gR2V0IHN0YXRzLlxuICAvLyAgIC8vICoqTm90ZSoqOiBJbiBmdXR1cmUsIGNvdWxkIHBhc3Mgc29tZXRoaW5nIGxpa2UgYHsgc2hvd0Fzc2V0czogdHJ1ZSB9YFxuICAvLyAgIC8vIHRvIHRoZSBgZ2V0U3RhdHMoKWAgZnVuY3Rpb24gZm9yIG1vcmUgbGltaXRlZCBvYmplY3QgcmV0dXJuZWQuXG4gIC8vICAgbGV0IHN0YXRzID0gY3VyQ29tcGlsZXIuZ2V0U3RhdHMoKS50b0pzb24oKTtcbiAgXG4gIC8vICAgLy8gRmlsdGVyIHRvIGZpZWxkcy5cbiAgLy8gICBpZiAodGhpcy5vcHRzLmZpZWxkcykge1xuICAvLyAgICAgc3RhdHMgPSB0aGlzLm9wdHMuZmllbGRzLnJlZHVjZSgobWVtbywga2V5KSA9PiB7XG4gIC8vICAgICAgIG1lbW9ba2V5XSA9IHN0YXRzW2tleV07XG4gIC8vICAgICAgIHJldHVybiBtZW1vO1xuICAvLyAgICAgfSwge30pO1xuICAvLyAgIH1cbiAgXG4gIC8vICAgLy8gVHJhbnNmb3JtIHRvIHN0cmluZy5cbiAgLy8gICBsZXQgZXJyO1xuICAvLyAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKVxuICBcbiAgLy8gICAgIC8vIFRyYW5zZm9ybS5cbiAgLy8gICAgIC50aGVuKCgpID0+IHRoaXMub3B0cy50cmFuc2Zvcm0oc3RhdHMsIHtcbiAgLy8gICAgICAgY29tcGlsZXI6IGN1ckNvbXBpbGVyXG4gIC8vICAgICB9KSlcbiAgLy8gICAgIC5jYXRjaCgoZSkgPT4geyBlcnIgPSBlOyB9KVxuICBcbiAgLy8gICAgIC8vIEZpbmlzaCB1cC5cbiAgLy8gICAgIC50aGVuKChzdGF0c1N0cikgPT4ge1xuICAvLyAgICAgICAvLyBIYW5kbGUgZXJyb3JzLlxuICAvLyAgICAgICBpZiAoZXJyKSB7XG4gIC8vICAgICAgICAgY3VyQ29tcGlsZXIuZXJyb3JzLnB1c2goZXJyKTtcbiAgLy8gICAgICAgICBpZiAoY2FsbGJhY2spIHsgcmV0dXJuIHZvaWQgY2FsbGJhY2soZXJyKTsgfVxuICAvLyAgICAgICAgIHRocm93IGVycjtcbiAgLy8gICAgICAgfVxuICBcbiAgLy8gICAgICAgLy8gQWRkIHRvIGFzc2V0cy5cbiAgLy8gICAgICAgY3VyQ29tcGlsZXIuYXNzZXRzW3RoaXMub3B0cy5maWxlbmFtZV0gPSB7XG4gIC8vICAgICAgICAgc291cmNlKCkge1xuICAvLyAgICAgICAgICAgcmV0dXJuIHN0YXRzU3RyO1xuICAvLyAgICAgICAgIH0sXG4gIC8vICAgICAgICAgc2l6ZSgpIHtcbiAgLy8gICAgICAgICAgIHJldHVybiBzdGF0c1N0ci5sZW5ndGg7XG4gIC8vICAgICAgICAgfVxuICAvLyAgICAgICB9O1xuICBcbiAgLy8gICAgICAgaWYgKGNhbGxiYWNrKSB7IHJldHVybiB2b2lkIGNhbGxiYWNrKCk7IH1cbiAgLy8gICAgIH0pO1xuICAvLyB9XG4gIFxuXG5cbn1cblxuXG5cblxuXG5cbiAgLy8gaWYgKGZpbGVzLmxlbmd0aCA+IDApIHtcbiAgLy8gICBmaWxlcy5mb3JFYWNoKChwYXR0ZXJuKSA9PiB7XG4gIC8vICAgICBsZXQgZiA9IHBhdHRlcm47XG4gIC8vICAgICBpZiAoaXNHbG9iKHBhdHRlcm4pKSB7XG4gIC8vICAgICAgIGYgPSBnbG9iLnN5bmMocGF0dGVybiwge1xuICAvLyAgICAgICAgIGN3ZCxcbiAgLy8gICAgICAgICBkb3Q6IHRydWUsXG4gIC8vICAgICAgICAgYWJzb2x1dGU6IHRydWUsXG4gIC8vICAgICAgIH0pO1xuICAvLyAgICAgfVxuICAvLyAgICAgZmRzID0gZmRzLmNvbmNhdChmKTtcbiAgLy8gICB9KTtcbiAgLy8gICBmZHMgPSB1bmlxKGZkcyk7XG4gIC8vIH1cblxuXG4vLyBmdW5jdGlvbiBob29rX3N0ZG91dChjYWxsYmFjaykge1xuLy8gICB2YXIgb2xkX3dyaXRlID0gcHJvY2Vzcy5zdGRvdXQud3JpdGVcbi8vICAgY29uc29sZS5sb2coJ2luIGhvb2snKVxuLy8gICBwcm9jZXNzLnN0ZG91dC53cml0ZSA9IChmdW5jdGlvbih3cml0ZSkge1xuLy8gICAgICAgcmV0dXJuIGZ1bmN0aW9uKHN0cmluZywgZW5jb2RpbmcsIGZkKSB7XG4vLyAgICAgICAgICAgd3JpdGUuYXBwbHkocHJvY2Vzcy5zdGRvdXQsIGFyZ3VtZW50cylcbi8vICAgICAgICAgICBjYWxsYmFjayhzdHJpbmcsIGVuY29kaW5nLCBmZClcbi8vICAgICAgIH1cbi8vICAgfSkocHJvY2Vzcy5zdGRvdXQud3JpdGUpXG5cbi8vICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuLy8gICAgICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUgPSBvbGRfd3JpdGVcbi8vICAgICAgIGNvbnNvbGUubG9nKCdpbiB1bmhvb2snKVxuLy8gICAgIH1cbi8vIH1cbiAgICAvLyB0aGlzLnVuaG9vayA9IGhvb2tfc3Rkb3V0KGZ1bmN0aW9uKHN0cmluZywgZW5jb2RpbmcsIGZkKSB7XG4gICAgLy8gICBjb25zb2xlLmxvZygnc3Rkb3V0OiAnICsgc3RyaW5nKVxuICAgIC8vIH0pXG5cbi8vICAgICAgICB0aGlzLnVuaG9vaygpXG5cblxuXG5cblxuICAgICAgICAvLyB2YXIgZmlsZWxpc3QgPSAnSW4gdGhpcyBidWlsZDpcXG5cXG4nO1xuXG4gICAgICAgIC8vIC8vIExvb3AgdGhyb3VnaCBhbGwgY29tcGlsZWQgYXNzZXRzLFxuICAgICAgICAvLyAvLyBhZGRpbmcgYSBuZXcgbGluZSBpdGVtIGZvciBlYWNoIGZpbGVuYW1lLlxuICAgICAgICAvLyBmb3IgKHZhciBmaWxlbmFtZSBpbiBjb21waWxhdGlvbi5hc3NldHMpIHtcbiAgICAgICAgLy8gICBmaWxlbGlzdCArPSAoJy0gJysgZmlsZW5hbWUgKydcXG4nKTtcbiAgICAgICAgLy8gfVxuICAgIFxuICAgICAgICAvLyAvLyBJbnNlcnQgdGhpcyBsaXN0IGludG8gdGhlIHdlYnBhY2sgYnVpbGQgYXMgYSBuZXcgZmlsZSBhc3NldDpcbiAgICAgICAgLy8gY29tcGlsYXRpb24uYXNzZXRzWydmaWxlbGlzdC5tZCddID0ge1xuICAgICAgICAvLyAgIHNvdXJjZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vICAgICByZXR1cm4gZmlsZWxpc3Q7XG4gICAgICAgIC8vICAgfSxcbiAgICAgICAgLy8gICBzaXplOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gICAgIHJldHVybiBmaWxlbGlzdC5sZW5ndGg7XG4gICAgICAgIC8vICAgfVxuICAgICAgICAvLyB9O1xuXG5cblxuXG5cbiAgICAgICAgLy8gLy92YXIgZCA9IG5ldyBEYXRlKClcbiAgICAgICAgLy8gdmFyIGQgPSAnbWpnJ1xuICAgICAgICAvLyB2YXIgZmlsZWxpc3QgPSAnSW4gdGhpcyBidWlsZDpcXG5cXG4nICsgZCArICdcXG5cXG4nO1xuICAgICAgICAvLyAvLyBMb29wIHRocm91Z2ggYWxsIGNvbXBpbGVkIGFzc2V0cyxcbiAgICAgICAgLy8gLy8gYWRkaW5nIGEgbmV3IGxpbmUgaXRlbSBmb3IgZWFjaCBmaWxlbmFtZS5cbiAgICAgICAgLy8gZm9yICh2YXIgZmlsZW5hbWUgaW4gY29tcGlsYXRpb24uYXNzZXRzKSB7XG4gICAgICAgIC8vICAgZmlsZWxpc3QgKz0gKCctICcrIGZpbGVuYW1lICsnXFxuJyk7XG4gICAgICAgIC8vIH1cbiAgICAgICAgLy8gLy8gSW5zZXJ0IHRoaXMgbGlzdCBpbnRvIHRoZSB3ZWJwYWNrIGJ1aWxkIGFzIGEgbmV3IGZpbGUgYXNzZXQ6XG4gICAgICAgIC8vIGNvbXBpbGF0aW9uLmFzc2V0c1tkICsgJy5tZCddID0ge1xuICAgICAgICAvLyAgIHNvdXJjZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vICAgICByZXR1cm4gZmlsZWxpc3Q7XG4gICAgICAgIC8vICAgfSxcbiAgICAgICAgLy8gICBzaXplOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gICAgIHJldHVybiBmaWxlbGlzdC5sZW5ndGg7XG4gICAgICAgIC8vICAgfVxuICAgICAgICAvLyB9OyJdfQ==