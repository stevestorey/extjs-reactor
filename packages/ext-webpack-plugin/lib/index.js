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
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : { profile: 'desktop', environment: 'development' };

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
            var buildAsync = require('@extjs/ext-build/app/buildAsync.js');
            var buildOptions = { parms: ['app', 'build', me.options.profile, me.options.environment] };
            new buildAsync(buildOptions).executeAsync().then(function () {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9pbmRleC5qcyJdLCJuYW1lcyI6WyJjaGFsayIsInJlcXVpcmUiLCJwYXRoIiwiZnMiLCJ2YWxpZGF0ZU9wdGlvbnMiLCJ1bmlxIiwiaXNHbG9iIiwicmVjdXJzaXZlUmVhZFN5bmMiLCJwcmVmaXgiLCJwbGF0Zm9ybSIsImFwcCIsImdyZWVuIiwiZ2V0RmlsZUFuZENvbnRleHREZXBzIiwiY29tcGlsYXRpb24iLCJmaWxlcyIsImRpcnMiLCJjd2QiLCJmaWxlRGVwZW5kZW5jaWVzIiwiY29udGV4dERlcGVuZGVuY2llcyIsImlzV2VicGFjazQiLCJob29rcyIsImZkcyIsImNkcyIsImxlbmd0aCIsImZvckVhY2giLCJwYXR0ZXJuIiwiZiIsImdsb2IiLCJzeW5jIiwiZG90IiwiYWJzb2x1dGUiLCJjb25jYXQiLCJFeHRXZWJwYWNrUGx1Z2luIiwib3B0aW9ucyIsInByb2ZpbGUiLCJlbnZpcm9ubWVudCIsImRlZmF1bHRzIiwicHJvY2VzcyIsImNvbXBpbGVyIiwid2VicGFja1ZlcnNpb24iLCJ1bmRlZmluZWQiLCJwbHVnaW5QYXRoIiwicmVzb2x2ZSIsIl9fZGlybmFtZSIsInBsdWdpblBrZyIsImV4aXN0c1N5bmMiLCJKU09OIiwicGFyc2UiLCJyZWFkRmlsZVN5bmMiLCJwbHVnaW5WZXJzaW9uIiwidmVyc2lvbiIsImV4dFBhdGgiLCJleHRQa2ciLCJleHRWZXJzaW9uIiwic2VuY2hhIiwiY21kUGF0aCIsImNtZFBrZyIsImNtZFZlcnNpb24iLCJ2ZXJzaW9uX2Z1bGwiLCJzdGRvdXQiLCJjdXJzb3JUbyIsImNvbnNvbGUiLCJsb2ciLCJhZnRlckNvbXBpbGUiLCJ0YXAiLCJmaWxlIiwiYWRkIiwiY29udGV4dCIsInBsdWdpbiIsImNiIiwibWUiLCJlbWl0IiwidGFwQXN5bmMiLCJ3YXRjaGVkRmlsZXMiLCJlcnIiLCJlcnJubyIsImRvQnVpbGQiLCJsYXN0TWlsbGlzZWNvbmRzIiwic3RhdFN5bmMiLCJtdGltZU1zIiwiaW5kZXhPZiIsImxhc3RNaWxsaXNlY29uZHNBcHBKc29uIiwiRGF0ZSIsImdldFRpbWUiLCJjdXJyZW50TnVtRmlsZXMiLCJmaWxlc291cmNlIiwiYXNzZXRzIiwic291cmNlIiwic2l6ZSIsImxhc3ROdW1GaWxlcyIsImJ1aWxkQXN5bmMiLCJidWlsZE9wdGlvbnMiLCJwYXJtcyIsImV4ZWN1dGVBc3luYyIsInRoZW4iLCJmaWxlbGlzdCIsInJlZnJlc2giXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQUEsSUFBTUEsUUFBUUMsUUFBUSxPQUFSLENBQWQ7QUFDQSxJQUFNQyxPQUFPRCxRQUFRLE1BQVIsQ0FBYjtBQUNBLElBQU1FLEtBQUtGLFFBQVEsSUFBUixDQUFYO0FBQ0EsSUFBTUcsa0JBQWtCSCxRQUFRLGNBQVIsQ0FBeEI7QUFDQSxJQUFNSSxPQUFPSixRQUFRLGFBQVIsQ0FBYjtBQUNBLElBQU1LLFNBQVNMLFFBQVEsU0FBUixDQUFmO0FBQ0EsSUFBTU0sb0JBQW9CTixRQUFRLHdCQUFSLENBQTFCOztBQUVBLElBQUlPLFdBQUo7QUFDQSxJQUFJQyxXQUFXUixRQUFRLElBQVIsRUFBY1EsUUFBZCxFQUFmO0FBQ0EsSUFBSUEsWUFBWSxRQUFoQixFQUEwQjtBQUN4QkQ7QUFDRCxDQUZELE1BR0s7QUFDSEE7QUFDRDtBQUNELElBQUlFLE1BQU1WLE1BQU1XLEtBQU4sQ0FBWUgsTUFBWixJQUFzQix1QkFBaEM7O0FBRUEsU0FBU0kscUJBQVQsQ0FBK0JDLFdBQS9CLEVBQTRDQyxLQUE1QyxFQUFtREMsSUFBbkQsRUFBeURDLEdBQXpELEVBQThEO0FBQUEsTUFDcERDLGdCQURvRCxHQUNWSixXQURVLENBQ3BESSxnQkFEb0Q7QUFBQSxNQUNsQ0MsbUJBRGtDLEdBQ1ZMLFdBRFUsQ0FDbENLLG1CQURrQzs7QUFFNUQsTUFBTUMsYUFBYU4sWUFBWU8sS0FBL0I7QUFDQSxNQUFJQyxNQUFNRiwwQ0FBaUJGLGdCQUFqQixLQUFxQ0EsZ0JBQS9DO0FBQ0EsTUFBSUssTUFBTUgsMENBQWlCRCxtQkFBakIsS0FB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WSxFQUFaOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFHQTtBQUNBOztBQUlELFNBeEJEO0FBeUJEO0FBRUY7O0FBR0Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7Ozs7Ozs7O0FBV0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBR0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSTtBQUNBO0FBQ0E7O0FBRUo7OztBQU1ROztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7a0JBelVhaEUsZ0IiLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCBjaGFsayA9IHJlcXVpcmUoJ2NoYWxrJylcbmNvbnN0IHBhdGggPSByZXF1aXJlKCdwYXRoJylcbmNvbnN0IGZzID0gcmVxdWlyZSgnZnMnKVxuY29uc3QgdmFsaWRhdGVPcHRpb25zID0gcmVxdWlyZSgnc2NoZW1hLXV0aWxzJylcbmNvbnN0IHVuaXEgPSByZXF1aXJlKCdsb2Rhc2gudW5pcScpXG5jb25zdCBpc0dsb2IgPSByZXF1aXJlKCdpcy1nbG9iJylcbmNvbnN0IHJlY3Vyc2l2ZVJlYWRTeW5jID0gcmVxdWlyZSgncmVjdXJzaXZlLXJlYWRkaXItc3luYycpXG5cbnZhciBwcmVmaXggPSBgYFxudmFyIHBsYXRmb3JtID0gcmVxdWlyZSgnb3MnKS5wbGF0Zm9ybSgpXG5pZiAocGxhdGZvcm0gPT0gJ2RhcndpbicpIHtcbiAgcHJlZml4ID0gYOKEuSDvvaJleHTvvaM6YFxufVxuZWxzZSB7XG4gIHByZWZpeCA9IGBpIFtleHRdOmBcbn1cbnZhciBhcHAgPSBjaGFsay5ncmVlbihwcmVmaXgpICsgJyBleHQtd2VicGFjay1wbHVnaW46ICc7XG5cbmZ1bmN0aW9uIGdldEZpbGVBbmRDb250ZXh0RGVwcyhjb21waWxhdGlvbiwgZmlsZXMsIGRpcnMsIGN3ZCkge1xuICBjb25zdCB7IGZpbGVEZXBlbmRlbmNpZXMsIGNvbnRleHREZXBlbmRlbmNpZXMgfSA9IGNvbXBpbGF0aW9uO1xuICBjb25zdCBpc1dlYnBhY2s0ID0gY29tcGlsYXRpb24uaG9va3M7XG4gIGxldCBmZHMgPSBpc1dlYnBhY2s0ID8gWy4uLmZpbGVEZXBlbmRlbmNpZXNdIDogZmlsZURlcGVuZGVuY2llcztcbiAgbGV0IGNkcyA9IGlzV2VicGFjazQgPyBbLi4uY29udGV4dERlcGVuZGVuY2llc10gOiBjb250ZXh0RGVwZW5kZW5jaWVzO1xuICBcbiAgaWYgKGZpbGVzLmxlbmd0aCA+IDApIHtcbiAgICBmaWxlcy5mb3JFYWNoKChwYXR0ZXJuKSA9PiB7XG4gICAgICBsZXQgZiA9IHBhdHRlcm47XG4gICAgICBpZiAoaXNHbG9iKHBhdHRlcm4pKSB7XG4gICAgICAgIGYgPSBnbG9iLnN5bmMocGF0dGVybiwge1xuICAgICAgICAgIGN3ZCxcbiAgICAgICAgICBkb3Q6IHRydWUsXG4gICAgICAgICAgYWJzb2x1dGU6IHRydWUsXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgZmRzID0gZmRzLmNvbmNhdChmKTtcbiAgICB9KTtcbiAgICBmZHMgPSB1bmlxKGZkcyk7XG4gIH1cbiAgXG4gIGlmIChkaXJzLmxlbmd0aCA+IDApIHtcbiAgICBjZHMgPSB1bmlxKGNkcy5jb25jYXQoZGlycykpO1xuICB9XG4gIHJldHVybiB7XG4gICAgZmlsZURlcGVuZGVuY2llczogZmRzLFxuICAgIGNvbnRleHREZXBlbmRlbmNpZXM6IGNkcyxcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRXh0V2VicGFja1BsdWdpbiB7XG4gIC8vIHN0YXRpYyBkZWZhdWx0cyA9IHtcbiAgLy8gICBjd2Q6IHByb2Nlc3MuY3dkKCksXG4gIC8vICAgZmlsZXM6IFtdLFxuICAvLyAgIGRpcnM6IFsnLi9hcHAnXSxcbiAgLy8gfTtcblxuICBjb25zdHJ1Y3RvcihvcHRpb25zID0geyBwcm9maWxlOiAnZGVza3RvcCcsIGVudmlyb25tZW50OiAnZGV2ZWxvcG1lbnQnfSApIHtcbiAgICB2YWxpZGF0ZU9wdGlvbnMocmVxdWlyZSgnLi4vb3B0aW9ucy5qc29uJyksIG9wdGlvbnMsICdFeHRyYVdhdGNoV2VicGFja1BsdWdpbicpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lXG4gICAgLy90aGlzLm9wdGlvbnMgPSB7IC4uLkV4dFdlYnBhY2tQbHVnaW4uZGVmYXVsdHMsIC4uLm9wdGlvbnMgfTtcblxuICAgIHZhciBkZWZhdWx0cyA9IHtcbiAgICAgIGN3ZDogcHJvY2Vzcy5jd2QoKSxcbiAgICAgIGZpbGVzOiBbJy4vYXBwLmpzb24nXSxcbiAgICAgIGRpcnM6IFsnLi9hcHAnXSxcbiAgICB9XG5cbiAgICB0aGlzLm9wdGlvbnMgPSB7IC4uLmRlZmF1bHRzLCAuLi5vcHRpb25zIH07XG4gIH1cblxuICBhcHBseShjb21waWxlcikge1xuXG4gICAgaWYgKHRoaXMud2VicGFja1ZlcnNpb24gPT0gdW5kZWZpbmVkKSB7XG4gICAgICB2YXIgcGx1Z2luUGF0aCA9IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsJy4uJylcbiAgICAgIHZhciBwbHVnaW5Qa2cgPSAoZnMuZXhpc3RzU3luYyhwbHVnaW5QYXRoKycvcGFja2FnZS5qc29uJykgJiYgSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMocGx1Z2luUGF0aCsnL3BhY2thZ2UuanNvbicsICd1dGYtOCcpKSB8fCB7fSk7XG4gICAgICB2YXIgcGx1Z2luVmVyc2lvbiA9IHBsdWdpblBrZy52ZXJzaW9uXG4gIFxuICAgICAgdmFyIGV4dFBhdGggPSBwYXRoLnJlc29sdmUocGx1Z2luUGF0aCwnLi4vZXh0JylcbiAgICAgIHZhciBleHRQa2cgPSAoZnMuZXhpc3RzU3luYyhleHRQYXRoKycvcGFja2FnZS5qc29uJykgJiYgSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMoZXh0UGF0aCsnL3BhY2thZ2UuanNvbicsICd1dGYtOCcpKSB8fCB7fSk7XG4gICAgICB2YXIgZXh0VmVyc2lvbiA9IGV4dFBrZy5zZW5jaGEudmVyc2lvblxuXG4gICAgICB2YXIgY21kUGF0aCA9IHBhdGgucmVzb2x2ZShwbHVnaW5QYXRoLCcuLi9zZW5jaGEtY21kJylcbiAgICAgIHZhciBjbWRQa2cgPSAoZnMuZXhpc3RzU3luYyhjbWRQYXRoKycvcGFja2FnZS5qc29uJykgJiYgSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMoY21kUGF0aCsnL3BhY2thZ2UuanNvbicsICd1dGYtOCcpKSB8fCB7fSk7XG4gICAgICB2YXIgY21kVmVyc2lvbiA9IGNtZFBrZy52ZXJzaW9uX2Z1bGxcblxuICAgICAgY29uc3QgaXNXZWJwYWNrNCA9IGNvbXBpbGVyLmhvb2tzO1xuICAgICAgaWYgKGlzV2VicGFjazQpIHt0aGlzLndlYnBhY2tWZXJzaW9uID0gJ0lTIHdlYnBhY2sgNCd9XG4gICAgICBlbHNlIHt0aGlzLndlYnBhY2tWZXJzaW9uID0gJ05PVCB3ZWJwYWNrIDQnfVxuICAgICAgcHJvY2Vzcy5zdGRvdXQuY3Vyc29yVG8oMCk7Y29uc29sZS5sb2coYXBwICsgJ3YnICsgcGx1Z2luVmVyc2lvbiArICcsIEV4dCBKUyB2JyArIGV4dFZlcnNpb24gKyAnLCBTZW5jaGEgQ21kIHYnICsgY21kVmVyc2lvbiArICcsICcgKyB0aGlzLndlYnBhY2tWZXJzaW9uKVxuICAgIH1cblxuICAgIGxldCB7IGZpbGVzLCBkaXJzIH0gPSB0aGlzLm9wdGlvbnM7XG4gICAgY29uc3QgeyBjd2QgfSA9IHRoaXMub3B0aW9ucztcbiAgICBmaWxlcyA9IHR5cGVvZiBmaWxlcyA9PT0gJ3N0cmluZycgPyBbZmlsZXNdIDogZmlsZXM7XG4gICAgZGlycyA9IHR5cGVvZiBkaXJzID09PSAnc3RyaW5nJyA/IFtkaXJzXSA6IGRpcnM7XG5cbiAgICBpZiAoY29tcGlsZXIuaG9va3MpIHtcbiAgICAgIGNvbXBpbGVyLmhvb2tzLmFmdGVyQ29tcGlsZS50YXAoJ2V4dC1hZnRlci1jb21waWxlJywgKGNvbXBpbGF0aW9uKSA9PiB7XG4gICAgICAgIHByb2Nlc3Muc3Rkb3V0LmN1cnNvclRvKDApO2NvbnNvbGUubG9nKGFwcCArICdleHQtYWZ0ZXItY29tcGlsZScpXG4gICAgICAgIGNvbnN0IHtcbiAgICAgICAgICBmaWxlRGVwZW5kZW5jaWVzLFxuICAgICAgICAgIGNvbnRleHREZXBlbmRlbmNpZXMsXG4gICAgICAgIH0gPSBnZXRGaWxlQW5kQ29udGV4dERlcHMoY29tcGlsYXRpb24sIGZpbGVzLCBkaXJzLCBjd2QpO1xuICAgICAgICBpZiAoZmlsZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGZpbGVEZXBlbmRlbmNpZXMuZm9yRWFjaCgoZmlsZSkgPT4ge1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhgJHthcHB9JHtwYXRoLnJlc29sdmUoZmlsZSl9IGNoYW5nZWQgJHtmaWxlfWApXG4gICAgICAgICAgICBjb21waWxhdGlvbi5maWxlRGVwZW5kZW5jaWVzLmFkZChwYXRoLnJlc29sdmUoZmlsZSkpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkaXJzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBjb250ZXh0RGVwZW5kZW5jaWVzLmZvckVhY2goKGNvbnRleHQpID0+IHtcbiAgICAgICAgICAgIGNvbXBpbGF0aW9uLmNvbnRleHREZXBlbmRlbmNpZXMuYWRkKGNvbnRleHQpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29tcGlsZXIucGx1Z2luKCdhZnRlci1jb21waWxlJywgKGNvbXBpbGF0aW9uLCBjYikgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZyhhcHAgKyAnYWZ0ZXItY29tcGlsZScpXG4gICAgICAgIGNvbnN0IHtcbiAgICAgICAgICBmaWxlRGVwZW5kZW5jaWVzLFxuICAgICAgICAgIGNvbnRleHREZXBlbmRlbmNpZXMsXG4gICAgICAgIH0gPSBnZXRGaWxlQW5kQ29udGV4dERlcHMoY29tcGlsYXRpb24sIGZpbGVzLCBkaXJzLCBjd2QpO1xuICAgICAgICBpZiAoZmlsZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGNvbXBpbGF0aW9uLmZpbGVEZXBlbmRlbmNpZXMgPSBmaWxlRGVwZW5kZW5jaWVzOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lXG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRpcnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGNvbXBpbGF0aW9uLmNvbnRleHREZXBlbmRlbmNpZXMgPSBjb250ZXh0RGVwZW5kZW5jaWVzOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lXG4gICAgICAgIH1cbiAgICAgICAgY2IoKVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKGNvbXBpbGVyLmhvb2tzKSB7XG4gICAgICB2YXIgbWUgPSB0aGlzXG4gICAgICBjb21waWxlci5ob29rcy5lbWl0LnRhcEFzeW5jKCdleHQtZW1pdC1hc3luYycsIGZ1bmN0aW9uIChjb21waWxhdGlvbiwgY2IpIHtcbiAgICAgICAgcHJvY2Vzcy5zdGRvdXQuY3Vyc29yVG8oMCk7Y29uc29sZS5sb2coYXBwICsgJ2V4dC1lbWl0LWFzeW5jJylcblxuICAgICAgICB2YXIgd2F0Y2hlZEZpbGVzPVtdXG4gICAgICAgIHRyeSB7d2F0Y2hlZEZpbGVzID0gcmVjdXJzaXZlUmVhZFN5bmMoJy4vYXBwJyl9IFxuICAgICAgICBjYXRjaChlcnIpIHtpZihlcnIuZXJybm8gPT09IDM0KXtjb25zb2xlLmxvZygnUGF0aCBkb2VzIG5vdCBleGlzdCcpO30gZWxzZSB7dGhyb3cgZXJyO319XG5cbiAgICAgICAgdmFyIGRvQnVpbGQgPSBmYWxzZVxuICAgICAgICBmb3IgKHZhciBmaWxlIGluIHdhdGNoZWRGaWxlcykge1xuICAgICAgICAgIGlmIChtZS5sYXN0TWlsbGlzZWNvbmRzIDwgZnMuc3RhdFN5bmMod2F0Y2hlZEZpbGVzW2ZpbGVdKS5tdGltZU1zKSB7XG4gICAgICAgICAgICBpZiAod2F0Y2hlZEZpbGVzW2ZpbGVdLmluZGV4T2YoXCJzY3NzXCIpICE9IC0xKSB7ZG9CdWlsZD10cnVlO2JyZWFrO31cbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobWUubGFzdE1pbGxpc2Vjb25kc0FwcEpzb24gPCBmcy5zdGF0U3luYygnLi9hcHAuanNvbicpLm10aW1lTXMpIHtcbiAgICAgICAgICBkb0J1aWxkPXRydWU7XG4gICAgICAgIH1cblxuICAgICAgICBtZS5sYXN0TWlsbGlzZWNvbmRzID0gKG5ldyBEYXRlKS5nZXRUaW1lKClcbiAgICAgICAgbWUubGFzdE1pbGxpc2Vjb25kc0FwcEpzb24gPSAobmV3IERhdGUpLmdldFRpbWUoKVxuXG4gICAgICAgIHZhciBjdXJyZW50TnVtRmlsZXMgPSB3YXRjaGVkRmlsZXMubGVuZ3RoXG4gICAgICAgIHZhciBmaWxlc291cmNlID0gJ3RoaXMgZmlsZSBlbmFibGVzIGNsaWVudCByZWxvYWQnXG4gICAgICAgIGNvbXBpbGF0aW9uLmFzc2V0c1tjdXJyZW50TnVtRmlsZXMgKyAnRmlsZXNVbmRlckFwcEZvbGRlci5tZCddID0ge1xuICAgICAgICAgIHNvdXJjZTogZnVuY3Rpb24oKSB7cmV0dXJuIGZpbGVzb3VyY2V9LFxuICAgICAgICAgIHNpemU6IGZ1bmN0aW9uKCkge3JldHVybiBmaWxlc291cmNlLmxlbmd0aH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjdXJyZW50TnVtRmlsZXMgIT0gbWUubGFzdE51bUZpbGVzIHx8IGRvQnVpbGQpIHtcbiAgICAgICAgICBtZS5sYXN0TnVtRmlsZXMgPSBjdXJyZW50TnVtRmlsZXNcbiAgICAgICAgICB2YXIgYnVpbGRBc3luYyA9IHJlcXVpcmUoJ0BleHRqcy9leHQtYnVpbGQvYXBwL2J1aWxkQXN5bmMuanMnKVxuICAgICAgICAgIHZhciBidWlsZE9wdGlvbnMgPSB7cGFybXM6IFsnYXBwJywnYnVpbGQnLG1lLm9wdGlvbnMucHJvZmlsZSwgbWUub3B0aW9ucy5lbnZpcm9ubWVudF19XG4gICAgICAgICAgbmV3IGJ1aWxkQXN5bmMoYnVpbGRPcHRpb25zKS5leGVjdXRlQXN5bmMoKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY2IoKVxuICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgbWUubGFzdE51bUZpbGVzID0gY3VycmVudE51bUZpbGVzXG4gICAgICAgICAgY29uc29sZS5sb2coYXBwICsgJ2NhbGwgdG8gZXh0LWJ1aWxkIG5vdCBuZWVkZWQsIG5vIG5ldyBmaWxlcycpXG4gICAgICAgICAgY2IoKVxuICAgICAgICB9XG4gICAgICB9KVxuXG5cbi8vICAgICAgY29tcGlsZXIuaG9va3MuZW1pdC50YXAoJ2V4dC1lbWl0JywgKGNvbXBpbGF0aW9uKSA9PiB7XG4vLyAgICAgICAgcHJvY2Vzcy5zdGRvdXQuY3Vyc29yVG8oMCk7Y29uc29sZS5sb2coYXBwICsgJ2V4dC1lbWl0JylcblxuICAgICAgLy8gICB2YXIgd2F0Y2hlZEZpbGVzPVtdXG4gICAgICAvLyAgIHRyeSB7d2F0Y2hlZEZpbGVzID0gcmVjdXJzaXZlUmVhZFN5bmMoJy4vYXBwJyl9IFxuICAgICAgLy8gICBjYXRjaChlcnIpIHtpZihlcnIuZXJybm8gPT09IDM0KXtjb25zb2xlLmxvZygnUGF0aCBkb2VzIG5vdCBleGlzdCcpO30gZWxzZSB7dGhyb3cgZXJyO319XG5cbiAgICAgIC8vICAgdmFyIGRvQnVpbGQgPSBmYWxzZVxuICAgICAgLy8gICBmb3IgKHZhciBmaWxlIGluIHdhdGNoZWRGaWxlcykge1xuICAgICAgLy8gICAgIGlmICh0aGlzLmxhc3RNaWxsaXNlY29uZHMgPCBmcy5zdGF0U3luYyh3YXRjaGVkRmlsZXNbZmlsZV0pLm10aW1lTXMpIHtcbiAgICAgIC8vICAgICAgIGlmICh3YXRjaGVkRmlsZXNbZmlsZV0uaW5kZXhPZihcInNjc3NcIikgIT0gLTEpIHtkb0J1aWxkPXRydWU7YnJlYWs7fVxuICAgICAgLy8gICAgIH1cbiAgICAgIC8vICAgfVxuICAgICAgLy8gICB0aGlzLmxhc3RNaWxsaXNlY29uZHMgPSAobmV3IERhdGUpLmdldFRpbWUoKVxuXG4gICAgICAvLyAgIHZhciBjdXJyZW50TnVtRmlsZXMgPSB3YXRjaGVkRmlsZXMubGVuZ3RoXG4gICAgICAvLyAgIHZhciBmaWxlc291cmNlID0gJ3RoaXMgZmlsZSBlbmFibGVzIGNsaWVudCByZWxvYWQnXG4gICAgICAvLyAgIGNvbXBpbGF0aW9uLmFzc2V0c1tjdXJyZW50TnVtRmlsZXMgKyAnRmlsZXNVbmRlckFwcEZvbGRlci5tZCddID0ge1xuICAgICAgLy8gICAgIHNvdXJjZTogZnVuY3Rpb24oKSB7cmV0dXJuIGZpbGVzb3VyY2V9LFxuICAgICAgLy8gICAgIHNpemU6IGZ1bmN0aW9uKCkge3JldHVybiBmaWxlc291cmNlLmxlbmd0aH1cbiAgICAgIC8vICAgfVxuXG4gICAgICAvLyAgIGlmIChjdXJyZW50TnVtRmlsZXMgIT0gdGhpcy5sYXN0TnVtRmlsZXMgfHwgZG9CdWlsZCkge1xuICAgICAgLy8gICAgIHZhciBidWlsZCA9IHJlcXVpcmUoJ0BleHRqcy9leHQtYnVpbGQvYXBwL2J1aWxkLmpzJylcbiAgICAgIC8vICAgICBuZXcgYnVpbGQoe30pXG4gICAgICAvLyAgICAgLy92YXIgcmVmcmVzaCA9IHJlcXVpcmUoJ0BleHRqcy9zZW5jaGEtYnVpbGQvYXBwL3JlZnJlc2guanMnKVxuICAgICAgLy8gICAgIC8vbmV3IHJlZnJlc2goe30pXG4gICAgICAvLyAgIH1cbiAgICAgIC8vICAgZWxzZSB7XG4gICAgICAvLyAgICAgY29uc29sZS5sb2coYXBwICsgJ0NhbGwgdG8gU2VuY2hhIEJ1aWxkIG5vdCBuZWVkZWQsIG5vIG5ldyBmaWxlcycpXG4gICAgICAvLyAgIH1cbiAgICAgIC8vICAgdGhpcy5sYXN0TnVtRmlsZXMgPSBjdXJyZW50TnVtRmlsZXNcblxuLy8gICAgICB9KVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGNvbXBpbGVyLnBsdWdpbignZW1pdCcsIChjb21waWxhdGlvbiwgY2IpID0+IHtcbiAgICAgICAgY29uc29sZS5sb2coYXBwICsgJ2VtaXQnKVxuICAgICAgICB2YXIgZmlsZWxpc3QgPSAndGhpcyBmaWxlIGVuYWJsZXMgY2xpZW50IHJlbG9hZCdcbiAgICAgICAgY29tcGlsYXRpb24uYXNzZXRzWydGb3JSZWxvYWQubWQnXSA9IHtcbiAgICAgICAgICBzb3VyY2U6IGZ1bmN0aW9uKCkge3JldHVybiBmaWxlbGlzdH0sXG4gICAgICAgICAgc2l6ZTogZnVuY3Rpb24oKSB7cmV0dXJuIGZpbGVsaXN0Lmxlbmd0aH1cbiAgICAgICAgfVxuICAgICAgICB2YXIgcmVmcmVzaCA9IHJlcXVpcmUoJ0BleHRqcy9leHQtYnVpbGQvYXBwL3JlZnJlc2guanMnKVxuICAgICAgICBuZXcgcmVmcmVzaCh7fSlcblxuICAgICAgICAvLyBjb25zb2xlLmxvZygnVEhJUyBJUyBJVCcpXG4gICAgICAgIC8vIHZhciBidWlsZEFzeW5jID0gcmVxdWlyZSgnQGV4dGpzL2V4dC1idWlsZC9hcHAvYnVpbGRBc3luYy5qcycpXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGJ1aWxkQXN5bmMpXG4gICAgICAgIC8vIG5ldyBidWlsZEFzeW5jKCkuZXhlY3V0ZUFzeW5jKCkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gICBjb25zb2xlLmxvZygndGhlbiBjYWxsJyk7XG4gICAgICAgIC8vICAgY2IoKTtcbiAgICAgICAgLy8gfSlcblxuXG4gICAgICAgIC8vY2IoKVxuICAgICAgICAvL3RoaXMuZW1pdFN0YXRzLmJpbmQodGhpcylcblxuXG5cbiAgICAgIH0pXG4gICAgfVxuXG4gIH1cblxuXG4gIC8vIGVtaXRTdGF0cyhjdXJDb21waWxlciwgY2FsbGJhY2spIHtcbiAgLy8gICAvLyBHZXQgc3RhdHMuXG4gIC8vICAgLy8gKipOb3RlKio6IEluIGZ1dHVyZSwgY291bGQgcGFzcyBzb21ldGhpbmcgbGlrZSBgeyBzaG93QXNzZXRzOiB0cnVlIH1gXG4gIC8vICAgLy8gdG8gdGhlIGBnZXRTdGF0cygpYCBmdW5jdGlvbiBmb3IgbW9yZSBsaW1pdGVkIG9iamVjdCByZXR1cm5lZC5cbiAgLy8gICBsZXQgc3RhdHMgPSBjdXJDb21waWxlci5nZXRTdGF0cygpLnRvSnNvbigpO1xuICBcbiAgLy8gICAvLyBGaWx0ZXIgdG8gZmllbGRzLlxuICAvLyAgIGlmICh0aGlzLm9wdHMuZmllbGRzKSB7XG4gIC8vICAgICBzdGF0cyA9IHRoaXMub3B0cy5maWVsZHMucmVkdWNlKChtZW1vLCBrZXkpID0+IHtcbiAgLy8gICAgICAgbWVtb1trZXldID0gc3RhdHNba2V5XTtcbiAgLy8gICAgICAgcmV0dXJuIG1lbW87XG4gIC8vICAgICB9LCB7fSk7XG4gIC8vICAgfVxuICBcbiAgLy8gICAvLyBUcmFuc2Zvcm0gdG8gc3RyaW5nLlxuICAvLyAgIGxldCBlcnI7XG4gIC8vICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpXG4gIFxuICAvLyAgICAgLy8gVHJhbnNmb3JtLlxuICAvLyAgICAgLnRoZW4oKCkgPT4gdGhpcy5vcHRzLnRyYW5zZm9ybShzdGF0cywge1xuICAvLyAgICAgICBjb21waWxlcjogY3VyQ29tcGlsZXJcbiAgLy8gICAgIH0pKVxuICAvLyAgICAgLmNhdGNoKChlKSA9PiB7IGVyciA9IGU7IH0pXG4gIFxuICAvLyAgICAgLy8gRmluaXNoIHVwLlxuICAvLyAgICAgLnRoZW4oKHN0YXRzU3RyKSA9PiB7XG4gIC8vICAgICAgIC8vIEhhbmRsZSBlcnJvcnMuXG4gIC8vICAgICAgIGlmIChlcnIpIHtcbiAgLy8gICAgICAgICBjdXJDb21waWxlci5lcnJvcnMucHVzaChlcnIpO1xuICAvLyAgICAgICAgIGlmIChjYWxsYmFjaykgeyByZXR1cm4gdm9pZCBjYWxsYmFjayhlcnIpOyB9XG4gIC8vICAgICAgICAgdGhyb3cgZXJyO1xuICAvLyAgICAgICB9XG4gIFxuICAvLyAgICAgICAvLyBBZGQgdG8gYXNzZXRzLlxuICAvLyAgICAgICBjdXJDb21waWxlci5hc3NldHNbdGhpcy5vcHRzLmZpbGVuYW1lXSA9IHtcbiAgLy8gICAgICAgICBzb3VyY2UoKSB7XG4gIC8vICAgICAgICAgICByZXR1cm4gc3RhdHNTdHI7XG4gIC8vICAgICAgICAgfSxcbiAgLy8gICAgICAgICBzaXplKCkge1xuICAvLyAgICAgICAgICAgcmV0dXJuIHN0YXRzU3RyLmxlbmd0aDtcbiAgLy8gICAgICAgICB9XG4gIC8vICAgICAgIH07XG4gIFxuICAvLyAgICAgICBpZiAoY2FsbGJhY2spIHsgcmV0dXJuIHZvaWQgY2FsbGJhY2soKTsgfVxuICAvLyAgICAgfSk7XG4gIC8vIH1cbiAgXG5cblxufVxuXG5cblxuXG5cblxuICAvLyBpZiAoZmlsZXMubGVuZ3RoID4gMCkge1xuICAvLyAgIGZpbGVzLmZvckVhY2goKHBhdHRlcm4pID0+IHtcbiAgLy8gICAgIGxldCBmID0gcGF0dGVybjtcbiAgLy8gICAgIGlmIChpc0dsb2IocGF0dGVybikpIHtcbiAgLy8gICAgICAgZiA9IGdsb2Iuc3luYyhwYXR0ZXJuLCB7XG4gIC8vICAgICAgICAgY3dkLFxuICAvLyAgICAgICAgIGRvdDogdHJ1ZSxcbiAgLy8gICAgICAgICBhYnNvbHV0ZTogdHJ1ZSxcbiAgLy8gICAgICAgfSk7XG4gIC8vICAgICB9XG4gIC8vICAgICBmZHMgPSBmZHMuY29uY2F0KGYpO1xuICAvLyAgIH0pO1xuICAvLyAgIGZkcyA9IHVuaXEoZmRzKTtcbiAgLy8gfVxuXG5cbi8vIGZ1bmN0aW9uIGhvb2tfc3Rkb3V0KGNhbGxiYWNrKSB7XG4vLyAgIHZhciBvbGRfd3JpdGUgPSBwcm9jZXNzLnN0ZG91dC53cml0ZVxuLy8gICBjb25zb2xlLmxvZygnaW4gaG9vaycpXG4vLyAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlID0gKGZ1bmN0aW9uKHdyaXRlKSB7XG4vLyAgICAgICByZXR1cm4gZnVuY3Rpb24oc3RyaW5nLCBlbmNvZGluZywgZmQpIHtcbi8vICAgICAgICAgICB3cml0ZS5hcHBseShwcm9jZXNzLnN0ZG91dCwgYXJndW1lbnRzKVxuLy8gICAgICAgICAgIGNhbGxiYWNrKHN0cmluZywgZW5jb2RpbmcsIGZkKVxuLy8gICAgICAgfVxuLy8gICB9KShwcm9jZXNzLnN0ZG91dC53cml0ZSlcblxuLy8gICByZXR1cm4gZnVuY3Rpb24oKSB7XG4vLyAgICAgICBwcm9jZXNzLnN0ZG91dC53cml0ZSA9IG9sZF93cml0ZVxuLy8gICAgICAgY29uc29sZS5sb2coJ2luIHVuaG9vaycpXG4vLyAgICAgfVxuLy8gfVxuICAgIC8vIHRoaXMudW5ob29rID0gaG9va19zdGRvdXQoZnVuY3Rpb24oc3RyaW5nLCBlbmNvZGluZywgZmQpIHtcbiAgICAvLyAgIGNvbnNvbGUubG9nKCdzdGRvdXQ6ICcgKyBzdHJpbmcpXG4gICAgLy8gfSlcblxuLy8gICAgICAgIHRoaXMudW5ob29rKClcblxuXG5cblxuXG4gICAgICAgIC8vIHZhciBmaWxlbGlzdCA9ICdJbiB0aGlzIGJ1aWxkOlxcblxcbic7XG5cbiAgICAgICAgLy8gLy8gTG9vcCB0aHJvdWdoIGFsbCBjb21waWxlZCBhc3NldHMsXG4gICAgICAgIC8vIC8vIGFkZGluZyBhIG5ldyBsaW5lIGl0ZW0gZm9yIGVhY2ggZmlsZW5hbWUuXG4gICAgICAgIC8vIGZvciAodmFyIGZpbGVuYW1lIGluIGNvbXBpbGF0aW9uLmFzc2V0cykge1xuICAgICAgICAvLyAgIGZpbGVsaXN0ICs9ICgnLSAnKyBmaWxlbmFtZSArJ1xcbicpO1xuICAgICAgICAvLyB9XG4gICAgXG4gICAgICAgIC8vIC8vIEluc2VydCB0aGlzIGxpc3QgaW50byB0aGUgd2VicGFjayBidWlsZCBhcyBhIG5ldyBmaWxlIGFzc2V0OlxuICAgICAgICAvLyBjb21waWxhdGlvbi5hc3NldHNbJ2ZpbGVsaXN0Lm1kJ10gPSB7XG4gICAgICAgIC8vICAgc291cmNlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gICAgIHJldHVybiBmaWxlbGlzdDtcbiAgICAgICAgLy8gICB9LFxuICAgICAgICAvLyAgIHNpemU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyAgICAgcmV0dXJuIGZpbGVsaXN0Lmxlbmd0aDtcbiAgICAgICAgLy8gICB9XG4gICAgICAgIC8vIH07XG5cblxuXG5cblxuICAgICAgICAvLyAvL3ZhciBkID0gbmV3IERhdGUoKVxuICAgICAgICAvLyB2YXIgZCA9ICdtamcnXG4gICAgICAgIC8vIHZhciBmaWxlbGlzdCA9ICdJbiB0aGlzIGJ1aWxkOlxcblxcbicgKyBkICsgJ1xcblxcbic7XG4gICAgICAgIC8vIC8vIExvb3AgdGhyb3VnaCBhbGwgY29tcGlsZWQgYXNzZXRzLFxuICAgICAgICAvLyAvLyBhZGRpbmcgYSBuZXcgbGluZSBpdGVtIGZvciBlYWNoIGZpbGVuYW1lLlxuICAgICAgICAvLyBmb3IgKHZhciBmaWxlbmFtZSBpbiBjb21waWxhdGlvbi5hc3NldHMpIHtcbiAgICAgICAgLy8gICBmaWxlbGlzdCArPSAoJy0gJysgZmlsZW5hbWUgKydcXG4nKTtcbiAgICAgICAgLy8gfVxuICAgICAgICAvLyAvLyBJbnNlcnQgdGhpcyBsaXN0IGludG8gdGhlIHdlYnBhY2sgYnVpbGQgYXMgYSBuZXcgZmlsZSBhc3NldDpcbiAgICAgICAgLy8gY29tcGlsYXRpb24uYXNzZXRzW2QgKyAnLm1kJ10gPSB7XG4gICAgICAgIC8vICAgc291cmNlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gICAgIHJldHVybiBmaWxlbGlzdDtcbiAgICAgICAgLy8gICB9LFxuICAgICAgICAvLyAgIHNpemU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyAgICAgcmV0dXJuIGZpbGVsaXN0Lmxlbmd0aDtcbiAgICAgICAgLy8gICB9XG4gICAgICAgIC8vIH07Il19