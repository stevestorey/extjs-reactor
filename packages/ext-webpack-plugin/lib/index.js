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
        var extVersion = extPkg.sencha.version;

        var cmdPath = _path2.default.resolve(pluginPath, '../sencha-cmd');
        var cmdPkg = _fs2.default.existsSync(cmdPath + '/package.json') && JSON.parse(_fs2.default.readFileSync(cmdPath + '/package.json', 'utf-8')) || {};
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9pbmRleC5qcyJdLCJuYW1lcyI6WyJhcHAiLCJjaGFsayIsImdyZWVuIiwiZ2V0RmlsZUFuZENvbnRleHREZXBzIiwiY29tcGlsYXRpb24iLCJmaWxlcyIsImRpcnMiLCJjd2QiLCJmaWxlRGVwZW5kZW5jaWVzIiwiY29udGV4dERlcGVuZGVuY2llcyIsImlzV2VicGFjazQiLCJob29rcyIsImZkcyIsImNkcyIsImxlbmd0aCIsImNvbmNhdCIsIkV4dFdlYnBhY2tQbHVnaW4iLCJvcHRpb25zIiwicmVxdWlyZSIsImRlZmF1bHRzIiwiY29tcGlsZXIiLCJ3ZWJwYWNrVmVyc2lvbiIsInVuZGVmaW5lZCIsInBsdWdpblBhdGgiLCJwYXRoIiwicmVzb2x2ZSIsIl9fZGlybmFtZSIsInBsdWdpblBrZyIsImZzIiwiZXhpc3RzU3luYyIsIkpTT04iLCJwYXJzZSIsInJlYWRGaWxlU3luYyIsInBsdWdpblZlcnNpb24iLCJ2ZXJzaW9uIiwiZXh0UGF0aCIsImV4dFBrZyIsImV4dFZlcnNpb24iLCJzZW5jaGEiLCJjbWRQYXRoIiwiY21kUGtnIiwiY21kVmVyc2lvbiIsInZlcnNpb25fZnVsbCIsInByb2Nlc3MiLCJzdGRvdXQiLCJjdXJzb3JUbyIsImNvbnNvbGUiLCJsb2ciLCJhZnRlckNvbXBpbGUiLCJ0YXAiLCJmb3JFYWNoIiwiZmlsZSIsImFkZCIsImNvbnRleHQiLCJwbHVnaW4iLCJjYiIsIm1lIiwiZW1pdCIsInRhcEFzeW5jIiwid2F0Y2hlZEZpbGVzIiwiZXJyIiwiZXJybm8iLCJkb0J1aWxkIiwibGFzdE1pbGxpc2Vjb25kcyIsInN0YXRTeW5jIiwibXRpbWVNcyIsImluZGV4T2YiLCJEYXRlIiwiZ2V0VGltZSIsImN1cnJlbnROdW1GaWxlcyIsImZpbGVzb3VyY2UiLCJhc3NldHMiLCJzb3VyY2UiLCJzaXplIiwibGFzdE51bUZpbGVzIiwiYnVpbGRBc3luYyIsInBhcm1zIiwiZXhlY3V0ZUFzeW5jIiwidGhlbiIsImZpbGVsaXN0Iiwi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QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFHRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJO0FBQ0E7QUFDQTs7QUFFSjs7O0FBTVE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQU1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQS9UYWhFLGdCLENBQ1pHLFEsR0FBVztBQUNoQlosT0FBS29DLFFBQVFwQyxHQUFSLEVBRFc7QUFFaEJGLFNBQU8sRUFGUztBQUdoQkMsUUFBTSxDQUFDLE9BQUQ7QUFIVSxDO2tCQURDVSxnQiIsImZpbGUiOiJpbmRleC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJ1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCB2YWxpZGF0ZU9wdGlvbnMgZnJvbSAnc2NoZW1hLXV0aWxzJztcbmltcG9ydCB1bmlxIGZyb20gJ2xvZGFzaC51bmlxJztcbmltcG9ydCBpc0dsb2IgZnJvbSAnaXMtZ2xvYic7XG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgcmVjdXJzaXZlUmVhZFN5bmMgZnJvbSAncmVjdXJzaXZlLXJlYWRkaXItc3luYyc7XG5jb25zdCBhcHAgPSBgJHtjaGFsay5ncmVlbign4oS5IO+9omV4dO+9ozonKX0gZXh0LXdlYnBhY2stcGx1Z2luOiBgO1xuXG5mdW5jdGlvbiBnZXRGaWxlQW5kQ29udGV4dERlcHMoY29tcGlsYXRpb24sIGZpbGVzLCBkaXJzLCBjd2QpIHtcbiAgY29uc3QgeyBmaWxlRGVwZW5kZW5jaWVzLCBjb250ZXh0RGVwZW5kZW5jaWVzIH0gPSBjb21waWxhdGlvbjtcbiAgY29uc3QgaXNXZWJwYWNrNCA9IGNvbXBpbGF0aW9uLmhvb2tzO1xuICBsZXQgZmRzID0gaXNXZWJwYWNrNCA/IFsuLi5maWxlRGVwZW5kZW5jaWVzXSA6IGZpbGVEZXBlbmRlbmNpZXM7XG4gIGxldCBjZHMgPSBpc1dlYnBhY2s0ID8gWy4uLmNvbnRleHREZXBlbmRlbmNpZXNdIDogY29udGV4dERlcGVuZGVuY2llcztcbiAgaWYgKGRpcnMubGVuZ3RoID4gMCkge1xuICAgIGNkcyA9IHVuaXEoY2RzLmNvbmNhdChkaXJzKSk7XG4gIH1cbiAgcmV0dXJuIHtcbiAgICBmaWxlRGVwZW5kZW5jaWVzOiBmZHMsXG4gICAgY29udGV4dERlcGVuZGVuY2llczogY2RzLFxuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBFeHRXZWJwYWNrUGx1Z2luIHtcbiAgc3RhdGljIGRlZmF1bHRzID0ge1xuICAgIGN3ZDogcHJvY2Vzcy5jd2QoKSxcbiAgICBmaWxlczogW10sXG4gICAgZGlyczogWycuL2FwcCddLFxuICB9O1xuXG4gIGNvbnN0cnVjdG9yKG9wdGlvbnMgPSB7fSkge1xuICAgIHZhbGlkYXRlT3B0aW9ucyhyZXF1aXJlKCcuLi9vcHRpb25zLmpzb24nKSwgb3B0aW9ucywgJ0V4dHJhV2F0Y2hXZWJwYWNrUGx1Z2luJyk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmVcbiAgICB0aGlzLm9wdGlvbnMgPSB7IC4uLkV4dFdlYnBhY2tQbHVnaW4uZGVmYXVsdHMsIC4uLm9wdGlvbnMgfTtcbiAgfVxuXG4gIGFwcGx5KGNvbXBpbGVyKSB7XG5cbiAgICBpZiAodGhpcy53ZWJwYWNrVmVyc2lvbiA9PSB1bmRlZmluZWQpIHtcbiAgICAgIHZhciBwbHVnaW5QYXRoID0gcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwnLi4nKVxuICAgICAgdmFyIHBsdWdpblBrZyA9IChmcy5leGlzdHNTeW5jKHBsdWdpblBhdGgrJy9wYWNrYWdlLmpzb24nKSAmJiBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhwbHVnaW5QYXRoKycvcGFja2FnZS5qc29uJywgJ3V0Zi04JykpIHx8IHt9KTtcbiAgICAgIHZhciBwbHVnaW5WZXJzaW9uID0gcGx1Z2luUGtnLnZlcnNpb25cbiAgXG4gICAgICB2YXIgZXh0UGF0aCA9IHBhdGgucmVzb2x2ZShwbHVnaW5QYXRoLCcuLi9leHQnKVxuICAgICAgdmFyIGV4dFBrZyA9IChmcy5leGlzdHNTeW5jKGV4dFBhdGgrJy9wYWNrYWdlLmpzb24nKSAmJiBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhleHRQYXRoKycvcGFja2FnZS5qc29uJywgJ3V0Zi04JykpIHx8IHt9KTtcbiAgICAgIHZhciBleHRWZXJzaW9uID0gZXh0UGtnLnNlbmNoYS52ZXJzaW9uXG5cbiAgICAgIHZhciBjbWRQYXRoID0gcGF0aC5yZXNvbHZlKHBsdWdpblBhdGgsJy4uL3NlbmNoYS1jbWQnKVxuICAgICAgdmFyIGNtZFBrZyA9IChmcy5leGlzdHNTeW5jKGNtZFBhdGgrJy9wYWNrYWdlLmpzb24nKSAmJiBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhjbWRQYXRoKycvcGFja2FnZS5qc29uJywgJ3V0Zi04JykpIHx8IHt9KTtcbiAgICAgIHZhciBjbWRWZXJzaW9uID0gY21kUGtnLnZlcnNpb25fZnVsbFxuXG4gICAgICBjb25zdCBpc1dlYnBhY2s0ID0gY29tcGlsZXIuaG9va3M7XG4gICAgICBpZiAoaXNXZWJwYWNrNCkge3RoaXMud2VicGFja1ZlcnNpb24gPSAnSVMgd2VicGFjayA0J31cbiAgICAgIGVsc2Uge3RoaXMud2VicGFja1ZlcnNpb24gPSAnTk9UIHdlYnBhY2sgNCd9XG4gICAgICBwcm9jZXNzLnN0ZG91dC5jdXJzb3JUbygwKTtjb25zb2xlLmxvZyhhcHAgKyAndicgKyBwbHVnaW5WZXJzaW9uICsgJywgRXh0IEpTIHYnICsgZXh0VmVyc2lvbiArICcsIFNlbmNoYSBDbWQgdicgKyBjbWRWZXJzaW9uICsgJywgJyArIHRoaXMud2VicGFja1ZlcnNpb24pXG4gICAgfVxuXG4gICAgbGV0IHsgZmlsZXMsIGRpcnMgfSA9IHRoaXMub3B0aW9ucztcbiAgICBjb25zdCB7IGN3ZCB9ID0gdGhpcy5vcHRpb25zO1xuICAgIGZpbGVzID0gdHlwZW9mIGZpbGVzID09PSAnc3RyaW5nJyA/IFtmaWxlc10gOiBmaWxlcztcbiAgICBkaXJzID0gdHlwZW9mIGRpcnMgPT09ICdzdHJpbmcnID8gW2RpcnNdIDogZGlycztcblxuICAgIGlmIChjb21waWxlci5ob29rcykge1xuICAgICAgY29tcGlsZXIuaG9va3MuYWZ0ZXJDb21waWxlLnRhcCgnZXh0LWFmdGVyLWNvbXBpbGUnLCAoY29tcGlsYXRpb24pID0+IHtcbiAgICAgICAgcHJvY2Vzcy5zdGRvdXQuY3Vyc29yVG8oMCk7Y29uc29sZS5sb2coYXBwICsgJ2V4dC1hZnRlci1jb21waWxlJylcbiAgICAgICAgY29uc3Qge1xuICAgICAgICAgIGZpbGVEZXBlbmRlbmNpZXMsXG4gICAgICAgICAgY29udGV4dERlcGVuZGVuY2llcyxcbiAgICAgICAgfSA9IGdldEZpbGVBbmRDb250ZXh0RGVwcyhjb21waWxhdGlvbiwgZmlsZXMsIGRpcnMsIGN3ZCk7XG4gICAgICAgIGlmIChmaWxlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgZmlsZURlcGVuZGVuY2llcy5mb3JFYWNoKChmaWxlKSA9PiB7XG4gICAgICAgICAgICBjb21waWxhdGlvbi5maWxlRGVwZW5kZW5jaWVzLmFkZChyZXNvbHZlKGZpbGUpKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGlycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgY29udGV4dERlcGVuZGVuY2llcy5mb3JFYWNoKChjb250ZXh0KSA9PiB7XG4gICAgICAgICAgICBjb21waWxhdGlvbi5jb250ZXh0RGVwZW5kZW5jaWVzLmFkZChjb250ZXh0KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbXBpbGVyLnBsdWdpbignYWZ0ZXItY29tcGlsZScsIChjb21waWxhdGlvbiwgY2IpID0+IHtcbiAgICAgICAgY29uc29sZS5sb2coYXBwICsgJ2FmdGVyLWNvbXBpbGUnKVxuICAgICAgICBjb25zdCB7XG4gICAgICAgICAgZmlsZURlcGVuZGVuY2llcyxcbiAgICAgICAgICBjb250ZXh0RGVwZW5kZW5jaWVzLFxuICAgICAgICB9ID0gZ2V0RmlsZUFuZENvbnRleHREZXBzKGNvbXBpbGF0aW9uLCBmaWxlcywgZGlycywgY3dkKTtcbiAgICAgICAgaWYgKGZpbGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBjb21waWxhdGlvbi5maWxlRGVwZW5kZW5jaWVzID0gZmlsZURlcGVuZGVuY2llczsgLy8gZXNsaW50LWRpc2FibGUtbGluZVxuICAgICAgICB9XG4gICAgICAgIGlmIChkaXJzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBjb21waWxhdGlvbi5jb250ZXh0RGVwZW5kZW5jaWVzID0gY29udGV4dERlcGVuZGVuY2llczsgLy8gZXNsaW50LWRpc2FibGUtbGluZVxuICAgICAgICB9XG4gICAgICAgIGNiKClcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmIChjb21waWxlci5ob29rcykge1xuICAgICAgdmFyIG1lID0gdGhpc1xuICAgICAgY29tcGlsZXIuaG9va3MuZW1pdC50YXBBc3luYygnZXh0LWVtaXQtYXN5bmMnLCBmdW5jdGlvbiAoY29tcGlsYXRpb24sIGNiKSB7XG4gICAgICAgIHByb2Nlc3Muc3Rkb3V0LmN1cnNvclRvKDApO2NvbnNvbGUubG9nKGFwcCArICdleHQtZW1pdC1hc3luYycpXG5cbiAgICAgICAgdmFyIHdhdGNoZWRGaWxlcz1bXVxuICAgICAgICB0cnkge3dhdGNoZWRGaWxlcyA9IHJlY3Vyc2l2ZVJlYWRTeW5jKCcuL2FwcCcpfSBcbiAgICAgICAgY2F0Y2goZXJyKSB7aWYoZXJyLmVycm5vID09PSAzNCl7Y29uc29sZS5sb2coJ1BhdGggZG9lcyBub3QgZXhpc3QnKTt9IGVsc2Uge3Rocm93IGVycjt9fVxuXG4gICAgICAgIHZhciBkb0J1aWxkID0gZmFsc2VcbiAgICAgICAgZm9yICh2YXIgZmlsZSBpbiB3YXRjaGVkRmlsZXMpIHtcbiAgICAgICAgICBpZiAobWUubGFzdE1pbGxpc2Vjb25kcyA8IGZzLnN0YXRTeW5jKHdhdGNoZWRGaWxlc1tmaWxlXSkubXRpbWVNcykge1xuICAgICAgICAgICAgaWYgKHdhdGNoZWRGaWxlc1tmaWxlXS5pbmRleE9mKFwic2Nzc1wiKSAhPSAtMSkge2RvQnVpbGQ9dHJ1ZTticmVhazt9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIG1lLmxhc3RNaWxsaXNlY29uZHMgPSAobmV3IERhdGUpLmdldFRpbWUoKVxuXG4gICAgICAgIHZhciBjdXJyZW50TnVtRmlsZXMgPSB3YXRjaGVkRmlsZXMubGVuZ3RoXG4gICAgICAgIHZhciBmaWxlc291cmNlID0gJ3RoaXMgZmlsZSBlbmFibGVzIGNsaWVudCByZWxvYWQnXG4gICAgICAgIGNvbXBpbGF0aW9uLmFzc2V0c1tjdXJyZW50TnVtRmlsZXMgKyAnRmlsZXNVbmRlckFwcEZvbGRlci5tZCddID0ge1xuICAgICAgICAgIHNvdXJjZTogZnVuY3Rpb24oKSB7cmV0dXJuIGZpbGVzb3VyY2V9LFxuICAgICAgICAgIHNpemU6IGZ1bmN0aW9uKCkge3JldHVybiBmaWxlc291cmNlLmxlbmd0aH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjdXJyZW50TnVtRmlsZXMgIT0gbWUubGFzdE51bUZpbGVzIHx8IGRvQnVpbGQpIHtcbiAgICAgICAgICBtZS5sYXN0TnVtRmlsZXMgPSBjdXJyZW50TnVtRmlsZXNcbiAgICAgICAgICB2YXIgYnVpbGRBc3luYyA9IHJlcXVpcmUoJ0BleHRqcy9leHQtYnVpbGQvYXBwL2J1aWxkQXN5bmMuanMnKVxuICAgICAgICAgIHZhciBvcHRpb25zID0ge3Bhcm1zOiBbJ2FwcCcsJ2J1aWxkJywnZGV2ZWxvcG1lbnQnXX1cbiAgICAgICAgICBuZXcgYnVpbGRBc3luYyhvcHRpb25zKS5leGVjdXRlQXN5bmMoKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY2IoKVxuICAgICAgICAgIH0pXG4gICAgICAgICAgXG4gICAgICAgICAgLy8gdmFyIGJ1aWxkID0gcmVxdWlyZSgnQGV4dGpzL2V4dC1idWlsZC9hcHAvYnVpbGQuanMnKVxuICAgICAgICAgIC8vIG5ldyBidWlsZCh7fSlcbiAgICAgICAgICAvL3ZhciByZWZyZXNoID0gcmVxdWlyZSgnQGV4dGpzL2V4dC1idWlsZC9hcHAvcmVmcmVzaC5qcycpXG4gICAgICAgICAgLy9uZXcgcmVmcmVzaCh7fSlcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBtZS5sYXN0TnVtRmlsZXMgPSBjdXJyZW50TnVtRmlsZXNcbiAgICAgICAgICBjb25zb2xlLmxvZyhhcHAgKyAnY2FsbCB0byBleHQtYnVpbGQgbm90IG5lZWRlZCwgbm8gbmV3IGZpbGVzJylcbiAgICAgICAgICBjYigpXG4gICAgICAgIH1cbiAgICAgIH0pXG5cblxuLy8gICAgICBjb21waWxlci5ob29rcy5lbWl0LnRhcCgnZXh0LWVtaXQnLCAoY29tcGlsYXRpb24pID0+IHtcbi8vICAgICAgICBwcm9jZXNzLnN0ZG91dC5jdXJzb3JUbygwKTtjb25zb2xlLmxvZyhhcHAgKyAnZXh0LWVtaXQnKVxuXG4gICAgICAvLyAgIHZhciB3YXRjaGVkRmlsZXM9W11cbiAgICAgIC8vICAgdHJ5IHt3YXRjaGVkRmlsZXMgPSByZWN1cnNpdmVSZWFkU3luYygnLi9hcHAnKX0gXG4gICAgICAvLyAgIGNhdGNoKGVycikge2lmKGVyci5lcnJubyA9PT0gMzQpe2NvbnNvbGUubG9nKCdQYXRoIGRvZXMgbm90IGV4aXN0Jyk7fSBlbHNlIHt0aHJvdyBlcnI7fX1cblxuICAgICAgLy8gICB2YXIgZG9CdWlsZCA9IGZhbHNlXG4gICAgICAvLyAgIGZvciAodmFyIGZpbGUgaW4gd2F0Y2hlZEZpbGVzKSB7XG4gICAgICAvLyAgICAgaWYgKHRoaXMubGFzdE1pbGxpc2Vjb25kcyA8IGZzLnN0YXRTeW5jKHdhdGNoZWRGaWxlc1tmaWxlXSkubXRpbWVNcykge1xuICAgICAgLy8gICAgICAgaWYgKHdhdGNoZWRGaWxlc1tmaWxlXS5pbmRleE9mKFwic2Nzc1wiKSAhPSAtMSkge2RvQnVpbGQ9dHJ1ZTticmVhazt9XG4gICAgICAvLyAgICAgfVxuICAgICAgLy8gICB9XG4gICAgICAvLyAgIHRoaXMubGFzdE1pbGxpc2Vjb25kcyA9IChuZXcgRGF0ZSkuZ2V0VGltZSgpXG5cbiAgICAgIC8vICAgdmFyIGN1cnJlbnROdW1GaWxlcyA9IHdhdGNoZWRGaWxlcy5sZW5ndGhcbiAgICAgIC8vICAgdmFyIGZpbGVzb3VyY2UgPSAndGhpcyBmaWxlIGVuYWJsZXMgY2xpZW50IHJlbG9hZCdcbiAgICAgIC8vICAgY29tcGlsYXRpb24uYXNzZXRzW2N1cnJlbnROdW1GaWxlcyArICdGaWxlc1VuZGVyQXBwRm9sZGVyLm1kJ10gPSB7XG4gICAgICAvLyAgICAgc291cmNlOiBmdW5jdGlvbigpIHtyZXR1cm4gZmlsZXNvdXJjZX0sXG4gICAgICAvLyAgICAgc2l6ZTogZnVuY3Rpb24oKSB7cmV0dXJuIGZpbGVzb3VyY2UubGVuZ3RofVxuICAgICAgLy8gICB9XG5cbiAgICAgIC8vICAgaWYgKGN1cnJlbnROdW1GaWxlcyAhPSB0aGlzLmxhc3ROdW1GaWxlcyB8fCBkb0J1aWxkKSB7XG4gICAgICAvLyAgICAgdmFyIGJ1aWxkID0gcmVxdWlyZSgnQGV4dGpzL2V4dC1idWlsZC9hcHAvYnVpbGQuanMnKVxuICAgICAgLy8gICAgIG5ldyBidWlsZCh7fSlcbiAgICAgIC8vICAgICAvL3ZhciByZWZyZXNoID0gcmVxdWlyZSgnQGV4dGpzL3NlbmNoYS1idWlsZC9hcHAvcmVmcmVzaC5qcycpXG4gICAgICAvLyAgICAgLy9uZXcgcmVmcmVzaCh7fSlcbiAgICAgIC8vICAgfVxuICAgICAgLy8gICBlbHNlIHtcbiAgICAgIC8vICAgICBjb25zb2xlLmxvZyhhcHAgKyAnQ2FsbCB0byBTZW5jaGEgQnVpbGQgbm90IG5lZWRlZCwgbm8gbmV3IGZpbGVzJylcbiAgICAgIC8vICAgfVxuICAgICAgLy8gICB0aGlzLmxhc3ROdW1GaWxlcyA9IGN1cnJlbnROdW1GaWxlc1xuXG4vLyAgICAgIH0pXG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgY29tcGlsZXIucGx1Z2luKCdlbWl0JywgKGNvbXBpbGF0aW9uLCBjYikgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZyhhcHAgKyAnZW1pdCcpXG4gICAgICAgIHZhciBmaWxlbGlzdCA9ICd0aGlzIGZpbGUgZW5hYmxlcyBjbGllbnQgcmVsb2FkJ1xuICAgICAgICBjb21waWxhdGlvbi5hc3NldHNbJ0ZvclJlbG9hZC5tZCddID0ge1xuICAgICAgICAgIHNvdXJjZTogZnVuY3Rpb24oKSB7cmV0dXJuIGZpbGVsaXN0fSxcbiAgICAgICAgICBzaXplOiBmdW5jdGlvbigpIHtyZXR1cm4gZmlsZWxpc3QubGVuZ3RofVxuICAgICAgICB9XG4gICAgICAgIHZhciByZWZyZXNoID0gcmVxdWlyZSgnQGV4dGpzL2V4dC1idWlsZC9hcHAvcmVmcmVzaC5qcycpXG4gICAgICAgIG5ldyByZWZyZXNoKHt9KVxuXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdUSElTIElTIElUJylcbiAgICAgICAgLy8gdmFyIGJ1aWxkQXN5bmMgPSByZXF1aXJlKCdAZXh0anMvZXh0LWJ1aWxkL2FwcC9idWlsZEFzeW5jLmpzJylcbiAgICAgICAgLy8gY29uc29sZS5sb2coYnVpbGRBc3luYylcbiAgICAgICAgLy8gbmV3IGJ1aWxkQXN5bmMoKS5leGVjdXRlQXN5bmMoKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyAgIGNvbnNvbGUubG9nKCd0aGVuIGNhbGwnKTtcbiAgICAgICAgLy8gICBjYigpO1xuICAgICAgICAvLyB9KVxuXG5cbiAgICAgICAgLy9jYigpXG4gICAgICAgIC8vdGhpcy5lbWl0U3RhdHMuYmluZCh0aGlzKVxuXG5cblxuICAgICAgfSlcbiAgICB9XG5cbiAgfVxuXG5cbiAgLy8gZW1pdFN0YXRzKGN1ckNvbXBpbGVyLCBjYWxsYmFjaykge1xuICAvLyAgIC8vIEdldCBzdGF0cy5cbiAgLy8gICAvLyAqKk5vdGUqKjogSW4gZnV0dXJlLCBjb3VsZCBwYXNzIHNvbWV0aGluZyBsaWtlIGB7IHNob3dBc3NldHM6IHRydWUgfWBcbiAgLy8gICAvLyB0byB0aGUgYGdldFN0YXRzKClgIGZ1bmN0aW9uIGZvciBtb3JlIGxpbWl0ZWQgb2JqZWN0IHJldHVybmVkLlxuICAvLyAgIGxldCBzdGF0cyA9IGN1ckNvbXBpbGVyLmdldFN0YXRzKCkudG9Kc29uKCk7XG4gIFxuICAvLyAgIC8vIEZpbHRlciB0byBmaWVsZHMuXG4gIC8vICAgaWYgKHRoaXMub3B0cy5maWVsZHMpIHtcbiAgLy8gICAgIHN0YXRzID0gdGhpcy5vcHRzLmZpZWxkcy5yZWR1Y2UoKG1lbW8sIGtleSkgPT4ge1xuICAvLyAgICAgICBtZW1vW2tleV0gPSBzdGF0c1trZXldO1xuICAvLyAgICAgICByZXR1cm4gbWVtbztcbiAgLy8gICAgIH0sIHt9KTtcbiAgLy8gICB9XG4gIFxuICAvLyAgIC8vIFRyYW5zZm9ybSB0byBzdHJpbmcuXG4gIC8vICAgbGV0IGVycjtcbiAgLy8gICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKClcbiAgXG4gIC8vICAgICAvLyBUcmFuc2Zvcm0uXG4gIC8vICAgICAudGhlbigoKSA9PiB0aGlzLm9wdHMudHJhbnNmb3JtKHN0YXRzLCB7XG4gIC8vICAgICAgIGNvbXBpbGVyOiBjdXJDb21waWxlclxuICAvLyAgICAgfSkpXG4gIC8vICAgICAuY2F0Y2goKGUpID0+IHsgZXJyID0gZTsgfSlcbiAgXG4gIC8vICAgICAvLyBGaW5pc2ggdXAuXG4gIC8vICAgICAudGhlbigoc3RhdHNTdHIpID0+IHtcbiAgLy8gICAgICAgLy8gSGFuZGxlIGVycm9ycy5cbiAgLy8gICAgICAgaWYgKGVycikge1xuICAvLyAgICAgICAgIGN1ckNvbXBpbGVyLmVycm9ycy5wdXNoKGVycik7XG4gIC8vICAgICAgICAgaWYgKGNhbGxiYWNrKSB7IHJldHVybiB2b2lkIGNhbGxiYWNrKGVycik7IH1cbiAgLy8gICAgICAgICB0aHJvdyBlcnI7XG4gIC8vICAgICAgIH1cbiAgXG4gIC8vICAgICAgIC8vIEFkZCB0byBhc3NldHMuXG4gIC8vICAgICAgIGN1ckNvbXBpbGVyLmFzc2V0c1t0aGlzLm9wdHMuZmlsZW5hbWVdID0ge1xuICAvLyAgICAgICAgIHNvdXJjZSgpIHtcbiAgLy8gICAgICAgICAgIHJldHVybiBzdGF0c1N0cjtcbiAgLy8gICAgICAgICB9LFxuICAvLyAgICAgICAgIHNpemUoKSB7XG4gIC8vICAgICAgICAgICByZXR1cm4gc3RhdHNTdHIubGVuZ3RoO1xuICAvLyAgICAgICAgIH1cbiAgLy8gICAgICAgfTtcbiAgXG4gIC8vICAgICAgIGlmIChjYWxsYmFjaykgeyByZXR1cm4gdm9pZCBjYWxsYmFjaygpOyB9XG4gIC8vICAgICB9KTtcbiAgLy8gfVxuICBcblxuXG59XG5cblxuXG5cblxuXG4gIC8vIGlmIChmaWxlcy5sZW5ndGggPiAwKSB7XG4gIC8vICAgZmlsZXMuZm9yRWFjaCgocGF0dGVybikgPT4ge1xuICAvLyAgICAgbGV0IGYgPSBwYXR0ZXJuO1xuICAvLyAgICAgaWYgKGlzR2xvYihwYXR0ZXJuKSkge1xuICAvLyAgICAgICBmID0gZ2xvYi5zeW5jKHBhdHRlcm4sIHtcbiAgLy8gICAgICAgICBjd2QsXG4gIC8vICAgICAgICAgZG90OiB0cnVlLFxuICAvLyAgICAgICAgIGFic29sdXRlOiB0cnVlLFxuICAvLyAgICAgICB9KTtcbiAgLy8gICAgIH1cbiAgLy8gICAgIGZkcyA9IGZkcy5jb25jYXQoZik7XG4gIC8vICAgfSk7XG4gIC8vICAgZmRzID0gdW5pcShmZHMpO1xuICAvLyB9XG5cblxuLy8gZnVuY3Rpb24gaG9va19zdGRvdXQoY2FsbGJhY2spIHtcbi8vICAgdmFyIG9sZF93cml0ZSA9IHByb2Nlc3Muc3Rkb3V0LndyaXRlXG4vLyAgIGNvbnNvbGUubG9nKCdpbiBob29rJylcbi8vICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUgPSAoZnVuY3Rpb24od3JpdGUpIHtcbi8vICAgICAgIHJldHVybiBmdW5jdGlvbihzdHJpbmcsIGVuY29kaW5nLCBmZCkge1xuLy8gICAgICAgICAgIHdyaXRlLmFwcGx5KHByb2Nlc3Muc3Rkb3V0LCBhcmd1bWVudHMpXG4vLyAgICAgICAgICAgY2FsbGJhY2soc3RyaW5nLCBlbmNvZGluZywgZmQpXG4vLyAgICAgICB9XG4vLyAgIH0pKHByb2Nlc3Muc3Rkb3V0LndyaXRlKVxuXG4vLyAgIHJldHVybiBmdW5jdGlvbigpIHtcbi8vICAgICAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlID0gb2xkX3dyaXRlXG4vLyAgICAgICBjb25zb2xlLmxvZygnaW4gdW5ob29rJylcbi8vICAgICB9XG4vLyB9XG4gICAgLy8gdGhpcy51bmhvb2sgPSBob29rX3N0ZG91dChmdW5jdGlvbihzdHJpbmcsIGVuY29kaW5nLCBmZCkge1xuICAgIC8vICAgY29uc29sZS5sb2coJ3N0ZG91dDogJyArIHN0cmluZylcbiAgICAvLyB9KVxuXG4vLyAgICAgICAgdGhpcy51bmhvb2soKVxuXG5cblxuXG5cbiAgICAgICAgLy8gdmFyIGZpbGVsaXN0ID0gJ0luIHRoaXMgYnVpbGQ6XFxuXFxuJztcblxuICAgICAgICAvLyAvLyBMb29wIHRocm91Z2ggYWxsIGNvbXBpbGVkIGFzc2V0cyxcbiAgICAgICAgLy8gLy8gYWRkaW5nIGEgbmV3IGxpbmUgaXRlbSBmb3IgZWFjaCBmaWxlbmFtZS5cbiAgICAgICAgLy8gZm9yICh2YXIgZmlsZW5hbWUgaW4gY29tcGlsYXRpb24uYXNzZXRzKSB7XG4gICAgICAgIC8vICAgZmlsZWxpc3QgKz0gKCctICcrIGZpbGVuYW1lICsnXFxuJyk7XG4gICAgICAgIC8vIH1cbiAgICBcbiAgICAgICAgLy8gLy8gSW5zZXJ0IHRoaXMgbGlzdCBpbnRvIHRoZSB3ZWJwYWNrIGJ1aWxkIGFzIGEgbmV3IGZpbGUgYXNzZXQ6XG4gICAgICAgIC8vIGNvbXBpbGF0aW9uLmFzc2V0c1snZmlsZWxpc3QubWQnXSA9IHtcbiAgICAgICAgLy8gICBzb3VyY2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyAgICAgcmV0dXJuIGZpbGVsaXN0O1xuICAgICAgICAvLyAgIH0sXG4gICAgICAgIC8vICAgc2l6ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vICAgICByZXR1cm4gZmlsZWxpc3QubGVuZ3RoO1xuICAgICAgICAvLyAgIH1cbiAgICAgICAgLy8gfTtcblxuXG5cblxuXG4gICAgICAgIC8vIC8vdmFyIGQgPSBuZXcgRGF0ZSgpXG4gICAgICAgIC8vIHZhciBkID0gJ21qZydcbiAgICAgICAgLy8gdmFyIGZpbGVsaXN0ID0gJ0luIHRoaXMgYnVpbGQ6XFxuXFxuJyArIGQgKyAnXFxuXFxuJztcbiAgICAgICAgLy8gLy8gTG9vcCB0aHJvdWdoIGFsbCBjb21waWxlZCBhc3NldHMsXG4gICAgICAgIC8vIC8vIGFkZGluZyBhIG5ldyBsaW5lIGl0ZW0gZm9yIGVhY2ggZmlsZW5hbWUuXG4gICAgICAgIC8vIGZvciAodmFyIGZpbGVuYW1lIGluIGNvbXBpbGF0aW9uLmFzc2V0cykge1xuICAgICAgICAvLyAgIGZpbGVsaXN0ICs9ICgnLSAnKyBmaWxlbmFtZSArJ1xcbicpO1xuICAgICAgICAvLyB9XG4gICAgICAgIC8vIC8vIEluc2VydCB0aGlzIGxpc3QgaW50byB0aGUgd2VicGFjayBidWlsZCBhcyBhIG5ldyBmaWxlIGFzc2V0OlxuICAgICAgICAvLyBjb21waWxhdGlvbi5hc3NldHNbZCArICcubWQnXSA9IHtcbiAgICAgICAgLy8gICBzb3VyY2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyAgICAgcmV0dXJuIGZpbGVsaXN0O1xuICAgICAgICAvLyAgIH0sXG4gICAgICAgIC8vICAgc2l6ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vICAgICByZXR1cm4gZmlsZWxpc3QubGVuZ3RoO1xuICAgICAgICAvLyAgIH1cbiAgICAgICAgLy8gfTsiXX0=