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
        if (_this2.count == 0) {
          var url = 'http://localhost:' + _this2.port;
          readline.cursorTo(process.stdout, 0);console.log(app + 'extreact-emit - open browser at ' + url);
          _this2.count++;
          var opn = require('opn');
          opn(url);
        }
        if (callback != null) {
          if (_this2.asynchronous) {
            callback();
          }
        }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9pbmRleC5qcyJdLCJuYW1lcyI6WyJyZWFkbGluZSIsInJlYWN0VmVyc2lvbiIsIndhdGNoaW5nIiwiY21kRXJyb3JzIiwiYXBwIiwiY2hhbGsiLCJncmVlbiIsImdhdGhlckVycm9ycyIsImNtZCIsInN0ZG91dCIsIm9uIiwibWVzc2FnZSIsImRhdGEiLCJ0b1N0cmluZyIsIm1hdGNoIiwicHVzaCIsInJlcGxhY2UiLCJtb2R1bGUiLCJleHBvcnRzIiwib3B0aW9ucyIsImNvdW50IiwicGtnIiwiZnMiLCJleGlzdHNTeW5jIiwiSlNPTiIsInBhcnNlIiwicmVhZEZpbGVTeW5jIiwicmVhY3RFbnRyeSIsImRlcGVuZGVuY2llcyIsInJlYWN0IiwiaXMxNiIsImluY2x1ZGVzIiwiZXh0UmVhY3RSYyIsImdldERlZmF1bHRPcHRpb25zIiwiYnVpbGRzIiwiT2JqZWN0Iiwia2V5cyIsImxlbmd0aCIsImJ1aWxkT3B0aW9ucyIsImV4dCIsIm5hbWUiLCJfdmFsaWRhdGVCdWlsZENvbmZpZyIsImFzc2lnbiIsImN1cnJlbnRGaWxlIiwibWFuaWZlc3QiLCJ3YXRjaCIsImNvbXBpbGVyIiwid2VicGFja1ZlcnNpb24iLCJ1bmRlZmluZWQiLCJpc1dlYnBhY2s0IiwiaG9va3MiLCJjdXJzb3JUbyIsInByb2Nlc3MiLCJjb25zb2xlIiwibG9nIiwibWUiLCJhc3luY2hyb25vdXMiLCJ3YXRjaFJ1biIsInRhcEFzeW5jIiwiY2IiLCJ0YXAiLCJwbHVnaW4iLCJhZGRUb01hbmlmZXN0IiwiY2FsbCIsImZpbGUiLCJzdGF0ZSIsInJlc291cmNlIiwiZSIsImVycm9yIiwiY29tcGlsYXRpb24iLCJzdWNjZWVkTW9kdWxlIiwibm9ybWFsTW9kdWxlRmFjdG9yeSIsInBhcnNlciIsImVtaXQiLCJjYWxsYmFjayIsImRvbmUiLCJtb2R1bGVzIiwiYnVpbGQiLCJvdXRwdXRQYXRoIiwicGF0aCIsImpvaW4iLCJvdXRwdXQiLCJkZXZTZXJ2ZXIiLCJjb250ZW50QmFzZSIsIl9idWlsZEV4dEJ1bmRsZSIsInRoZW4iLCJ1cmwiLCJwb3J0Iiwib3BuIiwicmVxdWlyZSIsImNhdGNoIiwiZXJyb3JzIiwiRXJyb3IiLCJ0b29sa2l0IiwidGhlbWUiLCJwYWNrYWdlcyIsInBhY2thZ2VEaXJzIiwic2RrIiwib3ZlcnJpZGVzIiwic2VuY2hhIiwiX2dldFNlbmNoQ21kUGF0aCIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0Iiwib25CdWlsZEZhaWwiLCJvbkJ1aWxkU3VjY2VzcyIsIm9uQnVpbGREb25lIiwianMiLCJ0cmVlU2hha2luZyIsInN0YXRlbWVudHMiLCJpbmRleE9mIiwiZGVwcyIsImNvbmNhdCIsInVzZXJQYWNrYWdlcyIsIndyaXRlRmlsZVN5bmMiLCJjb21wcmVzcyIsInByb2R1Y3Rpb24iLCJjbWRSZWJ1aWxkTmVlZGVkIiwiY3dkIiwic2lsZW50Iiwic3RkZXJyIiwicGlwZSIsInN0ZGlvIiwiZW5jb2RpbmciLCJkZWJ1ZyIsInRlc3QiLCJtYW5pZmVzdEV4dHJhY3RvciIsImV4dHJhY3RGcm9tSlNYIiwiZG9QYXJzZSIsIl9zb3VyY2UiLCJfdmFsdWUiLCJfYWRkUmVhY3RvclBhY2thZ2UiLCJkaXJuYW1lIiwiYmFzZWRpciIsIl9maW5kUGFja2FnZXMiLCJtb2R1bGVzRGlyIiwicmVhZGRpclN5bmMiLCJmaWx0ZXIiLCJkaXIiLCJtYXAiLCJwYWNrYWdlSW5mbyIsInR5cGUiXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7QUFFQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOztBQUNBOzs7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBSUE7O0lBQVlBLFE7Ozs7Ozs7Ozs7OztBQWZaLElBQUlDLGVBQWUsQ0FBbkI7O0FBWUEsSUFBSUMsV0FBVyxLQUFmO0FBQ0EsSUFBSUMsa0JBQUo7QUFDQSxJQUFNQyxNQUFTQyxnQkFBTUMsS0FBTixDQUFZLFVBQVosQ0FBVCw4QkFBTjs7QUFFQTs7QUFFQSxJQUFNQyxlQUFlLFNBQWZBLFlB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LENBQWQsQ0FBUDtBQUFBLE9BRkg7QUFHTDtBQUhLLE9BSUpDLEdBSkksQ0FJQSxlQUFPO0FBQ1IsWUFBTUMsY0FBY3BILEtBQUtDLEtBQUwsQ0FBV0gsYUFBR0ksWUFBSCxDQUFnQnFELGVBQUtDLElBQUwsQ0FBVXVELFVBQVYsRUFBc0JHLEdBQXRCLEVBQTJCLGNBQTNCLENBQWhCLENBQVgsQ0FBcEI7QUFDQTtBQUNBLFlBQUdFLFlBQVl6QyxNQUFaLElBQXNCeUMsWUFBWXpDLE1BQVosQ0FBbUIwQyxJQUFuQixLQUE0QixPQUFyRCxFQUE4RDtBQUMxRCxpQkFBT0QsWUFBWXpDLE1BQVosQ0FBbUIzRCxJQUExQjtBQUNIO0FBQ0osT0FWSTtBQVdMO0FBWEssT0FZSmlHLE1BWkksQ0FZRztBQUFBLGVBQVFqRyxJQUFSO0FBQUEsT0FaSCxDQUFQO0FBYUQ7O0FBRUQ7Ozs7OztBQTdmRjtBQUFBO0FBQUEsdUNBa2dCcUI7QUFDakIsVUFBSTtBQUNGO0FBQ0EsZUFBT2lELFFBQVEsbUJBQVIsQ0FBUDtBQUNELE9BSEQsQ0FHRSxPQUFPdEIsQ0FBUCxFQUFVO0FBQ1Y7QUFDQSxlQUFPLFFBQVA7QUFDRDtBQUNGO0FBMWdCSDs7QUFBQTtBQUFBOztBQXNoQlE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFJUjtBQUNJO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNKOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImluZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xudmFyIHJlYWN0VmVyc2lvbiA9IDBcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgY2pzb24gZnJvbSAnY2pzb24nO1xuaW1wb3J0IHsgc3luYyBhcyBta2RpcnAgfSBmcm9tICdta2RpcnAnO1xuaW1wb3J0IGV4dHJhY3RGcm9tSlNYIGZyb20gJy4vZXh0cmFjdEZyb21KU1gnO1xuaW1wb3J0IHsgc3luYyBhcyByaW1yYWYgfSBmcm9tICdyaW1yYWYnO1xuaW1wb3J0IHsgYnVpbGRYTUwsIGNyZWF0ZUFwcEpzb24sIGNyZWF0ZVdvcmtzcGFjZUpzb24sIGNyZWF0ZUpTRE9NRW52aXJvbm1lbnQgfSBmcm9tICcuL2FydGlmYWN0cyc7XG5pbXBvcnQgeyBleGVjU3luYywgc3Bhd24sIGZvcmsgfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCB7IGdlbmVyYXRlIH0gZnJvbSAnYXN0cmluZyc7XG5pbXBvcnQgeyBzeW5jIGFzIHJlc29sdmUgfSBmcm9tICdyZXNvbHZlJztcbmxldCB3YXRjaGluZyA9IGZhbHNlO1xubGV0IGNtZEVycm9ycztcbmNvbnN0IGFwcCA9IGAke2NoYWxrLmdyZWVuKCfihLkg772iZXh0772jOicpfSByZWFjdG9yLXdlYnBhY2stcGx1Z2luOiBgO1xuaW1wb3J0ICogYXMgcmVhZGxpbmUgZnJvbSAncmVhZGxpbmUnXG4vL2NvbnN0IHV0aWwgPSByZXF1aXJlKCcuL3V0aWwuanMnKVxuXG5jb25zdCBnYXRoZXJFcnJvcnMgPSAoY21kKSA9PiB7XG4gIGlmIChjbWQuc3Rkb3V0KSB7XG4gICAgY21kLnN0ZG91dC5vbignZGF0YScsIGRhdGEgPT4ge1xuICAgICAgY29uc3QgbWVzc2FnZSA9IGRhdGEudG9TdHJpbmcoKTtcbiAgICAgIGlmIChtZXNzYWdlLm1hdGNoKC9eXFxbRVJSXFxdLykpIHtcbiAgICAgICAgY21kRXJyb3JzLnB1c2gobWVzc2FnZS5yZXBsYWNlKC9eXFxbRVJSXFxdIC9naSwgJycpKTtcbiAgICAgIH1cbiAgICB9KVxuICB9XG4gIHJldHVybiBjbWQ7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgUmVhY3RFeHRKU1dlYnBhY2tQbHVnaW4ge1xuICAvKipcbiAgICogQHBhcmFtIHtPYmplY3RbXX0gYnVpbGRzXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gW2RlYnVnPWZhbHNlXSBTZXQgdG8gdHJ1ZSB0byBwcmV2ZW50IGNsZWFudXAgb2YgYnVpbGQgdGVtcG9yYXJ5IGJ1aWxkIGFydGlmYWN0cyB0aGF0IG1pZ2h0IGJlIGhlbHBmdWwgaW4gdHJvdWJsZXNob290aW5nIGlzc3Vlcy5cbiAgICogQHBhcmFtIHtTdHJpbmd9IHNkayBUaGUgZnVsbCBwYXRoIHRvIHRoZSBFeHRSZWFjdCBTREtcbiAgICogQHBhcmFtIHtTdHJpbmd9IFt0b29sa2l0PSdtb2Rlcm4nXSBcIm1vZGVyblwiIG9yIFwiY2xhc3NpY1wiXG4gICAqIEBwYXJhbSB7U3RyaW5nfSB0aGVtZSBUaGUgbmFtZSBvZiB0aGUgRXh0UmVhY3QgdGhlbWUgcGFja2FnZSB0byB1c2UsIGZvciBleGFtcGxlIFwidGhlbWUtbWF0ZXJpYWxcIlxuICAgKiBAcGFyYW0ge1N0cmluZ1tdfSBwYWNrYWdlcyBBbiBhcnJheSBvZiBFeHRSZWFjdCBwYWNrYWdlcyB0byBpbmNsdWRlXG4gICAqIEBwYXJhbSB7U3RyaW5nW119IG92ZXJyaWRlcyBBbiBhcnJheSB3aXRoIHRoZSBwYXRocyBvZiBkaXJlY3RvcmllcyBvciBmaWxlcyB0byBzZWFyY2guIEFueSBjbGFzc2VzXG4gICAqIGRlY2xhcmVkIGluIHRoZXNlIGxvY2F0aW9ucyB3aWxsIGJlIGF1dG9tYXRpY2FsbHkgcmVxdWlyZWQgYW5kIGluY2x1ZGVkIGluIHRoZSBidWlsZC5cbiAgICogSWYgYW55IGZpbGUgZGVmaW5lcyBhbiBFeHRSZWFjdCBvdmVycmlkZSAodXNpbmcgRXh0LmRlZmluZSB3aXRoIGFuIFwib3ZlcnJpZGVcIiBwcm9wZXJ0eSksXG4gICAqIHRoYXQgb3ZlcnJpZGUgd2lsbCBpbiBmYWN0IG9ubHkgYmUgaW5jbHVkZWQgaW4gdGhlIGJ1aWxkIGlmIHRoZSB0YXJnZXQgY2xhc3Mgc3BlY2lmaWVkXG4gICAqIGluIHRoZSBcIm92ZXJyaWRlXCIgcHJvcGVydHkgaXMgYWxzbyBpbmNsdWRlZC5cbiAgICogQHBhcmFtIHtTdHJpbmd9IG91dHB1dCBUaGUgcGF0aCB0byBkaXJlY3Rvcnkgd2hlcmUgdGhlIEV4dFJlYWN0IGJ1bmRsZSBzaG91bGQgYmUgd3JpdHRlblxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IGFzeW5jaHJvbm91cyBTZXQgdG8gdHJ1ZSB0byBydW4gU2VuY2hhIENtZCBidWlsZHMgYXN5bmNocm9ub3VzbHkuIFRoaXMgbWFrZXMgdGhlIHdlYnBhY2sgYnVpbGQgZmluaXNoIG11Y2ggZmFzdGVyLCBidXQgdGhlIGFwcCBtYXkgbm90IGxvYWQgY29ycmVjdGx5IGluIHlvdXIgYnJvd3NlciB1bnRpbCBTZW5jaGEgQ21kIGlzIGZpbmlzaGVkIGJ1aWxkaW5nIHRoZSBFeHRSZWFjdCBidW5kbGVcbiAgICogQHBhcmFtIHtCb29sZWFufSBwcm9kdWN0aW9uIFNldCB0byB0cnVlIGZvciBwcm9kdWN0aW9uIGJ1aWxkcy4gIFRoaXMgdGVsbCBTZW5jaGEgQ21kIHRvIGNvbXByZXNzIHRoZSBnZW5lcmF0ZWQgSlMgYnVuZGxlLlxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IHRyZWVTaGFraW5nIFNldCB0byBmYWxzZSB0byBkaXNhYmxlIHRyZWUgc2hha2luZyBpbiBkZXZlbG9wbWVudCBidWlsZHMuICBUaGlzIG1ha2VzIGluY3JlbWVudGFsIHJlYnVpbGRzIGZhc3RlciBhcyBhbGwgRXh0UmVhY3QgY29tcG9uZW50cyBhcmUgaW5jbHVkZWQgaW4gdGhlIGV4dC5qcyBidW5kbGUgaW4gdGhlIGluaXRpYWwgYnVpbGQgYW5kIHRodXMgdGhlIGJ1bmRsZSBkb2VzIG5vdCBuZWVkIHRvIGJlIHJlYnVpbHQgYWZ0ZXIgZWFjaCBjaGFuZ2UuIERlZmF1bHRzIHRvIHRydWUuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihvcHRpb25zKSB7XG4gICAgdGhpcy5jb3VudCA9IDBcbiAgICAvL2NhbiBiZSBpbiBkZXZkZXBlbmRlbmNpZXMgLSBhY2NvdW50IGZvciB0aGlzOiByZWFjdDogXCIxNS4xNi4wXCJcbiAgICB2YXIgcGtnID0gKGZzLmV4aXN0c1N5bmMoJ3BhY2thZ2UuanNvbicpICYmIEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKCdwYWNrYWdlLmpzb24nLCAndXRmLTgnKSkgfHwge30pO1xuICAgIHZhciByZWFjdEVudHJ5ID0gcGtnLmRlcGVuZGVuY2llcy5yZWFjdFxuICAgIHZhciBpczE2ID0gcmVhY3RFbnRyeS5pbmNsdWRlcyhcIjE2XCIpO1xuICAgIGlmIChpczE2KSB7IHJlYWN0VmVyc2lvbiA9IDE2IH1cbiAgICBlbHNlIHsgcmVhY3RWZXJzaW9uID0gMTUgfVxuICAgIHRoaXMucmVhY3RWZXJzaW9uID0gcmVhY3RWZXJzaW9uXG4gICAgY29uc3QgZXh0UmVhY3RSYyA9IChmcy5leGlzdHNTeW5jKCcuZXh0LXJlYWN0cmMnKSAmJiBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYygnLmV4dC1yZWFjdHJjJywgJ3V0Zi04JykpIHx8IHt9KTtcbiAgICBvcHRpb25zID0geyAuLi50aGlzLmdldERlZmF1bHRPcHRpb25zKCksIC4uLm9wdGlvbnMsIC4uLmV4dFJlYWN0UmMgfTtcbiAgICBjb25zdCB7IGJ1aWxkcyB9ID0gb3B0aW9ucztcbiAgICBpZiAoT2JqZWN0LmtleXMoYnVpbGRzKS5sZW5ndGggPT09IDApIHtcbiAgICAgIGNvbnN0IHsgYnVpbGRzLCAuLi5idWlsZE9wdGlvbnMgfSA9IG9wdGlvbnM7XG4gICAgICBidWlsZHMuZXh0ID0gYnVpbGRPcHRpb25zO1xuICAgIH1cbiAgICBmb3IgKGxldCBuYW1lIGluIGJ1aWxkcylcbiAgICAgIHRoaXMuX3ZhbGlkYXRlQnVpbGRDb25maWcobmFtZSwgYnVpbGRzW25hbWVdKTtcbiAgICBPYmplY3QuYXNzaWduKHRoaXMsIHtcbiAgICAgIC4uLm9wdGlvbnMsXG4gICAgICBjdXJyZW50RmlsZTogbnVsbCxcbiAgICAgIG1hbmlmZXN0OiBudWxsLFxuICAgICAgZGVwZW5kZW5jaWVzOiBbXVxuICAgIH0pO1xuICB9XG5cbiAgd2F0Y2hSdW4oKSB7XG4gICAgdGhpcy53YXRjaCA9IHRydWVcbiAgfVxuXG4gIGFwcGx5KGNvbXBpbGVyKSB7XG4gICAgaWYgKHRoaXMud2VicGFja1ZlcnNpb24gPT0gdW5kZWZpbmVkKSB7XG4gICAgICBjb25zdCBpc1dlYnBhY2s0ID0gY29tcGlsZXIuaG9va3M7XG4gICAgICBpZiAoaXNXZWJwYWNrNCkge3RoaXMud2VicGFja1ZlcnNpb24gPSAnSVMgd2VicGFjayA0J31cbiAgICAgIGVsc2Uge3RoaXMud2VicGFja1ZlcnNpb24gPSAnTk9UIHdlYnBhY2sgNCd9XG4gICAgICByZWFkbGluZS5jdXJzb3JUbyhwcm9jZXNzLnN0ZG91dCwgMCk7Y29uc29sZS5sb2coYXBwICsgJ3JlYWN0VmVyc2lvbjogJyArIHRoaXMucmVhY3RWZXJzaW9uICsgJywgJyArIHRoaXMud2VicGFja1ZlcnNpb24pXG4gICAgfVxuICAgIGNvbnN0IG1lID0gdGhpcztcblxuICAgIGlmIChjb21waWxlci5ob29rcykge1xuICAgICAgaWYgKHRoaXMuYXN5bmNocm9ub3VzKSB7XG4gICAgICAgIGNvbXBpbGVyLmhvb2tzLndhdGNoUnVuLnRhcEFzeW5jKCdleHRyZWFjdC13YXRjaC1ydW4gKGFzeW5jKScsICh3YXRjaGluZywgY2IpID0+IHtcbiAgICAgICAgICByZWFkbGluZS5jdXJzb3JUbyhwcm9jZXNzLnN0ZG91dCwgMCk7Y29uc29sZS5sb2coYXBwICsgJ2V4dHJlYWN0LXdhdGNoLXJ1biAoYXN5bmMpJylcbiAgICAgICAgICB0aGlzLndhdGNoUnVuKClcbiAgICAgICAgICBjYigpXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgY29tcGlsZXIuaG9va3Mud2F0Y2hSdW4udGFwKCdleHRyZWFjdC13YXRjaC1ydW4nLCAod2F0Y2hpbmcpID0+IHtcbiAgICAgICAgICByZWFkbGluZS5jdXJzb3JUbyhwcm9jZXNzLnN0ZG91dCwgMCk7Y29uc29sZS5sb2coYXBwICsgJ2V4dHJlYWN0LXdhdGNoLXJ1bicpXG4gICAgICAgICAgdGhpcy53YXRjaFJ1bigpXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgY29tcGlsZXIucGx1Z2luKCd3YXRjaC1ydW4nLCAod2F0Y2hpbmcsIGNiKSA9PiB7XG4gICAgICAgIHJlYWRsaW5lLmN1cnNvclRvKHByb2Nlc3Muc3Rkb3V0LCAwKTtjb25zb2xlLmxvZyhhcHAgKyAnd2F0Y2gtcnVuJylcbiAgICAgICAgdGhpcy53YXRjaFJ1bigpXG4gICAgICAgIGNiKClcbiAgICAgIH0pXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQWRkcyB0aGUgY29kZSBmb3IgdGhlIHNwZWNpZmllZCBmdW5jdGlvbiBjYWxsIHRvIHRoZSBtYW5pZmVzdC5qcyBmaWxlXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGNhbGwgQSBmdW5jdGlvbiBjYWxsIEFTVCBub2RlLlxuICAgICAqL1xuICAgIGNvbnN0IGFkZFRvTWFuaWZlc3QgPSBmdW5jdGlvbihjYWxsKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBmaWxlID0gdGhpcy5zdGF0ZS5tb2R1bGUucmVzb3VyY2U7XG4gICAgICAgIG1lLmRlcGVuZGVuY2llc1tmaWxlXSA9IFsgLi4uKG1lLmRlcGVuZGVuY2llc1tmaWxlXSB8fCBbXSksIGdlbmVyYXRlKGNhbGwpIF07XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIHByb2Nlc3NpbmcgJHtmaWxlfWApO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBpZiAoY29tcGlsZXIuaG9va3MpIHtcbiAgICAgIGNvbXBpbGVyLmhvb2tzLmNvbXBpbGF0aW9uLnRhcCgnZXh0cmVhY3QtY29tcGlsYXRpb24nLCAoY29tcGlsYXRpb24sZGF0YSkgPT4ge1xuICAgICAgICByZWFkbGluZS5jdXJzb3JUbyhwcm9jZXNzLnN0ZG91dCwgMCk7Y29uc29sZS5sb2coYXBwICsgJ2V4dHJlYWN0LWNvbXBpbGF0aW9uJylcbiAgICAgICAgY29tcGlsYXRpb24uaG9va3Muc3VjY2VlZE1vZHVsZS50YXAoJ2V4dHJlYWN0LXN1Y2NlZWQtbW9kdWxlJywgKG1vZHVsZSkgPT4ge1xuICAgICAgICAgIHRoaXMuc3VjY2VlZE1vZHVsZShjb21waWxhdGlvbiwgbW9kdWxlKVxuICAgICAgICB9KVxuXG4gICAgICAgIGRhdGEubm9ybWFsTW9kdWxlRmFjdG9yeS5wbHVnaW4oXCJwYXJzZXJcIiwgZnVuY3Rpb24ocGFyc2VyLCBvcHRpb25zKSB7XG4gICAgICAgICAgLy8gZXh0cmFjdCB4dHlwZXMgYW5kIGNsYXNzZXMgZnJvbSBFeHQuY3JlYXRlIGNhbGxzXG4gICAgICAgICAgcGFyc2VyLnBsdWdpbignY2FsbCBFeHQuY3JlYXRlJywgYWRkVG9NYW5pZmVzdCk7XG4gICAgICAgICAgLy8gY29weSBFeHQucmVxdWlyZSBjYWxscyB0byB0aGUgbWFuaWZlc3QuICBUaGlzIGFsbG93cyB0aGUgdXNlcnMgdG8gZXhwbGljaXRseSByZXF1aXJlIGEgY2xhc3MgaWYgdGhlIHBsdWdpbiBmYWlscyB0byBkZXRlY3QgaXQuXG4gICAgICAgICAgcGFyc2VyLnBsdWdpbignY2FsbCBFeHQucmVxdWlyZScsIGFkZFRvTWFuaWZlc3QpO1xuICAgICAgICAgIC8vIGNvcHkgRXh0LmRlZmluZSBjYWxscyB0byB0aGUgbWFuaWZlc3QuICBUaGlzIGFsbG93cyB1c2VycyB0byB3cml0ZSBzdGFuZGFyZCBFeHRSZWFjdCBjbGFzc2VzLlxuICAgICAgICAgIHBhcnNlci5wbHVnaW4oJ2NhbGwgRXh0LmRlZmluZScsIGFkZFRvTWFuaWZlc3QpO1xuICAgICAgICB9KVxuICAgICAgfSlcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBjb21waWxlci5wbHVnaW4oJ2NvbXBpbGF0aW9uJywgKGNvbXBpbGF0aW9uLCBkYXRhKSA9PiB7XG4gICAgICAgIHJlYWRsaW5lLmN1cnNvclRvKHByb2Nlc3Muc3Rkb3V0LCAwKTtjb25zb2xlLmxvZyhhcHAgKyAnY29tcGlsYXRpb24nKVxuICAgICAgICBjb21waWxhdGlvbi5wbHVnaW4oJ3N1Y2NlZWQtbW9kdWxlJywgKG1vZHVsZSkgPT4ge1xuICAgICAgICAgIHRoaXMuc3VjY2VlZE1vZHVsZShjb21waWxhdGlvbiwgbW9kdWxlKVxuICAgICAgICB9KVxuICAgICAgICBkYXRhLm5vcm1hbE1vZHVsZUZhY3RvcnkucGx1Z2luKFwicGFyc2VyXCIsIGZ1bmN0aW9uKHBhcnNlciwgb3B0aW9ucykge1xuICAgICAgICAgIC8vIGV4dHJhY3QgeHR5cGVzIGFuZCBjbGFzc2VzIGZyb20gRXh0LmNyZWF0ZSBjYWxsc1xuICAgICAgICAgIHBhcnNlci5wbHVnaW4oJ2NhbGwgRXh0LmNyZWF0ZScsIGFkZFRvTWFuaWZlc3QpO1xuICAgICAgICAgIC8vIGNvcHkgRXh0LnJlcXVpcmUgY2FsbHMgdG8gdGhlIG1hbmlmZXN0LiAgVGhpcyBhbGxvd3MgdGhlIHVzZXJzIHRvIGV4cGxpY2l0bHkgcmVxdWlyZSBhIGNsYXNzIGlmIHRoZSBwbHVnaW4gZmFpbHMgdG8gZGV0ZWN0IGl0LlxuICAgICAgICAgIHBhcnNlci5wbHVnaW4oJ2NhbGwgRXh0LnJlcXVpcmUnLCBhZGRUb01hbmlmZXN0KTtcbiAgICAgICAgICAvLyBjb3B5IEV4dC5kZWZpbmUgY2FsbHMgdG8gdGhlIG1hbmlmZXN0LiAgVGhpcyBhbGxvd3MgdXNlcnMgdG8gd3JpdGUgc3RhbmRhcmQgRXh0UmVhY3QgY2xhc3Nlcy5cbiAgICAgICAgICBwYXJzZXIucGx1Z2luKCdjYWxsIEV4dC5kZWZpbmUnLCBhZGRUb01hbmlmZXN0KTtcbiAgICAgICAgfSlcblxuICAgICAgfSlcbiAgICB9XG5cbi8vKmVtaXQgLSBvbmNlIGFsbCBtb2R1bGVzIGFyZSBwcm9jZXNzZWQsIGNyZWF0ZSB0aGUgb3B0aW1pemVkIEV4dFJlYWN0IGJ1aWxkLlxuICAgIGlmIChjb21waWxlci5ob29rcykge1xuICAgICAgaWYgKHRoaXMuYXN5bmNocm9ub3VzKSB7XG4gICAgICAgIGNvbXBpbGVyLmhvb2tzLmVtaXQudGFwQXN5bmMoJ2V4dHJlYWN0LWVtaXQgKGFzeW5jKScsIChjb21waWxhdGlvbiwgY2FsbGJhY2spID0+IHtcbiAgICAgICAgICByZWFkbGluZS5jdXJzb3JUbyhwcm9jZXNzLnN0ZG91dCwgMCk7Y29uc29sZS5sb2coYXBwICsgJ2V4dHJlYWN0LWVtaXQgIChhc3luYyknKVxuICAgICAgICAgIHRoaXMuZW1pdChjb21waWxlciwgY29tcGlsYXRpb24sIGNhbGxiYWNrKVxuICAgICAgICAgIGNvbnNvbGUubG9nKGFwcCArICdhZnRlciBleHRyZWFjdC1lbWl0ICAoYXN5bmMpJylcbiAgICAgICAgICBpZiAoY2FsbGJhY2sgIT0gbnVsbCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuYXN5bmNocm9ub3VzKSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdjYWxsaW5nIGNhbGxiYWNrJylcbiAgICAgICAgICAgICAgY2FsbGJhY2soKVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBjb21waWxlci5ob29rcy5lbWl0LnRhcCgnZXh0cmVhY3QtZW1pdCcsIChjb21waWxhdGlvbikgPT4ge1xuICAgICAgICAgIHJlYWRsaW5lLmN1cnNvclRvKHByb2Nlc3Muc3Rkb3V0LCAwKTtjb25zb2xlLmxvZyhhcHAgKyAnZXh0cmVhY3QtZW1pdCcpXG4gICAgICAgICAgdGhpcy5lbWl0KGNvbXBpbGVyLCBjb21waWxhdGlvbilcblxuICAgICAgICAgIC8vIGlmICh0aGlzLmNvdW50ID09IDApIHtcbiAgICAgICAgICAvLyAgIHRoaXMuY291bnQrK1xuICAgICAgICAgIC8vICAgY29uc3Qgb3BuID0gcmVxdWlyZSgnb3BuJylcbiAgICAgICAgICAvLyAgIG9wbignaHR0cDovL2xvY2FsaG9zdDonICsgdGhpcy5wb3J0KVxuICAgICAgICAgIC8vIH1cblxuICAgICAgICAgIGNvbnNvbGUubG9nKGFwcCArICdhZnRlciBleHRyZWFjdC1lbWl0JylcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBjb21waWxlci5wbHVnaW4oJ2VtaXQnLCAoY29tcGlsYXRpb24sIGNhbGxiYWNrKSA9PiB7XG4gICAgICAgIHJlYWRsaW5lLmN1cnNvclRvKHByb2Nlc3Muc3Rkb3V0LCAwKTtjb25zb2xlLmxvZyhhcHAgKyAnZW1pdCcpXG4gICAgICAgIHRoaXMuZW1pdChjb21waWxlciwgY29tcGlsYXRpb24sIGNhbGxiYWNrKVxuICAgICAgICBjYWxsYmFjaygpXG4gICAgICB9KVxuICAgIH1cblxuICAgIGlmIChjb21waWxlci5ob29rcykge1xuICAgICAgaWYgKHRoaXMuYXN5bmNocm9ub3VzKSB7XG4gICAgICAgIGNvbXBpbGVyLmhvb2tzLmRvbmUudGFwQXN5bmMoJ2V4dHJlYWN0LWRvbmUgKGFzeW5jKScsIChjb21waWxhdGlvbiwgY2FsbGJhY2spID0+IHtcbiAgICAgICAgICByZWFkbGluZS5jdXJzb3JUbyhwcm9jZXNzLnN0ZG91dCwgMCk7Y29uc29sZS5sb2coYXBwICsgJ2V4dHJlYWN0LWRvbmUgKGFzeW5jKScpXG4gICAgICAgICAgaWYgKGNhbGxiYWNrICE9IG51bGwpIFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmFzeW5jaHJvbm91cykgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdjYWxsaW5nIGNhbGxiYWNrIGZvciBleHRyZWFjdC1lbWl0ICAoYXN5bmMpJylcbiAgICAgICAgICAgICAgY2FsbGJhY2soKVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBjb21waWxlci5ob29rcy5kb25lLnRhcCgnZXh0cmVhY3QtZG9uZScsICgpID0+IHtcbiAgICAgICAgICByZWFkbGluZS5jdXJzb3JUbyhwcm9jZXNzLnN0ZG91dCwgMCk7Y29uc29sZS5sb2coYXBwICsgJ2V4dHJlYWN0LWRvbmUnKVxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGVtaXQoY29tcGlsZXIsIGNvbXBpbGF0aW9uLCBjYWxsYmFjaykge1xuICAgIHZhciBpc1dlYnBhY2s0ID0gY29tcGlsYXRpb24uaG9va3M7XG4gICAgdmFyIG1vZHVsZXMgPSBbXVxuICAgIGlmIChpc1dlYnBhY2s0KSB7XG4gICAgICBpc1dlYnBhY2s0ID0gdHJ1ZVxuICAgICAgLy9tb2R1bGVzID0gY29tcGlsYXRpb24uY2h1bmtzLnJlZHVjZSgoYSwgYikgPT4gYS5jb25jYXQoYi5fbW9kdWxlcyksIFtdKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBpc1dlYnBhY2s0ID0gZmFsc2VcbiAgICAgIC8vbW9kdWxlcyA9IGNvbXBpbGF0aW9uLmNodW5rcy5yZWR1Y2UoKGEsIGIpID0+IGEuY29uY2F0KGIubW9kdWxlcyksIFtdKTtcbiAgICB9XG4gICAgY29uc3QgYnVpbGQgPSB0aGlzLmJ1aWxkc1tPYmplY3Qua2V5cyh0aGlzLmJ1aWxkcylbMF1dO1xuICAgIGxldCBvdXRwdXRQYXRoID0gcGF0aC5qb2luKGNvbXBpbGVyLm91dHB1dFBhdGgsIHRoaXMub3V0cHV0KTtcbiAgICAvLyB3ZWJwYWNrLWRldi1zZXJ2ZXIgb3ZlcndyaXRlcyB0aGUgb3V0cHV0UGF0aCB0byBcIi9cIiwgc28gd2UgbmVlZCB0byBwcmVwZW5kIGNvbnRlbnRCYXNlXG4gICAgaWYgKGNvbXBpbGVyLm91dHB1dFBhdGggPT09ICcvJyAmJiBjb21waWxlci5vcHRpb25zLmRldlNlcnZlcikge1xuICAgICAgb3V0cHV0UGF0aCA9IHBhdGguam9pbihjb21waWxlci5vcHRpb25zLmRldlNlcnZlci5jb250ZW50QmFzZSwgb3V0cHV0UGF0aCk7XG4gICAgfVxuICAgIC8vY29uc29sZS5sb2coJ1xcbioqKioqb3V0cHV0UGF0aDogJyArIG91dHB1dFBhdGgpXG5cbiAgICB0aGlzLl9idWlsZEV4dEJ1bmRsZShpc1dlYnBhY2s0LCAnbm90JywgbW9kdWxlcywgb3V0cHV0UGF0aCwgYnVpbGQsIGNhbGxiYWNrKVxuICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICBpZiAodGhpcy5jb3VudCA9PSAwKSB7XG4gICAgICAgICAgdmFyIHVybCA9ICdodHRwOi8vbG9jYWxob3N0OicgKyB0aGlzLnBvcnRcbiAgICAgICAgICByZWFkbGluZS5jdXJzb3JUbyhwcm9jZXNzLnN0ZG91dCwgMCk7Y29uc29sZS5sb2coYXBwICsgJ2V4dHJlYWN0LWVtaXQgLSBvcGVuIGJyb3dzZXIgYXQgJyArIHVybClcbiAgICAgICAgICB0aGlzLmNvdW50KytcbiAgICAgICAgICBjb25zdCBvcG4gPSByZXF1aXJlKCdvcG4nKVxuICAgICAgICAgIG9wbih1cmwpXG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNhbGxiYWNrICE9IG51bGwpe2lmICh0aGlzLmFzeW5jaHJvbm91cyl7Y2FsbGJhY2soKX19XG4gICAgICB9KVxuICAgICAgLmNhdGNoKGUgPT4ge1xuICAgICAgICAvL2NvbnNvbGUubG9nKGUpXG4gICAgICAgIGNvbXBpbGF0aW9uLmVycm9ycy5wdXNoKG5ldyBFcnJvcignW0BleHRqcy9yZWFjdG9yLXdlYnBhY2stcGx1Z2luXTogJyArIGUudG9TdHJpbmcoKSkpO1xuICAgICAgICAvLyF0aGlzLmFzeW5jaHJvbm91cyAmJiBjYWxsYmFjaygpO1xuLy8gICAgICAgIGNvbnNvbGUubG9nKGNhbGxiYWNrKVxuICAgICAgICBpZiAoY2FsbGJhY2sgIT0gbnVsbCkgXG4gICAgICAgIHtcbiAgICAgICAgICBpZiAoIXRoaXMuYXN5bmNocm9ub3VzKSBcbiAgICAgICAgICB7XG4gICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSlcbiAgfVxuXG4gIC8qKlxuICAgLyoqXG4gICAgKiBCdWlsZHMgYSBtaW5pbWFsIHZlcnNpb24gb2YgdGhlIEV4dFJlYWN0IGZyYW1ld29yayBiYXNlZCBvbiB0aGUgY2xhc3NlcyB1c2VkXG4gICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBUaGUgbmFtZSBvZiB0aGUgYnVpbGRcbiAgICAqIEBwYXJhbSB7TW9kdWxlW119IG1vZHVsZXMgd2VicGFjayBtb2R1bGVzXG4gICAgKiBAcGFyYW0ge1N0cmluZ30gb3V0cHV0IFRoZSBwYXRoIHRvIHdoZXJlIHRoZSBmcmFtZXdvcmsgYnVpbGQgc2hvdWxkIGJlIHdyaXR0ZW5cbiAgICAqIEBwYXJhbSB7U3RyaW5nfSBbdG9vbGtpdD0nbW9kZXJuJ10gXCJtb2Rlcm5cIiBvciBcImNsYXNzaWNcIlxuICAgICogQHBhcmFtIHtTdHJpbmd9IG91dHB1dCBUaGUgcGF0aCB0byB0aGUgZGlyZWN0b3J5IHRvIGNyZWF0ZSB3aGljaCB3aWxsIGNvbnRhaW4gdGhlIGpzIGFuZCBjc3MgYnVuZGxlc1xuICAgICogQHBhcmFtIHtTdHJpbmd9IHRoZW1lIFRoZSBuYW1lIG9mIHRoZSBFeHRSZWFjdCB0aGVtZSBwYWNrYWdlIHRvIHVzZSwgZm9yIGV4YW1wbGUgXCJ0aGVtZS1tYXRlcmlhbFwiXG4gICAgKiBAcGFyYW0ge1N0cmluZ1tdfSBwYWNrYWdlcyBBbiBhcnJheSBvZiBFeHRSZWFjdCBwYWNrYWdlcyB0byBpbmNsdWRlXG4gICAgKiBAcGFyYW0ge1N0cmluZ1tdfSBwYWNrYWdlRGlycyBEaXJlY3RvcmllcyBjb250YWluaW5nIHBhY2thZ2VzXG4gICAgKiBAcGFyYW0ge1N0cmluZ1tdfSBvdmVycmlkZXMgQW4gYXJyYXkgb2YgbG9jYXRpb25zIGZvciBvdmVycmlkZXNcbiAgICAqIEBwYXJhbSB7U3RyaW5nfSBzZGsgVGhlIGZ1bGwgcGF0aCB0byB0aGUgRXh0UmVhY3QgU0RLXG4gICAgKiBAcHJpdmF0ZVxuICAgICovXG4gIF9idWlsZEV4dEJ1bmRsZShpc1dlYnBhY2s0LCBuYW1lLCBtb2R1bGVzLCBvdXRwdXQsIHsgdG9vbGtpdD0nbW9kZXJuJywgdGhlbWUsIHBhY2thZ2VzPVtdLCBwYWNrYWdlRGlycz1bXSwgc2RrLCBvdmVycmlkZXMsIGNhbGxiYWNrfSkge1xuICAgIGxldCBzZW5jaGEgPSB0aGlzLl9nZXRTZW5jaENtZFBhdGgoKTtcbiAgICB0aGVtZSA9IHRoZW1lIHx8ICh0b29sa2l0ID09PSAnY2xhc3NpYycgPyAndGhlbWUtdHJpdG9uJyA6ICd0aGVtZS1tYXRlcmlhbCcpO1xuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIHRoaXMub25CdWlsZEZhaWwgPSByZWplY3Q7XG4gICAgICB0aGlzLm9uQnVpbGRTdWNjZXNzID0gcmVzb2x2ZTtcbiAgICAgIGNtZEVycm9ycyA9IFtdO1xuICAgICAgXG4gICAgICBjb25zdCBvbkJ1aWxkRG9uZSA9ICgpID0+IHtcbiAgICAgICAgaWYgKGNtZEVycm9ycy5sZW5ndGgpIHtcbiAgICAgICAgICB0aGlzLm9uQnVpbGRGYWlsKG5ldyBFcnJvcihjbWRFcnJvcnMuam9pbihcIlwiKSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMub25CdWlsZFN1Y2Nlc3MoKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoIXdhdGNoaW5nKSB7XG4gICAgICAgIHJpbXJhZihvdXRwdXQpO1xuICAgICAgICBta2RpcnAob3V0cHV0KTtcbiAgICAgIH1cblxuICAgICAgbGV0IGpzO1xuICAgICAgaWYgKHRoaXMudHJlZVNoYWtpbmcpIHtcbiAgICAgICAgbGV0IHN0YXRlbWVudHMgPSBbJ0V4dC5yZXF1aXJlKFtcIkV4dC5hcHAuQXBwbGljYXRpb25cIiwgXCJFeHQuQ29tcG9uZW50XCIsIFwiRXh0LldpZGdldFwiLCBcIkV4dC5sYXlvdXQuRml0XCJdKSddOyAvLyBmb3Igc29tZSByZWFzb24gY29tbWFuZCBkb2Vzbid0IGxvYWQgY29tcG9uZW50IHdoZW4gb25seSBwYW5lbCBpcyByZXF1aXJlZFxuICAgICAgICBpZiAocGFja2FnZXMuaW5kZXhPZigncmVhY3RvcicpICE9PSAtMSkge1xuICAgICAgICAgIHN0YXRlbWVudHMucHVzaCgnRXh0LnJlcXVpcmUoXCJFeHQucmVhY3Rvci5SZW5kZXJlckNlbGxcIiknKTtcbiAgICAgICAgfVxuICAgICAgICAvL21qZ1xuICAgICAgICBmb3IgKGxldCBtb2R1bGUgb2YgbW9kdWxlcykge1xuICAgICAgICAgIGNvbnN0IGRlcHMgPSB0aGlzLmRlcGVuZGVuY2llc1ttb2R1bGUucmVzb3VyY2VdO1xuICAgICAgICAgIGlmIChkZXBzKSBzdGF0ZW1lbnRzID0gc3RhdGVtZW50cy5jb25jYXQoZGVwcyk7XG4gICAgICAgIH1cbiAgICAgICAganMgPSBzdGF0ZW1lbnRzLmpvaW4oJztcXG4nKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGpzID0gJ0V4dC5yZXF1aXJlKFwiRXh0LipcIiknO1xuICAgICAgfVxuICAgICAgY29uc3QgbWFuaWZlc3QgPSBwYXRoLmpvaW4ob3V0cHV0LCAnbWFuaWZlc3QuanMnKTtcbiAgICAgIC8vIGFkZCBleHQtcmVhY3QvcGFja2FnZXMgYXV0b21hdGljYWxseSBpZiBwcmVzZW50XG4gICAgICBjb25zdCB1c2VyUGFja2FnZXMgPSBwYXRoLmpvaW4oJy4nLCAnZXh0LXJlYWN0JywgJ3BhY2thZ2VzJyk7XG4gICAgICBpZiAoZnMuZXhpc3RzU3luYyh1c2VyUGFja2FnZXMpKSB7XG4gICAgICAgIHBhY2thZ2VEaXJzLnB1c2godXNlclBhY2thZ2VzKVxuICAgICAgfVxuXG4gICAgICBpZiAoZnMuZXhpc3RzU3luYyhwYXRoLmpvaW4oc2RrLCAnZXh0JykpKSB7XG4gICAgICAgIC8vIGxvY2FsIGNoZWNrb3V0IG9mIHRoZSBTREsgcmVwb1xuICAgICAgICBwYWNrYWdlRGlycy5wdXNoKHBhdGguam9pbignZXh0JywgJ3BhY2thZ2VzJykpO1xuICAgICAgICBzZGsgPSBwYXRoLmpvaW4oc2RrLCAnZXh0Jyk7XG4gICAgICB9XG4gICAgICBpZiAoIXdhdGNoaW5nKSB7XG4gICAgICAgIGZzLndyaXRlRmlsZVN5bmMocGF0aC5qb2luKG91dHB1dCwgJ2J1aWxkLnhtbCcpLCBidWlsZFhNTCh7IGNvbXByZXNzOiB0aGlzLnByb2R1Y3Rpb24gfSksICd1dGY4Jyk7XG4gICAgICAgIGZzLndyaXRlRmlsZVN5bmMocGF0aC5qb2luKG91dHB1dCwgJ2pzZG9tLWVudmlyb25tZW50LmpzJyksIGNyZWF0ZUpTRE9NRW52aXJvbm1lbnQoKSwgJ3V0ZjgnKTtcbiAgICAgICAgZnMud3JpdGVGaWxlU3luYyhwYXRoLmpvaW4ob3V0cHV0LCAnYXBwLmpzb24nKSwgY3JlYXRlQXBwSnNvbih7IHRoZW1lLCBwYWNrYWdlcywgdG9vbGtpdCwgb3ZlcnJpZGVzLCBwYWNrYWdlRGlycyB9KSwgJ3V0ZjgnKTtcbiAgICAgICAgZnMud3JpdGVGaWxlU3luYyhwYXRoLmpvaW4ob3V0cHV0LCAnd29ya3NwYWNlLmpzb24nKSwgY3JlYXRlV29ya3NwYWNlSnNvbihzZGssIHBhY2thZ2VEaXJzLCBvdXRwdXQpLCAndXRmOCcpO1xuICAgICAgfVxuICAgICAgbGV0IGNtZFJlYnVpbGROZWVkZWQgPSBmYWxzZTtcbiAgICAgIGlmICh0aGlzLm1hbmlmZXN0ID09PSBudWxsIHx8IGpzICE9PSB0aGlzLm1hbmlmZXN0KSB7XG4gICAgICAgIC8vIE9ubHkgd3JpdGUgbWFuaWZlc3QgaWYgaXQgZGlmZmVycyBmcm9tIHRoZSBsYXN0IHJ1bi4gIFRoaXMgcHJldmVudHMgdW5uZWNlc3NhcnkgY21kIHJlYnVpbGRzLlxuICAgICAgICB0aGlzLm1hbmlmZXN0ID0ganM7XG4gICAgICAgIC8vcmVhZGxpbmUuY3Vyc29yVG8ocHJvY2Vzcy5zdGRvdXQsIDApO2NvbnNvbGUubG9nKGFwcCArIGpzKVxuICAgICAgICByZWFkbGluZS5jdXJzb3JUbyhwcm9jZXNzLnN0ZG91dCwgMCk7Y29uc29sZS5sb2coYXBwICsgJ3RyZWUgc2hha2luZzogJyArIHRoaXMudHJlZVNoYWtpbmcpXG4gICAgICAgIGZzLndyaXRlRmlsZVN5bmMobWFuaWZlc3QsIGpzLCAndXRmOCcpO1xuICAgICAgICBjbWRSZWJ1aWxkTmVlZGVkID0gdHJ1ZTtcbiAgICAgICAgcmVhZGxpbmUuY3Vyc29yVG8ocHJvY2Vzcy5zdGRvdXQsIDApO2NvbnNvbGUubG9nKGFwcCArIGBidWlsZGluZyBFeHRSZWFjdCBidW5kbGUgYXQ6ICR7b3V0cHV0fWApXG4gICAgICB9XG5cblxuIC8vICAgICBjb25zb2xlLmxvZyhpc1dlYnBhY2s0KVxuXG4gICAgICAvLyBpZiAoaXNXZWJwYWNrNCkge1xuICAgICAgLy8gICBpZiAodGhpcy53YXRjaCkge1xuICAgICAgLy8gICAgIGlmICghd2F0Y2hpbmcpIHtcbiAgICAgIC8vICAgICAgIC8vIHdhdGNoaW5nID0gZ2F0aGVyRXJyb3JzKGZvcmsoc2VuY2hhLCBbJ2FudCcsICd3YXRjaCddLCB7IGN3ZDogb3V0cHV0LCBzaWxlbnQ6IHRydWUgfSkpO1xuICAgICAgLy8gICAgICAgLy8gLy92YXIgcGFybXMgPSBbJ2FudCcsJ3dhdGNoJ11cbiAgICAgIC8vICAgICAgIC8vIC8vYXdhaXQgdXRpbC5zZW5jaGFDbWRBc3luYyhwYXJtcywgJ3llcycpXG4gICAgICAvLyAgICAgICAvLyAvL3Jlc29sdmUoMCk7XG4gICAgICAgICAgICBcbiAgICAgIC8vICAgICAgIC8vIGNvbnNvbGUubG9nKCdhZnRlciBmb3JrJylcbiAgICAgIC8vICAgICAgIC8vIHdhdGNoaW5nLnN0ZGVyci5waXBlKHByb2Nlc3Muc3RkZXJyKTtcbiAgICAgIC8vICAgICAgIC8vIHdhdGNoaW5nLnN0ZG91dC5waXBlKHByb2Nlc3Muc3Rkb3V0KTtcbiAgICAgIC8vICAgICAgIC8vIHdhdGNoaW5nLnN0ZG91dC5vbignZGF0YScsIGRhdGEgPT4ge1xuICAgICAgLy8gICAgICAgLy8gICBpZiAoZGF0YSAmJiBkYXRhLnRvU3RyaW5nKCkubWF0Y2goL1dhaXRpbmcgZm9yIGNoYW5nZXNcXC5cXC5cXC4vKSkge1xuICAgICAgLy8gICAgICAgLy8gICAgIG9uQnVpbGREb25lKClcbiAgICAgIC8vICAgICAgIC8vICAgfVxuICAgICAgLy8gICAgICAgLy8gfSlcbiAgICAgIC8vICAgICAgIC8vIHdhdGNoaW5nLm9uKCdleGl0Jywgb25CdWlsZERvbmUpXG4gICAgICAvLyAgICAgICBjb25zdCBzcGF3blN5bmMgPSByZXF1aXJlKCdjaGlsZF9wcm9jZXNzJykuc3Bhd25TeW5jXG4gICAgICAvLyAgICAgICBzcGF3blN5bmMoc2VuY2hhLCBbJ2FudCcsICd3YXRjaCddLCB7IGN3ZDogb3V0cHV0LCBzdGRpbzogJ2luaGVyaXQnLCBlbmNvZGluZzogJ3V0Zi04J30pXG4gICAgICAvLyAgICAgICBvbkJ1aWxkRG9uZSgpXG4gICAgICAvLyAgICAgfVxuICAgICAgLy8gICAgIGlmICghY21kUmVidWlsZE5lZWRlZCkgb25CdWlsZERvbmUoKTtcbiAgICAgIC8vICAgfVxuICAgICAgLy8gICBlbHNlIHtcbiAgICAgIC8vICAgICBjb25zb2xlLmxvZygnYycpXG4gICAgICAvLyAgICAgY29uc3Qgc3Bhd25TeW5jID0gcmVxdWlyZSgnY2hpbGRfcHJvY2VzcycpLnNwYXduU3luY1xuICAgICAgLy8gICAgIHNwYXduU3luYyhzZW5jaGEsIFsnYW50JywgJ2J1aWxkJ10sIHsgY3dkOiBvdXRwdXQsIHN0ZGlvOiAnaW5oZXJpdCcsIGVuY29kaW5nOiAndXRmLTgnfSlcbiAgICAgIC8vICAgICBvbkJ1aWxkRG9uZSgpXG4gICAgICAvLyAgIH1cbiAgICAgIC8vIH1cblxuICAgICAgLy9pZiAoIWlzV2VicGFjazQpIHtcbiAgICAgICAgaWYgKHRoaXMud2F0Y2gpIHtcbiAgICAgICAgICBpZiAoIXdhdGNoaW5nKSB7XG4gICAgICAgICAgICB3YXRjaGluZyA9IGdhdGhlckVycm9ycyhmb3JrKHNlbmNoYSwgWydhbnQnLCAnd2F0Y2gnXSwgeyBjd2Q6IG91dHB1dCwgc2lsZW50OiB0cnVlIH0pKTtcbiAgICAgICAgICAgIHJlYWRsaW5lLmN1cnNvclRvKHByb2Nlc3Muc3Rkb3V0LCAwKTtjb25zb2xlLmxvZyhhcHAgKyAnc2VuY2hhIGFudCB3YXRjaCcpXG4gICAgICAgICAgICB3YXRjaGluZy5zdGRlcnIucGlwZShwcm9jZXNzLnN0ZGVycik7XG4gICAgICAgICAgICB3YXRjaGluZy5zdGRvdXQucGlwZShwcm9jZXNzLnN0ZG91dCk7XG4gICAgICAgICAgICB3YXRjaGluZy5zdGRvdXQub24oJ2RhdGEnLCBkYXRhID0+IHtcbiAgICAgICAgICAgICAgaWYgKGRhdGEgJiYgZGF0YS50b1N0cmluZygpLm1hdGNoKC9XYWl0aW5nIGZvciBjaGFuZ2VzXFwuXFwuXFwuLykpIHtcbiAgICAgICAgICAgICAgICBvbkJ1aWxkRG9uZSgpXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB3YXRjaGluZy5vbignZXhpdCcsIG9uQnVpbGREb25lKVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIWNtZFJlYnVpbGROZWVkZWQpIHtcbiAgICAgICAgICAgIHJlYWRsaW5lLmN1cnNvclRvKHByb2Nlc3Muc3Rkb3V0LCAwKTtjb25zb2xlLmxvZyhhcHAgKyAnRXh0IHJlYnVpbGQgTk9UIG5lZWRlZCcpXG4gICAgICAgICAgICBvbkJ1aWxkRG9uZSgpXG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmVhZGxpbmUuY3Vyc29yVG8ocHJvY2Vzcy5zdGRvdXQsIDApO2NvbnNvbGUubG9nKGFwcCArICdFeHQgcmVidWlsZCBJUyBuZWVkZWQnKVxuICAgICAgICAgIH1cbiAgICAgICAgfSBcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgY29uc3QgYnVpbGQgPSBnYXRoZXJFcnJvcnMoZm9yayhzZW5jaGEsIFsnYW50JywgJ2J1aWxkJ10sIHsgc3RkaW86ICdpbmhlcml0JywgZW5jb2Rpbmc6ICd1dGYtOCcsIGN3ZDogb3V0cHV0LCBzaWxlbnQ6IGZhbHNlIH0pKTtcbiAgICAgICAgICByZWFkbGluZS5jdXJzb3JUbyhwcm9jZXNzLnN0ZG91dCwgMCk7Y29uc29sZS5sb2coYXBwICsgJ3NlbmNoYSBhbnQgYnVpbGQnKVxuICAgICAgICAgIGlmKGJ1aWxkLnN0ZG91dCkgeyBidWlsZC5zdGRvdXQucGlwZShwcm9jZXNzLnN0ZG91dCkgfVxuICAgICAgICAgIGlmKGJ1aWxkLnN0ZGVycikgeyBidWlsZC5zdGRlcnIucGlwZShwcm9jZXNzLnN0ZGVycikgfVxuICAgICAgICAgIGJ1aWxkLm9uKCdleGl0Jywgb25CdWlsZERvbmUpO1xuICAgICAgICB9XG4gICAgICAvL31cblxuXG4gICAgfSk7XG4gIH1cblxuXG5cbiAgLyoqXG4gICAqIERlZmF1bHQgY29uZmlnIG9wdGlvbnNcbiAgICogQHByb3RlY3RlZFxuICAgKiBAcmV0dXJuIHtPYmplY3R9XG4gICAqL1xuICBnZXREZWZhdWx0T3B0aW9ucygpIHtcbiAgICByZXR1cm4ge1xuICAgICAgcG9ydDogODAxNixcbiAgICAgIGJ1aWxkczoge30sXG4gICAgICBkZWJ1ZzogZmFsc2UsXG4gICAgICB3YXRjaDogZmFsc2UsXG4gICAgICB0ZXN0OiAvXFwuKGp8dClzeD8kLyxcblxuICAgICAgLyogYmVnaW4gc2luZ2xlIGJ1aWxkIG9ubHkgKi9cbiAgICAgIG91dHB1dDogJ2V4dC1yZWFjdCcsXG4gICAgICB0b29sa2l0OiAnbW9kZXJuJyxcbiAgICAgIHBhY2thZ2VzOiBudWxsLFxuICAgICAgcGFja2FnZURpcnM6IFtdLFxuICAgICAgb3ZlcnJpZGVzOiBbXSxcbiAgICAgIGFzeW5jaHJvbm91czogZmFsc2UsXG4gICAgICBwcm9kdWN0aW9uOiBmYWxzZSxcbiAgICAgIG1hbmlmZXN0RXh0cmFjdG9yOiBleHRyYWN0RnJvbUpTWCxcbiAgICAgIHRyZWVTaGFraW5nOiBmYWxzZVxuICAgICAgLyogZW5kIHNpbmdsZSBidWlsZCBvbmx5ICovXG4gICAgfVxuICB9XG5cblxuXG4gIHN1Y2NlZWRNb2R1bGUoY29tcGlsYXRpb24sIG1vZHVsZSkge1xuICAgIHRoaXMuY3VycmVudEZpbGUgPSBtb2R1bGUucmVzb3VyY2U7XG4gICAgaWYgKG1vZHVsZS5yZXNvdXJjZSAmJiBtb2R1bGUucmVzb3VyY2UubWF0Y2godGhpcy50ZXN0KSAmJiAhbW9kdWxlLnJlc291cmNlLm1hdGNoKC9ub2RlX21vZHVsZXMvKSAmJiAhbW9kdWxlLnJlc291cmNlLm1hdGNoKGAvcmVhY3RvciR7cmVhY3RWZXJzaW9ufS9gKSkge1xuICAgICAgY29uc3QgZG9QYXJzZSA9ICgpID0+IHtcbiAgICAgICAgdGhpcy5kZXBlbmRlbmNpZXNbdGhpcy5jdXJyZW50RmlsZV0gPSBbXG4gICAgICAgICAgLi4uKHRoaXMuZGVwZW5kZW5jaWVzW3RoaXMuY3VycmVudEZpbGVdIHx8IFtdKSxcbiAgICAgICAgICAuLi50aGlzLm1hbmlmZXN0RXh0cmFjdG9yKG1vZHVsZS5fc291cmNlLl92YWx1ZSwgY29tcGlsYXRpb24sIG1vZHVsZSwgcmVhY3RWZXJzaW9uKVxuICAgICAgICBdXG4gICAgICB9XG4gICAgICBpZiAodGhpcy5kZWJ1Zykge1xuICAgICAgICBkb1BhcnNlKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0cnkgeyBkb1BhcnNlKCk7IH0gY2F0Y2ggKGUpIFxuICAgICAgICB7IFxuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1xcbmVycm9yIHBhcnNpbmcgJyArIHRoaXMuY3VycmVudEZpbGUpOyBcbiAgICAgICAgICBjb25zb2xlLmVycm9yKGUpOyBcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvL2NvbnNvbGUubG9nKCd0aGlzLmRlcGVuZGVuY2llc1t0aGlzLmN1cnJlbnRGaWxlXScpXG4vLyAgICAgIGNvbnNvbGUubG9nKCdcXG4nK3RoaXMuY3VycmVudEZpbGUpXG4gICAgICAvL2NvbnNvbGUubG9nKHRoaXMuZGVwZW5kZW5jaWVzW3RoaXMuY3VycmVudEZpbGVdKVxuXG4gICAgfVxuICB9XG5cblxuXG4gIC8qKlxuICAgKiBDaGVja3MgZWFjaCBidWlsZCBjb25maWcgZm9yIG1pc3NpbmcvaW52YWxpZCBwcm9wZXJ0aWVzXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIFRoZSBuYW1lIG9mIHRoZSBidWlsZFxuICAgKiBAcGFyYW0ge1N0cmluZ30gYnVpbGQgVGhlIGJ1aWxkIGNvbmZpZ1xuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3ZhbGlkYXRlQnVpbGRDb25maWcobmFtZSwgYnVpbGQpIHtcbiAgICBsZXQgeyBzZGssIHByb2R1Y3Rpb24gfSA9IGJ1aWxkO1xuXG4gICAgaWYgKHByb2R1Y3Rpb24pIHtcbiAgICAgIGJ1aWxkLnRyZWVTaGFraW5nID0gZmFsc2U7XG4gICAgfVxuICAgIGlmIChzZGspIHtcbiAgICAgIGlmICghZnMuZXhpc3RzU3luYyhzZGspKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBObyBTREsgZm91bmQgYXQgJHtwYXRoLnJlc29sdmUoc2RrKX0uICBEaWQgeW91IGZvciBnZXQgdG8gbGluay9jb3B5IHlvdXIgRXh0IEpTIFNESyB0byB0aGF0IGxvY2F0aW9uP2ApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLl9hZGRSZWFjdG9yUGFja2FnZShidWlsZClcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdHJ5IHtcbiAgICAgICAgYnVpbGQuc2RrID0gcGF0aC5kaXJuYW1lKHJlc29sdmUoJ0BleHRqcy9leHQtcmVhY3QnLCB7IGJhc2VkaXI6IHByb2Nlc3MuY3dkKCkgfSkpXG4gICAgICAgIGJ1aWxkLnBhY2thZ2VEaXJzID0gWy4uLihidWlsZC5wYWNrYWdlRGlycyB8fCBbXSksIHBhdGguZGlybmFtZShidWlsZC5zZGspXTtcbiAgICAgICAgYnVpbGQucGFja2FnZXMgPSBidWlsZC5wYWNrYWdlcyB8fCB0aGlzLl9maW5kUGFja2FnZXMoYnVpbGQuc2RrKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBAZXh0anMvZXh0LXJlYWN0IG5vdCBmb3VuZC4gIFlvdSBjYW4gaW5zdGFsbCBpdCB3aXRoIFwibnBtIGluc3RhbGwgLS1zYXZlIEBleHRqcy9leHQtcmVhY3RcIiBvciwgaWYgeW91IGhhdmUgYSBsb2NhbCBjb3B5IG9mIHRoZSBTREssIHNwZWNpZnkgdGhlIHBhdGggdG8gaXQgdXNpbmcgdGhlIFwic2RrXCIgb3B0aW9uIGluIGJ1aWxkIFwiJHtuYW1lfS5cImApO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIHRoZSByZWFjdG9yIHBhY2thZ2UgaWYgcHJlc2VudCBhbmQgdGhlIHRvb2xraXQgaXMgbW9kZXJuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBidWlsZCBcbiAgICovXG4gIF9hZGRSZWFjdG9yUGFja2FnZShidWlsZCkge1xuICAgIGlmIChidWlsZC50b29sa2l0ID09PSAnY2xhc3NpYycpIHJldHVybjtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhwYXRoLmpvaW4oYnVpbGQuc2RrLCAnZXh0JywgJ21vZGVybicsICdyZWFjdG9yJykpIHx8ICAvLyByZXBvXG4gICAgICBmcy5leGlzdHNTeW5jKHBhdGguam9pbihidWlsZC5zZGssICdtb2Rlcm4nLCAncmVhY3RvcicpKSkgeyAvLyBwcm9kdWN0aW9uIGJ1aWxkXG4gICAgICBpZiAoIWJ1aWxkLnBhY2thZ2VzKSB7XG4gICAgICAgIGJ1aWxkLnBhY2thZ2VzID0gW107XG4gICAgICB9XG4gICAgICBidWlsZC5wYWNrYWdlcy5wdXNoKCdyZWFjdG9yJyk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybiB0aGUgbmFtZXMgb2YgYWxsIEV4dFJlYWN0IHBhY2thZ2VzIGluIHRoZSBzYW1lIHBhcmVudCBkaXJlY3RvcnkgYXMgZXh0LXJlYWN0ICh0eXBpY2FsbHkgbm9kZV9tb2R1bGVzL0BleHRqcylcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtTdHJpbmd9IHNkayBQYXRoIHRvIGV4dC1yZWFjdFxuICAgKiBAcmV0dXJuIHtTdHJpbmdbXX1cbiAgICovXG4gIF9maW5kUGFja2FnZXMoc2RrKSB7XG4gICAgY29uc3QgbW9kdWxlc0RpciA9IHBhdGguam9pbihzZGssICcuLicpO1xuICAgIHJldHVybiBmcy5yZWFkZGlyU3luYyhtb2R1bGVzRGlyKVxuICAgICAgLy8gRmlsdGVyIG91dCBkaXJlY3RvcmllcyB3aXRob3V0ICdwYWNrYWdlLmpzb24nXG4gICAgICAuZmlsdGVyKGRpciA9PiBmcy5leGlzdHNTeW5jKHBhdGguam9pbihtb2R1bGVzRGlyLCBkaXIsICdwYWNrYWdlLmpzb24nKSkpXG4gICAgICAvLyBHZW5lcmF0ZSBhcnJheSBvZiBwYWNrYWdlIG5hbWVzXG4gICAgICAubWFwKGRpciA9PiB7XG4gICAgICAgICAgY29uc3QgcGFja2FnZUluZm8gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhwYXRoLmpvaW4obW9kdWxlc0RpciwgZGlyLCAncGFja2FnZS5qc29uJykpKTtcbiAgICAgICAgICAvLyBEb24ndCBpbmNsdWRlIHRoZW1lIHR5cGUgcGFja2FnZXMuXG4gICAgICAgICAgaWYocGFja2FnZUluZm8uc2VuY2hhICYmIHBhY2thZ2VJbmZvLnNlbmNoYS50eXBlICE9PSAndGhlbWUnKSB7XG4gICAgICAgICAgICAgIHJldHVybiBwYWNrYWdlSW5mby5zZW5jaGEubmFtZTtcbiAgICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLy8gUmVtb3ZlIGFueSB1bmRlZmluZWRzIGZyb20gbWFwXG4gICAgICAuZmlsdGVyKG5hbWUgPT4gbmFtZSk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgcGF0aCB0byB0aGUgc2VuY2hhIGNtZCBleGVjdXRhYmxlXG4gICAqIEBwcml2YXRlXG4gICAqIEByZXR1cm4ge1N0cmluZ31cbiAgICovXG4gIF9nZXRTZW5jaENtZFBhdGgoKSB7XG4gICAgdHJ5IHtcbiAgICAgIC8vIHVzZSBAZXh0anMvc2VuY2hhLWNtZCBmcm9tIG5vZGVfbW9kdWxlc1xuICAgICAgcmV0dXJuIHJlcXVpcmUoJ0BleHRqcy9zZW5jaGEtY21kJyk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgLy8gYXR0ZW1wdCB0byB1c2UgZ2xvYmFsbHkgaW5zdGFsbGVkIFNlbmNoYSBDbWRcbiAgICAgIHJldHVybiAnc2VuY2hhJztcbiAgICB9XG4gIH1cblxuXG5cblxuICBcblxuXG5cbn1cblxuXG4gICAgICAgIC8vIGluICdleHRyZWFjdC1jb21waWxhdGlvbidcbiAgICAgICAgLy9odHRwczovL2dpdGh1Yi5jb20vamFrZXRyZW50L2h0bWwtd2VicGFjay10ZW1wbGF0ZVxuICAgICAgICAvL2h0dHBzOi8vZ2l0aHViLmNvbS9qYW50aW1vbi9odG1sLXdlYnBhY2stcGx1Z2luI1xuICAgICAgICAvLyB0aGUgZm9sbG93aW5nIGlzIG5lZWRlZCBmb3IgaHRtbC13ZWJwYWNrLXBsdWdpbiB0byBpbmNsdWRlIDxzY3JpcHQ+IGFuZCA8bGluaz4gdGFncyBmb3IgRXh0UmVhY3RcbiAgICAgICAgLy8gY29tcGlsYXRpb24uaG9va3MuaHRtbFdlYnBhY2tQbHVnaW5CZWZvcmVIdG1sR2VuZXJhdGlvbi50YXBBc3luYyhcbiAgICAgICAgLy8gICAnZXh0cmVhY3QtaHRtbGdlbmVyYXRpb24nLFxuICAgICAgICAvLyAgIChkYXRhLCBjYikgPT4ge1xuICAgICAgICAvLyAgICAgcmVhZGxpbmUuY3Vyc29yVG8ocHJvY2Vzcy5zdGRvdXQsIDApO2NvbnNvbGUubG9nKGFwcCArICdleHRyZWFjdC1odG1sZ2VuZXJhdGlvbicpXG4gICAgICAgIC8vICAgICBjb25zb2xlLmxvZygnZGF0YS5hc3NldHMuanMubGVuZ3RoJylcbiAgICAgICAgLy8gICAgIGNvbnNvbGUubG9nKGRhdGEuYXNzZXRzLmpzLmxlbmd0aClcbiAgICAgICAgLy8gICAgIGRhdGEuYXNzZXRzLmpzLnVuc2hpZnQoJ2V4dC1yZWFjdC9leHQuanMnKVxuICAgICAgICAvLyAgICAgZGF0YS5hc3NldHMuY3NzLnVuc2hpZnQoJ2V4dC1yZWFjdC9leHQuY3NzJylcbiAgICAgICAgLy8gICAgIGNiKG51bGwsIGRhdGEpXG4gICAgICAgIC8vICAgfVxuICAgICAgICAvLyApXG5cblxuXG4vLyBmcm9tIHRoaXMuZW1pdFxuICAgIC8vIHRoZSBmb2xsb3dpbmcgaXMgbmVlZGVkIGZvciBodG1sLXdlYnBhY2stcGx1Z2luIHRvIGluY2x1ZGUgPHNjcmlwdD4gYW5kIDxsaW5rPiB0YWdzIGZvciBFeHRSZWFjdFxuICAgIC8vIGNvbnNvbGUubG9nKCdjb21waWxhdGlvbicpXG4gICAgLy8gY29uc29sZS5sb2coJyoqKioqKioqY29tcGlsYXRpb24uY2h1bmtzWzBdJylcbiAgICAvLyBjb25zb2xlLmxvZyhjb21waWxhdGlvbi5jaHVua3NbMF0uaWQpXG4gICAgLy8gY29uc29sZS5sb2cocGF0aC5qb2luKHRoaXMub3V0cHV0LCAnZXh0LmpzJykpXG4gICAgLy8gY29uc3QganNDaHVuayA9IGNvbXBpbGF0aW9uLmFkZENodW5rKGAke3RoaXMub3V0cHV0fS1qc2ApO1xuICAgIC8vIGpzQ2h1bmsuaGFzUnVudGltZSA9IGpzQ2h1bmsuaXNJbml0aWFsID0gKCkgPT4gdHJ1ZTtcbiAgICAvLyBqc0NodW5rLmZpbGVzLnB1c2gocGF0aC5qb2luKHRoaXMub3V0cHV0LCAnZXh0LmpzJykpO1xuICAgIC8vIGpzQ2h1bmsuZmlsZXMucHVzaChwYXRoLmpvaW4odGhpcy5vdXRwdXQsICdleHQuY3NzJykpO1xuICAgIC8vIGpzQ2h1bmsuaWQgPSAnYWFhYXAnOyAvLyB0aGlzIGZvcmNlcyBodG1sLXdlYnBhY2stcGx1Z2luIHRvIGluY2x1ZGUgZXh0LmpzIGZpcnN0XG4gICAgLy8gY29uc29sZS5sb2coJyoqKioqKioqY29tcGlsYXRpb24uY2h1bmtzWzFdJylcbiAgICAvLyBjb25zb2xlLmxvZyhjb21waWxhdGlvbi5jaHVua3NbMV0uaWQpXG5cbiAgICAvL2lmICh0aGlzLmFzeW5jaHJvbm91cykgY2FsbGJhY2soKTtcbi8vICAgIGNvbnNvbGUubG9nKGNhbGxiYWNrKVxuXG4vLyBpZiAoaXNXZWJwYWNrNCkge1xuLy8gICBjb25zb2xlLmxvZyhwYXRoLmpvaW4odGhpcy5vdXRwdXQsICdleHQuanMnKSlcbi8vICAgY29uc3Qgc3RhdHMgPSBmcy5zdGF0U3luYyhwYXRoLmpvaW4ob3V0cHV0UGF0aCwgJ2V4dC5qcycpKVxuLy8gICBjb25zdCBmaWxlU2l6ZUluQnl0ZXMgPSBzdGF0cy5zaXplXG4vLyAgIGNvbXBpbGF0aW9uLmFzc2V0c1snZXh0LmpzJ10gPSB7XG4vLyAgICAgc291cmNlOiBmdW5jdGlvbigpIHtyZXR1cm4gZnMucmVhZEZpbGVTeW5jKHBhdGguam9pbihvdXRwdXRQYXRoLCAnZXh0LmpzJykpfSxcbi8vICAgICBzaXplOiBmdW5jdGlvbigpIHtyZXR1cm4gZmlsZVNpemVJbkJ5dGVzfVxuLy8gICB9XG4vLyAgIGNvbnNvbGUubG9nKGNvbXBpbGF0aW9uLmVudHJ5cG9pbnRzKVxuXG4vLyAgIHZhciBmaWxlbGlzdCA9ICdJbiB0aGlzIGJ1aWxkOlxcblxcbic7XG5cbi8vICAgLy8gTG9vcCB0aHJvdWdoIGFsbCBjb21waWxlZCBhc3NldHMsXG4vLyAgIC8vIGFkZGluZyBhIG5ldyBsaW5lIGl0ZW0gZm9yIGVhY2ggZmlsZW5hbWUuXG4vLyAgIGZvciAodmFyIGZpbGVuYW1lIGluIGNvbXBpbGF0aW9uLmFzc2V0cykge1xuLy8gICAgIGZpbGVsaXN0ICs9ICgnLSAnKyBmaWxlbmFtZSArJ1xcbicpO1xuLy8gICB9XG5cbi8vICAgLy8gSW5zZXJ0IHRoaXMgbGlzdCBpbnRvIHRoZSB3ZWJwYWNrIGJ1aWxkIGFzIGEgbmV3IGZpbGUgYXNzZXQ6XG4vLyAgIGNvbXBpbGF0aW9uLmFzc2V0c1snZmlsZWxpc3QubWQnXSA9IHtcbi8vICAgICBzb3VyY2UoKSB7XG4vLyAgICAgICByZXR1cm4gZmlsZWxpc3Q7XG4vLyAgICAgfSxcbi8vICAgICBzaXplKCkge1xuLy8gICAgICAgcmV0dXJuIGZpbGVsaXN0Lmxlbmd0aDtcbi8vICAgICB9XG4vLyAgIH1cbi8vIH0iXX0=