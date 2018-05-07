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

function callP() {
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      resolve(0);
    }, 5000);
  });
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

        //console.log(compiler.hooks.emit)
        var me = this;
        compiler.hooks.emit.tapAsync('extjs-emit-async', function (compilation, cb) {
          process.stdout.cursorTo(0);console.log(app + 'extjs-emit-async');

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

            var buildAsync = require('@extjs/ext-build/app/buildAsync.js');
            new buildAsync().executeAsync().then(function () {
              cb();
            });

            // var build = require('@extjs/ext-build/app/build.js')
            // new build({})
            //var refresh = require('@extjs/sencha-build/app/refresh.js')
            //new refresh({})
          } else {
            console.log(app + 'Call to Sencha Build not needed, no new files');
          }
          me.lastNumFiles = currentNumFiles;

          // callP().then(function() {
          //   console.log('then');
          //   var buildAsync = require('@extjs/sencha-build/app/buildAsync.js')
          //   new buildAsync().executeAsync()
          //   cb();
          // })
        });

        // compiler.hooks.emit.tap('extjs-emit', (compilation) => {
        //   process.stdout.cursorTo(0);console.log(app + 'extjs-emit')

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


        // })
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9pbmRleC5qcyJdLCJuYW1lcyI6WyJhcHAiLCJjaGFsayIsImdyZWVuIiwiZ2V0RmlsZUFuZENvbnRleHREZXBzIiwiY29tcGlsYXRpb24iLCJmaWxlcyIsImRpcnMiLCJjd2QiLCJmaWxlRGVwZW5kZW5jaWVzIiwiY29udGV4dERlcGVuZGVuY2llcyIsImlzV2VicGFjazQiLCJob29rcyIsImZkcyIsImNkcyIsImxlbmd0aCIsImNvbmNhdCIsImNhbGxQIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJzZXRUaW1lb3V0IiwiRXh0SlNXZWJwYWNrUGx1Z2luIiwib3B0aW9ucyIsInJlcXVpcmUiLCJkZWZhdWx0cyIsImNvbXBpbGVyIiwid2VicGFja1ZlcnNpb24iLCJ1bmRlZmluZWQiLCJleHRqc1ZlcnNpb24iLCJwcm9jZXNzIiwic3Rkb3V0IiwiY3Vyc29yVG8iLCJjb25zb2xlIiwibG9nIiwiYWZ0ZXJDb21waWxlIiwidGFwIiwiZm9yRWFjaCIsImZpbGUiLCJhZGQiLCJjb250ZXh0IiwicGx1Z2luIiwiY2IiLCJtZSIsImVtaXQiLCJ0YXBBc3luYyIsIndhdGNoZWRGaWxlcyIsImVyciIsImVycm5vIiwiZG9CdWlsZCIsImxhc3RNaWxsaXNlY29uZHMiLCJmcyIsInN0YXRTeW5jIiwibXRpbWVNcyIsImluZGV4T2YiLCJEYXRlIiwiZ2V0VGltZSIsImN1cnJlbnROdW1GaWxlcyIsImZpbGVzb3VyY2UiLCJhc3NldHMiLCJzb3VyY2UiLCJzaXplIiwibGFzdE51bUZpbGVzIiwiYnVpbGRBc3luYyIsImV4ZWN1dGVBc3luYyIsInRoZW4iLCJmaWxlbGlzdCIsInJlZnJlc2giXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBRUE7O0FBQ0E7Ozs7Ozs7OztBQUZBOzs7QUFHQTs7QUFFQSxJQUFNQSxNQUFTQyxnQkFBTUMsS0FBTixDQUFZLFVBQVosQ0FBVCw0QkFB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QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7Ozs7Ozs7O0FBV0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBR0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSTtBQUNBO0FBQ0E7O0FBRUo7OztBQU1ROztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFyVWE3QyxrQixDQUNaRyxRLEdBQVc7QUFDaEJqQixPQUFLc0IsUUFBUXRCLEdBQVIsRUFEVztBQUVoQkYsU0FBTyxFQUZTO0FBR2hCQyxRQUFNLENBQUMsT0FBRDtBQUhVLEM7a0JBRENlLGtCIiwiZmlsZSI6ImluZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgdmFsaWRhdGVPcHRpb25zIGZyb20gJ3NjaGVtYS11dGlscyc7XG5pbXBvcnQgdW5pcSBmcm9tICdsb2Rhc2gudW5pcSc7XG5pbXBvcnQgaXNHbG9iIGZyb20gJ2lzLWdsb2InO1xuLy9pbXBvcnQgZ2xvYiBmcm9tICdnbG9iJztcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdwYXRoJztcbmltcG9ydCByZWN1cnNpdmVSZWFkU3luYyBmcm9tICdyZWN1cnNpdmUtcmVhZGRpci1zeW5jJztcbi8vY29uc3QgcmVjdXJzaXZlUmVhZFN5bmMgPSByZXF1aXJlKCdyZWN1cnNpdmUtcmVhZGRpci1zeW5jJylcblxuY29uc3QgYXBwID0gYCR7Y2hhbGsuZ3JlZW4oJ+KEuSDvvaJleHTvvaM6Jyl9IGV4dGpzLXdlYnBhY2stcGx1Z2luOiBgO1xuXG5mdW5jdGlvbiBnZXRGaWxlQW5kQ29udGV4dERlcHMoY29tcGlsYXRpb24sIGZpbGVzLCBkaXJzLCBjd2QpIHtcbiAgY29uc3QgeyBmaWxlRGVwZW5kZW5jaWVzLCBjb250ZXh0RGVwZW5kZW5jaWVzIH0gPSBjb21waWxhdGlvbjtcbiAgY29uc3QgaXNXZWJwYWNrNCA9IGNvbXBpbGF0aW9uLmhvb2tzO1xuICBsZXQgZmRzID0gaXNXZWJwYWNrNCA/IFsuLi5maWxlRGVwZW5kZW5jaWVzXSA6IGZpbGVEZXBlbmRlbmNpZXM7XG4gIGxldCBjZHMgPSBpc1dlYnBhY2s0ID8gWy4uLmNvbnRleHREZXBlbmRlbmNpZXNdIDogY29udGV4dERlcGVuZGVuY2llcztcbiAgaWYgKGRpcnMubGVuZ3RoID4gMCkge1xuICAgIGNkcyA9IHVuaXEoY2RzLmNvbmNhdChkaXJzKSk7XG4gIH1cbiAgcmV0dXJuIHtcbiAgICBmaWxlRGVwZW5kZW5jaWVzOiBmZHMsXG4gICAgY29udGV4dERlcGVuZGVuY2llczogY2RzLFxuICB9O1xufVxuXG5cbmZ1bmN0aW9uIGNhbGxQKCkge1xuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpeyByZXNvbHZlKDApIH0sIDUwMDApO1xuICB9KVxufVxuXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEV4dEpTV2VicGFja1BsdWdpbiB7XG4gIHN0YXRpYyBkZWZhdWx0cyA9IHtcbiAgICBjd2Q6IHByb2Nlc3MuY3dkKCksXG4gICAgZmlsZXM6IFtdLFxuICAgIGRpcnM6IFsnLi9hcHAnXSxcbiAgfTtcblxuICBjb25zdHJ1Y3RvcihvcHRpb25zID0ge30pIHtcbiAgICB2YWxpZGF0ZU9wdGlvbnMocmVxdWlyZSgnLi4vb3B0aW9ucy5qc29uJyksIG9wdGlvbnMsICdFeHRyYVdhdGNoV2VicGFja1BsdWdpbicpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lXG4gICAgdGhpcy5vcHRpb25zID0geyAuLi5FeHRKU1dlYnBhY2tQbHVnaW4uZGVmYXVsdHMsIC4uLm9wdGlvbnMgfTtcbiAgfVxuXG4gIGFwcGx5KGNvbXBpbGVyKSB7XG5cbiAgICBpZiAodGhpcy53ZWJwYWNrVmVyc2lvbiA9PSB1bmRlZmluZWQpIHtcbiAgICAgIGNvbnN0IGlzV2VicGFjazQgPSBjb21waWxlci5ob29rcztcbiAgICAgIGlmIChpc1dlYnBhY2s0KSB7dGhpcy53ZWJwYWNrVmVyc2lvbiA9ICdJUyB3ZWJwYWNrIDQnfVxuICAgICAgZWxzZSB7dGhpcy53ZWJwYWNrVmVyc2lvbiA9ICdOT1Qgd2VicGFjayA0J31cbiAgICAgIHRoaXMuZXh0anNWZXJzaW9uID0gJzYuNS4zJ1xuICAgICAgcHJvY2Vzcy5zdGRvdXQuY3Vyc29yVG8oMCk7Y29uc29sZS5sb2coYXBwICsgJ0V4dCBKUyB2JyArIHRoaXMuZXh0anNWZXJzaW9uICsgJywgJyArIHRoaXMud2VicGFja1ZlcnNpb24pXG4gICAgfVxuXG4gICAgbGV0IHsgZmlsZXMsIGRpcnMgfSA9IHRoaXMub3B0aW9ucztcbiAgICBjb25zdCB7IGN3ZCB9ID0gdGhpcy5vcHRpb25zO1xuICAgIGZpbGVzID0gdHlwZW9mIGZpbGVzID09PSAnc3RyaW5nJyA/IFtmaWxlc10gOiBmaWxlcztcbiAgICBkaXJzID0gdHlwZW9mIGRpcnMgPT09ICdzdHJpbmcnID8gW2RpcnNdIDogZGlycztcblxuICAgIGlmIChjb21waWxlci5ob29rcykge1xuICAgICAgY29tcGlsZXIuaG9va3MuYWZ0ZXJDb21waWxlLnRhcCgnZXh0anMtYWZ0ZXItY29tcGlsZScsIChjb21waWxhdGlvbikgPT4ge1xuICAgICAgICBwcm9jZXNzLnN0ZG91dC5jdXJzb3JUbygwKTtjb25zb2xlLmxvZyhhcHAgKyAnZXh0anMtYWZ0ZXItY29tcGlsZScpXG4gICAgICAgIGNvbnN0IHtcbiAgICAgICAgICBmaWxlRGVwZW5kZW5jaWVzLFxuICAgICAgICAgIGNvbnRleHREZXBlbmRlbmNpZXMsXG4gICAgICAgIH0gPSBnZXRGaWxlQW5kQ29udGV4dERlcHMoY29tcGlsYXRpb24sIGZpbGVzLCBkaXJzLCBjd2QpO1xuICAgICAgICBpZiAoZmlsZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGZpbGVEZXBlbmRlbmNpZXMuZm9yRWFjaCgoZmlsZSkgPT4ge1xuICAgICAgICAgICAgY29tcGlsYXRpb24uZmlsZURlcGVuZGVuY2llcy5hZGQocmVzb2x2ZShmaWxlKSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRpcnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGNvbnRleHREZXBlbmRlbmNpZXMuZm9yRWFjaCgoY29udGV4dCkgPT4ge1xuICAgICAgICAgICAgY29tcGlsYXRpb24uY29udGV4dERlcGVuZGVuY2llcy5hZGQoY29udGV4dCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb21waWxlci5wbHVnaW4oJ2FmdGVyLWNvbXBpbGUnLCAoY29tcGlsYXRpb24sIGNiKSA9PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKGFwcCArICdhZnRlci1jb21waWxlJylcbiAgICAgICAgY29uc3Qge1xuICAgICAgICAgIGZpbGVEZXBlbmRlbmNpZXMsXG4gICAgICAgICAgY29udGV4dERlcGVuZGVuY2llcyxcbiAgICAgICAgfSA9IGdldEZpbGVBbmRDb250ZXh0RGVwcyhjb21waWxhdGlvbiwgZmlsZXMsIGRpcnMsIGN3ZCk7XG4gICAgICAgIGlmIChmaWxlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgY29tcGlsYXRpb24uZmlsZURlcGVuZGVuY2llcyA9IGZpbGVEZXBlbmRlbmNpZXM7IC8vIGVzbGludC1kaXNhYmxlLWxpbmVcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGlycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgY29tcGlsYXRpb24uY29udGV4dERlcGVuZGVuY2llcyA9IGNvbnRleHREZXBlbmRlbmNpZXM7IC8vIGVzbGludC1kaXNhYmxlLWxpbmVcbiAgICAgICAgfVxuICAgICAgICBjYigpXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAoY29tcGlsZXIuaG9va3MpIHtcblxuICAgICAgLy9jb25zb2xlLmxvZyhjb21waWxlci5ob29rcy5lbWl0KVxuICAgICAgdmFyIG1lID0gdGhpc1xuICAgICAgY29tcGlsZXIuaG9va3MuZW1pdC50YXBBc3luYygnZXh0anMtZW1pdC1hc3luYycsIGZ1bmN0aW9uIChjb21waWxhdGlvbiwgY2IpIHtcbiAgICAgICAgcHJvY2Vzcy5zdGRvdXQuY3Vyc29yVG8oMCk7Y29uc29sZS5sb2coYXBwICsgJ2V4dGpzLWVtaXQtYXN5bmMnKVxuXG4gICAgICAgIHZhciB3YXRjaGVkRmlsZXM9W11cbiAgICAgICAgdHJ5IHt3YXRjaGVkRmlsZXMgPSByZWN1cnNpdmVSZWFkU3luYygnLi9hcHAnKX0gXG4gICAgICAgIGNhdGNoKGVycikge2lmKGVyci5lcnJubyA9PT0gMzQpe2NvbnNvbGUubG9nKCdQYXRoIGRvZXMgbm90IGV4aXN0Jyk7fSBlbHNlIHt0aHJvdyBlcnI7fX1cblxuICAgICAgICB2YXIgZG9CdWlsZCA9IGZhbHNlXG4gICAgICAgIGZvciAodmFyIGZpbGUgaW4gd2F0Y2hlZEZpbGVzKSB7XG4gICAgICAgICAgaWYgKG1lLmxhc3RNaWxsaXNlY29uZHMgPCBmcy5zdGF0U3luYyh3YXRjaGVkRmlsZXNbZmlsZV0pLm10aW1lTXMpIHtcbiAgICAgICAgICAgIGlmICh3YXRjaGVkRmlsZXNbZmlsZV0uaW5kZXhPZihcInNjc3NcIikgIT0gLTEpIHtkb0J1aWxkPXRydWU7YnJlYWs7fVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBtZS5sYXN0TWlsbGlzZWNvbmRzID0gKG5ldyBEYXRlKS5nZXRUaW1lKClcblxuICAgICAgICB2YXIgY3VycmVudE51bUZpbGVzID0gd2F0Y2hlZEZpbGVzLmxlbmd0aFxuICAgICAgICB2YXIgZmlsZXNvdXJjZSA9ICd0aGlzIGZpbGUgZW5hYmxlcyBjbGllbnQgcmVsb2FkJ1xuICAgICAgICBjb21waWxhdGlvbi5hc3NldHNbY3VycmVudE51bUZpbGVzICsgJ0ZpbGVzVW5kZXJBcHBGb2xkZXIubWQnXSA9IHtcbiAgICAgICAgICBzb3VyY2U6IGZ1bmN0aW9uKCkge3JldHVybiBmaWxlc291cmNlfSxcbiAgICAgICAgICBzaXplOiBmdW5jdGlvbigpIHtyZXR1cm4gZmlsZXNvdXJjZS5sZW5ndGh9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY3VycmVudE51bUZpbGVzICE9IG1lLmxhc3ROdW1GaWxlcyB8fCBkb0J1aWxkKSB7XG5cbiAgICAgICAgICB2YXIgYnVpbGRBc3luYyA9IHJlcXVpcmUoJ0BleHRqcy9leHQtYnVpbGQvYXBwL2J1aWxkQXN5bmMuanMnKVxuICAgICAgICAgIG5ldyBidWlsZEFzeW5jKCkuZXhlY3V0ZUFzeW5jKCkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNiKCk7XG4gICAgICAgICAgfSlcbiAgICAgICAgICBcbiAgICAgICAgICAvLyB2YXIgYnVpbGQgPSByZXF1aXJlKCdAZXh0anMvZXh0LWJ1aWxkL2FwcC9idWlsZC5qcycpXG4gICAgICAgICAgLy8gbmV3IGJ1aWxkKHt9KVxuICAgICAgICAgIC8vdmFyIHJlZnJlc2ggPSByZXF1aXJlKCdAZXh0anMvc2VuY2hhLWJ1aWxkL2FwcC9yZWZyZXNoLmpzJylcbiAgICAgICAgICAvL25ldyByZWZyZXNoKHt9KVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGNvbnNvbGUubG9nKGFwcCArICdDYWxsIHRvIFNlbmNoYSBCdWlsZCBub3QgbmVlZGVkLCBubyBuZXcgZmlsZXMnKVxuICAgICAgICB9XG4gICAgICAgIG1lLmxhc3ROdW1GaWxlcyA9IGN1cnJlbnROdW1GaWxlc1xuXG5cblxuXG5cblxuXG5cbiAgICAgICAgLy8gY2FsbFAoKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyAgIGNvbnNvbGUubG9nKCd0aGVuJyk7XG4gICAgICAgIC8vICAgdmFyIGJ1aWxkQXN5bmMgPSByZXF1aXJlKCdAZXh0anMvc2VuY2hhLWJ1aWxkL2FwcC9idWlsZEFzeW5jLmpzJylcbiAgICAgICAgLy8gICBuZXcgYnVpbGRBc3luYygpLmV4ZWN1dGVBc3luYygpXG4gICAgICAgIC8vICAgY2IoKTtcbiAgICAgICAgLy8gfSlcbiAgICAgIH0pXG5cblxuICAgICAgLy8gY29tcGlsZXIuaG9va3MuZW1pdC50YXAoJ2V4dGpzLWVtaXQnLCAoY29tcGlsYXRpb24pID0+IHtcbiAgICAgIC8vICAgcHJvY2Vzcy5zdGRvdXQuY3Vyc29yVG8oMCk7Y29uc29sZS5sb2coYXBwICsgJ2V4dGpzLWVtaXQnKVxuXG4gICAgICAvLyAgIHZhciB3YXRjaGVkRmlsZXM9W11cbiAgICAgIC8vICAgdHJ5IHt3YXRjaGVkRmlsZXMgPSByZWN1cnNpdmVSZWFkU3luYygnLi9hcHAnKX0gXG4gICAgICAvLyAgIGNhdGNoKGVycikge2lmKGVyci5lcnJubyA9PT0gMzQpe2NvbnNvbGUubG9nKCdQYXRoIGRvZXMgbm90IGV4aXN0Jyk7fSBlbHNlIHt0aHJvdyBlcnI7fX1cblxuICAgICAgLy8gICB2YXIgZG9CdWlsZCA9IGZhbHNlXG4gICAgICAvLyAgIGZvciAodmFyIGZpbGUgaW4gd2F0Y2hlZEZpbGVzKSB7XG4gICAgICAvLyAgICAgaWYgKHRoaXMubGFzdE1pbGxpc2Vjb25kcyA8IGZzLnN0YXRTeW5jKHdhdGNoZWRGaWxlc1tmaWxlXSkubXRpbWVNcykge1xuICAgICAgLy8gICAgICAgaWYgKHdhdGNoZWRGaWxlc1tmaWxlXS5pbmRleE9mKFwic2Nzc1wiKSAhPSAtMSkge2RvQnVpbGQ9dHJ1ZTticmVhazt9XG4gICAgICAvLyAgICAgfVxuICAgICAgLy8gICB9XG4gICAgICAvLyAgIHRoaXMubGFzdE1pbGxpc2Vjb25kcyA9IChuZXcgRGF0ZSkuZ2V0VGltZSgpXG5cbiAgICAgIC8vICAgdmFyIGN1cnJlbnROdW1GaWxlcyA9IHdhdGNoZWRGaWxlcy5sZW5ndGhcbiAgICAgIC8vICAgdmFyIGZpbGVzb3VyY2UgPSAndGhpcyBmaWxlIGVuYWJsZXMgY2xpZW50IHJlbG9hZCdcbiAgICAgIC8vICAgY29tcGlsYXRpb24uYXNzZXRzW2N1cnJlbnROdW1GaWxlcyArICdGaWxlc1VuZGVyQXBwRm9sZGVyLm1kJ10gPSB7XG4gICAgICAvLyAgICAgc291cmNlOiBmdW5jdGlvbigpIHtyZXR1cm4gZmlsZXNvdXJjZX0sXG4gICAgICAvLyAgICAgc2l6ZTogZnVuY3Rpb24oKSB7cmV0dXJuIGZpbGVzb3VyY2UubGVuZ3RofVxuICAgICAgLy8gICB9XG5cbiAgICAgIC8vICAgaWYgKGN1cnJlbnROdW1GaWxlcyAhPSB0aGlzLmxhc3ROdW1GaWxlcyB8fCBkb0J1aWxkKSB7XG4gICAgICAvLyAgICAgdmFyIGJ1aWxkID0gcmVxdWlyZSgnQGV4dGpzL2V4dC1idWlsZC9hcHAvYnVpbGQuanMnKVxuICAgICAgLy8gICAgIG5ldyBidWlsZCh7fSlcbiAgICAgIC8vICAgICAvL3ZhciByZWZyZXNoID0gcmVxdWlyZSgnQGV4dGpzL3NlbmNoYS1idWlsZC9hcHAvcmVmcmVzaC5qcycpXG4gICAgICAvLyAgICAgLy9uZXcgcmVmcmVzaCh7fSlcbiAgICAgIC8vICAgfVxuICAgICAgLy8gICBlbHNlIHtcbiAgICAgIC8vICAgICBjb25zb2xlLmxvZyhhcHAgKyAnQ2FsbCB0byBTZW5jaGEgQnVpbGQgbm90IG5lZWRlZCwgbm8gbmV3IGZpbGVzJylcbiAgICAgIC8vICAgfVxuICAgICAgLy8gICB0aGlzLmxhc3ROdW1GaWxlcyA9IGN1cnJlbnROdW1GaWxlc1xuXG5cblxuXG4gICAgICAvLyB9KVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGNvbXBpbGVyLnBsdWdpbignZW1pdCcsIChjb21waWxhdGlvbiwgY2IpID0+IHtcbiAgICAgICAgY29uc29sZS5sb2coYXBwICsgJ2VtaXQnKVxuICAgICAgICB2YXIgZmlsZWxpc3QgPSAndGhpcyBmaWxlIGVuYWJsZXMgY2xpZW50IHJlbG9hZCdcbiAgICAgICAgY29tcGlsYXRpb24uYXNzZXRzWydGb3JSZWxvYWQubWQnXSA9IHtcbiAgICAgICAgICBzb3VyY2U6IGZ1bmN0aW9uKCkge3JldHVybiBmaWxlbGlzdH0sXG4gICAgICAgICAgc2l6ZTogZnVuY3Rpb24oKSB7cmV0dXJuIGZpbGVsaXN0Lmxlbmd0aH1cbiAgICAgICAgfVxuICAgICAgICB2YXIgcmVmcmVzaCA9IHJlcXVpcmUoJ0BleHRqcy9leHQtYnVpbGQvYXBwL3JlZnJlc2guanMnKVxuICAgICAgICBuZXcgcmVmcmVzaCh7fSlcblxuICAgICAgICAvLyBjb25zb2xlLmxvZygnVEhJUyBJUyBJVCcpXG4gICAgICAgIC8vIHZhciBidWlsZEFzeW5jID0gcmVxdWlyZSgnQGV4dGpzL2V4dC1idWlsZC9hcHAvYnVpbGRBc3luYy5qcycpXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGJ1aWxkQXN5bmMpXG4gICAgICAgIC8vIG5ldyBidWlsZEFzeW5jKCkuZXhlY3V0ZUFzeW5jKCkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gICBjb25zb2xlLmxvZygndGhlbiBjYWxsJyk7XG4gICAgICAgIC8vICAgY2IoKTtcbiAgICAgICAgLy8gfSlcblxuXG4gICAgICAgIC8vY2IoKVxuICAgICAgICAvL3RoaXMuZW1pdFN0YXRzLmJpbmQodGhpcylcblxuXG5cbiAgICAgIH0pXG4gICAgfVxuXG4gIH1cblxuXG4gIC8vIGVtaXRTdGF0cyhjdXJDb21waWxlciwgY2FsbGJhY2spIHtcbiAgLy8gICAvLyBHZXQgc3RhdHMuXG4gIC8vICAgLy8gKipOb3RlKio6IEluIGZ1dHVyZSwgY291bGQgcGFzcyBzb21ldGhpbmcgbGlrZSBgeyBzaG93QXNzZXRzOiB0cnVlIH1gXG4gIC8vICAgLy8gdG8gdGhlIGBnZXRTdGF0cygpYCBmdW5jdGlvbiBmb3IgbW9yZSBsaW1pdGVkIG9iamVjdCByZXR1cm5lZC5cbiAgLy8gICBsZXQgc3RhdHMgPSBjdXJDb21waWxlci5nZXRTdGF0cygpLnRvSnNvbigpO1xuICBcbiAgLy8gICAvLyBGaWx0ZXIgdG8gZmllbGRzLlxuICAvLyAgIGlmICh0aGlzLm9wdHMuZmllbGRzKSB7XG4gIC8vICAgICBzdGF0cyA9IHRoaXMub3B0cy5maWVsZHMucmVkdWNlKChtZW1vLCBrZXkpID0+IHtcbiAgLy8gICAgICAgbWVtb1trZXldID0gc3RhdHNba2V5XTtcbiAgLy8gICAgICAgcmV0dXJuIG1lbW87XG4gIC8vICAgICB9LCB7fSk7XG4gIC8vICAgfVxuICBcbiAgLy8gICAvLyBUcmFuc2Zvcm0gdG8gc3RyaW5nLlxuICAvLyAgIGxldCBlcnI7XG4gIC8vICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpXG4gIFxuICAvLyAgICAgLy8gVHJhbnNmb3JtLlxuICAvLyAgICAgLnRoZW4oKCkgPT4gdGhpcy5vcHRzLnRyYW5zZm9ybShzdGF0cywge1xuICAvLyAgICAgICBjb21waWxlcjogY3VyQ29tcGlsZXJcbiAgLy8gICAgIH0pKVxuICAvLyAgICAgLmNhdGNoKChlKSA9PiB7IGVyciA9IGU7IH0pXG4gIFxuICAvLyAgICAgLy8gRmluaXNoIHVwLlxuICAvLyAgICAgLnRoZW4oKHN0YXRzU3RyKSA9PiB7XG4gIC8vICAgICAgIC8vIEhhbmRsZSBlcnJvcnMuXG4gIC8vICAgICAgIGlmIChlcnIpIHtcbiAgLy8gICAgICAgICBjdXJDb21waWxlci5lcnJvcnMucHVzaChlcnIpO1xuICAvLyAgICAgICAgIGlmIChjYWxsYmFjaykgeyByZXR1cm4gdm9pZCBjYWxsYmFjayhlcnIpOyB9XG4gIC8vICAgICAgICAgdGhyb3cgZXJyO1xuICAvLyAgICAgICB9XG4gIFxuICAvLyAgICAgICAvLyBBZGQgdG8gYXNzZXRzLlxuICAvLyAgICAgICBjdXJDb21waWxlci5hc3NldHNbdGhpcy5vcHRzLmZpbGVuYW1lXSA9IHtcbiAgLy8gICAgICAgICBzb3VyY2UoKSB7XG4gIC8vICAgICAgICAgICByZXR1cm4gc3RhdHNTdHI7XG4gIC8vICAgICAgICAgfSxcbiAgLy8gICAgICAgICBzaXplKCkge1xuICAvLyAgICAgICAgICAgcmV0dXJuIHN0YXRzU3RyLmxlbmd0aDtcbiAgLy8gICAgICAgICB9XG4gIC8vICAgICAgIH07XG4gIFxuICAvLyAgICAgICBpZiAoY2FsbGJhY2spIHsgcmV0dXJuIHZvaWQgY2FsbGJhY2soKTsgfVxuICAvLyAgICAgfSk7XG4gIC8vIH1cbiAgXG5cblxufVxuXG5cblxuXG5cblxuICAvLyBpZiAoZmlsZXMubGVuZ3RoID4gMCkge1xuICAvLyAgIGZpbGVzLmZvckVhY2goKHBhdHRlcm4pID0+IHtcbiAgLy8gICAgIGxldCBmID0gcGF0dGVybjtcbiAgLy8gICAgIGlmIChpc0dsb2IocGF0dGVybikpIHtcbiAgLy8gICAgICAgZiA9IGdsb2Iuc3luYyhwYXR0ZXJuLCB7XG4gIC8vICAgICAgICAgY3dkLFxuICAvLyAgICAgICAgIGRvdDogdHJ1ZSxcbiAgLy8gICAgICAgICBhYnNvbHV0ZTogdHJ1ZSxcbiAgLy8gICAgICAgfSk7XG4gIC8vICAgICB9XG4gIC8vICAgICBmZHMgPSBmZHMuY29uY2F0KGYpO1xuICAvLyAgIH0pO1xuICAvLyAgIGZkcyA9IHVuaXEoZmRzKTtcbiAgLy8gfVxuXG5cbi8vIGZ1bmN0aW9uIGhvb2tfc3Rkb3V0KGNhbGxiYWNrKSB7XG4vLyAgIHZhciBvbGRfd3JpdGUgPSBwcm9jZXNzLnN0ZG91dC53cml0ZVxuLy8gICBjb25zb2xlLmxvZygnaW4gaG9vaycpXG4vLyAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlID0gKGZ1bmN0aW9uKHdyaXRlKSB7XG4vLyAgICAgICByZXR1cm4gZnVuY3Rpb24oc3RyaW5nLCBlbmNvZGluZywgZmQpIHtcbi8vICAgICAgICAgICB3cml0ZS5hcHBseShwcm9jZXNzLnN0ZG91dCwgYXJndW1lbnRzKVxuLy8gICAgICAgICAgIGNhbGxiYWNrKHN0cmluZywgZW5jb2RpbmcsIGZkKVxuLy8gICAgICAgfVxuLy8gICB9KShwcm9jZXNzLnN0ZG91dC53cml0ZSlcblxuLy8gICByZXR1cm4gZnVuY3Rpb24oKSB7XG4vLyAgICAgICBwcm9jZXNzLnN0ZG91dC53cml0ZSA9IG9sZF93cml0ZVxuLy8gICAgICAgY29uc29sZS5sb2coJ2luIHVuaG9vaycpXG4vLyAgICAgfVxuLy8gfVxuICAgIC8vIHRoaXMudW5ob29rID0gaG9va19zdGRvdXQoZnVuY3Rpb24oc3RyaW5nLCBlbmNvZGluZywgZmQpIHtcbiAgICAvLyAgIGNvbnNvbGUubG9nKCdzdGRvdXQ6ICcgKyBzdHJpbmcpXG4gICAgLy8gfSlcblxuLy8gICAgICAgIHRoaXMudW5ob29rKClcblxuXG5cblxuXG4gICAgICAgIC8vIHZhciBmaWxlbGlzdCA9ICdJbiB0aGlzIGJ1aWxkOlxcblxcbic7XG5cbiAgICAgICAgLy8gLy8gTG9vcCB0aHJvdWdoIGFsbCBjb21waWxlZCBhc3NldHMsXG4gICAgICAgIC8vIC8vIGFkZGluZyBhIG5ldyBsaW5lIGl0ZW0gZm9yIGVhY2ggZmlsZW5hbWUuXG4gICAgICAgIC8vIGZvciAodmFyIGZpbGVuYW1lIGluIGNvbXBpbGF0aW9uLmFzc2V0cykge1xuICAgICAgICAvLyAgIGZpbGVsaXN0ICs9ICgnLSAnKyBmaWxlbmFtZSArJ1xcbicpO1xuICAgICAgICAvLyB9XG4gICAgXG4gICAgICAgIC8vIC8vIEluc2VydCB0aGlzIGxpc3QgaW50byB0aGUgd2VicGFjayBidWlsZCBhcyBhIG5ldyBmaWxlIGFzc2V0OlxuICAgICAgICAvLyBjb21waWxhdGlvbi5hc3NldHNbJ2ZpbGVsaXN0Lm1kJ10gPSB7XG4gICAgICAgIC8vICAgc291cmNlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gICAgIHJldHVybiBmaWxlbGlzdDtcbiAgICAgICAgLy8gICB9LFxuICAgICAgICAvLyAgIHNpemU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyAgICAgcmV0dXJuIGZpbGVsaXN0Lmxlbmd0aDtcbiAgICAgICAgLy8gICB9XG4gICAgICAgIC8vIH07XG5cblxuXG5cblxuICAgICAgICAvLyAvL3ZhciBkID0gbmV3IERhdGUoKVxuICAgICAgICAvLyB2YXIgZCA9ICdtamcnXG4gICAgICAgIC8vIHZhciBmaWxlbGlzdCA9ICdJbiB0aGlzIGJ1aWxkOlxcblxcbicgKyBkICsgJ1xcblxcbic7XG4gICAgICAgIC8vIC8vIExvb3AgdGhyb3VnaCBhbGwgY29tcGlsZWQgYXNzZXRzLFxuICAgICAgICAvLyAvLyBhZGRpbmcgYSBuZXcgbGluZSBpdGVtIGZvciBlYWNoIGZpbGVuYW1lLlxuICAgICAgICAvLyBmb3IgKHZhciBmaWxlbmFtZSBpbiBjb21waWxhdGlvbi5hc3NldHMpIHtcbiAgICAgICAgLy8gICBmaWxlbGlzdCArPSAoJy0gJysgZmlsZW5hbWUgKydcXG4nKTtcbiAgICAgICAgLy8gfVxuICAgICAgICAvLyAvLyBJbnNlcnQgdGhpcyBsaXN0IGludG8gdGhlIHdlYnBhY2sgYnVpbGQgYXMgYSBuZXcgZmlsZSBhc3NldDpcbiAgICAgICAgLy8gY29tcGlsYXRpb24uYXNzZXRzW2QgKyAnLm1kJ10gPSB7XG4gICAgICAgIC8vICAgc291cmNlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gICAgIHJldHVybiBmaWxlbGlzdDtcbiAgICAgICAgLy8gICB9LFxuICAgICAgICAvLyAgIHNpemU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyAgICAgcmV0dXJuIGZpbGVsaXN0Lmxlbmd0aDtcbiAgICAgICAgLy8gICB9XG4gICAgICAgIC8vIH07Il19