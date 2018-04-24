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
//import glob from 'glob';


//const recursiveReadSync = require('recursive-readdir-sync')

var app = _chalk2.default.green('ℹ ｢ext｣:') + ' extjs-webpack-plugin: ';

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

var ExtJSWebpackPlugin = function () {
  function ExtJSWebpackPlugin() {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, ExtJSWebpackPlugin);

    (0, _schemaUtils2.default)(require('../options.json'), options, 'ExtraWatchWebpackPlugin'); // eslint-disable-line
    this.options = _extends({}, ExtJSWebpackPlugin.defaults, options);
  }

  _createClass(ExtJSWebpackPlugin, [{
    key: 'apply',
    value: function apply(compiler) {
      var _this = this;

      if (this.webpackVersion == undefined) {
        var isWebpack4 = compiler.hooks;
        if (isWebpack4) {
          this.webpackVersion = 'IS webpack 4';
        } else {
          this.webpackVersion = 'NOT webpack 4';
        }
        this.extjsVersion = '6.5.3';
        process.stdout.cursorTo(0);console.log(app + 'Ext JS v' + this.extjsVersion + ', ' + this.webpackVersion);
      }

      var _options = this.options,
          files = _options.files,
          dirs = _options.dirs;
      var cwd = this.options.cwd;

      files = typeof files === 'string' ? [files] : files;
      dirs = typeof dirs === 'string' ? [dirs] : dirs;

      if (compiler.hooks) {
        compiler.hooks.afterCompile.tap('extjs-after-compile', function (compilation) {
          process.stdout.cursorTo(0);console.log(app + 'extjs-after-compile');

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
        compiler.hooks.emit.tap('extjs-emit', function (compilation) {
          process.stdout.cursorTo(0);console.log(app + 'extjs-emit');

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
            if (_this.lastMilliseconds < _fs2.default.statSync(watchedFiles[file]).mtimeMs) {
              if (watchedFiles[file].indexOf("scss") != -1) {
                doBuild = true;break;
              }
            }
          }
          _this.lastMilliseconds = new Date().getTime();

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

          if (currentNumFiles != _this.lastNumFiles || doBuild) {
            var build = require('@extjs/sencha-build/app/build.js');
            new build({});
            //var refresh = require('@extjs/sencha-build/app/refresh.js')
            //new refresh({})
          } else {
            console.log(app + 'Call to Sencha Build not needed, no new files');
          }
          _this.lastNumFiles = currentNumFiles;
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
          var refresh = require('@extjs/sencha-node/app/refresh.js');
          new refresh({});
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

  return ExtJSWebpackPlugin;
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


ExtJSWebpackPlugin.defaults = {
  cwd: process.cwd(),
  files: [],
  dirs: ['./app']
};
exports.default = ExtJSWebpackPlugin;
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9pbmRleC5qcyJdLCJuYW1lcyI6WyJhcHAiLCJncmVlbiIsImdldEZpbGVBbmRDb250ZXh0RGVwcyIsImNvbXBpbGF0aW9uIiwiZmlsZXMiLCJkaXJzIiwiY3dkIiwiZmlsZURlcGVuZGVuY2llcyIsImNvbnRleHREZXBlbmRlbmNpZXMiLCJpc1dlYnBhY2s0IiwiaG9va3MiLCJmZHMiLCJjZHMiLCJsZW5ndGgiLCJjb25jYXQiLCJFeHRKU1dlYnBhY2tQbHVnaW4iLCJvcHRpb25zIiwicmVxdWlyZSIsImRlZmF1bHRzIiwiY29tcGlsZXIiLCJ3ZWJwYWNrVmVyc2lvbiIsInVuZGVmaW5lZCIsImV4dGpzVmVyc2lvbiIsInByb2Nlc3MiLCJzdGRvdXQiLCJjdXJzb3JUbyIsImNvbnNvbGUiLCJsb2ciLCJhZnRlckNvbXBpbGUiLCJ0YXAiLCJmb3JFYWNoIiwiZmlsZSIsImFkZCIsImNvbnRleHQiLCJwbHVnaW4iLCJjYiIsImVtaXQiLCJ3YXRjaGVkRmlsZXMiLCJlcnIiLCJlcnJubyIsImRvQnVpbGQiLCJsYXN0TWlsbGlzZWNvbmRzIiwic3RhdFN5bmMiLCJtdGltZU1zIiwiaW5kZXhPZiIsIkRhdGUiLCJnZXRUaW1lIiwiY3VycmVudE51bUZpbGVzIiwiZmlsZXNvdXJjZSIsImFzc2V0cyIsInNvdXJjZSIsInNpemUiLCJsYXN0TnVtRmlsZXMiLCJidWlsZCIsImZpbGVsaXN0IiwicmVmcmVzaCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFFQTs7QUFDQTs7Ozs7Ozs7O0FBRkE7OztBQUdBOztBQUVBLElBQU1BLE1BQVMsZ0JBQU1DLEtBQU4sQ0FBWSxVQUFaLENBQVQsNEJBQU47O0FBRUEsU0FBU0MscUJBQVQsQ0FBK0JDLFdBQS9CLEVBQTRDQyxLQUE1QyxFQUFtREMsSUFBbkQsRUFBeURDLEdBQXpELEVBQThEO0FBQUEsTUFDcERDLGdCQURvRCxHQUNWSixXQURV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bSAnY2hhbGsnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCB2YWxpZGF0ZU9wdGlvbnMgZnJvbSAnc2NoZW1hLXV0aWxzJztcbmltcG9ydCB1bmlxIGZyb20gJ2xvZGFzaC51bmlxJztcbmltcG9ydCBpc0dsb2IgZnJvbSAnaXMtZ2xvYic7XG4vL2ltcG9ydCBnbG9iIGZyb20gJ2dsb2InO1xuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHJlY3Vyc2l2ZVJlYWRTeW5jIGZyb20gJ3JlY3Vyc2l2ZS1yZWFkZGlyLXN5bmMnO1xuLy9jb25zdCByZWN1cnNpdmVSZWFkU3luYyA9IHJlcXVpcmUoJ3JlY3Vyc2l2ZS1yZWFkZGlyLXN5bmMnKVxuXG5jb25zdCBhcHAgPSBgJHtjaGFsay5ncmVlbign4oS5IO+9omV4dO+9ozonKX0gZXh0anMtd2VicGFjay1wbHVnaW46IGA7XG5cbmZ1bmN0aW9uIGdldEZpbGVBbmRDb250ZXh0RGVwcyhjb21waWxhdGlvbiwgZmlsZXMsIGRpcnMsIGN3ZCkge1xuICBjb25zdCB7IGZpbGVEZXBlbmRlbmNpZXMsIGNvbnRleHREZXBlbmRlbmNpZXMgfSA9IGNvbXBpbGF0aW9uO1xuICBjb25zdCBpc1dlYnBhY2s0ID0gY29tcGlsYXRpb24uaG9va3M7XG4gIGxldCBmZHMgPSBpc1dlYnBhY2s0ID8gWy4uLmZpbGVEZXBlbmRlbmNpZXNdIDogZmlsZURlcGVuZGVuY2llcztcbiAgbGV0IGNkcyA9IGlzV2VicGFjazQgPyBbLi4uY29udGV4dERlcGVuZGVuY2llc10gOiBjb250ZXh0RGVwZW5kZW5jaWVzO1xuICBpZiAoZGlycy5sZW5ndGggPiAwKSB7XG4gICAgY2RzID0gdW5pcShjZHMuY29uY2F0KGRpcnMpKTtcbiAgfVxuICByZXR1cm4ge1xuICAgIGZpbGVEZXBlbmRlbmNpZXM6IGZkcyxcbiAgICBjb250ZXh0RGVwZW5kZW5jaWVzOiBjZHMsXG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEV4dEpTV2VicGFja1BsdWdpbiB7XG4gIHN0YXRpYyBkZWZhdWx0cyA9IHtcbiAgICBjd2Q6IHByb2Nlc3MuY3dkKCksXG4gICAgZmlsZXM6IFtdLFxuICAgIGRpcnM6IFsnLi9hcHAnXSxcbiAgfTtcblxuICBjb25zdHJ1Y3RvcihvcHRpb25zID0ge30pIHtcbiAgICB2YWxpZGF0ZU9wdGlvbnMocmVxdWlyZSgnLi4vb3B0aW9ucy5qc29uJyksIG9wdGlvbnMsICdFeHRyYVdhdGNoV2VicGFja1BsdWdpbicpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lXG4gICAgdGhpcy5vcHRpb25zID0geyAuLi5FeHRKU1dlYnBhY2tQbHVnaW4uZGVmYXVsdHMsIC4uLm9wdGlvbnMgfTtcbiAgfVxuXG4gIGFwcGx5KGNvbXBpbGVyKSB7XG5cbiAgICBpZiAodGhpcy53ZWJwYWNrVmVyc2lvbiA9PSB1bmRlZmluZWQpIHtcbiAgICAgIGNvbnN0IGlzV2VicGFjazQgPSBjb21waWxlci5ob29rcztcbiAgICAgIGlmIChpc1dlYnBhY2s0KSB7dGhpcy53ZWJwYWNrVmVyc2lvbiA9ICdJUyB3ZWJwYWNrIDQnfVxuICAgICAgZWxzZSB7dGhpcy53ZWJwYWNrVmVyc2lvbiA9ICdOT1Qgd2VicGFjayA0J31cbiAgICAgIHRoaXMuZXh0anNWZXJzaW9uID0gJzYuNS4zJ1xuICAgICAgcHJvY2Vzcy5zdGRvdXQuY3Vyc29yVG8oMCk7Y29uc29sZS5sb2coYXBwICsgJ0V4dCBKUyB2JyArIHRoaXMuZXh0anNWZXJzaW9uICsgJywgJyArIHRoaXMud2VicGFja1ZlcnNpb24pXG4gICAgfVxuXG4gICAgbGV0IHsgZmlsZXMsIGRpcnMgfSA9IHRoaXMub3B0aW9ucztcbiAgICBjb25zdCB7IGN3ZCB9ID0gdGhpcy5vcHRpb25zO1xuICAgIGZpbGVzID0gdHlwZW9mIGZpbGVzID09PSAnc3RyaW5nJyA/IFtmaWxlc10gOiBmaWxlcztcbiAgICBkaXJzID0gdHlwZW9mIGRpcnMgPT09ICdzdHJpbmcnID8gW2RpcnNdIDogZGlycztcblxuICAgIGlmIChjb21waWxlci5ob29rcykge1xuICAgICAgY29tcGlsZXIuaG9va3MuYWZ0ZXJDb21waWxlLnRhcCgnZXh0anMtYWZ0ZXItY29tcGlsZScsIChjb21waWxhdGlvbikgPT4ge1xuICAgICAgICBwcm9jZXNzLnN0ZG91dC5jdXJzb3JUbygwKTtjb25zb2xlLmxvZyhhcHAgKyAnZXh0anMtYWZ0ZXItY29tcGlsZScpXG4gICAgICAgIGNvbnN0IHtcbiAgICAgICAgICBmaWxlRGVwZW5kZW5jaWVzLFxuICAgICAgICAgIGNvbnRleHREZXBlbmRlbmNpZXMsXG4gICAgICAgIH0gPSBnZXRGaWxlQW5kQ29udGV4dERlcHMoY29tcGlsYXRpb24sIGZpbGVzLCBkaXJzLCBjd2QpO1xuICAgICAgICBpZiAoZmlsZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGZpbGVEZXBlbmRlbmNpZXMuZm9yRWFjaCgoZmlsZSkgPT4ge1xuICAgICAgICAgICAgY29tcGlsYXRpb24uZmlsZURlcGVuZGVuY2llcy5hZGQocmVzb2x2ZShmaWxlKSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRpcnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGNvbnRleHREZXBlbmRlbmNpZXMuZm9yRWFjaCgoY29udGV4dCkgPT4ge1xuICAgICAgICAgICAgY29tcGlsYXRpb24uY29udGV4dERlcGVuZGVuY2llcy5hZGQoY29udGV4dCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb21waWxlci5wbHVnaW4oJ2FmdGVyLWNvbXBpbGUnLCAoY29tcGlsYXRpb24sIGNiKSA9PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKGFwcCArICdhZnRlci1jb21waWxlJylcbiAgICAgICAgY29uc3Qge1xuICAgICAgICAgIGZpbGVEZXBlbmRlbmNpZXMsXG4gICAgICAgICAgY29udGV4dERlcGVuZGVuY2llcyxcbiAgICAgICAgfSA9IGdldEZpbGVBbmRDb250ZXh0RGVwcyhjb21waWxhdGlvbiwgZmlsZXMsIGRpcnMsIGN3ZCk7XG4gICAgICAgIGlmIChmaWxlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgY29tcGlsYXRpb24uZmlsZURlcGVuZGVuY2llcyA9IGZpbGVEZXBlbmRlbmNpZXM7IC8vIGVzbGludC1kaXNhYmxlLWxpbmVcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGlycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgY29tcGlsYXRpb24uY29udGV4dERlcGVuZGVuY2llcyA9IGNvbnRleHREZXBlbmRlbmNpZXM7IC8vIGVzbGludC1kaXNhYmxlLWxpbmVcbiAgICAgICAgfVxuICAgICAgICBjYigpXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAoY29tcGlsZXIuaG9va3MpIHtcbiAgICAgIGNvbXBpbGVyLmhvb2tzLmVtaXQudGFwKCdleHRqcy1lbWl0JywgKGNvbXBpbGF0aW9uKSA9PiB7XG4gICAgICAgIHByb2Nlc3Muc3Rkb3V0LmN1cnNvclRvKDApO2NvbnNvbGUubG9nKGFwcCArICdleHRqcy1lbWl0JylcblxuICAgICAgICB2YXIgd2F0Y2hlZEZpbGVzPVtdXG4gICAgICAgIHRyeSB7d2F0Y2hlZEZpbGVzID0gcmVjdXJzaXZlUmVhZFN5bmMoJy4vYXBwJyl9IFxuICAgICAgICBjYXRjaChlcnIpIHtpZihlcnIuZXJybm8gPT09IDM0KXtjb25zb2xlLmxvZygnUGF0aCBkb2VzIG5vdCBleGlzdCcpO30gZWxzZSB7dGhyb3cgZXJyO319XG5cbiAgICAgICAgdmFyIGRvQnVpbGQgPSBmYWxzZVxuICAgICAgICBmb3IgKHZhciBmaWxlIGluIHdhdGNoZWRGaWxlcykge1xuICAgICAgICAgIGlmICh0aGlzLmxhc3RNaWxsaXNlY29uZHMgPCBmcy5zdGF0U3luYyh3YXRjaGVkRmlsZXNbZmlsZV0pLm10aW1lTXMpIHtcbiAgICAgICAgICAgIGlmICh3YXRjaGVkRmlsZXNbZmlsZV0uaW5kZXhPZihcInNjc3NcIikgIT0gLTEpIHtkb0J1aWxkPXRydWU7YnJlYWs7fVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLmxhc3RNaWxsaXNlY29uZHMgPSAobmV3IERhdGUpLmdldFRpbWUoKVxuXG4gICAgICAgIHZhciBjdXJyZW50TnVtRmlsZXMgPSB3YXRjaGVkRmlsZXMubGVuZ3RoXG4gICAgICAgIHZhciBmaWxlc291cmNlID0gJ3RoaXMgZmlsZSBlbmFibGVzIGNsaWVudCByZWxvYWQnXG4gICAgICAgIGNvbXBpbGF0aW9uLmFzc2V0c1tjdXJyZW50TnVtRmlsZXMgKyAnRmlsZXNVbmRlckFwcEZvbGRlci5tZCddID0ge1xuICAgICAgICAgIHNvdXJjZTogZnVuY3Rpb24oKSB7cmV0dXJuIGZpbGVzb3VyY2V9LFxuICAgICAgICAgIHNpemU6IGZ1bmN0aW9uKCkge3JldHVybiBmaWxlc291cmNlLmxlbmd0aH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjdXJyZW50TnVtRmlsZXMgIT0gdGhpcy5sYXN0TnVtRmlsZXMgfHwgZG9CdWlsZCkge1xuICAgICAgICAgIHZhciBidWlsZCA9IHJlcXVpcmUoJ0BleHRqcy9zZW5jaGEtYnVpbGQvYXBwL2J1aWxkLmpzJylcbiAgICAgICAgICBuZXcgYnVpbGQoe30pXG4gICAgICAgICAgLy92YXIgcmVmcmVzaCA9IHJlcXVpcmUoJ0BleHRqcy9zZW5jaGEtYnVpbGQvYXBwL3JlZnJlc2guanMnKVxuICAgICAgICAgIC8vbmV3IHJlZnJlc2goe30pXG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgY29uc29sZS5sb2coYXBwICsgJ0NhbGwgdG8gU2VuY2hhIEJ1aWxkIG5vdCBuZWVkZWQsIG5vIG5ldyBmaWxlcycpXG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5sYXN0TnVtRmlsZXMgPSBjdXJyZW50TnVtRmlsZXNcblxuXG5cblxuICAgICAgfSlcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBjb21waWxlci5wbHVnaW4oJ2VtaXQnLCAoY29tcGlsYXRpb24sIGNiKSA9PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKGFwcCArICdlbWl0JylcbiAgICAgICAgdmFyIGZpbGVsaXN0ID0gJ3RoaXMgZmlsZSBlbmFibGVzIGNsaWVudCByZWxvYWQnXG4gICAgICAgIGNvbXBpbGF0aW9uLmFzc2V0c1snRm9yUmVsb2FkLm1kJ10gPSB7XG4gICAgICAgICAgc291cmNlOiBmdW5jdGlvbigpIHtyZXR1cm4gZmlsZWxpc3R9LFxuICAgICAgICAgIHNpemU6IGZ1bmN0aW9uKCkge3JldHVybiBmaWxlbGlzdC5sZW5ndGh9XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHJlZnJlc2ggPSByZXF1aXJlKCdAZXh0anMvc2VuY2hhLW5vZGUvYXBwL3JlZnJlc2guanMnKVxuICAgICAgICBuZXcgcmVmcmVzaCh7fSlcbiAgICAgICAgLy9jYigpXG4gICAgICAgIC8vdGhpcy5lbWl0U3RhdHMuYmluZCh0aGlzKVxuXG5cblxuICAgICAgfSlcbiAgICB9XG5cbiAgfVxuXG5cbiAgLy8gZW1pdFN0YXRzKGN1ckNvbXBpbGVyLCBjYWxsYmFjaykge1xuICAvLyAgIC8vIEdldCBzdGF0cy5cbiAgLy8gICAvLyAqKk5vdGUqKjogSW4gZnV0dXJlLCBjb3VsZCBwYXNzIHNvbWV0aGluZyBsaWtlIGB7IHNob3dBc3NldHM6IHRydWUgfWBcbiAgLy8gICAvLyB0byB0aGUgYGdldFN0YXRzKClgIGZ1bmN0aW9uIGZvciBtb3JlIGxpbWl0ZWQgb2JqZWN0IHJldHVybmVkLlxuICAvLyAgIGxldCBzdGF0cyA9IGN1ckNvbXBpbGVyLmdldFN0YXRzKCkudG9Kc29uKCk7XG4gIFxuICAvLyAgIC8vIEZpbHRlciB0byBmaWVsZHMuXG4gIC8vICAgaWYgKHRoaXMub3B0cy5maWVsZHMpIHtcbiAgLy8gICAgIHN0YXRzID0gdGhpcy5vcHRzLmZpZWxkcy5yZWR1Y2UoKG1lbW8sIGtleSkgPT4ge1xuICAvLyAgICAgICBtZW1vW2tleV0gPSBzdGF0c1trZXldO1xuICAvLyAgICAgICByZXR1cm4gbWVtbztcbiAgLy8gICAgIH0sIHt9KTtcbiAgLy8gICB9XG4gIFxuICAvLyAgIC8vIFRyYW5zZm9ybSB0byBzdHJpbmcuXG4gIC8vICAgbGV0IGVycjtcbiAgLy8gICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKClcbiAgXG4gIC8vICAgICAvLyBUcmFuc2Zvcm0uXG4gIC8vICAgICAudGhlbigoKSA9PiB0aGlzLm9wdHMudHJhbnNmb3JtKHN0YXRzLCB7XG4gIC8vICAgICAgIGNvbXBpbGVyOiBjdXJDb21waWxlclxuICAvLyAgICAgfSkpXG4gIC8vICAgICAuY2F0Y2goKGUpID0+IHsgZXJyID0gZTsgfSlcbiAgXG4gIC8vICAgICAvLyBGaW5pc2ggdXAuXG4gIC8vICAgICAudGhlbigoc3RhdHNTdHIpID0+IHtcbiAgLy8gICAgICAgLy8gSGFuZGxlIGVycm9ycy5cbiAgLy8gICAgICAgaWYgKGVycikge1xuICAvLyAgICAgICAgIGN1ckNvbXBpbGVyLmVycm9ycy5wdXNoKGVycik7XG4gIC8vICAgICAgICAgaWYgKGNhbGxiYWNrKSB7IHJldHVybiB2b2lkIGNhbGxiYWNrKGVycik7IH1cbiAgLy8gICAgICAgICB0aHJvdyBlcnI7XG4gIC8vICAgICAgIH1cbiAgXG4gIC8vICAgICAgIC8vIEFkZCB0byBhc3NldHMuXG4gIC8vICAgICAgIGN1ckNvbXBpbGVyLmFzc2V0c1t0aGlzLm9wdHMuZmlsZW5hbWVdID0ge1xuICAvLyAgICAgICAgIHNvdXJjZSgpIHtcbiAgLy8gICAgICAgICAgIHJldHVybiBzdGF0c1N0cjtcbiAgLy8gICAgICAgICB9LFxuICAvLyAgICAgICAgIHNpemUoKSB7XG4gIC8vICAgICAgICAgICByZXR1cm4gc3RhdHNTdHIubGVuZ3RoO1xuICAvLyAgICAgICAgIH1cbiAgLy8gICAgICAgfTtcbiAgXG4gIC8vICAgICAgIGlmIChjYWxsYmFjaykgeyByZXR1cm4gdm9pZCBjYWxsYmFjaygpOyB9XG4gIC8vICAgICB9KTtcbiAgLy8gfVxuICBcblxuXG59XG5cblxuXG5cblxuXG4gIC8vIGlmIChmaWxlcy5sZW5ndGggPiAwKSB7XG4gIC8vICAgZmlsZXMuZm9yRWFjaCgocGF0dGVybikgPT4ge1xuICAvLyAgICAgbGV0IGYgPSBwYXR0ZXJuO1xuICAvLyAgICAgaWYgKGlzR2xvYihwYXR0ZXJuKSkge1xuICAvLyAgICAgICBmID0gZ2xvYi5zeW5jKHBhdHRlcm4sIHtcbiAgLy8gICAgICAgICBjd2QsXG4gIC8vICAgICAgICAgZG90OiB0cnVlLFxuICAvLyAgICAgICAgIGFic29sdXRlOiB0cnVlLFxuICAvLyAgICAgICB9KTtcbiAgLy8gICAgIH1cbiAgLy8gICAgIGZkcyA9IGZkcy5jb25jYXQoZik7XG4gIC8vICAgfSk7XG4gIC8vICAgZmRzID0gdW5pcShmZHMpO1xuICAvLyB9XG5cblxuLy8gZnVuY3Rpb24gaG9va19zdGRvdXQoY2FsbGJhY2spIHtcbi8vICAgdmFyIG9sZF93cml0ZSA9IHByb2Nlc3Muc3Rkb3V0LndyaXRlXG4vLyAgIGNvbnNvbGUubG9nKCdpbiBob29rJylcbi8vICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUgPSAoZnVuY3Rpb24od3JpdGUpIHtcbi8vICAgICAgIHJldHVybiBmdW5jdGlvbihzdHJpbmcsIGVuY29kaW5nLCBmZCkge1xuLy8gICAgICAgICAgIHdyaXRlLmFwcGx5KHByb2Nlc3Muc3Rkb3V0LCBhcmd1bWVudHMpXG4vLyAgICAgICAgICAgY2FsbGJhY2soc3RyaW5nLCBlbmNvZGluZywgZmQpXG4vLyAgICAgICB9XG4vLyAgIH0pKHByb2Nlc3Muc3Rkb3V0LndyaXRlKVxuXG4vLyAgIHJldHVybiBmdW5jdGlvbigpIHtcbi8vICAgICAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlID0gb2xkX3dyaXRlXG4vLyAgICAgICBjb25zb2xlLmxvZygnaW4gdW5ob29rJylcbi8vICAgICB9XG4vLyB9XG4gICAgLy8gdGhpcy51bmhvb2sgPSBob29rX3N0ZG91dChmdW5jdGlvbihzdHJpbmcsIGVuY29kaW5nLCBmZCkge1xuICAgIC8vICAgY29uc29sZS5sb2coJ3N0ZG91dDogJyArIHN0cmluZylcbiAgICAvLyB9KVxuXG4vLyAgICAgICAgdGhpcy51bmhvb2soKVxuXG5cblxuXG5cbiAgICAgICAgLy8gdmFyIGZpbGVsaXN0ID0gJ0luIHRoaXMgYnVpbGQ6XFxuXFxuJztcblxuICAgICAgICAvLyAvLyBMb29wIHRocm91Z2ggYWxsIGNvbXBpbGVkIGFzc2V0cyxcbiAgICAgICAgLy8gLy8gYWRkaW5nIGEgbmV3IGxpbmUgaXRlbSBmb3IgZWFjaCBmaWxlbmFtZS5cbiAgICAgICAgLy8gZm9yICh2YXIgZmlsZW5hbWUgaW4gY29tcGlsYXRpb24uYXNzZXRzKSB7XG4gICAgICAgIC8vICAgZmlsZWxpc3QgKz0gKCctICcrIGZpbGVuYW1lICsnXFxuJyk7XG4gICAgICAgIC8vIH1cbiAgICBcbiAgICAgICAgLy8gLy8gSW5zZXJ0IHRoaXMgbGlzdCBpbnRvIHRoZSB3ZWJwYWNrIGJ1aWxkIGFzIGEgbmV3IGZpbGUgYXNzZXQ6XG4gICAgICAgIC8vIGNvbXBpbGF0aW9uLmFzc2V0c1snZmlsZWxpc3QubWQnXSA9IHtcbiAgICAgICAgLy8gICBzb3VyY2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyAgICAgcmV0dXJuIGZpbGVsaXN0O1xuICAgICAgICAvLyAgIH0sXG4gICAgICAgIC8vICAgc2l6ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vICAgICByZXR1cm4gZmlsZWxpc3QubGVuZ3RoO1xuICAgICAgICAvLyAgIH1cbiAgICAgICAgLy8gfTtcblxuXG5cblxuXG4gICAgICAgIC8vIC8vdmFyIGQgPSBuZXcgRGF0ZSgpXG4gICAgICAgIC8vIHZhciBkID0gJ21qZydcbiAgICAgICAgLy8gdmFyIGZpbGVsaXN0ID0gJ0luIHRoaXMgYnVpbGQ6XFxuXFxuJyArIGQgKyAnXFxuXFxuJztcbiAgICAgICAgLy8gLy8gTG9vcCB0aHJvdWdoIGFsbCBjb21waWxlZCBhc3NldHMsXG4gICAgICAgIC8vIC8vIGFkZGluZyBhIG5ldyBsaW5lIGl0ZW0gZm9yIGVhY2ggZmlsZW5hbWUuXG4gICAgICAgIC8vIGZvciAodmFyIGZpbGVuYW1lIGluIGNvbXBpbGF0aW9uLmFzc2V0cykge1xuICAgICAgICAvLyAgIGZpbGVsaXN0ICs9ICgnLSAnKyBmaWxlbmFtZSArJ1xcbicpO1xuICAgICAgICAvLyB9XG4gICAgICAgIC8vIC8vIEluc2VydCB0aGlzIGxpc3QgaW50byB0aGUgd2VicGFjayBidWlsZCBhcyBhIG5ldyBmaWxlIGFzc2V0OlxuICAgICAgICAvLyBjb21waWxhdGlvbi5hc3NldHNbZCArICcubWQnXSA9IHtcbiAgICAgICAgLy8gICBzb3VyY2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyAgICAgcmV0dXJuIGZpbGVsaXN0O1xuICAgICAgICAvLyAgIH0sXG4gICAgICAgIC8vICAgc2l6ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vICAgICByZXR1cm4gZmlsZWxpc3QubGVuZ3RoO1xuICAgICAgICAvLyAgIH1cbiAgICAgICAgLy8gfTsiXX0=