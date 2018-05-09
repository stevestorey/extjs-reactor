'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _chalk = require('chalk');

var _chalk2 = _interopRequireDefault(_chalk);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _schemaUtils = require('schema-utils');

var _schemaUtils2 = _interopRequireDefault(_schemaUtils);

var _lodash = require('lodash.uniq');

var _lodash2 = _interopRequireDefault(_lodash);

var _isGlob = require('is-glob');

var _isGlob2 = _interopRequireDefault(_isGlob);

var _path = require('path');

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

// function callP() {
//   return new Promise(function(resolve, reject) {
//     setTimeout(function(){ resolve(0) }, 5000);
//   })
// }


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
        var pkg = _fs2.default.existsSync('../package.json') && JSON.parse(_fs2.default.readFileSync('../package.json', 'utf-8')) || {};
        var version = pkg.version;

        var isWebpack4 = compiler.hooks;
        if (isWebpack4) {
          this.webpackVersion = 'IS webpack 4';
        } else {
          this.webpackVersion = 'NOT webpack 4';
        }
        this.extVersion = '6.5.3';
        process.stdout.cursorTo(0);console.log(app + 'v' + version + '. Ext JS v' + this.extVersion + ', ' + this.webpackVersion);
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
            console.log(app + 'Call to ExtBuild not needed, no new files');
            cb();
          }
        });

        compiler.hooks.emit.tap('ext-emit', function (compilation) {
          process.stdout.cursorTo(0);console.log(app + 'extjs-emit');

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9pbmRleC5qcyJdLCJuYW1lcyI6WyJhcHAiLCJjaGFsayIsImdyZWVuIiwiZ2V0RmlsZUFuZENvbnRleHREZXBzIiwiY29tcGlsYXRpb24iLCJmaWxlcyIsImRpcnMiLCJjd2QiLCJmaWxlRGVwZW5kZW5jaWVzIiwiY29udGV4dERlcGVuZGVuY2llcyIsImlzV2VicGFjazQiLCJob29rcyIsImZkcyIsImNkcyIsImxlbmd0aCIsImNvbmNhdCIsIkV4dFdlYnBhY2tQbHVnaW4iLCJvcHRpb25zIiwicmVxdWlyZSIsImRlZmF1bHRzIiwiY29tcGlsZXIiLCJ3ZWJwYWNrVmVyc2lvbiIsInVuZGVmaW5lZCIsInBrZyIsImZzIiwiZXhpc3RzU3luYyIsIkpTT04iLCJwYXJzZSIsInJlYWRGaWxlU3luYyIsInZlcnNpb24iLCJleHRWZXJzaW9uIiwicHJvY2VzcyIsInN0ZG91dCIsImN1cnNvclRvIiwiY29uc29sZSIsImxvZyIsImFmdGVyQ29tcGlsZSIsInRhcCIsImZvckVhY2giLCJmaWxlIiwiYWRkIiwiY29udGV4dCIsInBsdWdpbiIsImNiIiwibWUiLCJlbWl0IiwidGFwQXN5bmMiLCJ3YXRjaGVkRmlsZXMiLCJlcnIiLCJlcnJubyIsImRvQnVpbGQiLCJsYXN0TWlsbGlzZWNvbmRzIiwic3RhdFN5bmMiLCJtdGltZU1zIiwiaW5kZXhPZiIsIkRhdGUiLCJnZXRUaW1lIiwiY3VycmVudE51bUZpbGVzIiwiZmlsZXNvdXJjZSIsImFzc2V0cyIsInNvdXJjZSIsInNpemUiLCJsYXN0TnVtRmlsZXMiLCJidWlsZEFzeW5jIiwiZXhlY3V0ZUFzeW5jIiwidGhlbiIsImZpbGVsaXN0IiwicmVmcmVzaCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7QUFDQTs7Ozs7Ozs7OztBQUNBLElBQU1BLE1BQVNDLGdCQUFNQyxLQUFOLENBQVksVUFBWixDQUFULDBCQUFOOztBQUVB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LEVBQVo7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7O0FBSUQsU0F4QkQ7QUF5QkQ7QUFFRjs7QUFHRDtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7Ozs7Ozs7QUFXQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFHRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJO0FBQ0E7QUFDQTs7QUFFSjs7O0FBTVE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQU1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQXpUYW5ELGdCLENBQ1pHLFEsR0FBVztBQUNoQlosT0FBS3dCLFFBQVF4QixHQUFSLEVBRFc7QUFFaEJGLFNBQU8sRUFGUztBQUdoQkMsUUFBTSxDQUFDLE9BQUQ7QUFIVSxDO2tCQURDVSxnQiIsImZpbGUiOiJpbmRleC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHZhbGlkYXRlT3B0aW9ucyBmcm9tICdzY2hlbWEtdXRpbHMnO1xuaW1wb3J0IHVuaXEgZnJvbSAnbG9kYXNoLnVuaXEnO1xuaW1wb3J0IGlzR2xvYiBmcm9tICdpcy1nbG9iJztcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdwYXRoJztcbmltcG9ydCByZWN1cnNpdmVSZWFkU3luYyBmcm9tICdyZWN1cnNpdmUtcmVhZGRpci1zeW5jJztcbmNvbnN0IGFwcCA9IGAke2NoYWxrLmdyZWVuKCfihLkg772iZXh0772jOicpfSBleHQtd2VicGFjay1wbHVnaW46IGA7XG5cbmZ1bmN0aW9uIGdldEZpbGVBbmRDb250ZXh0RGVwcyhjb21waWxhdGlvbiwgZmlsZXMsIGRpcnMsIGN3ZCkge1xuICBjb25zdCB7IGZpbGVEZXBlbmRlbmNpZXMsIGNvbnRleHREZXBlbmRlbmNpZXMgfSA9IGNvbXBpbGF0aW9uO1xuICBjb25zdCBpc1dlYnBhY2s0ID0gY29tcGlsYXRpb24uaG9va3M7XG4gIGxldCBmZHMgPSBpc1dlYnBhY2s0ID8gWy4uLmZpbGVEZXBlbmRlbmNpZXNdIDogZmlsZURlcGVuZGVuY2llcztcbiAgbGV0IGNkcyA9IGlzV2VicGFjazQgPyBbLi4uY29udGV4dERlcGVuZGVuY2llc10gOiBjb250ZXh0RGVwZW5kZW5jaWVzO1xuICBpZiAoZGlycy5sZW5ndGggPiAwKSB7XG4gICAgY2RzID0gdW5pcShjZHMuY29uY2F0KGRpcnMpKTtcbiAgfVxuICByZXR1cm4ge1xuICAgIGZpbGVEZXBlbmRlbmNpZXM6IGZkcyxcbiAgICBjb250ZXh0RGVwZW5kZW5jaWVzOiBjZHMsXG4gIH07XG59XG5cblxuLy8gZnVuY3Rpb24gY2FsbFAoKSB7XG4vLyAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbi8vICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7IHJlc29sdmUoMCkgfSwgNTAwMCk7XG4vLyAgIH0pXG4vLyB9XG5cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRXh0V2VicGFja1BsdWdpbiB7XG4gIHN0YXRpYyBkZWZhdWx0cyA9IHtcbiAgICBjd2Q6IHByb2Nlc3MuY3dkKCksXG4gICAgZmlsZXM6IFtdLFxuICAgIGRpcnM6IFsnLi9hcHAnXSxcbiAgfTtcblxuICBjb25zdHJ1Y3RvcihvcHRpb25zID0ge30pIHtcbiAgICB2YWxpZGF0ZU9wdGlvbnMocmVxdWlyZSgnLi4vb3B0aW9ucy5qc29uJyksIG9wdGlvbnMsICdFeHRyYVdhdGNoV2VicGFja1BsdWdpbicpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lXG4gICAgdGhpcy5vcHRpb25zID0geyAuLi5FeHRXZWJwYWNrUGx1Z2luLmRlZmF1bHRzLCAuLi5vcHRpb25zIH07XG4gIH1cblxuICBhcHBseShjb21waWxlcikge1xuXG4gICAgaWYgKHRoaXMud2VicGFja1ZlcnNpb24gPT0gdW5kZWZpbmVkKSB7XG4gICAgICB2YXIgcGtnID0gKGZzLmV4aXN0c1N5bmMoJy4uL3BhY2thZ2UuanNvbicpICYmIEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKCcuLi9wYWNrYWdlLmpzb24nLCAndXRmLTgnKSkgfHwge30pO1xuICAgICAgdmFyIHZlcnNpb24gPSBwa2cudmVyc2lvblxuICBcbiAgICAgIGNvbnN0IGlzV2VicGFjazQgPSBjb21waWxlci5ob29rcztcbiAgICAgIGlmIChpc1dlYnBhY2s0KSB7dGhpcy53ZWJwYWNrVmVyc2lvbiA9ICdJUyB3ZWJwYWNrIDQnfVxuICAgICAgZWxzZSB7dGhpcy53ZWJwYWNrVmVyc2lvbiA9ICdOT1Qgd2VicGFjayA0J31cbiAgICAgIHRoaXMuZXh0VmVyc2lvbiA9ICc2LjUuMydcbiAgICAgIHByb2Nlc3Muc3Rkb3V0LmN1cnNvclRvKDApO2NvbnNvbGUubG9nKGFwcCArICd2JyArIHZlcnNpb24gKyAnLiBFeHQgSlMgdicgKyB0aGlzLmV4dFZlcnNpb24gKyAnLCAnICsgdGhpcy53ZWJwYWNrVmVyc2lvbilcbiAgICB9XG5cbiAgICBsZXQgeyBmaWxlcywgZGlycyB9ID0gdGhpcy5vcHRpb25zO1xuICAgIGNvbnN0IHsgY3dkIH0gPSB0aGlzLm9wdGlvbnM7XG4gICAgZmlsZXMgPSB0eXBlb2YgZmlsZXMgPT09ICdzdHJpbmcnID8gW2ZpbGVzXSA6IGZpbGVzO1xuICAgIGRpcnMgPSB0eXBlb2YgZGlycyA9PT0gJ3N0cmluZycgPyBbZGlyc10gOiBkaXJzO1xuXG4gICAgaWYgKGNvbXBpbGVyLmhvb2tzKSB7XG4gICAgICBjb21waWxlci5ob29rcy5hZnRlckNvbXBpbGUudGFwKCdleHQtYWZ0ZXItY29tcGlsZScsIChjb21waWxhdGlvbikgPT4ge1xuICAgICAgICBwcm9jZXNzLnN0ZG91dC5jdXJzb3JUbygwKTtjb25zb2xlLmxvZyhhcHAgKyAnZXh0LWFmdGVyLWNvbXBpbGUnKVxuICAgICAgICBjb25zdCB7XG4gICAgICAgICAgZmlsZURlcGVuZGVuY2llcyxcbiAgICAgICAgICBjb250ZXh0RGVwZW5kZW5jaWVzLFxuICAgICAgICB9ID0gZ2V0RmlsZUFuZENvbnRleHREZXBzKGNvbXBpbGF0aW9uLCBmaWxlcywgZGlycywgY3dkKTtcbiAgICAgICAgaWYgKGZpbGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBmaWxlRGVwZW5kZW5jaWVzLmZvckVhY2goKGZpbGUpID0+IHtcbiAgICAgICAgICAgIGNvbXBpbGF0aW9uLmZpbGVEZXBlbmRlbmNpZXMuYWRkKHJlc29sdmUoZmlsZSkpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkaXJzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBjb250ZXh0RGVwZW5kZW5jaWVzLmZvckVhY2goKGNvbnRleHQpID0+IHtcbiAgICAgICAgICAgIGNvbXBpbGF0aW9uLmNvbnRleHREZXBlbmRlbmNpZXMuYWRkKGNvbnRleHQpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29tcGlsZXIucGx1Z2luKCdhZnRlci1jb21waWxlJywgKGNvbXBpbGF0aW9uLCBjYikgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZyhhcHAgKyAnYWZ0ZXItY29tcGlsZScpXG4gICAgICAgIGNvbnN0IHtcbiAgICAgICAgICBmaWxlRGVwZW5kZW5jaWVzLFxuICAgICAgICAgIGNvbnRleHREZXBlbmRlbmNpZXMsXG4gICAgICAgIH0gPSBnZXRGaWxlQW5kQ29udGV4dERlcHMoY29tcGlsYXRpb24sIGZpbGVzLCBkaXJzLCBjd2QpO1xuICAgICAgICBpZiAoZmlsZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGNvbXBpbGF0aW9uLmZpbGVEZXBlbmRlbmNpZXMgPSBmaWxlRGVwZW5kZW5jaWVzOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lXG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRpcnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGNvbXBpbGF0aW9uLmNvbnRleHREZXBlbmRlbmNpZXMgPSBjb250ZXh0RGVwZW5kZW5jaWVzOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lXG4gICAgICAgIH1cbiAgICAgICAgY2IoKVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKGNvbXBpbGVyLmhvb2tzKSB7XG4gICAgICB2YXIgbWUgPSB0aGlzXG4gICAgICBjb21waWxlci5ob29rcy5lbWl0LnRhcEFzeW5jKCdleHQtZW1pdC1hc3luYycsIGZ1bmN0aW9uIChjb21waWxhdGlvbiwgY2IpIHtcbiAgICAgICAgcHJvY2Vzcy5zdGRvdXQuY3Vyc29yVG8oMCk7Y29uc29sZS5sb2coYXBwICsgJ2V4dC1lbWl0LWFzeW5jJylcblxuICAgICAgICB2YXIgd2F0Y2hlZEZpbGVzPVtdXG4gICAgICAgIHRyeSB7d2F0Y2hlZEZpbGVzID0gcmVjdXJzaXZlUmVhZFN5bmMoJy4vYXBwJyl9IFxuICAgICAgICBjYXRjaChlcnIpIHtpZihlcnIuZXJybm8gPT09IDM0KXtjb25zb2xlLmxvZygnUGF0aCBkb2VzIG5vdCBleGlzdCcpO30gZWxzZSB7dGhyb3cgZXJyO319XG5cbiAgICAgICAgdmFyIGRvQnVpbGQgPSBmYWxzZVxuICAgICAgICBmb3IgKHZhciBmaWxlIGluIHdhdGNoZWRGaWxlcykge1xuICAgICAgICAgIGlmIChtZS5sYXN0TWlsbGlzZWNvbmRzIDwgZnMuc3RhdFN5bmMod2F0Y2hlZEZpbGVzW2ZpbGVdKS5tdGltZU1zKSB7XG4gICAgICAgICAgICBpZiAod2F0Y2hlZEZpbGVzW2ZpbGVdLmluZGV4T2YoXCJzY3NzXCIpICE9IC0xKSB7ZG9CdWlsZD10cnVlO2JyZWFrO31cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgbWUubGFzdE1pbGxpc2Vjb25kcyA9IChuZXcgRGF0ZSkuZ2V0VGltZSgpXG5cbiAgICAgICAgdmFyIGN1cnJlbnROdW1GaWxlcyA9IHdhdGNoZWRGaWxlcy5sZW5ndGhcbiAgICAgICAgdmFyIGZpbGVzb3VyY2UgPSAndGhpcyBmaWxlIGVuYWJsZXMgY2xpZW50IHJlbG9hZCdcbiAgICAgICAgY29tcGlsYXRpb24uYXNzZXRzW2N1cnJlbnROdW1GaWxlcyArICdGaWxlc1VuZGVyQXBwRm9sZGVyLm1kJ10gPSB7XG4gICAgICAgICAgc291cmNlOiBmdW5jdGlvbigpIHtyZXR1cm4gZmlsZXNvdXJjZX0sXG4gICAgICAgICAgc2l6ZTogZnVuY3Rpb24oKSB7cmV0dXJuIGZpbGVzb3VyY2UubGVuZ3RofVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGN1cnJlbnROdW1GaWxlcyAhPSBtZS5sYXN0TnVtRmlsZXMgfHwgZG9CdWlsZCkge1xuICAgICAgICAgIG1lLmxhc3ROdW1GaWxlcyA9IGN1cnJlbnROdW1GaWxlc1xuICAgICAgICAgIHZhciBidWlsZEFzeW5jID0gcmVxdWlyZSgnQGV4dGpzL2V4dC1idWlsZC9hcHAvYnVpbGRBc3luYy5qcycpXG4gICAgICAgICAgbmV3IGJ1aWxkQXN5bmMoKS5leGVjdXRlQXN5bmMoKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY2IoKVxuICAgICAgICAgIH0pXG4gICAgICAgICAgXG4gICAgICAgICAgLy8gdmFyIGJ1aWxkID0gcmVxdWlyZSgnQGV4dGpzL2V4dC1idWlsZC9hcHAvYnVpbGQuanMnKVxuICAgICAgICAgIC8vIG5ldyBidWlsZCh7fSlcbiAgICAgICAgICAvL3ZhciByZWZyZXNoID0gcmVxdWlyZSgnQGV4dGpzL2V4dC1idWlsZC9hcHAvcmVmcmVzaC5qcycpXG4gICAgICAgICAgLy9uZXcgcmVmcmVzaCh7fSlcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBtZS5sYXN0TnVtRmlsZXMgPSBjdXJyZW50TnVtRmlsZXNcbiAgICAgICAgICBjb25zb2xlLmxvZyhhcHAgKyAnQ2FsbCB0byBFeHRCdWlsZCBub3QgbmVlZGVkLCBubyBuZXcgZmlsZXMnKVxuICAgICAgICAgIGNiKClcbiAgICAgICAgfVxuICAgICAgfSlcblxuXG4gICAgICBjb21waWxlci5ob29rcy5lbWl0LnRhcCgnZXh0LWVtaXQnLCAoY29tcGlsYXRpb24pID0+IHtcbiAgICAgICAgcHJvY2Vzcy5zdGRvdXQuY3Vyc29yVG8oMCk7Y29uc29sZS5sb2coYXBwICsgJ2V4dGpzLWVtaXQnKVxuXG4gICAgICAvLyAgIHZhciB3YXRjaGVkRmlsZXM9W11cbiAgICAgIC8vICAgdHJ5IHt3YXRjaGVkRmlsZXMgPSByZWN1cnNpdmVSZWFkU3luYygnLi9hcHAnKX0gXG4gICAgICAvLyAgIGNhdGNoKGVycikge2lmKGVyci5lcnJubyA9PT0gMzQpe2NvbnNvbGUubG9nKCdQYXRoIGRvZXMgbm90IGV4aXN0Jyk7fSBlbHNlIHt0aHJvdyBlcnI7fX1cblxuICAgICAgLy8gICB2YXIgZG9CdWlsZCA9IGZhbHNlXG4gICAgICAvLyAgIGZvciAodmFyIGZpbGUgaW4gd2F0Y2hlZEZpbGVzKSB7XG4gICAgICAvLyAgICAgaWYgKHRoaXMubGFzdE1pbGxpc2Vjb25kcyA8IGZzLnN0YXRTeW5jKHdhdGNoZWRGaWxlc1tmaWxlXSkubXRpbWVNcykge1xuICAgICAgLy8gICAgICAgaWYgKHdhdGNoZWRGaWxlc1tmaWxlXS5pbmRleE9mKFwic2Nzc1wiKSAhPSAtMSkge2RvQnVpbGQ9dHJ1ZTticmVhazt9XG4gICAgICAvLyAgICAgfVxuICAgICAgLy8gICB9XG4gICAgICAvLyAgIHRoaXMubGFzdE1pbGxpc2Vjb25kcyA9IChuZXcgRGF0ZSkuZ2V0VGltZSgpXG5cbiAgICAgIC8vICAgdmFyIGN1cnJlbnROdW1GaWxlcyA9IHdhdGNoZWRGaWxlcy5sZW5ndGhcbiAgICAgIC8vICAgdmFyIGZpbGVzb3VyY2UgPSAndGhpcyBmaWxlIGVuYWJsZXMgY2xpZW50IHJlbG9hZCdcbiAgICAgIC8vICAgY29tcGlsYXRpb24uYXNzZXRzW2N1cnJlbnROdW1GaWxlcyArICdGaWxlc1VuZGVyQXBwRm9sZGVyLm1kJ10gPSB7XG4gICAgICAvLyAgICAgc291cmNlOiBmdW5jdGlvbigpIHtyZXR1cm4gZmlsZXNvdXJjZX0sXG4gICAgICAvLyAgICAgc2l6ZTogZnVuY3Rpb24oKSB7cmV0dXJuIGZpbGVzb3VyY2UubGVuZ3RofVxuICAgICAgLy8gICB9XG5cbiAgICAgIC8vICAgaWYgKGN1cnJlbnROdW1GaWxlcyAhPSB0aGlzLmxhc3ROdW1GaWxlcyB8fCBkb0J1aWxkKSB7XG4gICAgICAvLyAgICAgdmFyIGJ1aWxkID0gcmVxdWlyZSgnQGV4dGpzL2V4dC1idWlsZC9hcHAvYnVpbGQuanMnKVxuICAgICAgLy8gICAgIG5ldyBidWlsZCh7fSlcbiAgICAgIC8vICAgICAvL3ZhciByZWZyZXNoID0gcmVxdWlyZSgnQGV4dGpzL3NlbmNoYS1idWlsZC9hcHAvcmVmcmVzaC5qcycpXG4gICAgICAvLyAgICAgLy9uZXcgcmVmcmVzaCh7fSlcbiAgICAgIC8vICAgfVxuICAgICAgLy8gICBlbHNlIHtcbiAgICAgIC8vICAgICBjb25zb2xlLmxvZyhhcHAgKyAnQ2FsbCB0byBTZW5jaGEgQnVpbGQgbm90IG5lZWRlZCwgbm8gbmV3IGZpbGVzJylcbiAgICAgIC8vICAgfVxuICAgICAgLy8gICB0aGlzLmxhc3ROdW1GaWxlcyA9IGN1cnJlbnROdW1GaWxlc1xuXG5cblxuXG4gICAgICB9KVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGNvbXBpbGVyLnBsdWdpbignZW1pdCcsIChjb21waWxhdGlvbiwgY2IpID0+IHtcbiAgICAgICAgY29uc29sZS5sb2coYXBwICsgJ2VtaXQnKVxuICAgICAgICB2YXIgZmlsZWxpc3QgPSAndGhpcyBmaWxlIGVuYWJsZXMgY2xpZW50IHJlbG9hZCdcbiAgICAgICAgY29tcGlsYXRpb24uYXNzZXRzWydGb3JSZWxvYWQubWQnXSA9IHtcbiAgICAgICAgICBzb3VyY2U6IGZ1bmN0aW9uKCkge3JldHVybiBmaWxlbGlzdH0sXG4gICAgICAgICAgc2l6ZTogZnVuY3Rpb24oKSB7cmV0dXJuIGZpbGVsaXN0Lmxlbmd0aH1cbiAgICAgICAgfVxuICAgICAgICB2YXIgcmVmcmVzaCA9IHJlcXVpcmUoJ0BleHRqcy9leHQtYnVpbGQvYXBwL3JlZnJlc2guanMnKVxuICAgICAgICBuZXcgcmVmcmVzaCh7fSlcblxuICAgICAgICAvLyBjb25zb2xlLmxvZygnVEhJUyBJUyBJVCcpXG4gICAgICAgIC8vIHZhciBidWlsZEFzeW5jID0gcmVxdWlyZSgnQGV4dGpzL2V4dC1idWlsZC9hcHAvYnVpbGRBc3luYy5qcycpXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGJ1aWxkQXN5bmMpXG4gICAgICAgIC8vIG5ldyBidWlsZEFzeW5jKCkuZXhlY3V0ZUFzeW5jKCkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gICBjb25zb2xlLmxvZygndGhlbiBjYWxsJyk7XG4gICAgICAgIC8vICAgY2IoKTtcbiAgICAgICAgLy8gfSlcblxuXG4gICAgICAgIC8vY2IoKVxuICAgICAgICAvL3RoaXMuZW1pdFN0YXRzLmJpbmQodGhpcylcblxuXG5cbiAgICAgIH0pXG4gICAgfVxuXG4gIH1cblxuXG4gIC8vIGVtaXRTdGF0cyhjdXJDb21waWxlciwgY2FsbGJhY2spIHtcbiAgLy8gICAvLyBHZXQgc3RhdHMuXG4gIC8vICAgLy8gKipOb3RlKio6IEluIGZ1dHVyZSwgY291bGQgcGFzcyBzb21ldGhpbmcgbGlrZSBgeyBzaG93QXNzZXRzOiB0cnVlIH1gXG4gIC8vICAgLy8gdG8gdGhlIGBnZXRTdGF0cygpYCBmdW5jdGlvbiBmb3IgbW9yZSBsaW1pdGVkIG9iamVjdCByZXR1cm5lZC5cbiAgLy8gICBsZXQgc3RhdHMgPSBjdXJDb21waWxlci5nZXRTdGF0cygpLnRvSnNvbigpO1xuICBcbiAgLy8gICAvLyBGaWx0ZXIgdG8gZmllbGRzLlxuICAvLyAgIGlmICh0aGlzLm9wdHMuZmllbGRzKSB7XG4gIC8vICAgICBzdGF0cyA9IHRoaXMub3B0cy5maWVsZHMucmVkdWNlKChtZW1vLCBrZXkpID0+IHtcbiAgLy8gICAgICAgbWVtb1trZXldID0gc3RhdHNba2V5XTtcbiAgLy8gICAgICAgcmV0dXJuIG1lbW87XG4gIC8vICAgICB9LCB7fSk7XG4gIC8vICAgfVxuICBcbiAgLy8gICAvLyBUcmFuc2Zvcm0gdG8gc3RyaW5nLlxuICAvLyAgIGxldCBlcnI7XG4gIC8vICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpXG4gIFxuICAvLyAgICAgLy8gVHJhbnNmb3JtLlxuICAvLyAgICAgLnRoZW4oKCkgPT4gdGhpcy5vcHRzLnRyYW5zZm9ybShzdGF0cywge1xuICAvLyAgICAgICBjb21waWxlcjogY3VyQ29tcGlsZXJcbiAgLy8gICAgIH0pKVxuICAvLyAgICAgLmNhdGNoKChlKSA9PiB7IGVyciA9IGU7IH0pXG4gIFxuICAvLyAgICAgLy8gRmluaXNoIHVwLlxuICAvLyAgICAgLnRoZW4oKHN0YXRzU3RyKSA9PiB7XG4gIC8vICAgICAgIC8vIEhhbmRsZSBlcnJvcnMuXG4gIC8vICAgICAgIGlmIChlcnIpIHtcbiAgLy8gICAgICAgICBjdXJDb21waWxlci5lcnJvcnMucHVzaChlcnIpO1xuICAvLyAgICAgICAgIGlmIChjYWxsYmFjaykgeyByZXR1cm4gdm9pZCBjYWxsYmFjayhlcnIpOyB9XG4gIC8vICAgICAgICAgdGhyb3cgZXJyO1xuICAvLyAgICAgICB9XG4gIFxuICAvLyAgICAgICAvLyBBZGQgdG8gYXNzZXRzLlxuICAvLyAgICAgICBjdXJDb21waWxlci5hc3NldHNbdGhpcy5vcHRzLmZpbGVuYW1lXSA9IHtcbiAgLy8gICAgICAgICBzb3VyY2UoKSB7XG4gIC8vICAgICAgICAgICByZXR1cm4gc3RhdHNTdHI7XG4gIC8vICAgICAgICAgfSxcbiAgLy8gICAgICAgICBzaXplKCkge1xuICAvLyAgICAgICAgICAgcmV0dXJuIHN0YXRzU3RyLmxlbmd0aDtcbiAgLy8gICAgICAgICB9XG4gIC8vICAgICAgIH07XG4gIFxuICAvLyAgICAgICBpZiAoY2FsbGJhY2spIHsgcmV0dXJuIHZvaWQgY2FsbGJhY2soKTsgfVxuICAvLyAgICAgfSk7XG4gIC8vIH1cbiAgXG5cblxufVxuXG5cblxuXG5cblxuICAvLyBpZiAoZmlsZXMubGVuZ3RoID4gMCkge1xuICAvLyAgIGZpbGVzLmZvckVhY2goKHBhdHRlcm4pID0+IHtcbiAgLy8gICAgIGxldCBmID0gcGF0dGVybjtcbiAgLy8gICAgIGlmIChpc0dsb2IocGF0dGVybikpIHtcbiAgLy8gICAgICAgZiA9IGdsb2Iuc3luYyhwYXR0ZXJuLCB7XG4gIC8vICAgICAgICAgY3dkLFxuICAvLyAgICAgICAgIGRvdDogdHJ1ZSxcbiAgLy8gICAgICAgICBhYnNvbHV0ZTogdHJ1ZSxcbiAgLy8gICAgICAgfSk7XG4gIC8vICAgICB9XG4gIC8vICAgICBmZHMgPSBmZHMuY29uY2F0KGYpO1xuICAvLyAgIH0pO1xuICAvLyAgIGZkcyA9IHVuaXEoZmRzKTtcbiAgLy8gfVxuXG5cbi8vIGZ1bmN0aW9uIGhvb2tfc3Rkb3V0KGNhbGxiYWNrKSB7XG4vLyAgIHZhciBvbGRfd3JpdGUgPSBwcm9jZXNzLnN0ZG91dC53cml0ZVxuLy8gICBjb25zb2xlLmxvZygnaW4gaG9vaycpXG4vLyAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlID0gKGZ1bmN0aW9uKHdyaXRlKSB7XG4vLyAgICAgICByZXR1cm4gZnVuY3Rpb24oc3RyaW5nLCBlbmNvZGluZywgZmQpIHtcbi8vICAgICAgICAgICB3cml0ZS5hcHBseShwcm9jZXNzLnN0ZG91dCwgYXJndW1lbnRzKVxuLy8gICAgICAgICAgIGNhbGxiYWNrKHN0cmluZywgZW5jb2RpbmcsIGZkKVxuLy8gICAgICAgfVxuLy8gICB9KShwcm9jZXNzLnN0ZG91dC53cml0ZSlcblxuLy8gICByZXR1cm4gZnVuY3Rpb24oKSB7XG4vLyAgICAgICBwcm9jZXNzLnN0ZG91dC53cml0ZSA9IG9sZF93cml0ZVxuLy8gICAgICAgY29uc29sZS5sb2coJ2luIHVuaG9vaycpXG4vLyAgICAgfVxuLy8gfVxuICAgIC8vIHRoaXMudW5ob29rID0gaG9va19zdGRvdXQoZnVuY3Rpb24oc3RyaW5nLCBlbmNvZGluZywgZmQpIHtcbiAgICAvLyAgIGNvbnNvbGUubG9nKCdzdGRvdXQ6ICcgKyBzdHJpbmcpXG4gICAgLy8gfSlcblxuLy8gICAgICAgIHRoaXMudW5ob29rKClcblxuXG5cblxuXG4gICAgICAgIC8vIHZhciBmaWxlbGlzdCA9ICdJbiB0aGlzIGJ1aWxkOlxcblxcbic7XG5cbiAgICAgICAgLy8gLy8gTG9vcCB0aHJvdWdoIGFsbCBjb21waWxlZCBhc3NldHMsXG4gICAgICAgIC8vIC8vIGFkZGluZyBhIG5ldyBsaW5lIGl0ZW0gZm9yIGVhY2ggZmlsZW5hbWUuXG4gICAgICAgIC8vIGZvciAodmFyIGZpbGVuYW1lIGluIGNvbXBpbGF0aW9uLmFzc2V0cykge1xuICAgICAgICAvLyAgIGZpbGVsaXN0ICs9ICgnLSAnKyBmaWxlbmFtZSArJ1xcbicpO1xuICAgICAgICAvLyB9XG4gICAgXG4gICAgICAgIC8vIC8vIEluc2VydCB0aGlzIGxpc3QgaW50byB0aGUgd2VicGFjayBidWlsZCBhcyBhIG5ldyBmaWxlIGFzc2V0OlxuICAgICAgICAvLyBjb21waWxhdGlvbi5hc3NldHNbJ2ZpbGVsaXN0Lm1kJ10gPSB7XG4gICAgICAgIC8vICAgc291cmNlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gICAgIHJldHVybiBmaWxlbGlzdDtcbiAgICAgICAgLy8gICB9LFxuICAgICAgICAvLyAgIHNpemU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyAgICAgcmV0dXJuIGZpbGVsaXN0Lmxlbmd0aDtcbiAgICAgICAgLy8gICB9XG4gICAgICAgIC8vIH07XG5cblxuXG5cblxuICAgICAgICAvLyAvL3ZhciBkID0gbmV3IERhdGUoKVxuICAgICAgICAvLyB2YXIgZCA9ICdtamcnXG4gICAgICAgIC8vIHZhciBmaWxlbGlzdCA9ICdJbiB0aGlzIGJ1aWxkOlxcblxcbicgKyBkICsgJ1xcblxcbic7XG4gICAgICAgIC8vIC8vIExvb3AgdGhyb3VnaCBhbGwgY29tcGlsZWQgYXNzZXRzLFxuICAgICAgICAvLyAvLyBhZGRpbmcgYSBuZXcgbGluZSBpdGVtIGZvciBlYWNoIGZpbGVuYW1lLlxuICAgICAgICAvLyBmb3IgKHZhciBmaWxlbmFtZSBpbiBjb21waWxhdGlvbi5hc3NldHMpIHtcbiAgICAgICAgLy8gICBmaWxlbGlzdCArPSAoJy0gJysgZmlsZW5hbWUgKydcXG4nKTtcbiAgICAgICAgLy8gfVxuICAgICAgICAvLyAvLyBJbnNlcnQgdGhpcyBsaXN0IGludG8gdGhlIHdlYnBhY2sgYnVpbGQgYXMgYSBuZXcgZmlsZSBhc3NldDpcbiAgICAgICAgLy8gY29tcGlsYXRpb24uYXNzZXRzW2QgKyAnLm1kJ10gPSB7XG4gICAgICAgIC8vICAgc291cmNlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gICAgIHJldHVybiBmaWxlbGlzdDtcbiAgICAgICAgLy8gICB9LFxuICAgICAgICAvLyAgIHNpemU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyAgICAgcmV0dXJuIGZpbGVsaXN0Lmxlbmd0aDtcbiAgICAgICAgLy8gICB9XG4gICAgICAgIC8vIH07Il19