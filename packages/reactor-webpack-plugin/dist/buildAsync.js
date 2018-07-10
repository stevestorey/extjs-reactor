'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _rimraf = require('rimraf');

var _mkdirp = require('mkdirp');

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _artifacts = require('./artifacts');

var _readline = require('readline');

var readline = _interopRequireWildcard(_readline);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var chalk = require('chalk');
var util = require('./util.js');

var prefix = '';
if (require('os').platform() == 'darwin') {
  prefix = '\u2139 \uFF62ext\uFF63:';
} else {
  prefix = 'i [ext]:';
}

var app = chalk.green(prefix) + ' ext-build-async:';

var buildAsync = function () {
  function buildAsync(options) {
    _classCallCheck(this, buildAsync);

    this.isWebpack4 = options.isWebpack4;
    this.modules = options.modules;
    this.output = options.outputPath;
    this.build = options.build;
    this.callback = options.callback;
    this.watching = options.watching;
    this.treeShaking = options.treeShaking;
    this.dependencies = options.dependencies;
  }

  _createClass(buildAsync, [{
    key: 'executeAsync',
    value: function executeAsync() {
      console.log('in executeAsync');
      var toolkit = 'modern';
      var theme;
      var packages = [];
      var packageDirs = [];
      var sdk = '';
      var overrides;
      //, callback}

      //    let sencha = this._getSenchCmdPath();
      theme = theme || (toolkit === 'classic' ? 'theme-triton' : 'theme-material');

      if (!this.watching) {
        (0, _rimraf.sync)(this.output);
        (0, _mkdirp.sync)(this.output);
      }

      var js = void 0;
      if (this.treeShaking) {
        var statements = ['Ext.require(["Ext.app.Application", "Ext.Component", "Ext.Widget", "Ext.layout.Fit"])']; // for some reason command doesn't load component when only panel is required
        if (packages.indexOf('reactor') !== -1) {
          statements.push('Ext.require("Ext.reactor.RendererCell")');
        }
        //mjg
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = this.modules[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var _module = _step.value;

            var deps = this.dependencies[_module.resource];
            if (deps) statements = statements.concat(deps);
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator.return) {
              _iterator.return();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }

        js = statements.join(';\n');
      } else {
        js = 'Ext.require("Ext.*")';
      }
      var manifest = _path2.default.join(this.output, 'manifest.js');
      // add ext-react/packages automatically if present
      var userPackages = _path2.default.join('.', 'ext-react', 'packages');
      if (_fs2.default.existsSync(userPackages)) {
        packageDirs.push(userPackages);
      }

      if (_fs2.default.existsSync(_path2.default.join(sdk, 'ext'))) {
        // local checkout of the SDK repo
        packageDirs.push(_path2.default.join('ext', 'packages'));
        sdk = _path2.default.join(sdk, 'ext');
      }
      if (!this.watching) {
        _fs2.default.writeFileSync(_path2.default.join(this.output, 'build.xml'), (0, _artifacts.buildXML)({ compress: this.production }), 'utf8');
        _fs2.default.writeFileSync(_path2.default.join(this.output, 'jsdom-environment.js'), (0, _artifacts.createJSDOMEnvironment)(), 'utf8');
        _fs2.default.writeFileSync(_path2.default.join(this.output, 'app.json'), (0, _artifacts.createAppJson)({ theme: theme, packages: packages, toolkit: toolkit, overrides: overrides, packageDirs: packageDirs }), 'utf8');
        _fs2.default.writeFileSync(_path2.default.join(this.output, 'workspace.json'), (0, _artifacts.createWorkspaceJson)(sdk, packageDirs, this.output), 'utf8');
      }
      var cmdRebuildNeeded = false;
      if (this.manifest === null || js !== this.manifest) {
        // Only write manifest if it differs from the last run.  This prevents unnecessary cmd rebuilds.
        this.manifest = js;
        //readline.cursorTo(process.stdout, 0);console.log(app + js)
        readline.cursorTo(process.stdout, 0);console.log(app + 'tree shaking: ' + this.treeShaking);
        _fs2.default.writeFileSync(manifest, js, 'utf8');
        cmdRebuildNeeded = true;
        readline.cursorTo(process.stdout, 0);console.log(app + ('building ExtReact bundle at: ' + this.output));
      }

      var me = this;
      return new Promise(function () {
        var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(resolve, reject) {
          var parms;
          return regeneratorRuntime.wrap(function _callee$(_context) {
            while (1) {
              switch (_context.prev = _context.next) {
                case 0:
                  parms = ['ant', 'watch'];

                  if (me.verbose == 'yes') {
                    console.log(app + ' passing to \'sencha app build ' + me.profile + ' ' + me.environment + '\'');
                  }
                  _context.prev = 2;

                  console.log(app + ' passing to \'sencha ant watch\'');
                  _context.next = 6;
                  return util.senchaCmdAsync(parms, me.output, me.verbose);

                case 6:
                  console.log(app + ' after passing to \'sencha ant watch\'');

                  resolve(0);
                  _context.next = 13;
                  break;

                case 10:
                  _context.prev = 10;
                  _context.t0 = _context['catch'](2);

                  reject({ error: _context.t0 });

                case 13:
                case 'end':
                  return _context.stop();
              }
            }
          }, _callee, this, [[2, 10]]);
        }));

        return function (_x, _x2) {
          return _ref.apply(this, arguments);
        };
      }());

      // return new Promise((resolve, reject) => {
      //   this.onBuildFail = reject;
      //   this.onBuildSuccess = resolve;
      //   cmdErrors = [];

      //   const onBuildDone = () => {
      //     if (cmdErrors.length) {
      //       this.onBuildFail(new Error(cmdErrors.join("")));
      //     } else {
      //       this.onBuildSuccess();
      //     }
      //   }


      //   //if (!isWebpack4) {
      //     if (this.watch) {
      //       if (!watching) {
      //         watching = gatherErrors(fork(sencha, ['ant', 'watch'], { cwd: output, silent: true }));
      //         readline.cursorTo(process.stdout, 0);console.log(app + 'sencha ant watch')
      //         watching.stderr.pipe(process.stderr);
      //         watching.stdout.pipe(process.stdout);
      //         watching.stdout.on('data', data => {
      //           if (data && data.toString().match(/Waiting for changes\.\.\./)) {
      //             onBuildDone()
      //           }
      //         })
      //         watching.on('exit', onBuildDone)
      //       }
      //       if (!cmdRebuildNeeded) {
      //         readline.cursorTo(process.stdout, 0);console.log(app + 'Ext rebuild NOT needed')
      //         onBuildDone()
      //       }
      //       else {
      //         readline.cursorTo(process.stdout, 0);console.log(app + 'Ext rebuild IS needed')
      //       }
      //     } 
      //     else {
      //       const build = gatherErrors(fork(sencha, ['ant', 'build'], { stdio: 'inherit', encoding: 'utf-8', cwd: output, silent: false }));
      //       readline.cursorTo(process.stdout, 0);console.log(app + 'sencha ant build')
      //       if(build.stdout) { build.stdout.pipe(process.stdout) }
      //       if(build.stderr) { build.stderr.pipe(process.stderr) }
      //       build.on('exit', onBuildDone);
      //     }
      //   //}


      //    });

    }
  }]);

  return buildAsync;
}();

module.exports = buildAsync;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9idWlsZEFzeW5jLmpzIl0sIm5hbWVzIjpbInJlYWRsaW5lIiwiY2hhbGsiLCJyZXF1aXJlIiwidXRpbCIsInByZWZpeCIsInBsYXRmb3JtIiwiYXBwIiwiZ3JlZW4iLCJidWlsZEFzeW5jIiwib3B0aW9ucyIsImlzV2VicGFjazQiLCJtb2R1bGVzIiwib3V0cHV0Iiwib3V0cHV0UGF0aCIsImJ1aWxkIiwiY2FsbGJhY2siLCJ3YXRjaGluZyIsInRyZWVTaGFraW5nIiwiZGVwZW5kZW5jaWVzIiwiY29uc29sZSIsImxvZyIsInRvb2xraXQiLCJ0aGVtZSIsInBhY2thZ2VzIiwicGFja2FnZURpcnMiLCJzZGsiLCJvdmVycmlkZXMiLCJqcyIsInN0YXRlbWVudHMiLCJpbmRleE9mIiwicHVzaCIsIm1vZHVsZSIsImRlcHMiLCJyZXNvdXJjZSIsImNvbmNhdCIsImpvaW4iLCJtYW5pZmVzdCIsInBhdGgiLCJ1c2VyUGFja2FnZXMiLCJmcyIsImV4aXN0c1N5bmMiLCJ3cml0ZUZpbGVTeW5jIiwiY29tcHJlc3MiLCJwcm9kdWN0aW9uIiwiY21kUmVidWlsZE5lZWRlZCIsImN1cnNvclRvIiwicHJvY2VzcyIsInN0ZG91dCIsIm1lIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJwYXJtcyIsInZlcmJvc2UiLCJwcm9maWxlIiwiZW52aXJvbm1lbnQiLCJzZW5jaGFDbWRBc3luYyIsImVycm9yIiwiZXhwb3J0cyJdLCJtYXBwaW5ncyI6Ijs7OztBQUVBOztBQUNBOztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7QUFDQTs7SUFBWUEsUTs7Ozs7Ozs7OztBQVBaLElBQU1DLFFBQVFDLFFBQVEsT0FBUixDQUFkO0FBQ0EsSUFBTUMsT0FBT0QsUUFBUSxXQUFSLENBQWI7O0FBT0EsSUFBSUUsV0FBSjtBQUNBLElBQUlGLFFBQVEsSUFBUixFQUFjRyxRQUFkLE1BQTRCLFFBQWhDLEVBQTBDO0FBQ3hDRDtBQUNELENBRkQsTUFHSztBQUNIQTtBQUNEOztB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O0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUNiQyx1QkFEYSxHQUNMLENBQUMsS0FBRCxFQUFPLE9BQVAsQ0FESzs7QUFFakIsc0JBQUlKLEdBQUdLLE9BQUgsSUFBYyxLQUFsQixFQUF5QjtBQUN2QmxDLDRCQUFRQyxHQUFSLENBQWVkLEdBQWYsdUNBQW1EMEMsR0FBR00sT0FBdEQsU0FBaUVOLEdBQUdPLFdBQXBFO0FBQ0Q7QUFKZ0I7O0FBTWZwQywwQkFBUUMsR0FBUixDQUFlZCxHQUFmO0FBTmU7QUFBQSx5QkFPVEgsS0FBS3FELGNBQUwsQ0FBb0JKLEtBQXBCLEVBQTJCSixHQUFHcEMsTUFBOUIsRUFBc0NvQyxHQUFHSyxPQUF6QyxDQVBTOztBQUFBO0FBUWZsQywwQkFBUUMsR0FBUixDQUFlZCxHQUFmOztBQUVBNEMsMEJBQVEsQ0FBUjtBQVZlO0FBQUE7O0FBQUE7QUFBQTtBQUFBOztBQVlmQyx5QkFBTyxFQUFDTSxrQkFBRCxFQUFQOztBQVplO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLFNBQVo7O0FBQUE7QUFBQTtBQUFBO0FBQUEsVUFBUDs7QUFtQkE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBR0o7O0FBMkJHOzs7Ozs7QUFJSDFCLE9BQU8yQixPQUFQLEdBQWlCbEQsVUFBakIiLCJmaWxlIjoiYnVpbGRBc3luYy5qcyIsInNvdXJjZXNDb250ZW50IjpbImNvbnN0IGNoYWxrID0gcmVxdWlyZSgnY2hhbGsnKTtcbmNvbnN0IHV0aWwgPSByZXF1aXJlKCcuL3V0aWwuanMnKVxuaW1wb3J0IHsgc3luYyBhcyByaW1yYWYgfSBmcm9tICdyaW1yYWYnO1xuaW1wb3J0IHsgc3luYyBhcyBta2RpcnAgfSBmcm9tICdta2RpcnAnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHsgYnVpbGRYTUwsIGNyZWF0ZUFwcEpzb24sIGNyZWF0ZVdvcmtzcGFjZUpzb24sIGNyZWF0ZUpTRE9NRW52aXJvbm1lbnQgfSBmcm9tICcuL2FydGlmYWN0cyc7XG5pbXBvcnQgKiBhcyByZWFkbGluZSBmcm9tICdyZWFkbGluZSdcbnZhciBwcmVmaXggPSBgYFxuaWYgKHJlcXVpcmUoJ29zJykucGxhdGZvcm0oKSA9PSAnZGFyd2luJykge1xuICBwcmVmaXggPSBg4oS5IO+9omV4dO+9ozpgXG59XG5lbHNlIHtcbiAgcHJlZml4ID0gYGkgW2V4dF06YFxufVxuXG52YXIgYXBwID0gYCR7Y2hhbGsuZ3JlZW4ocHJlZml4KX0gZXh0LWJ1aWxkLWFzeW5jOmA7XG5cbmNsYXNzIGJ1aWxkQXN5bmMge1xuXG4gIGNvbnN0cnVjdG9yKG9wdGlvbnMpIHtcbiAgICB0aGlzLmlzV2VicGFjazQgPSBvcHRpb25zLmlzV2VicGFjazRcbiAgICB0aGlzLm1vZHVsZXMgPSBvcHRpb25zLm1vZHVsZXNcbiAgICB0aGlzLm91dHB1dCA9IG9wdGlvbnMub3V0cHV0UGF0aFxuICAgIHRoaXMuYnVpbGQgPSBvcHRpb25zLmJ1aWxkXG4gICAgdGhpcy5jYWxsYmFjayA9IG9wdGlvbnMuY2FsbGJhY2tcbiAgICB0aGlzLndhdGNoaW5nID0gb3B0aW9ucy53YXRjaGluZ1xuICAgIHRoaXMudHJlZVNoYWtpbmcgPSBvcHRpb25zLnRyZWVTaGFraW5nXG4gICAgdGhpcy5kZXBlbmRlbmNpZXMgPSBvcHRpb25zLmRlcGVuZGVuY2llc1xuICB9XG5cbiAgZXhlY3V0ZUFzeW5jKCkge1xuICAgIGNvbnNvbGUubG9nKCdpbiBleGVjdXRlQXN5bmMnKVxuICAgIHZhciB0b29sa2l0PSdtb2Rlcm4nXG4gICAgdmFyIHRoZW1lXG4gICAgdmFyIHBhY2thZ2VzPVtdXG4gICAgdmFyIHBhY2thZ2VEaXJzPVtdXG4gICAgdmFyIHNkayA9ICcnXG4gICAgdmFyIG92ZXJyaWRlc1xuICAgIC8vLCBjYWxsYmFja31cblxuLy8gICAgbGV0IHNlbmNoYSA9IHRoaXMuX2dldFNlbmNoQ21kUGF0aCgpO1xuICAgIHRoZW1lID0gdGhlbWUgfHwgKHRvb2xraXQgPT09ICdjbGFzc2ljJyA/ICd0aGVtZS10cml0b24nIDogJ3RoZW1lLW1hdGVyaWFsJyk7XG5cbiAgICBpZiAoIXRoaXMud2F0Y2hpbmcpIHtcbiAgICAgIHJpbXJhZih0aGlzLm91dHB1dCk7XG4gICAgICBta2RpcnAodGhpcy5vdXRwdXQpO1xuICAgIH1cblxuICAgIGxldCBqcztcbiAgICBpZiAodGhpcy50cmVlU2hha2luZykge1xuICAgICAgbGV0IHN0YXRlbWVudHMgPSBbJ0V4dC5yZXF1aXJlKFtcIkV4dC5hcHAuQXBwbGljYXRpb25cIiwgXCJFeHQuQ29tcG9uZW50XCIsIFwiRXh0LldpZGdldFwiLCBcIkV4dC5sYXlvdXQuRml0XCJdKSddOyAvLyBmb3Igc29tZSByZWFzb24gY29tbWFuZCBkb2Vzbid0IGxvYWQgY29tcG9uZW50IHdoZW4gb25seSBwYW5lbCBpcyByZXF1aXJlZFxuICAgICAgaWYgKHBhY2thZ2VzLmluZGV4T2YoJ3JlYWN0b3InKSAhPT0gLTEpIHtcbiAgICAgICAgc3RhdGVtZW50cy5wdXNoKCdFeHQucmVxdWlyZShcIkV4dC5yZWFjdG9yLlJlbmRlcmVyQ2VsbFwiKScpO1xuICAgICAgfVxuICAgICAgLy9tamdcbiAgICAgIGZvciAobGV0IG1vZHVsZSBvZiB0aGlzLm1vZHVsZXMpIHtcbiAgICAgICAgY29uc3QgZGVwcyA9IHRoaXMuZGVwZW5kZW5jaWVzW21vZHVsZS5yZXNvdXJjZV07XG4gICAgICAgIGlmIChkZXBzKSBzdGF0ZW1lbnRzID0gc3RhdGVtZW50cy5jb25jYXQoZGVwcyk7XG4gICAgICB9XG4gICAgICBqcyA9IHN0YXRlbWVudHMuam9pbignO1xcbicpO1xuICAgIH0gZWxzZSB7XG4gICAgICBqcyA9ICdFeHQucmVxdWlyZShcIkV4dC4qXCIpJztcbiAgICB9XG4gICAgY29uc3QgbWFuaWZlc3QgPSBwYXRoLmpvaW4odGhpcy5vdXRwdXQsICdtYW5pZmVzdC5qcycpO1xuICAgIC8vIGFkZCBleHQtcmVhY3QvcGFja2FnZXMgYXV0b21hdGljYWxseSBpZiBwcmVzZW50XG4gICAgY29uc3QgdXNlclBhY2thZ2VzID0gcGF0aC5qb2luKCcuJywgJ2V4dC1yZWFjdCcsICdwYWNrYWdlcycpO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKHVzZXJQYWNrYWdlcykpIHtcbiAgICAgIHBhY2thZ2VEaXJzLnB1c2godXNlclBhY2thZ2VzKVxuICAgIH1cblxuICAgIGlmIChmcy5leGlzdHNTeW5jKHBhdGguam9pbihzZGssICdleHQnKSkpIHtcbiAgICAgIC8vIGxvY2FsIGNoZWNrb3V0IG9mIHRoZSBTREsgcmVwb1xuICAgICAgcGFja2FnZURpcnMucHVzaChwYXRoLmpvaW4oJ2V4dCcsICdwYWNrYWdlcycpKTtcbiAgICAgIHNkayA9IHBhdGguam9pbihzZGssICdleHQnKTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLndhdGNoaW5nKSB7XG4gICAgICBmcy53cml0ZUZpbGVTeW5jKHBhdGguam9pbih0aGlzLm91dHB1dCwgJ2J1aWxkLnhtbCcpLCBidWlsZFhNTCh7IGNvbXByZXNzOiB0aGlzLnByb2R1Y3Rpb24gfSksICd1dGY4Jyk7XG4gICAgICBmcy53cml0ZUZpbGVTeW5jKHBhdGguam9pbih0aGlzLm91dHB1dCwgJ2pzZG9tLWVudmlyb25tZW50LmpzJyksIGNyZWF0ZUpTRE9NRW52aXJvbm1lbnQoKSwgJ3V0ZjgnKTtcbiAgICAgIGZzLndyaXRlRmlsZVN5bmMocGF0aC5qb2luKHRoaXMub3V0cHV0LCAnYXBwLmpzb24nKSwgY3JlYXRlQXBwSnNvbih7IHRoZW1lLCBwYWNrYWdlcywgdG9vbGtpdCwgb3ZlcnJpZGVzLCBwYWNrYWdlRGlycyB9KSwgJ3V0ZjgnKTtcbiAgICAgIGZzLndyaXRlRmlsZVN5bmMocGF0aC5qb2luKHRoaXMub3V0cHV0LCAnd29ya3NwYWNlLmpzb24nKSwgY3JlYXRlV29ya3NwYWNlSnNvbihzZGssIHBhY2thZ2VEaXJzLCB0aGlzLm91dHB1dCksICd1dGY4Jyk7XG4gICAgfVxuICAgIGxldCBjbWRSZWJ1aWxkTmVlZGVkID0gZmFsc2U7XG4gICAgaWYgKHRoaXMubWFuaWZlc3QgPT09IG51bGwgfHwganMgIT09IHRoaXMubWFuaWZlc3QpIHtcbiAgICAgIC8vIE9ubHkgd3JpdGUgbWFuaWZlc3QgaWYgaXQgZGlmZmVycyBmcm9tIHRoZSBsYXN0IHJ1bi4gIFRoaXMgcHJldmVudHMgdW5uZWNlc3NhcnkgY21kIHJlYnVpbGRzLlxuICAgICAgdGhpcy5tYW5pZmVzdCA9IGpzO1xuICAgICAgLy9yZWFkbGluZS5jdXJzb3JUbyhwcm9jZXNzLnN0ZG91dCwgMCk7Y29uc29sZS5sb2coYXBwICsganMpXG4gICAgICByZWFkbGluZS5jdXJzb3JUbyhwcm9jZXNzLnN0ZG91dCwgMCk7Y29uc29sZS5sb2coYXBwICsgJ3RyZWUgc2hha2luZzogJyArIHRoaXMudHJlZVNoYWtpbmcpXG4gICAgICBmcy53cml0ZUZpbGVTeW5jKG1hbmlmZXN0LCBqcywgJ3V0ZjgnKTtcbiAgICAgIGNtZFJlYnVpbGROZWVkZWQgPSB0cnVlO1xuICAgICAgcmVhZGxpbmUuY3Vyc29yVG8ocHJvY2Vzcy5zdGRvdXQsIDApO2NvbnNvbGUubG9nKGFwcCArIGBidWlsZGluZyBFeHRSZWFjdCBidW5kbGUgYXQ6ICR7dGhpcy5vdXRwdXR9YClcbiAgICB9XG5cbiAgICB2YXIgbWUgPSB0aGlzXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGFzeW5jIGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgdmFyIHBhcm1zID0gWydhbnQnLCd3YXRjaCddXG4gICAgICBpZiAobWUudmVyYm9zZSA9PSAneWVzJykge1xuICAgICAgICBjb25zb2xlLmxvZyhgJHthcHB9IHBhc3NpbmcgdG8gJ3NlbmNoYSBhcHAgYnVpbGQgJHttZS5wcm9maWxlfSAke21lLmVudmlyb25tZW50fSdgKVxuICAgICAgfVxuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc29sZS5sb2coYCR7YXBwfSBwYXNzaW5nIHRvICdzZW5jaGEgYW50IHdhdGNoJ2ApXG4gICAgICAgIGF3YWl0IHV0aWwuc2VuY2hhQ21kQXN5bmMocGFybXMsIG1lLm91dHB1dCwgbWUudmVyYm9zZSlcbiAgICAgICAgY29uc29sZS5sb2coYCR7YXBwfSBhZnRlciBwYXNzaW5nIHRvICdzZW5jaGEgYW50IHdhdGNoJ2ApXG5cbiAgICAgICAgcmVzb2x2ZSgwKTtcbiAgICAgIH0gY2F0Y2goZXJyKSB7XG4gICAgICAgIHJlamVjdCh7ZXJyb3I6IGVycn0pXG4gICAgICB9XG4gICAgfSlcblxuXG5cblxuICAgIC8vIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgLy8gICB0aGlzLm9uQnVpbGRGYWlsID0gcmVqZWN0O1xuICAgIC8vICAgdGhpcy5vbkJ1aWxkU3VjY2VzcyA9IHJlc29sdmU7XG4gICAgLy8gICBjbWRFcnJvcnMgPSBbXTtcbiAgICAgIFxuICAgIC8vICAgY29uc3Qgb25CdWlsZERvbmUgPSAoKSA9PiB7XG4gICAgLy8gICAgIGlmIChjbWRFcnJvcnMubGVuZ3RoKSB7XG4gICAgLy8gICAgICAgdGhpcy5vbkJ1aWxkRmFpbChuZXcgRXJyb3IoY21kRXJyb3JzLmpvaW4oXCJcIikpKTtcbiAgICAvLyAgICAgfSBlbHNlIHtcbiAgICAvLyAgICAgICB0aGlzLm9uQnVpbGRTdWNjZXNzKCk7XG4gICAgLy8gICAgIH1cbiAgICAvLyAgIH1cblxuXG5cbiAgICAvLyAgIC8vaWYgKCFpc1dlYnBhY2s0KSB7XG4gICAgLy8gICAgIGlmICh0aGlzLndhdGNoKSB7XG4gICAgLy8gICAgICAgaWYgKCF3YXRjaGluZykge1xuICAgIC8vICAgICAgICAgd2F0Y2hpbmcgPSBnYXRoZXJFcnJvcnMoZm9yayhzZW5jaGEsIFsnYW50JywgJ3dhdGNoJ10sIHsgY3dkOiBvdXRwdXQsIHNpbGVudDogdHJ1ZSB9KSk7XG4gICAgLy8gICAgICAgICByZWFkbGluZS5jdXJzb3JUbyhwcm9jZXNzLnN0ZG91dCwgMCk7Y29uc29sZS5sb2coYXBwICsgJ3NlbmNoYSBhbnQgd2F0Y2gnKVxuICAgIC8vICAgICAgICAgd2F0Y2hpbmcuc3RkZXJyLnBpcGUocHJvY2Vzcy5zdGRlcnIpO1xuICAgIC8vICAgICAgICAgd2F0Y2hpbmcuc3Rkb3V0LnBpcGUocHJvY2Vzcy5zdGRvdXQpO1xuICAgIC8vICAgICAgICAgd2F0Y2hpbmcuc3Rkb3V0Lm9uKCdkYXRhJywgZGF0YSA9PiB7XG4gICAgLy8gICAgICAgICAgIGlmIChkYXRhICYmIGRhdGEudG9TdHJpbmcoKS5tYXRjaCgvV2FpdGluZyBmb3IgY2hhbmdlc1xcLlxcLlxcLi8pKSB7XG4gICAgLy8gICAgICAgICAgICAgb25CdWlsZERvbmUoKVxuICAgIC8vICAgICAgICAgICB9XG4gICAgLy8gICAgICAgICB9KVxuICAgIC8vICAgICAgICAgd2F0Y2hpbmcub24oJ2V4aXQnLCBvbkJ1aWxkRG9uZSlcbiAgICAvLyAgICAgICB9XG4gICAgLy8gICAgICAgaWYgKCFjbWRSZWJ1aWxkTmVlZGVkKSB7XG4gICAgLy8gICAgICAgICByZWFkbGluZS5jdXJzb3JUbyhwcm9jZXNzLnN0ZG91dCwgMCk7Y29uc29sZS5sb2coYXBwICsgJ0V4dCByZWJ1aWxkIE5PVCBuZWVkZWQnKVxuICAgIC8vICAgICAgICAgb25CdWlsZERvbmUoKVxuICAgIC8vICAgICAgIH1cbiAgICAvLyAgICAgICBlbHNlIHtcbiAgICAvLyAgICAgICAgIHJlYWRsaW5lLmN1cnNvclRvKHByb2Nlc3Muc3Rkb3V0LCAwKTtjb25zb2xlLmxvZyhhcHAgKyAnRXh0IHJlYnVpbGQgSVMgbmVlZGVkJylcbiAgICAvLyAgICAgICB9XG4gICAgLy8gICAgIH0gXG4gICAgLy8gICAgIGVsc2Uge1xuICAgIC8vICAgICAgIGNvbnN0IGJ1aWxkID0gZ2F0aGVyRXJyb3JzKGZvcmsoc2VuY2hhLCBbJ2FudCcsICdidWlsZCddLCB7IHN0ZGlvOiAnaW5oZXJpdCcsIGVuY29kaW5nOiAndXRmLTgnLCBjd2Q6IG91dHB1dCwgc2lsZW50OiBmYWxzZSB9KSk7XG4gICAgLy8gICAgICAgcmVhZGxpbmUuY3Vyc29yVG8ocHJvY2Vzcy5zdGRvdXQsIDApO2NvbnNvbGUubG9nKGFwcCArICdzZW5jaGEgYW50IGJ1aWxkJylcbiAgICAvLyAgICAgICBpZihidWlsZC5zdGRvdXQpIHsgYnVpbGQuc3Rkb3V0LnBpcGUocHJvY2Vzcy5zdGRvdXQpIH1cbiAgICAvLyAgICAgICBpZihidWlsZC5zdGRlcnIpIHsgYnVpbGQuc3RkZXJyLnBpcGUocHJvY2Vzcy5zdGRlcnIpIH1cbiAgICAvLyAgICAgICBidWlsZC5vbignZXhpdCcsIG9uQnVpbGREb25lKTtcbiAgICAvLyAgICAgfVxuICAgIC8vICAgLy99XG5cblxuLy8gICAgfSk7XG5cblxuXG5cblxuXG5cblxuXG5cblxuXG5cblxuXG5cblxuXG5cblxuXG5cblxuXG5cblxuICB9XG5cblxufVxubW9kdWxlLmV4cG9ydHMgPSBidWlsZEFzeW5jIl19