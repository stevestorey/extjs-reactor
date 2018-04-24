var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

import chalk from 'chalk';
import fs from 'fs';
import validateOptions from 'schema-utils';
import uniq from 'lodash.uniq';
import isGlob from 'is-glob';
//import glob from 'glob';
import { resolve } from 'path';
import recursiveReadSync from 'recursive-readdir-sync';
//const recursiveReadSync = require('recursive-readdir-sync')

const app = `${chalk.green('ℹ ｢ext｣:')} extjs-webpack-plugin: `;

function getFileAndContextDeps(compilation, files, dirs, cwd) {
  const { fileDependencies, contextDependencies } = compilation;
  const isWebpack4 = compilation.hooks;
  let fds = isWebpack4 ? [...fileDependencies] : fileDependencies;
  let cds = isWebpack4 ? [...contextDependencies] : contextDependencies;
  if (dirs.length > 0) {
    cds = uniq(cds.concat(dirs));
  }
  return {
    fileDependencies: fds,
    contextDependencies: cds
  };
}

export default class ExtJSWebpackPlugin {

  constructor(options = {}) {
    validateOptions(require('../options.json'), options, 'ExtraWatchWebpackPlugin'); // eslint-disable-line
    this.options = _extends({}, ExtJSWebpackPlugin.defaults, options);
  }

  apply(compiler) {

    if (this.webpackVersion == undefined) {
      const isWebpack4 = compiler.hooks;
      if (isWebpack4) {
        this.webpackVersion = 'IS webpack 4';
      } else {
        this.webpackVersion = 'NOT webpack 4';
      }
      this.extjsVersion = '6.5.3';
      process.stdout.cursorTo(0);console.log(app + 'Ext JS v' + this.extjsVersion + ', ' + this.webpackVersion);
    }

    let { files, dirs } = this.options;
    const { cwd } = this.options;
    files = typeof files === 'string' ? [files] : files;
    dirs = typeof dirs === 'string' ? [dirs] : dirs;

    if (compiler.hooks) {
      compiler.hooks.afterCompile.tap('extjs-after-compile', compilation => {
        process.stdout.cursorTo(0);console.log(app + 'extjs-after-compile');
        const {
          fileDependencies,
          contextDependencies
        } = getFileAndContextDeps(compilation, files, dirs, cwd);
        if (files.length > 0) {
          fileDependencies.forEach(file => {
            compilation.fileDependencies.add(resolve(file));
          });
        }
        if (dirs.length > 0) {
          contextDependencies.forEach(context => {
            compilation.contextDependencies.add(context);
          });
        }
      });
    } else {
      compiler.plugin('after-compile', (compilation, cb) => {
        console.log(app + 'after-compile');
        const {
          fileDependencies,
          contextDependencies
        } = getFileAndContextDeps(compilation, files, dirs, cwd);
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
      compiler.hooks.emit.tap('extjs-emit', compilation => {
        process.stdout.cursorTo(0);console.log(app + 'extjs-emit');

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
          if (this.lastMilliseconds < fs.statSync(watchedFiles[file]).mtimeMs) {
            if (watchedFiles[file].indexOf("scss") != -1) {
              doBuild = true;break;
            }
          }
        }
        this.lastMilliseconds = new Date().getTime();

        var currentNumFiles = watchedFiles.length;
        var filesource = 'this file enables client reload';
        compilation.assets[currentNumFiles + 'FilesUnderAppFolder.md'] = {
          source: function () {
            return filesource;
          },
          size: function () {
            return filesource.length;
          }
        };

        if (currentNumFiles != this.lastNumFiles || doBuild) {
          var build = require('@extjs/sencha-build/app/build.js');
          new build({});
          //var refresh = require('@extjs/sencha-build/app/refresh.js')
          //new refresh({})
        } else {
          console.log(app + 'Call to Sencha Build not needed, no new files');
        }
        this.lastNumFiles = currentNumFiles;
      });
    } else {
      compiler.plugin('emit', (compilation, cb) => {
        console.log(app + 'emit');
        var filelist = 'this file enables client reload';
        compilation.assets['ForReload.md'] = {
          source: function () {
            return filelist;
          },
          size: function () {
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


}

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
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9pbmRleC5qcyJdLCJuYW1lcyI6WyJjaGFsayIsImZzIiwidmFsaWRhdGVPcHRpb25zIiwidW5pcSIsImlzR2xvYiIsInJlc29sdmUiLCJyZWN1cnNpdmVSZWFkU3luYyIsImFwcCIsImdyZWVuIiwiZ2V0RmlsZUFuZENvbnRleHREZXBzIiwiY29tcGlsYXRpb24iLCJmaWxlcyIsImRpcnMiLCJjd2QiLCJmaWxlRGVwZW5kZW5jaWVzIiwiY29udGV4dERlcGVuZGVuY2llcyIsImlzV2VicGFjazQiLCJob29rcyIsImZkcyIsImNkcyIsImxlbmd0aCIsImNvbmNhdCIsIkV4dEpTV2VicGFja1BsdWdpbiIsImNvbnN0cnVjdG9yIiwib3B0aW9ucyIsInJlcXVpcmUiLCJkZWZhdWx0cyIsImFwcGx5IiwiY29tcGlsZXIiLCJ3ZWJwYWNrVmVyc2lvbiIsInVuZGVmaW5lZCIsImV4dGpzVmVyc2lvbiIsInByb2Nlc3MiLCJzdGRvdXQiLCJjdXJzb3JUbyIsImNvbnNvbGUiLCJsb2ciLCJhZnRlckNvbXBpbGUiLCJ0YXAiLCJmb3JFYWNoIiwiZmlsZSIsImFkZCIsImNvbnRleHQiLCJwbHVnaW4iLCJjYiIsImVtaXQiLCJ3YXRjaGVkRmlsZXMiLCJlcnIiLCJlcnJubyIsImRvQnVpbGQiLCJsYXN0TWlsbGlzZWNvbmRzIiwic3RhdFN5bmMiLCJtdGltZU1zIiwiaW5kZXhPZiIsIkRhdGUiLCJnZXRUaW1lIiwiY3VycmVudE51bUZpbGVzIiwiZmlsZXNvdXJjZSIsImFzc2V0cyIsInNvdXJjZSIsInNpemUiLCJsYXN0TnVtRmlsZXMiLCJidWlsZCIsImZpbGVsaXN0IiwicmVmcmVzaCJdLCJtYXBwaW5ncyI6Ijs7QUFBQSxPQUFPQSxLQUFQLE1BQWtCLE9BQWxCO0FBQ0EsT0FBT0MsRUFBUCxNQUFlLElBQWY7QUFDQSxPQUFPQyxlQUFQLE1BQTRCLGNBQTVCO0FBQ0EsT0FBT0MsSUFBUCxNQUFpQixhQUFqQjtBQUNBLE9BQU9DLE1BQVAsTUFBbUIsU0FB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QUFDLE9BQUQ7QUFIVSxDIiwiZmlsZSI6ImluZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgdmFsaWRhdGVPcHRpb25zIGZyb20gJ3NjaGVtYS11dGlscyc7XG5pbXBvcnQgdW5pcSBmcm9tICdsb2Rhc2gudW5pcSc7XG5pbXBvcnQgaXNHbG9iIGZyb20gJ2lzLWdsb2InO1xuLy9pbXBvcnQgZ2xvYiBmcm9tICdnbG9iJztcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdwYXRoJztcbmltcG9ydCByZWN1cnNpdmVSZWFkU3luYyBmcm9tICdyZWN1cnNpdmUtcmVhZGRpci1zeW5jJztcbi8vY29uc3QgcmVjdXJzaXZlUmVhZFN5bmMgPSByZXF1aXJlKCdyZWN1cnNpdmUtcmVhZGRpci1zeW5jJylcblxuY29uc3QgYXBwID0gYCR7Y2hhbGsuZ3JlZW4oJ+KEuSDvvaJleHTvvaM6Jyl9IGV4dGpzLXdlYnBhY2stcGx1Z2luOiBgO1xuXG5mdW5jdGlvbiBnZXRGaWxlQW5kQ29udGV4dERlcHMoY29tcGlsYXRpb24sIGZpbGVzLCBkaXJzLCBjd2QpIHtcbiAgY29uc3QgeyBmaWxlRGVwZW5kZW5jaWVzLCBjb250ZXh0RGVwZW5kZW5jaWVzIH0gPSBjb21waWxhdGlvbjtcbiAgY29uc3QgaXNXZWJwYWNrNCA9IGNvbXBpbGF0aW9uLmhvb2tzO1xuICBsZXQgZmRzID0gaXNXZWJwYWNrNCA/IFsuLi5maWxlRGVwZW5kZW5jaWVzXSA6IGZpbGVEZXBlbmRlbmNpZXM7XG4gIGxldCBjZHMgPSBpc1dlYnBhY2s0ID8gWy4uLmNvbnRleHREZXBlbmRlbmNpZXNdIDogY29udGV4dERlcGVuZGVuY2llcztcbiAgaWYgKGRpcnMubGVuZ3RoID4gMCkge1xuICAgIGNkcyA9IHVuaXEoY2RzLmNvbmNhdChkaXJzKSk7XG4gIH1cbiAgcmV0dXJuIHtcbiAgICBmaWxlRGVwZW5kZW5jaWVzOiBmZHMsXG4gICAgY29udGV4dERlcGVuZGVuY2llczogY2RzLFxuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBFeHRKU1dlYnBhY2tQbHVnaW4ge1xuICBzdGF0aWMgZGVmYXVsdHMgPSB7XG4gICAgY3dkOiBwcm9jZXNzLmN3ZCgpLFxuICAgIGZpbGVzOiBbXSxcbiAgICBkaXJzOiBbJy4vYXBwJ10sXG4gIH07XG5cbiAgY29uc3RydWN0b3Iob3B0aW9ucyA9IHt9KSB7XG4gICAgdmFsaWRhdGVPcHRpb25zKHJlcXVpcmUoJy4uL29wdGlvbnMuanNvbicpLCBvcHRpb25zLCAnRXh0cmFXYXRjaFdlYnBhY2tQbHVnaW4nKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZVxuICAgIHRoaXMub3B0aW9ucyA9IHsgLi4uRXh0SlNXZWJwYWNrUGx1Z2luLmRlZmF1bHRzLCAuLi5vcHRpb25zIH07XG4gIH1cblxuICBhcHBseShjb21waWxlcikge1xuXG4gICAgaWYgKHRoaXMud2VicGFja1ZlcnNpb24gPT0gdW5kZWZpbmVkKSB7XG4gICAgICBjb25zdCBpc1dlYnBhY2s0ID0gY29tcGlsZXIuaG9va3M7XG4gICAgICBpZiAoaXNXZWJwYWNrNCkge3RoaXMud2VicGFja1ZlcnNpb24gPSAnSVMgd2VicGFjayA0J31cbiAgICAgIGVsc2Uge3RoaXMud2VicGFja1ZlcnNpb24gPSAnTk9UIHdlYnBhY2sgNCd9XG4gICAgICB0aGlzLmV4dGpzVmVyc2lvbiA9ICc2LjUuMydcbiAgICAgIHByb2Nlc3Muc3Rkb3V0LmN1cnNvclRvKDApO2NvbnNvbGUubG9nKGFwcCArICdFeHQgSlMgdicgKyB0aGlzLmV4dGpzVmVyc2lvbiArICcsICcgKyB0aGlzLndlYnBhY2tWZXJzaW9uKVxuICAgIH1cblxuICAgIGxldCB7IGZpbGVzLCBkaXJzIH0gPSB0aGlzLm9wdGlvbnM7XG4gICAgY29uc3QgeyBjd2QgfSA9IHRoaXMub3B0aW9ucztcbiAgICBmaWxlcyA9IHR5cGVvZiBmaWxlcyA9PT0gJ3N0cmluZycgPyBbZmlsZXNdIDogZmlsZXM7XG4gICAgZGlycyA9IHR5cGVvZiBkaXJzID09PSAnc3RyaW5nJyA/IFtkaXJzXSA6IGRpcnM7XG5cbiAgICBpZiAoY29tcGlsZXIuaG9va3MpIHtcbiAgICAgIGNvbXBpbGVyLmhvb2tzLmFmdGVyQ29tcGlsZS50YXAoJ2V4dGpzLWFmdGVyLWNvbXBpbGUnLCAoY29tcGlsYXRpb24pID0+IHtcbiAgICAgICAgcHJvY2Vzcy5zdGRvdXQuY3Vyc29yVG8oMCk7Y29uc29sZS5sb2coYXBwICsgJ2V4dGpzLWFmdGVyLWNvbXBpbGUnKVxuICAgICAgICBjb25zdCB7XG4gICAgICAgICAgZmlsZURlcGVuZGVuY2llcyxcbiAgICAgICAgICBjb250ZXh0RGVwZW5kZW5jaWVzLFxuICAgICAgICB9ID0gZ2V0RmlsZUFuZENvbnRleHREZXBzKGNvbXBpbGF0aW9uLCBmaWxlcywgZGlycywgY3dkKTtcbiAgICAgICAgaWYgKGZpbGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBmaWxlRGVwZW5kZW5jaWVzLmZvckVhY2goKGZpbGUpID0+IHtcbiAgICAgICAgICAgIGNvbXBpbGF0aW9uLmZpbGVEZXBlbmRlbmNpZXMuYWRkKHJlc29sdmUoZmlsZSkpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkaXJzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBjb250ZXh0RGVwZW5kZW5jaWVzLmZvckVhY2goKGNvbnRleHQpID0+IHtcbiAgICAgICAgICAgIGNvbXBpbGF0aW9uLmNvbnRleHREZXBlbmRlbmNpZXMuYWRkKGNvbnRleHQpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29tcGlsZXIucGx1Z2luKCdhZnRlci1jb21waWxlJywgKGNvbXBpbGF0aW9uLCBjYikgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZyhhcHAgKyAnYWZ0ZXItY29tcGlsZScpXG4gICAgICAgIGNvbnN0IHtcbiAgICAgICAgICBmaWxlRGVwZW5kZW5jaWVzLFxuICAgICAgICAgIGNvbnRleHREZXBlbmRlbmNpZXMsXG4gICAgICAgIH0gPSBnZXRGaWxlQW5kQ29udGV4dERlcHMoY29tcGlsYXRpb24sIGZpbGVzLCBkaXJzLCBjd2QpO1xuICAgICAgICBpZiAoZmlsZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGNvbXBpbGF0aW9uLmZpbGVEZXBlbmRlbmNpZXMgPSBmaWxlRGVwZW5kZW5jaWVzOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lXG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRpcnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGNvbXBpbGF0aW9uLmNvbnRleHREZXBlbmRlbmNpZXMgPSBjb250ZXh0RGVwZW5kZW5jaWVzOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lXG4gICAgICAgIH1cbiAgICAgICAgY2IoKVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKGNvbXBpbGVyLmhvb2tzKSB7XG4gICAgICBjb21waWxlci5ob29rcy5lbWl0LnRhcCgnZXh0anMtZW1pdCcsIChjb21waWxhdGlvbikgPT4ge1xuICAgICAgICBwcm9jZXNzLnN0ZG91dC5jdXJzb3JUbygwKTtjb25zb2xlLmxvZyhhcHAgKyAnZXh0anMtZW1pdCcpXG5cbiAgICAgICAgdmFyIHdhdGNoZWRGaWxlcz1bXVxuICAgICAgICB0cnkge3dhdGNoZWRGaWxlcyA9IHJlY3Vyc2l2ZVJlYWRTeW5jKCcuL2FwcCcpfSBcbiAgICAgICAgY2F0Y2goZXJyKSB7aWYoZXJyLmVycm5vID09PSAzNCl7Y29uc29sZS5sb2coJ1BhdGggZG9lcyBub3QgZXhpc3QnKTt9IGVsc2Uge3Rocm93IGVycjt9fVxuXG4gICAgICAgIHZhciBkb0J1aWxkID0gZmFsc2VcbiAgICAgICAgZm9yICh2YXIgZmlsZSBpbiB3YXRjaGVkRmlsZXMpIHtcbiAgICAgICAgICBpZiAodGhpcy5sYXN0TWlsbGlzZWNvbmRzIDwgZnMuc3RhdFN5bmMod2F0Y2hlZEZpbGVzW2ZpbGVdKS5tdGltZU1zKSB7XG4gICAgICAgICAgICBpZiAod2F0Y2hlZEZpbGVzW2ZpbGVdLmluZGV4T2YoXCJzY3NzXCIpICE9IC0xKSB7ZG9CdWlsZD10cnVlO2JyZWFrO31cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5sYXN0TWlsbGlzZWNvbmRzID0gKG5ldyBEYXRlKS5nZXRUaW1lKClcblxuICAgICAgICB2YXIgY3VycmVudE51bUZpbGVzID0gd2F0Y2hlZEZpbGVzLmxlbmd0aFxuICAgICAgICB2YXIgZmlsZXNvdXJjZSA9ICd0aGlzIGZpbGUgZW5hYmxlcyBjbGllbnQgcmVsb2FkJ1xuICAgICAgICBjb21waWxhdGlvbi5hc3NldHNbY3VycmVudE51bUZpbGVzICsgJ0ZpbGVzVW5kZXJBcHBGb2xkZXIubWQnXSA9IHtcbiAgICAgICAgICBzb3VyY2U6IGZ1bmN0aW9uKCkge3JldHVybiBmaWxlc291cmNlfSxcbiAgICAgICAgICBzaXplOiBmdW5jdGlvbigpIHtyZXR1cm4gZmlsZXNvdXJjZS5sZW5ndGh9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY3VycmVudE51bUZpbGVzICE9IHRoaXMubGFzdE51bUZpbGVzIHx8IGRvQnVpbGQpIHtcbiAgICAgICAgICB2YXIgYnVpbGQgPSByZXF1aXJlKCdAZXh0anMvc2VuY2hhLWJ1aWxkL2FwcC9idWlsZC5qcycpXG4gICAgICAgICAgbmV3IGJ1aWxkKHt9KVxuICAgICAgICAgIC8vdmFyIHJlZnJlc2ggPSByZXF1aXJlKCdAZXh0anMvc2VuY2hhLWJ1aWxkL2FwcC9yZWZyZXNoLmpzJylcbiAgICAgICAgICAvL25ldyByZWZyZXNoKHt9KVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGNvbnNvbGUubG9nKGFwcCArICdDYWxsIHRvIFNlbmNoYSBCdWlsZCBub3QgbmVlZGVkLCBubyBuZXcgZmlsZXMnKVxuICAgICAgICB9XG4gICAgICAgIHRoaXMubGFzdE51bUZpbGVzID0gY3VycmVudE51bUZpbGVzXG5cblxuXG5cbiAgICAgIH0pXG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgY29tcGlsZXIucGx1Z2luKCdlbWl0JywgKGNvbXBpbGF0aW9uLCBjYikgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZyhhcHAgKyAnZW1pdCcpXG4gICAgICAgIHZhciBmaWxlbGlzdCA9ICd0aGlzIGZpbGUgZW5hYmxlcyBjbGllbnQgcmVsb2FkJ1xuICAgICAgICBjb21waWxhdGlvbi5hc3NldHNbJ0ZvclJlbG9hZC5tZCddID0ge1xuICAgICAgICAgIHNvdXJjZTogZnVuY3Rpb24oKSB7cmV0dXJuIGZpbGVsaXN0fSxcbiAgICAgICAgICBzaXplOiBmdW5jdGlvbigpIHtyZXR1cm4gZmlsZWxpc3QubGVuZ3RofVxuICAgICAgICB9XG4gICAgICAgIHZhciByZWZyZXNoID0gcmVxdWlyZSgnQGV4dGpzL3NlbmNoYS1ub2RlL2FwcC9yZWZyZXNoLmpzJylcbiAgICAgICAgbmV3IHJlZnJlc2goe30pXG4gICAgICAgIC8vY2IoKVxuICAgICAgICAvL3RoaXMuZW1pdFN0YXRzLmJpbmQodGhpcylcblxuXG5cbiAgICAgIH0pXG4gICAgfVxuXG4gIH1cblxuXG4gIC8vIGVtaXRTdGF0cyhjdXJDb21waWxlciwgY2FsbGJhY2spIHtcbiAgLy8gICAvLyBHZXQgc3RhdHMuXG4gIC8vICAgLy8gKipOb3RlKio6IEluIGZ1dHVyZSwgY291bGQgcGFzcyBzb21ldGhpbmcgbGlrZSBgeyBzaG93QXNzZXRzOiB0cnVlIH1gXG4gIC8vICAgLy8gdG8gdGhlIGBnZXRTdGF0cygpYCBmdW5jdGlvbiBmb3IgbW9yZSBsaW1pdGVkIG9iamVjdCByZXR1cm5lZC5cbiAgLy8gICBsZXQgc3RhdHMgPSBjdXJDb21waWxlci5nZXRTdGF0cygpLnRvSnNvbigpO1xuICBcbiAgLy8gICAvLyBGaWx0ZXIgdG8gZmllbGRzLlxuICAvLyAgIGlmICh0aGlzLm9wdHMuZmllbGRzKSB7XG4gIC8vICAgICBzdGF0cyA9IHRoaXMub3B0cy5maWVsZHMucmVkdWNlKChtZW1vLCBrZXkpID0+IHtcbiAgLy8gICAgICAgbWVtb1trZXldID0gc3RhdHNba2V5XTtcbiAgLy8gICAgICAgcmV0dXJuIG1lbW87XG4gIC8vICAgICB9LCB7fSk7XG4gIC8vICAgfVxuICBcbiAgLy8gICAvLyBUcmFuc2Zvcm0gdG8gc3RyaW5nLlxuICAvLyAgIGxldCBlcnI7XG4gIC8vICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpXG4gIFxuICAvLyAgICAgLy8gVHJhbnNmb3JtLlxuICAvLyAgICAgLnRoZW4oKCkgPT4gdGhpcy5vcHRzLnRyYW5zZm9ybShzdGF0cywge1xuICAvLyAgICAgICBjb21waWxlcjogY3VyQ29tcGlsZXJcbiAgLy8gICAgIH0pKVxuICAvLyAgICAgLmNhdGNoKChlKSA9PiB7IGVyciA9IGU7IH0pXG4gIFxuICAvLyAgICAgLy8gRmluaXNoIHVwLlxuICAvLyAgICAgLnRoZW4oKHN0YXRzU3RyKSA9PiB7XG4gIC8vICAgICAgIC8vIEhhbmRsZSBlcnJvcnMuXG4gIC8vICAgICAgIGlmIChlcnIpIHtcbiAgLy8gICAgICAgICBjdXJDb21waWxlci5lcnJvcnMucHVzaChlcnIpO1xuICAvLyAgICAgICAgIGlmIChjYWxsYmFjaykgeyByZXR1cm4gdm9pZCBjYWxsYmFjayhlcnIpOyB9XG4gIC8vICAgICAgICAgdGhyb3cgZXJyO1xuICAvLyAgICAgICB9XG4gIFxuICAvLyAgICAgICAvLyBBZGQgdG8gYXNzZXRzLlxuICAvLyAgICAgICBjdXJDb21waWxlci5hc3NldHNbdGhpcy5vcHRzLmZpbGVuYW1lXSA9IHtcbiAgLy8gICAgICAgICBzb3VyY2UoKSB7XG4gIC8vICAgICAgICAgICByZXR1cm4gc3RhdHNTdHI7XG4gIC8vICAgICAgICAgfSxcbiAgLy8gICAgICAgICBzaXplKCkge1xuICAvLyAgICAgICAgICAgcmV0dXJuIHN0YXRzU3RyLmxlbmd0aDtcbiAgLy8gICAgICAgICB9XG4gIC8vICAgICAgIH07XG4gIFxuICAvLyAgICAgICBpZiAoY2FsbGJhY2spIHsgcmV0dXJuIHZvaWQgY2FsbGJhY2soKTsgfVxuICAvLyAgICAgfSk7XG4gIC8vIH1cbiAgXG5cblxufVxuXG5cblxuXG5cblxuICAvLyBpZiAoZmlsZXMubGVuZ3RoID4gMCkge1xuICAvLyAgIGZpbGVzLmZvckVhY2goKHBhdHRlcm4pID0+IHtcbiAgLy8gICAgIGxldCBmID0gcGF0dGVybjtcbiAgLy8gICAgIGlmIChpc0dsb2IocGF0dGVybikpIHtcbiAgLy8gICAgICAgZiA9IGdsb2Iuc3luYyhwYXR0ZXJuLCB7XG4gIC8vICAgICAgICAgY3dkLFxuICAvLyAgICAgICAgIGRvdDogdHJ1ZSxcbiAgLy8gICAgICAgICBhYnNvbHV0ZTogdHJ1ZSxcbiAgLy8gICAgICAgfSk7XG4gIC8vICAgICB9XG4gIC8vICAgICBmZHMgPSBmZHMuY29uY2F0KGYpO1xuICAvLyAgIH0pO1xuICAvLyAgIGZkcyA9IHVuaXEoZmRzKTtcbiAgLy8gfVxuXG5cbi8vIGZ1bmN0aW9uIGhvb2tfc3Rkb3V0KGNhbGxiYWNrKSB7XG4vLyAgIHZhciBvbGRfd3JpdGUgPSBwcm9jZXNzLnN0ZG91dC53cml0ZVxuLy8gICBjb25zb2xlLmxvZygnaW4gaG9vaycpXG4vLyAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlID0gKGZ1bmN0aW9uKHdyaXRlKSB7XG4vLyAgICAgICByZXR1cm4gZnVuY3Rpb24oc3RyaW5nLCBlbmNvZGluZywgZmQpIHtcbi8vICAgICAgICAgICB3cml0ZS5hcHBseShwcm9jZXNzLnN0ZG91dCwgYXJndW1lbnRzKVxuLy8gICAgICAgICAgIGNhbGxiYWNrKHN0cmluZywgZW5jb2RpbmcsIGZkKVxuLy8gICAgICAgfVxuLy8gICB9KShwcm9jZXNzLnN0ZG91dC53cml0ZSlcblxuLy8gICByZXR1cm4gZnVuY3Rpb24oKSB7XG4vLyAgICAgICBwcm9jZXNzLnN0ZG91dC53cml0ZSA9IG9sZF93cml0ZVxuLy8gICAgICAgY29uc29sZS5sb2coJ2luIHVuaG9vaycpXG4vLyAgICAgfVxuLy8gfVxuICAgIC8vIHRoaXMudW5ob29rID0gaG9va19zdGRvdXQoZnVuY3Rpb24oc3RyaW5nLCBlbmNvZGluZywgZmQpIHtcbiAgICAvLyAgIGNvbnNvbGUubG9nKCdzdGRvdXQ6ICcgKyBzdHJpbmcpXG4gICAgLy8gfSlcblxuLy8gICAgICAgIHRoaXMudW5ob29rKClcblxuXG5cblxuXG4gICAgICAgIC8vIHZhciBmaWxlbGlzdCA9ICdJbiB0aGlzIGJ1aWxkOlxcblxcbic7XG5cbiAgICAgICAgLy8gLy8gTG9vcCB0aHJvdWdoIGFsbCBjb21waWxlZCBhc3NldHMsXG4gICAgICAgIC8vIC8vIGFkZGluZyBhIG5ldyBsaW5lIGl0ZW0gZm9yIGVhY2ggZmlsZW5hbWUuXG4gICAgICAgIC8vIGZvciAodmFyIGZpbGVuYW1lIGluIGNvbXBpbGF0aW9uLmFzc2V0cykge1xuICAgICAgICAvLyAgIGZpbGVsaXN0ICs9ICgnLSAnKyBmaWxlbmFtZSArJ1xcbicpO1xuICAgICAgICAvLyB9XG4gICAgXG4gICAgICAgIC8vIC8vIEluc2VydCB0aGlzIGxpc3QgaW50byB0aGUgd2VicGFjayBidWlsZCBhcyBhIG5ldyBmaWxlIGFzc2V0OlxuICAgICAgICAvLyBjb21waWxhdGlvbi5hc3NldHNbJ2ZpbGVsaXN0Lm1kJ10gPSB7XG4gICAgICAgIC8vICAgc291cmNlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gICAgIHJldHVybiBmaWxlbGlzdDtcbiAgICAgICAgLy8gICB9LFxuICAgICAgICAvLyAgIHNpemU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyAgICAgcmV0dXJuIGZpbGVsaXN0Lmxlbmd0aDtcbiAgICAgICAgLy8gICB9XG4gICAgICAgIC8vIH07XG5cblxuXG5cblxuICAgICAgICAvLyAvL3ZhciBkID0gbmV3IERhdGUoKVxuICAgICAgICAvLyB2YXIgZCA9ICdtamcnXG4gICAgICAgIC8vIHZhciBmaWxlbGlzdCA9ICdJbiB0aGlzIGJ1aWxkOlxcblxcbicgKyBkICsgJ1xcblxcbic7XG4gICAgICAgIC8vIC8vIExvb3AgdGhyb3VnaCBhbGwgY29tcGlsZWQgYXNzZXRzLFxuICAgICAgICAvLyAvLyBhZGRpbmcgYSBuZXcgbGluZSBpdGVtIGZvciBlYWNoIGZpbGVuYW1lLlxuICAgICAgICAvLyBmb3IgKHZhciBmaWxlbmFtZSBpbiBjb21waWxhdGlvbi5hc3NldHMpIHtcbiAgICAgICAgLy8gICBmaWxlbGlzdCArPSAoJy0gJysgZmlsZW5hbWUgKydcXG4nKTtcbiAgICAgICAgLy8gfVxuICAgICAgICAvLyAvLyBJbnNlcnQgdGhpcyBsaXN0IGludG8gdGhlIHdlYnBhY2sgYnVpbGQgYXMgYSBuZXcgZmlsZSBhc3NldDpcbiAgICAgICAgLy8gY29tcGlsYXRpb24uYXNzZXRzW2QgKyAnLm1kJ10gPSB7XG4gICAgICAgIC8vICAgc291cmNlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gICAgIHJldHVybiBmaWxlbGlzdDtcbiAgICAgICAgLy8gICB9LFxuICAgICAgICAvLyAgIHNpemU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyAgICAgcmV0dXJuIGZpbGVsaXN0Lmxlbmd0aDtcbiAgICAgICAgLy8gICB9XG4gICAgICAgIC8vIH07Il19