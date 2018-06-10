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
            var buildAsync = require(npmScope + '/ext-build/app/buildAsync.js');
            var buildOptions = { parms: ['app', 'build', me.options.profile, me.options.environment] };
            new buildAsync(buildOptions).executeAsync().then(function () {
              cb();
            }, function (reason) {
              console.log('reject');
              compilation.errors.push(new Error('explain why the build failed'));
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
        //     var build = require(`${npmScope}/ext-build/app/build.js`)
        //     new build({})
        //     //var refresh = require(`${npmScope}/sencha-build/app/refresh.js`)
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9pbmRleC5qcyJdLCJuYW1lcyI6WyJucG1TY29wZSIsImNoYWxrIiwicmVxdWlyZSIsInBhdGgiLCJmcyIsInZhbGlkYXRlT3B0aW9ucyIsInVuaXEiLCJpc0dsb2IiLCJyZWN1cnNpdmVSZWFkU3luYyIsInByZWZpeCIsInBsYXRmb3JtIiwiYXBwIiwiZ3JlZW4iLCJnZXRGaWxlQW5kQ29udGV4dERlcHMiLCJjb21waWxhdGlvbiIsImZpbGVzIiwiZGlycyIsImN3ZCIsImZpbGVEZXBlbmRlbmNpZXMiLCJjb250ZXh0RGVwZW5kZW5jaWVzIiwiaXNXZWJwYWNrNCIsImhvb2tzIiwiZmRzIiwiY2RzIiwibGVuZ3RoIiwiZm9yRWFjaCIsInBhdHRlcm4iLCJmIiwiZ2xvYiIsInN5bmMiLCJkb3QiLCJhYnNvbHV0ZSIsImNvbmNhdCIsIkV4dFdlYnBhY2tQbHVnaW4iLCJvcHRpb25zIiwicHJvZmlsZSIsImVudmlyb25tZW50IiwiZGVmYXVsdHMiLCJwcm9jZXNzIiwiY29tcGlsZXIiLCJ3ZWJwYWNrVmVyc2lvbiIsInVuZGVmaW5lZCIsInBsdWdpblBhdGgiLCJyZXNvbHZlIiwiX19kaXJuYW1lIiwicGx1Z2luUGtnIiwiZXhpc3RzU3luYyIsIkpTT04iLCJwYXJzZSIsInJlYWRGaWxlU3luYyIsInBsdWdpblZlcnNpb24iLCJ2ZXJzaW9uIiwiZXh0UGF0aCIsImV4dFBrZyIsImV4dFZlcnNpb24iLCJzZW5jaGEiLCJjbWRQYXRoIiwiY21kUGtnIiwiY21kVmVyc2lvbiIsInZlcnNpb25fZnVsbCIsInN0ZG91dCIsImN1cnNvclRvIiwiY29uc29sZSIsImxvZyIsImFmdGVyQ29tcGlsZSIsInRhcCIsImZpbGUiLCJhZGQiLCJjb250ZXh0IiwicGx1Z2luIiwiY2IiLCJtZSIsImVtaXQiLCJ0YXBBc3luYyIsIndhdGNoZWRGaWxlcyIsImVyciIsImVycm5vIiwiZG9CdWlsZCIsImxhc3RNaWxsaXNlY29uZHMiLCJzdGF0U3luYyIsIm10aW1lTXMiLCJpbmRleE9mIiwibGFzdE1pbGxpc2Vjb25kc0FwcEpzb24iLCJEYXRlIiwiZ2V0VGltZSIsImN1cnJlbnROdW1GaWxlcyIsImZpbGVzb3VyY2UiLCJhc3NldHMiLCJzb3VyY2UiLCJzaXplIiwibGFzdE51bUZpbGVzIiwiYnVpbGRBc3luYyIsImJ1aWxkT3B0aW9ucyIsInBhcm1zIiwiZXhlY3V0ZUFzeW5jIiwidGhlbiIsInJlYXNvbiIsImVycm9ycyIsInB1c2giLCJFcnJvciIsImZpbGVsaXN0IiwicmVmcmVzaCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQSxJQUFNQSxXQUFXLFNBQWpCO0FBQ0EsSUFBTUMsUUFBUUMsUUFBUSxPQUFSLENBQWQ7QUFDQSxJQUFNQyxPQUFPRCxRQUFRLE1BQVIsQ0FBYjtBQUNBLElBQU1FLEtBQUtGLFFBQVEsSUFBUixDQUFYO0FBQ0EsSUFBTUcsa0JBQWtCSCxRQUFRLGNBQVIsQ0FBeEI7QUFDQSxJQUFNSSxPQUFPSixRQUFRLGFBQVIsQ0FBYjtBQUNBLElBQU1LLFNBQVNMLFFBQVEsU0FBUixDQUFmO0FBQ0EsSUFBTU0sb0JBQW9CTixRQUFRLHdCQUFSLENBQTFCOztBQUVBLElBQUlPLFdBQUo7QUFDQSxJQUFJQyxXQUFXUixRQUFRLElBQVIsRUFBY1EsUUFBZCxFQUFmO0FBQ0EsSUFBSUEsWUFBWSxRQUFoQixFQUEwQjtBQUN4QkQ7QUFDRCxDQUZELE1BR0s7QUFDSEE7QUFDRDtBQUNELElBQUlFLE1BQU1WLE1BQU1XLEtBQU4sQ0FBWUgsTUFBWixJQUFzQix1QkFBaEM7O0FBRUEsU0FBU0kscUJBQVQsQ0FBK0JDLFdBQS9CLEVBQTRDQyxLQUE1QyxFQUFtREMsSUFBbkQsRUFBeURDLEdBQXpELEVBQThEO0FBQUEsTUFDcERDLGdCQURvRCxHQUNWSixXQURVLENBQ3BESSxnQkFEb0Q7QUFBQSxNQUNsQ0MsbUJBRGtDLEdBQ1ZMLFdBRFUsQ0FDbENLLG1CQURrQzs7QUFFNUQsTUFBTUMsYUFBYU4sWUFBWU8sS0FBL0I7QUFDQSxNQUFJQyxNQUFNRiwwQ0FBaUJGLGdCQUFqQixLQUFxQ0EsZ0JBQS9DO0FBQ0EsTUFBSUssTUFBTUgsMENBQWlCRCxtQkFBakIsS0FBd0NBLG1CQUFsRDs7QUFFQSxNQUFJSixNQUFNUyxNQUFOLEdBQWUsQ0FBbkIsRUFBc0I7QUFDcEJULFVBQU1VLE9BQU4sQ0FBYyxVQUFDQyxPQUFELEVBQWE7QUFDekIsVUFBSUMsSUFBSUQsT0FBUjtBQUNBLFVBQUluQixPQUFPbUIsT0FBUCxDQUFKLEVBQXFCO0FBQ25CQyxZQUFJQyxLQUFLQyxJQUFMLENBQVVILE9BQVYsRUFBbUI7QUFDckJULGtCQURxQjtBQUVyQmEsZUFBSyxJQUZnQjtBQUdyQkMsb0JBQVU7QUFIVyxTQUFuQixDQUFKO0FBS0Q7QUFDRFQsWUFBTUEsSUFBSVUsTUFBSixDQUFXTCxDQUFYLENBQU47QUFDRCxLQVZEO0FBV0FMLFVBQU1oQixLQUFLZ0IsR0FBTCxDQUFOO0FBQ0Q7O0FBRUQsTUFBSU4sS0FBS1EsTUFBTCxHQUFjLENBQWxCLEVBQXFCO0FBQ25CRCxVQUFNakIsS0FBS2lCLElBQUlTLE1BQUosQ0FBV2hCLElBQVgsQ0FBTCxDQUFOO0FBQ0Q7QUFDRCxTQUFPO0FBQ0xFLHNCQUFrQkksR0FEYjtBQUVMSCx5QkFBcUJJO0FBRmhCLEdBQVA7QUFJRDs7SUFFb0JVLGdCO0FBQ25CO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsOEJBQXlFO0FBQUEsUUFBN0RDLE9BQTZELHVFQUFuRCxFQUFDQyxTQUFTLFNBQVYsRUFBcUJDLGFBQWEsYUFBbEMsRUFBbUQ7O0FBQUE7O0FBQ3ZFL0Isb0JBQWdCSCxRQUFRLGlCQUFSLENBQWhCLEVBQTRDZ0MsT0FBNUMsRUFBcUQseUJBQXJELEVBRHVFLENBQ1U7QUFDakY7O0FBRUEsUUFBSUcsV0FBVztBQUNicEIsV0FBS3FCLFFBQVFyQixHQUFSLEVBRFE7QUFFYkYsYUFBTyxDQUFDLFlBQUQsQ0FGTTtBQUdiQyxZQUFNLENBQUMsT0FBRDtBQUhPLEtBQWY7O0FBTUEsU0FBS2tCLE9BQUwsZ0JBQW9CRyxRQUFwQixFQUFpQ0gsT0FBakM7QUFDRDs7OzswQkFFS0ssUSxFQUFVOztBQUVkLFVBQUksS0FBS0MsY0FBTCxJQUF1QkMsU0FBM0IsRUFBc0M7QUFDcEMsWUFBSUMsYUFBYXZDLEtBQUt3QyxPQUFMLENBQWFDLFNBQWIsRUFBdUIsSUFBdkIsQ0FBakI7QUFDQSxZQUFJQyxZQUFhekMsR0FBRzBDLFVBQUgsQ0FBY0osYUFBVyxlQUF6QixLQUE2Q0ssS0FBS0MsS0FBTCxDQUFXNUMsR0FBRzZDLFlBQUgsQ0FBZ0JQLGFBQVcsZUFBM0IsRUFBNEMsT0FBNUMsQ0FBWCxDQUE3QyxJQUFpSCxFQUFsSTtBQUNBLFlBQUlRLGdCQUFnQkwsVUFBVU0sT0FBOUI7O0FBRUEsWUFBSUMsVUFBVWpELEtBQUt3QyxPQUFMLENBQWFELFVBQWIsRUFBd0IsUUFBeEIsQ0FBZDtBQUNBLFlBQUlXLFNBQVVqRCxHQUFHMEMsVUFBSCxDQUFjTSxVQUFRLGVBQXRCLEtBQTBDTCxLQUFLQyxLQUFMLENBQVc1QyxHQUFHNkMsWUFBSCxDQUFnQkcsVUFBUSxlQUF4QixFQUF5QyxPQUF6QyxDQUFYLENBQTFDLElBQTJHLEVBQXpIO0FBQ0EsWUFBSUUsYUFBYUQsT0FBT0UsTUFBUCxDQUFjSixPQUEvQjs7QUFFQSxZQUFJSyxVQUFVckQsS0FBS3dDLE9BQUwsQ0FBYUQsVUFBYixFQUF3QixlQUF4QixDQUFkO0FBQ0EsWUFBSWUsU0FBVXJELEdBQUcwQyxVQUFILENBQWNVLFVBQVEsZUFBdEIsS0FBMENULEtBQUtDLEtBQUwsQ0FBVzVDLEdBQUc2QyxZQUFILENBQWdCTyxVQUFRLGVBQXhCLEVBQXlDLE9BQXpDLENBQVgsQ0FBMUMsSUFBMkcsRUFBekg7QUFDQSxZQUFJRSxhQUFhRCxPQUFPRSxZQUF4Qjs7QUFFQSxZQUFNdkMsYUFBYW1CLFNBQVNsQixLQUE1QjtBQUNBLFlBQUlELFVBQUosRUFBZ0I7QUFBQyxlQUFLb0IsY0FBTCxHQUFzQixjQUF0QjtBQUFxQyxTQUF0RCxNQUNLO0FBQUMsZUFBS0EsY0FBTCxHQUFzQixlQUF0QjtBQUFzQztBQUM1Q0YsZ0JBQVFzQixNQUFSLENBQWVDLFFBQWYsQ0FBd0IsQ0FBeEIsRUFBMkJDLFFBQVFDLEdBQVIsQ0FBWXBELE1BQU0sR0FBTixHQUFZdUMsYUFBWixHQUE0QixZQUE1QixHQUEyQ0ksVUFBM0MsR0FBd0QsZ0JBQXhELEdBQTJFSSxVQUEzRSxHQUF3RixJQUF4RixHQUErRixLQUFLbEIsY0FBaEg7QUFDNUI7O0FBbkJhLHFCQXFCUSxLQUFLTixPQXJCYjtBQUFBLFVBcUJSbkIsS0FyQlEsWUFxQlJBLEtBckJRO0FBQUEsVUFxQkRDLElBckJDLFlBcUJEQSxJQXJCQztBQUFBLFVBc0JOQyxHQXRCTSxHQXNCRSxLQUFLaUIsT0F0QlAsQ0FzQk5qQixHQXRCTTs7QUF1QmRGLGNBQVEsT0FBT0EsS0FBUCxLQUFpQixRQUFqQixHQUE0QixDQUFDQSxLQUFELENBQTVCLEdBQXNDQSxLQUE5QztBQUNBQyxhQUFPLE9BQU9BLElBQVAsS0FBZ0IsUUFBaEIsR0FBMkIsQ0FBQ0EsSUFBRCxDQUEzQixHQUFvQ0EsSUFBM0M7O0FBRUEsVUFBSXVCLFNBQVNsQixLQUFiLEVBQW9CO0FBQ2xCa0IsaUJBQVNsQixLQUFULENBQWUyQyxZQUFmLENBQTRCQyxHQUE1QixDQUFnQyxtQkFBaEMsRUFBcUQsVUFBQ25ELFdBQUQsRUFBaUI7QUFDcEV3QixrQkFBUXNCLE1BQVIsQ0FBZUMsUUFBZixDQUF3QixDQUF4QixFQUEyQkMsUUFBUUMsR0FBUixDQUFZcEQsTUFBTSxtQkFBbEI7O0FBRHlDLHNDQUtoRUUsc0JBQXNCQyxXQUF0QixFQUFtQ0MsS0FBbkMsRUFBMENDLElBQTFDLEVBQWdEQyxHQUFoRCxDQUxnRTtBQUFBLGNBR2xFQyxnQkFIa0UseUJBR2xFQSxnQkFIa0U7QUFBQSxjQUlsRUMsbUJBSmtFLHlCQUlsRUEsbUJBSmtFOztBQU1wRSxjQUFJSixNQUFNUyxNQUFOLEdBQWUsQ0FBbkIsRUFBc0I7QUFDcEJOLDZCQUFpQk8sT0FBakIsQ0FBeUIsVUFBQ3lDLElBQUQsRUFBVTtBQUNqQztBQUNBcEQsMEJBQVlJLGdCQUFaLENBQTZCaUQsR0FBN0IsQ0FBaUNoRSxLQUFLd0MsT0FBTCxDQUFhdUIsSUFBYixDQUFqQztBQUNELGFBSEQ7QUFJRDtBQUNELGNBQUlsRCxLQUFLUSxNQUFMLEdBQWMsQ0FBbEIsRUFBcUI7QUFDbkJMLGdDQUFvQk0sT0FBcEIsQ0FBNEIsVUFBQzJDLE9BQUQsRUFBYTtBQUN2Q3RELDBCQUFZSyxtQkFBWixDQUFnQ2dELEdBQWhDLENBQW9DQyxPQUFwQztBQUNELGFBRkQ7QUFHRDtBQUNGLFNBakJEO0FBa0JELE9BbkJELE1BbUJPO0FBQ0w3QixpQkFBUzhCLE1BQVQsQ0FBZ0IsZUFBaEIsRUFBaUMsVUFBQ3ZELFdBQUQsRUFBY3dELEVBQWQsRUFBcUI7QUFDcERSLGtCQUFRQyxHQUFSLENBQVlwRCxNQUFNLGVBQWxCOztBQURvRCx1Q0FLaERFLHNCQUFzQkMsV0FBdEIsRUFBbUNDLEtBQW5DLEVBQTBDQyxJQUExQyxFQUFnREMsR0FBaEQsQ0FMZ0Q7QUFBQSxjQUdsREMsZ0JBSGtELDBCQUdsREEsZ0JBSGtEO0FBQUEsY0FJbERDLG1CQUprRCwwQkFJbERBLG1CQUprRDs7QUFNcEQsY0FBSUosTUFBTVMsTUFBTixHQUFlLENBQW5CLEVBQXNCO0FBQ3BCVix3QkFBWUksZ0JBQVosR0FBK0JBLGdCQUEvQixDQURvQixDQUM2QjtBQUNsRDtBQUNELGNBQUlGLEtBQUtRLE1BQUwsR0FBYyxDQUFsQixFQUFxQjtBQUNuQlYsd0JBQVlLLG1CQUFaLEdBQWtDQSxtQkFBbEMsQ0FEbUIsQ0FDb0M7QUFDeEQ7QUFDRG1EO0FBQ0QsU0FiRDtBQWNEOztBQUVELFVBQUkvQixTQUFTbEIsS0FBYixFQUFvQjtBQUNsQixZQUFJa0QsS0FBSyxJQUFUO0FBQ0FoQyxpQkFBU2xCLEtBQVQsQ0FBZW1ELElBQWYsQ0FBb0JDLFFBQXBCLENBQTZCLGdCQUE3QixFQUErQyxVQUFVM0QsV0FBVixFQUF1QndELEVBQXZCLEVBQTJCO0FBQ3hFaEMsa0JBQVFzQixNQUFSLENBQWVDLFFBQWYsQ0FBd0IsQ0FBeEIsRUFBMkJDLFFBQVFDLEdBQVIsQ0FBWXBELE1BQU0sZ0JBQWxCOztBQUUzQixjQUFJK0QsZUFBYSxFQUFqQjtBQUNBLGNBQUk7QUFBQ0EsMkJBQWVsRSxrQkFBa0IsT0FBbEIsQ0FBZjtBQUEwQyxXQUEvQyxDQUNBLE9BQU1tRSxHQUFOLEVBQVc7QUFBQyxnQkFBR0EsSUFBSUMsS0FBSixLQUFjLEVBQWpCLEVBQW9CO0FBQUNkLHNCQUFRQyxHQUFSLENBQVkscUJBQVo7QUFBb0MsYUFBekQsTUFBK0Q7QUFBQyxvQkFBTVksR0FBTjtBQUFXO0FBQUM7O0FBRXhGLGNBQUlFLFVBQVUsS0FBZDtBQUNBLGVBQUssSUFBSVgsSUFBVCxJQUFpQlEsWUFBakIsRUFBK0I7QUFDN0IsZ0JBQUlILEdBQUdPLGdCQUFILEdBQXNCMUUsR0FBRzJFLFFBQUgsQ0FBWUwsYUFBYVIsSUFBYixDQUFaLEVBQWdDYyxPQUExRCxFQUFtRTtBQUNqRSxrQkFBSU4sYUFBYVIsSUFBYixFQUFtQmUsT0FBbkIsQ0FBMkIsTUFBM0IsS0FBc0MsQ0FBQyxDQUEzQyxFQUE4QztBQUFDSiwwQkFBUSxJQUFSLENBQWE7QUFBTztBQUNwRTtBQUNGOztBQUVELGNBQUlOLEdBQUdXLHVCQUFILEdBQTZCOUUsR0FBRzJFLFFBQUgsQ0FBWSxZQUFaLEVBQTBCQyxPQUEzRCxFQUFvRTtBQUNsRUgsc0JBQVEsSUFBUjtBQUNEOztBQUVETixhQUFHTyxnQkFBSCxHQUF1QixJQUFJSyxJQUFKLEVBQUQsQ0FBV0MsT0FBWCxFQUF0QjtBQUNBYixhQUFHVyx1QkFBSCxHQUE4QixJQUFJQyxJQUFKLEVBQUQsQ0FBV0MsT0FBWCxFQUE3Qjs7QUFFQSxjQUFJQyxrQkFBa0JYLGFBQWFsRCxNQUFuQztBQUNBLGNBQUk4RCxhQUFhLGlDQUFqQjtBQUNBeEUsc0JBQVl5RSxNQUFaLENBQW1CRixrQkFBa0Isd0JBQXJDLElBQWlFO0FBQy9ERyxvQkFBUSxrQkFBVztBQUFDLHFCQUFPRixVQUFQO0FBQWtCLGFBRHlCO0FBRS9ERyxrQkFBTSxnQkFBVztBQUFDLHFCQUFPSCxXQUFXOUQsTUFBbEI7QUFBeUI7QUFGb0IsV0FBakU7O0FBS0EsY0FBSTZELG1CQUFtQmQsR0FBR21CLFlBQXRCLElBQXNDYixPQUExQyxFQUFtRDtBQUNqRE4sZUFBR21CLFlBQUgsR0FBa0JMLGVBQWxCO0FBQ0EsZ0JBQUlNLGFBQWF6RixRQUFXRixRQUFYLGtDQUFqQjtBQUNBLGdCQUFJNEYsZUFBZSxFQUFDQyxPQUFPLENBQUMsS0FBRCxFQUFPLE9BQVAsRUFBZXRCLEdBQUdyQyxPQUFILENBQVdDLE9BQTFCLEVBQW1Db0MsR0FBR3JDLE9BQUgsQ0FBV0UsV0FBOUMsQ0FBUixFQUFuQjtBQUNBLGdCQUFJdUQsVUFBSixDQUFlQyxZQUFmLEVBQTZCRSxZQUE3QixHQUE0Q0MsSUFBNUMsQ0FBaUQsWUFBVztBQUMxRHpCO0FBQ0QsYUFGRCxFQUVHLFVBQVMwQixNQUFULEVBQWdCO0FBQ2pCbEMsc0JBQVFDLEdBQVIsQ0FBWSxRQUFaO0FBQ0FqRCwwQkFBWW1GLE1BQVosQ0FBbUJDLElBQW5CLENBQXlCLElBQUlDLEtBQUosQ0FBVyw4QkFBWCxDQUF6QjtBQUNBN0I7QUFDRCxhQU5EO0FBT0QsV0FYRCxNQVlLO0FBQ0hDLGVBQUdtQixZQUFILEdBQWtCTCxlQUFsQjtBQUNBdkIsb0JBQVFDLEdBQVIsQ0FBWXBELE1BQU0sNENBQWxCO0FBQ0EyRDtBQUNEO0FBQ0YsU0E3Q0Q7O0FBZ0ROO0FBQ0E7O0FBRU07QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFTjtBQUNLLE9BcEZELE1BcUZLO0FBQ0gvQixpQkFBUzhCLE1BQVQsQ0FBZ0IsTUFBaEIsRUFBd0IsVUFBQ3ZELFdBQUQsRUFBY3dELEVBQWQsRUFBcUI7QUFDM0NSLGtCQUFRQyxHQUFSLENBQVlwRCxNQUFNLE1BQWxCO0FBQ0EsY0FBSXlGLFdBQVcsaUNBQWY7QUFDQXRGLHNCQUFZeUUsTUFBWixDQUFtQixjQUFuQixJQUFxQztBQUNuQ0Msb0JBQVEsa0JBQVc7QUFBQyxxQkFBT1ksUUFBUDtBQUFnQixhQUREO0FBRW5DWCxrQkFBTSxnQkFBVztBQUFDLHFCQUFPVyxTQUFTNUUsTUFBaEI7QUFBdUI7QUFGTixXQUFyQztBQUlBLGNBQUk2RSxVQUFVbkcsUUFBV0YsUUFBWCwrQkFBZDtBQUNBLGNBQUlxRyxPQUFKLENBQVksRUFBWjs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBR0E7QUFDQTs7QUFJRCxTQXhCRDtBQXlCRDtBQUVGOztBQUdEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOzs7Ozs7OztBQVdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQUdGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0k7QUFDQTtBQUNBOztBQUVKOzs7QUFNUTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O2tCQTdVYXBFLGdCIiwiZmlsZSI6ImluZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgbnBtU2NvcGUgPSAnQHNlbmNoYSdcbmNvbnN0IGNoYWxrID0gcmVxdWlyZSgnY2hhbGsnKVxuY29uc3QgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKVxuY29uc3QgZnMgPSByZXF1aXJlKCdmcycpXG5jb25zdCB2YWxpZGF0ZU9wdGlvbnMgPSByZXF1aXJlKCdzY2hlbWEtdXRpbHMnKVxuY29uc3QgdW5pcSA9IHJlcXVpcmUoJ2xvZGFzaC51bmlxJylcbmNvbnN0IGlzR2xvYiA9IHJlcXVpcmUoJ2lzLWdsb2InKVxuY29uc3QgcmVjdXJzaXZlUmVhZFN5bmMgPSByZXF1aXJlKCdyZWN1cnNpdmUtcmVhZGRpci1zeW5jJylcblxudmFyIHByZWZpeCA9IGBgXG52YXIgcGxhdGZvcm0gPSByZXF1aXJlKCdvcycpLnBsYXRmb3JtKClcbmlmIChwbGF0Zm9ybSA9PSAnZGFyd2luJykge1xuICBwcmVmaXggPSBg4oS5IO+9omV4dO+9ozpgXG59XG5lbHNlIHtcbiAgcHJlZml4ID0gYGkgW2V4dF06YFxufVxudmFyIGFwcCA9IGNoYWxrLmdyZWVuKHByZWZpeCkgKyAnIGV4dC13ZWJwYWNrLXBsdWdpbjogJztcblxuZnVuY3Rpb24gZ2V0RmlsZUFuZENvbnRleHREZXBzKGNvbXBpbGF0aW9uLCBmaWxlcywgZGlycywgY3dkKSB7XG4gIGNvbnN0IHsgZmlsZURlcGVuZGVuY2llcywgY29udGV4dERlcGVuZGVuY2llcyB9ID0gY29tcGlsYXRpb247XG4gIGNvbnN0IGlzV2VicGFjazQgPSBjb21waWxhdGlvbi5ob29rcztcbiAgbGV0IGZkcyA9IGlzV2VicGFjazQgPyBbLi4uZmlsZURlcGVuZGVuY2llc10gOiBmaWxlRGVwZW5kZW5jaWVzO1xuICBsZXQgY2RzID0gaXNXZWJwYWNrNCA/IFsuLi5jb250ZXh0RGVwZW5kZW5jaWVzXSA6IGNvbnRleHREZXBlbmRlbmNpZXM7XG4gIFxuICBpZiAoZmlsZXMubGVuZ3RoID4gMCkge1xuICAgIGZpbGVzLmZvckVhY2goKHBhdHRlcm4pID0+IHtcbiAgICAgIGxldCBmID0gcGF0dGVybjtcbiAgICAgIGlmIChpc0dsb2IocGF0dGVybikpIHtcbiAgICAgICAgZiA9IGdsb2Iuc3luYyhwYXR0ZXJuLCB7XG4gICAgICAgICAgY3dkLFxuICAgICAgICAgIGRvdDogdHJ1ZSxcbiAgICAgICAgICBhYnNvbHV0ZTogdHJ1ZSxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBmZHMgPSBmZHMuY29uY2F0KGYpO1xuICAgIH0pO1xuICAgIGZkcyA9IHVuaXEoZmRzKTtcbiAgfVxuICBcbiAgaWYgKGRpcnMubGVuZ3RoID4gMCkge1xuICAgIGNkcyA9IHVuaXEoY2RzLmNvbmNhdChkaXJzKSk7XG4gIH1cbiAgcmV0dXJuIHtcbiAgICBmaWxlRGVwZW5kZW5jaWVzOiBmZHMsXG4gICAgY29udGV4dERlcGVuZGVuY2llczogY2RzLFxuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBFeHRXZWJwYWNrUGx1Z2luIHtcbiAgLy8gc3RhdGljIGRlZmF1bHRzID0ge1xuICAvLyAgIGN3ZDogcHJvY2Vzcy5jd2QoKSxcbiAgLy8gICBmaWxlczogW10sXG4gIC8vICAgZGlyczogWycuL2FwcCddLFxuICAvLyB9O1xuXG4gIGNvbnN0cnVjdG9yKG9wdGlvbnMgPSB7cHJvZmlsZTogJ2Rlc2t0b3AnLCBlbnZpcm9ubWVudDogJ2RldmVsb3BtZW50J30gKSB7XG4gICAgdmFsaWRhdGVPcHRpb25zKHJlcXVpcmUoJy4uL29wdGlvbnMuanNvbicpLCBvcHRpb25zLCAnRXh0cmFXYXRjaFdlYnBhY2tQbHVnaW4nKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZVxuICAgIC8vdGhpcy5vcHRpb25zID0geyAuLi5FeHRXZWJwYWNrUGx1Z2luLmRlZmF1bHRzLCAuLi5vcHRpb25zIH07XG5cbiAgICB2YXIgZGVmYXVsdHMgPSB7XG4gICAgICBjd2Q6IHByb2Nlc3MuY3dkKCksXG4gICAgICBmaWxlczogWycuL2FwcC5qc29uJ10sXG4gICAgICBkaXJzOiBbJy4vYXBwJ10sXG4gICAgfVxuXG4gICAgdGhpcy5vcHRpb25zID0geyAuLi5kZWZhdWx0cywgLi4ub3B0aW9ucyB9O1xuICB9XG5cbiAgYXBwbHkoY29tcGlsZXIpIHtcblxuICAgIGlmICh0aGlzLndlYnBhY2tWZXJzaW9uID09IHVuZGVmaW5lZCkge1xuICAgICAgdmFyIHBsdWdpblBhdGggPSBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCcuLicpXG4gICAgICB2YXIgcGx1Z2luUGtnID0gKGZzLmV4aXN0c1N5bmMocGx1Z2luUGF0aCsnL3BhY2thZ2UuanNvbicpICYmIEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKHBsdWdpblBhdGgrJy9wYWNrYWdlLmpzb24nLCAndXRmLTgnKSkgfHwge30pO1xuICAgICAgdmFyIHBsdWdpblZlcnNpb24gPSBwbHVnaW5Qa2cudmVyc2lvblxuICBcbiAgICAgIHZhciBleHRQYXRoID0gcGF0aC5yZXNvbHZlKHBsdWdpblBhdGgsJy4uL2V4dCcpXG4gICAgICB2YXIgZXh0UGtnID0gKGZzLmV4aXN0c1N5bmMoZXh0UGF0aCsnL3BhY2thZ2UuanNvbicpICYmIEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKGV4dFBhdGgrJy9wYWNrYWdlLmpzb24nLCAndXRmLTgnKSkgfHwge30pO1xuICAgICAgdmFyIGV4dFZlcnNpb24gPSBleHRQa2cuc2VuY2hhLnZlcnNpb25cblxuICAgICAgdmFyIGNtZFBhdGggPSBwYXRoLnJlc29sdmUocGx1Z2luUGF0aCwnLi4vc2VuY2hhLWNtZCcpXG4gICAgICB2YXIgY21kUGtnID0gKGZzLmV4aXN0c1N5bmMoY21kUGF0aCsnL3BhY2thZ2UuanNvbicpICYmIEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKGNtZFBhdGgrJy9wYWNrYWdlLmpzb24nLCAndXRmLTgnKSkgfHwge30pO1xuICAgICAgdmFyIGNtZFZlcnNpb24gPSBjbWRQa2cudmVyc2lvbl9mdWxsXG5cbiAgICAgIGNvbnN0IGlzV2VicGFjazQgPSBjb21waWxlci5ob29rcztcbiAgICAgIGlmIChpc1dlYnBhY2s0KSB7dGhpcy53ZWJwYWNrVmVyc2lvbiA9ICdJUyB3ZWJwYWNrIDQnfVxuICAgICAgZWxzZSB7dGhpcy53ZWJwYWNrVmVyc2lvbiA9ICdOT1Qgd2VicGFjayA0J31cbiAgICAgIHByb2Nlc3Muc3Rkb3V0LmN1cnNvclRvKDApO2NvbnNvbGUubG9nKGFwcCArICd2JyArIHBsdWdpblZlcnNpb24gKyAnLCBFeHQgSlMgdicgKyBleHRWZXJzaW9uICsgJywgU2VuY2hhIENtZCB2JyArIGNtZFZlcnNpb24gKyAnLCAnICsgdGhpcy53ZWJwYWNrVmVyc2lvbilcbiAgICB9XG5cbiAgICBsZXQgeyBmaWxlcywgZGlycyB9ID0gdGhpcy5vcHRpb25zO1xuICAgIGNvbnN0IHsgY3dkIH0gPSB0aGlzLm9wdGlvbnM7XG4gICAgZmlsZXMgPSB0eXBlb2YgZmlsZXMgPT09ICdzdHJpbmcnID8gW2ZpbGVzXSA6IGZpbGVzO1xuICAgIGRpcnMgPSB0eXBlb2YgZGlycyA9PT0gJ3N0cmluZycgPyBbZGlyc10gOiBkaXJzO1xuXG4gICAgaWYgKGNvbXBpbGVyLmhvb2tzKSB7XG4gICAgICBjb21waWxlci5ob29rcy5hZnRlckNvbXBpbGUudGFwKCdleHQtYWZ0ZXItY29tcGlsZScsIChjb21waWxhdGlvbikgPT4ge1xuICAgICAgICBwcm9jZXNzLnN0ZG91dC5jdXJzb3JUbygwKTtjb25zb2xlLmxvZyhhcHAgKyAnZXh0LWFmdGVyLWNvbXBpbGUnKVxuICAgICAgICBjb25zdCB7XG4gICAgICAgICAgZmlsZURlcGVuZGVuY2llcyxcbiAgICAgICAgICBjb250ZXh0RGVwZW5kZW5jaWVzLFxuICAgICAgICB9ID0gZ2V0RmlsZUFuZENvbnRleHREZXBzKGNvbXBpbGF0aW9uLCBmaWxlcywgZGlycywgY3dkKTtcbiAgICAgICAgaWYgKGZpbGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBmaWxlRGVwZW5kZW5jaWVzLmZvckVhY2goKGZpbGUpID0+IHtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coYCR7YXBwfSR7cGF0aC5yZXNvbHZlKGZpbGUpfSBjaGFuZ2VkICR7ZmlsZX1gKVxuICAgICAgICAgICAgY29tcGlsYXRpb24uZmlsZURlcGVuZGVuY2llcy5hZGQocGF0aC5yZXNvbHZlKGZpbGUpKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGlycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgY29udGV4dERlcGVuZGVuY2llcy5mb3JFYWNoKChjb250ZXh0KSA9PiB7XG4gICAgICAgICAgICBjb21waWxhdGlvbi5jb250ZXh0RGVwZW5kZW5jaWVzLmFkZChjb250ZXh0KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbXBpbGVyLnBsdWdpbignYWZ0ZXItY29tcGlsZScsIChjb21waWxhdGlvbiwgY2IpID0+IHtcbiAgICAgICAgY29uc29sZS5sb2coYXBwICsgJ2FmdGVyLWNvbXBpbGUnKVxuICAgICAgICBjb25zdCB7XG4gICAgICAgICAgZmlsZURlcGVuZGVuY2llcyxcbiAgICAgICAgICBjb250ZXh0RGVwZW5kZW5jaWVzLFxuICAgICAgICB9ID0gZ2V0RmlsZUFuZENvbnRleHREZXBzKGNvbXBpbGF0aW9uLCBmaWxlcywgZGlycywgY3dkKTtcbiAgICAgICAgaWYgKGZpbGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBjb21waWxhdGlvbi5maWxlRGVwZW5kZW5jaWVzID0gZmlsZURlcGVuZGVuY2llczsgLy8gZXNsaW50LWRpc2FibGUtbGluZVxuICAgICAgICB9XG4gICAgICAgIGlmIChkaXJzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBjb21waWxhdGlvbi5jb250ZXh0RGVwZW5kZW5jaWVzID0gY29udGV4dERlcGVuZGVuY2llczsgLy8gZXNsaW50LWRpc2FibGUtbGluZVxuICAgICAgICB9XG4gICAgICAgIGNiKClcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmIChjb21waWxlci5ob29rcykge1xuICAgICAgdmFyIG1lID0gdGhpc1xuICAgICAgY29tcGlsZXIuaG9va3MuZW1pdC50YXBBc3luYygnZXh0LWVtaXQtYXN5bmMnLCBmdW5jdGlvbiAoY29tcGlsYXRpb24sIGNiKSB7XG4gICAgICAgIHByb2Nlc3Muc3Rkb3V0LmN1cnNvclRvKDApO2NvbnNvbGUubG9nKGFwcCArICdleHQtZW1pdC1hc3luYycpXG5cbiAgICAgICAgdmFyIHdhdGNoZWRGaWxlcz1bXVxuICAgICAgICB0cnkge3dhdGNoZWRGaWxlcyA9IHJlY3Vyc2l2ZVJlYWRTeW5jKCcuL2FwcCcpfSBcbiAgICAgICAgY2F0Y2goZXJyKSB7aWYoZXJyLmVycm5vID09PSAzNCl7Y29uc29sZS5sb2coJ1BhdGggZG9lcyBub3QgZXhpc3QnKTt9IGVsc2Uge3Rocm93IGVycjt9fVxuXG4gICAgICAgIHZhciBkb0J1aWxkID0gZmFsc2VcbiAgICAgICAgZm9yICh2YXIgZmlsZSBpbiB3YXRjaGVkRmlsZXMpIHtcbiAgICAgICAgICBpZiAobWUubGFzdE1pbGxpc2Vjb25kcyA8IGZzLnN0YXRTeW5jKHdhdGNoZWRGaWxlc1tmaWxlXSkubXRpbWVNcykge1xuICAgICAgICAgICAgaWYgKHdhdGNoZWRGaWxlc1tmaWxlXS5pbmRleE9mKFwic2Nzc1wiKSAhPSAtMSkge2RvQnVpbGQ9dHJ1ZTticmVhazt9XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG1lLmxhc3RNaWxsaXNlY29uZHNBcHBKc29uIDwgZnMuc3RhdFN5bmMoJy4vYXBwLmpzb24nKS5tdGltZU1zKSB7XG4gICAgICAgICAgZG9CdWlsZD10cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgbWUubGFzdE1pbGxpc2Vjb25kcyA9IChuZXcgRGF0ZSkuZ2V0VGltZSgpXG4gICAgICAgIG1lLmxhc3RNaWxsaXNlY29uZHNBcHBKc29uID0gKG5ldyBEYXRlKS5nZXRUaW1lKClcblxuICAgICAgICB2YXIgY3VycmVudE51bUZpbGVzID0gd2F0Y2hlZEZpbGVzLmxlbmd0aFxuICAgICAgICB2YXIgZmlsZXNvdXJjZSA9ICd0aGlzIGZpbGUgZW5hYmxlcyBjbGllbnQgcmVsb2FkJ1xuICAgICAgICBjb21waWxhdGlvbi5hc3NldHNbY3VycmVudE51bUZpbGVzICsgJ0ZpbGVzVW5kZXJBcHBGb2xkZXIubWQnXSA9IHtcbiAgICAgICAgICBzb3VyY2U6IGZ1bmN0aW9uKCkge3JldHVybiBmaWxlc291cmNlfSxcbiAgICAgICAgICBzaXplOiBmdW5jdGlvbigpIHtyZXR1cm4gZmlsZXNvdXJjZS5sZW5ndGh9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY3VycmVudE51bUZpbGVzICE9IG1lLmxhc3ROdW1GaWxlcyB8fCBkb0J1aWxkKSB7XG4gICAgICAgICAgbWUubGFzdE51bUZpbGVzID0gY3VycmVudE51bUZpbGVzXG4gICAgICAgICAgdmFyIGJ1aWxkQXN5bmMgPSByZXF1aXJlKGAke25wbVNjb3BlfS9leHQtYnVpbGQvYXBwL2J1aWxkQXN5bmMuanNgKVxuICAgICAgICAgIHZhciBidWlsZE9wdGlvbnMgPSB7cGFybXM6IFsnYXBwJywnYnVpbGQnLG1lLm9wdGlvbnMucHJvZmlsZSwgbWUub3B0aW9ucy5lbnZpcm9ubWVudF19XG4gICAgICAgICAgbmV3IGJ1aWxkQXN5bmMoYnVpbGRPcHRpb25zKS5leGVjdXRlQXN5bmMoKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY2IoKVxuICAgICAgICAgIH0sIGZ1bmN0aW9uKHJlYXNvbil7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygncmVqZWN0JylcbiAgICAgICAgICAgIGNvbXBpbGF0aW9uLmVycm9ycy5wdXNoKCBuZXcgRXJyb3IoICdleHBsYWluIHdoeSB0aGUgYnVpbGQgZmFpbGVkJyApIClcbiAgICAgICAgICAgIGNiKClcbiAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIG1lLmxhc3ROdW1GaWxlcyA9IGN1cnJlbnROdW1GaWxlc1xuICAgICAgICAgIGNvbnNvbGUubG9nKGFwcCArICdjYWxsIHRvIGV4dC1idWlsZCBub3QgbmVlZGVkLCBubyBuZXcgZmlsZXMnKVxuICAgICAgICAgIGNiKClcbiAgICAgICAgfVxuICAgICAgfSlcblxuXG4vLyAgICAgIGNvbXBpbGVyLmhvb2tzLmVtaXQudGFwKCdleHQtZW1pdCcsIChjb21waWxhdGlvbikgPT4ge1xuLy8gICAgICAgIHByb2Nlc3Muc3Rkb3V0LmN1cnNvclRvKDApO2NvbnNvbGUubG9nKGFwcCArICdleHQtZW1pdCcpXG5cbiAgICAgIC8vICAgdmFyIHdhdGNoZWRGaWxlcz1bXVxuICAgICAgLy8gICB0cnkge3dhdGNoZWRGaWxlcyA9IHJlY3Vyc2l2ZVJlYWRTeW5jKCcuL2FwcCcpfSBcbiAgICAgIC8vICAgY2F0Y2goZXJyKSB7aWYoZXJyLmVycm5vID09PSAzNCl7Y29uc29sZS5sb2coJ1BhdGggZG9lcyBub3QgZXhpc3QnKTt9IGVsc2Uge3Rocm93IGVycjt9fVxuXG4gICAgICAvLyAgIHZhciBkb0J1aWxkID0gZmFsc2VcbiAgICAgIC8vICAgZm9yICh2YXIgZmlsZSBpbiB3YXRjaGVkRmlsZXMpIHtcbiAgICAgIC8vICAgICBpZiAodGhpcy5sYXN0TWlsbGlzZWNvbmRzIDwgZnMuc3RhdFN5bmMod2F0Y2hlZEZpbGVzW2ZpbGVdKS5tdGltZU1zKSB7XG4gICAgICAvLyAgICAgICBpZiAod2F0Y2hlZEZpbGVzW2ZpbGVdLmluZGV4T2YoXCJzY3NzXCIpICE9IC0xKSB7ZG9CdWlsZD10cnVlO2JyZWFrO31cbiAgICAgIC8vICAgICB9XG4gICAgICAvLyAgIH1cbiAgICAgIC8vICAgdGhpcy5sYXN0TWlsbGlzZWNvbmRzID0gKG5ldyBEYXRlKS5nZXRUaW1lKClcblxuICAgICAgLy8gICB2YXIgY3VycmVudE51bUZpbGVzID0gd2F0Y2hlZEZpbGVzLmxlbmd0aFxuICAgICAgLy8gICB2YXIgZmlsZXNvdXJjZSA9ICd0aGlzIGZpbGUgZW5hYmxlcyBjbGllbnQgcmVsb2FkJ1xuICAgICAgLy8gICBjb21waWxhdGlvbi5hc3NldHNbY3VycmVudE51bUZpbGVzICsgJ0ZpbGVzVW5kZXJBcHBGb2xkZXIubWQnXSA9IHtcbiAgICAgIC8vICAgICBzb3VyY2U6IGZ1bmN0aW9uKCkge3JldHVybiBmaWxlc291cmNlfSxcbiAgICAgIC8vICAgICBzaXplOiBmdW5jdGlvbigpIHtyZXR1cm4gZmlsZXNvdXJjZS5sZW5ndGh9XG4gICAgICAvLyAgIH1cblxuICAgICAgLy8gICBpZiAoY3VycmVudE51bUZpbGVzICE9IHRoaXMubGFzdE51bUZpbGVzIHx8IGRvQnVpbGQpIHtcbiAgICAgIC8vICAgICB2YXIgYnVpbGQgPSByZXF1aXJlKGAke25wbVNjb3BlfS9leHQtYnVpbGQvYXBwL2J1aWxkLmpzYClcbiAgICAgIC8vICAgICBuZXcgYnVpbGQoe30pXG4gICAgICAvLyAgICAgLy92YXIgcmVmcmVzaCA9IHJlcXVpcmUoYCR7bnBtU2NvcGV9L3NlbmNoYS1idWlsZC9hcHAvcmVmcmVzaC5qc2ApXG4gICAgICAvLyAgICAgLy9uZXcgcmVmcmVzaCh7fSlcbiAgICAgIC8vICAgfVxuICAgICAgLy8gICBlbHNlIHtcbiAgICAgIC8vICAgICBjb25zb2xlLmxvZyhhcHAgKyAnQ2FsbCB0byBTZW5jaGEgQnVpbGQgbm90IG5lZWRlZCwgbm8gbmV3IGZpbGVzJylcbiAgICAgIC8vICAgfVxuICAgICAgLy8gICB0aGlzLmxhc3ROdW1GaWxlcyA9IGN1cnJlbnROdW1GaWxlc1xuXG4vLyAgICAgIH0pXG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgY29tcGlsZXIucGx1Z2luKCdlbWl0JywgKGNvbXBpbGF0aW9uLCBjYikgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZyhhcHAgKyAnZW1pdCcpXG4gICAgICAgIHZhciBmaWxlbGlzdCA9ICd0aGlzIGZpbGUgZW5hYmxlcyBjbGllbnQgcmVsb2FkJ1xuICAgICAgICBjb21waWxhdGlvbi5hc3NldHNbJ0ZvclJlbG9hZC5tZCddID0ge1xuICAgICAgICAgIHNvdXJjZTogZnVuY3Rpb24oKSB7cmV0dXJuIGZpbGVsaXN0fSxcbiAgICAgICAgICBzaXplOiBmdW5jdGlvbigpIHtyZXR1cm4gZmlsZWxpc3QubGVuZ3RofVxuICAgICAgICB9XG4gICAgICAgIHZhciByZWZyZXNoID0gcmVxdWlyZShgJHtucG1TY29wZX0vZXh0LWJ1aWxkL2FwcC9yZWZyZXNoLmpzYClcbiAgICAgICAgbmV3IHJlZnJlc2goe30pXG5cbiAgICAgICAgLy8gY29uc29sZS5sb2coJ1RISVMgSVMgSVQnKVxuICAgICAgICAvLyB2YXIgYnVpbGRBc3luYyA9IHJlcXVpcmUoYCR7bnBtU2NvcGV9L2V4dC1idWlsZC9hcHAvYnVpbGRBc3luYy5qc2ApXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGJ1aWxkQXN5bmMpXG4gICAgICAgIC8vIG5ldyBidWlsZEFzeW5jKCkuZXhlY3V0ZUFzeW5jKCkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gICBjb25zb2xlLmxvZygndGhlbiBjYWxsJyk7XG4gICAgICAgIC8vICAgY2IoKTtcbiAgICAgICAgLy8gfSlcblxuXG4gICAgICAgIC8vY2IoKVxuICAgICAgICAvL3RoaXMuZW1pdFN0YXRzLmJpbmQodGhpcylcblxuXG5cbiAgICAgIH0pXG4gICAgfVxuXG4gIH1cblxuXG4gIC8vIGVtaXRTdGF0cyhjdXJDb21waWxlciwgY2FsbGJhY2spIHtcbiAgLy8gICAvLyBHZXQgc3RhdHMuXG4gIC8vICAgLy8gKipOb3RlKio6IEluIGZ1dHVyZSwgY291bGQgcGFzcyBzb21ldGhpbmcgbGlrZSBgeyBzaG93QXNzZXRzOiB0cnVlIH1gXG4gIC8vICAgLy8gdG8gdGhlIGBnZXRTdGF0cygpYCBmdW5jdGlvbiBmb3IgbW9yZSBsaW1pdGVkIG9iamVjdCByZXR1cm5lZC5cbiAgLy8gICBsZXQgc3RhdHMgPSBjdXJDb21waWxlci5nZXRTdGF0cygpLnRvSnNvbigpO1xuICBcbiAgLy8gICAvLyBGaWx0ZXIgdG8gZmllbGRzLlxuICAvLyAgIGlmICh0aGlzLm9wdHMuZmllbGRzKSB7XG4gIC8vICAgICBzdGF0cyA9IHRoaXMub3B0cy5maWVsZHMucmVkdWNlKChtZW1vLCBrZXkpID0+IHtcbiAgLy8gICAgICAgbWVtb1trZXldID0gc3RhdHNba2V5XTtcbiAgLy8gICAgICAgcmV0dXJuIG1lbW87XG4gIC8vICAgICB9LCB7fSk7XG4gIC8vICAgfVxuICBcbiAgLy8gICAvLyBUcmFuc2Zvcm0gdG8gc3RyaW5nLlxuICAvLyAgIGxldCBlcnI7XG4gIC8vICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpXG4gIFxuICAvLyAgICAgLy8gVHJhbnNmb3JtLlxuICAvLyAgICAgLnRoZW4oKCkgPT4gdGhpcy5vcHRzLnRyYW5zZm9ybShzdGF0cywge1xuICAvLyAgICAgICBjb21waWxlcjogY3VyQ29tcGlsZXJcbiAgLy8gICAgIH0pKVxuICAvLyAgICAgLmNhdGNoKChlKSA9PiB7IGVyciA9IGU7IH0pXG4gIFxuICAvLyAgICAgLy8gRmluaXNoIHVwLlxuICAvLyAgICAgLnRoZW4oKHN0YXRzU3RyKSA9PiB7XG4gIC8vICAgICAgIC8vIEhhbmRsZSBlcnJvcnMuXG4gIC8vICAgICAgIGlmIChlcnIpIHtcbiAgLy8gICAgICAgICBjdXJDb21waWxlci5lcnJvcnMucHVzaChlcnIpO1xuICAvLyAgICAgICAgIGlmIChjYWxsYmFjaykgeyByZXR1cm4gdm9pZCBjYWxsYmFjayhlcnIpOyB9XG4gIC8vICAgICAgICAgdGhyb3cgZXJyO1xuICAvLyAgICAgICB9XG4gIFxuICAvLyAgICAgICAvLyBBZGQgdG8gYXNzZXRzLlxuICAvLyAgICAgICBjdXJDb21waWxlci5hc3NldHNbdGhpcy5vcHRzLmZpbGVuYW1lXSA9IHtcbiAgLy8gICAgICAgICBzb3VyY2UoKSB7XG4gIC8vICAgICAgICAgICByZXR1cm4gc3RhdHNTdHI7XG4gIC8vICAgICAgICAgfSxcbiAgLy8gICAgICAgICBzaXplKCkge1xuICAvLyAgICAgICAgICAgcmV0dXJuIHN0YXRzU3RyLmxlbmd0aDtcbiAgLy8gICAgICAgICB9XG4gIC8vICAgICAgIH07XG4gIFxuICAvLyAgICAgICBpZiAoY2FsbGJhY2spIHsgcmV0dXJuIHZvaWQgY2FsbGJhY2soKTsgfVxuICAvLyAgICAgfSk7XG4gIC8vIH1cbiAgXG5cblxufVxuXG5cblxuXG5cblxuICAvLyBpZiAoZmlsZXMubGVuZ3RoID4gMCkge1xuICAvLyAgIGZpbGVzLmZvckVhY2goKHBhdHRlcm4pID0+IHtcbiAgLy8gICAgIGxldCBmID0gcGF0dGVybjtcbiAgLy8gICAgIGlmIChpc0dsb2IocGF0dGVybikpIHtcbiAgLy8gICAgICAgZiA9IGdsb2Iuc3luYyhwYXR0ZXJuLCB7XG4gIC8vICAgICAgICAgY3dkLFxuICAvLyAgICAgICAgIGRvdDogdHJ1ZSxcbiAgLy8gICAgICAgICBhYnNvbHV0ZTogdHJ1ZSxcbiAgLy8gICAgICAgfSk7XG4gIC8vICAgICB9XG4gIC8vICAgICBmZHMgPSBmZHMuY29uY2F0KGYpO1xuICAvLyAgIH0pO1xuICAvLyAgIGZkcyA9IHVuaXEoZmRzKTtcbiAgLy8gfVxuXG5cbi8vIGZ1bmN0aW9uIGhvb2tfc3Rkb3V0KGNhbGxiYWNrKSB7XG4vLyAgIHZhciBvbGRfd3JpdGUgPSBwcm9jZXNzLnN0ZG91dC53cml0ZVxuLy8gICBjb25zb2xlLmxvZygnaW4gaG9vaycpXG4vLyAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlID0gKGZ1bmN0aW9uKHdyaXRlKSB7XG4vLyAgICAgICByZXR1cm4gZnVuY3Rpb24oc3RyaW5nLCBlbmNvZGluZywgZmQpIHtcbi8vICAgICAgICAgICB3cml0ZS5hcHBseShwcm9jZXNzLnN0ZG91dCwgYXJndW1lbnRzKVxuLy8gICAgICAgICAgIGNhbGxiYWNrKHN0cmluZywgZW5jb2RpbmcsIGZkKVxuLy8gICAgICAgfVxuLy8gICB9KShwcm9jZXNzLnN0ZG91dC53cml0ZSlcblxuLy8gICByZXR1cm4gZnVuY3Rpb24oKSB7XG4vLyAgICAgICBwcm9jZXNzLnN0ZG91dC53cml0ZSA9IG9sZF93cml0ZVxuLy8gICAgICAgY29uc29sZS5sb2coJ2luIHVuaG9vaycpXG4vLyAgICAgfVxuLy8gfVxuICAgIC8vIHRoaXMudW5ob29rID0gaG9va19zdGRvdXQoZnVuY3Rpb24oc3RyaW5nLCBlbmNvZGluZywgZmQpIHtcbiAgICAvLyAgIGNvbnNvbGUubG9nKCdzdGRvdXQ6ICcgKyBzdHJpbmcpXG4gICAgLy8gfSlcblxuLy8gICAgICAgIHRoaXMudW5ob29rKClcblxuXG5cblxuXG4gICAgICAgIC8vIHZhciBmaWxlbGlzdCA9ICdJbiB0aGlzIGJ1aWxkOlxcblxcbic7XG5cbiAgICAgICAgLy8gLy8gTG9vcCB0aHJvdWdoIGFsbCBjb21waWxlZCBhc3NldHMsXG4gICAgICAgIC8vIC8vIGFkZGluZyBhIG5ldyBsaW5lIGl0ZW0gZm9yIGVhY2ggZmlsZW5hbWUuXG4gICAgICAgIC8vIGZvciAodmFyIGZpbGVuYW1lIGluIGNvbXBpbGF0aW9uLmFzc2V0cykge1xuICAgICAgICAvLyAgIGZpbGVsaXN0ICs9ICgnLSAnKyBmaWxlbmFtZSArJ1xcbicpO1xuICAgICAgICAvLyB9XG4gICAgXG4gICAgICAgIC8vIC8vIEluc2VydCB0aGlzIGxpc3QgaW50byB0aGUgd2VicGFjayBidWlsZCBhcyBhIG5ldyBmaWxlIGFzc2V0OlxuICAgICAgICAvLyBjb21waWxhdGlvbi5hc3NldHNbJ2ZpbGVsaXN0Lm1kJ10gPSB7XG4gICAgICAgIC8vICAgc291cmNlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gICAgIHJldHVybiBmaWxlbGlzdDtcbiAgICAgICAgLy8gICB9LFxuICAgICAgICAvLyAgIHNpemU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyAgICAgcmV0dXJuIGZpbGVsaXN0Lmxlbmd0aDtcbiAgICAgICAgLy8gICB9XG4gICAgICAgIC8vIH07XG5cblxuXG5cblxuICAgICAgICAvLyAvL3ZhciBkID0gbmV3IERhdGUoKVxuICAgICAgICAvLyB2YXIgZCA9ICdtamcnXG4gICAgICAgIC8vIHZhciBmaWxlbGlzdCA9ICdJbiB0aGlzIGJ1aWxkOlxcblxcbicgKyBkICsgJ1xcblxcbic7XG4gICAgICAgIC8vIC8vIExvb3AgdGhyb3VnaCBhbGwgY29tcGlsZWQgYXNzZXRzLFxuICAgICAgICAvLyAvLyBhZGRpbmcgYSBuZXcgbGluZSBpdGVtIGZvciBlYWNoIGZpbGVuYW1lLlxuICAgICAgICAvLyBmb3IgKHZhciBmaWxlbmFtZSBpbiBjb21waWxhdGlvbi5hc3NldHMpIHtcbiAgICAgICAgLy8gICBmaWxlbGlzdCArPSAoJy0gJysgZmlsZW5hbWUgKydcXG4nKTtcbiAgICAgICAgLy8gfVxuICAgICAgICAvLyAvLyBJbnNlcnQgdGhpcyBsaXN0IGludG8gdGhlIHdlYnBhY2sgYnVpbGQgYXMgYSBuZXcgZmlsZSBhc3NldDpcbiAgICAgICAgLy8gY29tcGlsYXRpb24uYXNzZXRzW2QgKyAnLm1kJ10gPSB7XG4gICAgICAgIC8vICAgc291cmNlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gICAgIHJldHVybiBmaWxlbGlzdDtcbiAgICAgICAgLy8gICB9LFxuICAgICAgICAvLyAgIHNpemU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyAgICAgcmV0dXJuIGZpbGVsaXN0Lmxlbmd0aDtcbiAgICAgICAgLy8gICB9XG4gICAgICAgIC8vIH07Il19