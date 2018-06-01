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
              console.log('' + app + path.resolve(file) + ' changed ' + file);
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
              if (watchedFiles[file].indexOf("json") != -1) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9pbmRleC5qcyJdLCJuYW1lcyI6WyJjaGFsayIsInJlcXVpcmUiLCJwYXRoIiwiZnMiLCJ2YWxpZGF0ZU9wdGlvbnMiLCJ1bmlxIiwiaXNHbG9iIiwicmVjdXJzaXZlUmVhZFN5bmMiLCJwcmVmaXgiLCJwbGF0Zm9ybSIsImFwcCIsImdyZWVuIiwiZ2V0RmlsZUFuZENvbnRleHREZXBzIiwiY29tcGlsYXRpb24iLCJmaWxlcyIsImRpcnMiLCJjd2QiLCJmaWxlRGVwZW5kZW5jaWVzIiwiY29udGV4dERlcGVuZGVuY2llcyIsImlzV2VicGFjazQiLCJob29rcyIsImZkcyIsImNkcyIsImxlbmd0aCIsImZvckVhY2giLCJwYXR0ZXJuIiwiZiIsImdsb2IiLCJzeW5jIiwiZG90IiwiYWJzb2x1dGUiLCJjb25jYXQiLCJFeHRXZWJwYWNrUGx1Z2luIiwib3B0aW9ucyIsImRlZmF1bHRzIiwicHJvY2VzcyIsImNvbXBpbGVyIiwid2VicGFja1ZlcnNpb24iLCJ1bmRlZmluZWQiLCJwbHVnaW5QYXRoIiwicmVzb2x2ZSIsIl9fZGlybmFtZSIsInBsdWdpblBrZyIsImV4aXN0c1N5bmMiLCJKU09OIiwicGFyc2UiLCJyZWFkRmlsZVN5bmMiLCJwbHVnaW5WZXJzaW9uIiwidmVyc2lvbiIsImV4dFBhdGgiLCJleHRQa2ciLCJleHRWZXJzaW9uIiwic2VuY2hhIiwiY21kUGF0aCIsImNtZFBrZyIsImNtZFZlcnNpb24iLCJ2ZXJzaW9uX2Z1bGwiLCJzdGRvdXQiLCJjdXJzb3JUbyIsImNvbnNvbGUiLCJsb2ciLCJhZnRlckNvbXBpbGUiLCJ0YXAiLCJmaWxlIiwiYWRkIiwiY29udGV4dCIsInBsdWdpbiIsImNiIiwibWUiLCJlbWl0IiwidGFwQXN5bmMiLCJ3YXRjaGVkRmlsZXMiLCJlcnIiLCJlcnJubyIsImRvQnVpbGQiLCJsYXN0TWlsbGlzZWNvbmRzIiwic3RhdFN5bmMiLCJtdGltZU1zIiwiaW5kZXhPZiIsIkRhdGUiLCJnZXRUaW1lIiwiY3VycmVudE51bUZpbGVzIiwiZmlsZXNvdXJjZSIsImFzc2V0cyIsInNvdXJjZSIsInNpemUiLCJsYXN0TnVtRmlsZXMiLCJidWlsZEFzeW5jIiwicGFybXMiLCJleGVjdXRlQXN5bmMiLCJ0aGVuIiwiZmlsZWxpc3QiLCJyZWZyZXNoIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUFBLElBQU1BLFFBQVFDLFFBQVEsT0FBUixDQUFkO0FBQ0EsSUFBTUMsT0FBT0QsUUFBUSxNQUFSLENBQWI7QUFDQSxJQUFNRSxLQUFLRixRQUFRLElBQVIsQ0FBWDtBQUNBLElBQU1HLGtCQUFrQkgsUUFBUSxjQUFSLENBQXhCO0FBQ0EsSUFBTUksT0FBT0osUUFBUSxhQUFSLENBQWI7QUFDQSxJQUFNSyxTQUFTTCxRQUFRLFNBQVIsQ0FBZjtBQUNBLElBQU1NLG9CQUFvQk4sUUFBUSx3QkFBUixDQUExQjs7QUFFQSxJQUFJTyxXQUFKO0FBQ0EsSUFBSUMsV0FBV1IsUUFBUSxJQUFSLEVBQWNRLFFBQWQsRUFBZjtBQUNBLElBQUlBLFlBQVksUUFBaEIsRUFBMEI7QUFDeEJEO0FBQ0QsQ0FGRCxNQUdLO0FBQ0hBO0FBQ0Q7QUFDRCxJQUFJRSxNQUFNVixNQUFNVyxLQUFOLENBQVlILE1BQVosSUFBc0IsdUJBQWhDOztBQUVBLFNBQVNJLHFCQUFULENBQStCQyxXQUEvQixFQUE0Q0MsS0FBNUMsRUFBbURDLElBQW5ELEVBQXlEQyxHQUF6RCxFQUE4RDtBQUFBLE1BQ3BEQyxnQkFEb0QsR0FDVkosV0FEVSxDQUNwREksZ0JBRG9EO0FBQUEsTUFDbENDLG1CQURrQyxHQUNWTCxXQURVLENBQ2xDSyxtQkFEa0M7O0FBRTVELE1BQU1DLGFBQWFOLFlBQVlPLEtBQS9CO0FBQ0EsTUFBSUMsTUFBTUYsMENBQWlCRixnQkFBakIsS0FBcUNBLGdCQUEvQztBQUNBLE1BQUlLLE1BQU1ILDBDQUFpQkQsbUJBQWpCLEtBQXdDQSxtQkFBbEQ7O0FBRUEsTUFBSUosTUFBTVMsTUFBTixHQUFlLENBQW5CLEVBQXNCO0FBQ3BCVCxVQUFNVSxP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QTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7Ozs7Ozs7QUFXQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFHRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJO0FBQ0E7QUFDQTs7QUFFSjs7O0FBTVE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQU1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztrQkFwVWE1RCxnQiIsImZpbGUiOiJpbmRleC5qcyIsInNvdXJjZXNDb250ZW50IjpbImNvbnN0IGNoYWxrID0gcmVxdWlyZSgnY2hhbGsnKVxuY29uc3QgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKVxuY29uc3QgZnMgPSByZXF1aXJlKCdmcycpXG5jb25zdCB2YWxpZGF0ZU9wdGlvbnMgPSByZXF1aXJlKCdzY2hlbWEtdXRpbHMnKVxuY29uc3QgdW5pcSA9IHJlcXVpcmUoJ2xvZGFzaC51bmlxJylcbmNvbnN0IGlzR2xvYiA9IHJlcXVpcmUoJ2lzLWdsb2InKVxuY29uc3QgcmVjdXJzaXZlUmVhZFN5bmMgPSByZXF1aXJlKCdyZWN1cnNpdmUtcmVhZGRpci1zeW5jJylcblxudmFyIHByZWZpeCA9IGBgXG52YXIgcGxhdGZvcm0gPSByZXF1aXJlKCdvcycpLnBsYXRmb3JtKClcbmlmIChwbGF0Zm9ybSA9PSAnZGFyd2luJykge1xuICBwcmVmaXggPSBg4oS5IO+9omV4dO+9ozpgXG59XG5lbHNlIHtcbiAgcHJlZml4ID0gYGkgW2V4dF06YFxufVxudmFyIGFwcCA9IGNoYWxrLmdyZWVuKHByZWZpeCkgKyAnIGV4dC13ZWJwYWNrLXBsdWdpbjogJztcblxuZnVuY3Rpb24gZ2V0RmlsZUFuZENvbnRleHREZXBzKGNvbXBpbGF0aW9uLCBmaWxlcywgZGlycywgY3dkKSB7XG4gIGNvbnN0IHsgZmlsZURlcGVuZGVuY2llcywgY29udGV4dERlcGVuZGVuY2llcyB9ID0gY29tcGlsYXRpb247XG4gIGNvbnN0IGlzV2VicGFjazQgPSBjb21waWxhdGlvbi5ob29rcztcbiAgbGV0IGZkcyA9IGlzV2VicGFjazQgPyBbLi4uZmlsZURlcGVuZGVuY2llc10gOiBmaWxlRGVwZW5kZW5jaWVzO1xuICBsZXQgY2RzID0gaXNXZWJwYWNrNCA/IFsuLi5jb250ZXh0RGVwZW5kZW5jaWVzXSA6IGNvbnRleHREZXBlbmRlbmNpZXM7XG4gIFxuICBpZiAoZmlsZXMubGVuZ3RoID4gMCkge1xuICAgIGZpbGVzLmZvckVhY2goKHBhdHRlcm4pID0+IHtcbiAgICAgIGxldCBmID0gcGF0dGVybjtcbiAgICAgIGlmIChpc0dsb2IocGF0dGVybikpIHtcbiAgICAgICAgZiA9IGdsb2Iuc3luYyhwYXR0ZXJuLCB7XG4gICAgICAgICAgY3dkLFxuICAgICAgICAgIGRvdDogdHJ1ZSxcbiAgICAgICAgICBhYnNvbHV0ZTogdHJ1ZSxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBmZHMgPSBmZHMuY29uY2F0KGYpO1xuICAgIH0pO1xuICAgIGZkcyA9IHVuaXEoZmRzKTtcbiAgfVxuICBcbiAgaWYgKGRpcnMubGVuZ3RoID4gMCkge1xuICAgIGNkcyA9IHVuaXEoY2RzLmNvbmNhdChkaXJzKSk7XG4gIH1cbiAgcmV0dXJuIHtcbiAgICBmaWxlRGVwZW5kZW5jaWVzOiBmZHMsXG4gICAgY29udGV4dERlcGVuZGVuY2llczogY2RzLFxuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBFeHRXZWJwYWNrUGx1Z2luIHtcbiAgLy8gc3RhdGljIGRlZmF1bHRzID0ge1xuICAvLyAgIGN3ZDogcHJvY2Vzcy5jd2QoKSxcbiAgLy8gICBmaWxlczogW10sXG4gIC8vICAgZGlyczogWycuL2FwcCddLFxuICAvLyB9O1xuXG4gIGNvbnN0cnVjdG9yKG9wdGlvbnMgPSB7fSkge1xuICAgIHZhbGlkYXRlT3B0aW9ucyhyZXF1aXJlKCcuLi9vcHRpb25zLmpzb24nKSwgb3B0aW9ucywgJ0V4dHJhV2F0Y2hXZWJwYWNrUGx1Z2luJyk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmVcbiAgICAvL3RoaXMub3B0aW9ucyA9IHsgLi4uRXh0V2VicGFja1BsdWdpbi5kZWZhdWx0cywgLi4ub3B0aW9ucyB9O1xuXG4gICAgdmFyIGRlZmF1bHRzID0ge1xuICAgICAgY3dkOiBwcm9jZXNzLmN3ZCgpLFxuICAgICAgZmlsZXM6IFsnLi9hcHAuanNvbiddLFxuICAgICAgZGlyczogWycuL2FwcCddLFxuICAgIH1cblxuICAgIHRoaXMub3B0aW9ucyA9IHsgLi4uZGVmYXVsdHMsIC4uLm9wdGlvbnMgfTtcbiAgfVxuXG4gIGFwcGx5KGNvbXBpbGVyKSB7XG5cbiAgICBpZiAodGhpcy53ZWJwYWNrVmVyc2lvbiA9PSB1bmRlZmluZWQpIHtcbiAgICAgIHZhciBwbHVnaW5QYXRoID0gcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwnLi4nKVxuICAgICAgdmFyIHBsdWdpblBrZyA9IChmcy5leGlzdHNTeW5jKHBsdWdpblBhdGgrJy9wYWNrYWdlLmpzb24nKSAmJiBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhwbHVnaW5QYXRoKycvcGFja2FnZS5qc29uJywgJ3V0Zi04JykpIHx8IHt9KTtcbiAgICAgIHZhciBwbHVnaW5WZXJzaW9uID0gcGx1Z2luUGtnLnZlcnNpb25cbiAgXG4gICAgICB2YXIgZXh0UGF0aCA9IHBhdGgucmVzb2x2ZShwbHVnaW5QYXRoLCcuLi9leHQnKVxuICAgICAgdmFyIGV4dFBrZyA9IChmcy5leGlzdHNTeW5jKGV4dFBhdGgrJy9wYWNrYWdlLmpzb24nKSAmJiBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhleHRQYXRoKycvcGFja2FnZS5qc29uJywgJ3V0Zi04JykpIHx8IHt9KTtcbiAgICAgIHZhciBleHRWZXJzaW9uID0gZXh0UGtnLnNlbmNoYS52ZXJzaW9uXG5cbiAgICAgIHZhciBjbWRQYXRoID0gcGF0aC5yZXNvbHZlKHBsdWdpblBhdGgsJy4uL3NlbmNoYS1jbWQnKVxuICAgICAgdmFyIGNtZFBrZyA9IChmcy5leGlzdHNTeW5jKGNtZFBhdGgrJy9wYWNrYWdlLmpzb24nKSAmJiBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhjbWRQYXRoKycvcGFja2FnZS5qc29uJywgJ3V0Zi04JykpIHx8IHt9KTtcbiAgICAgIHZhciBjbWRWZXJzaW9uID0gY21kUGtnLnZlcnNpb25fZnVsbFxuXG4gICAgICBjb25zdCBpc1dlYnBhY2s0ID0gY29tcGlsZXIuaG9va3M7XG4gICAgICBpZiAoaXNXZWJwYWNrNCkge3RoaXMud2VicGFja1ZlcnNpb24gPSAnSVMgd2VicGFjayA0J31cbiAgICAgIGVsc2Uge3RoaXMud2VicGFja1ZlcnNpb24gPSAnTk9UIHdlYnBhY2sgNCd9XG4gICAgICBwcm9jZXNzLnN0ZG91dC5jdXJzb3JUbygwKTtjb25zb2xlLmxvZyhhcHAgKyAndicgKyBwbHVnaW5WZXJzaW9uICsgJywgRXh0IEpTIHYnICsgZXh0VmVyc2lvbiArICcsIFNlbmNoYSBDbWQgdicgKyBjbWRWZXJzaW9uICsgJywgJyArIHRoaXMud2VicGFja1ZlcnNpb24pXG4gICAgfVxuXG4gICAgbGV0IHsgZmlsZXMsIGRpcnMgfSA9IHRoaXMub3B0aW9ucztcbiAgICBjb25zdCB7IGN3ZCB9ID0gdGhpcy5vcHRpb25zO1xuICAgIGZpbGVzID0gdHlwZW9mIGZpbGVzID09PSAnc3RyaW5nJyA/IFtmaWxlc10gOiBmaWxlcztcbiAgICBkaXJzID0gdHlwZW9mIGRpcnMgPT09ICdzdHJpbmcnID8gW2RpcnNdIDogZGlycztcblxuICAgIGlmIChjb21waWxlci5ob29rcykge1xuICAgICAgY29tcGlsZXIuaG9va3MuYWZ0ZXJDb21waWxlLnRhcCgnZXh0LWFmdGVyLWNvbXBpbGUnLCAoY29tcGlsYXRpb24pID0+IHtcbiAgICAgICAgcHJvY2Vzcy5zdGRvdXQuY3Vyc29yVG8oMCk7Y29uc29sZS5sb2coYXBwICsgJ2V4dC1hZnRlci1jb21waWxlJylcbiAgICAgICAgY29uc3Qge1xuICAgICAgICAgIGZpbGVEZXBlbmRlbmNpZXMsXG4gICAgICAgICAgY29udGV4dERlcGVuZGVuY2llcyxcbiAgICAgICAgfSA9IGdldEZpbGVBbmRDb250ZXh0RGVwcyhjb21waWxhdGlvbiwgZmlsZXMsIGRpcnMsIGN3ZCk7XG4gICAgICAgIGlmIChmaWxlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgZmlsZURlcGVuZGVuY2llcy5mb3JFYWNoKChmaWxlKSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgJHthcHB9JHtwYXRoLnJlc29sdmUoZmlsZSl9IGNoYW5nZWQgJHtmaWxlfWApXG4gICAgICAgICAgICBjb21waWxhdGlvbi5maWxlRGVwZW5kZW5jaWVzLmFkZChwYXRoLnJlc29sdmUoZmlsZSkpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkaXJzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBjb250ZXh0RGVwZW5kZW5jaWVzLmZvckVhY2goKGNvbnRleHQpID0+IHtcbiAgICAgICAgICAgIGNvbXBpbGF0aW9uLmNvbnRleHREZXBlbmRlbmNpZXMuYWRkKGNvbnRleHQpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29tcGlsZXIucGx1Z2luKCdhZnRlci1jb21waWxlJywgKGNvbXBpbGF0aW9uLCBjYikgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZyhhcHAgKyAnYWZ0ZXItY29tcGlsZScpXG4gICAgICAgIGNvbnN0IHtcbiAgICAgICAgICBmaWxlRGVwZW5kZW5jaWVzLFxuICAgICAgICAgIGNvbnRleHREZXBlbmRlbmNpZXMsXG4gICAgICAgIH0gPSBnZXRGaWxlQW5kQ29udGV4dERlcHMoY29tcGlsYXRpb24sIGZpbGVzLCBkaXJzLCBjd2QpO1xuICAgICAgICBpZiAoZmlsZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGNvbXBpbGF0aW9uLmZpbGVEZXBlbmRlbmNpZXMgPSBmaWxlRGVwZW5kZW5jaWVzOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lXG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRpcnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGNvbXBpbGF0aW9uLmNvbnRleHREZXBlbmRlbmNpZXMgPSBjb250ZXh0RGVwZW5kZW5jaWVzOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lXG4gICAgICAgIH1cbiAgICAgICAgY2IoKVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKGNvbXBpbGVyLmhvb2tzKSB7XG4gICAgICB2YXIgbWUgPSB0aGlzXG4gICAgICBjb21waWxlci5ob29rcy5lbWl0LnRhcEFzeW5jKCdleHQtZW1pdC1hc3luYycsIGZ1bmN0aW9uIChjb21waWxhdGlvbiwgY2IpIHtcbiAgICAgICAgcHJvY2Vzcy5zdGRvdXQuY3Vyc29yVG8oMCk7Y29uc29sZS5sb2coYXBwICsgJ2V4dC1lbWl0LWFzeW5jJylcblxuICAgICAgICB2YXIgd2F0Y2hlZEZpbGVzPVtdXG4gICAgICAgIHRyeSB7d2F0Y2hlZEZpbGVzID0gcmVjdXJzaXZlUmVhZFN5bmMoJy4vYXBwJyl9IFxuICAgICAgICBjYXRjaChlcnIpIHtpZihlcnIuZXJybm8gPT09IDM0KXtjb25zb2xlLmxvZygnUGF0aCBkb2VzIG5vdCBleGlzdCcpO30gZWxzZSB7dGhyb3cgZXJyO319XG5cbiAgICAgICAgdmFyIGRvQnVpbGQgPSBmYWxzZVxuICAgICAgICBmb3IgKHZhciBmaWxlIGluIHdhdGNoZWRGaWxlcykge1xuICAgICAgICAgIGlmIChtZS5sYXN0TWlsbGlzZWNvbmRzIDwgZnMuc3RhdFN5bmMod2F0Y2hlZEZpbGVzW2ZpbGVdKS5tdGltZU1zKSB7XG4gICAgICAgICAgICBpZiAod2F0Y2hlZEZpbGVzW2ZpbGVdLmluZGV4T2YoXCJzY3NzXCIpICE9IC0xKSB7ZG9CdWlsZD10cnVlO2JyZWFrO31cbiAgICAgICAgICAgIGlmICh3YXRjaGVkRmlsZXNbZmlsZV0uaW5kZXhPZihcImpzb25cIikgIT0gLTEpIHtkb0J1aWxkPXRydWU7YnJlYWs7fVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBtZS5sYXN0TWlsbGlzZWNvbmRzID0gKG5ldyBEYXRlKS5nZXRUaW1lKClcblxuICAgICAgICB2YXIgY3VycmVudE51bUZpbGVzID0gd2F0Y2hlZEZpbGVzLmxlbmd0aFxuICAgICAgICB2YXIgZmlsZXNvdXJjZSA9ICd0aGlzIGZpbGUgZW5hYmxlcyBjbGllbnQgcmVsb2FkJ1xuICAgICAgICBjb21waWxhdGlvbi5hc3NldHNbY3VycmVudE51bUZpbGVzICsgJ0ZpbGVzVW5kZXJBcHBGb2xkZXIubWQnXSA9IHtcbiAgICAgICAgICBzb3VyY2U6IGZ1bmN0aW9uKCkge3JldHVybiBmaWxlc291cmNlfSxcbiAgICAgICAgICBzaXplOiBmdW5jdGlvbigpIHtyZXR1cm4gZmlsZXNvdXJjZS5sZW5ndGh9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY3VycmVudE51bUZpbGVzICE9IG1lLmxhc3ROdW1GaWxlcyB8fCBkb0J1aWxkKSB7XG4gICAgICAgICAgbWUubGFzdE51bUZpbGVzID0gY3VycmVudE51bUZpbGVzXG4gICAgICAgICAgdmFyIGJ1aWxkQXN5bmMgPSByZXF1aXJlKCdAZXh0anMvZXh0LWJ1aWxkL2FwcC9idWlsZEFzeW5jLmpzJylcbiAgICAgICAgICB2YXIgb3B0aW9ucyA9IHtwYXJtczogWydhcHAnLCdidWlsZCcsJ2RldmVsb3BtZW50J119XG4gICAgICAgICAgbmV3IGJ1aWxkQXN5bmMob3B0aW9ucykuZXhlY3V0ZUFzeW5jKCkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNiKClcbiAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIG1lLmxhc3ROdW1GaWxlcyA9IGN1cnJlbnROdW1GaWxlc1xuICAgICAgICAgIGNvbnNvbGUubG9nKGFwcCArICdjYWxsIHRvIGV4dC1idWlsZCBub3QgbmVlZGVkLCBubyBuZXcgZmlsZXMnKVxuICAgICAgICAgIGNiKClcbiAgICAgICAgfVxuICAgICAgfSlcblxuXG4vLyAgICAgIGNvbXBpbGVyLmhvb2tzLmVtaXQudGFwKCdleHQtZW1pdCcsIChjb21waWxhdGlvbikgPT4ge1xuLy8gICAgICAgIHByb2Nlc3Muc3Rkb3V0LmN1cnNvclRvKDApO2NvbnNvbGUubG9nKGFwcCArICdleHQtZW1pdCcpXG5cbiAgICAgIC8vICAgdmFyIHdhdGNoZWRGaWxlcz1bXVxuICAgICAgLy8gICB0cnkge3dhdGNoZWRGaWxlcyA9IHJlY3Vyc2l2ZVJlYWRTeW5jKCcuL2FwcCcpfSBcbiAgICAgIC8vICAgY2F0Y2goZXJyKSB7aWYoZXJyLmVycm5vID09PSAzNCl7Y29uc29sZS5sb2coJ1BhdGggZG9lcyBub3QgZXhpc3QnKTt9IGVsc2Uge3Rocm93IGVycjt9fVxuXG4gICAgICAvLyAgIHZhciBkb0J1aWxkID0gZmFsc2VcbiAgICAgIC8vICAgZm9yICh2YXIgZmlsZSBpbiB3YXRjaGVkRmlsZXMpIHtcbiAgICAgIC8vICAgICBpZiAodGhpcy5sYXN0TWlsbGlzZWNvbmRzIDwgZnMuc3RhdFN5bmMod2F0Y2hlZEZpbGVzW2ZpbGVdKS5tdGltZU1zKSB7XG4gICAgICAvLyAgICAgICBpZiAod2F0Y2hlZEZpbGVzW2ZpbGVdLmluZGV4T2YoXCJzY3NzXCIpICE9IC0xKSB7ZG9CdWlsZD10cnVlO2JyZWFrO31cbiAgICAgIC8vICAgICB9XG4gICAgICAvLyAgIH1cbiAgICAgIC8vICAgdGhpcy5sYXN0TWlsbGlzZWNvbmRzID0gKG5ldyBEYXRlKS5nZXRUaW1lKClcblxuICAgICAgLy8gICB2YXIgY3VycmVudE51bUZpbGVzID0gd2F0Y2hlZEZpbGVzLmxlbmd0aFxuICAgICAgLy8gICB2YXIgZmlsZXNvdXJjZSA9ICd0aGlzIGZpbGUgZW5hYmxlcyBjbGllbnQgcmVsb2FkJ1xuICAgICAgLy8gICBjb21waWxhdGlvbi5hc3NldHNbY3VycmVudE51bUZpbGVzICsgJ0ZpbGVzVW5kZXJBcHBGb2xkZXIubWQnXSA9IHtcbiAgICAgIC8vICAgICBzb3VyY2U6IGZ1bmN0aW9uKCkge3JldHVybiBmaWxlc291cmNlfSxcbiAgICAgIC8vICAgICBzaXplOiBmdW5jdGlvbigpIHtyZXR1cm4gZmlsZXNvdXJjZS5sZW5ndGh9XG4gICAgICAvLyAgIH1cblxuICAgICAgLy8gICBpZiAoY3VycmVudE51bUZpbGVzICE9IHRoaXMubGFzdE51bUZpbGVzIHx8IGRvQnVpbGQpIHtcbiAgICAgIC8vICAgICB2YXIgYnVpbGQgPSByZXF1aXJlKCdAZXh0anMvZXh0LWJ1aWxkL2FwcC9idWlsZC5qcycpXG4gICAgICAvLyAgICAgbmV3IGJ1aWxkKHt9KVxuICAgICAgLy8gICAgIC8vdmFyIHJlZnJlc2ggPSByZXF1aXJlKCdAZXh0anMvc2VuY2hhLWJ1aWxkL2FwcC9yZWZyZXNoLmpzJylcbiAgICAgIC8vICAgICAvL25ldyByZWZyZXNoKHt9KVxuICAgICAgLy8gICB9XG4gICAgICAvLyAgIGVsc2Uge1xuICAgICAgLy8gICAgIGNvbnNvbGUubG9nKGFwcCArICdDYWxsIHRvIFNlbmNoYSBCdWlsZCBub3QgbmVlZGVkLCBubyBuZXcgZmlsZXMnKVxuICAgICAgLy8gICB9XG4gICAgICAvLyAgIHRoaXMubGFzdE51bUZpbGVzID0gY3VycmVudE51bUZpbGVzXG5cbi8vICAgICAgfSlcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBjb21waWxlci5wbHVnaW4oJ2VtaXQnLCAoY29tcGlsYXRpb24sIGNiKSA9PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKGFwcCArICdlbWl0JylcbiAgICAgICAgdmFyIGZpbGVsaXN0ID0gJ3RoaXMgZmlsZSBlbmFibGVzIGNsaWVudCByZWxvYWQnXG4gICAgICAgIGNvbXBpbGF0aW9uLmFzc2V0c1snRm9yUmVsb2FkLm1kJ10gPSB7XG4gICAgICAgICAgc291cmNlOiBmdW5jdGlvbigpIHtyZXR1cm4gZmlsZWxpc3R9LFxuICAgICAgICAgIHNpemU6IGZ1bmN0aW9uKCkge3JldHVybiBmaWxlbGlzdC5sZW5ndGh9XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHJlZnJlc2ggPSByZXF1aXJlKCdAZXh0anMvZXh0LWJ1aWxkL2FwcC9yZWZyZXNoLmpzJylcbiAgICAgICAgbmV3IHJlZnJlc2goe30pXG5cbiAgICAgICAgLy8gY29uc29sZS5sb2coJ1RISVMgSVMgSVQnKVxuICAgICAgICAvLyB2YXIgYnVpbGRBc3luYyA9IHJlcXVpcmUoJ0BleHRqcy9leHQtYnVpbGQvYXBwL2J1aWxkQXN5bmMuanMnKVxuICAgICAgICAvLyBjb25zb2xlLmxvZyhidWlsZEFzeW5jKVxuICAgICAgICAvLyBuZXcgYnVpbGRBc3luYygpLmV4ZWN1dGVBc3luYygpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vICAgY29uc29sZS5sb2coJ3RoZW4gY2FsbCcpO1xuICAgICAgICAvLyAgIGNiKCk7XG4gICAgICAgIC8vIH0pXG5cblxuICAgICAgICAvL2NiKClcbiAgICAgICAgLy90aGlzLmVtaXRTdGF0cy5iaW5kKHRoaXMpXG5cblxuXG4gICAgICB9KVxuICAgIH1cblxuICB9XG5cblxuICAvLyBlbWl0U3RhdHMoY3VyQ29tcGlsZXIsIGNhbGxiYWNrKSB7XG4gIC8vICAgLy8gR2V0IHN0YXRzLlxuICAvLyAgIC8vICoqTm90ZSoqOiBJbiBmdXR1cmUsIGNvdWxkIHBhc3Mgc29tZXRoaW5nIGxpa2UgYHsgc2hvd0Fzc2V0czogdHJ1ZSB9YFxuICAvLyAgIC8vIHRvIHRoZSBgZ2V0U3RhdHMoKWAgZnVuY3Rpb24gZm9yIG1vcmUgbGltaXRlZCBvYmplY3QgcmV0dXJuZWQuXG4gIC8vICAgbGV0IHN0YXRzID0gY3VyQ29tcGlsZXIuZ2V0U3RhdHMoKS50b0pzb24oKTtcbiAgXG4gIC8vICAgLy8gRmlsdGVyIHRvIGZpZWxkcy5cbiAgLy8gICBpZiAodGhpcy5vcHRzLmZpZWxkcykge1xuICAvLyAgICAgc3RhdHMgPSB0aGlzLm9wdHMuZmllbGRzLnJlZHVjZSgobWVtbywga2V5KSA9PiB7XG4gIC8vICAgICAgIG1lbW9ba2V5XSA9IHN0YXRzW2tleV07XG4gIC8vICAgICAgIHJldHVybiBtZW1vO1xuICAvLyAgICAgfSwge30pO1xuICAvLyAgIH1cbiAgXG4gIC8vICAgLy8gVHJhbnNmb3JtIHRvIHN0cmluZy5cbiAgLy8gICBsZXQgZXJyO1xuICAvLyAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKVxuICBcbiAgLy8gICAgIC8vIFRyYW5zZm9ybS5cbiAgLy8gICAgIC50aGVuKCgpID0+IHRoaXMub3B0cy50cmFuc2Zvcm0oc3RhdHMsIHtcbiAgLy8gICAgICAgY29tcGlsZXI6IGN1ckNvbXBpbGVyXG4gIC8vICAgICB9KSlcbiAgLy8gICAgIC5jYXRjaCgoZSkgPT4geyBlcnIgPSBlOyB9KVxuICBcbiAgLy8gICAgIC8vIEZpbmlzaCB1cC5cbiAgLy8gICAgIC50aGVuKChzdGF0c1N0cikgPT4ge1xuICAvLyAgICAgICAvLyBIYW5kbGUgZXJyb3JzLlxuICAvLyAgICAgICBpZiAoZXJyKSB7XG4gIC8vICAgICAgICAgY3VyQ29tcGlsZXIuZXJyb3JzLnB1c2goZXJyKTtcbiAgLy8gICAgICAgICBpZiAoY2FsbGJhY2spIHsgcmV0dXJuIHZvaWQgY2FsbGJhY2soZXJyKTsgfVxuICAvLyAgICAgICAgIHRocm93IGVycjtcbiAgLy8gICAgICAgfVxuICBcbiAgLy8gICAgICAgLy8gQWRkIHRvIGFzc2V0cy5cbiAgLy8gICAgICAgY3VyQ29tcGlsZXIuYXNzZXRzW3RoaXMub3B0cy5maWxlbmFtZV0gPSB7XG4gIC8vICAgICAgICAgc291cmNlKCkge1xuICAvLyAgICAgICAgICAgcmV0dXJuIHN0YXRzU3RyO1xuICAvLyAgICAgICAgIH0sXG4gIC8vICAgICAgICAgc2l6ZSgpIHtcbiAgLy8gICAgICAgICAgIHJldHVybiBzdGF0c1N0ci5sZW5ndGg7XG4gIC8vICAgICAgICAgfVxuICAvLyAgICAgICB9O1xuICBcbiAgLy8gICAgICAgaWYgKGNhbGxiYWNrKSB7IHJldHVybiB2b2lkIGNhbGxiYWNrKCk7IH1cbiAgLy8gICAgIH0pO1xuICAvLyB9XG4gIFxuXG5cbn1cblxuXG5cblxuXG5cbiAgLy8gaWYgKGZpbGVzLmxlbmd0aCA+IDApIHtcbiAgLy8gICBmaWxlcy5mb3JFYWNoKChwYXR0ZXJuKSA9PiB7XG4gIC8vICAgICBsZXQgZiA9IHBhdHRlcm47XG4gIC8vICAgICBpZiAoaXNHbG9iKHBhdHRlcm4pKSB7XG4gIC8vICAgICAgIGYgPSBnbG9iLnN5bmMocGF0dGVybiwge1xuICAvLyAgICAgICAgIGN3ZCxcbiAgLy8gICAgICAgICBkb3Q6IHRydWUsXG4gIC8vICAgICAgICAgYWJzb2x1dGU6IHRydWUsXG4gIC8vICAgICAgIH0pO1xuICAvLyAgICAgfVxuICAvLyAgICAgZmRzID0gZmRzLmNvbmNhdChmKTtcbiAgLy8gICB9KTtcbiAgLy8gICBmZHMgPSB1bmlxKGZkcyk7XG4gIC8vIH1cblxuXG4vLyBmdW5jdGlvbiBob29rX3N0ZG91dChjYWxsYmFjaykge1xuLy8gICB2YXIgb2xkX3dyaXRlID0gcHJvY2Vzcy5zdGRvdXQud3JpdGVcbi8vICAgY29uc29sZS5sb2coJ2luIGhvb2snKVxuLy8gICBwcm9jZXNzLnN0ZG91dC53cml0ZSA9IChmdW5jdGlvbih3cml0ZSkge1xuLy8gICAgICAgcmV0dXJuIGZ1bmN0aW9uKHN0cmluZywgZW5jb2RpbmcsIGZkKSB7XG4vLyAgICAgICAgICAgd3JpdGUuYXBwbHkocHJvY2Vzcy5zdGRvdXQsIGFyZ3VtZW50cylcbi8vICAgICAgICAgICBjYWxsYmFjayhzdHJpbmcsIGVuY29kaW5nLCBmZClcbi8vICAgICAgIH1cbi8vICAgfSkocHJvY2Vzcy5zdGRvdXQud3JpdGUpXG5cbi8vICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuLy8gICAgICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUgPSBvbGRfd3JpdGVcbi8vICAgICAgIGNvbnNvbGUubG9nKCdpbiB1bmhvb2snKVxuLy8gICAgIH1cbi8vIH1cbiAgICAvLyB0aGlzLnVuaG9vayA9IGhvb2tfc3Rkb3V0KGZ1bmN0aW9uKHN0cmluZywgZW5jb2RpbmcsIGZkKSB7XG4gICAgLy8gICBjb25zb2xlLmxvZygnc3Rkb3V0OiAnICsgc3RyaW5nKVxuICAgIC8vIH0pXG5cbi8vICAgICAgICB0aGlzLnVuaG9vaygpXG5cblxuXG5cblxuICAgICAgICAvLyB2YXIgZmlsZWxpc3QgPSAnSW4gdGhpcyBidWlsZDpcXG5cXG4nO1xuXG4gICAgICAgIC8vIC8vIExvb3AgdGhyb3VnaCBhbGwgY29tcGlsZWQgYXNzZXRzLFxuICAgICAgICAvLyAvLyBhZGRpbmcgYSBuZXcgbGluZSBpdGVtIGZvciBlYWNoIGZpbGVuYW1lLlxuICAgICAgICAvLyBmb3IgKHZhciBmaWxlbmFtZSBpbiBjb21waWxhdGlvbi5hc3NldHMpIHtcbiAgICAgICAgLy8gICBmaWxlbGlzdCArPSAoJy0gJysgZmlsZW5hbWUgKydcXG4nKTtcbiAgICAgICAgLy8gfVxuICAgIFxuICAgICAgICAvLyAvLyBJbnNlcnQgdGhpcyBsaXN0IGludG8gdGhlIHdlYnBhY2sgYnVpbGQgYXMgYSBuZXcgZmlsZSBhc3NldDpcbiAgICAgICAgLy8gY29tcGlsYXRpb24uYXNzZXRzWydmaWxlbGlzdC5tZCddID0ge1xuICAgICAgICAvLyAgIHNvdXJjZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vICAgICByZXR1cm4gZmlsZWxpc3Q7XG4gICAgICAgIC8vICAgfSxcbiAgICAgICAgLy8gICBzaXplOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gICAgIHJldHVybiBmaWxlbGlzdC5sZW5ndGg7XG4gICAgICAgIC8vICAgfVxuICAgICAgICAvLyB9O1xuXG5cblxuXG5cbiAgICAgICAgLy8gLy92YXIgZCA9IG5ldyBEYXRlKClcbiAgICAgICAgLy8gdmFyIGQgPSAnbWpnJ1xuICAgICAgICAvLyB2YXIgZmlsZWxpc3QgPSAnSW4gdGhpcyBidWlsZDpcXG5cXG4nICsgZCArICdcXG5cXG4nO1xuICAgICAgICAvLyAvLyBMb29wIHRocm91Z2ggYWxsIGNvbXBpbGVkIGFzc2V0cyxcbiAgICAgICAgLy8gLy8gYWRkaW5nIGEgbmV3IGxpbmUgaXRlbSBmb3IgZWFjaCBmaWxlbmFtZS5cbiAgICAgICAgLy8gZm9yICh2YXIgZmlsZW5hbWUgaW4gY29tcGlsYXRpb24uYXNzZXRzKSB7XG4gICAgICAgIC8vICAgZmlsZWxpc3QgKz0gKCctICcrIGZpbGVuYW1lICsnXFxuJyk7XG4gICAgICAgIC8vIH1cbiAgICAgICAgLy8gLy8gSW5zZXJ0IHRoaXMgbGlzdCBpbnRvIHRoZSB3ZWJwYWNrIGJ1aWxkIGFzIGEgbmV3IGZpbGUgYXNzZXQ6XG4gICAgICAgIC8vIGNvbXBpbGF0aW9uLmFzc2V0c1tkICsgJy5tZCddID0ge1xuICAgICAgICAvLyAgIHNvdXJjZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vICAgICByZXR1cm4gZmlsZWxpc3Q7XG4gICAgICAgIC8vICAgfSxcbiAgICAgICAgLy8gICBzaXplOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gICAgIHJldHVybiBmaWxlbGlzdC5sZW5ndGg7XG4gICAgICAgIC8vICAgfVxuICAgICAgICAvLyB9OyJdfQ==