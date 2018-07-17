'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

require('babel-polyfill');

var _chalk = require('chalk');

var _chalk2 = _interopRequireDefault(_chalk);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _cjson = require('cjson');

var _cjson2 = _interopRequireDefault(_cjson);

var _mkdirp = require('mkdirp');

var _extractFromJSX = require('./extractFromJSX');

var _extractFromJSX2 = _interopRequireDefault(_extractFromJSX);

var _rimraf = require('rimraf');

var _artifacts = require('./artifacts');

var _child_process = require('child_process');

var _astring = require('astring');

var _resolve = require('resolve');

var _readline = require('readline');

var readline = _interopRequireWildcard(_readline);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var reactVersion = 0;

var watching = false;
var cmdErrors = void 0;
var app = _chalk2.default.green('ℹ ｢ext｣:') + ' reactor-webpack-plugin: ';


var gatherErrors = function gatherErrors(cmd) {
  if (cmd.stdout) {
    cmd.stdout.on('data', function (data) {
      var message = data.toString();
      if (message.match(/^\[ERR\]/)) {
        cmdErrors.push(message.replace(/^\[ERR\] /gi, ''));
      }
    });
  }
  return cmd;
};

module.exports = function () {
  /**
   * @param {Object[]} builds
   * @param {Boolean} [debug=false] Set to true to prevent cleanup of build temporary build artifacts that might be helpful in troubleshooting issues.
   * @param {String} sdk The full path to the ExtReact SDK
   * @param {String} [toolkit='modern'] "modern" or "classic"
   * @param {String} theme The name of the ExtReact theme package to use, for example "theme-material"
   * @param {String[]} packages An array of ExtReact packages to include
   * @param {String[]} overrides An array with the paths of directories or files to search. Any classes
   * declared in these locations will be automatically required and included in the build.
   * If any file defines an ExtReact override (using Ext.define with an "override" property),
   * that override will in fact only be included in the build if the target class specified
   * in the "override" property is also included.
   * @param {String} output The path to directory where the ExtReact bundle should be written
   * @param {Boolean} asynchronous Set to true to run Sencha Cmd builds asynchronously. This makes the webpack build finish much faster, but the app may not load correctly in your browser until Sencha Cmd is finished building the ExtReact bundle
   * @param {Boolean} production Set to true for production builds.  This tell Sencha Cmd to compress the generated JS bundle.
   * @param {Boolean} treeShaking Set to false to disable tree shaking in development builds.  This makes incremental rebuilds faster as all ExtReact components are included in the ext.js bundle in the initial build and thus the bundle does not need to be rebuilt after each change. Defaults to true.
   */
  function ReactExtJSWebpackPlugin(options) {
    _classCallCheck(this, ReactExtJSWebpackPlugin);

    this.count = 0;
    //can be in devdependencies - account for this: react: "15.16.0"
    //var pkg = (fs.existsSync('package.json') && JSON.parse(fs.readFileSync('package.json', 'utf-8')) || {});
    //var reactEntry = pkg.dependencies.react
    //var is16 = reactEntry.includes("16");
    var REACT_VERSION = require('react').version;
    var is16 = REACT_VERSION.includes("16");

    if (is16) {
      reactVersion = 16;
    } else {
      reactVersion = 15;
    }
    this.reactVersion = reactVersion;
    var extReactRc = _fs2.default.existsSync('.ext-reactrc') && JSON.parse(_fs2.default.readFileSync('.ext-reactrc', 'utf-8')) || {};
    options = _extends({}, this.getDefaultOptions(), options, extReactRc);
    var _options = options,
        builds = _options.builds;

    if (Object.keys(builds).length === 0) {
      var _options2 = options,
          _builds = _options2.builds,
          buildOptions = _objectWithoutProperties(_options2, ['builds']);

      _builds.ext = buildOptions;
    }
    for (var name in builds) {
      this._validateBuildConfig(name, builds[name]);
    }Object.assign(this, _extends({}, options, {
      currentFile: null,
      manifest: null,
      dependencies: []
    }));
  }

  _createClass(ReactExtJSWebpackPlugin, [{
    key: 'watchRun',
    value: function watchRun() {
      this.watch = true;
    }
  }, {
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
        readline.cursorTo(process.stdout, 0);console.log(app + 'reactVersion: ' + this.reactVersion + ', ' + this.webpackVersion);
      }
      var me = this;

      if (compiler.hooks) {
        if (this.asynchronous) {
          compiler.hooks.watchRun.tapAsync('extreact-watch-run (async)', function (watching, cb) {
            readline.cursorTo(process.stdout, 0);console.log(app + 'extreact-watch-run (async)');
            _this.watchRun();
            cb();
          });
        } else {
          compiler.hooks.watchRun.tap('extreact-watch-run', function (watching) {
            readline.cursorTo(process.stdout, 0);console.log(app + 'extreact-watch-run');
            _this.watchRun();
          });
        }
      } else {
        compiler.plugin('watch-run', function (watching, cb) {
          readline.cursorTo(process.stdout, 0);console.log(app + 'watch-run');
          _this.watchRun();
          cb();
        });
      }

      /**
       * Adds the code for the specified function call to the manifest.js file
       * @param {Object} call A function call AST node.
       */
      var addToManifest = function addToManifest(call) {
        try {
          var _file = this.state.module.resource;
          me.dependencies[_file] = [].concat(_toConsumableArray(me.dependencies[_file] || []), [(0, _astring.generate)(call)]);
        } catch (e) {
          console.error('Error processing ' + file);
        }
      };

      if (compiler.hooks) {
        compiler.hooks.compilation.tap('extreact-compilation', function (compilation, data) {
          readline.cursorTo(process.stdout, 0);console.log(app + 'extreact-compilation');
          compilation.hooks.succeedModule.tap('extreact-succeed-module', function (module) {
            _this.succeedModule(compilation, module);
          });

          data.normalModuleFactory.plugin("parser", function (parser, options) {
            // extract xtypes and classes from Ext.create calls
            parser.plugin('call Ext.create', addToManifest);
            // copy Ext.require calls to the manifest.  This allows the users to explicitly require a class if the plugin fails to detect it.
            parser.plugin('call Ext.require', addToManifest);
            // copy Ext.define calls to the manifest.  This allows users to write standard ExtReact classes.
            parser.plugin('call Ext.define', addToManifest);
          });
        });
      } else {
        compiler.plugin('compilation', function (compilation, data) {
          readline.cursorTo(process.stdout, 0);console.log(app + 'compilation');
          compilation.plugin('succeed-module', function (module) {
            _this.succeedModule(compilation, module);
          });
          data.normalModuleFactory.plugin("parser", function (parser, options) {
            // extract xtypes and classes from Ext.create calls
            parser.plugin('call Ext.create', addToManifest);
            // copy Ext.require calls to the manifest.  This allows the users to explicitly require a class if the plugin fails to detect it.
            parser.plugin('call Ext.require', addToManifest);
            // copy Ext.define calls to the manifest.  This allows users to write standard ExtReact classes.
            parser.plugin('call Ext.define', addToManifest);
          });
        });
      }

      //*emit - once all modules are processed, create the optimized ExtReact build.
      if (compiler.hooks) {
        //if (this.asynchronous) {
        if (true) {
          compiler.hooks.emit.tapAsync('extreact-emit (async)', function (compilation, callback) {
            readline.cursorTo(process.stdout, 0);console.log(app + 'extreact-emit  (async)');
            _this.emit(compiler, compilation, callback);
            //console.log(app + 'after extreact-emit  (async)')
          });
        } else {
          compiler.hooks.emit.tap('extreact-emit', function (compilation) {
            readline.cursorTo(process.stdout, 0);console.log(app + 'extreact-emit');
            _this.emit(compiler, compilation);
            console.log(app + 'after extreact-emit');
          });
        }
      } else {
        compiler.plugin('emit', function (compilation, callback) {
          readline.cursorTo(process.stdout, 0);console.log(app + 'emit');
          _this.emit(compiler, compilation, callback);
          callback();
        });
      }

      if (compiler.hooks) {
        if (this.asynchronous) {
          compiler.hooks.done.tapAsync('extreact-done (async)', function (compilation, callback) {
            readline.cursorTo(process.stdout, 0);console.log(app + 'extreact-done (async)');
            if (callback != null) {
              if (_this.asynchronous) {
                console.log('calling callback for extreact-emit  (async)');
                callback();
              }
            }
          });
        } else {
          compiler.hooks.done.tap('extreact-done', function () {
            readline.cursorTo(process.stdout, 0);console.log(app + 'extreact-done');
          });
        }
      }
    }
  }, {
    key: 'emit',
    value: function () {
      var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(compiler, compilation, callback) {
        var isWebpack4, modules, build, outputPath, promise, result, url, opn;
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                isWebpack4 = compilation.hooks;
                modules = [];

                if (isWebpack4) {
                  isWebpack4 = true;
                  //modules = compilation.chunks.reduce((a, b) => a.concat(b._modules), []);
                } else {
                  isWebpack4 = false;
                  //modules = compilation.chunks.reduce((a, b) => a.concat(b.modules), []);
                }
                build = this.builds[Object.keys(this.builds)[0]];
                outputPath = _path2.default.join(compiler.outputPath, this.output);
                // webpack-dev-server overwrites the outputPath to "/", so we need to prepend contentBase

                if (compiler.outputPath === '/' && compiler.options.devServer) {
                  outputPath = _path2.default.join(compiler.options.devServer.contentBase, outputPath);
                }
                //console.log('\n*****outputPath: ' + outputPath)

                promise = this._buildExtBundle(isWebpack4, 'not', modules, outputPath, build, callback);
                _context.next = 9;
                return promise;

              case 9:
                result = _context.sent;


                if (this.watch) {
                  if (this.count == 0) {
                    url = 'http://localhost:' + this.port;

                    readline.cursorTo(process.stdout, 0);console.log(app + 'extreact-emit - open browser at ' + url);
                    this.count++;
                    opn = require('opn');

                    opn(url);
                  }
                }
                //if (callback != null){if (this.asynchronous){callback()}}
                if (callback != null) {
                  if (true) {
                    callback();
                  }
                }

              case 12:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function emit(_x, _x2, _x3) {
        return _ref.apply(this, arguments);
      }

      return emit;
    }()

    /**
     /**
      * Builds a minimal version of the ExtReact framework based on the classes used
      * @param {String} name The name of the build
      * @param {Module[]} modules webpack modules
      * @param {String} output The path to where the framework build should be written
      * @param {String} [toolkit='modern'] "modern" or "classic"
      * @param {String} output The path to the directory to create which will contain the js and css bundles
      * @param {String} theme The name of the ExtReact theme package to use, for example "theme-material"
      * @param {String[]} packages An array of ExtReact packages to include
      * @param {String[]} packageDirs Directories containing packages
      * @param {String[]} overrides An array of locations for overrides
      * @param {String} sdk The full path to the ExtReact SDK
      * @private
      */

  }, {
    key: '_buildExtBundle',
    value: function _buildExtBundle(isWebpack4, name, modules, output, _ref2) {
      var _this2 = this;

      var _ref2$toolkit = _ref2.toolkit,
          toolkit = _ref2$toolkit === undefined ? 'modern' : _ref2$toolkit,
          theme = _ref2.theme,
          _ref2$packages = _ref2.packages,
          packages = _ref2$packages === undefined ? [] : _ref2$packages,
          _ref2$packageDirs = _ref2.packageDirs,
          packageDirs = _ref2$packageDirs === undefined ? [] : _ref2$packageDirs,
          sdk = _ref2.sdk,
          overrides = _ref2.overrides,
          callback = _ref2.callback;

      var sencha = this._getSenchCmdPath();
      theme = theme || (toolkit === 'classic' ? 'theme-triton' : 'theme-material');

      return new Promise(function (resolve, reject) {
        _this2.onBuildFail = reject;
        _this2.onBuildSuccess = resolve;
        cmdErrors = [];

        var onBuildDone = function onBuildDone() {
          if (cmdErrors.length) {
            _this2.onBuildFail(new Error(cmdErrors.join("")));
          } else {
            _this2.onBuildSuccess();
          }
        };

        if (!watching) {
          (0, _rimraf.sync)(output);
          (0, _mkdirp.sync)(output);
        }

        var js = void 0;
        if (_this2.treeShaking) {
          var statements = ['Ext.require(["Ext.app.Application", "Ext.Component", "Ext.Widget", "Ext.layout.Fit"])']; // for some reason command doesn't load component when only panel is required
          if (packages.indexOf('reactor') !== -1) {
            statements.push('Ext.require("Ext.reactor.RendererCell")');
          }
          //mjg
          var _iteratorNormalCompletion = true;
          var _didIteratorError = false;
          var _iteratorError = undefined;

          try {
            for (var _iterator = modules[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
              var _module = _step.value;

              var deps = _this2.dependencies[_module.resource];
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
        var manifest = _path2.default.join(output, 'manifest.js');
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
        if (!watching) {
          _fs2.default.writeFileSync(_path2.default.join(output, 'build.xml'), (0, _artifacts.buildXML)({ compress: _this2.production }), 'utf8');
          _fs2.default.writeFileSync(_path2.default.join(output, 'jsdom-environment.js'), (0, _artifacts.createJSDOMEnvironment)(), 'utf8');
          _fs2.default.writeFileSync(_path2.default.join(output, 'app.json'), (0, _artifacts.createAppJson)({ theme: theme, packages: packages, toolkit: toolkit, overrides: overrides, packageDirs: packageDirs }), 'utf8');
          _fs2.default.writeFileSync(_path2.default.join(output, 'workspace.json'), (0, _artifacts.createWorkspaceJson)(sdk, packageDirs, output), 'utf8');
        }
        var cmdRebuildNeeded = false;
        if (_this2.manifest === null || js !== _this2.manifest) {
          // Only write manifest if it differs from the last run.  This prevents unnecessary cmd rebuilds.
          _this2.manifest = js;
          //readline.cursorTo(process.stdout, 0);console.log(app + js)
          readline.cursorTo(process.stdout, 0);console.log(app + 'tree shaking: ' + _this2.treeShaking);
          _fs2.default.writeFileSync(manifest, js, 'utf8');
          cmdRebuildNeeded = true;
          readline.cursorTo(process.stdout, 0);console.log(app + ('building ExtReact bundle at: ' + output));
        }

        if (_this2.watch) {
          if (!watching) {
            watching = gatherErrors((0, _child_process.fork)(sencha, ['ant', 'watch'], { cwd: output, silent: true }));
            watching.stderr.pipe(process.stderr);
            watching.stdout.pipe(process.stdout);
            watching.stdout.on('data', function (data) {
              if (data && data.toString().match(/Waiting for changes\.\.\./)) {
                onBuildDone();
              }
            });
            watching.on('exit', onBuildDone);
          }
          if (!cmdRebuildNeeded) {
            readline.cursorTo(process.stdout, 0);console.log(app + 'Ext rebuild NOT needed');
            onBuildDone();
          } else {
            //readline.cursorTo(process.stdout, 0);console.log(app + 'Ext rebuild IS needed')
          }
        } else {
          var build = gatherErrors((0, _child_process.fork)(sencha, ['ant', 'build'], { stdio: 'inherit', encoding: 'utf-8', cwd: output, silent: false }));
          readline.cursorTo(process.stdout, 0);console.log(app + 'sencha ant build');
          if (build.stdout) {
            build.stdout.pipe(process.stdout);
          }
          if (build.stderr) {
            build.stderr.pipe(process.stderr);
          }
          build.on('exit', onBuildDone);
        }
      });
    }

    /**
     * Default config options
     * @protected
     * @return {Object}
     */

  }, {
    key: 'getDefaultOptions',
    value: function getDefaultOptions() {
      return {
        port: 8016,
        builds: {},
        debug: false,
        watch: false,
        test: /\.(j|t)sx?$/,

        /* begin single build only */
        output: 'ext-react',
        toolkit: 'modern',
        packages: null,
        packageDirs: [],
        overrides: [],
        asynchronous: false,
        production: false,
        manifestExtractor: _extractFromJSX2.default,
        treeShaking: false
        /* end single build only */
      };
    }
  }, {
    key: 'succeedModule',
    value: function succeedModule(compilation, module) {
      var _this3 = this;

      this.currentFile = module.resource;
      if (module.resource && module.resource.match(this.test) && !module.resource.match(/node_modules/) && !module.resource.match('/reactor' + reactVersion + '/')) {
        var doParse = function doParse() {
          _this3.dependencies[_this3.currentFile] = [].concat(_toConsumableArray(_this3.dependencies[_this3.currentFile] || []), _toConsumableArray(_this3.manifestExtractor(module._source._value, compilation, module, reactVersion)));
        };
        if (this.debug) {
          doParse();
        } else {
          try {
            doParse();
          } catch (e) {
            console.error('\nerror parsing ' + this.currentFile);
            console.error(e);
          }
        }
      }
    }

    /**
     * Checks each build config for missing/invalid properties
     * @param {String} name The name of the build
     * @param {String} build The build config
     * @private
     */

  }, {
    key: '_validateBuildConfig',
    value: function _validateBuildConfig(name, build) {
      var sdk = build.sdk,
          production = build.production;


      if (production) {
        build.treeShaking = false;
      }
      if (sdk) {
        if (!_fs2.default.existsSync(sdk)) {
          throw new Error('No SDK found at ' + _path2.default.resolve(sdk) + '.  Did you for get to link/copy your Ext JS SDK to that location?');
        } else {
          this._addReactorPackage(build);
        }
      } else {
        try {
          build.sdk = _path2.default.dirname((0, _resolve.sync)('@extjs/ext-react', { basedir: process.cwd() }));
          build.packageDirs = [].concat(_toConsumableArray(build.packageDirs || []), [_path2.default.dirname(build.sdk)]);
          build.packages = build.packages || this._findPackages(build.sdk);
        } catch (e) {
          throw new Error('@extjs/ext-react not found.  You can install it with "npm install --save @extjs/ext-react" or, if you have a local copy of the SDK, specify the path to it using the "sdk" option in build "' + name + '."');
        }
      }
    }

    /**
     * Adds the reactor package if present and the toolkit is modern
     * @param {Object} build 
     */

  }, {
    key: '_addReactorPackage',
    value: function _addReactorPackage(build) {
      if (build.toolkit === 'classic') return;
      if (_fs2.default.existsSync(_path2.default.join(build.sdk, 'ext', 'modern', 'reactor')) || // repo
      _fs2.default.existsSync(_path2.default.join(build.sdk, 'modern', 'reactor'))) {
        // production build
        if (!build.packages) {
          build.packages = [];
        }
        build.packages.push('reactor');
      }
    }

    /**
     * Return the names of all ExtReact packages in the same parent directory as ext-react (typically node_modules/@extjs)
     * @private
     * @param {String} sdk Path to ext-react
     * @return {String[]}
     */

  }, {
    key: '_findPackages',
    value: function _findPackages(sdk) {
      var modulesDir = _path2.default.join(sdk, '..');
      return _fs2.default.readdirSync(modulesDir)
      // Filter out directories without 'package.json'
      .filter(function (dir) {
        return _fs2.default.existsSync(_path2.default.join(modulesDir, dir, 'package.json'));
      })
      // Generate array of package names
      .map(function (dir) {
        var packageInfo = JSON.parse(_fs2.default.readFileSync(_path2.default.join(modulesDir, dir, 'package.json')));
        // Don't include theme type packages.
        if (packageInfo.sencha && packageInfo.sencha.type !== 'theme') {
          return packageInfo.sencha.name;
        }
      })
      // Remove any undefineds from map
      .filter(function (name) {
        return name;
      });
    }

    /**
     * Returns the path to the sencha cmd executable
     * @private
     * @return {String}
     */

  }, {
    key: '_getSenchCmdPath',
    value: function _getSenchCmdPath() {
      try {
        // use @extjs/sencha-cmd from node_modules
        return require('@extjs/sencha-cmd');
      } catch (e) {
        // attempt to use globally installed Sencha Cmd
        return 'sencha';
      }
    }
  }]);

  return ReactExtJSWebpackPlugin;
}();

// in 'extreact-compilation'
//https://github.com/jaketrent/html-webpack-template
//https://github.com/jantimon/html-webpack-plugin#
// the following is needed for html-webpack-plugin to include <script> and <link> tags for ExtReact
// compilation.hooks.htmlWebpackPluginBeforeHtmlGeneration.tapAsync(
//   'extreact-htmlgeneration',
//   (data, cb) => {
//     readline.cursorTo(process.stdout, 0);console.log(app + 'extreact-htmlgeneration')
//     console.log('data.assets.js.length')
//     console.log(data.assets.js.length)
//     data.assets.js.unshift('ext-react/ext.js')
//     data.assets.css.unshift('ext-react/ext.css')
//     cb(null, data)
//   }
// )


// from this.emit
// the following is needed for html-webpack-plugin to include <script> and <link> tags for ExtReact
// console.log('compilation')
// console.log('********compilation.chunks[0]')
// console.log(compilation.chunks[0].id)
// console.log(path.join(this.output, 'ext.js'))
// const jsChunk = compilation.addChunk(`${this.output}-js`);
// jsChunk.hasRuntime = jsChunk.isInitial = () => true;
// jsChunk.files.push(path.join(this.output, 'ext.js'));
// jsChunk.files.push(path.join(this.output, 'ext.css'));
// jsChunk.id = 'aaaap'; // this forces html-webpack-plugin to include ext.js first
// console.log('********compilation.chunks[1]')
// console.log(compilation.chunks[1].id)

//if (this.asynchronous) callback();
//    console.log(callback)

// if (isWebpack4) {
//   console.log(path.join(this.output, 'ext.js'))
//   const stats = fs.statSync(path.join(outputPath, 'ext.js'))
//   const fileSizeInBytes = stats.size
//   compilation.assets['ext.js'] = {
//     source: function() {return fs.readFileSync(path.join(outputPath, 'ext.js'))},
//     size: function() {return fileSizeInBytes}
//   }
//   console.log(compilation.entrypoints)

//   var filelist = 'In this build:\n\n';

//   // Loop through all compiled assets,
//   // adding a new line item for each filename.
//   for (var filename in compilation.assets) {
//     filelist += ('- '+ filename +'\n');
//   }

//   // Insert this list into the webpack build as a new file asset:
//   compilation.assets['filelist.md'] = {
//     source() {
//       return filelist;
//     },
//     size() {
//       return filelist.length;
//     }
//   }
// }
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9pbmRleC5qcyJdLCJuYW1lcyI6WyJyZWFkbGluZSIsInJlYWN0VmVyc2lvbiIsIndhdGNoaW5nIiwiY21kRXJyb3JzIiwiYXBwIiwiY2hhbGsiLCJncmVlbiIsImdhdGhlckVycm9ycyIsImNtZCIsInN0ZG91dCIsIm9uIiwibWVzc2FnZSIsImRhdGEiLCJ0b1N0cmluZyIsIm1hdGNoIiwicHVzaCIsInJlcGxhY2UiLCJtb2R1bGUiLCJleHBvcnRzIiwib3B0aW9ucyIsImNvdW50IiwiUkVBQ1RfVkVSU0lPTiIsInJlcXVpcmUiLCJ2ZXJzaW9uIiwiaXMxNiIsImluY2x1ZGVzIiwiZXh0UmVhY3RSYyIsImZzIiwiZXhpc3RzU3luYyIsIkpTT04iLCJwYXJzZSIsInJlYWRGaWxlU3luYyIsImdldERlZmF1bHRPcHRpb25zIiwiYnVpbGRzIiwiT2JqZWN0Iiwia2V5cyIsImxlbmd0aCIsImJ1aWxkT3B0aW9ucyIsImV4dCIsIm5hbWUiLCJfdmFsaWRhdGVCdWlsZENvbmZpZyIsImFzc2lnbiIsImN1cnJlbnRGaWxlIiwibWFuaWZlc3QiLCJkZXBlbmRlbmNpZXMiLCJ3YXRjaCIsImNvbXBpbGVyIiwid2VicGFja1ZlcnNpb24iLCJ1bmRlZmluZWQiLCJpc1dlYnBhY2s0IiwiaG9va3MiLCJjdXJzb3JUbyIsInByb2Nlc3MiLCJjb25zb2xlIiwibG9nIiwibWUiLCJhc3luY2hyb25vdXMiLCJ3YXRjaFJ1biIsInRhcEFzeW5jIiwiY2IiLCJ0YXAiLCJwbHVnaW4iLCJhZGRUb01hbmlmZXN0IiwiY2FsbCIsImZpbGUiLCJzdGF0ZSIsInJlc291cmNlIiwiZSIsImVycm9yIiwiY29tcGlsYXRpb24iLCJzdWNjZWVkTW9kdWxlIiwibm9ybWFsTW9kdWxlRmFjdG9yeSIsInBhcnNlciIsImVtaXQiLCJjYWxsYmFjayIsImRvbmUiLCJtb2R1bGVzIiwiYnVpbGQiLCJvdXRwdXRQYXRoIiwicGF0aCIsImpvaW4iLCJvdXRwdXQiLCJkZXZTZXJ2ZXIiLCJjb250ZW50QmFzZSIsInByb21pc2UiLCJfYnVpbGRFeHRCdW5kbGUiLCJyZXN1bHQiLCJ1cmwiLCJwb3J0Iiwib3BuIiwidG9vbGtpdCIsInRoZW1lIiwicGFja2FnZXMiLCJwYWNrYWdlRGlycyIsInNkayIsIm92ZXJyaWRlcyIsInNlbmNoYSIsIl9nZXRTZW5jaENtZFBhdGgiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsIm9uQnVpbGRGYWlsIiwib25CdWlsZFN1Y2Nlc3MiLCJvbkJ1aWxkRG9uZSIsIkVycm9yIiwianMiLCJ0cmVlU2hha2luZyIsInN0YXRlbWVudHMiLCJpbmRleE9mIiwiZGVwcyIsImNvbmNhdCIsInVzZXJQYWNrYWdlcyIsIndyaXRlRmlsZVN5bmMiLCJjb21wcmVzcyIsInByb2R1Y3Rpb24iLCJjbWRSZWJ1aWxkTmVlZGVkIiwiY3dkIiwic2lsZW50Iiwic3RkZXJyIiwicGlwZSIsInN0ZGlvIiwiZW5jb2RpbmciLCJkZWJ1ZyIsInRlc3QiLCJtYW5pZmVzdEV4dHJhY3RvciIsImV4dHJhY3RGcm9tSlNYIiwiZG9QYXJzZSIsIl9zb3VyY2UiLCJfdmFsdWUiLCJfYWRkUmVhY3RvclBhY2thZ2UiLCJkaXJuYW1lIiwiYmFzZWRpciIsIl9maW5kUGFja2FnZXMiLCJtb2R1bGVzRGlyIiwicmVhZGRpclN5bmMiLCJmaWx0ZXIiLCJkaXIiLCJtYXAiLCJwYWNrYWdlSW5mbyIsInR5cGUiXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7QUFDQTs7QUFFQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOztBQUNBOzs7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBSUE7O0lBQVlBLFE7Ozs7Ozs7Ozs7Ozs7O0FBZlosSUFBSUMsZUFBZSxDQUFuQjs7QUFZQSxJQUFJQyxXQUFXLEtBQWY7QUFDQSxJQUFJQyxrQkFBSjtBQUNBLElBQU1DLE1BQVNDLGdCQUFNQyxLQUFOLENBQVksVUFBWixDQUFULDhCQUFOOzs7QUFHQSxJQUFNQyxlQUFlLFNBQWZBLFlBQWUs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QUNKOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImluZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuaW1wb3J0ICdiYWJlbC1wb2x5ZmlsbCc7XG52YXIgcmVhY3RWZXJzaW9uID0gMFxuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBjanNvbiBmcm9tICdjanNvbic7XG5pbXBvcnQgeyBzeW5jIGFzIG1rZGlycCB9IGZyb20gJ21rZGlycCc7XG5pbXBvcnQgZXh0cmFjdEZyb21KU1ggZnJvbSAnLi9leHRyYWN0RnJvbUpTWCc7XG5pbXBvcnQgeyBzeW5jIGFzIHJpbXJhZiB9IGZyb20gJ3JpbXJhZic7XG5pbXBvcnQgeyBidWlsZFhNTCwgY3JlYXRlQXBwSnNvbiwgY3JlYXRlV29ya3NwYWNlSnNvbiwgY3JlYXRlSlNET01FbnZpcm9ubWVudCB9IGZyb20gJy4vYXJ0aWZhY3RzJztcbmltcG9ydCB7IGV4ZWNTeW5jLCBzcGF3biwgZm9yayB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0IHsgZ2VuZXJhdGUgfSBmcm9tICdhc3RyaW5nJztcbmltcG9ydCB7IHN5bmMgYXMgcmVzb2x2ZSB9IGZyb20gJ3Jlc29sdmUnO1xubGV0IHdhdGNoaW5nID0gZmFsc2U7XG5sZXQgY21kRXJyb3JzO1xuY29uc3QgYXBwID0gYCR7Y2hhbGsuZ3JlZW4oJ+KEuSDvvaJleHTvvaM6Jyl9IHJlYWN0b3Itd2VicGFjay1wbHVnaW46IGA7XG5pbXBvcnQgKiBhcyByZWFkbGluZSBmcm9tICdyZWFkbGluZSdcblxuY29uc3QgZ2F0aGVyRXJyb3JzID0gKGNtZCkgPT4ge1xuICBpZiAoY21kLnN0ZG91dCkge1xuICAgIGNtZC5zdGRvdXQub24oJ2RhdGEnLCBkYXRhID0+IHtcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSBkYXRhLnRvU3RyaW5nKCk7XG4gICAgICBpZiAobWVzc2FnZS5tYXRjaCgvXlxcW0VSUlxcXS8pKSB7XG4gICAgICAgIGNtZEVycm9ycy5wdXNoKG1lc3NhZ2UucmVwbGFjZSgvXlxcW0VSUlxcXSAvZ2ksICcnKSk7XG4gICAgICB9XG4gICAgfSlcbiAgfVxuICByZXR1cm4gY21kO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIFJlYWN0RXh0SlNXZWJwYWNrUGx1Z2luIHtcbiAgLyoqXG4gICAqIEBwYXJhbSB7T2JqZWN0W119IGJ1aWxkc1xuICAgKiBAcGFyYW0ge0Jvb2xlYW59IFtkZWJ1Zz1mYWxzZV0gU2V0IHRvIHRydWUgdG8gcHJldmVudCBjbGVhbnVwIG9mIGJ1aWxkIHRlbXBvcmFyeSBidWlsZCBhcnRpZmFjdHMgdGhhdCBtaWdodCBiZSBoZWxwZnVsIGluIHRyb3VibGVzaG9vdGluZyBpc3N1ZXMuXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBzZGsgVGhlIGZ1bGwgcGF0aCB0byB0aGUgRXh0UmVhY3QgU0RLXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBbdG9vbGtpdD0nbW9kZXJuJ10gXCJtb2Rlcm5cIiBvciBcImNsYXNzaWNcIlxuICAgKiBAcGFyYW0ge1N0cmluZ30gdGhlbWUgVGhlIG5hbWUgb2YgdGhlIEV4dFJlYWN0IHRoZW1lIHBhY2thZ2UgdG8gdXNlLCBmb3IgZXhhbXBsZSBcInRoZW1lLW1hdGVyaWFsXCJcbiAgICogQHBhcmFtIHtTdHJpbmdbXX0gcGFja2FnZXMgQW4gYXJyYXkgb2YgRXh0UmVhY3QgcGFja2FnZXMgdG8gaW5jbHVkZVxuICAgKiBAcGFyYW0ge1N0cmluZ1tdfSBvdmVycmlkZXMgQW4gYXJyYXkgd2l0aCB0aGUgcGF0aHMgb2YgZGlyZWN0b3JpZXMgb3IgZmlsZXMgdG8gc2VhcmNoLiBBbnkgY2xhc3Nlc1xuICAgKiBkZWNsYXJlZCBpbiB0aGVzZSBsb2NhdGlvbnMgd2lsbCBiZSBhdXRvbWF0aWNhbGx5IHJlcXVpcmVkIGFuZCBpbmNsdWRlZCBpbiB0aGUgYnVpbGQuXG4gICAqIElmIGFueSBmaWxlIGRlZmluZXMgYW4gRXh0UmVhY3Qgb3ZlcnJpZGUgKHVzaW5nIEV4dC5kZWZpbmUgd2l0aCBhbiBcIm92ZXJyaWRlXCIgcHJvcGVydHkpLFxuICAgKiB0aGF0IG92ZXJyaWRlIHdpbGwgaW4gZmFjdCBvbmx5IGJlIGluY2x1ZGVkIGluIHRoZSBidWlsZCBpZiB0aGUgdGFyZ2V0IGNsYXNzIHNwZWNpZmllZFxuICAgKiBpbiB0aGUgXCJvdmVycmlkZVwiIHByb3BlcnR5IGlzIGFsc28gaW5jbHVkZWQuXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBvdXRwdXQgVGhlIHBhdGggdG8gZGlyZWN0b3J5IHdoZXJlIHRoZSBFeHRSZWFjdCBidW5kbGUgc2hvdWxkIGJlIHdyaXR0ZW5cbiAgICogQHBhcmFtIHtCb29sZWFufSBhc3luY2hyb25vdXMgU2V0IHRvIHRydWUgdG8gcnVuIFNlbmNoYSBDbWQgYnVpbGRzIGFzeW5jaHJvbm91c2x5LiBUaGlzIG1ha2VzIHRoZSB3ZWJwYWNrIGJ1aWxkIGZpbmlzaCBtdWNoIGZhc3RlciwgYnV0IHRoZSBhcHAgbWF5IG5vdCBsb2FkIGNvcnJlY3RseSBpbiB5b3VyIGJyb3dzZXIgdW50aWwgU2VuY2hhIENtZCBpcyBmaW5pc2hlZCBidWlsZGluZyB0aGUgRXh0UmVhY3QgYnVuZGxlXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gcHJvZHVjdGlvbiBTZXQgdG8gdHJ1ZSBmb3IgcHJvZHVjdGlvbiBidWlsZHMuICBUaGlzIHRlbGwgU2VuY2hhIENtZCB0byBjb21wcmVzcyB0aGUgZ2VuZXJhdGVkIEpTIGJ1bmRsZS5cbiAgICogQHBhcmFtIHtCb29sZWFufSB0cmVlU2hha2luZyBTZXQgdG8gZmFsc2UgdG8gZGlzYWJsZSB0cmVlIHNoYWtpbmcgaW4gZGV2ZWxvcG1lbnQgYnVpbGRzLiAgVGhpcyBtYWtlcyBpbmNyZW1lbnRhbCByZWJ1aWxkcyBmYXN0ZXIgYXMgYWxsIEV4dFJlYWN0IGNvbXBvbmVudHMgYXJlIGluY2x1ZGVkIGluIHRoZSBleHQuanMgYnVuZGxlIGluIHRoZSBpbml0aWFsIGJ1aWxkIGFuZCB0aHVzIHRoZSBidW5kbGUgZG9lcyBub3QgbmVlZCB0byBiZSByZWJ1aWx0IGFmdGVyIGVhY2ggY2hhbmdlLiBEZWZhdWx0cyB0byB0cnVlLlxuICAgKi9cbiAgY29uc3RydWN0b3Iob3B0aW9ucykge1xuICAgIHRoaXMuY291bnQgPSAwXG4gICAgLy9jYW4gYmUgaW4gZGV2ZGVwZW5kZW5jaWVzIC0gYWNjb3VudCBmb3IgdGhpczogcmVhY3Q6IFwiMTUuMTYuMFwiXG4gICAgLy92YXIgcGtnID0gKGZzLmV4aXN0c1N5bmMoJ3BhY2thZ2UuanNvbicpICYmIEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKCdwYWNrYWdlLmpzb24nLCAndXRmLTgnKSkgfHwge30pO1xuICAgIC8vdmFyIHJlYWN0RW50cnkgPSBwa2cuZGVwZW5kZW5jaWVzLnJlYWN0XG4gICAgLy92YXIgaXMxNiA9IHJlYWN0RW50cnkuaW5jbHVkZXMoXCIxNlwiKTtcbiAgICBjb25zdCBSRUFDVF9WRVJTSU9OID0gcmVxdWlyZSgncmVhY3QnKS52ZXJzaW9uXG4gICAgdmFyIGlzMTYgPSBSRUFDVF9WRVJTSU9OLmluY2x1ZGVzKFwiMTZcIik7XG5cbiAgICBpZiAoaXMxNikgeyByZWFjdFZlcnNpb24gPSAxNiB9XG4gICAgZWxzZSB7IHJlYWN0VmVyc2lvbiA9IDE1IH1cbiAgICB0aGlzLnJlYWN0VmVyc2lvbiA9IHJlYWN0VmVyc2lvblxuICAgIGNvbnN0IGV4dFJlYWN0UmMgPSAoZnMuZXhpc3RzU3luYygnLmV4dC1yZWFjdHJjJykgJiYgSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMoJy5leHQtcmVhY3RyYycsICd1dGYtOCcpKSB8fCB7fSk7XG4gICAgb3B0aW9ucyA9IHsgLi4udGhpcy5nZXREZWZhdWx0T3B0aW9ucygpLCAuLi5vcHRpb25zLCAuLi5leHRSZWFjdFJjIH07XG4gICAgY29uc3QgeyBidWlsZHMgfSA9IG9wdGlvbnM7XG4gICAgaWYgKE9iamVjdC5rZXlzKGJ1aWxkcykubGVuZ3RoID09PSAwKSB7XG4gICAgICBjb25zdCB7IGJ1aWxkcywgLi4uYnVpbGRPcHRpb25zIH0gPSBvcHRpb25zO1xuICAgICAgYnVpbGRzLmV4dCA9IGJ1aWxkT3B0aW9ucztcbiAgICB9XG4gICAgZm9yIChsZXQgbmFtZSBpbiBidWlsZHMpXG4gICAgICB0aGlzLl92YWxpZGF0ZUJ1aWxkQ29uZmlnKG5hbWUsIGJ1aWxkc1tuYW1lXSk7XG4gICAgT2JqZWN0LmFzc2lnbih0aGlzLCB7XG4gICAgICAuLi5vcHRpb25zLFxuICAgICAgY3VycmVudEZpbGU6IG51bGwsXG4gICAgICBtYW5pZmVzdDogbnVsbCxcbiAgICAgIGRlcGVuZGVuY2llczogW11cbiAgICB9KTtcbiAgfVxuXG4gIHdhdGNoUnVuKCkge1xuICAgIHRoaXMud2F0Y2ggPSB0cnVlXG4gIH1cblxuICBhcHBseShjb21waWxlcikge1xuICAgIGlmICh0aGlzLndlYnBhY2tWZXJzaW9uID09IHVuZGVmaW5lZCkge1xuICAgICAgY29uc3QgaXNXZWJwYWNrNCA9IGNvbXBpbGVyLmhvb2tzO1xuICAgICAgaWYgKGlzV2VicGFjazQpIHt0aGlzLndlYnBhY2tWZXJzaW9uID0gJ0lTIHdlYnBhY2sgNCd9XG4gICAgICBlbHNlIHt0aGlzLndlYnBhY2tWZXJzaW9uID0gJ05PVCB3ZWJwYWNrIDQnfVxuICAgICAgcmVhZGxpbmUuY3Vyc29yVG8ocHJvY2Vzcy5zdGRvdXQsIDApO2NvbnNvbGUubG9nKGFwcCArICdyZWFjdFZlcnNpb246ICcgKyB0aGlzLnJlYWN0VmVyc2lvbiArICcsICcgKyB0aGlzLndlYnBhY2tWZXJzaW9uKVxuICAgIH1cbiAgICBjb25zdCBtZSA9IHRoaXM7XG5cbiAgICBpZiAoY29tcGlsZXIuaG9va3MpIHtcbiAgICAgIGlmICh0aGlzLmFzeW5jaHJvbm91cykge1xuICAgICAgICBjb21waWxlci5ob29rcy53YXRjaFJ1bi50YXBBc3luYygnZXh0cmVhY3Qtd2F0Y2gtcnVuIChhc3luYyknLCAod2F0Y2hpbmcsIGNiKSA9PiB7XG4gICAgICAgICAgcmVhZGxpbmUuY3Vyc29yVG8ocHJvY2Vzcy5zdGRvdXQsIDApO2NvbnNvbGUubG9nKGFwcCArICdleHRyZWFjdC13YXRjaC1ydW4gKGFzeW5jKScpXG4gICAgICAgICAgdGhpcy53YXRjaFJ1bigpXG4gICAgICAgICAgY2IoKVxuICAgICAgICB9KVxuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIGNvbXBpbGVyLmhvb2tzLndhdGNoUnVuLnRhcCgnZXh0cmVhY3Qtd2F0Y2gtcnVuJywgKHdhdGNoaW5nKSA9PiB7XG4gICAgICAgICAgcmVhZGxpbmUuY3Vyc29yVG8ocHJvY2Vzcy5zdGRvdXQsIDApO2NvbnNvbGUubG9nKGFwcCArICdleHRyZWFjdC13YXRjaC1ydW4nKVxuICAgICAgICAgIHRoaXMud2F0Y2hSdW4oKVxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGNvbXBpbGVyLnBsdWdpbignd2F0Y2gtcnVuJywgKHdhdGNoaW5nLCBjYikgPT4ge1xuICAgICAgICByZWFkbGluZS5jdXJzb3JUbyhwcm9jZXNzLnN0ZG91dCwgMCk7Y29uc29sZS5sb2coYXBwICsgJ3dhdGNoLXJ1bicpXG4gICAgICAgIHRoaXMud2F0Y2hSdW4oKVxuICAgICAgICBjYigpXG4gICAgICB9KVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEFkZHMgdGhlIGNvZGUgZm9yIHRoZSBzcGVjaWZpZWQgZnVuY3Rpb24gY2FsbCB0byB0aGUgbWFuaWZlc3QuanMgZmlsZVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBjYWxsIEEgZnVuY3Rpb24gY2FsbCBBU1Qgbm9kZS5cbiAgICAgKi9cbiAgICBjb25zdCBhZGRUb01hbmlmZXN0ID0gZnVuY3Rpb24oY2FsbCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgZmlsZSA9IHRoaXMuc3RhdGUubW9kdWxlLnJlc291cmNlO1xuICAgICAgICBtZS5kZXBlbmRlbmNpZXNbZmlsZV0gPSBbIC4uLihtZS5kZXBlbmRlbmNpZXNbZmlsZV0gfHwgW10pLCBnZW5lcmF0ZShjYWxsKSBdO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjb25zb2xlLmVycm9yKGBFcnJvciBwcm9jZXNzaW5nICR7ZmlsZX1gKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgaWYgKGNvbXBpbGVyLmhvb2tzKSB7XG4gICAgICBjb21waWxlci5ob29rcy5jb21waWxhdGlvbi50YXAoJ2V4dHJlYWN0LWNvbXBpbGF0aW9uJywgKGNvbXBpbGF0aW9uLGRhdGEpID0+IHtcbiAgICAgICAgcmVhZGxpbmUuY3Vyc29yVG8ocHJvY2Vzcy5zdGRvdXQsIDApO2NvbnNvbGUubG9nKGFwcCArICdleHRyZWFjdC1jb21waWxhdGlvbicpXG4gICAgICAgIGNvbXBpbGF0aW9uLmhvb2tzLnN1Y2NlZWRNb2R1bGUudGFwKCdleHRyZWFjdC1zdWNjZWVkLW1vZHVsZScsIChtb2R1bGUpID0+IHtcbiAgICAgICAgICB0aGlzLnN1Y2NlZWRNb2R1bGUoY29tcGlsYXRpb24sIG1vZHVsZSlcbiAgICAgICAgfSlcblxuICAgICAgICBkYXRhLm5vcm1hbE1vZHVsZUZhY3RvcnkucGx1Z2luKFwicGFyc2VyXCIsIGZ1bmN0aW9uKHBhcnNlciwgb3B0aW9ucykge1xuICAgICAgICAgIC8vIGV4dHJhY3QgeHR5cGVzIGFuZCBjbGFzc2VzIGZyb20gRXh0LmNyZWF0ZSBjYWxsc1xuICAgICAgICAgIHBhcnNlci5wbHVnaW4oJ2NhbGwgRXh0LmNyZWF0ZScsIGFkZFRvTWFuaWZlc3QpO1xuICAgICAgICAgIC8vIGNvcHkgRXh0LnJlcXVpcmUgY2FsbHMgdG8gdGhlIG1hbmlmZXN0LiAgVGhpcyBhbGxvd3MgdGhlIHVzZXJzIHRvIGV4cGxpY2l0bHkgcmVxdWlyZSBhIGNsYXNzIGlmIHRoZSBwbHVnaW4gZmFpbHMgdG8gZGV0ZWN0IGl0LlxuICAgICAgICAgIHBhcnNlci5wbHVnaW4oJ2NhbGwgRXh0LnJlcXVpcmUnLCBhZGRUb01hbmlmZXN0KTtcbiAgICAgICAgICAvLyBjb3B5IEV4dC5kZWZpbmUgY2FsbHMgdG8gdGhlIG1hbmlmZXN0LiAgVGhpcyBhbGxvd3MgdXNlcnMgdG8gd3JpdGUgc3RhbmRhcmQgRXh0UmVhY3QgY2xhc3Nlcy5cbiAgICAgICAgICBwYXJzZXIucGx1Z2luKCdjYWxsIEV4dC5kZWZpbmUnLCBhZGRUb01hbmlmZXN0KTtcbiAgICAgICAgfSlcbiAgICAgIH0pXG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgY29tcGlsZXIucGx1Z2luKCdjb21waWxhdGlvbicsIChjb21waWxhdGlvbiwgZGF0YSkgPT4ge1xuICAgICAgICByZWFkbGluZS5jdXJzb3JUbyhwcm9jZXNzLnN0ZG91dCwgMCk7Y29uc29sZS5sb2coYXBwICsgJ2NvbXBpbGF0aW9uJylcbiAgICAgICAgY29tcGlsYXRpb24ucGx1Z2luKCdzdWNjZWVkLW1vZHVsZScsIChtb2R1bGUpID0+IHtcbiAgICAgICAgICB0aGlzLnN1Y2NlZWRNb2R1bGUoY29tcGlsYXRpb24sIG1vZHVsZSlcbiAgICAgICAgfSlcbiAgICAgICAgZGF0YS5ub3JtYWxNb2R1bGVGYWN0b3J5LnBsdWdpbihcInBhcnNlclwiLCBmdW5jdGlvbihwYXJzZXIsIG9wdGlvbnMpIHtcbiAgICAgICAgICAvLyBleHRyYWN0IHh0eXBlcyBhbmQgY2xhc3NlcyBmcm9tIEV4dC5jcmVhdGUgY2FsbHNcbiAgICAgICAgICBwYXJzZXIucGx1Z2luKCdjYWxsIEV4dC5jcmVhdGUnLCBhZGRUb01hbmlmZXN0KTtcbiAgICAgICAgICAvLyBjb3B5IEV4dC5yZXF1aXJlIGNhbGxzIHRvIHRoZSBtYW5pZmVzdC4gIFRoaXMgYWxsb3dzIHRoZSB1c2VycyB0byBleHBsaWNpdGx5IHJlcXVpcmUgYSBjbGFzcyBpZiB0aGUgcGx1Z2luIGZhaWxzIHRvIGRldGVjdCBpdC5cbiAgICAgICAgICBwYXJzZXIucGx1Z2luKCdjYWxsIEV4dC5yZXF1aXJlJywgYWRkVG9NYW5pZmVzdCk7XG4gICAgICAgICAgLy8gY29weSBFeHQuZGVmaW5lIGNhbGxzIHRvIHRoZSBtYW5pZmVzdC4gIFRoaXMgYWxsb3dzIHVzZXJzIHRvIHdyaXRlIHN0YW5kYXJkIEV4dFJlYWN0IGNsYXNzZXMuXG4gICAgICAgICAgcGFyc2VyLnBsdWdpbignY2FsbCBFeHQuZGVmaW5lJywgYWRkVG9NYW5pZmVzdCk7XG4gICAgICAgIH0pXG5cbiAgICAgIH0pXG4gICAgfVxuXG4vLyplbWl0IC0gb25jZSBhbGwgbW9kdWxlcyBhcmUgcHJvY2Vzc2VkLCBjcmVhdGUgdGhlIG9wdGltaXplZCBFeHRSZWFjdCBidWlsZC5cbiAgICBpZiAoY29tcGlsZXIuaG9va3MpIHtcbiAgICAgIC8vaWYgKHRoaXMuYXN5bmNocm9ub3VzKSB7XG4gICAgICBpZiAodHJ1ZSkge1xuICAgICAgICBjb21waWxlci5ob29rcy5lbWl0LnRhcEFzeW5jKCdleHRyZWFjdC1lbWl0IChhc3luYyknLCAoY29tcGlsYXRpb24sIGNhbGxiYWNrKSA9PiB7XG4gICAgICAgICAgcmVhZGxpbmUuY3Vyc29yVG8ocHJvY2Vzcy5zdGRvdXQsIDApO2NvbnNvbGUubG9nKGFwcCArICdleHRyZWFjdC1lbWl0ICAoYXN5bmMpJylcbiAgICAgICAgICB0aGlzLmVtaXQoY29tcGlsZXIsIGNvbXBpbGF0aW9uLCBjYWxsYmFjaylcbiAgICAgICAgICAvL2NvbnNvbGUubG9nKGFwcCArICdhZnRlciBleHRyZWFjdC1lbWl0ICAoYXN5bmMpJylcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBjb21waWxlci5ob29rcy5lbWl0LnRhcCgnZXh0cmVhY3QtZW1pdCcsIChjb21waWxhdGlvbikgPT4ge1xuICAgICAgICAgIHJlYWRsaW5lLmN1cnNvclRvKHByb2Nlc3Muc3Rkb3V0LCAwKTtjb25zb2xlLmxvZyhhcHAgKyAnZXh0cmVhY3QtZW1pdCcpXG4gICAgICAgICAgdGhpcy5lbWl0KGNvbXBpbGVyLCBjb21waWxhdGlvbilcbiAgICAgICAgICBjb25zb2xlLmxvZyhhcHAgKyAnYWZ0ZXIgZXh0cmVhY3QtZW1pdCcpXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgY29tcGlsZXIucGx1Z2luKCdlbWl0JywgKGNvbXBpbGF0aW9uLCBjYWxsYmFjaykgPT4ge1xuICAgICAgICByZWFkbGluZS5jdXJzb3JUbyhwcm9jZXNzLnN0ZG91dCwgMCk7Y29uc29sZS5sb2coYXBwICsgJ2VtaXQnKVxuICAgICAgICB0aGlzLmVtaXQoY29tcGlsZXIsIGNvbXBpbGF0aW9uLCBjYWxsYmFjaylcbiAgICAgICAgY2FsbGJhY2soKVxuICAgICAgfSlcbiAgICB9XG5cbiAgICBpZiAoY29tcGlsZXIuaG9va3MpIHtcbiAgICAgIGlmICh0aGlzLmFzeW5jaHJvbm91cykge1xuICAgICAgICBjb21waWxlci5ob29rcy5kb25lLnRhcEFzeW5jKCdleHRyZWFjdC1kb25lIChhc3luYyknLCAoY29tcGlsYXRpb24sIGNhbGxiYWNrKSA9PiB7XG4gICAgICAgICAgcmVhZGxpbmUuY3Vyc29yVG8ocHJvY2Vzcy5zdGRvdXQsIDApO2NvbnNvbGUubG9nKGFwcCArICdleHRyZWFjdC1kb25lIChhc3luYyknKVxuICAgICAgICAgIGlmIChjYWxsYmFjayAhPSBudWxsKSBcbiAgICAgICAgICB7XG4gICAgICAgICAgICBpZiAodGhpcy5hc3luY2hyb25vdXMpIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZygnY2FsbGluZyBjYWxsYmFjayBmb3IgZXh0cmVhY3QtZW1pdCAgKGFzeW5jKScpXG4gICAgICAgICAgICAgIGNhbGxiYWNrKClcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgY29tcGlsZXIuaG9va3MuZG9uZS50YXAoJ2V4dHJlYWN0LWRvbmUnLCAoKSA9PiB7XG4gICAgICAgICAgcmVhZGxpbmUuY3Vyc29yVG8ocHJvY2Vzcy5zdGRvdXQsIDApO2NvbnNvbGUubG9nKGFwcCArICdleHRyZWFjdC1kb25lJylcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBhc3luYyBlbWl0KGNvbXBpbGVyLCBjb21waWxhdGlvbiwgY2FsbGJhY2spIHtcbiAgICB2YXIgaXNXZWJwYWNrNCA9IGNvbXBpbGF0aW9uLmhvb2tzO1xuICAgIHZhciBtb2R1bGVzID0gW11cbiAgICBpZiAoaXNXZWJwYWNrNCkge1xuICAgICAgaXNXZWJwYWNrNCA9IHRydWVcbiAgICAgIC8vbW9kdWxlcyA9IGNvbXBpbGF0aW9uLmNodW5rcy5yZWR1Y2UoKGEsIGIpID0+IGEuY29uY2F0KGIuX21vZHVsZXMpLCBbXSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgaXNXZWJwYWNrNCA9IGZhbHNlXG4gICAgICAvL21vZHVsZXMgPSBjb21waWxhdGlvbi5jaHVua3MucmVkdWNlKChhLCBiKSA9PiBhLmNvbmNhdChiLm1vZHVsZXMpLCBbXSk7XG4gICAgfVxuICAgIGNvbnN0IGJ1aWxkID0gdGhpcy5idWlsZHNbT2JqZWN0LmtleXModGhpcy5idWlsZHMpWzBdXTtcbiAgICBsZXQgb3V0cHV0UGF0aCA9IHBhdGguam9pbihjb21waWxlci5vdXRwdXRQYXRoLCB0aGlzLm91dHB1dCk7XG4gICAgLy8gd2VicGFjay1kZXYtc2VydmVyIG92ZXJ3cml0ZXMgdGhlIG91dHB1dFBhdGggdG8gXCIvXCIsIHNvIHdlIG5lZWQgdG8gcHJlcGVuZCBjb250ZW50QmFzZVxuICAgIGlmIChjb21waWxlci5vdXRwdXRQYXRoID09PSAnLycgJiYgY29tcGlsZXIub3B0aW9ucy5kZXZTZXJ2ZXIpIHtcbiAgICAgIG91dHB1dFBhdGggPSBwYXRoLmpvaW4oY29tcGlsZXIub3B0aW9ucy5kZXZTZXJ2ZXIuY29udGVudEJhc2UsIG91dHB1dFBhdGgpO1xuICAgIH1cbiAgICAvL2NvbnNvbGUubG9nKCdcXG4qKioqKm91dHB1dFBhdGg6ICcgKyBvdXRwdXRQYXRoKVxuXG4gICAgbGV0IHByb21pc2UgPSB0aGlzLl9idWlsZEV4dEJ1bmRsZShpc1dlYnBhY2s0LCAnbm90JywgbW9kdWxlcywgb3V0cHV0UGF0aCwgYnVpbGQsIGNhbGxiYWNrKVxuICAgIGxldCByZXN1bHQgPSBhd2FpdCBwcm9taXNlXG5cbiAgICBpZiAodGhpcy53YXRjaCkge1xuICAgICAgaWYgKHRoaXMuY291bnQgPT0gMCkge1xuICAgICAgICB2YXIgdXJsID0gJ2h0dHA6Ly9sb2NhbGhvc3Q6JyArIHRoaXMucG9ydFxuICAgICAgICByZWFkbGluZS5jdXJzb3JUbyhwcm9jZXNzLnN0ZG91dCwgMCk7Y29uc29sZS5sb2coYXBwICsgJ2V4dHJlYWN0LWVtaXQgLSBvcGVuIGJyb3dzZXIgYXQgJyArIHVybClcbiAgICAgICAgdGhpcy5jb3VudCsrXG4gICAgICAgIGNvbnN0IG9wbiA9IHJlcXVpcmUoJ29wbicpXG4gICAgICAgIG9wbih1cmwpXG4gICAgICB9XG4gICAgfVxuICAgIC8vaWYgKGNhbGxiYWNrICE9IG51bGwpe2lmICh0aGlzLmFzeW5jaHJvbm91cyl7Y2FsbGJhY2soKX19XG4gICAgaWYgKGNhbGxiYWNrICE9IG51bGwpe2lmICh0cnVlKXtjYWxsYmFjaygpfX1cbiAgfVxuXG4gIC8qKlxuICAgLyoqXG4gICAgKiBCdWlsZHMgYSBtaW5pbWFsIHZlcnNpb24gb2YgdGhlIEV4dFJlYWN0IGZyYW1ld29yayBiYXNlZCBvbiB0aGUgY2xhc3NlcyB1c2VkXG4gICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBUaGUgbmFtZSBvZiB0aGUgYnVpbGRcbiAgICAqIEBwYXJhbSB7TW9kdWxlW119IG1vZHVsZXMgd2VicGFjayBtb2R1bGVzXG4gICAgKiBAcGFyYW0ge1N0cmluZ30gb3V0cHV0IFRoZSBwYXRoIHRvIHdoZXJlIHRoZSBmcmFtZXdvcmsgYnVpbGQgc2hvdWxkIGJlIHdyaXR0ZW5cbiAgICAqIEBwYXJhbSB7U3RyaW5nfSBbdG9vbGtpdD0nbW9kZXJuJ10gXCJtb2Rlcm5cIiBvciBcImNsYXNzaWNcIlxuICAgICogQHBhcmFtIHtTdHJpbmd9IG91dHB1dCBUaGUgcGF0aCB0byB0aGUgZGlyZWN0b3J5IHRvIGNyZWF0ZSB3aGljaCB3aWxsIGNvbnRhaW4gdGhlIGpzIGFuZCBjc3MgYnVuZGxlc1xuICAgICogQHBhcmFtIHtTdHJpbmd9IHRoZW1lIFRoZSBuYW1lIG9mIHRoZSBFeHRSZWFjdCB0aGVtZSBwYWNrYWdlIHRvIHVzZSwgZm9yIGV4YW1wbGUgXCJ0aGVtZS1tYXRlcmlhbFwiXG4gICAgKiBAcGFyYW0ge1N0cmluZ1tdfSBwYWNrYWdlcyBBbiBhcnJheSBvZiBFeHRSZWFjdCBwYWNrYWdlcyB0byBpbmNsdWRlXG4gICAgKiBAcGFyYW0ge1N0cmluZ1tdfSBwYWNrYWdlRGlycyBEaXJlY3RvcmllcyBjb250YWluaW5nIHBhY2thZ2VzXG4gICAgKiBAcGFyYW0ge1N0cmluZ1tdfSBvdmVycmlkZXMgQW4gYXJyYXkgb2YgbG9jYXRpb25zIGZvciBvdmVycmlkZXNcbiAgICAqIEBwYXJhbSB7U3RyaW5nfSBzZGsgVGhlIGZ1bGwgcGF0aCB0byB0aGUgRXh0UmVhY3QgU0RLXG4gICAgKiBAcHJpdmF0ZVxuICAgICovXG4gIF9idWlsZEV4dEJ1bmRsZShpc1dlYnBhY2s0LCBuYW1lLCBtb2R1bGVzLCBvdXRwdXQsIHsgdG9vbGtpdD0nbW9kZXJuJywgdGhlbWUsIHBhY2thZ2VzPVtdLCBwYWNrYWdlRGlycz1bXSwgc2RrLCBvdmVycmlkZXMsIGNhbGxiYWNrfSkge1xuICAgIGxldCBzZW5jaGEgPSB0aGlzLl9nZXRTZW5jaENtZFBhdGgoKTtcbiAgICB0aGVtZSA9IHRoZW1lIHx8ICh0b29sa2l0ID09PSAnY2xhc3NpYycgPyAndGhlbWUtdHJpdG9uJyA6ICd0aGVtZS1tYXRlcmlhbCcpO1xuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIHRoaXMub25CdWlsZEZhaWwgPSByZWplY3Q7XG4gICAgICB0aGlzLm9uQnVpbGRTdWNjZXNzID0gcmVzb2x2ZTtcbiAgICAgIGNtZEVycm9ycyA9IFtdO1xuICAgICAgXG4gICAgICBjb25zdCBvbkJ1aWxkRG9uZSA9ICgpID0+IHtcbiAgICAgICAgaWYgKGNtZEVycm9ycy5sZW5ndGgpIHtcbiAgICAgICAgICB0aGlzLm9uQnVpbGRGYWlsKG5ldyBFcnJvcihjbWRFcnJvcnMuam9pbihcIlwiKSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMub25CdWlsZFN1Y2Nlc3MoKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoIXdhdGNoaW5nKSB7XG4gICAgICAgIHJpbXJhZihvdXRwdXQpO1xuICAgICAgICBta2RpcnAob3V0cHV0KTtcbiAgICAgIH1cblxuICAgICAgbGV0IGpzO1xuICAgICAgaWYgKHRoaXMudHJlZVNoYWtpbmcpIHtcbiAgICAgICAgbGV0IHN0YXRlbWVudHMgPSBbJ0V4dC5yZXF1aXJlKFtcIkV4dC5hcHAuQXBwbGljYXRpb25cIiwgXCJFeHQuQ29tcG9uZW50XCIsIFwiRXh0LldpZGdldFwiLCBcIkV4dC5sYXlvdXQuRml0XCJdKSddOyAvLyBmb3Igc29tZSByZWFzb24gY29tbWFuZCBkb2Vzbid0IGxvYWQgY29tcG9uZW50IHdoZW4gb25seSBwYW5lbCBpcyByZXF1aXJlZFxuICAgICAgICBpZiAocGFja2FnZXMuaW5kZXhPZigncmVhY3RvcicpICE9PSAtMSkge1xuICAgICAgICAgIHN0YXRlbWVudHMucHVzaCgnRXh0LnJlcXVpcmUoXCJFeHQucmVhY3Rvci5SZW5kZXJlckNlbGxcIiknKTtcbiAgICAgICAgfVxuICAgICAgICAvL21qZ1xuICAgICAgICBmb3IgKGxldCBtb2R1bGUgb2YgbW9kdWxlcykge1xuICAgICAgICAgIGNvbnN0IGRlcHMgPSB0aGlzLmRlcGVuZGVuY2llc1ttb2R1bGUucmVzb3VyY2VdO1xuICAgICAgICAgIGlmIChkZXBzKSBzdGF0ZW1lbnRzID0gc3RhdGVtZW50cy5jb25jYXQoZGVwcyk7XG4gICAgICAgIH1cbiAgICAgICAganMgPSBzdGF0ZW1lbnRzLmpvaW4oJztcXG4nKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGpzID0gJ0V4dC5yZXF1aXJlKFwiRXh0LipcIiknO1xuICAgICAgfVxuICAgICAgY29uc3QgbWFuaWZlc3QgPSBwYXRoLmpvaW4ob3V0cHV0LCAnbWFuaWZlc3QuanMnKTtcbiAgICAgIC8vIGFkZCBleHQtcmVhY3QvcGFja2FnZXMgYXV0b21hdGljYWxseSBpZiBwcmVzZW50XG4gICAgICBjb25zdCB1c2VyUGFja2FnZXMgPSBwYXRoLmpvaW4oJy4nLCAnZXh0LXJlYWN0JywgJ3BhY2thZ2VzJyk7XG4gICAgICBpZiAoZnMuZXhpc3RzU3luYyh1c2VyUGFja2FnZXMpKSB7XG4gICAgICAgIHBhY2thZ2VEaXJzLnB1c2godXNlclBhY2thZ2VzKVxuICAgICAgfVxuXG4gICAgICBpZiAoZnMuZXhpc3RzU3luYyhwYXRoLmpvaW4oc2RrLCAnZXh0JykpKSB7XG4gICAgICAgIC8vIGxvY2FsIGNoZWNrb3V0IG9mIHRoZSBTREsgcmVwb1xuICAgICAgICBwYWNrYWdlRGlycy5wdXNoKHBhdGguam9pbignZXh0JywgJ3BhY2thZ2VzJykpO1xuICAgICAgICBzZGsgPSBwYXRoLmpvaW4oc2RrLCAnZXh0Jyk7XG4gICAgICB9XG4gICAgICBpZiAoIXdhdGNoaW5nKSB7XG4gICAgICAgIGZzLndyaXRlRmlsZVN5bmMocGF0aC5qb2luKG91dHB1dCwgJ2J1aWxkLnhtbCcpLCBidWlsZFhNTCh7IGNvbXByZXNzOiB0aGlzLnByb2R1Y3Rpb24gfSksICd1dGY4Jyk7XG4gICAgICAgIGZzLndyaXRlRmlsZVN5bmMocGF0aC5qb2luKG91dHB1dCwgJ2pzZG9tLWVudmlyb25tZW50LmpzJyksIGNyZWF0ZUpTRE9NRW52aXJvbm1lbnQoKSwgJ3V0ZjgnKTtcbiAgICAgICAgZnMud3JpdGVGaWxlU3luYyhwYXRoLmpvaW4ob3V0cHV0LCAnYXBwLmpzb24nKSwgY3JlYXRlQXBwSnNvbih7IHRoZW1lLCBwYWNrYWdlcywgdG9vbGtpdCwgb3ZlcnJpZGVzLCBwYWNrYWdlRGlycyB9KSwgJ3V0ZjgnKTtcbiAgICAgICAgZnMud3JpdGVGaWxlU3luYyhwYXRoLmpvaW4ob3V0cHV0LCAnd29ya3NwYWNlLmpzb24nKSwgY3JlYXRlV29ya3NwYWNlSnNvbihzZGssIHBhY2thZ2VEaXJzLCBvdXRwdXQpLCAndXRmOCcpO1xuICAgICAgfVxuICAgICAgbGV0IGNtZFJlYnVpbGROZWVkZWQgPSBmYWxzZTtcbiAgICAgIGlmICh0aGlzLm1hbmlmZXN0ID09PSBudWxsIHx8IGpzICE9PSB0aGlzLm1hbmlmZXN0KSB7XG4gICAgICAgIC8vIE9ubHkgd3JpdGUgbWFuaWZlc3QgaWYgaXQgZGlmZmVycyBmcm9tIHRoZSBsYXN0IHJ1bi4gIFRoaXMgcHJldmVudHMgdW5uZWNlc3NhcnkgY21kIHJlYnVpbGRzLlxuICAgICAgICB0aGlzLm1hbmlmZXN0ID0ganM7XG4gICAgICAgIC8vcmVhZGxpbmUuY3Vyc29yVG8ocHJvY2Vzcy5zdGRvdXQsIDApO2NvbnNvbGUubG9nKGFwcCArIGpzKVxuICAgICAgICByZWFkbGluZS5jdXJzb3JUbyhwcm9jZXNzLnN0ZG91dCwgMCk7Y29uc29sZS5sb2coYXBwICsgJ3RyZWUgc2hha2luZzogJyArIHRoaXMudHJlZVNoYWtpbmcpXG4gICAgICAgIGZzLndyaXRlRmlsZVN5bmMobWFuaWZlc3QsIGpzLCAndXRmOCcpO1xuICAgICAgICBjbWRSZWJ1aWxkTmVlZGVkID0gdHJ1ZTtcbiAgICAgICAgcmVhZGxpbmUuY3Vyc29yVG8ocHJvY2Vzcy5zdGRvdXQsIDApO2NvbnNvbGUubG9nKGFwcCArIGBidWlsZGluZyBFeHRSZWFjdCBidW5kbGUgYXQ6ICR7b3V0cHV0fWApXG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLndhdGNoKSB7XG4gICAgICAgIGlmICghd2F0Y2hpbmcpIHtcbiAgICAgICAgICB3YXRjaGluZyA9IGdhdGhlckVycm9ycyhmb3JrKHNlbmNoYSwgWydhbnQnLCAnd2F0Y2gnXSwgeyBjd2Q6IG91dHB1dCwgc2lsZW50OiB0cnVlIH0pKTtcbiAgICAgICAgICB3YXRjaGluZy5zdGRlcnIucGlwZShwcm9jZXNzLnN0ZGVycik7XG4gICAgICAgICAgd2F0Y2hpbmcuc3Rkb3V0LnBpcGUocHJvY2Vzcy5zdGRvdXQpO1xuICAgICAgICAgIHdhdGNoaW5nLnN0ZG91dC5vbignZGF0YScsIGRhdGEgPT4ge1xuICAgICAgICAgICAgaWYgKGRhdGEgJiYgZGF0YS50b1N0cmluZygpLm1hdGNoKC9XYWl0aW5nIGZvciBjaGFuZ2VzXFwuXFwuXFwuLykpIHtcbiAgICAgICAgICAgICAgb25CdWlsZERvbmUoKVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pXG4gICAgICAgICAgd2F0Y2hpbmcub24oJ2V4aXQnLCBvbkJ1aWxkRG9uZSlcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWNtZFJlYnVpbGROZWVkZWQpIHtcbiAgICAgICAgICByZWFkbGluZS5jdXJzb3JUbyhwcm9jZXNzLnN0ZG91dCwgMCk7Y29uc29sZS5sb2coYXBwICsgJ0V4dCByZWJ1aWxkIE5PVCBuZWVkZWQnKVxuICAgICAgICAgIG9uQnVpbGREb25lKClcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAvL3JlYWRsaW5lLmN1cnNvclRvKHByb2Nlc3Muc3Rkb3V0LCAwKTtjb25zb2xlLmxvZyhhcHAgKyAnRXh0IHJlYnVpbGQgSVMgbmVlZGVkJylcbiAgICAgICAgfVxuICAgICAgfSBcbiAgICAgIGVsc2Uge1xuICAgICAgICBjb25zdCBidWlsZCA9IGdhdGhlckVycm9ycyhmb3JrKHNlbmNoYSwgWydhbnQnLCAnYnVpbGQnXSwgeyBzdGRpbzogJ2luaGVyaXQnLCBlbmNvZGluZzogJ3V0Zi04JywgY3dkOiBvdXRwdXQsIHNpbGVudDogZmFsc2UgfSkpO1xuICAgICAgICByZWFkbGluZS5jdXJzb3JUbyhwcm9jZXNzLnN0ZG91dCwgMCk7Y29uc29sZS5sb2coYXBwICsgJ3NlbmNoYSBhbnQgYnVpbGQnKVxuICAgICAgICBpZihidWlsZC5zdGRvdXQpIHsgYnVpbGQuc3Rkb3V0LnBpcGUocHJvY2Vzcy5zdGRvdXQpIH1cbiAgICAgICAgaWYoYnVpbGQuc3RkZXJyKSB7IGJ1aWxkLnN0ZGVyci5waXBlKHByb2Nlc3Muc3RkZXJyKSB9XG4gICAgICAgIGJ1aWxkLm9uKCdleGl0Jywgb25CdWlsZERvbmUpO1xuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICAvKipcbiAgICogRGVmYXVsdCBjb25maWcgb3B0aW9uc1xuICAgKiBAcHJvdGVjdGVkXG4gICAqIEByZXR1cm4ge09iamVjdH1cbiAgICovXG4gIGdldERlZmF1bHRPcHRpb25zKCkge1xuICAgIHJldHVybiB7XG4gICAgICBwb3J0OiA4MDE2LFxuICAgICAgYnVpbGRzOiB7fSxcbiAgICAgIGRlYnVnOiBmYWxzZSxcbiAgICAgIHdhdGNoOiBmYWxzZSxcbiAgICAgIHRlc3Q6IC9cXC4oanx0KXN4PyQvLFxuXG4gICAgICAvKiBiZWdpbiBzaW5nbGUgYnVpbGQgb25seSAqL1xuICAgICAgb3V0cHV0OiAnZXh0LXJlYWN0JyxcbiAgICAgIHRvb2xraXQ6ICdtb2Rlcm4nLFxuICAgICAgcGFja2FnZXM6IG51bGwsXG4gICAgICBwYWNrYWdlRGlyczogW10sXG4gICAgICBvdmVycmlkZXM6IFtdLFxuICAgICAgYXN5bmNocm9ub3VzOiBmYWxzZSxcbiAgICAgIHByb2R1Y3Rpb246IGZhbHNlLFxuICAgICAgbWFuaWZlc3RFeHRyYWN0b3I6IGV4dHJhY3RGcm9tSlNYLFxuICAgICAgdHJlZVNoYWtpbmc6IGZhbHNlXG4gICAgICAvKiBlbmQgc2luZ2xlIGJ1aWxkIG9ubHkgKi9cbiAgICB9XG4gIH1cblxuICBzdWNjZWVkTW9kdWxlKGNvbXBpbGF0aW9uLCBtb2R1bGUpIHtcbiAgICB0aGlzLmN1cnJlbnRGaWxlID0gbW9kdWxlLnJlc291cmNlO1xuICAgIGlmIChtb2R1bGUucmVzb3VyY2UgJiYgbW9kdWxlLnJlc291cmNlLm1hdGNoKHRoaXMudGVzdCkgJiYgIW1vZHVsZS5yZXNvdXJjZS5tYXRjaCgvbm9kZV9tb2R1bGVzLykgJiYgIW1vZHVsZS5yZXNvdXJjZS5tYXRjaChgL3JlYWN0b3Ike3JlYWN0VmVyc2lvbn0vYCkpIHtcbiAgICAgIGNvbnN0IGRvUGFyc2UgPSAoKSA9PiB7XG4gICAgICAgIHRoaXMuZGVwZW5kZW5jaWVzW3RoaXMuY3VycmVudEZpbGVdID0gW1xuICAgICAgICAgIC4uLih0aGlzLmRlcGVuZGVuY2llc1t0aGlzLmN1cnJlbnRGaWxlXSB8fCBbXSksXG4gICAgICAgICAgLi4udGhpcy5tYW5pZmVzdEV4dHJhY3Rvcihtb2R1bGUuX3NvdXJjZS5fdmFsdWUsIGNvbXBpbGF0aW9uLCBtb2R1bGUsIHJlYWN0VmVyc2lvbilcbiAgICAgICAgXVxuICAgICAgfVxuICAgICAgaWYgKHRoaXMuZGVidWcpIHtcbiAgICAgICAgZG9QYXJzZSgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdHJ5IHsgZG9QYXJzZSgpOyB9IGNhdGNoIChlKSBcbiAgICAgICAgeyBcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCdcXG5lcnJvciBwYXJzaW5nICcgKyB0aGlzLmN1cnJlbnRGaWxlKTsgXG4gICAgICAgICAgY29uc29sZS5lcnJvcihlKTsgXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2tzIGVhY2ggYnVpbGQgY29uZmlnIGZvciBtaXNzaW5nL2ludmFsaWQgcHJvcGVydGllc1xuICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBUaGUgbmFtZSBvZiB0aGUgYnVpbGRcbiAgICogQHBhcmFtIHtTdHJpbmd9IGJ1aWxkIFRoZSBidWlsZCBjb25maWdcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF92YWxpZGF0ZUJ1aWxkQ29uZmlnKG5hbWUsIGJ1aWxkKSB7XG4gICAgbGV0IHsgc2RrLCBwcm9kdWN0aW9uIH0gPSBidWlsZDtcblxuICAgIGlmIChwcm9kdWN0aW9uKSB7XG4gICAgICBidWlsZC50cmVlU2hha2luZyA9IGZhbHNlO1xuICAgIH1cbiAgICBpZiAoc2RrKSB7XG4gICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoc2RrKSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgTm8gU0RLIGZvdW5kIGF0ICR7cGF0aC5yZXNvbHZlKHNkayl9LiAgRGlkIHlvdSBmb3IgZ2V0IHRvIGxpbmsvY29weSB5b3VyIEV4dCBKUyBTREsgdG8gdGhhdCBsb2NhdGlvbj9gKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5fYWRkUmVhY3RvclBhY2thZ2UoYnVpbGQpXG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGJ1aWxkLnNkayA9IHBhdGguZGlybmFtZShyZXNvbHZlKCdAZXh0anMvZXh0LXJlYWN0JywgeyBiYXNlZGlyOiBwcm9jZXNzLmN3ZCgpIH0pKVxuICAgICAgICBidWlsZC5wYWNrYWdlRGlycyA9IFsuLi4oYnVpbGQucGFja2FnZURpcnMgfHwgW10pLCBwYXRoLmRpcm5hbWUoYnVpbGQuc2RrKV07XG4gICAgICAgIGJ1aWxkLnBhY2thZ2VzID0gYnVpbGQucGFja2FnZXMgfHwgdGhpcy5fZmluZFBhY2thZ2VzKGJ1aWxkLnNkayk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgQGV4dGpzL2V4dC1yZWFjdCBub3QgZm91bmQuICBZb3UgY2FuIGluc3RhbGwgaXQgd2l0aCBcIm5wbSBpbnN0YWxsIC0tc2F2ZSBAZXh0anMvZXh0LXJlYWN0XCIgb3IsIGlmIHlvdSBoYXZlIGEgbG9jYWwgY29weSBvZiB0aGUgU0RLLCBzcGVjaWZ5IHRoZSBwYXRoIHRvIGl0IHVzaW5nIHRoZSBcInNka1wiIG9wdGlvbiBpbiBidWlsZCBcIiR7bmFtZX0uXCJgKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQWRkcyB0aGUgcmVhY3RvciBwYWNrYWdlIGlmIHByZXNlbnQgYW5kIHRoZSB0b29sa2l0IGlzIG1vZGVyblxuICAgKiBAcGFyYW0ge09iamVjdH0gYnVpbGQgXG4gICAqL1xuICBfYWRkUmVhY3RvclBhY2thZ2UoYnVpbGQpIHtcbiAgICBpZiAoYnVpbGQudG9vbGtpdCA9PT0gJ2NsYXNzaWMnKSByZXR1cm47XG4gICAgaWYgKGZzLmV4aXN0c1N5bmMocGF0aC5qb2luKGJ1aWxkLnNkaywgJ2V4dCcsICdtb2Rlcm4nLCAncmVhY3RvcicpKSB8fCAgLy8gcmVwb1xuICAgICAgZnMuZXhpc3RzU3luYyhwYXRoLmpvaW4oYnVpbGQuc2RrLCAnbW9kZXJuJywgJ3JlYWN0b3InKSkpIHsgLy8gcHJvZHVjdGlvbiBidWlsZFxuICAgICAgaWYgKCFidWlsZC5wYWNrYWdlcykge1xuICAgICAgICBidWlsZC5wYWNrYWdlcyA9IFtdO1xuICAgICAgfVxuICAgICAgYnVpbGQucGFja2FnZXMucHVzaCgncmVhY3RvcicpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm4gdGhlIG5hbWVzIG9mIGFsbCBFeHRSZWFjdCBwYWNrYWdlcyBpbiB0aGUgc2FtZSBwYXJlbnQgZGlyZWN0b3J5IGFzIGV4dC1yZWFjdCAodHlwaWNhbGx5IG5vZGVfbW9kdWxlcy9AZXh0anMpXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBzZGsgUGF0aCB0byBleHQtcmVhY3RcbiAgICogQHJldHVybiB7U3RyaW5nW119XG4gICAqL1xuICBfZmluZFBhY2thZ2VzKHNkaykge1xuICAgIGNvbnN0IG1vZHVsZXNEaXIgPSBwYXRoLmpvaW4oc2RrLCAnLi4nKTtcbiAgICByZXR1cm4gZnMucmVhZGRpclN5bmMobW9kdWxlc0RpcilcbiAgICAgIC8vIEZpbHRlciBvdXQgZGlyZWN0b3JpZXMgd2l0aG91dCAncGFja2FnZS5qc29uJ1xuICAgICAgLmZpbHRlcihkaXIgPT4gZnMuZXhpc3RzU3luYyhwYXRoLmpvaW4obW9kdWxlc0RpciwgZGlyLCAncGFja2FnZS5qc29uJykpKVxuICAgICAgLy8gR2VuZXJhdGUgYXJyYXkgb2YgcGFja2FnZSBuYW1lc1xuICAgICAgLm1hcChkaXIgPT4ge1xuICAgICAgICAgIGNvbnN0IHBhY2thZ2VJbmZvID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMocGF0aC5qb2luKG1vZHVsZXNEaXIsIGRpciwgJ3BhY2thZ2UuanNvbicpKSk7XG4gICAgICAgICAgLy8gRG9uJ3QgaW5jbHVkZSB0aGVtZSB0eXBlIHBhY2thZ2VzLlxuICAgICAgICAgIGlmKHBhY2thZ2VJbmZvLnNlbmNoYSAmJiBwYWNrYWdlSW5mby5zZW5jaGEudHlwZSAhPT0gJ3RoZW1lJykge1xuICAgICAgICAgICAgICByZXR1cm4gcGFja2FnZUluZm8uc2VuY2hhLm5hbWU7XG4gICAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC8vIFJlbW92ZSBhbnkgdW5kZWZpbmVkcyBmcm9tIG1hcFxuICAgICAgLmZpbHRlcihuYW1lID0+IG5hbWUpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIHBhdGggdG8gdGhlIHNlbmNoYSBjbWQgZXhlY3V0YWJsZVxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcmV0dXJuIHtTdHJpbmd9XG4gICAqL1xuICBfZ2V0U2VuY2hDbWRQYXRoKCkge1xuICAgIHRyeSB7XG4gICAgICAvLyB1c2UgQGV4dGpzL3NlbmNoYS1jbWQgZnJvbSBub2RlX21vZHVsZXNcbiAgICAgIHJldHVybiByZXF1aXJlKCdAZXh0anMvc2VuY2hhLWNtZCcpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIC8vIGF0dGVtcHQgdG8gdXNlIGdsb2JhbGx5IGluc3RhbGxlZCBTZW5jaGEgQ21kXG4gICAgICByZXR1cm4gJ3NlbmNoYSc7XG4gICAgfVxuICB9XG59XG5cblxuICAgICAgICAvLyBpbiAnZXh0cmVhY3QtY29tcGlsYXRpb24nXG4gICAgICAgIC8vaHR0cHM6Ly9naXRodWIuY29tL2pha2V0cmVudC9odG1sLXdlYnBhY2stdGVtcGxhdGVcbiAgICAgICAgLy9odHRwczovL2dpdGh1Yi5jb20vamFudGltb24vaHRtbC13ZWJwYWNrLXBsdWdpbiNcbiAgICAgICAgLy8gdGhlIGZvbGxvd2luZyBpcyBuZWVkZWQgZm9yIGh0bWwtd2VicGFjay1wbHVnaW4gdG8gaW5jbHVkZSA8c2NyaXB0PiBhbmQgPGxpbms+IHRhZ3MgZm9yIEV4dFJlYWN0XG4gICAgICAgIC8vIGNvbXBpbGF0aW9uLmhvb2tzLmh0bWxXZWJwYWNrUGx1Z2luQmVmb3JlSHRtbEdlbmVyYXRpb24udGFwQXN5bmMoXG4gICAgICAgIC8vICAgJ2V4dHJlYWN0LWh0bWxnZW5lcmF0aW9uJyxcbiAgICAgICAgLy8gICAoZGF0YSwgY2IpID0+IHtcbiAgICAgICAgLy8gICAgIHJlYWRsaW5lLmN1cnNvclRvKHByb2Nlc3Muc3Rkb3V0LCAwKTtjb25zb2xlLmxvZyhhcHAgKyAnZXh0cmVhY3QtaHRtbGdlbmVyYXRpb24nKVxuICAgICAgICAvLyAgICAgY29uc29sZS5sb2coJ2RhdGEuYXNzZXRzLmpzLmxlbmd0aCcpXG4gICAgICAgIC8vICAgICBjb25zb2xlLmxvZyhkYXRhLmFzc2V0cy5qcy5sZW5ndGgpXG4gICAgICAgIC8vICAgICBkYXRhLmFzc2V0cy5qcy51bnNoaWZ0KCdleHQtcmVhY3QvZXh0LmpzJylcbiAgICAgICAgLy8gICAgIGRhdGEuYXNzZXRzLmNzcy51bnNoaWZ0KCdleHQtcmVhY3QvZXh0LmNzcycpXG4gICAgICAgIC8vICAgICBjYihudWxsLCBkYXRhKVxuICAgICAgICAvLyAgIH1cbiAgICAgICAgLy8gKVxuXG5cblxuLy8gZnJvbSB0aGlzLmVtaXRcbiAgICAvLyB0aGUgZm9sbG93aW5nIGlzIG5lZWRlZCBmb3IgaHRtbC13ZWJwYWNrLXBsdWdpbiB0byBpbmNsdWRlIDxzY3JpcHQ+IGFuZCA8bGluaz4gdGFncyBmb3IgRXh0UmVhY3RcbiAgICAvLyBjb25zb2xlLmxvZygnY29tcGlsYXRpb24nKVxuICAgIC8vIGNvbnNvbGUubG9nKCcqKioqKioqKmNvbXBpbGF0aW9uLmNodW5rc1swXScpXG4gICAgLy8gY29uc29sZS5sb2coY29tcGlsYXRpb24uY2h1bmtzWzBdLmlkKVxuICAgIC8vIGNvbnNvbGUubG9nKHBhdGguam9pbih0aGlzLm91dHB1dCwgJ2V4dC5qcycpKVxuICAgIC8vIGNvbnN0IGpzQ2h1bmsgPSBjb21waWxhdGlvbi5hZGRDaHVuayhgJHt0aGlzLm91dHB1dH0tanNgKTtcbiAgICAvLyBqc0NodW5rLmhhc1J1bnRpbWUgPSBqc0NodW5rLmlzSW5pdGlhbCA9ICgpID0+IHRydWU7XG4gICAgLy8ganNDaHVuay5maWxlcy5wdXNoKHBhdGguam9pbih0aGlzLm91dHB1dCwgJ2V4dC5qcycpKTtcbiAgICAvLyBqc0NodW5rLmZpbGVzLnB1c2gocGF0aC5qb2luKHRoaXMub3V0cHV0LCAnZXh0LmNzcycpKTtcbiAgICAvLyBqc0NodW5rLmlkID0gJ2FhYWFwJzsgLy8gdGhpcyBmb3JjZXMgaHRtbC13ZWJwYWNrLXBsdWdpbiB0byBpbmNsdWRlIGV4dC5qcyBmaXJzdFxuICAgIC8vIGNvbnNvbGUubG9nKCcqKioqKioqKmNvbXBpbGF0aW9uLmNodW5rc1sxXScpXG4gICAgLy8gY29uc29sZS5sb2coY29tcGlsYXRpb24uY2h1bmtzWzFdLmlkKVxuXG4gICAgLy9pZiAodGhpcy5hc3luY2hyb25vdXMpIGNhbGxiYWNrKCk7XG4vLyAgICBjb25zb2xlLmxvZyhjYWxsYmFjaylcblxuLy8gaWYgKGlzV2VicGFjazQpIHtcbi8vICAgY29uc29sZS5sb2cocGF0aC5qb2luKHRoaXMub3V0cHV0LCAnZXh0LmpzJykpXG4vLyAgIGNvbnN0IHN0YXRzID0gZnMuc3RhdFN5bmMocGF0aC5qb2luKG91dHB1dFBhdGgsICdleHQuanMnKSlcbi8vICAgY29uc3QgZmlsZVNpemVJbkJ5dGVzID0gc3RhdHMuc2l6ZVxuLy8gICBjb21waWxhdGlvbi5hc3NldHNbJ2V4dC5qcyddID0ge1xuLy8gICAgIHNvdXJjZTogZnVuY3Rpb24oKSB7cmV0dXJuIGZzLnJlYWRGaWxlU3luYyhwYXRoLmpvaW4ob3V0cHV0UGF0aCwgJ2V4dC5qcycpKX0sXG4vLyAgICAgc2l6ZTogZnVuY3Rpb24oKSB7cmV0dXJuIGZpbGVTaXplSW5CeXRlc31cbi8vICAgfVxuLy8gICBjb25zb2xlLmxvZyhjb21waWxhdGlvbi5lbnRyeXBvaW50cylcblxuLy8gICB2YXIgZmlsZWxpc3QgPSAnSW4gdGhpcyBidWlsZDpcXG5cXG4nO1xuXG4vLyAgIC8vIExvb3AgdGhyb3VnaCBhbGwgY29tcGlsZWQgYXNzZXRzLFxuLy8gICAvLyBhZGRpbmcgYSBuZXcgbGluZSBpdGVtIGZvciBlYWNoIGZpbGVuYW1lLlxuLy8gICBmb3IgKHZhciBmaWxlbmFtZSBpbiBjb21waWxhdGlvbi5hc3NldHMpIHtcbi8vICAgICBmaWxlbGlzdCArPSAoJy0gJysgZmlsZW5hbWUgKydcXG4nKTtcbi8vICAgfVxuXG4vLyAgIC8vIEluc2VydCB0aGlzIGxpc3QgaW50byB0aGUgd2VicGFjayBidWlsZCBhcyBhIG5ldyBmaWxlIGFzc2V0OlxuLy8gICBjb21waWxhdGlvbi5hc3NldHNbJ2ZpbGVsaXN0Lm1kJ10gPSB7XG4vLyAgICAgc291cmNlKCkge1xuLy8gICAgICAgcmV0dXJuIGZpbGVsaXN0O1xuLy8gICAgIH0sXG4vLyAgICAgc2l6ZSgpIHtcbi8vICAgICAgIHJldHVybiBmaWxlbGlzdC5sZW5ndGg7XG4vLyAgICAgfVxuLy8gICB9XG4vLyB9Il19