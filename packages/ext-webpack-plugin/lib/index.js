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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9pbmRleC5qcyJdLCJuYW1lcyI6WyJucG1TY29wZSIsImNoYWxrIiwicmVxdWlyZSIsInBhdGgiLCJmcyIsInZhbGlkYXRlT3B0aW9ucyIsInVuaXEiLCJpc0dsb2IiLCJyZWN1cnNpdmVSZWFkU3luYyIsInByZWZpeCIsInBsYXRmb3JtIiwiYXBwIiwiZ3JlZW4iLCJnZXRGaWxlQW5kQ29udGV4dERlcHMiLCJjb21waWxhdGlvbiIsImZpbGVzIiwiZGlycyIsImN3ZCIsImZpbGVEZXBlbmRlbmNpZXMiLCJjb250ZXh0RGVwZW5kZW5jaWVzIiwiaXNXZWJwYWNrNCIsImhvb2tzIiwiZmRzIiwiY2RzIiwibGVuZ3RoIiwiZm9yRWFjaCIsInBhdHRlcm4iLCJmIiwiZ2xvYiIsInN5bmMiLCJkb3QiLCJhYnNvbHV0ZSIsImNvbmNhdCIsIkV4dFdlYnBhY2tQbHVnaW4iLCJvcHRpb25zIiwicHJvZmlsZSIsImVudmlyb25tZW50IiwiZGVmYXVsdHMiLCJwcm9jZXNzIiwiY29tcGlsZXIiLCJ3ZWJwYWNrVmVyc2lvbiIsInVuZGVmaW5lZCIsInBsdWdpblBhdGgiLCJyZXNvbHZlIiwiX19kaXJuYW1lIiwicGx1Z2luUGtnIiwiZXhpc3RzU3luYyIsIkpTT04iLCJwYXJzZSIsInJlYWRGaWxlU3luYyIsInBsdWdpblZlcnNpb24iLCJ2ZXJzaW9uIiwiZXh0UGF0aCIsImV4dFBrZyIsImV4dFZlcnNpb24iLCJzZW5jaGEiLCJjbWRQYXRoIiwiY21kUGtnIiwiY21kVmVyc2lvbiIsInZlcnNpb25fZnVsbCIsInN0ZG91dCIsImN1cnNvclRvIiwiY29uc29sZSIsImxvZyIsImFmdGVyQ29tcGlsZSIsInRhcCIsImZpbGUiLCJhZGQiLCJjb250ZXh0IiwicGx1Z2luIiwiY2IiLCJtZSIsImVtaXQiLCJ0YXBBc3luYyIsIndhdGNoZWRGaWxlcyIsImVyciIsImVycm5vIiwiZG9CdWlsZCIsImxhc3RNaWxsaXNlY29uZHMiLCJzdGF0U3luYyIsIm10aW1lTXMiLCJpbmRleE9mIiwibGFzdE1pbGxpc2Vjb25kc0FwcEpzb24iLCJEYXRlIiwiZ2V0VGltZSIsImN1cnJlbnROdW1GaWxlcyIsImZpbGVzb3VyY2UiLCJhc3NldHMiLCJzb3VyY2UiLCJzaXplIiwibGFzdE51bUZpbGVzIiwiYnVpbGRBc3luYyIsImJ1aWxkT3B0aW9ucyIsInBhcm1zIiwiZXhlY3V0ZUFzeW5jIiwidGhlbiIsInJlYXNvbiIsInByZWZpeEVyciIsInJlZCIsImVycm9yU3RyaW5nIiwiZXJyb3IiLCJlcnJvcnMiLCJwdXNoIiwiRXJyb3IiLCJmaWxlbGlzdCIsInJlZnJlc2giXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQUEsSUFBTUEsV0FBVyxTQUFqQjtBQUNBLElBQU1DLFFBQVFDLFFBQVEsT0FBUixDQUFkO0FBQ0EsSUFBTUMsT0FBT0QsUUFBUSxNQUFSLENBQWI7QUFDQSxJQUFNRSxLQUFLRixRQUFRLElBQVIsQ0FBWDtBQUNBLElBQU1HLGtCQUFrQkgsUUFBUSxjQUFSLENBQXhCO0FBQ0EsSUFBTUksT0FBT0osUUFBUSxhQUFSLENBQWI7QUFDQSxJQUFNSyxTQUFTTCxRQUFRLFNBQVIsQ0FBZjtBQUNBLElBQU1NLG9CQUFvQk4sUUFBUSx3QkFBUixDQUExQjs7QUFFQSxJQUFJTyxXQUFKO0FBQ0EsSUFBSUMsV0FBV1IsUUFBUSxJQUFSLEVBQWNRLFFBQWQsRUFBZjtBQUNBLElBQUlBLFlBQVksUUFBaEIsRUFBMEI7QUFDeEJEO0FBQ0QsQ0FGRCxNQUdLO0FBQ0hBO0FBQ0Q7QUFDRCxJQUFJRSxNQUFNVixNQUFNVyxLQUFOLENBQVlILE1BQVosSUFBc0IsdUJBQWhDOztBQUVBLFNBQVNJLHFCQUFULENBQStCQyxXQUEvQixFQUE0Q0MsS0FBNUMsRUFBbURDLElBQW5ELEVBQXlEQyxHQUF6RCxFQUE4RDtBQUFBLE1BQ3BEQyxnQkFEb0QsR0FDVkosV0FEVSxDQUNwREksZ0JBRG9EO0FBQUEsTUFDbENDLG1CQURrQyxHQUNWTCxXQURVLENBQ2xDSyxtQkFEa0M7O0FBRTVE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Ozs7QUFNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7a0JBL1VheEUsZ0IiLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCBucG1TY29wZSA9ICdAc2VuY2hhJ1xuY29uc3QgY2hhbGsgPSByZXF1aXJlKCdjaGFsaycpXG5jb25zdCBwYXRoID0gcmVxdWlyZSgncGF0aCcpXG5jb25zdCBmcyA9IHJlcXVpcmUoJ2ZzJylcbmNvbnN0IHZhbGlkYXRlT3B0aW9ucyA9IHJlcXVpcmUoJ3NjaGVtYS11dGlscycpXG5jb25zdCB1bmlxID0gcmVxdWlyZSgnbG9kYXNoLnVuaXEnKVxuY29uc3QgaXNHbG9iID0gcmVxdWlyZSgnaXMtZ2xvYicpXG5jb25zdCByZWN1cnNpdmVSZWFkU3luYyA9IHJlcXVpcmUoJ3JlY3Vyc2l2ZS1yZWFkZGlyLXN5bmMnKVxuXG52YXIgcHJlZml4ID0gYGBcbnZhciBwbGF0Zm9ybSA9IHJlcXVpcmUoJ29zJykucGxhdGZvcm0oKVxuaWYgKHBsYXRmb3JtID09ICdkYXJ3aW4nKSB7XG4gIHByZWZpeCA9IGDihLkg772iZXh0772jOmBcbn1cbmVsc2Uge1xuICBwcmVmaXggPSBgaSBbZXh0XTpgXG59XG52YXIgYXBwID0gY2hhbGsuZ3JlZW4ocHJlZml4KSArICcgZXh0LXdlYnBhY2stcGx1Z2luOiAnO1xuXG5mdW5jdGlvbiBnZXRGaWxlQW5kQ29udGV4dERlcHMoY29tcGlsYXRpb24sIGZpbGVzLCBkaXJzLCBjd2QpIHtcbiAgY29uc3QgeyBmaWxlRGVwZW5kZW5jaWVzLCBjb250ZXh0RGVwZW5kZW5jaWVzIH0gPSBjb21waWxhdGlvbjtcbiAgY29uc3QgaXNXZWJwYWNrNCA9IGNvbXBpbGF0aW9uLmhvb2tzO1xuICBsZXQgZmRzID0gaXNXZWJwYWNrNCA/IFsuLi5maWxlRGVwZW5kZW5jaWVzXSA6IGZpbGVEZXBlbmRlbmNpZXM7XG4gIGxldCBjZHMgPSBpc1dlYnBhY2s0ID8gWy4uLmNvbnRleHREZXBlbmRlbmNpZXNdIDogY29udGV4dERlcGVuZGVuY2llcztcbiAgXG4gIGlmIChmaWxlcy5sZW5ndGggPiAwKSB7XG4gICAgZmlsZXMuZm9yRWFjaCgocGF0dGVybikgPT4ge1xuICAgICAgbGV0IGYgPSBwYXR0ZXJuO1xuICAgICAgaWYgKGlzR2xvYihwYXR0ZXJuKSkge1xuICAgICAgICBmID0gZ2xvYi5zeW5jKHBhdHRlcm4sIHtcbiAgICAgICAgICBjd2QsXG4gICAgICAgICAgZG90OiB0cnVlLFxuICAgICAgICAgIGFic29sdXRlOiB0cnVlLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGZkcyA9IGZkcy5jb25jYXQoZik7XG4gICAgfSk7XG4gICAgZmRzID0gdW5pcShmZHMpO1xuICB9XG4gIFxuICBpZiAoZGlycy5sZW5ndGggPiAwKSB7XG4gICAgY2RzID0gdW5pcShjZHMuY29uY2F0KGRpcnMpKTtcbiAgfVxuICByZXR1cm4ge1xuICAgIGZpbGVEZXBlbmRlbmNpZXM6IGZkcyxcbiAgICBjb250ZXh0RGVwZW5kZW5jaWVzOiBjZHMsXG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEV4dFdlYnBhY2tQbHVnaW4ge1xuICAvLyBzdGF0aWMgZGVmYXVsdHMgPSB7XG4gIC8vICAgY3dkOiBwcm9jZXNzLmN3ZCgpLFxuICAvLyAgIGZpbGVzOiBbXSxcbiAgLy8gICBkaXJzOiBbJy4vYXBwJ10sXG4gIC8vIH07XG5cbiAgY29uc3RydWN0b3Iob3B0aW9ucyA9IHtwcm9maWxlOiAnZGVza3RvcCcsIGVudmlyb25tZW50OiAnZGV2ZWxvcG1lbnQnfSApIHtcbiAgICB2YWxpZGF0ZU9wdGlvbnMocmVxdWlyZSgnLi4vb3B0aW9ucy5qc29uJyksIG9wdGlvbnMsICdFeHRyYVdhdGNoV2VicGFja1BsdWdpbicpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lXG4gICAgLy90aGlzLm9wdGlvbnMgPSB7IC4uLkV4dFdlYnBhY2tQbHVnaW4uZGVmYXVsdHMsIC4uLm9wdGlvbnMgfTtcblxuICAgIHZhciBkZWZhdWx0cyA9IHtcbiAgICAgIGN3ZDogcHJvY2Vzcy5jd2QoKSxcbiAgICAgIGZpbGVzOiBbJy4vYXBwLmpzb24nXSxcbiAgICAgIGRpcnM6IFsnLi9hcHAnXSxcbiAgICB9XG5cbiAgICB0aGlzLm9wdGlvbnMgPSB7IC4uLmRlZmF1bHRzLCAuLi5vcHRpb25zIH07XG4gIH1cblxuICBhcHBseShjb21waWxlcikge1xuXG4gICAgaWYgKHRoaXMud2VicGFja1ZlcnNpb24gPT0gdW5kZWZpbmVkKSB7XG4gICAgICB2YXIgcGx1Z2luUGF0aCA9IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsJy4uJylcbiAgICAgIHZhciBwbHVnaW5Qa2cgPSAoZnMuZXhpc3RzU3luYyhwbHVnaW5QYXRoKycvcGFja2FnZS5qc29uJykgJiYgSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMocGx1Z2luUGF0aCsnL3BhY2thZ2UuanNvbicsICd1dGYtOCcpKSB8fCB7fSk7XG4gICAgICB2YXIgcGx1Z2luVmVyc2lvbiA9IHBsdWdpblBrZy52ZXJzaW9uXG4gIFxuICAgICAgdmFyIGV4dFBhdGggPSBwYXRoLnJlc29sdmUocGx1Z2luUGF0aCwnLi4vZXh0JylcbiAgICAgIHZhciBleHRQa2cgPSAoZnMuZXhpc3RzU3luYyhleHRQYXRoKycvcGFja2FnZS5qc29uJykgJiYgSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMoZXh0UGF0aCsnL3BhY2thZ2UuanNvbicsICd1dGYtOCcpKSB8fCB7fSk7XG4gICAgICB2YXIgZXh0VmVyc2lvbiA9IGV4dFBrZy5zZW5jaGEudmVyc2lvblxuXG4gICAgICB2YXIgY21kUGF0aCA9IHBhdGgucmVzb2x2ZShwbHVnaW5QYXRoLCcuLi9zZW5jaGEtY21kJylcbiAgICAgIHZhciBjbWRQa2cgPSAoZnMuZXhpc3RzU3luYyhjbWRQYXRoKycvcGFja2FnZS5qc29uJykgJiYgSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMoY21kUGF0aCsnL3BhY2thZ2UuanNvbicsICd1dGYtOCcpKSB8fCB7fSk7XG4gICAgICB2YXIgY21kVmVyc2lvbiA9IGNtZFBrZy52ZXJzaW9uX2Z1bGxcblxuICAgICAgY29uc3QgaXNXZWJwYWNrNCA9IGNvbXBpbGVyLmhvb2tzO1xuICAgICAgaWYgKGlzV2VicGFjazQpIHt0aGlzLndlYnBhY2tWZXJzaW9uID0gJ0lTIHdlYnBhY2sgNCd9XG4gICAgICBlbHNlIHt0aGlzLndlYnBhY2tWZXJzaW9uID0gJ05PVCB3ZWJwYWNrIDQnfVxuICAgICAgcHJvY2Vzcy5zdGRvdXQuY3Vyc29yVG8oMCk7Y29uc29sZS5sb2coYXBwICsgJ3YnICsgcGx1Z2luVmVyc2lvbiArICcsIEV4dCBKUyB2JyArIGV4dFZlcnNpb24gKyAnLCBTZW5jaGEgQ21kIHYnICsgY21kVmVyc2lvbiArICcsICcgKyB0aGlzLndlYnBhY2tWZXJzaW9uKVxuICAgIH1cblxuICAgIGxldCB7IGZpbGVzLCBkaXJzIH0gPSB0aGlzLm9wdGlvbnM7XG4gICAgY29uc3QgeyBjd2QgfSA9IHRoaXMub3B0aW9ucztcbiAgICBmaWxlcyA9IHR5cGVvZiBmaWxlcyA9PT0gJ3N0cmluZycgPyBbZmlsZXNdIDogZmlsZXM7XG4gICAgZGlycyA9IHR5cGVvZiBkaXJzID09PSAnc3RyaW5nJyA/IFtkaXJzXSA6IGRpcnM7XG5cbiAgICBpZiAoY29tcGlsZXIuaG9va3MpIHtcbiAgICAgIGNvbXBpbGVyLmhvb2tzLmFmdGVyQ29tcGlsZS50YXAoJ2V4dC1hZnRlci1jb21waWxlJywgKGNvbXBpbGF0aW9uKSA9PiB7XG4gICAgICAgIHByb2Nlc3Muc3Rkb3V0LmN1cnNvclRvKDApO2NvbnNvbGUubG9nKGFwcCArICdleHQtYWZ0ZXItY29tcGlsZScpXG4gICAgICAgIGNvbnN0IHtcbiAgICAgICAgICBmaWxlRGVwZW5kZW5jaWVzLFxuICAgICAgICAgIGNvbnRleHREZXBlbmRlbmNpZXMsXG4gICAgICAgIH0gPSBnZXRGaWxlQW5kQ29udGV4dERlcHMoY29tcGlsYXRpb24sIGZpbGVzLCBkaXJzLCBjd2QpO1xuICAgICAgICBpZiAoZmlsZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGZpbGVEZXBlbmRlbmNpZXMuZm9yRWFjaCgoZmlsZSkgPT4ge1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhgJHthcHB9JHtwYXRoLnJlc29sdmUoZmlsZSl9IGNoYW5nZWQgJHtmaWxlfWApXG4gICAgICAgICAgICBjb21waWxhdGlvbi5maWxlRGVwZW5kZW5jaWVzLmFkZChwYXRoLnJlc29sdmUoZmlsZSkpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkaXJzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBjb250ZXh0RGVwZW5kZW5jaWVzLmZvckVhY2goKGNvbnRleHQpID0+IHtcbiAgICAgICAgICAgIGNvbXBpbGF0aW9uLmNvbnRleHREZXBlbmRlbmNpZXMuYWRkKGNvbnRleHQpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29tcGlsZXIucGx1Z2luKCdhZnRlci1jb21waWxlJywgKGNvbXBpbGF0aW9uLCBjYikgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZyhhcHAgKyAnYWZ0ZXItY29tcGlsZScpXG4gICAgICAgIGNvbnN0IHtcbiAgICAgICAgICBmaWxlRGVwZW5kZW5jaWVzLFxuICAgICAgICAgIGNvbnRleHREZXBlbmRlbmNpZXMsXG4gICAgICAgIH0gPSBnZXRGaWxlQW5kQ29udGV4dERlcHMoY29tcGlsYXRpb24sIGZpbGVzLCBkaXJzLCBjd2QpO1xuICAgICAgICBpZiAoZmlsZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGNvbXBpbGF0aW9uLmZpbGVEZXBlbmRlbmNpZXMgPSBmaWxlRGVwZW5kZW5jaWVzOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lXG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRpcnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGNvbXBpbGF0aW9uLmNvbnRleHREZXBlbmRlbmNpZXMgPSBjb250ZXh0RGVwZW5kZW5jaWVzOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lXG4gICAgICAgIH1cbiAgICAgICAgY2IoKVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKGNvbXBpbGVyLmhvb2tzKSB7XG4gICAgICB2YXIgbWUgPSB0aGlzXG4gICAgICBjb21waWxlci5ob29rcy5lbWl0LnRhcEFzeW5jKCdleHQtZW1pdC1hc3luYycsIGZ1bmN0aW9uIChjb21waWxhdGlvbiwgY2IpIHtcbiAgICAgICAgcHJvY2Vzcy5zdGRvdXQuY3Vyc29yVG8oMCk7Y29uc29sZS5sb2coYXBwICsgJ2V4dC1lbWl0LWFzeW5jJylcblxuICAgICAgICB2YXIgd2F0Y2hlZEZpbGVzPVtdXG4gICAgICAgIHRyeSB7d2F0Y2hlZEZpbGVzID0gcmVjdXJzaXZlUmVhZFN5bmMoJy4vYXBwJyl9IFxuICAgICAgICBjYXRjaChlcnIpIHtpZihlcnIuZXJybm8gPT09IDM0KXtjb25zb2xlLmxvZygnUGF0aCBkb2VzIG5vdCBleGlzdCcpO30gZWxzZSB7dGhyb3cgZXJyO319XG5cbiAgICAgICAgdmFyIGRvQnVpbGQgPSBmYWxzZVxuICAgICAgICBmb3IgKHZhciBmaWxlIGluIHdhdGNoZWRGaWxlcykge1xuICAgICAgICAgIGlmIChtZS5sYXN0TWlsbGlzZWNvbmRzIDwgZnMuc3RhdFN5bmMod2F0Y2hlZEZpbGVzW2ZpbGVdKS5tdGltZU1zKSB7XG4gICAgICAgICAgICBpZiAod2F0Y2hlZEZpbGVzW2ZpbGVdLmluZGV4T2YoXCJzY3NzXCIpICE9IC0xKSB7ZG9CdWlsZD10cnVlO2JyZWFrO31cbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobWUubGFzdE1pbGxpc2Vjb25kc0FwcEpzb24gPCBmcy5zdGF0U3luYygnLi9hcHAuanNvbicpLm10aW1lTXMpIHtcbiAgICAgICAgICBkb0J1aWxkPXRydWU7XG4gICAgICAgIH1cblxuICAgICAgICBtZS5sYXN0TWlsbGlzZWNvbmRzID0gKG5ldyBEYXRlKS5nZXRUaW1lKClcbiAgICAgICAgbWUubGFzdE1pbGxpc2Vjb25kc0FwcEpzb24gPSAobmV3IERhdGUpLmdldFRpbWUoKVxuXG4gICAgICAgIHZhciBjdXJyZW50TnVtRmlsZXMgPSB3YXRjaGVkRmlsZXMubGVuZ3RoXG4gICAgICAgIHZhciBmaWxlc291cmNlID0gJ3RoaXMgZmlsZSBlbmFibGVzIGNsaWVudCByZWxvYWQnXG4gICAgICAgIGNvbXBpbGF0aW9uLmFzc2V0c1tjdXJyZW50TnVtRmlsZXMgKyAnRmlsZXNVbmRlckFwcEZvbGRlci5tZCddID0ge1xuICAgICAgICAgIHNvdXJjZTogZnVuY3Rpb24oKSB7cmV0dXJuIGZpbGVzb3VyY2V9LFxuICAgICAgICAgIHNpemU6IGZ1bmN0aW9uKCkge3JldHVybiBmaWxlc291cmNlLmxlbmd0aH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjdXJyZW50TnVtRmlsZXMgIT0gbWUubGFzdE51bUZpbGVzIHx8IGRvQnVpbGQpIHtcbiAgICAgICAgICBtZS5sYXN0TnVtRmlsZXMgPSBjdXJyZW50TnVtRmlsZXNcbiAgICAgICAgICB2YXIgYnVpbGRBc3luYyA9IHJlcXVpcmUoYCR7bnBtU2NvcGV9L2V4dC1idWlsZC9hcHAvYnVpbGRBc3luYy5qc2ApXG4gICAgICAgICAgdmFyIGJ1aWxkT3B0aW9ucyA9IHtwYXJtczogWydhcHAnLCdidWlsZCcsbWUub3B0aW9ucy5wcm9maWxlLCBtZS5vcHRpb25zLmVudmlyb25tZW50XX1cbiAgICAgICAgICBuZXcgYnVpbGRBc3luYyhidWlsZE9wdGlvbnMpLmV4ZWN1dGVBc3luYygpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjYigpXG4gICAgICAgICAgfSwgZnVuY3Rpb24ocmVhc29uKXtcbiAgICAgICAgICAgIHZhciBwcmVmaXhFcnIgPSAn4pyWIFtleHRdOic7XG4gICAgICAgICAgICB2YXIgZXJyID0gY2hhbGsucmVkKHByZWZpeEVycikgKyAnIGV4dC13ZWJwYWNrLXBsdWdpbjogJ1xuICAgICAgICAgICAgdmFyIGVycm9yU3RyaW5nID0gYCR7ZXJyfSAke2NoYWxrLnJlZChyZWFzb24uZXJyb3IpfWBcbiAgICAgICAgICAgIGNvbXBpbGF0aW9uLmVycm9ycy5wdXNoKG5ldyBFcnJvcihlcnJvclN0cmluZykpXG4gICAgICAgICAgICBjYigpXG4gICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBtZS5sYXN0TnVtRmlsZXMgPSBjdXJyZW50TnVtRmlsZXNcbiAgICAgICAgICBjb25zb2xlLmxvZyhhcHAgKyAnY2FsbCB0byBleHQtYnVpbGQgbm90IG5lZWRlZCwgbm8gbmV3IGZpbGVzJylcbiAgICAgICAgICBjYigpXG4gICAgICAgIH1cbiAgICAgIH0pXG5cblxuLy8gICAgICBjb21waWxlci5ob29rcy5lbWl0LnRhcCgnZXh0LWVtaXQnLCAoY29tcGlsYXRpb24pID0+IHtcbi8vICAgICAgICBwcm9jZXNzLnN0ZG91dC5jdXJzb3JUbygwKTtjb25zb2xlLmxvZyhhcHAgKyAnZXh0LWVtaXQnKVxuXG4gICAgICAvLyAgIHZhciB3YXRjaGVkRmlsZXM9W11cbiAgICAgIC8vICAgdHJ5IHt3YXRjaGVkRmlsZXMgPSByZWN1cnNpdmVSZWFkU3luYygnLi9hcHAnKX0gXG4gICAgICAvLyAgIGNhdGNoKGVycikge2lmKGVyci5lcnJubyA9PT0gMzQpe2NvbnNvbGUubG9nKCdQYXRoIGRvZXMgbm90IGV4aXN0Jyk7fSBlbHNlIHt0aHJvdyBlcnI7fX1cblxuICAgICAgLy8gICB2YXIgZG9CdWlsZCA9IGZhbHNlXG4gICAgICAvLyAgIGZvciAodmFyIGZpbGUgaW4gd2F0Y2hlZEZpbGVzKSB7XG4gICAgICAvLyAgICAgaWYgKHRoaXMubGFzdE1pbGxpc2Vjb25kcyA8IGZzLnN0YXRTeW5jKHdhdGNoZWRGaWxlc1tmaWxlXSkubXRpbWVNcykge1xuICAgICAgLy8gICAgICAgaWYgKHdhdGNoZWRGaWxlc1tmaWxlXS5pbmRleE9mKFwic2Nzc1wiKSAhPSAtMSkge2RvQnVpbGQ9dHJ1ZTticmVhazt9XG4gICAgICAvLyAgICAgfVxuICAgICAgLy8gICB9XG4gICAgICAvLyAgIHRoaXMubGFzdE1pbGxpc2Vjb25kcyA9IChuZXcgRGF0ZSkuZ2V0VGltZSgpXG5cbiAgICAgIC8vICAgdmFyIGN1cnJlbnROdW1GaWxlcyA9IHdhdGNoZWRGaWxlcy5sZW5ndGhcbiAgICAgIC8vICAgdmFyIGZpbGVzb3VyY2UgPSAndGhpcyBmaWxlIGVuYWJsZXMgY2xpZW50IHJlbG9hZCdcbiAgICAgIC8vICAgY29tcGlsYXRpb24uYXNzZXRzW2N1cnJlbnROdW1GaWxlcyArICdGaWxlc1VuZGVyQXBwRm9sZGVyLm1kJ10gPSB7XG4gICAgICAvLyAgICAgc291cmNlOiBmdW5jdGlvbigpIHtyZXR1cm4gZmlsZXNvdXJjZX0sXG4gICAgICAvLyAgICAgc2l6ZTogZnVuY3Rpb24oKSB7cmV0dXJuIGZpbGVzb3VyY2UubGVuZ3RofVxuICAgICAgLy8gICB9XG5cbiAgICAgIC8vICAgaWYgKGN1cnJlbnROdW1GaWxlcyAhPSB0aGlzLmxhc3ROdW1GaWxlcyB8fCBkb0J1aWxkKSB7XG4gICAgICAvLyAgICAgdmFyIGJ1aWxkID0gcmVxdWlyZShgJHtucG1TY29wZX0vZXh0LWJ1aWxkL2FwcC9idWlsZC5qc2ApXG4gICAgICAvLyAgICAgbmV3IGJ1aWxkKHt9KVxuICAgICAgLy8gICAgIC8vdmFyIHJlZnJlc2ggPSByZXF1aXJlKGAke25wbVNjb3BlfS9zZW5jaGEtYnVpbGQvYXBwL3JlZnJlc2guanNgKVxuICAgICAgLy8gICAgIC8vbmV3IHJlZnJlc2goe30pXG4gICAgICAvLyAgIH1cbiAgICAgIC8vICAgZWxzZSB7XG4gICAgICAvLyAgICAgY29uc29sZS5sb2coYXBwICsgJ0NhbGwgdG8gU2VuY2hhIEJ1aWxkIG5vdCBuZWVkZWQsIG5vIG5ldyBmaWxlcycpXG4gICAgICAvLyAgIH1cbiAgICAgIC8vICAgdGhpcy5sYXN0TnVtRmlsZXMgPSBjdXJyZW50TnVtRmlsZXNcblxuLy8gICAgICB9KVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGNvbXBpbGVyLnBsdWdpbignZW1pdCcsIChjb21waWxhdGlvbiwgY2IpID0+IHtcbiAgICAgICAgY29uc29sZS5sb2coYXBwICsgJ2VtaXQnKVxuICAgICAgICB2YXIgZmlsZWxpc3QgPSAndGhpcyBmaWxlIGVuYWJsZXMgY2xpZW50IHJlbG9hZCdcbiAgICAgICAgY29tcGlsYXRpb24uYXNzZXRzWydGb3JSZWxvYWQubWQnXSA9IHtcbiAgICAgICAgICBzb3VyY2U6IGZ1bmN0aW9uKCkge3JldHVybiBmaWxlbGlzdH0sXG4gICAgICAgICAgc2l6ZTogZnVuY3Rpb24oKSB7cmV0dXJuIGZpbGVsaXN0Lmxlbmd0aH1cbiAgICAgICAgfVxuICAgICAgICB2YXIgcmVmcmVzaCA9IHJlcXVpcmUoYCR7bnBtU2NvcGV9L2V4dC1idWlsZC9hcHAvcmVmcmVzaC5qc2ApXG4gICAgICAgIG5ldyByZWZyZXNoKHt9KVxuXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdUSElTIElTIElUJylcbiAgICAgICAgLy8gdmFyIGJ1aWxkQXN5bmMgPSByZXF1aXJlKGAke25wbVNjb3BlfS9leHQtYnVpbGQvYXBwL2J1aWxkQXN5bmMuanNgKVxuICAgICAgICAvLyBjb25zb2xlLmxvZyhidWlsZEFzeW5jKVxuICAgICAgICAvLyBuZXcgYnVpbGRBc3luYygpLmV4ZWN1dGVBc3luYygpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vICAgY29uc29sZS5sb2coJ3RoZW4gY2FsbCcpO1xuICAgICAgICAvLyAgIGNiKCk7XG4gICAgICAgIC8vIH0pXG5cblxuICAgICAgICAvL2NiKClcbiAgICAgICAgLy90aGlzLmVtaXRTdGF0cy5iaW5kKHRoaXMpXG5cblxuXG4gICAgICB9KVxuICAgIH1cblxuICB9XG5cblxuICAvLyBlbWl0U3RhdHMoY3VyQ29tcGlsZXIsIGNhbGxiYWNrKSB7XG4gIC8vICAgLy8gR2V0IHN0YXRzLlxuICAvLyAgIC8vICoqTm90ZSoqOiBJbiBmdXR1cmUsIGNvdWxkIHBhc3Mgc29tZXRoaW5nIGxpa2UgYHsgc2hvd0Fzc2V0czogdHJ1ZSB9YFxuICAvLyAgIC8vIHRvIHRoZSBgZ2V0U3RhdHMoKWAgZnVuY3Rpb24gZm9yIG1vcmUgbGltaXRlZCBvYmplY3QgcmV0dXJuZWQuXG4gIC8vICAgbGV0IHN0YXRzID0gY3VyQ29tcGlsZXIuZ2V0U3RhdHMoKS50b0pzb24oKTtcbiAgXG4gIC8vICAgLy8gRmlsdGVyIHRvIGZpZWxkcy5cbiAgLy8gICBpZiAodGhpcy5vcHRzLmZpZWxkcykge1xuICAvLyAgICAgc3RhdHMgPSB0aGlzLm9wdHMuZmllbGRzLnJlZHVjZSgobWVtbywga2V5KSA9PiB7XG4gIC8vICAgICAgIG1lbW9ba2V5XSA9IHN0YXRzW2tleV07XG4gIC8vICAgICAgIHJldHVybiBtZW1vO1xuICAvLyAgICAgfSwge30pO1xuICAvLyAgIH1cbiAgXG4gIC8vICAgLy8gVHJhbnNmb3JtIHRvIHN0cmluZy5cbiAgLy8gICBsZXQgZXJyO1xuICAvLyAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKVxuICBcbiAgLy8gICAgIC8vIFRyYW5zZm9ybS5cbiAgLy8gICAgIC50aGVuKCgpID0+IHRoaXMub3B0cy50cmFuc2Zvcm0oc3RhdHMsIHtcbiAgLy8gICAgICAgY29tcGlsZXI6IGN1ckNvbXBpbGVyXG4gIC8vICAgICB9KSlcbiAgLy8gICAgIC5jYXRjaCgoZSkgPT4geyBlcnIgPSBlOyB9KVxuICBcbiAgLy8gICAgIC8vIEZpbmlzaCB1cC5cbiAgLy8gICAgIC50aGVuKChzdGF0c1N0cikgPT4ge1xuICAvLyAgICAgICAvLyBIYW5kbGUgZXJyb3JzLlxuICAvLyAgICAgICBpZiAoZXJyKSB7XG4gIC8vICAgICAgICAgY3VyQ29tcGlsZXIuZXJyb3JzLnB1c2goZXJyKTtcbiAgLy8gICAgICAgICBpZiAoY2FsbGJhY2spIHsgcmV0dXJuIHZvaWQgY2FsbGJhY2soZXJyKTsgfVxuICAvLyAgICAgICAgIHRocm93IGVycjtcbiAgLy8gICAgICAgfVxuICBcbiAgLy8gICAgICAgLy8gQWRkIHRvIGFzc2V0cy5cbiAgLy8gICAgICAgY3VyQ29tcGlsZXIuYXNzZXRzW3RoaXMub3B0cy5maWxlbmFtZV0gPSB7XG4gIC8vICAgICAgICAgc291cmNlKCkge1xuICAvLyAgICAgICAgICAgcmV0dXJuIHN0YXRzU3RyO1xuICAvLyAgICAgICAgIH0sXG4gIC8vICAgICAgICAgc2l6ZSgpIHtcbiAgLy8gICAgICAgICAgIHJldHVybiBzdGF0c1N0ci5sZW5ndGg7XG4gIC8vICAgICAgICAgfVxuICAvLyAgICAgICB9O1xuICBcbiAgLy8gICAgICAgaWYgKGNhbGxiYWNrKSB7IHJldHVybiB2b2lkIGNhbGxiYWNrKCk7IH1cbiAgLy8gICAgIH0pO1xuICAvLyB9XG4gIFxuXG5cbn1cblxuXG5cblxuXG5cbiAgLy8gaWYgKGZpbGVzLmxlbmd0aCA+IDApIHtcbiAgLy8gICBmaWxlcy5mb3JFYWNoKChwYXR0ZXJuKSA9PiB7XG4gIC8vICAgICBsZXQgZiA9IHBhdHRlcm47XG4gIC8vICAgICBpZiAoaXNHbG9iKHBhdHRlcm4pKSB7XG4gIC8vICAgICAgIGYgPSBnbG9iLnN5bmMocGF0dGVybiwge1xuICAvLyAgICAgICAgIGN3ZCxcbiAgLy8gICAgICAgICBkb3Q6IHRydWUsXG4gIC8vICAgICAgICAgYWJzb2x1dGU6IHRydWUsXG4gIC8vICAgICAgIH0pO1xuICAvLyAgICAgfVxuICAvLyAgICAgZmRzID0gZmRzLmNvbmNhdChmKTtcbiAgLy8gICB9KTtcbiAgLy8gICBmZHMgPSB1bmlxKGZkcyk7XG4gIC8vIH1cblxuXG4vLyBmdW5jdGlvbiBob29rX3N0ZG91dChjYWxsYmFjaykge1xuLy8gICB2YXIgb2xkX3dyaXRlID0gcHJvY2Vzcy5zdGRvdXQud3JpdGVcbi8vICAgY29uc29sZS5sb2coJ2luIGhvb2snKVxuLy8gICBwcm9jZXNzLnN0ZG91dC53cml0ZSA9IChmdW5jdGlvbih3cml0ZSkge1xuLy8gICAgICAgcmV0dXJuIGZ1bmN0aW9uKHN0cmluZywgZW5jb2RpbmcsIGZkKSB7XG4vLyAgICAgICAgICAgd3JpdGUuYXBwbHkocHJvY2Vzcy5zdGRvdXQsIGFyZ3VtZW50cylcbi8vICAgICAgICAgICBjYWxsYmFjayhzdHJpbmcsIGVuY29kaW5nLCBmZClcbi8vICAgICAgIH1cbi8vICAgfSkocHJvY2Vzcy5zdGRvdXQud3JpdGUpXG5cbi8vICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuLy8gICAgICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUgPSBvbGRfd3JpdGVcbi8vICAgICAgIGNvbnNvbGUubG9nKCdpbiB1bmhvb2snKVxuLy8gICAgIH1cbi8vIH1cbiAgICAvLyB0aGlzLnVuaG9vayA9IGhvb2tfc3Rkb3V0KGZ1bmN0aW9uKHN0cmluZywgZW5jb2RpbmcsIGZkKSB7XG4gICAgLy8gICBjb25zb2xlLmxvZygnc3Rkb3V0OiAnICsgc3RyaW5nKVxuICAgIC8vIH0pXG5cbi8vICAgICAgICB0aGlzLnVuaG9vaygpXG5cblxuXG5cblxuICAgICAgICAvLyB2YXIgZmlsZWxpc3QgPSAnSW4gdGhpcyBidWlsZDpcXG5cXG4nO1xuXG4gICAgICAgIC8vIC8vIExvb3AgdGhyb3VnaCBhbGwgY29tcGlsZWQgYXNzZXRzLFxuICAgICAgICAvLyAvLyBhZGRpbmcgYSBuZXcgbGluZSBpdGVtIGZvciBlYWNoIGZpbGVuYW1lLlxuICAgICAgICAvLyBmb3IgKHZhciBmaWxlbmFtZSBpbiBjb21waWxhdGlvbi5hc3NldHMpIHtcbiAgICAgICAgLy8gICBmaWxlbGlzdCArPSAoJy0gJysgZmlsZW5hbWUgKydcXG4nKTtcbiAgICAgICAgLy8gfVxuICAgIFxuICAgICAgICAvLyAvLyBJbnNlcnQgdGhpcyBsaXN0IGludG8gdGhlIHdlYnBhY2sgYnVpbGQgYXMgYSBuZXcgZmlsZSBhc3NldDpcbiAgICAgICAgLy8gY29tcGlsYXRpb24uYXNzZXRzWydmaWxlbGlzdC5tZCddID0ge1xuICAgICAgICAvLyAgIHNvdXJjZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vICAgICByZXR1cm4gZmlsZWxpc3Q7XG4gICAgICAgIC8vICAgfSxcbiAgICAgICAgLy8gICBzaXplOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gICAgIHJldHVybiBmaWxlbGlzdC5sZW5ndGg7XG4gICAgICAgIC8vICAgfVxuICAgICAgICAvLyB9O1xuXG5cblxuXG5cbiAgICAgICAgLy8gLy92YXIgZCA9IG5ldyBEYXRlKClcbiAgICAgICAgLy8gdmFyIGQgPSAnbWpnJ1xuICAgICAgICAvLyB2YXIgZmlsZWxpc3QgPSAnSW4gdGhpcyBidWlsZDpcXG5cXG4nICsgZCArICdcXG5cXG4nO1xuICAgICAgICAvLyAvLyBMb29wIHRocm91Z2ggYWxsIGNvbXBpbGVkIGFzc2V0cyxcbiAgICAgICAgLy8gLy8gYWRkaW5nIGEgbmV3IGxpbmUgaXRlbSBmb3IgZWFjaCBmaWxlbmFtZS5cbiAgICAgICAgLy8gZm9yICh2YXIgZmlsZW5hbWUgaW4gY29tcGlsYXRpb24uYXNzZXRzKSB7XG4gICAgICAgIC8vICAgZmlsZWxpc3QgKz0gKCctICcrIGZpbGVuYW1lICsnXFxuJyk7XG4gICAgICAgIC8vIH1cbiAgICAgICAgLy8gLy8gSW5zZXJ0IHRoaXMgbGlzdCBpbnRvIHRoZSB3ZWJwYWNrIGJ1aWxkIGFzIGEgbmV3IGZpbGUgYXNzZXQ6XG4gICAgICAgIC8vIGNvbXBpbGF0aW9uLmFzc2V0c1tkICsgJy5tZCddID0ge1xuICAgICAgICAvLyAgIHNvdXJjZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vICAgICByZXR1cm4gZmlsZWxpc3Q7XG4gICAgICAgIC8vICAgfSxcbiAgICAgICAgLy8gICBzaXplOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gICAgIHJldHVybiBmaWxlbGlzdC5sZW5ndGg7XG4gICAgICAgIC8vICAgfVxuICAgICAgICAvLyB9OyJdfQ==