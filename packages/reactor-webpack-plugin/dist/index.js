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
    var pkg = _fs2.default.existsSync('package.json') && JSON.parse(_fs2.default.readFileSync('package.json', 'utf-8')) || {};
    var reactEntry = pkg.dependencies.react;
    var is16 = reactEntry.includes("16");
    var REACT_VERSION = require('react').version;
    console.log(REACT_VERSION);
    //var is16 = REACT_VERSION.includes("16");

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
          var statements = ['Ext.require(["Ext.app.Application", "Ext.Component", "Ext.Widget", "Ext.layout.Fit", "Ext.reactor.Transition"])']; // for some reason command doesn't load component when only panel is required
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9pbmRleC5qcyJdLCJuYW1lcyI6WyJyZWFkbGluZSIsInJlYWN0VmVyc2lvbiIsIndhdGNoaW5nIiwiY21kRXJyb3JzIiwiYXBwIiwiY2hhbGsiLCJncmVlbiIsImdhdGhlckVycm9ycyIsImNtZCIsInN0ZG91dCIsIm9uIiwibWVzc2FnZSIsImRhdGEiLCJ0b1N0cmluZyIsIm1hdGNoIiwicHVzaCIsInJlcGxhY2UiLCJtb2R1bGUiLCJleHBvcnRzIiwib3B0aW9ucyIsImNvdW50IiwicGtnIiwiZnMiLCJleGlzdHNTeW5jIiwiSlNPTiIsInBhcnNlIiwicmVhZEZpbGVTeW5jIiwicmVhY3RFbnRyeSIsImRlcGVuZGVuY2llcyIsInJlYWN0IiwiaXMxNiIsImluY2x1ZGVzIiwiUkVBQ1RfVkVSU0lPTiIsInJlcXVpcmUiLCJ2ZXJzaW9uIiwiY29uc29sZSIsImxvZyIsImV4dFJlYWN0UmMiLCJnZXREZWZhdWx0T3B0aW9ucyIsImJ1aWxkcyIsIk9iamVjdCIsImtleXMiLCJsZW5ndGgiLCJidWlsZE9wdGlvbnMiLCJleHQiLCJuYW1lIiwiX3ZhbGlkYXRlQnVpbGRDb25maWciLCJhc3NpZ24iLCJjdXJyZW50RmlsZSIsIm1hbmlmZXN0Iiwid2F0Y2giLCJjb21waWxlciIsIndlYnBhY2tWZXJzaW9uIiwidW5kZWZpbmVkIiwiaXNXZWJwYWNrNCIsImhvb2tzIiwiY3Vyc29yVG8iLCJwcm9jZXNzIiwibWUiLCJhc3luY2hyb25vdXMiLCJ3YXRjaFJ1biIsInRhcEFzeW5jIiwiY2IiLCJ0YXAiLCJwbHVnaW4iLCJhZGRUb01hbmlmZXN0IiwiY2FsbCIsImZpbGUiLCJzdGF0ZSIsInJlc291cmNlIiwiZSIsImVycm9yIiwiY29tcGlsYXRpb24iLCJzdWNjZWVkTW9kdWxlIiwibm9ybWFsTW9kdWxlRmFjdG9yeSIsInBhcnNlciIsImVtaXQiLCJjYWxsYmFjayIsImRvbmUiLCJtb2R1bGVzIiwiYnVpbGQiLCJvdXRwdXRQYXRoIiwicGF0aCIsImpvaW4iLCJvdXRwdXQiLCJkZXZTZXJ2ZXIiLCJjb250ZW50QmFzZSIsInByb21pc2UiLCJfYnVpbGRFeHRCdW5kbGUiLCJyZXN1bHQiLCJ1cmwiLCJwb3J0Iiwib3BuIiwidG9vbGtpdCIsInRoZW1lIiwicGFja2FnZXMiLCJwYWNrYWdlRGlycyIsInNkayIsIm92ZXJyaWRlcyIsInNlbmNoYSIsIl9nZXRTZW5jaENtZFBhdGgiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsIm9uQnVpbGRGYWlsIiwib25CdWlsZFN1Y2Nlc3MiLCJvbkJ1aWxkRG9uZSIsIkVycm9yIiwianMiLCJ0cmVlU2hha2luZyIsInN0YXRlbWVudHMiLCJpbmRleE9mIiwiZGVwcyIsImNvbmNhdCIsInVzZXJQYWNrYWdlcyIsIndyaXRlRmlsZVN5bmMiLCJjb21wcmVzcyIsInByb2R1Y3Rpb24iLCJjbWRSZWJ1aWxkTmVlZGVkIiwiY3dkIiwic2lsZW50Iiwic3RkZXJyIiwicGlwZSIsInN0ZGlvIiwiZW5jb2RpbmciLCJkZWJ1ZyIsInRlc3QiLCJtYW5pZmVzdEV4dHJhY3RvciIsImV4dHJhY3RGcm9tSlNYIiwiZG9QYXJzZSIsIl9zb3VyY2UiLCJfdmFsdWUiLCJfYWRkUmVhY3RvclBhY2thZ2UiLCJkaXJuYW1lIiwiYmFzZWRpciIsIl9maW5kUGFja2FnZXMiLCJtb2R1bGVzRGlyIiwicmVhZGRpclN5bmMiLCJmaWx0ZXIiLCJkaXIiLCJtYXAiLCJwYWNrYWdlSW5mbyIsInR5cGUiXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7QUFDQTs7QUFFQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOztBQUNBOzs7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBSUE7O0lBQVlBLFE7Ozs7Ozs7Ozs7Ozs7O0FBZlosSUFBSUMsZUFBZSxDQUFuQjs7QUFZQSxJQUFJQyxXQUFXLEtBQWY7QUFDQSxJQUFJQyxrQkFBSjtBQUNBLElBQU1DLE1BQVNDLGdCQUFNQyxLQUFOLENBQVksVUFBWixDQUFULDhCQUFOOzs7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RCxDQUdFLE9BQU9xQyxDQUFQLEVBQVU7QUFDVjtBQUNBLGVBQU8sUUFBUDtBQUNEO0FBQ0Y7QUF0Y0g7O0FBQUE7QUFBQTs7QUEwY1E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFJUjtBQUNJO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNKOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImluZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuaW1wb3J0ICdiYWJlbC1wb2x5ZmlsbCc7XG52YXIgcmVhY3RWZXJzaW9uID0gMFxuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBjanNvbiBmcm9tICdjanNvbic7XG5pbXBvcnQgeyBzeW5jIGFzIG1rZGlycCB9IGZyb20gJ21rZGlycCc7XG5pbXBvcnQgZXh0cmFjdEZyb21KU1ggZnJvbSAnLi9leHRyYWN0RnJvbUpTWCc7XG5pbXBvcnQgeyBzeW5jIGFzIHJpbXJhZiB9IGZyb20gJ3JpbXJhZic7XG5pbXBvcnQgeyBidWlsZFhNTCwgY3JlYXRlQXBwSnNvbiwgY3JlYXRlV29ya3NwYWNlSnNvbiwgY3JlYXRlSlNET01FbnZpcm9ubWVudCB9IGZyb20gJy4vYXJ0aWZhY3RzJztcbmltcG9ydCB7IGV4ZWNTeW5jLCBzcGF3biwgZm9yayB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0IHsgZ2VuZXJhdGUgfSBmcm9tICdhc3RyaW5nJztcbmltcG9ydCB7IHN5bmMgYXMgcmVzb2x2ZSB9IGZyb20gJ3Jlc29sdmUnO1xubGV0IHdhdGNoaW5nID0gZmFsc2U7XG5sZXQgY21kRXJyb3JzO1xuY29uc3QgYXBwID0gYCR7Y2hhbGsuZ3JlZW4oJ+KEuSDvvaJleHTvvaM6Jyl9IHJlYWN0b3Itd2VicGFjay1wbHVnaW46IGA7XG5pbXBvcnQgKiBhcyByZWFkbGluZSBmcm9tICdyZWFkbGluZSdcblxuY29uc3QgZ2F0aGVyRXJyb3JzID0gKGNtZCkgPT4ge1xuICBpZiAoY21kLnN0ZG91dCkge1xuICAgIGNtZC5zdGRvdXQub24oJ2RhdGEnLCBkYXRhID0+IHtcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSBkYXRhLnRvU3RyaW5nKCk7XG4gICAgICBpZiAobWVzc2FnZS5tYXRjaCgvXlxcW0VSUlxcXS8pKSB7XG4gICAgICAgIGNtZEVycm9ycy5wdXNoKG1lc3NhZ2UucmVwbGFjZSgvXlxcW0VSUlxcXSAvZ2ksICcnKSk7XG4gICAgICB9XG4gICAgfSlcbiAgfVxuICByZXR1cm4gY21kO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIFJlYWN0RXh0SlNXZWJwYWNrUGx1Z2luIHtcbiAgLyoqXG4gICAqIEBwYXJhbSB7T2JqZWN0W119IGJ1aWxkc1xuICAgKiBAcGFyYW0ge0Jvb2xlYW59IFtkZWJ1Zz1mYWxzZV0gU2V0IHRvIHRydWUgdG8gcHJldmVudCBjbGVhbnVwIG9mIGJ1aWxkIHRlbXBvcmFyeSBidWlsZCBhcnRpZmFjdHMgdGhhdCBtaWdodCBiZSBoZWxwZnVsIGluIHRyb3VibGVzaG9vdGluZyBpc3N1ZXMuXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBzZGsgVGhlIGZ1bGwgcGF0aCB0byB0aGUgRXh0UmVhY3QgU0RLXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBbdG9vbGtpdD0nbW9kZXJuJ10gXCJtb2Rlcm5cIiBvciBcImNsYXNzaWNcIlxuICAgKiBAcGFyYW0ge1N0cmluZ30gdGhlbWUgVGhlIG5hbWUgb2YgdGhlIEV4dFJlYWN0IHRoZW1lIHBhY2thZ2UgdG8gdXNlLCBmb3IgZXhhbXBsZSBcInRoZW1lLW1hdGVyaWFsXCJcbiAgICogQHBhcmFtIHtTdHJpbmdbXX0gcGFja2FnZXMgQW4gYXJyYXkgb2YgRXh0UmVhY3QgcGFja2FnZXMgdG8gaW5jbHVkZVxuICAgKiBAcGFyYW0ge1N0cmluZ1tdfSBvdmVycmlkZXMgQW4gYXJyYXkgd2l0aCB0aGUgcGF0aHMgb2YgZGlyZWN0b3JpZXMgb3IgZmlsZXMgdG8gc2VhcmNoLiBBbnkgY2xhc3Nlc1xuICAgKiBkZWNsYXJlZCBpbiB0aGVzZSBsb2NhdGlvbnMgd2lsbCBiZSBhdXRvbWF0aWNhbGx5IHJlcXVpcmVkIGFuZCBpbmNsdWRlZCBpbiB0aGUgYnVpbGQuXG4gICAqIElmIGFueSBmaWxlIGRlZmluZXMgYW4gRXh0UmVhY3Qgb3ZlcnJpZGUgKHVzaW5nIEV4dC5kZWZpbmUgd2l0aCBhbiBcIm92ZXJyaWRlXCIgcHJvcGVydHkpLFxuICAgKiB0aGF0IG92ZXJyaWRlIHdpbGwgaW4gZmFjdCBvbmx5IGJlIGluY2x1ZGVkIGluIHRoZSBidWlsZCBpZiB0aGUgdGFyZ2V0IGNsYXNzIHNwZWNpZmllZFxuICAgKiBpbiB0aGUgXCJvdmVycmlkZVwiIHByb3BlcnR5IGlzIGFsc28gaW5jbHVkZWQuXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBvdXRwdXQgVGhlIHBhdGggdG8gZGlyZWN0b3J5IHdoZXJlIHRoZSBFeHRSZWFjdCBidW5kbGUgc2hvdWxkIGJlIHdyaXR0ZW5cbiAgICogQHBhcmFtIHtCb29sZWFufSBhc3luY2hyb25vdXMgU2V0IHRvIHRydWUgdG8gcnVuIFNlbmNoYSBDbWQgYnVpbGRzIGFzeW5jaHJvbm91c2x5LiBUaGlzIG1ha2VzIHRoZSB3ZWJwYWNrIGJ1aWxkIGZpbmlzaCBtdWNoIGZhc3RlciwgYnV0IHRoZSBhcHAgbWF5IG5vdCBsb2FkIGNvcnJlY3RseSBpbiB5b3VyIGJyb3dzZXIgdW50aWwgU2VuY2hhIENtZCBpcyBmaW5pc2hlZCBidWlsZGluZyB0aGUgRXh0UmVhY3QgYnVuZGxlXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gcHJvZHVjdGlvbiBTZXQgdG8gdHJ1ZSBmb3IgcHJvZHVjdGlvbiBidWlsZHMuICBUaGlzIHRlbGwgU2VuY2hhIENtZCB0byBjb21wcmVzcyB0aGUgZ2VuZXJhdGVkIEpTIGJ1bmRsZS5cbiAgICogQHBhcmFtIHtCb29sZWFufSB0cmVlU2hha2luZyBTZXQgdG8gZmFsc2UgdG8gZGlzYWJsZSB0cmVlIHNoYWtpbmcgaW4gZGV2ZWxvcG1lbnQgYnVpbGRzLiAgVGhpcyBtYWtlcyBpbmNyZW1lbnRhbCByZWJ1aWxkcyBmYXN0ZXIgYXMgYWxsIEV4dFJlYWN0IGNvbXBvbmVudHMgYXJlIGluY2x1ZGVkIGluIHRoZSBleHQuanMgYnVuZGxlIGluIHRoZSBpbml0aWFsIGJ1aWxkIGFuZCB0aHVzIHRoZSBidW5kbGUgZG9lcyBub3QgbmVlZCB0byBiZSByZWJ1aWx0IGFmdGVyIGVhY2ggY2hhbmdlLiBEZWZhdWx0cyB0byB0cnVlLlxuICAgKi9cbiAgY29uc3RydWN0b3Iob3B0aW9ucykge1xuICAgIHRoaXMuY291bnQgPSAwXG4gICAgLy9jYW4gYmUgaW4gZGV2ZGVwZW5kZW5jaWVzIC0gYWNjb3VudCBmb3IgdGhpczogcmVhY3Q6IFwiMTUuMTYuMFwiXG4gICAgdmFyIHBrZyA9IChmcy5leGlzdHNTeW5jKCdwYWNrYWdlLmpzb24nKSAmJiBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYygncGFja2FnZS5qc29uJywgJ3V0Zi04JykpIHx8IHt9KTtcbiAgICB2YXIgcmVhY3RFbnRyeSA9IHBrZy5kZXBlbmRlbmNpZXMucmVhY3RcbiAgICB2YXIgaXMxNiA9IHJlYWN0RW50cnkuaW5jbHVkZXMoXCIxNlwiKTtcbiAgICBjb25zdCBSRUFDVF9WRVJTSU9OID0gcmVxdWlyZSgncmVhY3QnKS52ZXJzaW9uXG4gICAgY29uc29sZS5sb2coUkVBQ1RfVkVSU0lPTilcbiAgICAvL3ZhciBpczE2ID0gUkVBQ1RfVkVSU0lPTi5pbmNsdWRlcyhcIjE2XCIpO1xuXG4gICAgaWYgKGlzMTYpIHsgcmVhY3RWZXJzaW9uID0gMTYgfVxuICAgIGVsc2UgeyByZWFjdFZlcnNpb24gPSAxNSB9XG4gICAgdGhpcy5yZWFjdFZlcnNpb24gPSByZWFjdFZlcnNpb25cbiAgICBjb25zdCBleHRSZWFjdFJjID0gKGZzLmV4aXN0c1N5bmMoJy5leHQtcmVhY3RyYycpICYmIEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKCcuZXh0LXJlYWN0cmMnLCAndXRmLTgnKSkgfHwge30pO1xuICAgIG9wdGlvbnMgPSB7IC4uLnRoaXMuZ2V0RGVmYXVsdE9wdGlvbnMoKSwgLi4ub3B0aW9ucywgLi4uZXh0UmVhY3RSYyB9O1xuICAgIGNvbnN0IHsgYnVpbGRzIH0gPSBvcHRpb25zO1xuICAgIGlmIChPYmplY3Qua2V5cyhidWlsZHMpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgY29uc3QgeyBidWlsZHMsIC4uLmJ1aWxkT3B0aW9ucyB9ID0gb3B0aW9ucztcbiAgICAgIGJ1aWxkcy5leHQgPSBidWlsZE9wdGlvbnM7XG4gICAgfVxuICAgIGZvciAobGV0IG5hbWUgaW4gYnVpbGRzKVxuICAgICAgdGhpcy5fdmFsaWRhdGVCdWlsZENvbmZpZyhuYW1lLCBidWlsZHNbbmFtZV0pO1xuICAgIE9iamVjdC5hc3NpZ24odGhpcywge1xuICAgICAgLi4ub3B0aW9ucyxcbiAgICAgIGN1cnJlbnRGaWxlOiBudWxsLFxuICAgICAgbWFuaWZlc3Q6IG51bGwsXG4gICAgICBkZXBlbmRlbmNpZXM6IFtdXG4gICAgfSk7XG4gIH1cblxuICB3YXRjaFJ1bigpIHtcbiAgICB0aGlzLndhdGNoID0gdHJ1ZVxuICB9XG5cbiAgYXBwbHkoY29tcGlsZXIpIHtcbiAgICBpZiAodGhpcy53ZWJwYWNrVmVyc2lvbiA9PSB1bmRlZmluZWQpIHtcbiAgICAgIGNvbnN0IGlzV2VicGFjazQgPSBjb21waWxlci5ob29rcztcbiAgICAgIGlmIChpc1dlYnBhY2s0KSB7dGhpcy53ZWJwYWNrVmVyc2lvbiA9ICdJUyB3ZWJwYWNrIDQnfVxuICAgICAgZWxzZSB7dGhpcy53ZWJwYWNrVmVyc2lvbiA9ICdOT1Qgd2VicGFjayA0J31cbiAgICAgIHJlYWRsaW5lLmN1cnNvclRvKHByb2Nlc3Muc3Rkb3V0LCAwKTtjb25zb2xlLmxvZyhhcHAgKyAncmVhY3RWZXJzaW9uOiAnICsgdGhpcy5yZWFjdFZlcnNpb24gKyAnLCAnICsgdGhpcy53ZWJwYWNrVmVyc2lvbilcbiAgICB9XG4gICAgY29uc3QgbWUgPSB0aGlzO1xuXG4gICAgaWYgKGNvbXBpbGVyLmhvb2tzKSB7XG4gICAgICBpZiAodGhpcy5hc3luY2hyb25vdXMpIHtcbiAgICAgICAgY29tcGlsZXIuaG9va3Mud2F0Y2hSdW4udGFwQXN5bmMoJ2V4dHJlYWN0LXdhdGNoLXJ1biAoYXN5bmMpJywgKHdhdGNoaW5nLCBjYikgPT4ge1xuICAgICAgICAgIHJlYWRsaW5lLmN1cnNvclRvKHByb2Nlc3Muc3Rkb3V0LCAwKTtjb25zb2xlLmxvZyhhcHAgKyAnZXh0cmVhY3Qtd2F0Y2gtcnVuIChhc3luYyknKVxuICAgICAgICAgIHRoaXMud2F0Y2hSdW4oKVxuICAgICAgICAgIGNiKClcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBjb21waWxlci5ob29rcy53YXRjaFJ1bi50YXAoJ2V4dHJlYWN0LXdhdGNoLXJ1bicsICh3YXRjaGluZykgPT4ge1xuICAgICAgICAgIHJlYWRsaW5lLmN1cnNvclRvKHByb2Nlc3Muc3Rkb3V0LCAwKTtjb25zb2xlLmxvZyhhcHAgKyAnZXh0cmVhY3Qtd2F0Y2gtcnVuJylcbiAgICAgICAgICB0aGlzLndhdGNoUnVuKClcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBjb21waWxlci5wbHVnaW4oJ3dhdGNoLXJ1bicsICh3YXRjaGluZywgY2IpID0+IHtcbiAgICAgICAgcmVhZGxpbmUuY3Vyc29yVG8ocHJvY2Vzcy5zdGRvdXQsIDApO2NvbnNvbGUubG9nKGFwcCArICd3YXRjaC1ydW4nKVxuICAgICAgICB0aGlzLndhdGNoUnVuKClcbiAgICAgICAgY2IoKVxuICAgICAgfSlcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBZGRzIHRoZSBjb2RlIGZvciB0aGUgc3BlY2lmaWVkIGZ1bmN0aW9uIGNhbGwgdG8gdGhlIG1hbmlmZXN0LmpzIGZpbGVcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gY2FsbCBBIGZ1bmN0aW9uIGNhbGwgQVNUIG5vZGUuXG4gICAgICovXG4gICAgY29uc3QgYWRkVG9NYW5pZmVzdCA9IGZ1bmN0aW9uKGNhbGwpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGZpbGUgPSB0aGlzLnN0YXRlLm1vZHVsZS5yZXNvdXJjZTtcbiAgICAgICAgbWUuZGVwZW5kZW5jaWVzW2ZpbGVdID0gWyAuLi4obWUuZGVwZW5kZW5jaWVzW2ZpbGVdIHx8IFtdKSwgZ2VuZXJhdGUoY2FsbCkgXTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihgRXJyb3IgcHJvY2Vzc2luZyAke2ZpbGV9YCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGlmIChjb21waWxlci5ob29rcykge1xuICAgICAgY29tcGlsZXIuaG9va3MuY29tcGlsYXRpb24udGFwKCdleHRyZWFjdC1jb21waWxhdGlvbicsIChjb21waWxhdGlvbixkYXRhKSA9PiB7XG4gICAgICAgIHJlYWRsaW5lLmN1cnNvclRvKHByb2Nlc3Muc3Rkb3V0LCAwKTtjb25zb2xlLmxvZyhhcHAgKyAnZXh0cmVhY3QtY29tcGlsYXRpb24nKVxuICAgICAgICBjb21waWxhdGlvbi5ob29rcy5zdWNjZWVkTW9kdWxlLnRhcCgnZXh0cmVhY3Qtc3VjY2VlZC1tb2R1bGUnLCAobW9kdWxlKSA9PiB7XG4gICAgICAgICAgdGhpcy5zdWNjZWVkTW9kdWxlKGNvbXBpbGF0aW9uLCBtb2R1bGUpXG4gICAgICAgIH0pXG5cbiAgICAgICAgZGF0YS5ub3JtYWxNb2R1bGVGYWN0b3J5LnBsdWdpbihcInBhcnNlclwiLCBmdW5jdGlvbihwYXJzZXIsIG9wdGlvbnMpIHtcbiAgICAgICAgICAvLyBleHRyYWN0IHh0eXBlcyBhbmQgY2xhc3NlcyBmcm9tIEV4dC5jcmVhdGUgY2FsbHNcbiAgICAgICAgICBwYXJzZXIucGx1Z2luKCdjYWxsIEV4dC5jcmVhdGUnLCBhZGRUb01hbmlmZXN0KTtcbiAgICAgICAgICAvLyBjb3B5IEV4dC5yZXF1aXJlIGNhbGxzIHRvIHRoZSBtYW5pZmVzdC4gIFRoaXMgYWxsb3dzIHRoZSB1c2VycyB0byBleHBsaWNpdGx5IHJlcXVpcmUgYSBjbGFzcyBpZiB0aGUgcGx1Z2luIGZhaWxzIHRvIGRldGVjdCBpdC5cbiAgICAgICAgICBwYXJzZXIucGx1Z2luKCdjYWxsIEV4dC5yZXF1aXJlJywgYWRkVG9NYW5pZmVzdCk7XG4gICAgICAgICAgLy8gY29weSBFeHQuZGVmaW5lIGNhbGxzIHRvIHRoZSBtYW5pZmVzdC4gIFRoaXMgYWxsb3dzIHVzZXJzIHRvIHdyaXRlIHN0YW5kYXJkIEV4dFJlYWN0IGNsYXNzZXMuXG4gICAgICAgICAgcGFyc2VyLnBsdWdpbignY2FsbCBFeHQuZGVmaW5lJywgYWRkVG9NYW5pZmVzdCk7XG4gICAgICAgIH0pXG4gICAgICB9KVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGNvbXBpbGVyLnBsdWdpbignY29tcGlsYXRpb24nLCAoY29tcGlsYXRpb24sIGRhdGEpID0+IHtcbiAgICAgICAgcmVhZGxpbmUuY3Vyc29yVG8ocHJvY2Vzcy5zdGRvdXQsIDApO2NvbnNvbGUubG9nKGFwcCArICdjb21waWxhdGlvbicpXG4gICAgICAgIGNvbXBpbGF0aW9uLnBsdWdpbignc3VjY2VlZC1tb2R1bGUnLCAobW9kdWxlKSA9PiB7XG4gICAgICAgICAgdGhpcy5zdWNjZWVkTW9kdWxlKGNvbXBpbGF0aW9uLCBtb2R1bGUpXG4gICAgICAgIH0pXG4gICAgICAgIGRhdGEubm9ybWFsTW9kdWxlRmFjdG9yeS5wbHVnaW4oXCJwYXJzZXJcIiwgZnVuY3Rpb24ocGFyc2VyLCBvcHRpb25zKSB7XG4gICAgICAgICAgLy8gZXh0cmFjdCB4dHlwZXMgYW5kIGNsYXNzZXMgZnJvbSBFeHQuY3JlYXRlIGNhbGxzXG4gICAgICAgICAgcGFyc2VyLnBsdWdpbignY2FsbCBFeHQuY3JlYXRlJywgYWRkVG9NYW5pZmVzdCk7XG4gICAgICAgICAgLy8gY29weSBFeHQucmVxdWlyZSBjYWxscyB0byB0aGUgbWFuaWZlc3QuICBUaGlzIGFsbG93cyB0aGUgdXNlcnMgdG8gZXhwbGljaXRseSByZXF1aXJlIGEgY2xhc3MgaWYgdGhlIHBsdWdpbiBmYWlscyB0byBkZXRlY3QgaXQuXG4gICAgICAgICAgcGFyc2VyLnBsdWdpbignY2FsbCBFeHQucmVxdWlyZScsIGFkZFRvTWFuaWZlc3QpO1xuICAgICAgICAgIC8vIGNvcHkgRXh0LmRlZmluZSBjYWxscyB0byB0aGUgbWFuaWZlc3QuICBUaGlzIGFsbG93cyB1c2VycyB0byB3cml0ZSBzdGFuZGFyZCBFeHRSZWFjdCBjbGFzc2VzLlxuICAgICAgICAgIHBhcnNlci5wbHVnaW4oJ2NhbGwgRXh0LmRlZmluZScsIGFkZFRvTWFuaWZlc3QpO1xuICAgICAgICB9KVxuXG4gICAgICB9KVxuICAgIH1cblxuLy8qZW1pdCAtIG9uY2UgYWxsIG1vZHVsZXMgYXJlIHByb2Nlc3NlZCwgY3JlYXRlIHRoZSBvcHRpbWl6ZWQgRXh0UmVhY3QgYnVpbGQuXG4gICAgaWYgKGNvbXBpbGVyLmhvb2tzKSB7XG4gICAgICAvL2lmICh0aGlzLmFzeW5jaHJvbm91cykge1xuICAgICAgaWYgKHRydWUpIHtcbiAgICAgICAgY29tcGlsZXIuaG9va3MuZW1pdC50YXBBc3luYygnZXh0cmVhY3QtZW1pdCAoYXN5bmMpJywgKGNvbXBpbGF0aW9uLCBjYWxsYmFjaykgPT4ge1xuICAgICAgICAgIHJlYWRsaW5lLmN1cnNvclRvKHByb2Nlc3Muc3Rkb3V0LCAwKTtjb25zb2xlLmxvZyhhcHAgKyAnZXh0cmVhY3QtZW1pdCAgKGFzeW5jKScpXG4gICAgICAgICAgdGhpcy5lbWl0KGNvbXBpbGVyLCBjb21waWxhdGlvbiwgY2FsbGJhY2spXG4gICAgICAgICAgLy9jb25zb2xlLmxvZyhhcHAgKyAnYWZ0ZXIgZXh0cmVhY3QtZW1pdCAgKGFzeW5jKScpXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgY29tcGlsZXIuaG9va3MuZW1pdC50YXAoJ2V4dHJlYWN0LWVtaXQnLCAoY29tcGlsYXRpb24pID0+IHtcbiAgICAgICAgICByZWFkbGluZS5jdXJzb3JUbyhwcm9jZXNzLnN0ZG91dCwgMCk7Y29uc29sZS5sb2coYXBwICsgJ2V4dHJlYWN0LWVtaXQnKVxuICAgICAgICAgIHRoaXMuZW1pdChjb21waWxlciwgY29tcGlsYXRpb24pXG4gICAgICAgICAgY29uc29sZS5sb2coYXBwICsgJ2FmdGVyIGV4dHJlYWN0LWVtaXQnKVxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGNvbXBpbGVyLnBsdWdpbignZW1pdCcsIChjb21waWxhdGlvbiwgY2FsbGJhY2spID0+IHtcbiAgICAgICAgcmVhZGxpbmUuY3Vyc29yVG8ocHJvY2Vzcy5zdGRvdXQsIDApO2NvbnNvbGUubG9nKGFwcCArICdlbWl0JylcbiAgICAgICAgdGhpcy5lbWl0KGNvbXBpbGVyLCBjb21waWxhdGlvbiwgY2FsbGJhY2spXG4gICAgICAgIGNhbGxiYWNrKClcbiAgICAgIH0pXG4gICAgfVxuXG4gICAgaWYgKGNvbXBpbGVyLmhvb2tzKSB7XG4gICAgICBpZiAodGhpcy5hc3luY2hyb25vdXMpIHtcbiAgICAgICAgY29tcGlsZXIuaG9va3MuZG9uZS50YXBBc3luYygnZXh0cmVhY3QtZG9uZSAoYXN5bmMpJywgKGNvbXBpbGF0aW9uLCBjYWxsYmFjaykgPT4ge1xuICAgICAgICAgIHJlYWRsaW5lLmN1cnNvclRvKHByb2Nlc3Muc3Rkb3V0LCAwKTtjb25zb2xlLmxvZyhhcHAgKyAnZXh0cmVhY3QtZG9uZSAoYXN5bmMpJylcbiAgICAgICAgICBpZiAoY2FsbGJhY2sgIT0gbnVsbCkgXG4gICAgICAgICAge1xuICAgICAgICAgICAgaWYgKHRoaXMuYXN5bmNocm9ub3VzKSBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2NhbGxpbmcgY2FsbGJhY2sgZm9yIGV4dHJlYWN0LWVtaXQgIChhc3luYyknKVxuICAgICAgICAgICAgICBjYWxsYmFjaygpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIGNvbXBpbGVyLmhvb2tzLmRvbmUudGFwKCdleHRyZWFjdC1kb25lJywgKCkgPT4ge1xuICAgICAgICAgIHJlYWRsaW5lLmN1cnNvclRvKHByb2Nlc3Muc3Rkb3V0LCAwKTtjb25zb2xlLmxvZyhhcHAgKyAnZXh0cmVhY3QtZG9uZScpXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgZW1pdChjb21waWxlciwgY29tcGlsYXRpb24sIGNhbGxiYWNrKSB7XG4gICAgdmFyIGlzV2VicGFjazQgPSBjb21waWxhdGlvbi5ob29rcztcbiAgICB2YXIgbW9kdWxlcyA9IFtdXG4gICAgaWYgKGlzV2VicGFjazQpIHtcbiAgICAgIGlzV2VicGFjazQgPSB0cnVlXG4gICAgICAvL21vZHVsZXMgPSBjb21waWxhdGlvbi5jaHVua3MucmVkdWNlKChhLCBiKSA9PiBhLmNvbmNhdChiLl9tb2R1bGVzKSwgW10pO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGlzV2VicGFjazQgPSBmYWxzZVxuICAgICAgLy9tb2R1bGVzID0gY29tcGlsYXRpb24uY2h1bmtzLnJlZHVjZSgoYSwgYikgPT4gYS5jb25jYXQoYi5tb2R1bGVzKSwgW10pO1xuICAgIH1cbiAgICBjb25zdCBidWlsZCA9IHRoaXMuYnVpbGRzW09iamVjdC5rZXlzKHRoaXMuYnVpbGRzKVswXV07XG4gICAgbGV0IG91dHB1dFBhdGggPSBwYXRoLmpvaW4oY29tcGlsZXIub3V0cHV0UGF0aCwgdGhpcy5vdXRwdXQpO1xuICAgIC8vIHdlYnBhY2stZGV2LXNlcnZlciBvdmVyd3JpdGVzIHRoZSBvdXRwdXRQYXRoIHRvIFwiL1wiLCBzbyB3ZSBuZWVkIHRvIHByZXBlbmQgY29udGVudEJhc2VcbiAgICBpZiAoY29tcGlsZXIub3V0cHV0UGF0aCA9PT0gJy8nICYmIGNvbXBpbGVyLm9wdGlvbnMuZGV2U2VydmVyKSB7XG4gICAgICBvdXRwdXRQYXRoID0gcGF0aC5qb2luKGNvbXBpbGVyLm9wdGlvbnMuZGV2U2VydmVyLmNvbnRlbnRCYXNlLCBvdXRwdXRQYXRoKTtcbiAgICB9XG4gICAgLy9jb25zb2xlLmxvZygnXFxuKioqKipvdXRwdXRQYXRoOiAnICsgb3V0cHV0UGF0aClcblxuICAgIGxldCBwcm9taXNlID0gdGhpcy5fYnVpbGRFeHRCdW5kbGUoaXNXZWJwYWNrNCwgJ25vdCcsIG1vZHVsZXMsIG91dHB1dFBhdGgsIGJ1aWxkLCBjYWxsYmFjaylcbiAgICBsZXQgcmVzdWx0ID0gYXdhaXQgcHJvbWlzZVxuXG4gICAgaWYgKHRoaXMud2F0Y2gpIHtcbiAgICAgIGlmICh0aGlzLmNvdW50ID09IDApIHtcbiAgICAgICAgdmFyIHVybCA9ICdodHRwOi8vbG9jYWxob3N0OicgKyB0aGlzLnBvcnRcbiAgICAgICAgcmVhZGxpbmUuY3Vyc29yVG8ocHJvY2Vzcy5zdGRvdXQsIDApO2NvbnNvbGUubG9nKGFwcCArICdleHRyZWFjdC1lbWl0IC0gb3BlbiBicm93c2VyIGF0ICcgKyB1cmwpXG4gICAgICAgIHRoaXMuY291bnQrK1xuICAgICAgICBjb25zdCBvcG4gPSByZXF1aXJlKCdvcG4nKVxuICAgICAgICBvcG4odXJsKVxuICAgICAgfVxuICAgIH1cbiAgICAvL2lmIChjYWxsYmFjayAhPSBudWxsKXtpZiAodGhpcy5hc3luY2hyb25vdXMpe2NhbGxiYWNrKCl9fVxuICAgIGlmIChjYWxsYmFjayAhPSBudWxsKXtpZiAodHJ1ZSl7Y2FsbGJhY2soKX19XG4gIH1cblxuICAvKipcbiAgIC8qKlxuICAgICogQnVpbGRzIGEgbWluaW1hbCB2ZXJzaW9uIG9mIHRoZSBFeHRSZWFjdCBmcmFtZXdvcmsgYmFzZWQgb24gdGhlIGNsYXNzZXMgdXNlZFxuICAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgVGhlIG5hbWUgb2YgdGhlIGJ1aWxkXG4gICAgKiBAcGFyYW0ge01vZHVsZVtdfSBtb2R1bGVzIHdlYnBhY2sgbW9kdWxlc1xuICAgICogQHBhcmFtIHtTdHJpbmd9IG91dHB1dCBUaGUgcGF0aCB0byB3aGVyZSB0aGUgZnJhbWV3b3JrIGJ1aWxkIHNob3VsZCBiZSB3cml0dGVuXG4gICAgKiBAcGFyYW0ge1N0cmluZ30gW3Rvb2xraXQ9J21vZGVybiddIFwibW9kZXJuXCIgb3IgXCJjbGFzc2ljXCJcbiAgICAqIEBwYXJhbSB7U3RyaW5nfSBvdXRwdXQgVGhlIHBhdGggdG8gdGhlIGRpcmVjdG9yeSB0byBjcmVhdGUgd2hpY2ggd2lsbCBjb250YWluIHRoZSBqcyBhbmQgY3NzIGJ1bmRsZXNcbiAgICAqIEBwYXJhbSB7U3RyaW5nfSB0aGVtZSBUaGUgbmFtZSBvZiB0aGUgRXh0UmVhY3QgdGhlbWUgcGFja2FnZSB0byB1c2UsIGZvciBleGFtcGxlIFwidGhlbWUtbWF0ZXJpYWxcIlxuICAgICogQHBhcmFtIHtTdHJpbmdbXX0gcGFja2FnZXMgQW4gYXJyYXkgb2YgRXh0UmVhY3QgcGFja2FnZXMgdG8gaW5jbHVkZVxuICAgICogQHBhcmFtIHtTdHJpbmdbXX0gcGFja2FnZURpcnMgRGlyZWN0b3JpZXMgY29udGFpbmluZyBwYWNrYWdlc1xuICAgICogQHBhcmFtIHtTdHJpbmdbXX0gb3ZlcnJpZGVzIEFuIGFycmF5IG9mIGxvY2F0aW9ucyBmb3Igb3ZlcnJpZGVzXG4gICAgKiBAcGFyYW0ge1N0cmluZ30gc2RrIFRoZSBmdWxsIHBhdGggdG8gdGhlIEV4dFJlYWN0IFNES1xuICAgICogQHByaXZhdGVcbiAgICAqL1xuICBfYnVpbGRFeHRCdW5kbGUoaXNXZWJwYWNrNCwgbmFtZSwgbW9kdWxlcywgb3V0cHV0LCB7IHRvb2xraXQ9J21vZGVybicsIHRoZW1lLCBwYWNrYWdlcz1bXSwgcGFja2FnZURpcnM9W10sIHNkaywgb3ZlcnJpZGVzLCBjYWxsYmFja30pIHtcbiAgICBsZXQgc2VuY2hhID0gdGhpcy5fZ2V0U2VuY2hDbWRQYXRoKCk7XG4gICAgdGhlbWUgPSB0aGVtZSB8fCAodG9vbGtpdCA9PT0gJ2NsYXNzaWMnID8gJ3RoZW1lLXRyaXRvbicgOiAndGhlbWUtbWF0ZXJpYWwnKTtcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB0aGlzLm9uQnVpbGRGYWlsID0gcmVqZWN0O1xuICAgICAgdGhpcy5vbkJ1aWxkU3VjY2VzcyA9IHJlc29sdmU7XG4gICAgICBjbWRFcnJvcnMgPSBbXTtcbiAgICAgIFxuICAgICAgY29uc3Qgb25CdWlsZERvbmUgPSAoKSA9PiB7XG4gICAgICAgIGlmIChjbWRFcnJvcnMubGVuZ3RoKSB7XG4gICAgICAgICAgdGhpcy5vbkJ1aWxkRmFpbChuZXcgRXJyb3IoY21kRXJyb3JzLmpvaW4oXCJcIikpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLm9uQnVpbGRTdWNjZXNzKCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKCF3YXRjaGluZykge1xuICAgICAgICByaW1yYWYob3V0cHV0KTtcbiAgICAgICAgbWtkaXJwKG91dHB1dCk7XG4gICAgICB9XG5cbiAgICAgIGxldCBqcztcbiAgICAgIGlmICh0aGlzLnRyZWVTaGFraW5nKSB7XG4gICAgICAgIGxldCBzdGF0ZW1lbnRzID0gWydFeHQucmVxdWlyZShbXCJFeHQuYXBwLkFwcGxpY2F0aW9uXCIsIFwiRXh0LkNvbXBvbmVudFwiLCBcIkV4dC5XaWRnZXRcIiwgXCJFeHQubGF5b3V0LkZpdFwiLCBcIkV4dC5yZWFjdG9yLlRyYW5zaXRpb25cIl0pJ107IC8vIGZvciBzb21lIHJlYXNvbiBjb21tYW5kIGRvZXNuJ3QgbG9hZCBjb21wb25lbnQgd2hlbiBvbmx5IHBhbmVsIGlzIHJlcXVpcmVkXG4gICAgICAgIGlmIChwYWNrYWdlcy5pbmRleE9mKCdyZWFjdG9yJykgIT09IC0xKSB7XG4gICAgICAgICAgc3RhdGVtZW50cy5wdXNoKCdFeHQucmVxdWlyZShcIkV4dC5yZWFjdG9yLlJlbmRlcmVyQ2VsbFwiKScpO1xuICAgICAgICB9XG4gICAgICAgIC8vbWpnXG4gICAgICAgIGZvciAobGV0IG1vZHVsZSBvZiBtb2R1bGVzKSB7XG4gICAgICAgICAgY29uc3QgZGVwcyA9IHRoaXMuZGVwZW5kZW5jaWVzW21vZHVsZS5yZXNvdXJjZV07XG4gICAgICAgICAgaWYgKGRlcHMpIHN0YXRlbWVudHMgPSBzdGF0ZW1lbnRzLmNvbmNhdChkZXBzKTtcbiAgICAgICAgfVxuICAgICAgICBqcyA9IHN0YXRlbWVudHMuam9pbignO1xcbicpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAganMgPSAnRXh0LnJlcXVpcmUoXCJFeHQuKlwiKSc7XG4gICAgICB9XG4gICAgICBjb25zdCBtYW5pZmVzdCA9IHBhdGguam9pbihvdXRwdXQsICdtYW5pZmVzdC5qcycpO1xuICAgICAgLy8gYWRkIGV4dC1yZWFjdC9wYWNrYWdlcyBhdXRvbWF0aWNhbGx5IGlmIHByZXNlbnRcbiAgICAgIGNvbnN0IHVzZXJQYWNrYWdlcyA9IHBhdGguam9pbignLicsICdleHQtcmVhY3QnLCAncGFja2FnZXMnKTtcbiAgICAgIGlmIChmcy5leGlzdHNTeW5jKHVzZXJQYWNrYWdlcykpIHtcbiAgICAgICAgcGFja2FnZURpcnMucHVzaCh1c2VyUGFja2FnZXMpXG4gICAgICB9XG5cbiAgICAgIGlmIChmcy5leGlzdHNTeW5jKHBhdGguam9pbihzZGssICdleHQnKSkpIHtcbiAgICAgICAgLy8gbG9jYWwgY2hlY2tvdXQgb2YgdGhlIFNESyByZXBvXG4gICAgICAgIHBhY2thZ2VEaXJzLnB1c2gocGF0aC5qb2luKCdleHQnLCAncGFja2FnZXMnKSk7XG4gICAgICAgIHNkayA9IHBhdGguam9pbihzZGssICdleHQnKTtcbiAgICAgIH1cbiAgICAgIGlmICghd2F0Y2hpbmcpIHtcbiAgICAgICAgZnMud3JpdGVGaWxlU3luYyhwYXRoLmpvaW4ob3V0cHV0LCAnYnVpbGQueG1sJyksIGJ1aWxkWE1MKHsgY29tcHJlc3M6IHRoaXMucHJvZHVjdGlvbiB9KSwgJ3V0ZjgnKTtcbiAgICAgICAgZnMud3JpdGVGaWxlU3luYyhwYXRoLmpvaW4ob3V0cHV0LCAnanNkb20tZW52aXJvbm1lbnQuanMnKSwgY3JlYXRlSlNET01FbnZpcm9ubWVudCgpLCAndXRmOCcpO1xuICAgICAgICBmcy53cml0ZUZpbGVTeW5jKHBhdGguam9pbihvdXRwdXQsICdhcHAuanNvbicpLCBjcmVhdGVBcHBKc29uKHsgdGhlbWUsIHBhY2thZ2VzLCB0b29sa2l0LCBvdmVycmlkZXMsIHBhY2thZ2VEaXJzIH0pLCAndXRmOCcpO1xuICAgICAgICBmcy53cml0ZUZpbGVTeW5jKHBhdGguam9pbihvdXRwdXQsICd3b3Jrc3BhY2UuanNvbicpLCBjcmVhdGVXb3Jrc3BhY2VKc29uKHNkaywgcGFja2FnZURpcnMsIG91dHB1dCksICd1dGY4Jyk7XG4gICAgICB9XG4gICAgICBsZXQgY21kUmVidWlsZE5lZWRlZCA9IGZhbHNlO1xuICAgICAgaWYgKHRoaXMubWFuaWZlc3QgPT09IG51bGwgfHwganMgIT09IHRoaXMubWFuaWZlc3QpIHtcbiAgICAgICAgLy8gT25seSB3cml0ZSBtYW5pZmVzdCBpZiBpdCBkaWZmZXJzIGZyb20gdGhlIGxhc3QgcnVuLiAgVGhpcyBwcmV2ZW50cyB1bm5lY2Vzc2FyeSBjbWQgcmVidWlsZHMuXG4gICAgICAgIHRoaXMubWFuaWZlc3QgPSBqcztcbiAgICAgICAgLy9yZWFkbGluZS5jdXJzb3JUbyhwcm9jZXNzLnN0ZG91dCwgMCk7Y29uc29sZS5sb2coYXBwICsganMpXG4gICAgICAgIHJlYWRsaW5lLmN1cnNvclRvKHByb2Nlc3Muc3Rkb3V0LCAwKTtjb25zb2xlLmxvZyhhcHAgKyAndHJlZSBzaGFraW5nOiAnICsgdGhpcy50cmVlU2hha2luZylcbiAgICAgICAgZnMud3JpdGVGaWxlU3luYyhtYW5pZmVzdCwganMsICd1dGY4Jyk7XG4gICAgICAgIGNtZFJlYnVpbGROZWVkZWQgPSB0cnVlO1xuICAgICAgICByZWFkbGluZS5jdXJzb3JUbyhwcm9jZXNzLnN0ZG91dCwgMCk7Y29uc29sZS5sb2coYXBwICsgYGJ1aWxkaW5nIEV4dFJlYWN0IGJ1bmRsZSBhdDogJHtvdXRwdXR9YClcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMud2F0Y2gpIHtcbiAgICAgICAgaWYgKCF3YXRjaGluZykge1xuICAgICAgICAgIHdhdGNoaW5nID0gZ2F0aGVyRXJyb3JzKGZvcmsoc2VuY2hhLCBbJ2FudCcsICd3YXRjaCddLCB7IGN3ZDogb3V0cHV0LCBzaWxlbnQ6IHRydWUgfSkpO1xuICAgICAgICAgIHdhdGNoaW5nLnN0ZGVyci5waXBlKHByb2Nlc3Muc3RkZXJyKTtcbiAgICAgICAgICB3YXRjaGluZy5zdGRvdXQucGlwZShwcm9jZXNzLnN0ZG91dCk7XG4gICAgICAgICAgd2F0Y2hpbmcuc3Rkb3V0Lm9uKCdkYXRhJywgZGF0YSA9PiB7XG4gICAgICAgICAgICBpZiAoZGF0YSAmJiBkYXRhLnRvU3RyaW5nKCkubWF0Y2goL1dhaXRpbmcgZm9yIGNoYW5nZXNcXC5cXC5cXC4vKSkge1xuICAgICAgICAgICAgICBvbkJ1aWxkRG9uZSgpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSlcbiAgICAgICAgICB3YXRjaGluZy5vbignZXhpdCcsIG9uQnVpbGREb25lKVxuICAgICAgICB9XG4gICAgICAgIGlmICghY21kUmVidWlsZE5lZWRlZCkge1xuICAgICAgICAgIHJlYWRsaW5lLmN1cnNvclRvKHByb2Nlc3Muc3Rkb3V0LCAwKTtjb25zb2xlLmxvZyhhcHAgKyAnRXh0IHJlYnVpbGQgTk9UIG5lZWRlZCcpXG4gICAgICAgICAgb25CdWlsZERvbmUoKVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIC8vcmVhZGxpbmUuY3Vyc29yVG8ocHJvY2Vzcy5zdGRvdXQsIDApO2NvbnNvbGUubG9nKGFwcCArICdFeHQgcmVidWlsZCBJUyBuZWVkZWQnKVxuICAgICAgICB9XG4gICAgICB9IFxuICAgICAgZWxzZSB7XG4gICAgICAgIGNvbnN0IGJ1aWxkID0gZ2F0aGVyRXJyb3JzKGZvcmsoc2VuY2hhLCBbJ2FudCcsICdidWlsZCddLCB7IHN0ZGlvOiAnaW5oZXJpdCcsIGVuY29kaW5nOiAndXRmLTgnLCBjd2Q6IG91dHB1dCwgc2lsZW50OiBmYWxzZSB9KSk7XG4gICAgICAgIHJlYWRsaW5lLmN1cnNvclRvKHByb2Nlc3Muc3Rkb3V0LCAwKTtjb25zb2xlLmxvZyhhcHAgKyAnc2VuY2hhIGFudCBidWlsZCcpXG4gICAgICAgIGlmKGJ1aWxkLnN0ZG91dCkgeyBidWlsZC5zdGRvdXQucGlwZShwcm9jZXNzLnN0ZG91dCkgfVxuICAgICAgICBpZihidWlsZC5zdGRlcnIpIHsgYnVpbGQuc3RkZXJyLnBpcGUocHJvY2Vzcy5zdGRlcnIpIH1cbiAgICAgICAgYnVpbGQub24oJ2V4aXQnLCBvbkJ1aWxkRG9uZSk7XG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIC8qKlxuICAgKiBEZWZhdWx0IGNvbmZpZyBvcHRpb25zXG4gICAqIEBwcm90ZWN0ZWRcbiAgICogQHJldHVybiB7T2JqZWN0fVxuICAgKi9cbiAgZ2V0RGVmYXVsdE9wdGlvbnMoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHBvcnQ6IDgwMTYsXG4gICAgICBidWlsZHM6IHt9LFxuICAgICAgZGVidWc6IGZhbHNlLFxuICAgICAgd2F0Y2g6IGZhbHNlLFxuICAgICAgdGVzdDogL1xcLihqfHQpc3g/JC8sXG5cbiAgICAgIC8qIGJlZ2luIHNpbmdsZSBidWlsZCBvbmx5ICovXG4gICAgICBvdXRwdXQ6ICdleHQtcmVhY3QnLFxuICAgICAgdG9vbGtpdDogJ21vZGVybicsXG4gICAgICBwYWNrYWdlczogbnVsbCxcbiAgICAgIHBhY2thZ2VEaXJzOiBbXSxcbiAgICAgIG92ZXJyaWRlczogW10sXG4gICAgICBhc3luY2hyb25vdXM6IGZhbHNlLFxuICAgICAgcHJvZHVjdGlvbjogZmFsc2UsXG4gICAgICBtYW5pZmVzdEV4dHJhY3RvcjogZXh0cmFjdEZyb21KU1gsXG4gICAgICB0cmVlU2hha2luZzogZmFsc2VcbiAgICAgIC8qIGVuZCBzaW5nbGUgYnVpbGQgb25seSAqL1xuICAgIH1cbiAgfVxuXG4gIHN1Y2NlZWRNb2R1bGUoY29tcGlsYXRpb24sIG1vZHVsZSkge1xuICAgIHRoaXMuY3VycmVudEZpbGUgPSBtb2R1bGUucmVzb3VyY2U7XG4gICAgaWYgKG1vZHVsZS5yZXNvdXJjZSAmJiBtb2R1bGUucmVzb3VyY2UubWF0Y2godGhpcy50ZXN0KSAmJiAhbW9kdWxlLnJlc291cmNlLm1hdGNoKC9ub2RlX21vZHVsZXMvKSAmJiAhbW9kdWxlLnJlc291cmNlLm1hdGNoKGAvcmVhY3RvciR7cmVhY3RWZXJzaW9ufS9gKSkge1xuICAgICAgY29uc3QgZG9QYXJzZSA9ICgpID0+IHtcbiAgICAgICAgdGhpcy5kZXBlbmRlbmNpZXNbdGhpcy5jdXJyZW50RmlsZV0gPSBbXG4gICAgICAgICAgLi4uKHRoaXMuZGVwZW5kZW5jaWVzW3RoaXMuY3VycmVudEZpbGVdIHx8IFtdKSxcbiAgICAgICAgICAuLi50aGlzLm1hbmlmZXN0RXh0cmFjdG9yKG1vZHVsZS5fc291cmNlLl92YWx1ZSwgY29tcGlsYXRpb24sIG1vZHVsZSwgcmVhY3RWZXJzaW9uKVxuICAgICAgICBdXG4gICAgICB9XG4gICAgICBpZiAodGhpcy5kZWJ1Zykge1xuICAgICAgICBkb1BhcnNlKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0cnkgeyBkb1BhcnNlKCk7IH0gY2F0Y2ggKGUpIFxuICAgICAgICB7IFxuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1xcbmVycm9yIHBhcnNpbmcgJyArIHRoaXMuY3VycmVudEZpbGUpOyBcbiAgICAgICAgICBjb25zb2xlLmVycm9yKGUpOyBcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3MgZWFjaCBidWlsZCBjb25maWcgZm9yIG1pc3NpbmcvaW52YWxpZCBwcm9wZXJ0aWVzXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIFRoZSBuYW1lIG9mIHRoZSBidWlsZFxuICAgKiBAcGFyYW0ge1N0cmluZ30gYnVpbGQgVGhlIGJ1aWxkIGNvbmZpZ1xuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3ZhbGlkYXRlQnVpbGRDb25maWcobmFtZSwgYnVpbGQpIHtcbiAgICBsZXQgeyBzZGssIHByb2R1Y3Rpb24gfSA9IGJ1aWxkO1xuXG4gICAgaWYgKHByb2R1Y3Rpb24pIHtcbiAgICAgIGJ1aWxkLnRyZWVTaGFraW5nID0gZmFsc2U7XG4gICAgfVxuICAgIGlmIChzZGspIHtcbiAgICAgIGlmICghZnMuZXhpc3RzU3luYyhzZGspKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBObyBTREsgZm91bmQgYXQgJHtwYXRoLnJlc29sdmUoc2RrKX0uICBEaWQgeW91IGZvciBnZXQgdG8gbGluay9jb3B5IHlvdXIgRXh0IEpTIFNESyB0byB0aGF0IGxvY2F0aW9uP2ApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLl9hZGRSZWFjdG9yUGFja2FnZShidWlsZClcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdHJ5IHtcbiAgICAgICAgYnVpbGQuc2RrID0gcGF0aC5kaXJuYW1lKHJlc29sdmUoJ0BleHRqcy9leHQtcmVhY3QnLCB7IGJhc2VkaXI6IHByb2Nlc3MuY3dkKCkgfSkpXG4gICAgICAgIGJ1aWxkLnBhY2thZ2VEaXJzID0gWy4uLihidWlsZC5wYWNrYWdlRGlycyB8fCBbXSksIHBhdGguZGlybmFtZShidWlsZC5zZGspXTtcbiAgICAgICAgYnVpbGQucGFja2FnZXMgPSBidWlsZC5wYWNrYWdlcyB8fCB0aGlzLl9maW5kUGFja2FnZXMoYnVpbGQuc2RrKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBAZXh0anMvZXh0LXJlYWN0IG5vdCBmb3VuZC4gIFlvdSBjYW4gaW5zdGFsbCBpdCB3aXRoIFwibnBtIGluc3RhbGwgLS1zYXZlIEBleHRqcy9leHQtcmVhY3RcIiBvciwgaWYgeW91IGhhdmUgYSBsb2NhbCBjb3B5IG9mIHRoZSBTREssIHNwZWNpZnkgdGhlIHBhdGggdG8gaXQgdXNpbmcgdGhlIFwic2RrXCIgb3B0aW9uIGluIGJ1aWxkIFwiJHtuYW1lfS5cImApO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIHRoZSByZWFjdG9yIHBhY2thZ2UgaWYgcHJlc2VudCBhbmQgdGhlIHRvb2xraXQgaXMgbW9kZXJuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBidWlsZCBcbiAgICovXG4gIF9hZGRSZWFjdG9yUGFja2FnZShidWlsZCkge1xuICAgIGlmIChidWlsZC50b29sa2l0ID09PSAnY2xhc3NpYycpIHJldHVybjtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhwYXRoLmpvaW4oYnVpbGQuc2RrLCAnZXh0JywgJ21vZGVybicsICdyZWFjdG9yJykpIHx8ICAvLyByZXBvXG4gICAgICBmcy5leGlzdHNTeW5jKHBhdGguam9pbihidWlsZC5zZGssICdtb2Rlcm4nLCAncmVhY3RvcicpKSkgeyAvLyBwcm9kdWN0aW9uIGJ1aWxkXG4gICAgICBpZiAoIWJ1aWxkLnBhY2thZ2VzKSB7XG4gICAgICAgIGJ1aWxkLnBhY2thZ2VzID0gW107XG4gICAgICB9XG4gICAgICBidWlsZC5wYWNrYWdlcy5wdXNoKCdyZWFjdG9yJyk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybiB0aGUgbmFtZXMgb2YgYWxsIEV4dFJlYWN0IHBhY2thZ2VzIGluIHRoZSBzYW1lIHBhcmVudCBkaXJlY3RvcnkgYXMgZXh0LXJlYWN0ICh0eXBpY2FsbHkgbm9kZV9tb2R1bGVzL0BleHRqcylcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtTdHJpbmd9IHNkayBQYXRoIHRvIGV4dC1yZWFjdFxuICAgKiBAcmV0dXJuIHtTdHJpbmdbXX1cbiAgICovXG4gIF9maW5kUGFja2FnZXMoc2RrKSB7XG4gICAgY29uc3QgbW9kdWxlc0RpciA9IHBhdGguam9pbihzZGssICcuLicpO1xuICAgIHJldHVybiBmcy5yZWFkZGlyU3luYyhtb2R1bGVzRGlyKVxuICAgICAgLy8gRmlsdGVyIG91dCBkaXJlY3RvcmllcyB3aXRob3V0ICdwYWNrYWdlLmpzb24nXG4gICAgICAuZmlsdGVyKGRpciA9PiBmcy5leGlzdHNTeW5jKHBhdGguam9pbihtb2R1bGVzRGlyLCBkaXIsICdwYWNrYWdlLmpzb24nKSkpXG4gICAgICAvLyBHZW5lcmF0ZSBhcnJheSBvZiBwYWNrYWdlIG5hbWVzXG4gICAgICAubWFwKGRpciA9PiB7XG4gICAgICAgICAgY29uc3QgcGFja2FnZUluZm8gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhwYXRoLmpvaW4obW9kdWxlc0RpciwgZGlyLCAncGFja2FnZS5qc29uJykpKTtcbiAgICAgICAgICAvLyBEb24ndCBpbmNsdWRlIHRoZW1lIHR5cGUgcGFja2FnZXMuXG4gICAgICAgICAgaWYocGFja2FnZUluZm8uc2VuY2hhICYmIHBhY2thZ2VJbmZvLnNlbmNoYS50eXBlICE9PSAndGhlbWUnKSB7XG4gICAgICAgICAgICAgIHJldHVybiBwYWNrYWdlSW5mby5zZW5jaGEubmFtZTtcbiAgICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLy8gUmVtb3ZlIGFueSB1bmRlZmluZWRzIGZyb20gbWFwXG4gICAgICAuZmlsdGVyKG5hbWUgPT4gbmFtZSk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgcGF0aCB0byB0aGUgc2VuY2hhIGNtZCBleGVjdXRhYmxlXG4gICAqIEBwcml2YXRlXG4gICAqIEByZXR1cm4ge1N0cmluZ31cbiAgICovXG4gIF9nZXRTZW5jaENtZFBhdGgoKSB7XG4gICAgdHJ5IHtcbiAgICAgIC8vIHVzZSBAZXh0anMvc2VuY2hhLWNtZCBmcm9tIG5vZGVfbW9kdWxlc1xuICAgICAgcmV0dXJuIHJlcXVpcmUoJ0BleHRqcy9zZW5jaGEtY21kJyk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgLy8gYXR0ZW1wdCB0byB1c2UgZ2xvYmFsbHkgaW5zdGFsbGVkIFNlbmNoYSBDbWRcbiAgICAgIHJldHVybiAnc2VuY2hhJztcbiAgICB9XG4gIH1cbn1cblxuXG4gICAgICAgIC8vIGluICdleHRyZWFjdC1jb21waWxhdGlvbidcbiAgICAgICAgLy9odHRwczovL2dpdGh1Yi5jb20vamFrZXRyZW50L2h0bWwtd2VicGFjay10ZW1wbGF0ZVxuICAgICAgICAvL2h0dHBzOi8vZ2l0aHViLmNvbS9qYW50aW1vbi9odG1sLXdlYnBhY2stcGx1Z2luI1xuICAgICAgICAvLyB0aGUgZm9sbG93aW5nIGlzIG5lZWRlZCBmb3IgaHRtbC13ZWJwYWNrLXBsdWdpbiB0byBpbmNsdWRlIDxzY3JpcHQ+IGFuZCA8bGluaz4gdGFncyBmb3IgRXh0UmVhY3RcbiAgICAgICAgLy8gY29tcGlsYXRpb24uaG9va3MuaHRtbFdlYnBhY2tQbHVnaW5CZWZvcmVIdG1sR2VuZXJhdGlvbi50YXBBc3luYyhcbiAgICAgICAgLy8gICAnZXh0cmVhY3QtaHRtbGdlbmVyYXRpb24nLFxuICAgICAgICAvLyAgIChkYXRhLCBjYikgPT4ge1xuICAgICAgICAvLyAgICAgcmVhZGxpbmUuY3Vyc29yVG8ocHJvY2Vzcy5zdGRvdXQsIDApO2NvbnNvbGUubG9nKGFwcCArICdleHRyZWFjdC1odG1sZ2VuZXJhdGlvbicpXG4gICAgICAgIC8vICAgICBjb25zb2xlLmxvZygnZGF0YS5hc3NldHMuanMubGVuZ3RoJylcbiAgICAgICAgLy8gICAgIGNvbnNvbGUubG9nKGRhdGEuYXNzZXRzLmpzLmxlbmd0aClcbiAgICAgICAgLy8gICAgIGRhdGEuYXNzZXRzLmpzLnVuc2hpZnQoJ2V4dC1yZWFjdC9leHQuanMnKVxuICAgICAgICAvLyAgICAgZGF0YS5hc3NldHMuY3NzLnVuc2hpZnQoJ2V4dC1yZWFjdC9leHQuY3NzJylcbiAgICAgICAgLy8gICAgIGNiKG51bGwsIGRhdGEpXG4gICAgICAgIC8vICAgfVxuICAgICAgICAvLyApXG5cblxuXG4vLyBmcm9tIHRoaXMuZW1pdFxuICAgIC8vIHRoZSBmb2xsb3dpbmcgaXMgbmVlZGVkIGZvciBodG1sLXdlYnBhY2stcGx1Z2luIHRvIGluY2x1ZGUgPHNjcmlwdD4gYW5kIDxsaW5rPiB0YWdzIGZvciBFeHRSZWFjdFxuICAgIC8vIGNvbnNvbGUubG9nKCdjb21waWxhdGlvbicpXG4gICAgLy8gY29uc29sZS5sb2coJyoqKioqKioqY29tcGlsYXRpb24uY2h1bmtzWzBdJylcbiAgICAvLyBjb25zb2xlLmxvZyhjb21waWxhdGlvbi5jaHVua3NbMF0uaWQpXG4gICAgLy8gY29uc29sZS5sb2cocGF0aC5qb2luKHRoaXMub3V0cHV0LCAnZXh0LmpzJykpXG4gICAgLy8gY29uc3QganNDaHVuayA9IGNvbXBpbGF0aW9uLmFkZENodW5rKGAke3RoaXMub3V0cHV0fS1qc2ApO1xuICAgIC8vIGpzQ2h1bmsuaGFzUnVudGltZSA9IGpzQ2h1bmsuaXNJbml0aWFsID0gKCkgPT4gdHJ1ZTtcbiAgICAvLyBqc0NodW5rLmZpbGVzLnB1c2gocGF0aC5qb2luKHRoaXMub3V0cHV0LCAnZXh0LmpzJykpO1xuICAgIC8vIGpzQ2h1bmsuZmlsZXMucHVzaChwYXRoLmpvaW4odGhpcy5vdXRwdXQsICdleHQuY3NzJykpO1xuICAgIC8vIGpzQ2h1bmsuaWQgPSAnYWFhYXAnOyAvLyB0aGlzIGZvcmNlcyBodG1sLXdlYnBhY2stcGx1Z2luIHRvIGluY2x1ZGUgZXh0LmpzIGZpcnN0XG4gICAgLy8gY29uc29sZS5sb2coJyoqKioqKioqY29tcGlsYXRpb24uY2h1bmtzWzFdJylcbiAgICAvLyBjb25zb2xlLmxvZyhjb21waWxhdGlvbi5jaHVua3NbMV0uaWQpXG5cbiAgICAvL2lmICh0aGlzLmFzeW5jaHJvbm91cykgY2FsbGJhY2soKTtcbi8vICAgIGNvbnNvbGUubG9nKGNhbGxiYWNrKVxuXG4vLyBpZiAoaXNXZWJwYWNrNCkge1xuLy8gICBjb25zb2xlLmxvZyhwYXRoLmpvaW4odGhpcy5vdXRwdXQsICdleHQuanMnKSlcbi8vICAgY29uc3Qgc3RhdHMgPSBmcy5zdGF0U3luYyhwYXRoLmpvaW4ob3V0cHV0UGF0aCwgJ2V4dC5qcycpKVxuLy8gICBjb25zdCBmaWxlU2l6ZUluQnl0ZXMgPSBzdGF0cy5zaXplXG4vLyAgIGNvbXBpbGF0aW9uLmFzc2V0c1snZXh0LmpzJ10gPSB7XG4vLyAgICAgc291cmNlOiBmdW5jdGlvbigpIHtyZXR1cm4gZnMucmVhZEZpbGVTeW5jKHBhdGguam9pbihvdXRwdXRQYXRoLCAnZXh0LmpzJykpfSxcbi8vICAgICBzaXplOiBmdW5jdGlvbigpIHtyZXR1cm4gZmlsZVNpemVJbkJ5dGVzfVxuLy8gICB9XG4vLyAgIGNvbnNvbGUubG9nKGNvbXBpbGF0aW9uLmVudHJ5cG9pbnRzKVxuXG4vLyAgIHZhciBmaWxlbGlzdCA9ICdJbiB0aGlzIGJ1aWxkOlxcblxcbic7XG5cbi8vICAgLy8gTG9vcCB0aHJvdWdoIGFsbCBjb21waWxlZCBhc3NldHMsXG4vLyAgIC8vIGFkZGluZyBhIG5ldyBsaW5lIGl0ZW0gZm9yIGVhY2ggZmlsZW5hbWUuXG4vLyAgIGZvciAodmFyIGZpbGVuYW1lIGluIGNvbXBpbGF0aW9uLmFzc2V0cykge1xuLy8gICAgIGZpbGVsaXN0ICs9ICgnLSAnKyBmaWxlbmFtZSArJ1xcbicpO1xuLy8gICB9XG5cbi8vICAgLy8gSW5zZXJ0IHRoaXMgbGlzdCBpbnRvIHRoZSB3ZWJwYWNrIGJ1aWxkIGFzIGEgbmV3IGZpbGUgYXNzZXQ6XG4vLyAgIGNvbXBpbGF0aW9uLmFzc2V0c1snZmlsZWxpc3QubWQnXSA9IHtcbi8vICAgICBzb3VyY2UoKSB7XG4vLyAgICAgICByZXR1cm4gZmlsZWxpc3Q7XG4vLyAgICAgfSxcbi8vICAgICBzaXplKCkge1xuLy8gICAgICAgcmV0dXJuIGZpbGVsaXN0Lmxlbmd0aDtcbi8vICAgICB9XG4vLyAgIH1cbi8vIH0iXX0=