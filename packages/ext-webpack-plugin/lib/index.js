'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

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
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

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

        var cmdPath = path.resolve(pluginPath, '../sencha-cmd');
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
              //console.log(app +  ' ' + path.resolve(file) + ' changed')
              console.log(app + ' ' + path.resolve(file) + ' changed');

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


exports.default = ExtWebpackPlugin;
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9pbmRleC5qcyJdLCJuYW1lcyI6WyJjaGFsayIsInJlcXVpcmUiLCJwYXRoIiwiZnMiLCJ2YWxpZGF0ZU9wdGlvbnMiLCJ1bmlxIiwiaXNHbG9iIiwicmVjdXJzaXZlUmVhZFN5bmMiLCJwcmVmaXgiLCJwbGF0Zm9ybSIsImFwcCIsImdyZWVuIiwiZ2V0RmlsZUFuZENvbnRleHREZXBzIiwiY29tcGlsYXRpb24iLCJmaWxlcyIsImRpcnMiLCJjd2QiLCJmaWxlRGVwZW5kZW5jaWVzIiwiY29udGV4dERlcGVuZGVuY2llcyIsImlzV2VicGFjazQiLCJob29rcyIsImZkcyIsImNkcyIsImxlbmd0aCIsImZvckVhY2giLCJwYXR0ZXJuIiwiZiIsImdsb2IiLCJzeW5jIiwiZG90IiwiYWJzb2x1dGUiLCJjb25jYXQiLCJFeHRXZWJwYWNrUGx1Z2luIiwib3B0aW9ucyIsImRlZmF1bHRzIiwicHJvY2VzcyIsImNvbXBpbGVyIiwid2VicGFja1ZlcnNpb24iLCJ1bmRlZmluZWQiLCJwbHVnaW5QYXRoIiwicmVzb2x2ZSIsIl9fZGlybmFtZSIsInBsdWdpblBrZyIsImV4aXN0c1N5bmMiLCJKU09OIiwicGFyc2UiLCJyZWFkRmlsZVN5bmMiLCJwbHVnaW5WZXJzaW9uIiwidmVyc2lvbiIsImV4dFBhdGgiLCJleHRQa2ciLCJleHRWZXJzaW9uIiwic2VuY2hhIiwiY21kUGF0aCIsImNtZFBrZyIsImNtZFZlcnNpb24iLCJ2ZXJzaW9uX2Z1bGwiLCJzdGRvdXQiLCJjdXJzb3JUbyIsImNvbnNvbGUiLCJsb2ciLCJhZnRlckNvbXBpbGUiLCJ0YXAiLCJmaWxlIiwiYWRkIiwiY29udGV4dCIsInBsdWdpbiIsImNiIiwibWUiLCJlbWl0IiwidGFwQXN5bmMiLCJ3YXRjaGVkRmlsZXMiLCJlcnIiLCJlcnJubyIsImRvQnVpbGQiLCJsYXN0TWlsbGlzZWNvbmRzIiwic3RhdFN5bmMiLCJtdGltZU1zIiwiaW5kZXhPZiIsIkRhdGUiLCJnZXRUaW1lIiwiY3VycmVudE51bUZpbGVzIiwiZmlsZXNvdXJjZSIsImFzc2V0cyIsInNvdXJjZSIsInNpemUiLCJsYXN0TnVtRmlsZXMiLCJidWlsZEFzeW5jIiwicGFybXMiLCJleGVjdXRlQXN5bmMiLCJ0aGVuIiwiZmlsZWxpc3QiLCJyZWZyZXNoIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUFBLElBQU1BLFFBQVFDLFFBQVEsT0FBUixDQUFkO0FBQ0EsSUFBTUMsT0FBT0QsUUFBUSxNQUFSLENBQWI7QUFDQSxJQUFNRSxLQUFLRixRQUFRLElBQVIsQ0FBWDtBQUNBLElBQU1HLGtCQUFrQkgsUUFBUSxjQUFSLENBQXhCO0FBQ0EsSUFBTUksT0FBT0osUUFBUSxhQUFSLENBQWI7QUFDQSxJQUFNSyxTQUFTTCxRQUFRLFNBQVIsQ0FBZjtBQUNBLElBQU1NLG9CQUFvQk4sUUFBUSx3QkFBUixDQUExQjs7QUFFQSxJQUFJTyxXQUFKO0FBQ0EsSUFBSUMsV0FBV1IsUUFBUSxJQUFSLEVBQWNRLFFBQWQsRUFBZjtBQUNBLElBQUlBLFlBQVksUUFBaEIsRUFBMEI7QUFDeEJEO0FBQ0QsQ0FGRCxNQUdLO0FBQ0hBO0FBQ0Q7QUFDRCxJQUFJRSxNQUFNVixNQUFNVyxLQUFOLENBQVlILE1BQVosSUFBc0IsdUJBQWhDOztBQUVBLFNBQVNJLHFCQUFULENBQStCQyxXQUEvQixFQUE0Q0MsS0FBNUMsRUFBbURDLElBQW5ELEVBQXlEQyxHQUF6RCxFQUE4RDtBQUFBLE1BQ3BEQyxnQkFEb0QsR0FDVkosV0FEVSxDQUNwREksZ0JBRG9EO0FBQUEsTUFDbENDLG1CQURrQyxHQUNWTCxXQURVLENBQ2xDSyxtQkFEa0M7O0FBRTVELE1BQU1DLGFBQWFOLFlBQVlPLEtBQS9CO0FBQ0EsTUFBSUMsTUFBTUYsMENBQWlCRixnQkFBakIsS0FBcUNBLGdCQUEvQztBQUNBLE1BQUlLLE1BQU1ILDBDQUFpQkQsbUJBQWpCLEtBQXdDQSxtQkFBbEQ7O0FBR0EsTUFBSUosTUFBTVMsTUFBTixHQUFlLENBQW5CLEVBQXNCO0FBQ3BCVCxVQUFNVSxP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QUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7Ozs7Ozs7O0FBV0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBR0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSTtBQUNBO0FBQ0E7O0FBRUo7OztBQU1ROztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7a0JBclVhNUQsZ0IiLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCBjaGFsayA9IHJlcXVpcmUoJ2NoYWxrJylcbmNvbnN0IHBhdGggPSByZXF1aXJlKCdwYXRoJylcbmNvbnN0IGZzID0gcmVxdWlyZSgnZnMnKVxuY29uc3QgdmFsaWRhdGVPcHRpb25zID0gcmVxdWlyZSgnc2NoZW1hLXV0aWxzJylcbmNvbnN0IHVuaXEgPSByZXF1aXJlKCdsb2Rhc2gudW5pcScpXG5jb25zdCBpc0dsb2IgPSByZXF1aXJlKCdpcy1nbG9iJylcbmNvbnN0IHJlY3Vyc2l2ZVJlYWRTeW5jID0gcmVxdWlyZSgncmVjdXJzaXZlLXJlYWRkaXItc3luYycpXG5cbnZhciBwcmVmaXggPSBgYFxudmFyIHBsYXRmb3JtID0gcmVxdWlyZSgnb3MnKS5wbGF0Zm9ybSgpXG5pZiAocGxhdGZvcm0gPT0gJ2RhcndpbicpIHtcbiAgcHJlZml4ID0gYOKEuSDvvaJleHTvvaM6YFxufVxuZWxzZSB7XG4gIHByZWZpeCA9IGBpIFtleHRdOmBcbn1cbnZhciBhcHAgPSBjaGFsay5ncmVlbihwcmVmaXgpICsgJyBleHQtd2VicGFjay1wbHVnaW46ICc7XG5cbmZ1bmN0aW9uIGdldEZpbGVBbmRDb250ZXh0RGVwcyhjb21waWxhdGlvbiwgZmlsZXMsIGRpcnMsIGN3ZCkge1xuICBjb25zdCB7IGZpbGVEZXBlbmRlbmNpZXMsIGNvbnRleHREZXBlbmRlbmNpZXMgfSA9IGNvbXBpbGF0aW9uO1xuICBjb25zdCBpc1dlYnBhY2s0ID0gY29tcGlsYXRpb24uaG9va3M7XG4gIGxldCBmZHMgPSBpc1dlYnBhY2s0ID8gWy4uLmZpbGVEZXBlbmRlbmNpZXNdIDogZmlsZURlcGVuZGVuY2llcztcbiAgbGV0IGNkcyA9IGlzV2VicGFjazQgPyBbLi4uY29udGV4dERlcGVuZGVuY2llc10gOiBjb250ZXh0RGVwZW5kZW5jaWVzO1xuICBcbiAgXG4gIGlmIChmaWxlcy5sZW5ndGggPiAwKSB7XG4gICAgZmlsZXMuZm9yRWFjaCgocGF0dGVybikgPT4ge1xuICAgICAgbGV0IGYgPSBwYXR0ZXJuO1xuICAgICAgaWYgKGlzR2xvYihwYXR0ZXJuKSkge1xuICAgICAgICBmID0gZ2xvYi5zeW5jKHBhdHRlcm4sIHtcbiAgICAgICAgICBjd2QsXG4gICAgICAgICAgZG90OiB0cnVlLFxuICAgICAgICAgIGFic29sdXRlOiB0cnVlLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGZkcyA9IGZkcy5jb25jYXQoZik7XG4gICAgfSk7XG4gICAgZmRzID0gdW5pcShmZHMpO1xuICB9XG4gIFxuICBcbiAgXG4gIGlmIChkaXJzLmxlbmd0aCA+IDApIHtcbiAgICBjZHMgPSB1bmlxKGNkcy5jb25jYXQoZGlycykpO1xuICB9XG4gIHJldHVybiB7XG4gICAgZmlsZURlcGVuZGVuY2llczogZmRzLFxuICAgIGNvbnRleHREZXBlbmRlbmNpZXM6IGNkcyxcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRXh0V2VicGFja1BsdWdpbiB7XG4gIC8vIHN0YXRpYyBkZWZhdWx0cyA9IHtcbiAgLy8gICBjd2Q6IHByb2Nlc3MuY3dkKCksXG4gIC8vICAgZmlsZXM6IFtdLFxuICAvLyAgIGRpcnM6IFsnLi9hcHAnXSxcbiAgLy8gfTtcblxuICBjb25zdHJ1Y3RvcihvcHRpb25zID0ge30pIHtcbiAgICB2YWxpZGF0ZU9wdGlvbnMocmVxdWlyZSgnLi4vb3B0aW9ucy5qc29uJyksIG9wdGlvbnMsICdFeHRyYVdhdGNoV2VicGFja1BsdWdpbicpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lXG4gICAgLy90aGlzLm9wdGlvbnMgPSB7IC4uLkV4dFdlYnBhY2tQbHVnaW4uZGVmYXVsdHMsIC4uLm9wdGlvbnMgfTtcblxuICAgIHZhciBkZWZhdWx0cyA9IHtcbiAgICAgIGN3ZDogcHJvY2Vzcy5jd2QoKSxcbiAgICAgIGZpbGVzOiBbJy4vYXBwLmpzb24nXSxcbiAgICAgIGRpcnM6IFsnLi9hcHAnXSxcbiAgICB9XG5cbiAgICB0aGlzLm9wdGlvbnMgPSB7IC4uLmRlZmF1bHRzLCAuLi5vcHRpb25zIH07XG4gIH1cblxuICBhcHBseShjb21waWxlcikge1xuXG4gICAgaWYgKHRoaXMud2VicGFja1ZlcnNpb24gPT0gdW5kZWZpbmVkKSB7XG4gICAgICB2YXIgcGx1Z2luUGF0aCA9IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsJy4uJylcbiAgICAgIHZhciBwbHVnaW5Qa2cgPSAoZnMuZXhpc3RzU3luYyhwbHVnaW5QYXRoKycvcGFja2FnZS5qc29uJykgJiYgSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMocGx1Z2luUGF0aCsnL3BhY2thZ2UuanNvbicsICd1dGYtOCcpKSB8fCB7fSk7XG4gICAgICB2YXIgcGx1Z2luVmVyc2lvbiA9IHBsdWdpblBrZy52ZXJzaW9uXG4gIFxuICAgICAgdmFyIGV4dFBhdGggPSBwYXRoLnJlc29sdmUocGx1Z2luUGF0aCwnLi4vZXh0JylcbiAgICAgIHZhciBleHRQa2cgPSAoZnMuZXhpc3RzU3luYyhleHRQYXRoKycvcGFja2FnZS5qc29uJykgJiYgSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMoZXh0UGF0aCsnL3BhY2thZ2UuanNvbicsICd1dGYtOCcpKSB8fCB7fSk7XG4gICAgICB2YXIgZXh0VmVyc2lvbiA9IGV4dFBrZy5zZW5jaGEudmVyc2lvblxuXG4gICAgICB2YXIgY21kUGF0aCA9IHBhdGgucmVzb2x2ZShwbHVnaW5QYXRoLCcuLi9zZW5jaGEtY21kJylcbiAgICAgIHZhciBjbWRQa2cgPSAoZnMuZXhpc3RzU3luYyhjbWRQYXRoKycvcGFja2FnZS5qc29uJykgJiYgSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMoY21kUGF0aCsnL3BhY2thZ2UuanNvbicsICd1dGYtOCcpKSB8fCB7fSk7XG4gICAgICB2YXIgY21kVmVyc2lvbiA9IGNtZFBrZy52ZXJzaW9uX2Z1bGxcblxuICAgICAgY29uc3QgaXNXZWJwYWNrNCA9IGNvbXBpbGVyLmhvb2tzO1xuICAgICAgaWYgKGlzV2VicGFjazQpIHt0aGlzLndlYnBhY2tWZXJzaW9uID0gJ0lTIHdlYnBhY2sgNCd9XG4gICAgICBlbHNlIHt0aGlzLndlYnBhY2tWZXJzaW9uID0gJ05PVCB3ZWJwYWNrIDQnfVxuICAgICAgcHJvY2Vzcy5zdGRvdXQuY3Vyc29yVG8oMCk7Y29uc29sZS5sb2coYXBwICsgJ3YnICsgcGx1Z2luVmVyc2lvbiArICcsIEV4dCBKUyB2JyArIGV4dFZlcnNpb24gKyAnLCBTZW5jaGEgQ21kIHYnICsgY21kVmVyc2lvbiArICcsICcgKyB0aGlzLndlYnBhY2tWZXJzaW9uKVxuICAgIH1cblxuICAgIGxldCB7IGZpbGVzLCBkaXJzIH0gPSB0aGlzLm9wdGlvbnM7XG4gICAgY29uc3QgeyBjd2QgfSA9IHRoaXMub3B0aW9ucztcbiAgICBmaWxlcyA9IHR5cGVvZiBmaWxlcyA9PT0gJ3N0cmluZycgPyBbZmlsZXNdIDogZmlsZXM7XG4gICAgZGlycyA9IHR5cGVvZiBkaXJzID09PSAnc3RyaW5nJyA/IFtkaXJzXSA6IGRpcnM7XG5cbiAgICBpZiAoY29tcGlsZXIuaG9va3MpIHtcbiAgICAgIGNvbXBpbGVyLmhvb2tzLmFmdGVyQ29tcGlsZS50YXAoJ2V4dC1hZnRlci1jb21waWxlJywgKGNvbXBpbGF0aW9uKSA9PiB7XG4gICAgICAgIHByb2Nlc3Muc3Rkb3V0LmN1cnNvclRvKDApO2NvbnNvbGUubG9nKGFwcCArICdleHQtYWZ0ZXItY29tcGlsZScpXG4gICAgICAgIGNvbnN0IHtcbiAgICAgICAgICBmaWxlRGVwZW5kZW5jaWVzLFxuICAgICAgICAgIGNvbnRleHREZXBlbmRlbmNpZXMsXG4gICAgICAgIH0gPSBnZXRGaWxlQW5kQ29udGV4dERlcHMoY29tcGlsYXRpb24sIGZpbGVzLCBkaXJzLCBjd2QpO1xuICAgICAgICBpZiAoZmlsZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGZpbGVEZXBlbmRlbmNpZXMuZm9yRWFjaCgoZmlsZSkgPT4ge1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhhcHAgKyAgJyAnICsgcGF0aC5yZXNvbHZlKGZpbGUpICsgJyBjaGFuZ2VkJylcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGAke2FwcH0gJHtwYXRoLnJlc29sdmUoZmlsZSl9IGNoYW5nZWRgKVxuXG4gICAgICAgICAgICBjb21waWxhdGlvbi5maWxlRGVwZW5kZW5jaWVzLmFkZChwYXRoLnJlc29sdmUoZmlsZSkpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkaXJzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBjb250ZXh0RGVwZW5kZW5jaWVzLmZvckVhY2goKGNvbnRleHQpID0+IHtcbiAgICAgICAgICAgIGNvbXBpbGF0aW9uLmNvbnRleHREZXBlbmRlbmNpZXMuYWRkKGNvbnRleHQpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29tcGlsZXIucGx1Z2luKCdhZnRlci1jb21waWxlJywgKGNvbXBpbGF0aW9uLCBjYikgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZyhhcHAgKyAnYWZ0ZXItY29tcGlsZScpXG4gICAgICAgIGNvbnN0IHtcbiAgICAgICAgICBmaWxlRGVwZW5kZW5jaWVzLFxuICAgICAgICAgIGNvbnRleHREZXBlbmRlbmNpZXMsXG4gICAgICAgIH0gPSBnZXRGaWxlQW5kQ29udGV4dERlcHMoY29tcGlsYXRpb24sIGZpbGVzLCBkaXJzLCBjd2QpO1xuICAgICAgICBpZiAoZmlsZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGNvbXBpbGF0aW9uLmZpbGVEZXBlbmRlbmNpZXMgPSBmaWxlRGVwZW5kZW5jaWVzOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lXG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRpcnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGNvbXBpbGF0aW9uLmNvbnRleHREZXBlbmRlbmNpZXMgPSBjb250ZXh0RGVwZW5kZW5jaWVzOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lXG4gICAgICAgIH1cbiAgICAgICAgY2IoKVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKGNvbXBpbGVyLmhvb2tzKSB7XG4gICAgICB2YXIgbWUgPSB0aGlzXG4gICAgICBjb21waWxlci5ob29rcy5lbWl0LnRhcEFzeW5jKCdleHQtZW1pdC1hc3luYycsIGZ1bmN0aW9uIChjb21waWxhdGlvbiwgY2IpIHtcbiAgICAgICAgcHJvY2Vzcy5zdGRvdXQuY3Vyc29yVG8oMCk7Y29uc29sZS5sb2coYXBwICsgJ2V4dC1lbWl0LWFzeW5jJylcblxuICAgICAgICB2YXIgd2F0Y2hlZEZpbGVzPVtdXG4gICAgICAgIHRyeSB7d2F0Y2hlZEZpbGVzID0gcmVjdXJzaXZlUmVhZFN5bmMoJy4vYXBwJyl9IFxuICAgICAgICBjYXRjaChlcnIpIHtpZihlcnIuZXJybm8gPT09IDM0KXtjb25zb2xlLmxvZygnUGF0aCBkb2VzIG5vdCBleGlzdCcpO30gZWxzZSB7dGhyb3cgZXJyO319XG5cbiAgICAgICAgdmFyIGRvQnVpbGQgPSBmYWxzZVxuICAgICAgICBmb3IgKHZhciBmaWxlIGluIHdhdGNoZWRGaWxlcykge1xuICAgICAgICAgIGlmIChtZS5sYXN0TWlsbGlzZWNvbmRzIDwgZnMuc3RhdFN5bmMod2F0Y2hlZEZpbGVzW2ZpbGVdKS5tdGltZU1zKSB7XG4gICAgICAgICAgICBpZiAod2F0Y2hlZEZpbGVzW2ZpbGVdLmluZGV4T2YoXCJzY3NzXCIpICE9IC0xKSB7ZG9CdWlsZD10cnVlO2JyZWFrO31cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgbWUubGFzdE1pbGxpc2Vjb25kcyA9IChuZXcgRGF0ZSkuZ2V0VGltZSgpXG5cbiAgICAgICAgdmFyIGN1cnJlbnROdW1GaWxlcyA9IHdhdGNoZWRGaWxlcy5sZW5ndGhcbiAgICAgICAgdmFyIGZpbGVzb3VyY2UgPSAndGhpcyBmaWxlIGVuYWJsZXMgY2xpZW50IHJlbG9hZCdcbiAgICAgICAgY29tcGlsYXRpb24uYXNzZXRzW2N1cnJlbnROdW1GaWxlcyArICdGaWxlc1VuZGVyQXBwRm9sZGVyLm1kJ10gPSB7XG4gICAgICAgICAgc291cmNlOiBmdW5jdGlvbigpIHtyZXR1cm4gZmlsZXNvdXJjZX0sXG4gICAgICAgICAgc2l6ZTogZnVuY3Rpb24oKSB7cmV0dXJuIGZpbGVzb3VyY2UubGVuZ3RofVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGN1cnJlbnROdW1GaWxlcyAhPSBtZS5sYXN0TnVtRmlsZXMgfHwgZG9CdWlsZCkge1xuICAgICAgICAgIG1lLmxhc3ROdW1GaWxlcyA9IGN1cnJlbnROdW1GaWxlc1xuICAgICAgICAgIHZhciBidWlsZEFzeW5jID0gcmVxdWlyZSgnQGV4dGpzL2V4dC1idWlsZC9hcHAvYnVpbGRBc3luYy5qcycpXG4gICAgICAgICAgdmFyIG9wdGlvbnMgPSB7cGFybXM6IFsnYXBwJywnYnVpbGQnLCdkZXZlbG9wbWVudCddfVxuICAgICAgICAgIG5ldyBidWlsZEFzeW5jKG9wdGlvbnMpLmV4ZWN1dGVBc3luYygpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjYigpXG4gICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBtZS5sYXN0TnVtRmlsZXMgPSBjdXJyZW50TnVtRmlsZXNcbiAgICAgICAgICBjb25zb2xlLmxvZyhhcHAgKyAnY2FsbCB0byBleHQtYnVpbGQgbm90IG5lZWRlZCwgbm8gbmV3IGZpbGVzJylcbiAgICAgICAgICBjYigpXG4gICAgICAgIH1cbiAgICAgIH0pXG5cblxuLy8gICAgICBjb21waWxlci5ob29rcy5lbWl0LnRhcCgnZXh0LWVtaXQnLCAoY29tcGlsYXRpb24pID0+IHtcbi8vICAgICAgICBwcm9jZXNzLnN0ZG91dC5jdXJzb3JUbygwKTtjb25zb2xlLmxvZyhhcHAgKyAnZXh0LWVtaXQnKVxuXG4gICAgICAvLyAgIHZhciB3YXRjaGVkRmlsZXM9W11cbiAgICAgIC8vICAgdHJ5IHt3YXRjaGVkRmlsZXMgPSByZWN1cnNpdmVSZWFkU3luYygnLi9hcHAnKX0gXG4gICAgICAvLyAgIGNhdGNoKGVycikge2lmKGVyci5lcnJubyA9PT0gMzQpe2NvbnNvbGUubG9nKCdQYXRoIGRvZXMgbm90IGV4aXN0Jyk7fSBlbHNlIHt0aHJvdyBlcnI7fX1cblxuICAgICAgLy8gICB2YXIgZG9CdWlsZCA9IGZhbHNlXG4gICAgICAvLyAgIGZvciAodmFyIGZpbGUgaW4gd2F0Y2hlZEZpbGVzKSB7XG4gICAgICAvLyAgICAgaWYgKHRoaXMubGFzdE1pbGxpc2Vjb25kcyA8IGZzLnN0YXRTeW5jKHdhdGNoZWRGaWxlc1tmaWxlXSkubXRpbWVNcykge1xuICAgICAgLy8gICAgICAgaWYgKHdhdGNoZWRGaWxlc1tmaWxlXS5pbmRleE9mKFwic2Nzc1wiKSAhPSAtMSkge2RvQnVpbGQ9dHJ1ZTticmVhazt9XG4gICAgICAvLyAgICAgfVxuICAgICAgLy8gICB9XG4gICAgICAvLyAgIHRoaXMubGFzdE1pbGxpc2Vjb25kcyA9IChuZXcgRGF0ZSkuZ2V0VGltZSgpXG5cbiAgICAgIC8vICAgdmFyIGN1cnJlbnROdW1GaWxlcyA9IHdhdGNoZWRGaWxlcy5sZW5ndGhcbiAgICAgIC8vICAgdmFyIGZpbGVzb3VyY2UgPSAndGhpcyBmaWxlIGVuYWJsZXMgY2xpZW50IHJlbG9hZCdcbiAgICAgIC8vICAgY29tcGlsYXRpb24uYXNzZXRzW2N1cnJlbnROdW1GaWxlcyArICdGaWxlc1VuZGVyQXBwRm9sZGVyLm1kJ10gPSB7XG4gICAgICAvLyAgICAgc291cmNlOiBmdW5jdGlvbigpIHtyZXR1cm4gZmlsZXNvdXJjZX0sXG4gICAgICAvLyAgICAgc2l6ZTogZnVuY3Rpb24oKSB7cmV0dXJuIGZpbGVzb3VyY2UubGVuZ3RofVxuICAgICAgLy8gICB9XG5cbiAgICAgIC8vICAgaWYgKGN1cnJlbnROdW1GaWxlcyAhPSB0aGlzLmxhc3ROdW1GaWxlcyB8fCBkb0J1aWxkKSB7XG4gICAgICAvLyAgICAgdmFyIGJ1aWxkID0gcmVxdWlyZSgnQGV4dGpzL2V4dC1idWlsZC9hcHAvYnVpbGQuanMnKVxuICAgICAgLy8gICAgIG5ldyBidWlsZCh7fSlcbiAgICAgIC8vICAgICAvL3ZhciByZWZyZXNoID0gcmVxdWlyZSgnQGV4dGpzL3NlbmNoYS1idWlsZC9hcHAvcmVmcmVzaC5qcycpXG4gICAgICAvLyAgICAgLy9uZXcgcmVmcmVzaCh7fSlcbiAgICAgIC8vICAgfVxuICAgICAgLy8gICBlbHNlIHtcbiAgICAgIC8vICAgICBjb25zb2xlLmxvZyhhcHAgKyAnQ2FsbCB0byBTZW5jaGEgQnVpbGQgbm90IG5lZWRlZCwgbm8gbmV3IGZpbGVzJylcbiAgICAgIC8vICAgfVxuICAgICAgLy8gICB0aGlzLmxhc3ROdW1GaWxlcyA9IGN1cnJlbnROdW1GaWxlc1xuXG4vLyAgICAgIH0pXG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgY29tcGlsZXIucGx1Z2luKCdlbWl0JywgKGNvbXBpbGF0aW9uLCBjYikgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZyhhcHAgKyAnZW1pdCcpXG4gICAgICAgIHZhciBmaWxlbGlzdCA9ICd0aGlzIGZpbGUgZW5hYmxlcyBjbGllbnQgcmVsb2FkJ1xuICAgICAgICBjb21waWxhdGlvbi5hc3NldHNbJ0ZvclJlbG9hZC5tZCddID0ge1xuICAgICAgICAgIHNvdXJjZTogZnVuY3Rpb24oKSB7cmV0dXJuIGZpbGVsaXN0fSxcbiAgICAgICAgICBzaXplOiBmdW5jdGlvbigpIHtyZXR1cm4gZmlsZWxpc3QubGVuZ3RofVxuICAgICAgICB9XG4gICAgICAgIHZhciByZWZyZXNoID0gcmVxdWlyZSgnQGV4dGpzL2V4dC1idWlsZC9hcHAvcmVmcmVzaC5qcycpXG4gICAgICAgIG5ldyByZWZyZXNoKHt9KVxuXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdUSElTIElTIElUJylcbiAgICAgICAgLy8gdmFyIGJ1aWxkQXN5bmMgPSByZXF1aXJlKCdAZXh0anMvZXh0LWJ1aWxkL2FwcC9idWlsZEFzeW5jLmpzJylcbiAgICAgICAgLy8gY29uc29sZS5sb2coYnVpbGRBc3luYylcbiAgICAgICAgLy8gbmV3IGJ1aWxkQXN5bmMoKS5leGVjdXRlQXN5bmMoKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyAgIGNvbnNvbGUubG9nKCd0aGVuIGNhbGwnKTtcbiAgICAgICAgLy8gICBjYigpO1xuICAgICAgICAvLyB9KVxuXG5cbiAgICAgICAgLy9jYigpXG4gICAgICAgIC8vdGhpcy5lbWl0U3RhdHMuYmluZCh0aGlzKVxuXG5cblxuICAgICAgfSlcbiAgICB9XG5cbiAgfVxuXG5cbiAgLy8gZW1pdFN0YXRzKGN1ckNvbXBpbGVyLCBjYWxsYmFjaykge1xuICAvLyAgIC8vIEdldCBzdGF0cy5cbiAgLy8gICAvLyAqKk5vdGUqKjogSW4gZnV0dXJlLCBjb3VsZCBwYXNzIHNvbWV0aGluZyBsaWtlIGB7IHNob3dBc3NldHM6IHRydWUgfWBcbiAgLy8gICAvLyB0byB0aGUgYGdldFN0YXRzKClgIGZ1bmN0aW9uIGZvciBtb3JlIGxpbWl0ZWQgb2JqZWN0IHJldHVybmVkLlxuICAvLyAgIGxldCBzdGF0cyA9IGN1ckNvbXBpbGVyLmdldFN0YXRzKCkudG9Kc29uKCk7XG4gIFxuICAvLyAgIC8vIEZpbHRlciB0byBmaWVsZHMuXG4gIC8vICAgaWYgKHRoaXMub3B0cy5maWVsZHMpIHtcbiAgLy8gICAgIHN0YXRzID0gdGhpcy5vcHRzLmZpZWxkcy5yZWR1Y2UoKG1lbW8sIGtleSkgPT4ge1xuICAvLyAgICAgICBtZW1vW2tleV0gPSBzdGF0c1trZXldO1xuICAvLyAgICAgICByZXR1cm4gbWVtbztcbiAgLy8gICAgIH0sIHt9KTtcbiAgLy8gICB9XG4gIFxuICAvLyAgIC8vIFRyYW5zZm9ybSB0byBzdHJpbmcuXG4gIC8vICAgbGV0IGVycjtcbiAgLy8gICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKClcbiAgXG4gIC8vICAgICAvLyBUcmFuc2Zvcm0uXG4gIC8vICAgICAudGhlbigoKSA9PiB0aGlzLm9wdHMudHJhbnNmb3JtKHN0YXRzLCB7XG4gIC8vICAgICAgIGNvbXBpbGVyOiBjdXJDb21waWxlclxuICAvLyAgICAgfSkpXG4gIC8vICAgICAuY2F0Y2goKGUpID0+IHsgZXJyID0gZTsgfSlcbiAgXG4gIC8vICAgICAvLyBGaW5pc2ggdXAuXG4gIC8vICAgICAudGhlbigoc3RhdHNTdHIpID0+IHtcbiAgLy8gICAgICAgLy8gSGFuZGxlIGVycm9ycy5cbiAgLy8gICAgICAgaWYgKGVycikge1xuICAvLyAgICAgICAgIGN1ckNvbXBpbGVyLmVycm9ycy5wdXNoKGVycik7XG4gIC8vICAgICAgICAgaWYgKGNhbGxiYWNrKSB7IHJldHVybiB2b2lkIGNhbGxiYWNrKGVycik7IH1cbiAgLy8gICAgICAgICB0aHJvdyBlcnI7XG4gIC8vICAgICAgIH1cbiAgXG4gIC8vICAgICAgIC8vIEFkZCB0byBhc3NldHMuXG4gIC8vICAgICAgIGN1ckNvbXBpbGVyLmFzc2V0c1t0aGlzLm9wdHMuZmlsZW5hbWVdID0ge1xuICAvLyAgICAgICAgIHNvdXJjZSgpIHtcbiAgLy8gICAgICAgICAgIHJldHVybiBzdGF0c1N0cjtcbiAgLy8gICAgICAgICB9LFxuICAvLyAgICAgICAgIHNpemUoKSB7XG4gIC8vICAgICAgICAgICByZXR1cm4gc3RhdHNTdHIubGVuZ3RoO1xuICAvLyAgICAgICAgIH1cbiAgLy8gICAgICAgfTtcbiAgXG4gIC8vICAgICAgIGlmIChjYWxsYmFjaykgeyByZXR1cm4gdm9pZCBjYWxsYmFjaygpOyB9XG4gIC8vICAgICB9KTtcbiAgLy8gfVxuICBcblxuXG59XG5cblxuXG5cblxuXG4gIC8vIGlmIChmaWxlcy5sZW5ndGggPiAwKSB7XG4gIC8vICAgZmlsZXMuZm9yRWFjaCgocGF0dGVybikgPT4ge1xuICAvLyAgICAgbGV0IGYgPSBwYXR0ZXJuO1xuICAvLyAgICAgaWYgKGlzR2xvYihwYXR0ZXJuKSkge1xuICAvLyAgICAgICBmID0gZ2xvYi5zeW5jKHBhdHRlcm4sIHtcbiAgLy8gICAgICAgICBjd2QsXG4gIC8vICAgICAgICAgZG90OiB0cnVlLFxuICAvLyAgICAgICAgIGFic29sdXRlOiB0cnVlLFxuICAvLyAgICAgICB9KTtcbiAgLy8gICAgIH1cbiAgLy8gICAgIGZkcyA9IGZkcy5jb25jYXQoZik7XG4gIC8vICAgfSk7XG4gIC8vICAgZmRzID0gdW5pcShmZHMpO1xuICAvLyB9XG5cblxuLy8gZnVuY3Rpb24gaG9va19zdGRvdXQoY2FsbGJhY2spIHtcbi8vICAgdmFyIG9sZF93cml0ZSA9IHByb2Nlc3Muc3Rkb3V0LndyaXRlXG4vLyAgIGNvbnNvbGUubG9nKCdpbiBob29rJylcbi8vICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUgPSAoZnVuY3Rpb24od3JpdGUpIHtcbi8vICAgICAgIHJldHVybiBmdW5jdGlvbihzdHJpbmcsIGVuY29kaW5nLCBmZCkge1xuLy8gICAgICAgICAgIHdyaXRlLmFwcGx5KHByb2Nlc3Muc3Rkb3V0LCBhcmd1bWVudHMpXG4vLyAgICAgICAgICAgY2FsbGJhY2soc3RyaW5nLCBlbmNvZGluZywgZmQpXG4vLyAgICAgICB9XG4vLyAgIH0pKHByb2Nlc3Muc3Rkb3V0LndyaXRlKVxuXG4vLyAgIHJldHVybiBmdW5jdGlvbigpIHtcbi8vICAgICAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlID0gb2xkX3dyaXRlXG4vLyAgICAgICBjb25zb2xlLmxvZygnaW4gdW5ob29rJylcbi8vICAgICB9XG4vLyB9XG4gICAgLy8gdGhpcy51bmhvb2sgPSBob29rX3N0ZG91dChmdW5jdGlvbihzdHJpbmcsIGVuY29kaW5nLCBmZCkge1xuICAgIC8vICAgY29uc29sZS5sb2coJ3N0ZG91dDogJyArIHN0cmluZylcbiAgICAvLyB9KVxuXG4vLyAgICAgICAgdGhpcy51bmhvb2soKVxuXG5cblxuXG5cbiAgICAgICAgLy8gdmFyIGZpbGVsaXN0ID0gJ0luIHRoaXMgYnVpbGQ6XFxuXFxuJztcblxuICAgICAgICAvLyAvLyBMb29wIHRocm91Z2ggYWxsIGNvbXBpbGVkIGFzc2V0cyxcbiAgICAgICAgLy8gLy8gYWRkaW5nIGEgbmV3IGxpbmUgaXRlbSBmb3IgZWFjaCBmaWxlbmFtZS5cbiAgICAgICAgLy8gZm9yICh2YXIgZmlsZW5hbWUgaW4gY29tcGlsYXRpb24uYXNzZXRzKSB7XG4gICAgICAgIC8vICAgZmlsZWxpc3QgKz0gKCctICcrIGZpbGVuYW1lICsnXFxuJyk7XG4gICAgICAgIC8vIH1cbiAgICBcbiAgICAgICAgLy8gLy8gSW5zZXJ0IHRoaXMgbGlzdCBpbnRvIHRoZSB3ZWJwYWNrIGJ1aWxkIGFzIGEgbmV3IGZpbGUgYXNzZXQ6XG4gICAgICAgIC8vIGNvbXBpbGF0aW9uLmFzc2V0c1snZmlsZWxpc3QubWQnXSA9IHtcbiAgICAgICAgLy8gICBzb3VyY2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyAgICAgcmV0dXJuIGZpbGVsaXN0O1xuICAgICAgICAvLyAgIH0sXG4gICAgICAgIC8vICAgc2l6ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vICAgICByZXR1cm4gZmlsZWxpc3QubGVuZ3RoO1xuICAgICAgICAvLyAgIH1cbiAgICAgICAgLy8gfTtcblxuXG5cblxuXG4gICAgICAgIC8vIC8vdmFyIGQgPSBuZXcgRGF0ZSgpXG4gICAgICAgIC8vIHZhciBkID0gJ21qZydcbiAgICAgICAgLy8gdmFyIGZpbGVsaXN0ID0gJ0luIHRoaXMgYnVpbGQ6XFxuXFxuJyArIGQgKyAnXFxuXFxuJztcbiAgICAgICAgLy8gLy8gTG9vcCB0aHJvdWdoIGFsbCBjb21waWxlZCBhc3NldHMsXG4gICAgICAgIC8vIC8vIGFkZGluZyBhIG5ldyBsaW5lIGl0ZW0gZm9yIGVhY2ggZmlsZW5hbWUuXG4gICAgICAgIC8vIGZvciAodmFyIGZpbGVuYW1lIGluIGNvbXBpbGF0aW9uLmFzc2V0cykge1xuICAgICAgICAvLyAgIGZpbGVsaXN0ICs9ICgnLSAnKyBmaWxlbmFtZSArJ1xcbicpO1xuICAgICAgICAvLyB9XG4gICAgICAgIC8vIC8vIEluc2VydCB0aGlzIGxpc3QgaW50byB0aGUgd2VicGFjayBidWlsZCBhcyBhIG5ldyBmaWxlIGFzc2V0OlxuICAgICAgICAvLyBjb21waWxhdGlvbi5hc3NldHNbZCArICcubWQnXSA9IHtcbiAgICAgICAgLy8gICBzb3VyY2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyAgICAgcmV0dXJuIGZpbGVsaXN0O1xuICAgICAgICAvLyAgIH0sXG4gICAgICAgIC8vICAgc2l6ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vICAgICByZXR1cm4gZmlsZWxpc3QubGVuZ3RoO1xuICAgICAgICAvLyAgIH1cbiAgICAgICAgLy8gfTsiXX0=