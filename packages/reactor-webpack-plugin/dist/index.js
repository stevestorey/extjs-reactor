'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

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
        return;
      }).catch(function (e) {
        //console.log(e)
        compilation.errors.push(new Error('[@extjs/reactor-webpack-plugin]: ' + e.toString()));
        //!this.asynchronous && callback();
        //        console.log(callback)
        if (callback != null) {
          if (!_this2.asynchronous) {
            callback();
          }
        }
      });
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9pbmRleC5qcyJdLCJuYW1lcyI6WyJyZWFkbGluZSIsInJlYWN0VmVyc2lvbiIsIndhdGNoaW5nIiwiY21kRXJyb3JzIiwiYXBwIiwiY2hhbGsiLCJncmVlbiIsImdhdGhlckVycm9ycyIsImNtZCIsInN0ZG91dCIsIm9uIiwibWVzc2FnZSIsImRhdGEiLCJ0b1N0cmluZyIsIm1hdGNoIiwicHVzaCIsInJlcGxhY2UiLCJtb2R1bGUiLCJleHBvcnRzIiwib3B0aW9ucyIsImNvdW50IiwicGtnIiwiZnMiLCJleGlzdHNTeW5jIiwiSlNPTiIsInBhcnNlIiwicmVhZEZpbGVTeW5jIiwicmVhY3RFbnRyeSIsImRlcGVuZGVuY2llcyIsInJlYWN0IiwiaXMxNiIsImluY2x1ZGVzIiwiZXh0UmVhY3RSYyIsImdldERlZmF1bHRPcHRpb25zIiwiYnVpbGRzIiwiT2JqZWN0Iiwia2V5cyIsImxlbmd0aCIsImJ1aWxkT3B0aW9ucyIsImV4dCIsIm5hbWUiLCJfdmFsaWRhdGVCdWlsZENvbmZpZyIsImFzc2lnbiIsImN1cnJlbnRGaWxlIiwibWFuaWZlc3QiLCJ3YXRjaCIsImNvbXBpbGVyIiwid2VicGFja1ZlcnNpb24iLCJ1bmRlZmluZWQiLCJpc1dlYnBhY2s0IiwiaG9va3MiLCJjdXJzb3JUbyIsInByb2Nlc3MiLCJjb25zb2xlIiwibG9nIiwibWUiLCJhc3luY2hyb25vdXMiLCJ3YXRjaFJ1biIsInRhcEFzeW5jIiwiY2IiLCJ0YXAiLCJwbHVnaW4iLCJhZGRUb01hbmlmZXN0IiwiY2FsbCIsImZpbGUiLCJzdGF0ZSIsInJlc291cmNlIiwiZSIsImVycm9yIiwiY29tcGlsYXRpb24iLCJzdWNjZWVkTW9kdWxlIiwibm9ybWFsTW9kdWxlRmFjdG9yeSIsInBhcnNlciIsImVtaXQiLCJjYWxsYmFjayIsImRvbmUiLCJtb2R1bGVzIiwiYnVpbGQiLCJvdXRwdXRQYXRoIiwicGF0aCIsImpvaW4iLCJvdXRwdXQiLCJkZXZTZXJ2ZXIiLCJjb250ZW50QmFzZSIsIl9idWlsZEV4dEJ1bmRsZSIsInRoZW4iLCJ1cmwiLCJwb3J0Iiwib3BuIiwicmVxdWlyZSIsImNhdGNoIiwiZXJyb3JzIiwiRXJyb3IiLCJ0b29sa2l0IiwidGhlbWUiLCJwYWNrYWdlcyIsInBhY2thZ2VEaXJzIiwic2RrIiwib3ZlcnJpZGVzIiwic2VuY2hhIiwiX2dldFNlbmNoQ21kUGF0aCIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0Iiwib25CdWlsZEZhaWwiLCJvbkJ1aWxkU3VjY2VzcyIsIm9uQnVpbGREb25lIiwianMiLCJ0cmVlU2hha2luZyIsInN0YXRlbWVudHMiLCJpbmRleE9mIiwiZGVwcyIsImNvbmNhdCIsInVzZXJQYWNrYWdlcyIsIndyaXRlRmlsZVN5bmMiLCJjb21wcmVzcyIsInByb2R1Y3Rpb24iLCJjbWRSZWJ1aWxkTmVlZGVkIiwiY3dkIiwic2lsZW50Iiwic3RkZXJyIiwicGlwZSIsInN0ZGlvIiwiZW5jb2RpbmciLCJkZWJ1ZyIsInRlc3QiLCJtYW5pZmVzdEV4dHJhY3RvciIsImV4dHJhY3RGcm9tSlNYIiwiZG9QYXJzZSIsIl9zb3VyY2UiLCJfdmFsdWUiLCJfYWRkUmVhY3RvclBhY2thZ2UiLCJkaXJuYW1lIiwiYmFzZWRpciIsIl9maW5kUGFja2FnZXMiLCJtb2R1bGVzRGlyIiwicmVhZGRpclN5bmMiLCJmaWx0ZXIiLCJkaXIiLCJtYXAiLCJwYWNrYWdlSW5mbyIsInR5cGUiXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7QUFFQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOztBQUNBOzs7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBSUE7O0lBQVlBLFE7Ozs7Ozs7Ozs7OztBQWZaLElBQUlDLGVBQWUsQ0FBbkI7O0FBWUEsSUFBSUMsV0FBVyxLQUFmO0FBQ0EsSUFBSUMsa0JBQUo7QUFDQSxJQUFNQyxNQUFTQyxnQkFBTUMsS0FBTixDQUFZLFVBQVosQ0FBVCw4QkFBTjs7QUFFQTs7QUFFQSxJQUFNQyxlQUFlLFNBQWZBLFlB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dHJpY3QnO1xudmFyIHJlYWN0VmVyc2lvbiA9IDBcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgY2pzb24gZnJvbSAnY2pzb24nO1xuaW1wb3J0IHsgc3luYyBhcyBta2RpcnAgfSBmcm9tICdta2RpcnAnO1xuaW1wb3J0IGV4dHJhY3RGcm9tSlNYIGZyb20gJy4vZXh0cmFjdEZyb21KU1gnO1xuaW1wb3J0IHsgc3luYyBhcyByaW1yYWYgfSBmcm9tICdyaW1yYWYnO1xuaW1wb3J0IHsgYnVpbGRYTUwsIGNyZWF0ZUFwcEpzb24sIGNyZWF0ZVdvcmtzcGFjZUpzb24sIGNyZWF0ZUpTRE9NRW52aXJvbm1lbnQgfSBmcm9tICcuL2FydGlmYWN0cyc7XG5pbXBvcnQgeyBleGVjU3luYywgc3Bhd24sIGZvcmsgfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCB7IGdlbmVyYXRlIH0gZnJvbSAnYXN0cmluZyc7XG5pbXBvcnQgeyBzeW5jIGFzIHJlc29sdmUgfSBmcm9tICdyZXNvbHZlJztcbmxldCB3YXRjaGluZyA9IGZhbHNlO1xubGV0IGNtZEVycm9ycztcbmNvbnN0IGFwcCA9IGAke2NoYWxrLmdyZWVuKCfihLkg772iZXh0772jOicpfSByZWFjdG9yLXdlYnBhY2stcGx1Z2luOiBgO1xuaW1wb3J0ICogYXMgcmVhZGxpbmUgZnJvbSAncmVhZGxpbmUnXG4vL2NvbnN0IHV0aWwgPSByZXF1aXJlKCcuL3V0aWwuanMnKVxuXG5jb25zdCBnYXRoZXJFcnJvcnMgPSAoY21kKSA9PiB7XG4gIGlmIChjbWQuc3Rkb3V0KSB7XG4gICAgY21kLnN0ZG91dC5vbignZGF0YScsIGRhdGEgPT4ge1xuICAgICAgY29uc3QgbWVzc2FnZSA9IGRhdGEudG9TdHJpbmcoKTtcbiAgICAgIGlmIChtZXNzYWdlLm1hdGNoKC9eXFxbRVJSXFxdLykpIHtcbiAgICAgICAgY21kRXJyb3JzLnB1c2gobWVzc2FnZS5yZXBsYWNlKC9eXFxbRVJSXFxdIC9naSwgJycpKTtcbiAgICAgIH1cbiAgICB9KVxuICB9XG4gIHJldHVybiBjbWQ7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgUmVhY3RFeHRKU1dlYnBhY2tQbHVnaW4ge1xuICAvKipcbiAgICogQHBhcmFtIHtPYmplY3RbXX0gYnVpbGRzXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gW2RlYnVnPWZhbHNlXSBTZXQgdG8gdHJ1ZSB0byBwcmV2ZW50IGNsZWFudXAgb2YgYnVpbGQgdGVtcG9yYXJ5IGJ1aWxkIGFydGlmYWN0cyB0aGF0IG1pZ2h0IGJlIGhlbHBmdWwgaW4gdHJvdWJsZXNob290aW5nIGlzc3Vlcy5cbiAgICogQHBhcmFtIHtTdHJpbmd9IHNkayBUaGUgZnVsbCBwYXRoIHRvIHRoZSBFeHRSZWFjdCBTREtcbiAgICogQHBhcmFtIHtTdHJpbmd9IFt0b29sa2l0PSdtb2Rlcm4nXSBcIm1vZGVyblwiIG9yIFwiY2xhc3NpY1wiXG4gICAqIEBwYXJhbSB7U3RyaW5nfSB0aGVtZSBUaGUgbmFtZSBvZiB0aGUgRXh0UmVhY3QgdGhlbWUgcGFja2FnZSB0byB1c2UsIGZvciBleGFtcGxlIFwidGhlbWUtbWF0ZXJpYWxcIlxuICAgKiBAcGFyYW0ge1N0cmluZ1tdfSBwYWNrYWdlcyBBbiBhcnJheSBvZiBFeHRSZWFjdCBwYWNrYWdlcyB0byBpbmNsdWRlXG4gICAqIEBwYXJhbSB7U3RyaW5nW119IG92ZXJyaWRlcyBBbiBhcnJheSB3aXRoIHRoZSBwYXRocyBvZiBkaXJlY3RvcmllcyBvciBmaWxlcyB0byBzZWFyY2guIEFueSBjbGFzc2VzXG4gICAqIGRlY2xhcmVkIGluIHRoZXNlIGxvY2F0aW9ucyB3aWxsIGJlIGF1dG9tYXRpY2FsbHkgcmVxdWlyZWQgYW5kIGluY2x1ZGVkIGluIHRoZSBidWlsZC5cbiAgICogSWYgYW55IGZpbGUgZGVmaW5lcyBhbiBFeHRSZWFjdCBvdmVycmlkZSAodXNpbmcgRXh0LmRlZmluZSB3aXRoIGFuIFwib3ZlcnJpZGVcIiBwcm9wZXJ0eSksXG4gICAqIHRoYXQgb3ZlcnJpZGUgd2lsbCBpbiBmYWN0IG9ubHkgYmUgaW5jbHVkZWQgaW4gdGhlIGJ1aWxkIGlmIHRoZSB0YXJnZXQgY2xhc3Mgc3BlY2lmaWVkXG4gICAqIGluIHRoZSBcIm92ZXJyaWRlXCIgcHJvcGVydHkgaXMgYWxzbyBpbmNsdWRlZC5cbiAgICogQHBhcmFtIHtTdHJpbmd9IG91dHB1dCBUaGUgcGF0aCB0byBkaXJlY3Rvcnkgd2hlcmUgdGhlIEV4dFJlYWN0IGJ1bmRsZSBzaG91bGQgYmUgd3JpdHRlblxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IGFzeW5jaHJvbm91cyBTZXQgdG8gdHJ1ZSB0byBydW4gU2VuY2hhIENtZCBidWlsZHMgYXN5bmNocm9ub3VzbHkuIFRoaXMgbWFrZXMgdGhlIHdlYnBhY2sgYnVpbGQgZmluaXNoIG11Y2ggZmFzdGVyLCBidXQgdGhlIGFwcCBtYXkgbm90IGxvYWQgY29ycmVjdGx5IGluIHlvdXIgYnJvd3NlciB1bnRpbCBTZW5jaGEgQ21kIGlzIGZpbmlzaGVkIGJ1aWxkaW5nIHRoZSBFeHRSZWFjdCBidW5kbGVcbiAgICogQHBhcmFtIHtCb29sZWFufSBwcm9kdWN0aW9uIFNldCB0byB0cnVlIGZvciBwcm9kdWN0aW9uIGJ1aWxkcy4gIFRoaXMgdGVsbCBTZW5jaGEgQ21kIHRvIGNvbXByZXNzIHRoZSBnZW5lcmF0ZWQgSlMgYnVuZGxlLlxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IHRyZWVTaGFraW5nIFNldCB0byBmYWxzZSB0byBkaXNhYmxlIHRyZWUgc2hha2luZyBpbiBkZXZlbG9wbWVudCBidWlsZHMuICBUaGlzIG1ha2VzIGluY3JlbWVudGFsIHJlYnVpbGRzIGZhc3RlciBhcyBhbGwgRXh0UmVhY3QgY29tcG9uZW50cyBhcmUgaW5jbHVkZWQgaW4gdGhlIGV4dC5qcyBidW5kbGUgaW4gdGhlIGluaXRpYWwgYnVpbGQgYW5kIHRodXMgdGhlIGJ1bmRsZSBkb2VzIG5vdCBuZWVkIHRvIGJlIHJlYnVpbHQgYWZ0ZXIgZWFjaCBjaGFuZ2UuIERlZmF1bHRzIHRvIHRydWUuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihvcHRpb25zKSB7XG4gICAgdGhpcy5jb3VudCA9IDBcbiAgICAvL2NhbiBiZSBpbiBkZXZkZXBlbmRlbmNpZXMgLSBhY2NvdW50IGZvciB0aGlzOiByZWFjdDogXCIxNS4xNi4wXCJcbiAgICB2YXIgcGtnID0gKGZzLmV4aXN0c1N5bmMoJ3BhY2thZ2UuanNvbicpICYmIEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKCdwYWNrYWdlLmpzb24nLCAndXRmLTgnKSkgfHwge30pO1xuICAgIHZhciByZWFjdEVudHJ5ID0gcGtnLmRlcGVuZGVuY2llcy5yZWFjdFxuICAgIHZhciBpczE2ID0gcmVhY3RFbnRyeS5pbmNsdWRlcyhcIjE2XCIpO1xuICAgIGlmIChpczE2KSB7IHJlYWN0VmVyc2lvbiA9IDE2IH1cbiAgICBlbHNlIHsgcmVhY3RWZXJzaW9uID0gMTUgfVxuICAgIHRoaXMucmVhY3RWZXJzaW9uID0gcmVhY3RWZXJzaW9uXG4gICAgY29uc3QgZXh0UmVhY3RSYyA9IChmcy5leGlzdHNTeW5jKCcuZXh0LXJlYWN0cmMnKSAmJiBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYygnLmV4dC1yZWFjdHJjJywgJ3V0Zi04JykpIHx8IHt9KTtcbiAgICBvcHRpb25zID0geyAuLi50aGlzLmdldERlZmF1bHRPcHRpb25zKCksIC4uLm9wdGlvbnMsIC4uLmV4dFJlYWN0UmMgfTtcbiAgICBjb25zdCB7IGJ1aWxkcyB9ID0gb3B0aW9ucztcbiAgICBpZiAoT2JqZWN0LmtleXMoYnVpbGRzKS5sZW5ndGggPT09IDApIHtcbiAgICAgIGNvbnN0IHsgYnVpbGRzLCAuLi5idWlsZE9wdGlvbnMgfSA9IG9wdGlvbnM7XG4gICAgICBidWlsZHMuZXh0ID0gYnVpbGRPcHRpb25zO1xuICAgIH1cbiAgICBmb3IgKGxldCBuYW1lIGluIGJ1aWxkcylcbiAgICAgIHRoaXMuX3ZhbGlkYXRlQnVpbGRDb25maWcobmFtZSwgYnVpbGRzW25hbWVdKTtcbiAgICBPYmplY3QuYXNzaWduKHRoaXMsIHtcbiAgICAgIC4uLm9wdGlvbnMsXG4gICAgICBjdXJyZW50RmlsZTogbnVsbCxcbiAgICAgIG1hbmlmZXN0OiBudWxsLFxuICAgICAgZGVwZW5kZW5jaWVzOiBbXVxuICAgIH0pO1xuICB9XG5cbiAgd2F0Y2hSdW4oKSB7XG4gICAgdGhpcy53YXRjaCA9IHRydWVcbiAgfVxuXG4gIGFwcGx5KGNvbXBpbGVyKSB7XG4gICAgaWYgKHRoaXMud2VicGFja1ZlcnNpb24gPT0gdW5kZWZpbmVkKSB7XG4gICAgICBjb25zdCBpc1dlYnBhY2s0ID0gY29tcGlsZXIuaG9va3M7XG4gICAgICBpZiAoaXNXZWJwYWNrNCkge3RoaXMud2VicGFja1ZlcnNpb24gPSAnSVMgd2VicGFjayA0J31cbiAgICAgIGVsc2Uge3RoaXMud2VicGFja1ZlcnNpb24gPSAnTk9UIHdlYnBhY2sgNCd9XG4gICAgICByZWFkbGluZS5jdXJzb3JUbyhwcm9jZXNzLnN0ZG91dCwgMCk7Y29uc29sZS5sb2coYXBwICsgJ3JlYWN0VmVyc2lvbjogJyArIHRoaXMucmVhY3RWZXJzaW9uICsgJywgJyArIHRoaXMud2VicGFja1ZlcnNpb24pXG4gICAgfVxuICAgIGNvbnN0IG1lID0gdGhpcztcblxuICAgIGlmIChjb21waWxlci5ob29rcykge1xuICAgICAgaWYgKHRoaXMuYXN5bmNocm9ub3VzKSB7XG4gICAgICAgIGNvbXBpbGVyLmhvb2tzLndhdGNoUnVuLnRhcEFzeW5jKCdleHRyZWFjdC13YXRjaC1ydW4gKGFzeW5jKScsICh3YXRjaGluZywgY2IpID0+IHtcbiAgICAgICAgICByZWFkbGluZS5jdXJzb3JUbyhwcm9jZXNzLnN0ZG91dCwgMCk7Y29uc29sZS5sb2coYXBwICsgJ2V4dHJlYWN0LXdhdGNoLXJ1biAoYXN5bmMpJylcbiAgICAgICAgICB0aGlzLndhdGNoUnVuKClcbiAgICAgICAgICBjYigpXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgY29tcGlsZXIuaG9va3Mud2F0Y2hSdW4udGFwKCdleHRyZWFjdC13YXRjaC1ydW4nLCAod2F0Y2hpbmcpID0+IHtcbiAgICAgICAgICByZWFkbGluZS5jdXJzb3JUbyhwcm9jZXNzLnN0ZG91dCwgMCk7Y29uc29sZS5sb2coYXBwICsgJ2V4dHJlYWN0LXdhdGNoLXJ1bicpXG4gICAgICAgICAgdGhpcy53YXRjaFJ1bigpXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgY29tcGlsZXIucGx1Z2luKCd3YXRjaC1ydW4nLCAod2F0Y2hpbmcsIGNiKSA9PiB7XG4gICAgICAgIHJlYWRsaW5lLmN1cnNvclRvKHByb2Nlc3Muc3Rkb3V0LCAwKTtjb25zb2xlLmxvZyhhcHAgKyAnd2F0Y2gtcnVuJylcbiAgICAgICAgdGhpcy53YXRjaFJ1bigpXG4gICAgICAgIGNiKClcbiAgICAgIH0pXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQWRkcyB0aGUgY29kZSBmb3IgdGhlIHNwZWNpZmllZCBmdW5jdGlvbiBjYWxsIHRvIHRoZSBtYW5pZmVzdC5qcyBmaWxlXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGNhbGwgQSBmdW5jdGlvbiBjYWxsIEFTVCBub2RlLlxuICAgICAqL1xuICAgIGNvbnN0IGFkZFRvTWFuaWZlc3QgPSBmdW5jdGlvbihjYWxsKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBmaWxlID0gdGhpcy5zdGF0ZS5tb2R1bGUucmVzb3VyY2U7XG4gICAgICAgIG1lLmRlcGVuZGVuY2llc1tmaWxlXSA9IFsgLi4uKG1lLmRlcGVuZGVuY2llc1tmaWxlXSB8fCBbXSksIGdlbmVyYXRlKGNhbGwpIF07XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIHByb2Nlc3NpbmcgJHtmaWxlfWApO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBpZiAoY29tcGlsZXIuaG9va3MpIHtcbiAgICAgIGNvbXBpbGVyLmhvb2tzLmNvbXBpbGF0aW9uLnRhcCgnZXh0cmVhY3QtY29tcGlsYXRpb24nLCAoY29tcGlsYXRpb24sZGF0YSkgPT4ge1xuICAgICAgICByZWFkbGluZS5jdXJzb3JUbyhwcm9jZXNzLnN0ZG91dCwgMCk7Y29uc29sZS5sb2coYXBwICsgJ2V4dHJlYWN0LWNvbXBpbGF0aW9uJylcbiAgICAgICAgY29tcGlsYXRpb24uaG9va3Muc3VjY2VlZE1vZHVsZS50YXAoJ2V4dHJlYWN0LXN1Y2NlZWQtbW9kdWxlJywgKG1vZHVsZSkgPT4ge1xuICAgICAgICAgIHRoaXMuc3VjY2VlZE1vZHVsZShjb21waWxhdGlvbiwgbW9kdWxlKVxuICAgICAgICB9KVxuXG4gICAgICAgIGRhdGEubm9ybWFsTW9kdWxlRmFjdG9yeS5wbHVnaW4oXCJwYXJzZXJcIiwgZnVuY3Rpb24ocGFyc2VyLCBvcHRpb25zKSB7XG4gICAgICAgICAgLy8gZXh0cmFjdCB4dHlwZXMgYW5kIGNsYXNzZXMgZnJvbSBFeHQuY3JlYXRlIGNhbGxzXG4gICAgICAgICAgcGFyc2VyLnBsdWdpbignY2FsbCBFeHQuY3JlYXRlJywgYWRkVG9NYW5pZmVzdCk7XG4gICAgICAgICAgLy8gY29weSBFeHQucmVxdWlyZSBjYWxscyB0byB0aGUgbWFuaWZlc3QuICBUaGlzIGFsbG93cyB0aGUgdXNlcnMgdG8gZXhwbGljaXRseSByZXF1aXJlIGEgY2xhc3MgaWYgdGhlIHBsdWdpbiBmYWlscyB0byBkZXRlY3QgaXQuXG4gICAgICAgICAgcGFyc2VyLnBsdWdpbignY2FsbCBFeHQucmVxdWlyZScsIGFkZFRvTWFuaWZlc3QpO1xuICAgICAgICAgIC8vIGNvcHkgRXh0LmRlZmluZSBjYWxscyB0byB0aGUgbWFuaWZlc3QuICBUaGlzIGFsbG93cyB1c2VycyB0byB3cml0ZSBzdGFuZGFyZCBFeHRSZWFjdCBjbGFzc2VzLlxuICAgICAgICAgIHBhcnNlci5wbHVnaW4oJ2NhbGwgRXh0LmRlZmluZScsIGFkZFRvTWFuaWZlc3QpO1xuICAgICAgICB9KVxuICAgICAgfSlcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBjb21waWxlci5wbHVnaW4oJ2NvbXBpbGF0aW9uJywgKGNvbXBpbGF0aW9uLCBkYXRhKSA9PiB7XG4gICAgICAgIHJlYWRsaW5lLmN1cnNvclRvKHByb2Nlc3Muc3Rkb3V0LCAwKTtjb25zb2xlLmxvZyhhcHAgKyAnY29tcGlsYXRpb24nKVxuICAgICAgICBjb21waWxhdGlvbi5wbHVnaW4oJ3N1Y2NlZWQtbW9kdWxlJywgKG1vZHVsZSkgPT4ge1xuICAgICAgICAgIHRoaXMuc3VjY2VlZE1vZHVsZShjb21waWxhdGlvbiwgbW9kdWxlKVxuICAgICAgICB9KVxuICAgICAgICBkYXRhLm5vcm1hbE1vZHVsZUZhY3RvcnkucGx1Z2luKFwicGFyc2VyXCIsIGZ1bmN0aW9uKHBhcnNlciwgb3B0aW9ucykge1xuICAgICAgICAgIC8vIGV4dHJhY3QgeHR5cGVzIGFuZCBjbGFzc2VzIGZyb20gRXh0LmNyZWF0ZSBjYWxsc1xuICAgICAgICAgIHBhcnNlci5wbHVnaW4oJ2NhbGwgRXh0LmNyZWF0ZScsIGFkZFRvTWFuaWZlc3QpO1xuICAgICAgICAgIC8vIGNvcHkgRXh0LnJlcXVpcmUgY2FsbHMgdG8gdGhlIG1hbmlmZXN0LiAgVGhpcyBhbGxvd3MgdGhlIHVzZXJzIHRvIGV4cGxpY2l0bHkgcmVxdWlyZSBhIGNsYXNzIGlmIHRoZSBwbHVnaW4gZmFpbHMgdG8gZGV0ZWN0IGl0LlxuICAgICAgICAgIHBhcnNlci5wbHVnaW4oJ2NhbGwgRXh0LnJlcXVpcmUnLCBhZGRUb01hbmlmZXN0KTtcbiAgICAgICAgICAvLyBjb3B5IEV4dC5kZWZpbmUgY2FsbHMgdG8gdGhlIG1hbmlmZXN0LiAgVGhpcyBhbGxvd3MgdXNlcnMgdG8gd3JpdGUgc3RhbmRhcmQgRXh0UmVhY3QgY2xhc3Nlcy5cbiAgICAgICAgICBwYXJzZXIucGx1Z2luKCdjYWxsIEV4dC5kZWZpbmUnLCBhZGRUb01hbmlmZXN0KTtcbiAgICAgICAgfSlcblxuICAgICAgfSlcbiAgICB9XG5cbi8vKmVtaXQgLSBvbmNlIGFsbCBtb2R1bGVzIGFyZSBwcm9jZXNzZWQsIGNyZWF0ZSB0aGUgb3B0aW1pemVkIEV4dFJlYWN0IGJ1aWxkLlxuICAgIGlmIChjb21waWxlci5ob29rcykge1xuICAgICAgaWYgKHRoaXMuYXN5bmNocm9ub3VzKSB7XG4gICAgICAgIGNvbXBpbGVyLmhvb2tzLmVtaXQudGFwQXN5bmMoJ2V4dHJlYWN0LWVtaXQgKGFzeW5jKScsIChjb21waWxhdGlvbiwgY2FsbGJhY2spID0+IHtcbiAgICAgICAgICByZWFkbGluZS5jdXJzb3JUbyhwcm9jZXNzLnN0ZG91dCwgMCk7Y29uc29sZS5sb2coYXBwICsgJ2V4dHJlYWN0LWVtaXQgIChhc3luYyknKVxuICAgICAgICAgIHRoaXMuZW1pdChjb21waWxlciwgY29tcGlsYXRpb24sIGNhbGxiYWNrKVxuICAgICAgICAgIGNvbnNvbGUubG9nKGFwcCArICdhZnRlciBleHRyZWFjdC1lbWl0ICAoYXN5bmMpJylcbiAgICAgICAgICBpZiAoY2FsbGJhY2sgIT0gbnVsbCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuYXN5bmNocm9ub3VzKSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdjYWxsaW5nIGNhbGxiYWNrJylcbiAgICAgICAgICAgICAgY2FsbGJhY2soKVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBjb21waWxlci5ob29rcy5lbWl0LnRhcCgnZXh0cmVhY3QtZW1pdCcsIChjb21waWxhdGlvbikgPT4ge1xuICAgICAgICAgIHJlYWRsaW5lLmN1cnNvclRvKHByb2Nlc3Muc3Rkb3V0LCAwKTtjb25zb2xlLmxvZyhhcHAgKyAnZXh0cmVhY3QtZW1pdCcpXG4gICAgICAgICAgdGhpcy5lbWl0KGNvbXBpbGVyLCBjb21waWxhdGlvbilcblxuICAgICAgICAgIC8vIGlmICh0aGlzLmNvdW50ID09IDApIHtcbiAgICAgICAgICAvLyAgIHRoaXMuY291bnQrK1xuICAgICAgICAgIC8vICAgY29uc3Qgb3BuID0gcmVxdWlyZSgnb3BuJylcbiAgICAgICAgICAvLyAgIG9wbignaHR0cDovL2xvY2FsaG9zdDonICsgdGhpcy5wb3J0KVxuICAgICAgICAgIC8vIH1cblxuICAgICAgICAgIGNvbnNvbGUubG9nKGFwcCArICdhZnRlciBleHRyZWFjdC1lbWl0JylcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBjb21waWxlci5wbHVnaW4oJ2VtaXQnLCAoY29tcGlsYXRpb24sIGNhbGxiYWNrKSA9PiB7XG4gICAgICAgIHJlYWRsaW5lLmN1cnNvclRvKHByb2Nlc3Muc3Rkb3V0LCAwKTtjb25zb2xlLmxvZyhhcHAgKyAnZW1pdCcpXG4gICAgICAgIHRoaXMuZW1pdChjb21waWxlciwgY29tcGlsYXRpb24sIGNhbGxiYWNrKVxuICAgICAgICBjYWxsYmFjaygpXG4gICAgICB9KVxuICAgIH1cblxuICAgIGlmIChjb21waWxlci5ob29rcykge1xuICAgICAgaWYgKHRoaXMuYXN5bmNocm9ub3VzKSB7XG4gICAgICAgIGNvbXBpbGVyLmhvb2tzLmRvbmUudGFwQXN5bmMoJ2V4dHJlYWN0LWRvbmUgKGFzeW5jKScsIChjb21waWxhdGlvbiwgY2FsbGJhY2spID0+IHtcbiAgICAgICAgICByZWFkbGluZS5jdXJzb3JUbyhwcm9jZXNzLnN0ZG91dCwgMCk7Y29uc29sZS5sb2coYXBwICsgJ2V4dHJlYWN0LWRvbmUgKGFzeW5jKScpXG4gICAgICAgICAgaWYgKGNhbGxiYWNrICE9IG51bGwpIFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmFzeW5jaHJvbm91cykgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdjYWxsaW5nIGNhbGxiYWNrIGZvciBleHRyZWFjdC1lbWl0ICAoYXN5bmMpJylcbiAgICAgICAgICAgICAgY2FsbGJhY2soKVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBjb21waWxlci5ob29rcy5kb25lLnRhcCgnZXh0cmVhY3QtZG9uZScsICgpID0+IHtcbiAgICAgICAgICByZWFkbGluZS5jdXJzb3JUbyhwcm9jZXNzLnN0ZG91dCwgMCk7Y29uc29sZS5sb2coYXBwICsgJ2V4dHJlYWN0LWRvbmUnKVxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGVtaXQoY29tcGlsZXIsIGNvbXBpbGF0aW9uLCBjYWxsYmFjaykge1xuICAgIHZhciBpc1dlYnBhY2s0ID0gY29tcGlsYXRpb24uaG9va3M7XG4gICAgdmFyIG1vZHVsZXMgPSBbXVxuICAgIGlmIChpc1dlYnBhY2s0KSB7XG4gICAgICBpc1dlYnBhY2s0ID0gdHJ1ZVxuICAgICAgLy9tb2R1bGVzID0gY29tcGlsYXRpb24uY2h1bmtzLnJlZHVjZSgoYSwgYikgPT4gYS5jb25jYXQoYi5fbW9kdWxlcyksIFtdKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBpc1dlYnBhY2s0ID0gZmFsc2VcbiAgICAgIC8vbW9kdWxlcyA9IGNvbXBpbGF0aW9uLmNodW5rcy5yZWR1Y2UoKGEsIGIpID0+IGEuY29uY2F0KGIubW9kdWxlcyksIFtdKTtcbiAgICB9XG4gICAgY29uc3QgYnVpbGQgPSB0aGlzLmJ1aWxkc1tPYmplY3Qua2V5cyh0aGlzLmJ1aWxkcylbMF1dO1xuICAgIGxldCBvdXRwdXRQYXRoID0gcGF0aC5qb2luKGNvbXBpbGVyLm91dHB1dFBhdGgsIHRoaXMub3V0cHV0KTtcbiAgICAvLyB3ZWJwYWNrLWRldi1zZXJ2ZXIgb3ZlcndyaXRlcyB0aGUgb3V0cHV0UGF0aCB0byBcIi9cIiwgc28gd2UgbmVlZCB0byBwcmVwZW5kIGNvbnRlbnRCYXNlXG4gICAgaWYgKGNvbXBpbGVyLm91dHB1dFBhdGggPT09ICcvJyAmJiBjb21waWxlci5vcHRpb25zLmRldlNlcnZlcikge1xuICAgICAgb3V0cHV0UGF0aCA9IHBhdGguam9pbihjb21waWxlci5vcHRpb25zLmRldlNlcnZlci5jb250ZW50QmFzZSwgb3V0cHV0UGF0aCk7XG4gICAgfVxuICAgIC8vY29uc29sZS5sb2coJ1xcbioqKioqb3V0cHV0UGF0aDogJyArIG91dHB1dFBhdGgpXG5cbiAgICB0aGlzLl9idWlsZEV4dEJ1bmRsZShpc1dlYnBhY2s0LCAnbm90JywgbW9kdWxlcywgb3V0cHV0UGF0aCwgYnVpbGQsIGNhbGxiYWNrKVxuICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICBpZiAodGhpcy53YXRjaCkge1xuICAgICAgICAgIGlmICh0aGlzLmNvdW50ID09IDApIHtcbiAgICAgICAgICAgIHZhciB1cmwgPSAnaHR0cDovL2xvY2FsaG9zdDonICsgdGhpcy5wb3J0XG4gICAgICAgICAgICByZWFkbGluZS5jdXJzb3JUbyhwcm9jZXNzLnN0ZG91dCwgMCk7Y29uc29sZS5sb2coYXBwICsgJ2V4dHJlYWN0LWVtaXQgLSBvcGVuIGJyb3dzZXIgYXQgJyArIHVybClcbiAgICAgICAgICAgIHRoaXMuY291bnQrK1xuICAgICAgICAgICAgY29uc3Qgb3BuID0gcmVxdWlyZSgnb3BuJylcbiAgICAgICAgICAgIG9wbih1cmwpXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChjYWxsYmFjayAhPSBudWxsKXtpZiAodGhpcy5hc3luY2hyb25vdXMpe2NhbGxiYWNrKCl9fVxuICAgICAgICByZXR1cm5cbiAgICAgIH0pXG4gICAgICAuY2F0Y2goZSA9PiB7XG4gICAgICAgIC8vY29uc29sZS5sb2coZSlcbiAgICAgICAgY29tcGlsYXRpb24uZXJyb3JzLnB1c2gobmV3IEVycm9yKCdbQGV4dGpzL3JlYWN0b3Itd2VicGFjay1wbHVnaW5dOiAnICsgZS50b1N0cmluZygpKSk7XG4gICAgICAgIC8vIXRoaXMuYXN5bmNocm9ub3VzICYmIGNhbGxiYWNrKCk7XG4vLyAgICAgICAgY29uc29sZS5sb2coY2FsbGJhY2spXG4gICAgICAgIGlmIChjYWxsYmFjayAhPSBudWxsKSBcbiAgICAgICAge1xuICAgICAgICAgIGlmICghdGhpcy5hc3luY2hyb25vdXMpIFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KVxuICB9XG5cbiAgLyoqXG4gICAvKipcbiAgICAqIEJ1aWxkcyBhIG1pbmltYWwgdmVyc2lvbiBvZiB0aGUgRXh0UmVhY3QgZnJhbWV3b3JrIGJhc2VkIG9uIHRoZSBjbGFzc2VzIHVzZWRcbiAgICAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIFRoZSBuYW1lIG9mIHRoZSBidWlsZFxuICAgICogQHBhcmFtIHtNb2R1bGVbXX0gbW9kdWxlcyB3ZWJwYWNrIG1vZHVsZXNcbiAgICAqIEBwYXJhbSB7U3RyaW5nfSBvdXRwdXQgVGhlIHBhdGggdG8gd2hlcmUgdGhlIGZyYW1ld29yayBidWlsZCBzaG91bGQgYmUgd3JpdHRlblxuICAgICogQHBhcmFtIHtTdHJpbmd9IFt0b29sa2l0PSdtb2Rlcm4nXSBcIm1vZGVyblwiIG9yIFwiY2xhc3NpY1wiXG4gICAgKiBAcGFyYW0ge1N0cmluZ30gb3V0cHV0IFRoZSBwYXRoIHRvIHRoZSBkaXJlY3RvcnkgdG8gY3JlYXRlIHdoaWNoIHdpbGwgY29udGFpbiB0aGUganMgYW5kIGNzcyBidW5kbGVzXG4gICAgKiBAcGFyYW0ge1N0cmluZ30gdGhlbWUgVGhlIG5hbWUgb2YgdGhlIEV4dFJlYWN0IHRoZW1lIHBhY2thZ2UgdG8gdXNlLCBmb3IgZXhhbXBsZSBcInRoZW1lLW1hdGVyaWFsXCJcbiAgICAqIEBwYXJhbSB7U3RyaW5nW119IHBhY2thZ2VzIEFuIGFycmF5IG9mIEV4dFJlYWN0IHBhY2thZ2VzIHRvIGluY2x1ZGVcbiAgICAqIEBwYXJhbSB7U3RyaW5nW119IHBhY2thZ2VEaXJzIERpcmVjdG9yaWVzIGNvbnRhaW5pbmcgcGFja2FnZXNcbiAgICAqIEBwYXJhbSB7U3RyaW5nW119IG92ZXJyaWRlcyBBbiBhcnJheSBvZiBsb2NhdGlvbnMgZm9yIG92ZXJyaWRlc1xuICAgICogQHBhcmFtIHtTdHJpbmd9IHNkayBUaGUgZnVsbCBwYXRoIHRvIHRoZSBFeHRSZWFjdCBTREtcbiAgICAqIEBwcml2YXRlXG4gICAgKi9cbiAgX2J1aWxkRXh0QnVuZGxlKGlzV2VicGFjazQsIG5hbWUsIG1vZHVsZXMsIG91dHB1dCwgeyB0b29sa2l0PSdtb2Rlcm4nLCB0aGVtZSwgcGFja2FnZXM9W10sIHBhY2thZ2VEaXJzPVtdLCBzZGssIG92ZXJyaWRlcywgY2FsbGJhY2t9KSB7XG4gICAgbGV0IHNlbmNoYSA9IHRoaXMuX2dldFNlbmNoQ21kUGF0aCgpO1xuICAgIHRoZW1lID0gdGhlbWUgfHwgKHRvb2xraXQgPT09ICdjbGFzc2ljJyA/ICd0aGVtZS10cml0b24nIDogJ3RoZW1lLW1hdGVyaWFsJyk7XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgdGhpcy5vbkJ1aWxkRmFpbCA9IHJlamVjdDtcbiAgICAgIHRoaXMub25CdWlsZFN1Y2Nlc3MgPSByZXNvbHZlO1xuICAgICAgY21kRXJyb3JzID0gW107XG4gICAgICBcbiAgICAgIGNvbnN0IG9uQnVpbGREb25lID0gKCkgPT4ge1xuICAgICAgICBpZiAoY21kRXJyb3JzLmxlbmd0aCkge1xuICAgICAgICAgIHRoaXMub25CdWlsZEZhaWwobmV3IEVycm9yKGNtZEVycm9ycy5qb2luKFwiXCIpKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5vbkJ1aWxkU3VjY2VzcygpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmICghd2F0Y2hpbmcpIHtcbiAgICAgICAgcmltcmFmKG91dHB1dCk7XG4gICAgICAgIG1rZGlycChvdXRwdXQpO1xuICAgICAgfVxuXG4gICAgICBsZXQganM7XG4gICAgICBpZiAodGhpcy50cmVlU2hha2luZykge1xuICAgICAgICBsZXQgc3RhdGVtZW50cyA9IFsnRXh0LnJlcXVpcmUoW1wiRXh0LmFwcC5BcHBsaWNhdGlvblwiLCBcIkV4dC5Db21wb25lbnRcIiwgXCJFeHQuV2lkZ2V0XCIsIFwiRXh0LmxheW91dC5GaXRcIl0pJ107IC8vIGZvciBzb21lIHJlYXNvbiBjb21tYW5kIGRvZXNuJ3QgbG9hZCBjb21wb25lbnQgd2hlbiBvbmx5IHBhbmVsIGlzIHJlcXVpcmVkXG4gICAgICAgIGlmIChwYWNrYWdlcy5pbmRleE9mKCdyZWFjdG9yJykgIT09IC0xKSB7XG4gICAgICAgICAgc3RhdGVtZW50cy5wdXNoKCdFeHQucmVxdWlyZShcIkV4dC5yZWFjdG9yLlJlbmRlcmVyQ2VsbFwiKScpO1xuICAgICAgICB9XG4gICAgICAgIC8vbWpnXG4gICAgICAgIGZvciAobGV0IG1vZHVsZSBvZiBtb2R1bGVzKSB7XG4gICAgICAgICAgY29uc3QgZGVwcyA9IHRoaXMuZGVwZW5kZW5jaWVzW21vZHVsZS5yZXNvdXJjZV07XG4gICAgICAgICAgaWYgKGRlcHMpIHN0YXRlbWVudHMgPSBzdGF0ZW1lbnRzLmNvbmNhdChkZXBzKTtcbiAgICAgICAgfVxuICAgICAgICBqcyA9IHN0YXRlbWVudHMuam9pbignO1xcbicpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAganMgPSAnRXh0LnJlcXVpcmUoXCJFeHQuKlwiKSc7XG4gICAgICB9XG4gICAgICBjb25zdCBtYW5pZmVzdCA9IHBhdGguam9pbihvdXRwdXQsICdtYW5pZmVzdC5qcycpO1xuICAgICAgLy8gYWRkIGV4dC1yZWFjdC9wYWNrYWdlcyBhdXRvbWF0aWNhbGx5IGlmIHByZXNlbnRcbiAgICAgIGNvbnN0IHVzZXJQYWNrYWdlcyA9IHBhdGguam9pbignLicsICdleHQtcmVhY3QnLCAncGFja2FnZXMnKTtcbiAgICAgIGlmIChmcy5leGlzdHNTeW5jKHVzZXJQYWNrYWdlcykpIHtcbiAgICAgICAgcGFja2FnZURpcnMucHVzaCh1c2VyUGFja2FnZXMpXG4gICAgICB9XG5cbiAgICAgIGlmIChmcy5leGlzdHNTeW5jKHBhdGguam9pbihzZGssICdleHQnKSkpIHtcbiAgICAgICAgLy8gbG9jYWwgY2hlY2tvdXQgb2YgdGhlIFNESyByZXBvXG4gICAgICAgIHBhY2thZ2VEaXJzLnB1c2gocGF0aC5qb2luKCdleHQnLCAncGFja2FnZXMnKSk7XG4gICAgICAgIHNkayA9IHBhdGguam9pbihzZGssICdleHQnKTtcbiAgICAgIH1cbiAgICAgIGlmICghd2F0Y2hpbmcpIHtcbiAgICAgICAgZnMud3JpdGVGaWxlU3luYyhwYXRoLmpvaW4ob3V0cHV0LCAnYnVpbGQueG1sJyksIGJ1aWxkWE1MKHsgY29tcHJlc3M6IHRoaXMucHJvZHVjdGlvbiB9KSwgJ3V0ZjgnKTtcbiAgICAgICAgZnMud3JpdGVGaWxlU3luYyhwYXRoLmpvaW4ob3V0cHV0LCAnanNkb20tZW52aXJvbm1lbnQuanMnKSwgY3JlYXRlSlNET01FbnZpcm9ubWVudCgpLCAndXRmOCcpO1xuICAgICAgICBmcy53cml0ZUZpbGVTeW5jKHBhdGguam9pbihvdXRwdXQsICdhcHAuanNvbicpLCBjcmVhdGVBcHBKc29uKHsgdGhlbWUsIHBhY2thZ2VzLCB0b29sa2l0LCBvdmVycmlkZXMsIHBhY2thZ2VEaXJzIH0pLCAndXRmOCcpO1xuICAgICAgICBmcy53cml0ZUZpbGVTeW5jKHBhdGguam9pbihvdXRwdXQsICd3b3Jrc3BhY2UuanNvbicpLCBjcmVhdGVXb3Jrc3BhY2VKc29uKHNkaywgcGFja2FnZURpcnMsIG91dHB1dCksICd1dGY4Jyk7XG4gICAgICB9XG4gICAgICBsZXQgY21kUmVidWlsZE5lZWRlZCA9IGZhbHNlO1xuICAgICAgaWYgKHRoaXMubWFuaWZlc3QgPT09IG51bGwgfHwganMgIT09IHRoaXMubWFuaWZlc3QpIHtcbiAgICAgICAgLy8gT25seSB3cml0ZSBtYW5pZmVzdCBpZiBpdCBkaWZmZXJzIGZyb20gdGhlIGxhc3QgcnVuLiAgVGhpcyBwcmV2ZW50cyB1bm5lY2Vzc2FyeSBjbWQgcmVidWlsZHMuXG4gICAgICAgIHRoaXMubWFuaWZlc3QgPSBqcztcbiAgICAgICAgLy9yZWFkbGluZS5jdXJzb3JUbyhwcm9jZXNzLnN0ZG91dCwgMCk7Y29uc29sZS5sb2coYXBwICsganMpXG4gICAgICAgIHJlYWRsaW5lLmN1cnNvclRvKHByb2Nlc3Muc3Rkb3V0LCAwKTtjb25zb2xlLmxvZyhhcHAgKyAndHJlZSBzaGFraW5nOiAnICsgdGhpcy50cmVlU2hha2luZylcbiAgICAgICAgZnMud3JpdGVGaWxlU3luYyhtYW5pZmVzdCwganMsICd1dGY4Jyk7XG4gICAgICAgIGNtZFJlYnVpbGROZWVkZWQgPSB0cnVlO1xuICAgICAgICByZWFkbGluZS5jdXJzb3JUbyhwcm9jZXNzLnN0ZG91dCwgMCk7Y29uc29sZS5sb2coYXBwICsgYGJ1aWxkaW5nIEV4dFJlYWN0IGJ1bmRsZSBhdDogJHtvdXRwdXR9YClcbiAgICAgIH1cblxuXG4gLy8gICAgIGNvbnNvbGUubG9nKGlzV2VicGFjazQpXG5cbiAgICAgIC8vIGlmIChpc1dlYnBhY2s0KSB7XG4gICAgICAvLyAgIGlmICh0aGlzLndhdGNoKSB7XG4gICAgICAvLyAgICAgaWYgKCF3YXRjaGluZykge1xuICAgICAgLy8gICAgICAgLy8gd2F0Y2hpbmcgPSBnYXRoZXJFcnJvcnMoZm9yayhzZW5jaGEsIFsnYW50JywgJ3dhdGNoJ10sIHsgY3dkOiBvdXRwdXQsIHNpbGVudDogdHJ1ZSB9KSk7XG4gICAgICAvLyAgICAgICAvLyAvL3ZhciBwYXJtcyA9IFsnYW50Jywnd2F0Y2gnXVxuICAgICAgLy8gICAgICAgLy8gLy9hd2FpdCB1dGlsLnNlbmNoYUNtZEFzeW5jKHBhcm1zLCAneWVzJylcbiAgICAgIC8vICAgICAgIC8vIC8vcmVzb2x2ZSgwKTtcbiAgICAgICAgICAgIFxuICAgICAgLy8gICAgICAgLy8gY29uc29sZS5sb2coJ2FmdGVyIGZvcmsnKVxuICAgICAgLy8gICAgICAgLy8gd2F0Y2hpbmcuc3RkZXJyLnBpcGUocHJvY2Vzcy5zdGRlcnIpO1xuICAgICAgLy8gICAgICAgLy8gd2F0Y2hpbmcuc3Rkb3V0LnBpcGUocHJvY2Vzcy5zdGRvdXQpO1xuICAgICAgLy8gICAgICAgLy8gd2F0Y2hpbmcuc3Rkb3V0Lm9uKCdkYXRhJywgZGF0YSA9PiB7XG4gICAgICAvLyAgICAgICAvLyAgIGlmIChkYXRhICYmIGRhdGEudG9TdHJpbmcoKS5tYXRjaCgvV2FpdGluZyBmb3IgY2hhbmdlc1xcLlxcLlxcLi8pKSB7XG4gICAgICAvLyAgICAgICAvLyAgICAgb25CdWlsZERvbmUoKVxuICAgICAgLy8gICAgICAgLy8gICB9XG4gICAgICAvLyAgICAgICAvLyB9KVxuICAgICAgLy8gICAgICAgLy8gd2F0Y2hpbmcub24oJ2V4aXQnLCBvbkJ1aWxkRG9uZSlcbiAgICAgIC8vICAgICAgIGNvbnN0IHNwYXduU3luYyA9IHJlcXVpcmUoJ2NoaWxkX3Byb2Nlc3MnKS5zcGF3blN5bmNcbiAgICAgIC8vICAgICAgIHNwYXduU3luYyhzZW5jaGEsIFsnYW50JywgJ3dhdGNoJ10sIHsgY3dkOiBvdXRwdXQsIHN0ZGlvOiAnaW5oZXJpdCcsIGVuY29kaW5nOiAndXRmLTgnfSlcbiAgICAgIC8vICAgICAgIG9uQnVpbGREb25lKClcbiAgICAgIC8vICAgICB9XG4gICAgICAvLyAgICAgaWYgKCFjbWRSZWJ1aWxkTmVlZGVkKSBvbkJ1aWxkRG9uZSgpO1xuICAgICAgLy8gICB9XG4gICAgICAvLyAgIGVsc2Uge1xuICAgICAgLy8gICAgIGNvbnNvbGUubG9nKCdjJylcbiAgICAgIC8vICAgICBjb25zdCBzcGF3blN5bmMgPSByZXF1aXJlKCdjaGlsZF9wcm9jZXNzJykuc3Bhd25TeW5jXG4gICAgICAvLyAgICAgc3Bhd25TeW5jKHNlbmNoYSwgWydhbnQnLCAnYnVpbGQnXSwgeyBjd2Q6IG91dHB1dCwgc3RkaW86ICdpbmhlcml0JywgZW5jb2Rpbmc6ICd1dGYtOCd9KVxuICAgICAgLy8gICAgIG9uQnVpbGREb25lKClcbiAgICAgIC8vICAgfVxuICAgICAgLy8gfVxuXG4gICAgICAvL2lmICghaXNXZWJwYWNrNCkge1xuICAgICAgICBpZiAodGhpcy53YXRjaCkge1xuICAgICAgICAgIGlmICghd2F0Y2hpbmcpIHtcbiAgICAgICAgICAgIHdhdGNoaW5nID0gZ2F0aGVyRXJyb3JzKGZvcmsoc2VuY2hhLCBbJ2FudCcsICd3YXRjaCddLCB7IGN3ZDogb3V0cHV0LCBzaWxlbnQ6IHRydWUgfSkpO1xuICAgICAgICAgICAgcmVhZGxpbmUuY3Vyc29yVG8ocHJvY2Vzcy5zdGRvdXQsIDApO2NvbnNvbGUubG9nKGFwcCArICdzZW5jaGEgYW50IHdhdGNoJylcbiAgICAgICAgICAgIHdhdGNoaW5nLnN0ZGVyci5waXBlKHByb2Nlc3Muc3RkZXJyKTtcbiAgICAgICAgICAgIHdhdGNoaW5nLnN0ZG91dC5waXBlKHByb2Nlc3Muc3Rkb3V0KTtcbiAgICAgICAgICAgIHdhdGNoaW5nLnN0ZG91dC5vbignZGF0YScsIGRhdGEgPT4ge1xuICAgICAgICAgICAgICBpZiAoZGF0YSAmJiBkYXRhLnRvU3RyaW5nKCkubWF0Y2goL1dhaXRpbmcgZm9yIGNoYW5nZXNcXC5cXC5cXC4vKSkge1xuICAgICAgICAgICAgICAgIG9uQnVpbGREb25lKClcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIHdhdGNoaW5nLm9uKCdleGl0Jywgb25CdWlsZERvbmUpXG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghY21kUmVidWlsZE5lZWRlZCkge1xuICAgICAgICAgICAgcmVhZGxpbmUuY3Vyc29yVG8ocHJvY2Vzcy5zdGRvdXQsIDApO2NvbnNvbGUubG9nKGFwcCArICdFeHQgcmVidWlsZCBOT1QgbmVlZGVkJylcbiAgICAgICAgICAgIG9uQnVpbGREb25lKClcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZWFkbGluZS5jdXJzb3JUbyhwcm9jZXNzLnN0ZG91dCwgMCk7Y29uc29sZS5sb2coYXBwICsgJ0V4dCByZWJ1aWxkIElTIG5lZWRlZCcpXG4gICAgICAgICAgfVxuICAgICAgICB9IFxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBjb25zdCBidWlsZCA9IGdhdGhlckVycm9ycyhmb3JrKHNlbmNoYSwgWydhbnQnLCAnYnVpbGQnXSwgeyBzdGRpbzogJ2luaGVyaXQnLCBlbmNvZGluZzogJ3V0Zi04JywgY3dkOiBvdXRwdXQsIHNpbGVudDogZmFsc2UgfSkpO1xuICAgICAgICAgIHJlYWRsaW5lLmN1cnNvclRvKHByb2Nlc3Muc3Rkb3V0LCAwKTtjb25zb2xlLmxvZyhhcHAgKyAnc2VuY2hhIGFudCBidWlsZCcpXG4gICAgICAgICAgaWYoYnVpbGQuc3Rkb3V0KSB7IGJ1aWxkLnN0ZG91dC5waXBlKHByb2Nlc3Muc3Rkb3V0KSB9XG4gICAgICAgICAgaWYoYnVpbGQuc3RkZXJyKSB7IGJ1aWxkLnN0ZGVyci5waXBlKHByb2Nlc3Muc3RkZXJyKSB9XG4gICAgICAgICAgYnVpbGQub24oJ2V4aXQnLCBvbkJ1aWxkRG9uZSk7XG4gICAgICAgIH1cbiAgICAgIC8vfVxuXG5cbiAgICB9KTtcbiAgfVxuXG5cblxuICAvKipcbiAgICogRGVmYXVsdCBjb25maWcgb3B0aW9uc1xuICAgKiBAcHJvdGVjdGVkXG4gICAqIEByZXR1cm4ge09iamVjdH1cbiAgICovXG4gIGdldERlZmF1bHRPcHRpb25zKCkge1xuICAgIHJldHVybiB7XG4gICAgICBwb3J0OiA4MDE2LFxuICAgICAgYnVpbGRzOiB7fSxcbiAgICAgIGRlYnVnOiBmYWxzZSxcbiAgICAgIHdhdGNoOiBmYWxzZSxcbiAgICAgIHRlc3Q6IC9cXC4oanx0KXN4PyQvLFxuXG4gICAgICAvKiBiZWdpbiBzaW5nbGUgYnVpbGQgb25seSAqL1xuICAgICAgb3V0cHV0OiAnZXh0LXJlYWN0JyxcbiAgICAgIHRvb2xraXQ6ICdtb2Rlcm4nLFxuICAgICAgcGFja2FnZXM6IG51bGwsXG4gICAgICBwYWNrYWdlRGlyczogW10sXG4gICAgICBvdmVycmlkZXM6IFtdLFxuICAgICAgYXN5bmNocm9ub3VzOiBmYWxzZSxcbiAgICAgIHByb2R1Y3Rpb246IGZhbHNlLFxuICAgICAgbWFuaWZlc3RFeHRyYWN0b3I6IGV4dHJhY3RGcm9tSlNYLFxuICAgICAgdHJlZVNoYWtpbmc6IGZhbHNlXG4gICAgICAvKiBlbmQgc2luZ2xlIGJ1aWxkIG9ubHkgKi9cbiAgICB9XG4gIH1cblxuXG5cbiAgc3VjY2VlZE1vZHVsZShjb21waWxhdGlvbiwgbW9kdWxlKSB7XG4gICAgdGhpcy5jdXJyZW50RmlsZSA9IG1vZHVsZS5yZXNvdXJjZTtcbiAgICBpZiAobW9kdWxlLnJlc291cmNlICYmIG1vZHVsZS5yZXNvdXJjZS5tYXRjaCh0aGlzLnRlc3QpICYmICFtb2R1bGUucmVzb3VyY2UubWF0Y2goL25vZGVfbW9kdWxlcy8pICYmICFtb2R1bGUucmVzb3VyY2UubWF0Y2goYC9yZWFjdG9yJHtyZWFjdFZlcnNpb259L2ApKSB7XG4gICAgICBjb25zdCBkb1BhcnNlID0gKCkgPT4ge1xuICAgICAgICB0aGlzLmRlcGVuZGVuY2llc1t0aGlzLmN1cnJlbnRGaWxlXSA9IFtcbiAgICAgICAgICAuLi4odGhpcy5kZXBlbmRlbmNpZXNbdGhpcy5jdXJyZW50RmlsZV0gfHwgW10pLFxuICAgICAgICAgIC4uLnRoaXMubWFuaWZlc3RFeHRyYWN0b3IobW9kdWxlLl9zb3VyY2UuX3ZhbHVlLCBjb21waWxhdGlvbiwgbW9kdWxlLCByZWFjdFZlcnNpb24pXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLmRlYnVnKSB7XG4gICAgICAgIGRvUGFyc2UoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRyeSB7IGRvUGFyc2UoKTsgfSBjYXRjaCAoZSkgXG4gICAgICAgIHsgXG4gICAgICAgICAgY29uc29sZS5lcnJvcignXFxuZXJyb3IgcGFyc2luZyAnICsgdGhpcy5jdXJyZW50RmlsZSk7IFxuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7IFxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vY29uc29sZS5sb2coJ3RoaXMuZGVwZW5kZW5jaWVzW3RoaXMuY3VycmVudEZpbGVdJylcbi8vICAgICAgY29uc29sZS5sb2coJ1xcbicrdGhpcy5jdXJyZW50RmlsZSlcbiAgICAgIC8vY29uc29sZS5sb2codGhpcy5kZXBlbmRlbmNpZXNbdGhpcy5jdXJyZW50RmlsZV0pXG5cbiAgICB9XG4gIH1cblxuXG5cbiAgLyoqXG4gICAqIENoZWNrcyBlYWNoIGJ1aWxkIGNvbmZpZyBmb3IgbWlzc2luZy9pbnZhbGlkIHByb3BlcnRpZXNcbiAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgVGhlIG5hbWUgb2YgdGhlIGJ1aWxkXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBidWlsZCBUaGUgYnVpbGQgY29uZmlnXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfdmFsaWRhdGVCdWlsZENvbmZpZyhuYW1lLCBidWlsZCkge1xuICAgIGxldCB7IHNkaywgcHJvZHVjdGlvbiB9ID0gYnVpbGQ7XG5cbiAgICBpZiAocHJvZHVjdGlvbikge1xuICAgICAgYnVpbGQudHJlZVNoYWtpbmcgPSBmYWxzZTtcbiAgICB9XG4gICAgaWYgKHNkaykge1xuICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKHNkaykpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vIFNESyBmb3VuZCBhdCAke3BhdGgucmVzb2x2ZShzZGspfS4gIERpZCB5b3UgZm9yIGdldCB0byBsaW5rL2NvcHkgeW91ciBFeHQgSlMgU0RLIHRvIHRoYXQgbG9jYXRpb24/YCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuX2FkZFJlYWN0b3JQYWNrYWdlKGJ1aWxkKVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0cnkge1xuICAgICAgICBidWlsZC5zZGsgPSBwYXRoLmRpcm5hbWUocmVzb2x2ZSgnQGV4dGpzL2V4dC1yZWFjdCcsIHsgYmFzZWRpcjogcHJvY2Vzcy5jd2QoKSB9KSlcbiAgICAgICAgYnVpbGQucGFja2FnZURpcnMgPSBbLi4uKGJ1aWxkLnBhY2thZ2VEaXJzIHx8IFtdKSwgcGF0aC5kaXJuYW1lKGJ1aWxkLnNkayldO1xuICAgICAgICBidWlsZC5wYWNrYWdlcyA9IGJ1aWxkLnBhY2thZ2VzIHx8IHRoaXMuX2ZpbmRQYWNrYWdlcyhidWlsZC5zZGspO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEBleHRqcy9leHQtcmVhY3Qgbm90IGZvdW5kLiAgWW91IGNhbiBpbnN0YWxsIGl0IHdpdGggXCJucG0gaW5zdGFsbCAtLXNhdmUgQGV4dGpzL2V4dC1yZWFjdFwiIG9yLCBpZiB5b3UgaGF2ZSBhIGxvY2FsIGNvcHkgb2YgdGhlIFNESywgc3BlY2lmeSB0aGUgcGF0aCB0byBpdCB1c2luZyB0aGUgXCJzZGtcIiBvcHRpb24gaW4gYnVpbGQgXCIke25hbWV9LlwiYCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgdGhlIHJlYWN0b3IgcGFja2FnZSBpZiBwcmVzZW50IGFuZCB0aGUgdG9vbGtpdCBpcyBtb2Rlcm5cbiAgICogQHBhcmFtIHtPYmplY3R9IGJ1aWxkIFxuICAgKi9cbiAgX2FkZFJlYWN0b3JQYWNrYWdlKGJ1aWxkKSB7XG4gICAgaWYgKGJ1aWxkLnRvb2xraXQgPT09ICdjbGFzc2ljJykgcmV0dXJuO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKHBhdGguam9pbihidWlsZC5zZGssICdleHQnLCAnbW9kZXJuJywgJ3JlYWN0b3InKSkgfHwgIC8vIHJlcG9cbiAgICAgIGZzLmV4aXN0c1N5bmMocGF0aC5qb2luKGJ1aWxkLnNkaywgJ21vZGVybicsICdyZWFjdG9yJykpKSB7IC8vIHByb2R1Y3Rpb24gYnVpbGRcbiAgICAgIGlmICghYnVpbGQucGFja2FnZXMpIHtcbiAgICAgICAgYnVpbGQucGFja2FnZXMgPSBbXTtcbiAgICAgIH1cbiAgICAgIGJ1aWxkLnBhY2thZ2VzLnB1c2goJ3JlYWN0b3InKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJuIHRoZSBuYW1lcyBvZiBhbGwgRXh0UmVhY3QgcGFja2FnZXMgaW4gdGhlIHNhbWUgcGFyZW50IGRpcmVjdG9yeSBhcyBleHQtcmVhY3QgKHR5cGljYWxseSBub2RlX21vZHVsZXMvQGV4dGpzKVxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge1N0cmluZ30gc2RrIFBhdGggdG8gZXh0LXJlYWN0XG4gICAqIEByZXR1cm4ge1N0cmluZ1tdfVxuICAgKi9cbiAgX2ZpbmRQYWNrYWdlcyhzZGspIHtcbiAgICBjb25zdCBtb2R1bGVzRGlyID0gcGF0aC5qb2luKHNkaywgJy4uJyk7XG4gICAgcmV0dXJuIGZzLnJlYWRkaXJTeW5jKG1vZHVsZXNEaXIpXG4gICAgICAvLyBGaWx0ZXIgb3V0IGRpcmVjdG9yaWVzIHdpdGhvdXQgJ3BhY2thZ2UuanNvbidcbiAgICAgIC5maWx0ZXIoZGlyID0+IGZzLmV4aXN0c1N5bmMocGF0aC5qb2luKG1vZHVsZXNEaXIsIGRpciwgJ3BhY2thZ2UuanNvbicpKSlcbiAgICAgIC8vIEdlbmVyYXRlIGFycmF5IG9mIHBhY2thZ2UgbmFtZXNcbiAgICAgIC5tYXAoZGlyID0+IHtcbiAgICAgICAgICBjb25zdCBwYWNrYWdlSW5mbyA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKHBhdGguam9pbihtb2R1bGVzRGlyLCBkaXIsICdwYWNrYWdlLmpzb24nKSkpO1xuICAgICAgICAgIC8vIERvbid0IGluY2x1ZGUgdGhlbWUgdHlwZSBwYWNrYWdlcy5cbiAgICAgICAgICBpZihwYWNrYWdlSW5mby5zZW5jaGEgJiYgcGFja2FnZUluZm8uc2VuY2hhLnR5cGUgIT09ICd0aGVtZScpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHBhY2thZ2VJbmZvLnNlbmNoYS5uYW1lO1xuICAgICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAvLyBSZW1vdmUgYW55IHVuZGVmaW5lZHMgZnJvbSBtYXBcbiAgICAgIC5maWx0ZXIobmFtZSA9PiBuYW1lKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBwYXRoIHRvIHRoZSBzZW5jaGEgY21kIGV4ZWN1dGFibGVcbiAgICogQHByaXZhdGVcbiAgICogQHJldHVybiB7U3RyaW5nfVxuICAgKi9cbiAgX2dldFNlbmNoQ21kUGF0aCgpIHtcbiAgICB0cnkge1xuICAgICAgLy8gdXNlIEBleHRqcy9zZW5jaGEtY21kIGZyb20gbm9kZV9tb2R1bGVzXG4gICAgICByZXR1cm4gcmVxdWlyZSgnQGV4dGpzL3NlbmNoYS1jbWQnKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAvLyBhdHRlbXB0IHRvIHVzZSBnbG9iYWxseSBpbnN0YWxsZWQgU2VuY2hhIENtZFxuICAgICAgcmV0dXJuICdzZW5jaGEnO1xuICAgIH1cbiAgfVxuXG5cblxuXG4gIFxuXG5cblxufVxuXG5cbiAgICAgICAgLy8gaW4gJ2V4dHJlYWN0LWNvbXBpbGF0aW9uJ1xuICAgICAgICAvL2h0dHBzOi8vZ2l0aHViLmNvbS9qYWtldHJlbnQvaHRtbC13ZWJwYWNrLXRlbXBsYXRlXG4gICAgICAgIC8vaHR0cHM6Ly9naXRodWIuY29tL2phbnRpbW9uL2h0bWwtd2VicGFjay1wbHVnaW4jXG4gICAgICAgIC8vIHRoZSBmb2xsb3dpbmcgaXMgbmVlZGVkIGZvciBodG1sLXdlYnBhY2stcGx1Z2luIHRvIGluY2x1ZGUgPHNjcmlwdD4gYW5kIDxsaW5rPiB0YWdzIGZvciBFeHRSZWFjdFxuICAgICAgICAvLyBjb21waWxhdGlvbi5ob29rcy5odG1sV2VicGFja1BsdWdpbkJlZm9yZUh0bWxHZW5lcmF0aW9uLnRhcEFzeW5jKFxuICAgICAgICAvLyAgICdleHRyZWFjdC1odG1sZ2VuZXJhdGlvbicsXG4gICAgICAgIC8vICAgKGRhdGEsIGNiKSA9PiB7XG4gICAgICAgIC8vICAgICByZWFkbGluZS5jdXJzb3JUbyhwcm9jZXNzLnN0ZG91dCwgMCk7Y29uc29sZS5sb2coYXBwICsgJ2V4dHJlYWN0LWh0bWxnZW5lcmF0aW9uJylcbiAgICAgICAgLy8gICAgIGNvbnNvbGUubG9nKCdkYXRhLmFzc2V0cy5qcy5sZW5ndGgnKVxuICAgICAgICAvLyAgICAgY29uc29sZS5sb2coZGF0YS5hc3NldHMuanMubGVuZ3RoKVxuICAgICAgICAvLyAgICAgZGF0YS5hc3NldHMuanMudW5zaGlmdCgnZXh0LXJlYWN0L2V4dC5qcycpXG4gICAgICAgIC8vICAgICBkYXRhLmFzc2V0cy5jc3MudW5zaGlmdCgnZXh0LXJlYWN0L2V4dC5jc3MnKVxuICAgICAgICAvLyAgICAgY2IobnVsbCwgZGF0YSlcbiAgICAgICAgLy8gICB9XG4gICAgICAgIC8vIClcblxuXG5cbi8vIGZyb20gdGhpcy5lbWl0XG4gICAgLy8gdGhlIGZvbGxvd2luZyBpcyBuZWVkZWQgZm9yIGh0bWwtd2VicGFjay1wbHVnaW4gdG8gaW5jbHVkZSA8c2NyaXB0PiBhbmQgPGxpbms+IHRhZ3MgZm9yIEV4dFJlYWN0XG4gICAgLy8gY29uc29sZS5sb2coJ2NvbXBpbGF0aW9uJylcbiAgICAvLyBjb25zb2xlLmxvZygnKioqKioqKipjb21waWxhdGlvbi5jaHVua3NbMF0nKVxuICAgIC8vIGNvbnNvbGUubG9nKGNvbXBpbGF0aW9uLmNodW5rc1swXS5pZClcbiAgICAvLyBjb25zb2xlLmxvZyhwYXRoLmpvaW4odGhpcy5vdXRwdXQsICdleHQuanMnKSlcbiAgICAvLyBjb25zdCBqc0NodW5rID0gY29tcGlsYXRpb24uYWRkQ2h1bmsoYCR7dGhpcy5vdXRwdXR9LWpzYCk7XG4gICAgLy8ganNDaHVuay5oYXNSdW50aW1lID0ganNDaHVuay5pc0luaXRpYWwgPSAoKSA9PiB0cnVlO1xuICAgIC8vIGpzQ2h1bmsuZmlsZXMucHVzaChwYXRoLmpvaW4odGhpcy5vdXRwdXQsICdleHQuanMnKSk7XG4gICAgLy8ganNDaHVuay5maWxlcy5wdXNoKHBhdGguam9pbih0aGlzLm91dHB1dCwgJ2V4dC5jc3MnKSk7XG4gICAgLy8ganNDaHVuay5pZCA9ICdhYWFhcCc7IC8vIHRoaXMgZm9yY2VzIGh0bWwtd2VicGFjay1wbHVnaW4gdG8gaW5jbHVkZSBleHQuanMgZmlyc3RcbiAgICAvLyBjb25zb2xlLmxvZygnKioqKioqKipjb21waWxhdGlvbi5jaHVua3NbMV0nKVxuICAgIC8vIGNvbnNvbGUubG9nKGNvbXBpbGF0aW9uLmNodW5rc1sxXS5pZClcblxuICAgIC8vaWYgKHRoaXMuYXN5bmNocm9ub3VzKSBjYWxsYmFjaygpO1xuLy8gICAgY29uc29sZS5sb2coY2FsbGJhY2spXG5cbi8vIGlmIChpc1dlYnBhY2s0KSB7XG4vLyAgIGNvbnNvbGUubG9nKHBhdGguam9pbih0aGlzLm91dHB1dCwgJ2V4dC5qcycpKVxuLy8gICBjb25zdCBzdGF0cyA9IGZzLnN0YXRTeW5jKHBhdGguam9pbihvdXRwdXRQYXRoLCAnZXh0LmpzJykpXG4vLyAgIGNvbnN0IGZpbGVTaXplSW5CeXRlcyA9IHN0YXRzLnNpemVcbi8vICAgY29tcGlsYXRpb24uYXNzZXRzWydleHQuanMnXSA9IHtcbi8vICAgICBzb3VyY2U6IGZ1bmN0aW9uKCkge3JldHVybiBmcy5yZWFkRmlsZVN5bmMocGF0aC5qb2luKG91dHB1dFBhdGgsICdleHQuanMnKSl9LFxuLy8gICAgIHNpemU6IGZ1bmN0aW9uKCkge3JldHVybiBmaWxlU2l6ZUluQnl0ZXN9XG4vLyAgIH1cbi8vICAgY29uc29sZS5sb2coY29tcGlsYXRpb24uZW50cnlwb2ludHMpXG5cbi8vICAgdmFyIGZpbGVsaXN0ID0gJ0luIHRoaXMgYnVpbGQ6XFxuXFxuJztcblxuLy8gICAvLyBMb29wIHRocm91Z2ggYWxsIGNvbXBpbGVkIGFzc2V0cyxcbi8vICAgLy8gYWRkaW5nIGEgbmV3IGxpbmUgaXRlbSBmb3IgZWFjaCBmaWxlbmFtZS5cbi8vICAgZm9yICh2YXIgZmlsZW5hbWUgaW4gY29tcGlsYXRpb24uYXNzZXRzKSB7XG4vLyAgICAgZmlsZWxpc3QgKz0gKCctICcrIGZpbGVuYW1lICsnXFxuJyk7XG4vLyAgIH1cblxuLy8gICAvLyBJbnNlcnQgdGhpcyBsaXN0IGludG8gdGhlIHdlYnBhY2sgYnVpbGQgYXMgYSBuZXcgZmlsZSBhc3NldDpcbi8vICAgY29tcGlsYXRpb24uYXNzZXRzWydmaWxlbGlzdC5tZCddID0ge1xuLy8gICAgIHNvdXJjZSgpIHtcbi8vICAgICAgIHJldHVybiBmaWxlbGlzdDtcbi8vICAgICB9LFxuLy8gICAgIHNpemUoKSB7XG4vLyAgICAgICByZXR1cm4gZmlsZWxpc3QubGVuZ3RoO1xuLy8gICAgIH1cbi8vICAgfVxuLy8gfSJdfQ==