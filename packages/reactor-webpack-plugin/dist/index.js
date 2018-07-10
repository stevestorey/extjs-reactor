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

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var reactVersion = 0;

var watching = false;
var cmdErrors = void 0;
var app = _chalk2.default.green('ℹ ｢ext｣:') + ' reactor-webpack-plugin: ';

//const util = require('./util.js')

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
        if (this.asynchronous) {
          compiler.hooks.emit.tapAsync('extreact-emit (async)', function (compilation, callback) {
            readline.cursorTo(process.stdout, 0);console.log(app + 'extreact-emit  (async)');
            _this.emit(compiler, compilation, callback);
            console.log(app + 'after extreact-emit  (async)');
            if (callback != null) {
              if (_this.asynchronous) {
                console.log('calling callback');
                callback();
              }
            }
          });
        } else {
          compiler.hooks.emit.tap('extreact-emit', function (compilation) {
            readline.cursorTo(process.stdout, 0);console.log(app + 'extreact-emit');
            _this.emit(compiler, compilation);

            // if (this.count == 0) {
            //   this.count++
            //   const opn = require('opn')
            //   opn('http://localhost:' + this.port)
            // }

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
    value: function emit(compiler, compilation, callback) {
      var _this2 = this;

      var isWebpack4 = compilation.hooks;
      var modules = [];
      if (isWebpack4) {
        isWebpack4 = true;
        //modules = compilation.chunks.reduce((a, b) => a.concat(b._modules), []);
      } else {
        isWebpack4 = false;
        //modules = compilation.chunks.reduce((a, b) => a.concat(b.modules), []);
      }
      var build = this.builds[Object.keys(this.builds)[0]];
      var outputPath = _path2.default.join(compiler.outputPath, this.output);
      // webpack-dev-server overwrites the outputPath to "/", so we need to prepend contentBase
      if (compiler.outputPath === '/' && compiler.options.devServer) {
        outputPath = _path2.default.join(compiler.options.devServer.contentBase, outputPath);
      }
      //console.log('\n*****outputPath: ' + outputPath)

      var isNew = false;
      if (isNew == true) {
        var buildAsync = require('./buildAsync.js');
        var buildOptions = {
          isWebpack4: isWebpack4,
          modules: modules,
          outputPath: outputPath,
          build: build,
          callback: callback,
          watching: watching,
          treeShaking: this.treeShaking,
          dependencies: this.dependencies
        };
        new buildAsync(buildOptions).executeAsync().then(function () {
          console.log('buildAsync then');
          if (this.watch) {
            if (this.count == 0) {
              var url = 'http://localhost:' + this.port;
              readline.cursorTo(process.stdout, 0);console.log(app + 'extreact-emit - open browser at ' + url);
              this.count++;
              var opn = require('opn');
              opn(url);
            }
          }
          if (callback != null) {
            if (this.asynchronous) {
              callback();
            }
          }
        }, function (reason) {
          var prefixErr = '✖ [ext]:';
          var err = _chalk2.default.red(prefixErr) + ' ext-webpack-plugin: ';
          var errorString = err + ' ' + _chalk2.default.red(reason.error);
          compilation.errors.push(new Error(errorString));
          if (callback != null) {
            if (this.asynchronous) {
              callback();
            }
          }
        });
      } else {
        this._buildExtBundle(isWebpack4, 'not', modules, outputPath, build, callback).then(function () {
          if (_this2.watch) {
            if (_this2.count == 0) {
              var url = 'http://localhost:' + _this2.port;
              readline.cursorTo(process.stdout, 0);console.log(app + 'extreact-emit - open browser at ' + url);
              _this2.count++;
              var opn = require('opn');
              opn(url);
            }
          }
          if (callback != null) {
            if (_this2.asynchronous) {
              callback();
            }
          }
        }).catch(function (e) {
          compilation.errors.push(new Error('[@extjs/reactor-webpack-plugin]: ' + e.toString()));
          if (callback != null) {
            if (_this2.asynchronous) {
              callback();
            }
          }
        });
      }
    }

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
    value: function _buildExtBundle(isWebpack4, name, modules, output, _ref) {
      var _this3 = this;

      var _ref$toolkit = _ref.toolkit,
          toolkit = _ref$toolkit === undefined ? 'modern' : _ref$toolkit,
          theme = _ref.theme,
          _ref$packages = _ref.packages,
          packages = _ref$packages === undefined ? [] : _ref$packages,
          _ref$packageDirs = _ref.packageDirs,
          packageDirs = _ref$packageDirs === undefined ? [] : _ref$packageDirs,
          sdk = _ref.sdk,
          overrides = _ref.overrides,
          callback = _ref.callback;

      var sencha = this._getSenchCmdPath();
      theme = theme || (toolkit === 'classic' ? 'theme-triton' : 'theme-material');

      return new Promise(function (resolve, reject) {
        _this3.onBuildFail = reject;
        _this3.onBuildSuccess = resolve;
        cmdErrors = [];

        var onBuildDone = function onBuildDone() {
          if (cmdErrors.length) {
            _this3.onBuildFail(new Error(cmdErrors.join("")));
          } else {
            _this3.onBuildSuccess();
          }
        };

        if (!watching) {
          (0, _rimraf.sync)(output);
          (0, _mkdirp.sync)(output);
        }

        var js = void 0;
        if (_this3.treeShaking) {
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

              var deps = _this3.dependencies[_module.resource];
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
          _fs2.default.writeFileSync(_path2.default.join(output, 'build.xml'), (0, _artifacts.buildXML)({ compress: _this3.production }), 'utf8');
          _fs2.default.writeFileSync(_path2.default.join(output, 'jsdom-environment.js'), (0, _artifacts.createJSDOMEnvironment)(), 'utf8');
          _fs2.default.writeFileSync(_path2.default.join(output, 'app.json'), (0, _artifacts.createAppJson)({ theme: theme, packages: packages, toolkit: toolkit, overrides: overrides, packageDirs: packageDirs }), 'utf8');
          _fs2.default.writeFileSync(_path2.default.join(output, 'workspace.json'), (0, _artifacts.createWorkspaceJson)(sdk, packageDirs, output), 'utf8');
        }
        var cmdRebuildNeeded = false;
        if (_this3.manifest === null || js !== _this3.manifest) {
          // Only write manifest if it differs from the last run.  This prevents unnecessary cmd rebuilds.
          _this3.manifest = js;
          //readline.cursorTo(process.stdout, 0);console.log(app + js)
          readline.cursorTo(process.stdout, 0);console.log(app + 'tree shaking: ' + _this3.treeShaking);
          _fs2.default.writeFileSync(manifest, js, 'utf8');
          cmdRebuildNeeded = true;
          readline.cursorTo(process.stdout, 0);console.log(app + ('building ExtReact bundle at: ' + output));
        }

        //     console.log(isWebpack4)

        // if (isWebpack4) {
        //   if (this.watch) {
        //     if (!watching) {
        //       // watching = gatherErrors(fork(sencha, ['ant', 'watch'], { cwd: output, silent: true }));
        //       // //var parms = ['ant','watch']
        //       // //await util.senchaCmdAsync(parms, 'yes')
        //       // //resolve(0);

        //       // console.log('after fork')
        //       // watching.stderr.pipe(process.stderr);
        //       // watching.stdout.pipe(process.stdout);
        //       // watching.stdout.on('data', data => {
        //       //   if (data && data.toString().match(/Waiting for changes\.\.\./)) {
        //       //     onBuildDone()
        //       //   }
        //       // })
        //       // watching.on('exit', onBuildDone)
        //       const spawnSync = require('child_process').spawnSync
        //       spawnSync(sencha, ['ant', 'watch'], { cwd: output, stdio: 'inherit', encoding: 'utf-8'})
        //       onBuildDone()
        //     }
        //     if (!cmdRebuildNeeded) onBuildDone();
        //   }
        //   else {
        //     console.log('c')
        //     const spawnSync = require('child_process').spawnSync
        //     spawnSync(sencha, ['ant', 'build'], { cwd: output, stdio: 'inherit', encoding: 'utf-8'})
        //     onBuildDone()
        //   }
        // }

        //if (!isWebpack4) {
        if (_this3.watch) {
          if (!watching) {
            watching = gatherErrors((0, _child_process.fork)(sencha, ['ant', 'watch'], { cwd: output, silent: true }));
            readline.cursorTo(process.stdout, 0);console.log(app + 'sencha ant watch');
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
            readline.cursorTo(process.stdout, 0);console.log(app + 'Ext rebuild IS needed');
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
        //}

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
      var _this4 = this;

      this.currentFile = module.resource;
      if (module.resource && module.resource.match(this.test) && !module.resource.match(/node_modules/) && !module.resource.match('/reactor' + reactVersion + '/')) {
        var doParse = function doParse() {
          _this4.dependencies[_this4.currentFile] = [].concat(_toConsumableArray(_this4.dependencies[_this4.currentFile] || []), _toConsumableArray(_this4.manifestExtractor(module._source._value, compilation, module, reactVersion)));
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

        //console.log('this.dependencies[this.currentFile]')
        //      console.log('\n'+this.currentFile)
        //console.log(this.dependencies[this.currentFile])
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9pbmRleC5qcyJdLCJuYW1lcyI6WyJyZWFkbGluZSIsInJlYWN0VmVyc2lvbiIsIndhdGNoaW5nIiwiY21kRXJyb3JzIiwiYXBwIiwiY2hhbGsiLCJncmVlbiIsImdhdGhlckVycm9ycyIsImNtZCIsInN0ZG91dCIsIm9uIiwibWVzc2FnZSIsImRhdGEiLCJ0b1N0cmluZyIsIm1hdGNoIiwicHVzaCIsInJlcGxhY2UiLCJtb2R1bGUiLCJleHBvcnRzIiwib3B0aW9ucyIsImNvdW50IiwicGtnIiwiZnMiLCJleGlzdHNTeW5jIiwiSlNPTiIsInBhcnNlIiwicmVhZEZpbGVTeW5jIiwicmVhY3RFbnRyeSIsImRlcGVuZGVuY2llcyIsInJlYWN0IiwiaXMxNiIsImluY2x1ZGVzIiwiZXh0UmVhY3RSYyIsImdldERlZmF1bHRPcHRpb25zIiwiYnVpbGRzIiwiT2JqZWN0Iiwia2V5cyIsImxlbmd0aCIsImJ1aWxkT3B0aW9ucyIsImV4dCIsIm5hbWUiLCJfdmFsaWRhdGVCdWlsZENvbmZpZyIsImFzc2lnbiIsImN1cnJlbnRGaWxlIiwibWFuaWZlc3QiLCJ3YXRjaCIsImNvbXBpbGVyIiwid2VicGFja1ZlcnNpb24iLCJ1bmRlZmluZWQiLCJpc1dlYnBhY2s0IiwiaG9va3MiLCJjdXJzb3JUbyIsInByb2Nlc3MiLCJjb25zb2xlIiwibG9nIiwibWUiLCJhc3luY2hyb25vdXMiLCJ3YXRjaFJ1biIsInRhcEFzeW5jIiwiY2IiLCJ0YXAiLCJwbHVnaW4iLCJhZGRUb01hbmlmZXN0IiwiY2FsbCIsImZpbGUiLCJzdGF0ZSIsInJlc291cmNlIiwiZSIsImVycm9yIiwiY29tcGlsYXRpb24iLCJzdWNjZWVkTW9kdWxlIiwibm9ybWFsTW9kdWxlRmFjdG9yeSIsInBhcnNlciIsImVtaXQiLCJjYWxsYmFjayIsImRvbmUiLCJtb2R1bGVzIiwiYnVpbGQiLCJvdXRwdXRQYXRoIiwicGF0aCIsImpvaW4iLCJvdXRwdXQiLCJkZXZTZXJ2ZXIiLCJjb250ZW50QmFzZSIsImlzTmV3IiwiYnVpbGRBc3luYyIsInJlcXVpcmUiLCJ0cmVlU2hha2luZyIsImV4ZWN1dGVBc3luYyIsInRoZW4iLCJ1cmwiLCJwb3J0Iiwib3BuIiwicmVhc29uIiwicHJlZml4RXJyIiwiZXJyIiwicmVkIiwiZXJyb3JTdHJpbmciLCJlcnJvcnMiLCJFcnJvciIsIl9idWlsZEV4dEJ1bmRsZSIsImNhdGNoIiwidG9vbGtpdCIsInRoZW1lIiwicGFja2FnZXMiLCJwYWNrYWdlRGlycyIsInNkayIsIm92ZXJyaWRlcyIsInNlbmNoYSIsIl9nZXRTZW5jaENtZFBhdGgiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsIm9uQnVpbGRGYWlsIiwib25CdWlsZFN1Y2Nlc3MiLCJvbkJ1aWxkRG9uZSIsImpzIiwic3RhdGVtZW50cyIsImluZGV4T2YiLCJkZXBzIiwiY29uY2F0IiwidXNlclBhY2thZ2VzIiwid3JpdGVGaWxlU3luYyIsImNvbXByZXNzIiwicHJvZHVjdGlvbiIsImNtZFJlYnVpbGROZWVkZWQiLCJjd2QiLCJzaWxlbnQiLCJzdGRlcnIiLCJwaXBlIiwic3RkaW8iLCJlbmNvZGluZyIsImRlYnVnIiwidGVzdCIsIm1hbmlmZXN0RXh0cmFjdG9yIiwiZXh0cmFjdEZyb21KU1giLCJkb1BhcnNlIiwiX3NvdXJjZSIsIl92YWx1ZSIsIl9hZGRSZWFjdG9yUGFja2FnZSIsImRpcm5hbWUiLCJiYXNlZGlyIiwiX2ZpbmRQYWNrYWdlcyIsIm1vZHVsZXNEaXIiLCJyZWFkZGlyU3luYyIsImZpbHRlciIsImRpciIsIm1hcCIsInBhY2thZ2VJbmZvIiwidHlwZSJdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztBQUNBOztBQUVBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7O0FBQ0E7Ozs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFJQTs7SUFBWUEsUTs7Ozs7Ozs7Ozs7O0FBZlosSUFBSUMsZUFBZSxDQUFuQjs7QUFZQSxJQUFJQyxXQUFXLEtBQWY7QUFDQSxJQUFJ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O0FBQ0E7QUFDQTtBQUNBOzs7QUFJUjtBQUNJO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNKOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImluZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuaW1wb3J0ICdiYWJlbC1wb2x5ZmlsbCc7XG52YXIgcmVhY3RWZXJzaW9uID0gMFxuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBjanNvbiBmcm9tICdjanNvbic7XG5pbXBvcnQgeyBzeW5jIGFzIG1rZGlycCB9IGZyb20gJ21rZGlycCc7XG5pbXBvcnQgZXh0cmFjdEZyb21KU1ggZnJvbSAnLi9leHRyYWN0RnJvbUpTWCc7XG5pbXBvcnQgeyBzeW5jIGFzIHJpbXJhZiB9IGZyb20gJ3JpbXJhZic7XG5pbXBvcnQgeyBidWlsZFhNTCwgY3JlYXRlQXBwSnNvbiwgY3JlYXRlV29ya3NwYWNlSnNvbiwgY3JlYXRlSlNET01FbnZpcm9ubWVudCB9IGZyb20gJy4vYXJ0aWZhY3RzJztcbmltcG9ydCB7IGV4ZWNTeW5jLCBzcGF3biwgZm9yayB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0IHsgZ2VuZXJhdGUgfSBmcm9tICdhc3RyaW5nJztcbmltcG9ydCB7IHN5bmMgYXMgcmVzb2x2ZSB9IGZyb20gJ3Jlc29sdmUnO1xubGV0IHdhdGNoaW5nID0gZmFsc2U7XG5sZXQgY21kRXJyb3JzO1xuY29uc3QgYXBwID0gYCR7Y2hhbGsuZ3JlZW4oJ+KEuSDvvaJleHTvvaM6Jyl9IHJlYWN0b3Itd2VicGFjay1wbHVnaW46IGA7XG5pbXBvcnQgKiBhcyByZWFkbGluZSBmcm9tICdyZWFkbGluZSdcbi8vY29uc3QgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbC5qcycpXG5cbmNvbnN0IGdhdGhlckVycm9ycyA9IChjbWQpID0+IHtcbiAgaWYgKGNtZC5zdGRvdXQpIHtcbiAgICBjbWQuc3Rkb3V0Lm9uKCdkYXRhJywgZGF0YSA9PiB7XG4gICAgICBjb25zdCBtZXNzYWdlID0gZGF0YS50b1N0cmluZygpO1xuICAgICAgaWYgKG1lc3NhZ2UubWF0Y2goL15cXFtFUlJcXF0vKSkge1xuICAgICAgICBjbWRFcnJvcnMucHVzaChtZXNzYWdlLnJlcGxhY2UoL15cXFtFUlJcXF0gL2dpLCAnJykpO1xuICAgICAgfVxuICAgIH0pXG4gIH1cbiAgcmV0dXJuIGNtZDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBSZWFjdEV4dEpTV2VicGFja1BsdWdpbiB7XG4gIC8qKlxuICAgKiBAcGFyYW0ge09iamVjdFtdfSBidWlsZHNcbiAgICogQHBhcmFtIHtCb29sZWFufSBbZGVidWc9ZmFsc2VdIFNldCB0byB0cnVlIHRvIHByZXZlbnQgY2xlYW51cCBvZiBidWlsZCB0ZW1wb3JhcnkgYnVpbGQgYXJ0aWZhY3RzIHRoYXQgbWlnaHQgYmUgaGVscGZ1bCBpbiB0cm91Ymxlc2hvb3RpbmcgaXNzdWVzLlxuICAgKiBAcGFyYW0ge1N0cmluZ30gc2RrIFRoZSBmdWxsIHBhdGggdG8gdGhlIEV4dFJlYWN0IFNES1xuICAgKiBAcGFyYW0ge1N0cmluZ30gW3Rvb2xraXQ9J21vZGVybiddIFwibW9kZXJuXCIgb3IgXCJjbGFzc2ljXCJcbiAgICogQHBhcmFtIHtTdHJpbmd9IHRoZW1lIFRoZSBuYW1lIG9mIHRoZSBFeHRSZWFjdCB0aGVtZSBwYWNrYWdlIHRvIHVzZSwgZm9yIGV4YW1wbGUgXCJ0aGVtZS1tYXRlcmlhbFwiXG4gICAqIEBwYXJhbSB7U3RyaW5nW119IHBhY2thZ2VzIEFuIGFycmF5IG9mIEV4dFJlYWN0IHBhY2thZ2VzIHRvIGluY2x1ZGVcbiAgICogQHBhcmFtIHtTdHJpbmdbXX0gb3ZlcnJpZGVzIEFuIGFycmF5IHdpdGggdGhlIHBhdGhzIG9mIGRpcmVjdG9yaWVzIG9yIGZpbGVzIHRvIHNlYXJjaC4gQW55IGNsYXNzZXNcbiAgICogZGVjbGFyZWQgaW4gdGhlc2UgbG9jYXRpb25zIHdpbGwgYmUgYXV0b21hdGljYWxseSByZXF1aXJlZCBhbmQgaW5jbHVkZWQgaW4gdGhlIGJ1aWxkLlxuICAgKiBJZiBhbnkgZmlsZSBkZWZpbmVzIGFuIEV4dFJlYWN0IG92ZXJyaWRlICh1c2luZyBFeHQuZGVmaW5lIHdpdGggYW4gXCJvdmVycmlkZVwiIHByb3BlcnR5KSxcbiAgICogdGhhdCBvdmVycmlkZSB3aWxsIGluIGZhY3Qgb25seSBiZSBpbmNsdWRlZCBpbiB0aGUgYnVpbGQgaWYgdGhlIHRhcmdldCBjbGFzcyBzcGVjaWZpZWRcbiAgICogaW4gdGhlIFwib3ZlcnJpZGVcIiBwcm9wZXJ0eSBpcyBhbHNvIGluY2x1ZGVkLlxuICAgKiBAcGFyYW0ge1N0cmluZ30gb3V0cHV0IFRoZSBwYXRoIHRvIGRpcmVjdG9yeSB3aGVyZSB0aGUgRXh0UmVhY3QgYnVuZGxlIHNob3VsZCBiZSB3cml0dGVuXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gYXN5bmNocm9ub3VzIFNldCB0byB0cnVlIHRvIHJ1biBTZW5jaGEgQ21kIGJ1aWxkcyBhc3luY2hyb25vdXNseS4gVGhpcyBtYWtlcyB0aGUgd2VicGFjayBidWlsZCBmaW5pc2ggbXVjaCBmYXN0ZXIsIGJ1dCB0aGUgYXBwIG1heSBub3QgbG9hZCBjb3JyZWN0bHkgaW4geW91ciBicm93c2VyIHVudGlsIFNlbmNoYSBDbWQgaXMgZmluaXNoZWQgYnVpbGRpbmcgdGhlIEV4dFJlYWN0IGJ1bmRsZVxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IHByb2R1Y3Rpb24gU2V0IHRvIHRydWUgZm9yIHByb2R1Y3Rpb24gYnVpbGRzLiAgVGhpcyB0ZWxsIFNlbmNoYSBDbWQgdG8gY29tcHJlc3MgdGhlIGdlbmVyYXRlZCBKUyBidW5kbGUuXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gdHJlZVNoYWtpbmcgU2V0IHRvIGZhbHNlIHRvIGRpc2FibGUgdHJlZSBzaGFraW5nIGluIGRldmVsb3BtZW50IGJ1aWxkcy4gIFRoaXMgbWFrZXMgaW5jcmVtZW50YWwgcmVidWlsZHMgZmFzdGVyIGFzIGFsbCBFeHRSZWFjdCBjb21wb25lbnRzIGFyZSBpbmNsdWRlZCBpbiB0aGUgZXh0LmpzIGJ1bmRsZSBpbiB0aGUgaW5pdGlhbCBidWlsZCBhbmQgdGh1cyB0aGUgYnVuZGxlIGRvZXMgbm90IG5lZWQgdG8gYmUgcmVidWlsdCBhZnRlciBlYWNoIGNoYW5nZS4gRGVmYXVsdHMgdG8gdHJ1ZS5cbiAgICovXG4gIGNvbnN0cnVjdG9yKG9wdGlvbnMpIHtcbiAgICB0aGlzLmNvdW50ID0gMFxuICAgIC8vY2FuIGJlIGluIGRldmRlcGVuZGVuY2llcyAtIGFjY291bnQgZm9yIHRoaXM6IHJlYWN0OiBcIjE1LjE2LjBcIlxuICAgIHZhciBwa2cgPSAoZnMuZXhpc3RzU3luYygncGFja2FnZS5qc29uJykgJiYgSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMoJ3BhY2thZ2UuanNvbicsICd1dGYtOCcpKSB8fCB7fSk7XG4gICAgdmFyIHJlYWN0RW50cnkgPSBwa2cuZGVwZW5kZW5jaWVzLnJlYWN0XG4gICAgdmFyIGlzMTYgPSByZWFjdEVudHJ5LmluY2x1ZGVzKFwiMTZcIik7XG4gICAgaWYgKGlzMTYpIHsgcmVhY3RWZXJzaW9uID0gMTYgfVxuICAgIGVsc2UgeyByZWFjdFZlcnNpb24gPSAxNSB9XG4gICAgdGhpcy5yZWFjdFZlcnNpb24gPSByZWFjdFZlcnNpb25cbiAgICBjb25zdCBleHRSZWFjdFJjID0gKGZzLmV4aXN0c1N5bmMoJy5leHQtcmVhY3RyYycpICYmIEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKCcuZXh0LXJlYWN0cmMnLCAndXRmLTgnKSkgfHwge30pO1xuICAgIG9wdGlvbnMgPSB7IC4uLnRoaXMuZ2V0RGVmYXVsdE9wdGlvbnMoKSwgLi4ub3B0aW9ucywgLi4uZXh0UmVhY3RSYyB9O1xuICAgIGNvbnN0IHsgYnVpbGRzIH0gPSBvcHRpb25zO1xuICAgIGlmIChPYmplY3Qua2V5cyhidWlsZHMpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgY29uc3QgeyBidWlsZHMsIC4uLmJ1aWxkT3B0aW9ucyB9ID0gb3B0aW9ucztcbiAgICAgIGJ1aWxkcy5leHQgPSBidWlsZE9wdGlvbnM7XG4gICAgfVxuICAgIGZvciAobGV0IG5hbWUgaW4gYnVpbGRzKVxuICAgICAgdGhpcy5fdmFsaWRhdGVCdWlsZENvbmZpZyhuYW1lLCBidWlsZHNbbmFtZV0pO1xuICAgIE9iamVjdC5hc3NpZ24odGhpcywge1xuICAgICAgLi4ub3B0aW9ucyxcbiAgICAgIGN1cnJlbnRGaWxlOiBudWxsLFxuICAgICAgbWFuaWZlc3Q6IG51bGwsXG4gICAgICBkZXBlbmRlbmNpZXM6IFtdXG4gICAgfSk7XG4gIH1cblxuICB3YXRjaFJ1bigpIHtcbiAgICB0aGlzLndhdGNoID0gdHJ1ZVxuICB9XG5cbiAgYXBwbHkoY29tcGlsZXIpIHtcbiAgICBpZiAodGhpcy53ZWJwYWNrVmVyc2lvbiA9PSB1bmRlZmluZWQpIHtcbiAgICAgIGNvbnN0IGlzV2VicGFjazQgPSBjb21waWxlci5ob29rcztcbiAgICAgIGlmIChpc1dlYnBhY2s0KSB7dGhpcy53ZWJwYWNrVmVyc2lvbiA9ICdJUyB3ZWJwYWNrIDQnfVxuICAgICAgZWxzZSB7dGhpcy53ZWJwYWNrVmVyc2lvbiA9ICdOT1Qgd2VicGFjayA0J31cbiAgICAgIHJlYWRsaW5lLmN1cnNvclRvKHByb2Nlc3Muc3Rkb3V0LCAwKTtjb25zb2xlLmxvZyhhcHAgKyAncmVhY3RWZXJzaW9uOiAnICsgdGhpcy5yZWFjdFZlcnNpb24gKyAnLCAnICsgdGhpcy53ZWJwYWNrVmVyc2lvbilcbiAgICB9XG4gICAgY29uc3QgbWUgPSB0aGlzO1xuXG4gICAgaWYgKGNvbXBpbGVyLmhvb2tzKSB7XG4gICAgICBpZiAodGhpcy5hc3luY2hyb25vdXMpIHtcbiAgICAgICAgY29tcGlsZXIuaG9va3Mud2F0Y2hSdW4udGFwQXN5bmMoJ2V4dHJlYWN0LXdhdGNoLXJ1biAoYXN5bmMpJywgKHdhdGNoaW5nLCBjYikgPT4ge1xuICAgICAgICAgIHJlYWRsaW5lLmN1cnNvclRvKHByb2Nlc3Muc3Rkb3V0LCAwKTtjb25zb2xlLmxvZyhhcHAgKyAnZXh0cmVhY3Qtd2F0Y2gtcnVuIChhc3luYyknKVxuICAgICAgICAgIHRoaXMud2F0Y2hSdW4oKVxuICAgICAgICAgIGNiKClcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBjb21waWxlci5ob29rcy53YXRjaFJ1bi50YXAoJ2V4dHJlYWN0LXdhdGNoLXJ1bicsICh3YXRjaGluZykgPT4ge1xuICAgICAgICAgIHJlYWRsaW5lLmN1cnNvclRvKHByb2Nlc3Muc3Rkb3V0LCAwKTtjb25zb2xlLmxvZyhhcHAgKyAnZXh0cmVhY3Qtd2F0Y2gtcnVuJylcbiAgICAgICAgICB0aGlzLndhdGNoUnVuKClcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBjb21waWxlci5wbHVnaW4oJ3dhdGNoLXJ1bicsICh3YXRjaGluZywgY2IpID0+IHtcbiAgICAgICAgcmVhZGxpbmUuY3Vyc29yVG8ocHJvY2Vzcy5zdGRvdXQsIDApO2NvbnNvbGUubG9nKGFwcCArICd3YXRjaC1ydW4nKVxuICAgICAgICB0aGlzLndhdGNoUnVuKClcbiAgICAgICAgY2IoKVxuICAgICAgfSlcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBZGRzIHRoZSBjb2RlIGZvciB0aGUgc3BlY2lmaWVkIGZ1bmN0aW9uIGNhbGwgdG8gdGhlIG1hbmlmZXN0LmpzIGZpbGVcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gY2FsbCBBIGZ1bmN0aW9uIGNhbGwgQVNUIG5vZGUuXG4gICAgICovXG4gICAgY29uc3QgYWRkVG9NYW5pZmVzdCA9IGZ1bmN0aW9uKGNhbGwpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGZpbGUgPSB0aGlzLnN0YXRlLm1vZHVsZS5yZXNvdXJjZTtcbiAgICAgICAgbWUuZGVwZW5kZW5jaWVzW2ZpbGVdID0gWyAuLi4obWUuZGVwZW5kZW5jaWVzW2ZpbGVdIHx8IFtdKSwgZ2VuZXJhdGUoY2FsbCkgXTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihgRXJyb3IgcHJvY2Vzc2luZyAke2ZpbGV9YCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGlmIChjb21waWxlci5ob29rcykge1xuICAgICAgY29tcGlsZXIuaG9va3MuY29tcGlsYXRpb24udGFwKCdleHRyZWFjdC1jb21waWxhdGlvbicsIChjb21waWxhdGlvbixkYXRhKSA9PiB7XG4gICAgICAgIHJlYWRsaW5lLmN1cnNvclRvKHByb2Nlc3Muc3Rkb3V0LCAwKTtjb25zb2xlLmxvZyhhcHAgKyAnZXh0cmVhY3QtY29tcGlsYXRpb24nKVxuICAgICAgICBjb21waWxhdGlvbi5ob29rcy5zdWNjZWVkTW9kdWxlLnRhcCgnZXh0cmVhY3Qtc3VjY2VlZC1tb2R1bGUnLCAobW9kdWxlKSA9PiB7XG4gICAgICAgICAgdGhpcy5zdWNjZWVkTW9kdWxlKGNvbXBpbGF0aW9uLCBtb2R1bGUpXG4gICAgICAgIH0pXG5cbiAgICAgICAgZGF0YS5ub3JtYWxNb2R1bGVGYWN0b3J5LnBsdWdpbihcInBhcnNlclwiLCBmdW5jdGlvbihwYXJzZXIsIG9wdGlvbnMpIHtcbiAgICAgICAgICAvLyBleHRyYWN0IHh0eXBlcyBhbmQgY2xhc3NlcyBmcm9tIEV4dC5jcmVhdGUgY2FsbHNcbiAgICAgICAgICBwYXJzZXIucGx1Z2luKCdjYWxsIEV4dC5jcmVhdGUnLCBhZGRUb01hbmlmZXN0KTtcbiAgICAgICAgICAvLyBjb3B5IEV4dC5yZXF1aXJlIGNhbGxzIHRvIHRoZSBtYW5pZmVzdC4gIFRoaXMgYWxsb3dzIHRoZSB1c2VycyB0byBleHBsaWNpdGx5IHJlcXVpcmUgYSBjbGFzcyBpZiB0aGUgcGx1Z2luIGZhaWxzIHRvIGRldGVjdCBpdC5cbiAgICAgICAgICBwYXJzZXIucGx1Z2luKCdjYWxsIEV4dC5yZXF1aXJlJywgYWRkVG9NYW5pZmVzdCk7XG4gICAgICAgICAgLy8gY29weSBFeHQuZGVmaW5lIGNhbGxzIHRvIHRoZSBtYW5pZmVzdC4gIFRoaXMgYWxsb3dzIHVzZXJzIHRvIHdyaXRlIHN0YW5kYXJkIEV4dFJlYWN0IGNsYXNzZXMuXG4gICAgICAgICAgcGFyc2VyLnBsdWdpbignY2FsbCBFeHQuZGVmaW5lJywgYWRkVG9NYW5pZmVzdCk7XG4gICAgICAgIH0pXG4gICAgICB9KVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGNvbXBpbGVyLnBsdWdpbignY29tcGlsYXRpb24nLCAoY29tcGlsYXRpb24sIGRhdGEpID0+IHtcbiAgICAgICAgcmVhZGxpbmUuY3Vyc29yVG8ocHJvY2Vzcy5zdGRvdXQsIDApO2NvbnNvbGUubG9nKGFwcCArICdjb21waWxhdGlvbicpXG4gICAgICAgIGNvbXBpbGF0aW9uLnBsdWdpbignc3VjY2VlZC1tb2R1bGUnLCAobW9kdWxlKSA9PiB7XG4gICAgICAgICAgdGhpcy5zdWNjZWVkTW9kdWxlKGNvbXBpbGF0aW9uLCBtb2R1bGUpXG4gICAgICAgIH0pXG4gICAgICAgIGRhdGEubm9ybWFsTW9kdWxlRmFjdG9yeS5wbHVnaW4oXCJwYXJzZXJcIiwgZnVuY3Rpb24ocGFyc2VyLCBvcHRpb25zKSB7XG4gICAgICAgICAgLy8gZXh0cmFjdCB4dHlwZXMgYW5kIGNsYXNzZXMgZnJvbSBFeHQuY3JlYXRlIGNhbGxzXG4gICAgICAgICAgcGFyc2VyLnBsdWdpbignY2FsbCBFeHQuY3JlYXRlJywgYWRkVG9NYW5pZmVzdCk7XG4gICAgICAgICAgLy8gY29weSBFeHQucmVxdWlyZSBjYWxscyB0byB0aGUgbWFuaWZlc3QuICBUaGlzIGFsbG93cyB0aGUgdXNlcnMgdG8gZXhwbGljaXRseSByZXF1aXJlIGEgY2xhc3MgaWYgdGhlIHBsdWdpbiBmYWlscyB0byBkZXRlY3QgaXQuXG4gICAgICAgICAgcGFyc2VyLnBsdWdpbignY2FsbCBFeHQucmVxdWlyZScsIGFkZFRvTWFuaWZlc3QpO1xuICAgICAgICAgIC8vIGNvcHkgRXh0LmRlZmluZSBjYWxscyB0byB0aGUgbWFuaWZlc3QuICBUaGlzIGFsbG93cyB1c2VycyB0byB3cml0ZSBzdGFuZGFyZCBFeHRSZWFjdCBjbGFzc2VzLlxuICAgICAgICAgIHBhcnNlci5wbHVnaW4oJ2NhbGwgRXh0LmRlZmluZScsIGFkZFRvTWFuaWZlc3QpO1xuICAgICAgICB9KVxuXG4gICAgICB9KVxuICAgIH1cblxuLy8qZW1pdCAtIG9uY2UgYWxsIG1vZHVsZXMgYXJlIHByb2Nlc3NlZCwgY3JlYXRlIHRoZSBvcHRpbWl6ZWQgRXh0UmVhY3QgYnVpbGQuXG4gICAgaWYgKGNvbXBpbGVyLmhvb2tzKSB7XG4gICAgICBpZiAodGhpcy5hc3luY2hyb25vdXMpIHtcbiAgICAgICAgY29tcGlsZXIuaG9va3MuZW1pdC50YXBBc3luYygnZXh0cmVhY3QtZW1pdCAoYXN5bmMpJywgKGNvbXBpbGF0aW9uLCBjYWxsYmFjaykgPT4ge1xuICAgICAgICAgIHJlYWRsaW5lLmN1cnNvclRvKHByb2Nlc3Muc3Rkb3V0LCAwKTtjb25zb2xlLmxvZyhhcHAgKyAnZXh0cmVhY3QtZW1pdCAgKGFzeW5jKScpXG4gICAgICAgICAgdGhpcy5lbWl0KGNvbXBpbGVyLCBjb21waWxhdGlvbiwgY2FsbGJhY2spXG4gICAgICAgICAgY29uc29sZS5sb2coYXBwICsgJ2FmdGVyIGV4dHJlYWN0LWVtaXQgIChhc3luYyknKVxuICAgICAgICAgIGlmIChjYWxsYmFjayAhPSBudWxsKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5hc3luY2hyb25vdXMpIHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2NhbGxpbmcgY2FsbGJhY2snKVxuICAgICAgICAgICAgICBjYWxsYmFjaygpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIGNvbXBpbGVyLmhvb2tzLmVtaXQudGFwKCdleHRyZWFjdC1lbWl0JywgKGNvbXBpbGF0aW9uKSA9PiB7XG4gICAgICAgICAgcmVhZGxpbmUuY3Vyc29yVG8ocHJvY2Vzcy5zdGRvdXQsIDApO2NvbnNvbGUubG9nKGFwcCArICdleHRyZWFjdC1lbWl0JylcbiAgICAgICAgICB0aGlzLmVtaXQoY29tcGlsZXIsIGNvbXBpbGF0aW9uKVxuXG4gICAgICAgICAgLy8gaWYgKHRoaXMuY291bnQgPT0gMCkge1xuICAgICAgICAgIC8vICAgdGhpcy5jb3VudCsrXG4gICAgICAgICAgLy8gICBjb25zdCBvcG4gPSByZXF1aXJlKCdvcG4nKVxuICAgICAgICAgIC8vICAgb3BuKCdodHRwOi8vbG9jYWxob3N0OicgKyB0aGlzLnBvcnQpXG4gICAgICAgICAgLy8gfVxuXG4gICAgICAgICAgY29uc29sZS5sb2coYXBwICsgJ2FmdGVyIGV4dHJlYWN0LWVtaXQnKVxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGNvbXBpbGVyLnBsdWdpbignZW1pdCcsIChjb21waWxhdGlvbiwgY2FsbGJhY2spID0+IHtcbiAgICAgICAgcmVhZGxpbmUuY3Vyc29yVG8ocHJvY2Vzcy5zdGRvdXQsIDApO2NvbnNvbGUubG9nKGFwcCArICdlbWl0JylcbiAgICAgICAgdGhpcy5lbWl0KGNvbXBpbGVyLCBjb21waWxhdGlvbiwgY2FsbGJhY2spXG4gICAgICAgIGNhbGxiYWNrKClcbiAgICAgIH0pXG4gICAgfVxuXG4gICAgaWYgKGNvbXBpbGVyLmhvb2tzKSB7XG4gICAgICBpZiAodGhpcy5hc3luY2hyb25vdXMpIHtcbiAgICAgICAgY29tcGlsZXIuaG9va3MuZG9uZS50YXBBc3luYygnZXh0cmVhY3QtZG9uZSAoYXN5bmMpJywgKGNvbXBpbGF0aW9uLCBjYWxsYmFjaykgPT4ge1xuICAgICAgICAgIHJlYWRsaW5lLmN1cnNvclRvKHByb2Nlc3Muc3Rkb3V0LCAwKTtjb25zb2xlLmxvZyhhcHAgKyAnZXh0cmVhY3QtZG9uZSAoYXN5bmMpJylcbiAgICAgICAgICBpZiAoY2FsbGJhY2sgIT0gbnVsbCkgXG4gICAgICAgICAge1xuICAgICAgICAgICAgaWYgKHRoaXMuYXN5bmNocm9ub3VzKSBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2NhbGxpbmcgY2FsbGJhY2sgZm9yIGV4dHJlYWN0LWVtaXQgIChhc3luYyknKVxuICAgICAgICAgICAgICBjYWxsYmFjaygpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIGNvbXBpbGVyLmhvb2tzLmRvbmUudGFwKCdleHRyZWFjdC1kb25lJywgKCkgPT4ge1xuICAgICAgICAgIHJlYWRsaW5lLmN1cnNvclRvKHByb2Nlc3Muc3Rkb3V0LCAwKTtjb25zb2xlLmxvZyhhcHAgKyAnZXh0cmVhY3QtZG9uZScpXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZW1pdChjb21waWxlciwgY29tcGlsYXRpb24sIGNhbGxiYWNrKSB7XG4gICAgdmFyIGlzV2VicGFjazQgPSBjb21waWxhdGlvbi5ob29rcztcbiAgICB2YXIgbW9kdWxlcyA9IFtdXG4gICAgaWYgKGlzV2VicGFjazQpIHtcbiAgICAgIGlzV2VicGFjazQgPSB0cnVlXG4gICAgICAvL21vZHVsZXMgPSBjb21waWxhdGlvbi5jaHVua3MucmVkdWNlKChhLCBiKSA9PiBhLmNvbmNhdChiLl9tb2R1bGVzKSwgW10pO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGlzV2VicGFjazQgPSBmYWxzZVxuICAgICAgLy9tb2R1bGVzID0gY29tcGlsYXRpb24uY2h1bmtzLnJlZHVjZSgoYSwgYikgPT4gYS5jb25jYXQoYi5tb2R1bGVzKSwgW10pO1xuICAgIH1cbiAgICBjb25zdCBidWlsZCA9IHRoaXMuYnVpbGRzW09iamVjdC5rZXlzKHRoaXMuYnVpbGRzKVswXV07XG4gICAgbGV0IG91dHB1dFBhdGggPSBwYXRoLmpvaW4oY29tcGlsZXIub3V0cHV0UGF0aCwgdGhpcy5vdXRwdXQpO1xuICAgIC8vIHdlYnBhY2stZGV2LXNlcnZlciBvdmVyd3JpdGVzIHRoZSBvdXRwdXRQYXRoIHRvIFwiL1wiLCBzbyB3ZSBuZWVkIHRvIHByZXBlbmQgY29udGVudEJhc2VcbiAgICBpZiAoY29tcGlsZXIub3V0cHV0UGF0aCA9PT0gJy8nICYmIGNvbXBpbGVyLm9wdGlvbnMuZGV2U2VydmVyKSB7XG4gICAgICBvdXRwdXRQYXRoID0gcGF0aC5qb2luKGNvbXBpbGVyLm9wdGlvbnMuZGV2U2VydmVyLmNvbnRlbnRCYXNlLCBvdXRwdXRQYXRoKTtcbiAgICB9XG4gICAgLy9jb25zb2xlLmxvZygnXFxuKioqKipvdXRwdXRQYXRoOiAnICsgb3V0cHV0UGF0aClcblxuICAgIHZhciBpc05ldyA9IGZhbHNlXG4gICAgaWYoaXNOZXcgPT0gdHJ1ZSkge1xuICAgICAgdmFyIGJ1aWxkQXN5bmMgPSByZXF1aXJlKGAuL2J1aWxkQXN5bmMuanNgKVxuICAgICAgdmFyIGJ1aWxkT3B0aW9ucyA9IHtcbiAgICAgIGlzV2VicGFjazQ6aXNXZWJwYWNrNCwgXG4gICAgICBtb2R1bGVzOm1vZHVsZXMsIFxuICAgICAgb3V0cHV0UGF0aDpvdXRwdXRQYXRoLCBcbiAgICAgIGJ1aWxkOmJ1aWxkLCBcbiAgICAgIGNhbGxiYWNrOmNhbGxiYWNrLCBcbiAgICAgIHdhdGNoaW5nOndhdGNoaW5nLFxuICAgICAgdHJlZVNoYWtpbmc6dGhpcy50cmVlU2hha2luZyxcbiAgICAgIGRlcGVuZGVuY2llczp0aGlzLmRlcGVuZGVuY2llc1xuICAgIH1cbiAgICAgIG5ldyBidWlsZEFzeW5jKGJ1aWxkT3B0aW9ucykuZXhlY3V0ZUFzeW5jKCkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ2J1aWxkQXN5bmMgdGhlbicpXG4gICAgICAgIGlmICh0aGlzLndhdGNoKSB7XG4gICAgICAgICAgaWYgKHRoaXMuY291bnQgPT0gMCkge1xuICAgICAgICAgICAgdmFyIHVybCA9ICdodHRwOi8vbG9jYWxob3N0OicgKyB0aGlzLnBvcnRcbiAgICAgICAgICAgIHJlYWRsaW5lLmN1cnNvclRvKHByb2Nlc3Muc3Rkb3V0LCAwKTtjb25zb2xlLmxvZyhhcHAgKyAnZXh0cmVhY3QtZW1pdCAtIG9wZW4gYnJvd3NlciBhdCAnICsgdXJsKVxuICAgICAgICAgICAgdGhpcy5jb3VudCsrXG4gICAgICAgICAgICBjb25zdCBvcG4gPSByZXF1aXJlKCdvcG4nKVxuICAgICAgICAgICAgb3BuKHVybClcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNhbGxiYWNrICE9IG51bGwpe2lmICh0aGlzLmFzeW5jaHJvbm91cyl7Y2FsbGJhY2soKX19XG4gICAgICB9LCBmdW5jdGlvbihyZWFzb24pe1xuICAgICAgICB2YXIgcHJlZml4RXJyID0gJ+KcliBbZXh0XTonO1xuICAgICAgICB2YXIgZXJyID0gY2hhbGsucmVkKHByZWZpeEVycikgKyAnIGV4dC13ZWJwYWNrLXBsdWdpbjogJ1xuICAgICAgICB2YXIgZXJyb3JTdHJpbmcgPSBgJHtlcnJ9ICR7Y2hhbGsucmVkKHJlYXNvbi5lcnJvcil9YFxuICAgICAgICBjb21waWxhdGlvbi5lcnJvcnMucHVzaChuZXcgRXJyb3IoZXJyb3JTdHJpbmcpKVxuICAgICAgICBpZiAoY2FsbGJhY2sgIT0gbnVsbCl7aWYgKHRoaXMuYXN5bmNocm9ub3VzKXtjYWxsYmFjaygpfX1cbiAgICAgIH0pXG4gICAgfVxuXG4gICAgZWxzZSB7XG4gICAgdGhpcy5fYnVpbGRFeHRCdW5kbGUoaXNXZWJwYWNrNCwgJ25vdCcsIG1vZHVsZXMsIG91dHB1dFBhdGgsIGJ1aWxkLCBjYWxsYmFjaylcbiAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgaWYgKHRoaXMud2F0Y2gpIHtcbiAgICAgICAgICBpZiAodGhpcy5jb3VudCA9PSAwKSB7XG4gICAgICAgICAgICB2YXIgdXJsID0gJ2h0dHA6Ly9sb2NhbGhvc3Q6JyArIHRoaXMucG9ydFxuICAgICAgICAgICAgcmVhZGxpbmUuY3Vyc29yVG8ocHJvY2Vzcy5zdGRvdXQsIDApO2NvbnNvbGUubG9nKGFwcCArICdleHRyZWFjdC1lbWl0IC0gb3BlbiBicm93c2VyIGF0ICcgKyB1cmwpXG4gICAgICAgICAgICB0aGlzLmNvdW50KytcbiAgICAgICAgICAgIGNvbnN0IG9wbiA9IHJlcXVpcmUoJ29wbicpXG4gICAgICAgICAgICBvcG4odXJsKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoY2FsbGJhY2sgIT0gbnVsbCl7aWYgKHRoaXMuYXN5bmNocm9ub3VzKXtjYWxsYmFjaygpfX1cbiAgICAgIH0pXG4gICAgICAuY2F0Y2goZSA9PiB7XG4gICAgICAgIGNvbXBpbGF0aW9uLmVycm9ycy5wdXNoKG5ldyBFcnJvcignW0BleHRqcy9yZWFjdG9yLXdlYnBhY2stcGx1Z2luXTogJyArIGUudG9TdHJpbmcoKSkpO1xuICAgICAgICBpZiAoY2FsbGJhY2sgIT0gbnVsbCl7aWYgKHRoaXMuYXN5bmNocm9ub3VzKXtjYWxsYmFjaygpfX1cbiAgICAgIH0pXG4gICAgfVxuXG4gIH1cblxuICAvKipcbiAgIC8qKlxuICAgICogQnVpbGRzIGEgbWluaW1hbCB2ZXJzaW9uIG9mIHRoZSBFeHRSZWFjdCBmcmFtZXdvcmsgYmFzZWQgb24gdGhlIGNsYXNzZXMgdXNlZFxuICAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgVGhlIG5hbWUgb2YgdGhlIGJ1aWxkXG4gICAgKiBAcGFyYW0ge01vZHVsZVtdfSBtb2R1bGVzIHdlYnBhY2sgbW9kdWxlc1xuICAgICogQHBhcmFtIHtTdHJpbmd9IG91dHB1dCBUaGUgcGF0aCB0byB3aGVyZSB0aGUgZnJhbWV3b3JrIGJ1aWxkIHNob3VsZCBiZSB3cml0dGVuXG4gICAgKiBAcGFyYW0ge1N0cmluZ30gW3Rvb2xraXQ9J21vZGVybiddIFwibW9kZXJuXCIgb3IgXCJjbGFzc2ljXCJcbiAgICAqIEBwYXJhbSB7U3RyaW5nfSBvdXRwdXQgVGhlIHBhdGggdG8gdGhlIGRpcmVjdG9yeSB0byBjcmVhdGUgd2hpY2ggd2lsbCBjb250YWluIHRoZSBqcyBhbmQgY3NzIGJ1bmRsZXNcbiAgICAqIEBwYXJhbSB7U3RyaW5nfSB0aGVtZSBUaGUgbmFtZSBvZiB0aGUgRXh0UmVhY3QgdGhlbWUgcGFja2FnZSB0byB1c2UsIGZvciBleGFtcGxlIFwidGhlbWUtbWF0ZXJpYWxcIlxuICAgICogQHBhcmFtIHtTdHJpbmdbXX0gcGFja2FnZXMgQW4gYXJyYXkgb2YgRXh0UmVhY3QgcGFja2FnZXMgdG8gaW5jbHVkZVxuICAgICogQHBhcmFtIHtTdHJpbmdbXX0gcGFja2FnZURpcnMgRGlyZWN0b3JpZXMgY29udGFpbmluZyBwYWNrYWdlc1xuICAgICogQHBhcmFtIHtTdHJpbmdbXX0gb3ZlcnJpZGVzIEFuIGFycmF5IG9mIGxvY2F0aW9ucyBmb3Igb3ZlcnJpZGVzXG4gICAgKiBAcGFyYW0ge1N0cmluZ30gc2RrIFRoZSBmdWxsIHBhdGggdG8gdGhlIEV4dFJlYWN0IFNES1xuICAgICogQHByaXZhdGVcbiAgICAqL1xuICBfYnVpbGRFeHRCdW5kbGUoaXNXZWJwYWNrNCwgbmFtZSwgbW9kdWxlcywgb3V0cHV0LCB7IHRvb2xraXQ9J21vZGVybicsIHRoZW1lLCBwYWNrYWdlcz1bXSwgcGFja2FnZURpcnM9W10sIHNkaywgb3ZlcnJpZGVzLCBjYWxsYmFja30pIHtcbiAgICBsZXQgc2VuY2hhID0gdGhpcy5fZ2V0U2VuY2hDbWRQYXRoKCk7XG4gICAgdGhlbWUgPSB0aGVtZSB8fCAodG9vbGtpdCA9PT0gJ2NsYXNzaWMnID8gJ3RoZW1lLXRyaXRvbicgOiAndGhlbWUtbWF0ZXJpYWwnKTtcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB0aGlzLm9uQnVpbGRGYWlsID0gcmVqZWN0O1xuICAgICAgdGhpcy5vbkJ1aWxkU3VjY2VzcyA9IHJlc29sdmU7XG4gICAgICBjbWRFcnJvcnMgPSBbXTtcbiAgICAgIFxuICAgICAgY29uc3Qgb25CdWlsZERvbmUgPSAoKSA9PiB7XG4gICAgICAgIGlmIChjbWRFcnJvcnMubGVuZ3RoKSB7XG4gICAgICAgICAgdGhpcy5vbkJ1aWxkRmFpbChuZXcgRXJyb3IoY21kRXJyb3JzLmpvaW4oXCJcIikpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLm9uQnVpbGRTdWNjZXNzKCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKCF3YXRjaGluZykge1xuICAgICAgICByaW1yYWYob3V0cHV0KTtcbiAgICAgICAgbWtkaXJwKG91dHB1dCk7XG4gICAgICB9XG5cbiAgICAgIGxldCBqcztcbiAgICAgIGlmICh0aGlzLnRyZWVTaGFraW5nKSB7XG4gICAgICAgIGxldCBzdGF0ZW1lbnRzID0gWydFeHQucmVxdWlyZShbXCJFeHQuYXBwLkFwcGxpY2F0aW9uXCIsIFwiRXh0LkNvbXBvbmVudFwiLCBcIkV4dC5XaWRnZXRcIiwgXCJFeHQubGF5b3V0LkZpdFwiXSknXTsgLy8gZm9yIHNvbWUgcmVhc29uIGNvbW1hbmQgZG9lc24ndCBsb2FkIGNvbXBvbmVudCB3aGVuIG9ubHkgcGFuZWwgaXMgcmVxdWlyZWRcbiAgICAgICAgaWYgKHBhY2thZ2VzLmluZGV4T2YoJ3JlYWN0b3InKSAhPT0gLTEpIHtcbiAgICAgICAgICBzdGF0ZW1lbnRzLnB1c2goJ0V4dC5yZXF1aXJlKFwiRXh0LnJlYWN0b3IuUmVuZGVyZXJDZWxsXCIpJyk7XG4gICAgICAgIH1cbiAgICAgICAgLy9tamdcbiAgICAgICAgZm9yIChsZXQgbW9kdWxlIG9mIG1vZHVsZXMpIHtcbiAgICAgICAgICBjb25zdCBkZXBzID0gdGhpcy5kZXBlbmRlbmNpZXNbbW9kdWxlLnJlc291cmNlXTtcbiAgICAgICAgICBpZiAoZGVwcykgc3RhdGVtZW50cyA9IHN0YXRlbWVudHMuY29uY2F0KGRlcHMpO1xuICAgICAgICB9XG4gICAgICAgIGpzID0gc3RhdGVtZW50cy5qb2luKCc7XFxuJyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBqcyA9ICdFeHQucmVxdWlyZShcIkV4dC4qXCIpJztcbiAgICAgIH1cbiAgICAgIGNvbnN0IG1hbmlmZXN0ID0gcGF0aC5qb2luKG91dHB1dCwgJ21hbmlmZXN0LmpzJyk7XG4gICAgICAvLyBhZGQgZXh0LXJlYWN0L3BhY2thZ2VzIGF1dG9tYXRpY2FsbHkgaWYgcHJlc2VudFxuICAgICAgY29uc3QgdXNlclBhY2thZ2VzID0gcGF0aC5qb2luKCcuJywgJ2V4dC1yZWFjdCcsICdwYWNrYWdlcycpO1xuICAgICAgaWYgKGZzLmV4aXN0c1N5bmModXNlclBhY2thZ2VzKSkge1xuICAgICAgICBwYWNrYWdlRGlycy5wdXNoKHVzZXJQYWNrYWdlcylcbiAgICAgIH1cblxuICAgICAgaWYgKGZzLmV4aXN0c1N5bmMocGF0aC5qb2luKHNkaywgJ2V4dCcpKSkge1xuICAgICAgICAvLyBsb2NhbCBjaGVja291dCBvZiB0aGUgU0RLIHJlcG9cbiAgICAgICAgcGFja2FnZURpcnMucHVzaChwYXRoLmpvaW4oJ2V4dCcsICdwYWNrYWdlcycpKTtcbiAgICAgICAgc2RrID0gcGF0aC5qb2luKHNkaywgJ2V4dCcpO1xuICAgICAgfVxuICAgICAgaWYgKCF3YXRjaGluZykge1xuICAgICAgICBmcy53cml0ZUZpbGVTeW5jKHBhdGguam9pbihvdXRwdXQsICdidWlsZC54bWwnKSwgYnVpbGRYTUwoeyBjb21wcmVzczogdGhpcy5wcm9kdWN0aW9uIH0pLCAndXRmOCcpO1xuICAgICAgICBmcy53cml0ZUZpbGVTeW5jKHBhdGguam9pbihvdXRwdXQsICdqc2RvbS1lbnZpcm9ubWVudC5qcycpLCBjcmVhdGVKU0RPTUVudmlyb25tZW50KCksICd1dGY4Jyk7XG4gICAgICAgIGZzLndyaXRlRmlsZVN5bmMocGF0aC5qb2luKG91dHB1dCwgJ2FwcC5qc29uJyksIGNyZWF0ZUFwcEpzb24oeyB0aGVtZSwgcGFja2FnZXMsIHRvb2xraXQsIG92ZXJyaWRlcywgcGFja2FnZURpcnMgfSksICd1dGY4Jyk7XG4gICAgICAgIGZzLndyaXRlRmlsZVN5bmMocGF0aC5qb2luKG91dHB1dCwgJ3dvcmtzcGFjZS5qc29uJyksIGNyZWF0ZVdvcmtzcGFjZUpzb24oc2RrLCBwYWNrYWdlRGlycywgb3V0cHV0KSwgJ3V0ZjgnKTtcbiAgICAgIH1cbiAgICAgIGxldCBjbWRSZWJ1aWxkTmVlZGVkID0gZmFsc2U7XG4gICAgICBpZiAodGhpcy5tYW5pZmVzdCA9PT0gbnVsbCB8fCBqcyAhPT0gdGhpcy5tYW5pZmVzdCkge1xuICAgICAgICAvLyBPbmx5IHdyaXRlIG1hbmlmZXN0IGlmIGl0IGRpZmZlcnMgZnJvbSB0aGUgbGFzdCBydW4uICBUaGlzIHByZXZlbnRzIHVubmVjZXNzYXJ5IGNtZCByZWJ1aWxkcy5cbiAgICAgICAgdGhpcy5tYW5pZmVzdCA9IGpzO1xuICAgICAgICAvL3JlYWRsaW5lLmN1cnNvclRvKHByb2Nlc3Muc3Rkb3V0LCAwKTtjb25zb2xlLmxvZyhhcHAgKyBqcylcbiAgICAgICAgcmVhZGxpbmUuY3Vyc29yVG8ocHJvY2Vzcy5zdGRvdXQsIDApO2NvbnNvbGUubG9nKGFwcCArICd0cmVlIHNoYWtpbmc6ICcgKyB0aGlzLnRyZWVTaGFraW5nKVxuICAgICAgICBmcy53cml0ZUZpbGVTeW5jKG1hbmlmZXN0LCBqcywgJ3V0ZjgnKTtcbiAgICAgICAgY21kUmVidWlsZE5lZWRlZCA9IHRydWU7XG4gICAgICAgIHJlYWRsaW5lLmN1cnNvclRvKHByb2Nlc3Muc3Rkb3V0LCAwKTtjb25zb2xlLmxvZyhhcHAgKyBgYnVpbGRpbmcgRXh0UmVhY3QgYnVuZGxlIGF0OiAke291dHB1dH1gKVxuICAgICAgfVxuXG5cbiAvLyAgICAgY29uc29sZS5sb2coaXNXZWJwYWNrNClcblxuICAgICAgLy8gaWYgKGlzV2VicGFjazQpIHtcbiAgICAgIC8vICAgaWYgKHRoaXMud2F0Y2gpIHtcbiAgICAgIC8vICAgICBpZiAoIXdhdGNoaW5nKSB7XG4gICAgICAvLyAgICAgICAvLyB3YXRjaGluZyA9IGdhdGhlckVycm9ycyhmb3JrKHNlbmNoYSwgWydhbnQnLCAnd2F0Y2gnXSwgeyBjd2Q6IG91dHB1dCwgc2lsZW50OiB0cnVlIH0pKTtcbiAgICAgIC8vICAgICAgIC8vIC8vdmFyIHBhcm1zID0gWydhbnQnLCd3YXRjaCddXG4gICAgICAvLyAgICAgICAvLyAvL2F3YWl0IHV0aWwuc2VuY2hhQ21kQXN5bmMocGFybXMsICd5ZXMnKVxuICAgICAgLy8gICAgICAgLy8gLy9yZXNvbHZlKDApO1xuICAgICAgICAgICAgXG4gICAgICAvLyAgICAgICAvLyBjb25zb2xlLmxvZygnYWZ0ZXIgZm9yaycpXG4gICAgICAvLyAgICAgICAvLyB3YXRjaGluZy5zdGRlcnIucGlwZShwcm9jZXNzLnN0ZGVycik7XG4gICAgICAvLyAgICAgICAvLyB3YXRjaGluZy5zdGRvdXQucGlwZShwcm9jZXNzLnN0ZG91dCk7XG4gICAgICAvLyAgICAgICAvLyB3YXRjaGluZy5zdGRvdXQub24oJ2RhdGEnLCBkYXRhID0+IHtcbiAgICAgIC8vICAgICAgIC8vICAgaWYgKGRhdGEgJiYgZGF0YS50b1N0cmluZygpLm1hdGNoKC9XYWl0aW5nIGZvciBjaGFuZ2VzXFwuXFwuXFwuLykpIHtcbiAgICAgIC8vICAgICAgIC8vICAgICBvbkJ1aWxkRG9uZSgpXG4gICAgICAvLyAgICAgICAvLyAgIH1cbiAgICAgIC8vICAgICAgIC8vIH0pXG4gICAgICAvLyAgICAgICAvLyB3YXRjaGluZy5vbignZXhpdCcsIG9uQnVpbGREb25lKVxuICAgICAgLy8gICAgICAgY29uc3Qgc3Bhd25TeW5jID0gcmVxdWlyZSgnY2hpbGRfcHJvY2VzcycpLnNwYXduU3luY1xuICAgICAgLy8gICAgICAgc3Bhd25TeW5jKHNlbmNoYSwgWydhbnQnLCAnd2F0Y2gnXSwgeyBjd2Q6IG91dHB1dCwgc3RkaW86ICdpbmhlcml0JywgZW5jb2Rpbmc6ICd1dGYtOCd9KVxuICAgICAgLy8gICAgICAgb25CdWlsZERvbmUoKVxuICAgICAgLy8gICAgIH1cbiAgICAgIC8vICAgICBpZiAoIWNtZFJlYnVpbGROZWVkZWQpIG9uQnVpbGREb25lKCk7XG4gICAgICAvLyAgIH1cbiAgICAgIC8vICAgZWxzZSB7XG4gICAgICAvLyAgICAgY29uc29sZS5sb2coJ2MnKVxuICAgICAgLy8gICAgIGNvbnN0IHNwYXduU3luYyA9IHJlcXVpcmUoJ2NoaWxkX3Byb2Nlc3MnKS5zcGF3blN5bmNcbiAgICAgIC8vICAgICBzcGF3blN5bmMoc2VuY2hhLCBbJ2FudCcsICdidWlsZCddLCB7IGN3ZDogb3V0cHV0LCBzdGRpbzogJ2luaGVyaXQnLCBlbmNvZGluZzogJ3V0Zi04J30pXG4gICAgICAvLyAgICAgb25CdWlsZERvbmUoKVxuICAgICAgLy8gICB9XG4gICAgICAvLyB9XG5cbiAgICAgIC8vaWYgKCFpc1dlYnBhY2s0KSB7XG4gICAgICAgIGlmICh0aGlzLndhdGNoKSB7XG4gICAgICAgICAgaWYgKCF3YXRjaGluZykge1xuICAgICAgICAgICAgd2F0Y2hpbmcgPSBnYXRoZXJFcnJvcnMoZm9yayhzZW5jaGEsIFsnYW50JywgJ3dhdGNoJ10sIHsgY3dkOiBvdXRwdXQsIHNpbGVudDogdHJ1ZSB9KSk7XG4gICAgICAgICAgICByZWFkbGluZS5jdXJzb3JUbyhwcm9jZXNzLnN0ZG91dCwgMCk7Y29uc29sZS5sb2coYXBwICsgJ3NlbmNoYSBhbnQgd2F0Y2gnKVxuICAgICAgICAgICAgd2F0Y2hpbmcuc3RkZXJyLnBpcGUocHJvY2Vzcy5zdGRlcnIpO1xuICAgICAgICAgICAgd2F0Y2hpbmcuc3Rkb3V0LnBpcGUocHJvY2Vzcy5zdGRvdXQpO1xuICAgICAgICAgICAgd2F0Y2hpbmcuc3Rkb3V0Lm9uKCdkYXRhJywgZGF0YSA9PiB7XG4gICAgICAgICAgICAgIGlmIChkYXRhICYmIGRhdGEudG9TdHJpbmcoKS5tYXRjaCgvV2FpdGluZyBmb3IgY2hhbmdlc1xcLlxcLlxcLi8pKSB7XG4gICAgICAgICAgICAgICAgb25CdWlsZERvbmUoKVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgd2F0Y2hpbmcub24oJ2V4aXQnLCBvbkJ1aWxkRG9uZSlcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCFjbWRSZWJ1aWxkTmVlZGVkKSB7XG4gICAgICAgICAgICByZWFkbGluZS5jdXJzb3JUbyhwcm9jZXNzLnN0ZG91dCwgMCk7Y29uc29sZS5sb2coYXBwICsgJ0V4dCByZWJ1aWxkIE5PVCBuZWVkZWQnKVxuICAgICAgICAgICAgb25CdWlsZERvbmUoKVxuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJlYWRsaW5lLmN1cnNvclRvKHByb2Nlc3Muc3Rkb3V0LCAwKTtjb25zb2xlLmxvZyhhcHAgKyAnRXh0IHJlYnVpbGQgSVMgbmVlZGVkJylcbiAgICAgICAgICB9XG4gICAgICAgIH0gXG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGNvbnN0IGJ1aWxkID0gZ2F0aGVyRXJyb3JzKGZvcmsoc2VuY2hhLCBbJ2FudCcsICdidWlsZCddLCB7IHN0ZGlvOiAnaW5oZXJpdCcsIGVuY29kaW5nOiAndXRmLTgnLCBjd2Q6IG91dHB1dCwgc2lsZW50OiBmYWxzZSB9KSk7XG4gICAgICAgICAgcmVhZGxpbmUuY3Vyc29yVG8ocHJvY2Vzcy5zdGRvdXQsIDApO2NvbnNvbGUubG9nKGFwcCArICdzZW5jaGEgYW50IGJ1aWxkJylcbiAgICAgICAgICBpZihidWlsZC5zdGRvdXQpIHsgYnVpbGQuc3Rkb3V0LnBpcGUocHJvY2Vzcy5zdGRvdXQpIH1cbiAgICAgICAgICBpZihidWlsZC5zdGRlcnIpIHsgYnVpbGQuc3RkZXJyLnBpcGUocHJvY2Vzcy5zdGRlcnIpIH1cbiAgICAgICAgICBidWlsZC5vbignZXhpdCcsIG9uQnVpbGREb25lKTtcbiAgICAgICAgfVxuICAgICAgLy99XG5cblxuICAgIH0pO1xuICB9XG5cblxuXG4gIC8qKlxuICAgKiBEZWZhdWx0IGNvbmZpZyBvcHRpb25zXG4gICAqIEBwcm90ZWN0ZWRcbiAgICogQHJldHVybiB7T2JqZWN0fVxuICAgKi9cbiAgZ2V0RGVmYXVsdE9wdGlvbnMoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHBvcnQ6IDgwMTYsXG4gICAgICBidWlsZHM6IHt9LFxuICAgICAgZGVidWc6IGZhbHNlLFxuICAgICAgd2F0Y2g6IGZhbHNlLFxuICAgICAgdGVzdDogL1xcLihqfHQpc3g/JC8sXG5cbiAgICAgIC8qIGJlZ2luIHNpbmdsZSBidWlsZCBvbmx5ICovXG4gICAgICBvdXRwdXQ6ICdleHQtcmVhY3QnLFxuICAgICAgdG9vbGtpdDogJ21vZGVybicsXG4gICAgICBwYWNrYWdlczogbnVsbCxcbiAgICAgIHBhY2thZ2VEaXJzOiBbXSxcbiAgICAgIG92ZXJyaWRlczogW10sXG4gICAgICBhc3luY2hyb25vdXM6IGZhbHNlLFxuICAgICAgcHJvZHVjdGlvbjogZmFsc2UsXG4gICAgICBtYW5pZmVzdEV4dHJhY3RvcjogZXh0cmFjdEZyb21KU1gsXG4gICAgICB0cmVlU2hha2luZzogZmFsc2VcbiAgICAgIC8qIGVuZCBzaW5nbGUgYnVpbGQgb25seSAqL1xuICAgIH1cbiAgfVxuXG5cblxuICBzdWNjZWVkTW9kdWxlKGNvbXBpbGF0aW9uLCBtb2R1bGUpIHtcbiAgICB0aGlzLmN1cnJlbnRGaWxlID0gbW9kdWxlLnJlc291cmNlO1xuICAgIGlmIChtb2R1bGUucmVzb3VyY2UgJiYgbW9kdWxlLnJlc291cmNlLm1hdGNoKHRoaXMudGVzdCkgJiYgIW1vZHVsZS5yZXNvdXJjZS5tYXRjaCgvbm9kZV9tb2R1bGVzLykgJiYgIW1vZHVsZS5yZXNvdXJjZS5tYXRjaChgL3JlYWN0b3Ike3JlYWN0VmVyc2lvbn0vYCkpIHtcbiAgICAgIGNvbnN0IGRvUGFyc2UgPSAoKSA9PiB7XG4gICAgICAgIHRoaXMuZGVwZW5kZW5jaWVzW3RoaXMuY3VycmVudEZpbGVdID0gW1xuICAgICAgICAgIC4uLih0aGlzLmRlcGVuZGVuY2llc1t0aGlzLmN1cnJlbnRGaWxlXSB8fCBbXSksXG4gICAgICAgICAgLi4udGhpcy5tYW5pZmVzdEV4dHJhY3Rvcihtb2R1bGUuX3NvdXJjZS5fdmFsdWUsIGNvbXBpbGF0aW9uLCBtb2R1bGUsIHJlYWN0VmVyc2lvbilcbiAgICAgICAgXVxuICAgICAgfVxuICAgICAgaWYgKHRoaXMuZGVidWcpIHtcbiAgICAgICAgZG9QYXJzZSgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdHJ5IHsgZG9QYXJzZSgpOyB9IGNhdGNoIChlKSBcbiAgICAgICAgeyBcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCdcXG5lcnJvciBwYXJzaW5nICcgKyB0aGlzLmN1cnJlbnRGaWxlKTsgXG4gICAgICAgICAgY29uc29sZS5lcnJvcihlKTsgXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy9jb25zb2xlLmxvZygndGhpcy5kZXBlbmRlbmNpZXNbdGhpcy5jdXJyZW50RmlsZV0nKVxuLy8gICAgICBjb25zb2xlLmxvZygnXFxuJyt0aGlzLmN1cnJlbnRGaWxlKVxuICAgICAgLy9jb25zb2xlLmxvZyh0aGlzLmRlcGVuZGVuY2llc1t0aGlzLmN1cnJlbnRGaWxlXSlcblxuICAgIH1cbiAgfVxuXG5cblxuICAvKipcbiAgICogQ2hlY2tzIGVhY2ggYnVpbGQgY29uZmlnIGZvciBtaXNzaW5nL2ludmFsaWQgcHJvcGVydGllc1xuICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBUaGUgbmFtZSBvZiB0aGUgYnVpbGRcbiAgICogQHBhcmFtIHtTdHJpbmd9IGJ1aWxkIFRoZSBidWlsZCBjb25maWdcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF92YWxpZGF0ZUJ1aWxkQ29uZmlnKG5hbWUsIGJ1aWxkKSB7XG4gICAgbGV0IHsgc2RrLCBwcm9kdWN0aW9uIH0gPSBidWlsZDtcblxuICAgIGlmIChwcm9kdWN0aW9uKSB7XG4gICAgICBidWlsZC50cmVlU2hha2luZyA9IGZhbHNlO1xuICAgIH1cbiAgICBpZiAoc2RrKSB7XG4gICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoc2RrKSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgTm8gU0RLIGZvdW5kIGF0ICR7cGF0aC5yZXNvbHZlKHNkayl9LiAgRGlkIHlvdSBmb3IgZ2V0IHRvIGxpbmsvY29weSB5b3VyIEV4dCBKUyBTREsgdG8gdGhhdCBsb2NhdGlvbj9gKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5fYWRkUmVhY3RvclBhY2thZ2UoYnVpbGQpXG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGJ1aWxkLnNkayA9IHBhdGguZGlybmFtZShyZXNvbHZlKCdAZXh0anMvZXh0LXJlYWN0JywgeyBiYXNlZGlyOiBwcm9jZXNzLmN3ZCgpIH0pKVxuICAgICAgICBidWlsZC5wYWNrYWdlRGlycyA9IFsuLi4oYnVpbGQucGFja2FnZURpcnMgfHwgW10pLCBwYXRoLmRpcm5hbWUoYnVpbGQuc2RrKV07XG4gICAgICAgIGJ1aWxkLnBhY2thZ2VzID0gYnVpbGQucGFja2FnZXMgfHwgdGhpcy5fZmluZFBhY2thZ2VzKGJ1aWxkLnNkayk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgQGV4dGpzL2V4dC1yZWFjdCBub3QgZm91bmQuICBZb3UgY2FuIGluc3RhbGwgaXQgd2l0aCBcIm5wbSBpbnN0YWxsIC0tc2F2ZSBAZXh0anMvZXh0LXJlYWN0XCIgb3IsIGlmIHlvdSBoYXZlIGEgbG9jYWwgY29weSBvZiB0aGUgU0RLLCBzcGVjaWZ5IHRoZSBwYXRoIHRvIGl0IHVzaW5nIHRoZSBcInNka1wiIG9wdGlvbiBpbiBidWlsZCBcIiR7bmFtZX0uXCJgKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQWRkcyB0aGUgcmVhY3RvciBwYWNrYWdlIGlmIHByZXNlbnQgYW5kIHRoZSB0b29sa2l0IGlzIG1vZGVyblxuICAgKiBAcGFyYW0ge09iamVjdH0gYnVpbGQgXG4gICAqL1xuICBfYWRkUmVhY3RvclBhY2thZ2UoYnVpbGQpIHtcbiAgICBpZiAoYnVpbGQudG9vbGtpdCA9PT0gJ2NsYXNzaWMnKSByZXR1cm47XG4gICAgaWYgKGZzLmV4aXN0c1N5bmMocGF0aC5qb2luKGJ1aWxkLnNkaywgJ2V4dCcsICdtb2Rlcm4nLCAncmVhY3RvcicpKSB8fCAgLy8gcmVwb1xuICAgICAgZnMuZXhpc3RzU3luYyhwYXRoLmpvaW4oYnVpbGQuc2RrLCAnbW9kZXJuJywgJ3JlYWN0b3InKSkpIHsgLy8gcHJvZHVjdGlvbiBidWlsZFxuICAgICAgaWYgKCFidWlsZC5wYWNrYWdlcykge1xuICAgICAgICBidWlsZC5wYWNrYWdlcyA9IFtdO1xuICAgICAgfVxuICAgICAgYnVpbGQucGFja2FnZXMucHVzaCgncmVhY3RvcicpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm4gdGhlIG5hbWVzIG9mIGFsbCBFeHRSZWFjdCBwYWNrYWdlcyBpbiB0aGUgc2FtZSBwYXJlbnQgZGlyZWN0b3J5IGFzIGV4dC1yZWFjdCAodHlwaWNhbGx5IG5vZGVfbW9kdWxlcy9AZXh0anMpXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBzZGsgUGF0aCB0byBleHQtcmVhY3RcbiAgICogQHJldHVybiB7U3RyaW5nW119XG4gICAqL1xuICBfZmluZFBhY2thZ2VzKHNkaykge1xuICAgIGNvbnN0IG1vZHVsZXNEaXIgPSBwYXRoLmpvaW4oc2RrLCAnLi4nKTtcbiAgICByZXR1cm4gZnMucmVhZGRpclN5bmMobW9kdWxlc0RpcilcbiAgICAgIC8vIEZpbHRlciBvdXQgZGlyZWN0b3JpZXMgd2l0aG91dCAncGFja2FnZS5qc29uJ1xuICAgICAgLmZpbHRlcihkaXIgPT4gZnMuZXhpc3RzU3luYyhwYXRoLmpvaW4obW9kdWxlc0RpciwgZGlyLCAncGFja2FnZS5qc29uJykpKVxuICAgICAgLy8gR2VuZXJhdGUgYXJyYXkgb2YgcGFja2FnZSBuYW1lc1xuICAgICAgLm1hcChkaXIgPT4ge1xuICAgICAgICAgIGNvbnN0IHBhY2thZ2VJbmZvID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMocGF0aC5qb2luKG1vZHVsZXNEaXIsIGRpciwgJ3BhY2thZ2UuanNvbicpKSk7XG4gICAgICAgICAgLy8gRG9uJ3QgaW5jbHVkZSB0aGVtZSB0eXBlIHBhY2thZ2VzLlxuICAgICAgICAgIGlmKHBhY2thZ2VJbmZvLnNlbmNoYSAmJiBwYWNrYWdlSW5mby5zZW5jaGEudHlwZSAhPT0gJ3RoZW1lJykge1xuICAgICAgICAgICAgICByZXR1cm4gcGFja2FnZUluZm8uc2VuY2hhLm5hbWU7XG4gICAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC8vIFJlbW92ZSBhbnkgdW5kZWZpbmVkcyBmcm9tIG1hcFxuICAgICAgLmZpbHRlcihuYW1lID0+IG5hbWUpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIHBhdGggdG8gdGhlIHNlbmNoYSBjbWQgZXhlY3V0YWJsZVxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcmV0dXJuIHtTdHJpbmd9XG4gICAqL1xuICBfZ2V0U2VuY2hDbWRQYXRoKCkge1xuICAgIHRyeSB7XG4gICAgICAvLyB1c2UgQGV4dGpzL3NlbmNoYS1jbWQgZnJvbSBub2RlX21vZHVsZXNcbiAgICAgIHJldHVybiByZXF1aXJlKCdAZXh0anMvc2VuY2hhLWNtZCcpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIC8vIGF0dGVtcHQgdG8gdXNlIGdsb2JhbGx5IGluc3RhbGxlZCBTZW5jaGEgQ21kXG4gICAgICByZXR1cm4gJ3NlbmNoYSc7XG4gICAgfVxuICB9XG5cblxuXG5cbiAgXG5cblxuXG59XG5cblxuICAgICAgICAvLyBpbiAnZXh0cmVhY3QtY29tcGlsYXRpb24nXG4gICAgICAgIC8vaHR0cHM6Ly9naXRodWIuY29tL2pha2V0cmVudC9odG1sLXdlYnBhY2stdGVtcGxhdGVcbiAgICAgICAgLy9odHRwczovL2dpdGh1Yi5jb20vamFudGltb24vaHRtbC13ZWJwYWNrLXBsdWdpbiNcbiAgICAgICAgLy8gdGhlIGZvbGxvd2luZyBpcyBuZWVkZWQgZm9yIGh0bWwtd2VicGFjay1wbHVnaW4gdG8gaW5jbHVkZSA8c2NyaXB0PiBhbmQgPGxpbms+IHRhZ3MgZm9yIEV4dFJlYWN0XG4gICAgICAgIC8vIGNvbXBpbGF0aW9uLmhvb2tzLmh0bWxXZWJwYWNrUGx1Z2luQmVmb3JlSHRtbEdlbmVyYXRpb24udGFwQXN5bmMoXG4gICAgICAgIC8vICAgJ2V4dHJlYWN0LWh0bWxnZW5lcmF0aW9uJyxcbiAgICAgICAgLy8gICAoZGF0YSwgY2IpID0+IHtcbiAgICAgICAgLy8gICAgIHJlYWRsaW5lLmN1cnNvclRvKHByb2Nlc3Muc3Rkb3V0LCAwKTtjb25zb2xlLmxvZyhhcHAgKyAnZXh0cmVhY3QtaHRtbGdlbmVyYXRpb24nKVxuICAgICAgICAvLyAgICAgY29uc29sZS5sb2coJ2RhdGEuYXNzZXRzLmpzLmxlbmd0aCcpXG4gICAgICAgIC8vICAgICBjb25zb2xlLmxvZyhkYXRhLmFzc2V0cy5qcy5sZW5ndGgpXG4gICAgICAgIC8vICAgICBkYXRhLmFzc2V0cy5qcy51bnNoaWZ0KCdleHQtcmVhY3QvZXh0LmpzJylcbiAgICAgICAgLy8gICAgIGRhdGEuYXNzZXRzLmNzcy51bnNoaWZ0KCdleHQtcmVhY3QvZXh0LmNzcycpXG4gICAgICAgIC8vICAgICBjYihudWxsLCBkYXRhKVxuICAgICAgICAvLyAgIH1cbiAgICAgICAgLy8gKVxuXG5cblxuLy8gZnJvbSB0aGlzLmVtaXRcbiAgICAvLyB0aGUgZm9sbG93aW5nIGlzIG5lZWRlZCBmb3IgaHRtbC13ZWJwYWNrLXBsdWdpbiB0byBpbmNsdWRlIDxzY3JpcHQ+IGFuZCA8bGluaz4gdGFncyBmb3IgRXh0UmVhY3RcbiAgICAvLyBjb25zb2xlLmxvZygnY29tcGlsYXRpb24nKVxuICAgIC8vIGNvbnNvbGUubG9nKCcqKioqKioqKmNvbXBpbGF0aW9uLmNodW5rc1swXScpXG4gICAgLy8gY29uc29sZS5sb2coY29tcGlsYXRpb24uY2h1bmtzWzBdLmlkKVxuICAgIC8vIGNvbnNvbGUubG9nKHBhdGguam9pbih0aGlzLm91dHB1dCwgJ2V4dC5qcycpKVxuICAgIC8vIGNvbnN0IGpzQ2h1bmsgPSBjb21waWxhdGlvbi5hZGRDaHVuayhgJHt0aGlzLm91dHB1dH0tanNgKTtcbiAgICAvLyBqc0NodW5rLmhhc1J1bnRpbWUgPSBqc0NodW5rLmlzSW5pdGlhbCA9ICgpID0+IHRydWU7XG4gICAgLy8ganNDaHVuay5maWxlcy5wdXNoKHBhdGguam9pbih0aGlzLm91dHB1dCwgJ2V4dC5qcycpKTtcbiAgICAvLyBqc0NodW5rLmZpbGVzLnB1c2gocGF0aC5qb2luKHRoaXMub3V0cHV0LCAnZXh0LmNzcycpKTtcbiAgICAvLyBqc0NodW5rLmlkID0gJ2FhYWFwJzsgLy8gdGhpcyBmb3JjZXMgaHRtbC13ZWJwYWNrLXBsdWdpbiB0byBpbmNsdWRlIGV4dC5qcyBmaXJzdFxuICAgIC8vIGNvbnNvbGUubG9nKCcqKioqKioqKmNvbXBpbGF0aW9uLmNodW5rc1sxXScpXG4gICAgLy8gY29uc29sZS5sb2coY29tcGlsYXRpb24uY2h1bmtzWzFdLmlkKVxuXG4gICAgLy9pZiAodGhpcy5hc3luY2hyb25vdXMpIGNhbGxiYWNrKCk7XG4vLyAgICBjb25zb2xlLmxvZyhjYWxsYmFjaylcblxuLy8gaWYgKGlzV2VicGFjazQpIHtcbi8vICAgY29uc29sZS5sb2cocGF0aC5qb2luKHRoaXMub3V0cHV0LCAnZXh0LmpzJykpXG4vLyAgIGNvbnN0IHN0YXRzID0gZnMuc3RhdFN5bmMocGF0aC5qb2luKG91dHB1dFBhdGgsICdleHQuanMnKSlcbi8vICAgY29uc3QgZmlsZVNpemVJbkJ5dGVzID0gc3RhdHMuc2l6ZVxuLy8gICBjb21waWxhdGlvbi5hc3NldHNbJ2V4dC5qcyddID0ge1xuLy8gICAgIHNvdXJjZTogZnVuY3Rpb24oKSB7cmV0dXJuIGZzLnJlYWRGaWxlU3luYyhwYXRoLmpvaW4ob3V0cHV0UGF0aCwgJ2V4dC5qcycpKX0sXG4vLyAgICAgc2l6ZTogZnVuY3Rpb24oKSB7cmV0dXJuIGZpbGVTaXplSW5CeXRlc31cbi8vICAgfVxuLy8gICBjb25zb2xlLmxvZyhjb21waWxhdGlvbi5lbnRyeXBvaW50cylcblxuLy8gICB2YXIgZmlsZWxpc3QgPSAnSW4gdGhpcyBidWlsZDpcXG5cXG4nO1xuXG4vLyAgIC8vIExvb3AgdGhyb3VnaCBhbGwgY29tcGlsZWQgYXNzZXRzLFxuLy8gICAvLyBhZGRpbmcgYSBuZXcgbGluZSBpdGVtIGZvciBlYWNoIGZpbGVuYW1lLlxuLy8gICBmb3IgKHZhciBmaWxlbmFtZSBpbiBjb21waWxhdGlvbi5hc3NldHMpIHtcbi8vICAgICBmaWxlbGlzdCArPSAoJy0gJysgZmlsZW5hbWUgKydcXG4nKTtcbi8vICAgfVxuXG4vLyAgIC8vIEluc2VydCB0aGlzIGxpc3QgaW50byB0aGUgd2VicGFjayBidWlsZCBhcyBhIG5ldyBmaWxlIGFzc2V0OlxuLy8gICBjb21waWxhdGlvbi5hc3NldHNbJ2ZpbGVsaXN0Lm1kJ10gPSB7XG4vLyAgICAgc291cmNlKCkge1xuLy8gICAgICAgcmV0dXJuIGZpbGVsaXN0O1xuLy8gICAgIH0sXG4vLyAgICAgc2l6ZSgpIHtcbi8vICAgICAgIHJldHVybiBmaWxlbGlzdC5sZW5ndGg7XG4vLyAgICAgfVxuLy8gICB9XG4vLyB9Il19