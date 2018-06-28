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


/**
 * Scrapes Sencha Cmd output, adding error messages to cmdErrors;
 * @param {Process} build A sencha Cmd process
 */
var gatherErrors = function gatherErrors(cmd) {

  if (cmd.stdout) {
    cmd.stdout.on('data', function (data) {
      var message = data.toString();
      if (message.match(/^\[ERR\]/)) {
        cmdErrors.push(message.replace(/^\[ERR\] /gi, ''));
      }
    });
  }

  // cmd.stderr.on('data', (data) => {
  //   console.error(`E:${data}`);
  // })

  return cmd;
};

/**
 * Produces a minimal build of ExtReact by crawling your React source code and extracting the xtypes used
 * in JSX tags
 */
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

    //can be in devdependencies
    //account for this: react: "15.16.0"
    var pkg = _fs2.default.existsSync('package.json') && JSON.parse(_fs2.default.readFileSync('package.json', 'utf-8')) || {};
    var reactEntry = pkg.dependencies.react;
    var is16 = reactEntry.includes("16");
    if (is16) {
      reactVersion = 16;
    } else {
      reactVersion = 15;
    }
    this.reactVersion = reactVersion;

    // if .ext-reactrc file exists, consume it and apply it to config options.
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

  /**
   * Default config options
   * @protected
   * @return {Object}
   */


  _createClass(ReactExtJSWebpackPlugin, [{
    key: 'getDefaultOptions',
    value: function getDefaultOptions() {
      return {
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
        treeShaking: true
        /* end single build only */
      };
    }
  }, {
    key: 'watchRun',
    value: function watchRun() {
      this.watch = true;
    }
  }, {
    key: 'succeedModule',
    value: function succeedModule(compilation, module) {
      var _this = this;

      this.currentFile = module.resource;
      if (module.resource && module.resource.match(this.test) && !module.resource.match(/node_modules/) && !module.resource.match('/reactor' + reactVersion + '/')) {
        var doParse = function doParse() {
          _this.dependencies[_this.currentFile] = [].concat(_toConsumableArray(_this.dependencies[_this.currentFile] || []), _toConsumableArray(_this.manifestExtractor(module._source._value, compilation, module, reactVersion)));
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
  }, {
    key: 'emit',
    value: function emit(compiler, compilation, callback) {
      var _this2 = this;

      var isWebpack4 = compilation.hooks;
      var modules = [];
      if (isWebpack4) {
        isWebpack4 = true;
        modules = compilation.chunks.reduce(function (a, b) {
          return a.concat(b._modules);
        }, []);
      } else {
        isWebpack4 = false;
        modules = compilation.chunks.reduce(function (a, b) {
          return a.concat(b.modules);
        }, []);
      }
      //const modules = compilation.chunks.reduce((a, b) => a.concat(b.modules), []);
      var build = this.builds[Object.keys(this.builds)[0]];
      var outputPath = _path2.default.join(compiler.outputPath, this.output);
      //console.log('\n*****outputPath: ' + outputPath)
      //console.log('\n*****this.output: ' + this.output)
      // webpack-dev-server overwrites the outputPath to "/", so we need to prepend contentBase
      if (compiler.outputPath === '/' && compiler.options.devServer) {
        outputPath = _path2.default.join(compiler.options.devServer.contentBase, outputPath);
      }
      // the following is needed for html-webpack-plugin to include <script> and <link> tags for ExtReact
      var jsChunk = compilation.addChunk(this.output + '-js');
      jsChunk.hasRuntime = jsChunk.isInitial = function () {
        return true;
      };
      jsChunk.files.push(_path2.default.join(this.output, 'ext.js'));
      jsChunk.files.push(_path2.default.join(this.output, 'ext.css'));
      jsChunk.id = -2; // this forces html-webpack-plugin to include ext.js first
      //if (this.asynchronous) callback();
      //    console.log(callback)
      if (callback != null) {
        if (this.asynchronous) {
          callback();
        }
      }

      //    console.log(modules)
      //    console.log(outputPath)
      //    console.log(build)

      this._buildExtBundle(isWebpack4, 'ext', modules, outputPath, build).then(function () {
        console.log('in then');
        // const cssVarPath = path.join(this.output, 'css-vars.js');

        // if (fs.existsSync(path.join(outputPath, 'css-vars.js'))) {
        //     const cssVarChunk = compilation.addChunk(`${this.output}-css-vars`);
        //     cssVarChunk.hasRuntime = cssVarChunk.isInitial = () => true;
        //     cssVarChunk.files.push(cssVarPath);
        //     cssVarChunk.id = -1;
        // }
        //!this.asynchronous && callback();
        //        console.log(callback)
        if (callback != null) {
          if (!_this2.asynchronous) {
            callback();
          }
        }
      }).catch(function (e) {
        console.log(e);
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
  }, {
    key: 'apply',
    value: function apply(compiler) {
      var _this3 = this;

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
        if (this.asynchronous) {
          compiler.hooks.watchRun.tapAsync('extreact-watch-run (async)', function (watching, cb) {
            readline.cursorTo(process.stdout, 0);console.log(app + 'extreact-watch-run (async)');
            _this3.watchRun();
            cb();
          });
        } else {
          compiler.hooks.watchRun.tap('extreact-watch-run', function (watching) {
            readline.cursorTo(process.stdout, 0);console.log(app + 'extreact-watch-run');
            _this3.watchRun();
          });
        }
      } else {
        compiler.plugin('watch-run', function (watching, cb) {
          readline.cursorTo(process.stdout, 0);console.log(app + 'watch-run');
          _this3.watchRun();
          cb();
        });
      }

      // extract xtypes from JSX tags
      if (compiler.hooks) {
        compiler.hooks.compilation.tap('extreact-compilation', function (compilation) {
          readline.cursorTo(process.stdout, 0);console.log(app + 'extreact-compilation');
          compilation.hooks.succeedModule.tap('extreact-succeed-module', function (module) {
            _this3.succeedModule(compilation, module);
          });

          // data.normalModuleFactory.plugin("parser", function(parser, options) {
          //   // extract xtypes and classes from Ext.create calls
          //   parser.plugin('call Ext.create', addToManifest);
          //   // copy Ext.require calls to the manifest.  This allows the users to explicitly require a class if the plugin fails to detect it.
          //   parser.plugin('call Ext.require', addToManifest);
          //   // copy Ext.define calls to the manifest.  This allows users to write standard ExtReact classes.
          //   parser.plugin('call Ext.define', addToManifest);
          // })
        });
      } else {
        compiler.plugin('compilation', function (compilation, data) {
          readline.cursorTo(process.stdout, 0);console.log(app + 'compilation');
          compilation.plugin('succeed-module', function (module) {
            _this3.succeedModule(compilation, module);
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

      // once all modules are processed, create the optimized ExtReact build.
      if (compiler.hooks) {
        if (this.asynchronous) {
          compiler.hooks.emit.tapAsync('extreact-emit (async)', function (compilation, cb) {
            readline.cursorTo(process.stdout, 0);console.log(app + 'extreact-emit');
            _this3.emit(compiler, compilation, cb);
          });
        } else {
          compiler.hooks.emit.tap('extreact-emit', function (compilation) {
            readline.cursorTo(process.stdout, 0);console.log(app + 'extreact-emit');
            _this3.emit(compiler, compilation, null);
          });
        }
      } else {
        compiler.plugin('emit', function (compilation, callback) {
          readline.cursorTo(process.stdout, 0);console.log(app + 'emit');
          _this3.emit(compiler, compilation, callback);
        });
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
        build.treeShaking = true;
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
      var _this4 = this;

      var _ref$toolkit = _ref.toolkit,
          toolkit = _ref$toolkit === undefined ? 'modern' : _ref$toolkit,
          theme = _ref.theme,
          _ref$packages = _ref.packages,
          packages = _ref$packages === undefined ? [] : _ref$packages,
          _ref$packageDirs = _ref.packageDirs,
          packageDirs = _ref$packageDirs === undefined ? [] : _ref$packageDirs,
          sdk = _ref.sdk,
          overrides = _ref.overrides;

      //     console.log(modules)
      console.log('*****');
      console.log(isWebpack4);
      console.log('*****');

      var sencha = this._getSenchCmdPath();
      theme = theme || (toolkit === 'classic' ? 'theme-triton' : 'theme-material');

      return new Promise(function (resolve, reject) {
        _this4.onBuildFail = reject;
        _this4.onBuildSuccess = resolve;

        cmdErrors = [];

        var onBuildDone = function onBuildDone() {
          if (cmdErrors.length) {
            _this4.onBuildFail(new Error(cmdErrors.join("")));
          } else {
            _this4.onBuildSuccess();
          }
        };

        if (!watching) {
          (0, _rimraf.sync)(output);
          (0, _mkdirp.sync)(output);
        }

        var js = void 0;

        if (_this4.treeShaking) {
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

              var deps = _this4.dependencies[_module.resource];
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
          _fs2.default.writeFileSync(_path2.default.join(output, 'build.xml'), (0, _artifacts.buildXML)({ compress: _this4.production }), 'utf8');
          _fs2.default.writeFileSync(_path2.default.join(output, 'jsdom-environment.js'), (0, _artifacts.createJSDOMEnvironment)(), 'utf8');
          _fs2.default.writeFileSync(_path2.default.join(output, 'app.json'), (0, _artifacts.createAppJson)({ theme: theme, packages: packages, toolkit: toolkit, overrides: overrides, packageDirs: packageDirs }), 'utf8');
          _fs2.default.writeFileSync(_path2.default.join(output, 'workspace.json'), (0, _artifacts.createWorkspaceJson)(sdk, packageDirs, output), 'utf8');
        }

        var cmdRebuildNeeded = false;

        if (_this4.manifest === null || js !== _this4.manifest) {
          // Only write manifest if it differs from the last run.  This prevents unnecessary cmd rebuilds.
          _this4.manifest = js;
          _fs2.default.writeFileSync(manifest, js, 'utf8');
          cmdRebuildNeeded = true;
          readline.cursorTo(process.stdout, 0);console.log(app + ('building ExtReact bundle: ' + name + ' => ' + output));
        }

        if (isWebpack4) {
          //execSync(sencha, ['ant', 'watch'], { cwd: output, silent: false })
          var spawnSync = require('child_process').spawnSync;
          spawnSync(sencha, ['ant', 'build'], { cwd: output, stdio: 'inherit', encoding: 'utf-8' });
          console.log('after spawnSync');
          onBuildDone();
        }

        if (!isWebpack4) {
          if (_this4.watch) {
            if (!watching) {
              watching = gatherErrors((0, _child_process.fork)(sencha, ['ant', 'watch'], { cwd: output, silent: true }));
              console.log('after fork');
              watching.stderr.pipe(process.stderr);
              watching.stdout.pipe(process.stdout);
              watching.stdout.on('data', function (data) {
                if (data && data.toString().match(/Waiting for changes\.\.\./)) {
                  onBuildDone();
                }
              });
              watching.on('exit', onBuildDone);
            }
            if (!cmdRebuildNeeded) onBuildDone();
          } else {
            var build = gatherErrors((0, _child_process.fork)(sencha, ['ant', 'build'], { stdio: 'inherit', encoding: 'utf-8', cwd: output, silent: false }));
            console.log('after fork');
            if (build.stdout) {
              build.stdout.pipe(process.stdout);
            }
            if (build.stderr) {
              build.stderr.pipe(process.stderr);
            }
            build.on('exit', onBuildDone);
          }
        }
      });
    }
  }]);

  return ReactExtJSWebpackPlugin;
}();
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9pbmRleC5qcyJdLCJuYW1lcyI6WyJyZWFkbGluZSIsInJlYWN0VmVyc2lvbiIsIndhdGNoaW5nIiwiY21kRXJyb3JzIiwiYXBwIiwiY2hhbGsiLCJncmVlbiIsImdhdGhlckVycm9ycyIsImNtZCIsInN0ZG91dCIsIm9uIiwibWVzc2FnZSIsImRhdGEiLCJ0b1N0cmluZyIsIm1hdGNoIiwicHVzaCIsInJlcGxhY2UiLCJtb2R1bGUiLCJleHBvcnRzIiwib3B0aW9ucyIsInBrZyIsImZzIiwiZXhpc3RzU3luYyIsIkpTT04iLCJwYXJzZSIsInJlYWRGaWxlU3luYyIsInJlYWN0RW50cnkiLCJkZXBlbmRlbmNpZXMiLCJyZWFjdCIsImlzMTYiLCJpbmNsdWRlcyIsImV4dFJlYWN0UmMiLCJnZXREZWZhdWx0T3B0aW9ucyIsImJ1aWxkcyIsIk9iamVjdCIsImtleXMiLCJsZW5ndGgiLCJidWlsZE9wdGlvbnMiLCJleHQiLCJuYW1lIiwiX3ZhbGlkYXRlQnVpbGRDb25maWciLCJhc3NpZ24iLCJjdXJyZW50RmlsZSIsIm1hbmlmZXN0IiwiZGVidWciLCJ3YXRjaCIsInRlc3QiLCJvdXRwdXQiLCJ0b29sa2l0IiwicGFja2FnZXMiLCJwYWNrYWdlRGlycyIsIm92ZXJyaWRlcyIsImFzeW5jaHJvbm91cyIsInByb2R1Y3Rpb24iLCJtYW5pZmVzdEV4dHJhY3RvciIsImV4dHJhY3RGcm9tSlNYIiwidHJlZVNoYWtpbmciLCJjb21waWxhdGlvbiIsInJlc291cmNlIiwiZG9QYXJzZSIsIl9zb3VyY2UiLCJfdmFsdWUiLCJlIiwiY29uc29sZSIsImVycm9yIiwiY29tcGlsZXIiLCJjYWxsYmFjayIsImlzV2VicGFjazQiLCJob29rcyIsIm1vZHVsZXMiLCJjaHVua3MiLCJyZWR1Y2UiLCJhIiwiYiIsImNvbmNhdCIsIl9tb2R1bGVzIiwiYnVpbGQiLCJvdXRwdXRQYXRoIiwicGF0aCIsImpvaW4iLCJkZXZTZXJ2ZXIiLCJjb250ZW50QmFzZSIsImpzQ2h1bmsiLCJhZGRDaHVuayIsImhhc1J1bnRpbWUiLCJpc0luaXRpYWwiLCJmaWxlcyIsImlkIiwiX2J1aWxkRXh0QnVuZGxlIiwidGhlbiIsImxvZyIsImNhdGNoIiwiZXJyb3JzIiwiRXJyb3IiLCJ3ZWJwYWNrVmVyc2lvbiIsInVuZGVmaW5lZCIsImN1cnNvclRvIiwicHJvY2VzcyIsIm1lIiwiYWRkVG9NYW5pZmVzdCIsImNhbGwiLCJmaWxlIiwic3RhdGUiLCJ3YXRjaFJ1biIsInRhcEFzeW5jIiwiY2IiLCJ0YXAiLCJwbHVnaW4iLCJzdWNjZWVkTW9kdWxlIiwibm9ybWFsTW9kdWxlRmFjdG9yeSIsInBhcnNlciIsImVtaXQiLCJzZGsiLCJyZXNvbHZlIiwiX2FkZFJlYWN0b3JQYWNrYWdlIiwiZGlybmFtZSIsImJhc2VkaXIiLCJjd2QiLCJfZmluZFBhY2thZ2VzIiwibW9kdWxlc0RpciIsInJlYWRkaXJTeW5jIiwiZmlsdGVyIiwiZGlyIiwibWFwIiwicGFja2FnZUluZm8iLCJzZW5jaGEiLCJ0eXBlIiwicmVxdWlyZSIsInRoZW1lIiwiX2dldFNlbmNoQ21kUGF0aCIsIlByb21pc2UiLCJyZWplY3QiLCJvbkJ1aWxkRmFpbCIsIm9uQnVpbGRTdWNjZXNzIiwib25CdWlsZERvbmUiLCJqcyIsInN0YXRlbWVudHMiLCJpbmRleE9mIiwiZGVwcyIsInVzZXJQYWNrYWdlcyIsIndyaXRlRmlsZVN5bmMiLCJjb21wcmVzcyIsImNtZFJlYnVpbGROZWVkZWQiLCJzcGF3blN5bmMiLCJzdGRpbyIsImVuY29kaW5nIiwic2lsZW50Iiwic3RkZXJyIiwicGlwZSJdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztBQUVBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7O0FBQ0E7Ozs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFJQTs7SUFBWUEsUTs7Ozs7Ozs7Ozs7O0FBZlosSUFBSUMsZUFBZSxDQUFuQjs7QUFZQSxJQUFJQyxXQUFXLEtBQWY7QUFDQSxJQUFJQyxrQkFBSjtBQUNBLElB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IHN0cmljdCc7XG52YXIgcmVhY3RWZXJzaW9uID0gMFxuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBjanNvbiBmcm9tICdjanNvbic7XG5pbXBvcnQgeyBzeW5jIGFzIG1rZGlycCB9IGZyb20gJ21rZGlycCc7XG5pbXBvcnQgZXh0cmFjdEZyb21KU1ggZnJvbSAnLi9leHRyYWN0RnJvbUpTWCc7XG5pbXBvcnQgeyBzeW5jIGFzIHJpbXJhZiB9IGZyb20gJ3JpbXJhZic7XG5pbXBvcnQgeyBidWlsZFhNTCwgY3JlYXRlQXBwSnNvbiwgY3JlYXRlV29ya3NwYWNlSnNvbiwgY3JlYXRlSlNET01FbnZpcm9ubWVudCB9IGZyb20gJy4vYXJ0aWZhY3RzJztcbmltcG9ydCB7IGV4ZWNTeW5jLCBzcGF3biwgZm9yayB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0IHsgZ2VuZXJhdGUgfSBmcm9tICdhc3RyaW5nJztcbmltcG9ydCB7IHN5bmMgYXMgcmVzb2x2ZSB9IGZyb20gJ3Jlc29sdmUnO1xubGV0IHdhdGNoaW5nID0gZmFsc2U7XG5sZXQgY21kRXJyb3JzO1xuY29uc3QgYXBwID0gYCR7Y2hhbGsuZ3JlZW4oJ+KEuSDvvaJleHTvvaM6Jyl9IHJlYWN0b3Itd2VicGFjay1wbHVnaW46IGA7XG5pbXBvcnQgKiBhcyByZWFkbGluZSBmcm9tICdyZWFkbGluZSdcblxuLyoqXG4gKiBTY3JhcGVzIFNlbmNoYSBDbWQgb3V0cHV0LCBhZGRpbmcgZXJyb3IgbWVzc2FnZXMgdG8gY21kRXJyb3JzO1xuICogQHBhcmFtIHtQcm9jZXNzfSBidWlsZCBBIHNlbmNoYSBDbWQgcHJvY2Vzc1xuICovXG5jb25zdCBnYXRoZXJFcnJvcnMgPSAoY21kKSA9PiB7XG5cbiAgaWYgKGNtZC5zdGRvdXQpIHtcbiAgICBjbWQuc3Rkb3V0Lm9uKCdkYXRhJywgZGF0YSA9PiB7XG4gICAgICBjb25zdCBtZXNzYWdlID0gZGF0YS50b1N0cmluZygpO1xuICAgICAgaWYgKG1lc3NhZ2UubWF0Y2goL15cXFtFUlJcXF0vKSkge1xuICAgICAgICBjbWRFcnJvcnMucHVzaChtZXNzYWdlLnJlcGxhY2UoL15cXFtFUlJcXF0gL2dpLCAnJykpO1xuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICAvLyBjbWQuc3RkZXJyLm9uKCdkYXRhJywgKGRhdGEpID0+IHtcbiAgLy8gICBjb25zb2xlLmVycm9yKGBFOiR7ZGF0YX1gKTtcbiAgLy8gfSlcblxuICByZXR1cm4gY21kO1xufVxuXG4vKipcbiAqIFByb2R1Y2VzIGEgbWluaW1hbCBidWlsZCBvZiBFeHRSZWFjdCBieSBjcmF3bGluZyB5b3VyIFJlYWN0IHNvdXJjZSBjb2RlIGFuZCBleHRyYWN0aW5nIHRoZSB4dHlwZXMgdXNlZFxuICogaW4gSlNYIHRhZ3NcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBSZWFjdEV4dEpTV2VicGFja1BsdWdpbiB7XG5cbiAgLyoqXG4gICAqIEBwYXJhbSB7T2JqZWN0W119IGJ1aWxkc1xuICAgKiBAcGFyYW0ge0Jvb2xlYW59IFtkZWJ1Zz1mYWxzZV0gU2V0IHRvIHRydWUgdG8gcHJldmVudCBjbGVhbnVwIG9mIGJ1aWxkIHRlbXBvcmFyeSBidWlsZCBhcnRpZmFjdHMgdGhhdCBtaWdodCBiZSBoZWxwZnVsIGluIHRyb3VibGVzaG9vdGluZyBpc3N1ZXMuXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBzZGsgVGhlIGZ1bGwgcGF0aCB0byB0aGUgRXh0UmVhY3QgU0RLXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBbdG9vbGtpdD0nbW9kZXJuJ10gXCJtb2Rlcm5cIiBvciBcImNsYXNzaWNcIlxuICAgKiBAcGFyYW0ge1N0cmluZ30gdGhlbWUgVGhlIG5hbWUgb2YgdGhlIEV4dFJlYWN0IHRoZW1lIHBhY2thZ2UgdG8gdXNlLCBmb3IgZXhhbXBsZSBcInRoZW1lLW1hdGVyaWFsXCJcbiAgICogQHBhcmFtIHtTdHJpbmdbXX0gcGFja2FnZXMgQW4gYXJyYXkgb2YgRXh0UmVhY3QgcGFja2FnZXMgdG8gaW5jbHVkZVxuICAgKiBAcGFyYW0ge1N0cmluZ1tdfSBvdmVycmlkZXMgQW4gYXJyYXkgd2l0aCB0aGUgcGF0aHMgb2YgZGlyZWN0b3JpZXMgb3IgZmlsZXMgdG8gc2VhcmNoLiBBbnkgY2xhc3Nlc1xuICAgKiBkZWNsYXJlZCBpbiB0aGVzZSBsb2NhdGlvbnMgd2lsbCBiZSBhdXRvbWF0aWNhbGx5IHJlcXVpcmVkIGFuZCBpbmNsdWRlZCBpbiB0aGUgYnVpbGQuXG4gICAqIElmIGFueSBmaWxlIGRlZmluZXMgYW4gRXh0UmVhY3Qgb3ZlcnJpZGUgKHVzaW5nIEV4dC5kZWZpbmUgd2l0aCBhbiBcIm92ZXJyaWRlXCIgcHJvcGVydHkpLFxuICAgKiB0aGF0IG92ZXJyaWRlIHdpbGwgaW4gZmFjdCBvbmx5IGJlIGluY2x1ZGVkIGluIHRoZSBidWlsZCBpZiB0aGUgdGFyZ2V0IGNsYXNzIHNwZWNpZmllZFxuICAgKiBpbiB0aGUgXCJvdmVycmlkZVwiIHByb3BlcnR5IGlzIGFsc28gaW5jbHVkZWQuXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBvdXRwdXQgVGhlIHBhdGggdG8gZGlyZWN0b3J5IHdoZXJlIHRoZSBFeHRSZWFjdCBidW5kbGUgc2hvdWxkIGJlIHdyaXR0ZW5cbiAgICogQHBhcmFtIHtCb29sZWFufSBhc3luY2hyb25vdXMgU2V0IHRvIHRydWUgdG8gcnVuIFNlbmNoYSBDbWQgYnVpbGRzIGFzeW5jaHJvbm91c2x5LiBUaGlzIG1ha2VzIHRoZSB3ZWJwYWNrIGJ1aWxkIGZpbmlzaCBtdWNoIGZhc3RlciwgYnV0IHRoZSBhcHAgbWF5IG5vdCBsb2FkIGNvcnJlY3RseSBpbiB5b3VyIGJyb3dzZXIgdW50aWwgU2VuY2hhIENtZCBpcyBmaW5pc2hlZCBidWlsZGluZyB0aGUgRXh0UmVhY3QgYnVuZGxlXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gcHJvZHVjdGlvbiBTZXQgdG8gdHJ1ZSBmb3IgcHJvZHVjdGlvbiBidWlsZHMuICBUaGlzIHRlbGwgU2VuY2hhIENtZCB0byBjb21wcmVzcyB0aGUgZ2VuZXJhdGVkIEpTIGJ1bmRsZS5cbiAgICogQHBhcmFtIHtCb29sZWFufSB0cmVlU2hha2luZyBTZXQgdG8gZmFsc2UgdG8gZGlzYWJsZSB0cmVlIHNoYWtpbmcgaW4gZGV2ZWxvcG1lbnQgYnVpbGRzLiAgVGhpcyBtYWtlcyBpbmNyZW1lbnRhbCByZWJ1aWxkcyBmYXN0ZXIgYXMgYWxsIEV4dFJlYWN0IGNvbXBvbmVudHMgYXJlIGluY2x1ZGVkIGluIHRoZSBleHQuanMgYnVuZGxlIGluIHRoZSBpbml0aWFsIGJ1aWxkIGFuZCB0aHVzIHRoZSBidW5kbGUgZG9lcyBub3QgbmVlZCB0byBiZSByZWJ1aWx0IGFmdGVyIGVhY2ggY2hhbmdlLiBEZWZhdWx0cyB0byB0cnVlLlxuICAgKi9cbiAgY29uc3RydWN0b3Iob3B0aW9ucykge1xuICAgIC8vY2FuIGJlIGluIGRldmRlcGVuZGVuY2llc1xuICAgIC8vYWNjb3VudCBmb3IgdGhpczogcmVhY3Q6IFwiMTUuMTYuMFwiXG4gICAgdmFyIHBrZyA9IChmcy5leGlzdHNTeW5jKCdwYWNrYWdlLmpzb24nKSAmJiBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYygncGFja2FnZS5qc29uJywgJ3V0Zi04JykpIHx8IHt9KTtcbiAgICB2YXIgcmVhY3RFbnRyeSA9IHBrZy5kZXBlbmRlbmNpZXMucmVhY3RcbiAgICB2YXIgaXMxNiA9IHJlYWN0RW50cnkuaW5jbHVkZXMoXCIxNlwiKTtcbiAgICBpZiAoaXMxNikgeyByZWFjdFZlcnNpb24gPSAxNiB9XG4gICAgZWxzZSB7IHJlYWN0VmVyc2lvbiA9IDE1IH1cbiAgICB0aGlzLnJlYWN0VmVyc2lvbiA9IHJlYWN0VmVyc2lvblxuXG4gICAgLy8gaWYgLmV4dC1yZWFjdHJjIGZpbGUgZXhpc3RzLCBjb25zdW1lIGl0IGFuZCBhcHBseSBpdCB0byBjb25maWcgb3B0aW9ucy5cbiAgICBjb25zdCBleHRSZWFjdFJjID0gKGZzLmV4aXN0c1N5bmMoJy5leHQtcmVhY3RyYycpICYmIEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKCcuZXh0LXJlYWN0cmMnLCAndXRmLTgnKSkgfHwge30pO1xuXG4gICAgb3B0aW9ucyA9IHsgLi4udGhpcy5nZXREZWZhdWx0T3B0aW9ucygpLCAuLi5vcHRpb25zLCAuLi5leHRSZWFjdFJjIH07XG4gICAgY29uc3QgeyBidWlsZHMgfSA9IG9wdGlvbnM7XG5cbiAgICBpZiAoT2JqZWN0LmtleXMoYnVpbGRzKS5sZW5ndGggPT09IDApIHtcbiAgICAgIGNvbnN0IHsgYnVpbGRzLCAuLi5idWlsZE9wdGlvbnMgfSA9IG9wdGlvbnM7XG4gICAgICBidWlsZHMuZXh0ID0gYnVpbGRPcHRpb25zO1xuICAgIH1cblxuICAgIGZvciAobGV0IG5hbWUgaW4gYnVpbGRzKVxuICAgICAgdGhpcy5fdmFsaWRhdGVCdWlsZENvbmZpZyhuYW1lLCBidWlsZHNbbmFtZV0pO1xuXG4gICAgT2JqZWN0LmFzc2lnbih0aGlzLCB7XG4gICAgICAuLi5vcHRpb25zLFxuICAgICAgY3VycmVudEZpbGU6IG51bGwsXG4gICAgICBtYW5pZmVzdDogbnVsbCxcbiAgICAgIGRlcGVuZGVuY2llczogW11cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZWZhdWx0IGNvbmZpZyBvcHRpb25zXG4gICAqIEBwcm90ZWN0ZWRcbiAgICogQHJldHVybiB7T2JqZWN0fVxuICAgKi9cbiAgZ2V0RGVmYXVsdE9wdGlvbnMoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGJ1aWxkczoge30sXG4gICAgICBkZWJ1ZzogZmFsc2UsXG4gICAgICB3YXRjaDogZmFsc2UsXG4gICAgICB0ZXN0OiAvXFwuKGp8dClzeD8kLyxcblxuICAgICAgLyogYmVnaW4gc2luZ2xlIGJ1aWxkIG9ubHkgKi9cbiAgICAgIG91dHB1dDogJ2V4dC1yZWFjdCcsXG4gICAgICB0b29sa2l0OiAnbW9kZXJuJyxcbiAgICAgIHBhY2thZ2VzOiBudWxsLFxuICAgICAgcGFja2FnZURpcnM6IFtdLFxuICAgICAgb3ZlcnJpZGVzOiBbXSxcbiAgICAgIGFzeW5jaHJvbm91czogZmFsc2UsXG4gICAgICBwcm9kdWN0aW9uOiBmYWxzZSxcbiAgICAgIG1hbmlmZXN0RXh0cmFjdG9yOiBleHRyYWN0RnJvbUpTWCxcbiAgICAgIHRyZWVTaGFraW5nOiB0cnVlXG4gICAgICAvKiBlbmQgc2luZ2xlIGJ1aWxkIG9ubHkgKi9cbiAgICB9XG4gIH1cblxuICB3YXRjaFJ1bigpIHtcbiAgICB0aGlzLndhdGNoID0gdHJ1ZVxuICB9XG5cbiAgc3VjY2VlZE1vZHVsZShjb21waWxhdGlvbiwgbW9kdWxlKSB7XG4gICAgdGhpcy5jdXJyZW50RmlsZSA9IG1vZHVsZS5yZXNvdXJjZTtcbiAgICBpZiAobW9kdWxlLnJlc291cmNlICYmIG1vZHVsZS5yZXNvdXJjZS5tYXRjaCh0aGlzLnRlc3QpICYmICFtb2R1bGUucmVzb3VyY2UubWF0Y2goL25vZGVfbW9kdWxlcy8pICYmICFtb2R1bGUucmVzb3VyY2UubWF0Y2goYC9yZWFjdG9yJHtyZWFjdFZlcnNpb259L2ApKSB7XG4gICAgICBjb25zdCBkb1BhcnNlID0gKCkgPT4ge1xuICAgICAgICB0aGlzLmRlcGVuZGVuY2llc1t0aGlzLmN1cnJlbnRGaWxlXSA9IFtcbiAgICAgICAgICAuLi4odGhpcy5kZXBlbmRlbmNpZXNbdGhpcy5jdXJyZW50RmlsZV0gfHwgW10pLFxuICAgICAgICAgIC4uLnRoaXMubWFuaWZlc3RFeHRyYWN0b3IobW9kdWxlLl9zb3VyY2UuX3ZhbHVlLCBjb21waWxhdGlvbiwgbW9kdWxlLCByZWFjdFZlcnNpb24pXG4gICAgICAgIF07XG4gICAgICB9O1xuICAgICAgaWYgKHRoaXMuZGVidWcpIHtcbiAgICAgICAgZG9QYXJzZSgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdHJ5IHsgZG9QYXJzZSgpOyB9IGNhdGNoIChlKSBcbiAgICAgICAgeyBcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCdcXG5lcnJvciBwYXJzaW5nICcgKyB0aGlzLmN1cnJlbnRGaWxlKTsgXG4gICAgICAgICAgY29uc29sZS5lcnJvcihlKTsgXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBlbWl0KGNvbXBpbGVyLCBjb21waWxhdGlvbiwgY2FsbGJhY2spIHtcbiAgICB2YXIgaXNXZWJwYWNrNCA9IGNvbXBpbGF0aW9uLmhvb2tzO1xuICAgIHZhciBtb2R1bGVzID0gW11cbiAgICBpZiAoaXNXZWJwYWNrNCkge1xuICAgICAgaXNXZWJwYWNrNCA9IHRydWVcbiAgICAgIG1vZHVsZXMgPSBjb21waWxhdGlvbi5jaHVua3MucmVkdWNlKChhLCBiKSA9PiBhLmNvbmNhdChiLl9tb2R1bGVzKSwgW10pO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGlzV2VicGFjazQgPSBmYWxzZVxuICAgICAgbW9kdWxlcyA9IGNvbXBpbGF0aW9uLmNodW5rcy5yZWR1Y2UoKGEsIGIpID0+IGEuY29uY2F0KGIubW9kdWxlcyksIFtdKTtcbiAgICB9XG4gICAgLy9jb25zdCBtb2R1bGVzID0gY29tcGlsYXRpb24uY2h1bmtzLnJlZHVjZSgoYSwgYikgPT4gYS5jb25jYXQoYi5tb2R1bGVzKSwgW10pO1xuICAgIGNvbnN0IGJ1aWxkID0gdGhpcy5idWlsZHNbT2JqZWN0LmtleXModGhpcy5idWlsZHMpWzBdXTtcbiAgICBsZXQgb3V0cHV0UGF0aCA9IHBhdGguam9pbihjb21waWxlci5vdXRwdXRQYXRoLCB0aGlzLm91dHB1dCk7XG4gICAgLy9jb25zb2xlLmxvZygnXFxuKioqKipvdXRwdXRQYXRoOiAnICsgb3V0cHV0UGF0aClcbiAgICAvL2NvbnNvbGUubG9nKCdcXG4qKioqKnRoaXMub3V0cHV0OiAnICsgdGhpcy5vdXRwdXQpXG4gICAgLy8gd2VicGFjay1kZXYtc2VydmVyIG92ZXJ3cml0ZXMgdGhlIG91dHB1dFBhdGggdG8gXCIvXCIsIHNvIHdlIG5lZWQgdG8gcHJlcGVuZCBjb250ZW50QmFzZVxuICAgIGlmIChjb21waWxlci5vdXRwdXRQYXRoID09PSAnLycgJiYgY29tcGlsZXIub3B0aW9ucy5kZXZTZXJ2ZXIpIHtcbiAgICAgICAgb3V0cHV0UGF0aCA9IHBhdGguam9pbihjb21waWxlci5vcHRpb25zLmRldlNlcnZlci5jb250ZW50QmFzZSwgb3V0cHV0UGF0aCk7XG4gICAgfVxuICAgIC8vIHRoZSBmb2xsb3dpbmcgaXMgbmVlZGVkIGZvciBodG1sLXdlYnBhY2stcGx1Z2luIHRvIGluY2x1ZGUgPHNjcmlwdD4gYW5kIDxsaW5rPiB0YWdzIGZvciBFeHRSZWFjdFxuICAgIGNvbnN0IGpzQ2h1bmsgPSBjb21waWxhdGlvbi5hZGRDaHVuayhgJHt0aGlzLm91dHB1dH0tanNgKTtcbiAgICBqc0NodW5rLmhhc1J1bnRpbWUgPSBqc0NodW5rLmlzSW5pdGlhbCA9ICgpID0+IHRydWU7XG4gICAganNDaHVuay5maWxlcy5wdXNoKHBhdGguam9pbih0aGlzLm91dHB1dCwgJ2V4dC5qcycpKTtcbiAgICBqc0NodW5rLmZpbGVzLnB1c2gocGF0aC5qb2luKHRoaXMub3V0cHV0LCAnZXh0LmNzcycpKTtcbiAgICBqc0NodW5rLmlkID0gLTI7IC8vIHRoaXMgZm9yY2VzIGh0bWwtd2VicGFjay1wbHVnaW4gdG8gaW5jbHVkZSBleHQuanMgZmlyc3RcbiAgICAvL2lmICh0aGlzLmFzeW5jaHJvbm91cykgY2FsbGJhY2soKTtcbi8vICAgIGNvbnNvbGUubG9nKGNhbGxiYWNrKVxuICAgIGlmIChjYWxsYmFjayAhPSBudWxsKSBcbiAgICAgIHtcbiAgICAgICAgaWYgKHRoaXMuYXN5bmNocm9ub3VzKSBcbiAgICAgICAge2NhbGxiYWNrKCl9XG4gICAgICB9XG5cbi8vICAgIGNvbnNvbGUubG9nKG1vZHVsZXMpXG4vLyAgICBjb25zb2xlLmxvZyhvdXRwdXRQYXRoKVxuLy8gICAgY29uc29sZS5sb2coYnVpbGQpXG5cbiAgdGhpcy5fYnVpbGRFeHRCdW5kbGUoaXNXZWJwYWNrNCwgJ2V4dCcsIG1vZHVsZXMsIG91dHB1dFBhdGgsIGJ1aWxkKVxuICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZygnaW4gdGhlbicpXG4gICAgICAgIC8vIGNvbnN0IGNzc1ZhclBhdGggPSBwYXRoLmpvaW4odGhpcy5vdXRwdXQsICdjc3MtdmFycy5qcycpO1xuXG4gICAgICAgIC8vIGlmIChmcy5leGlzdHNTeW5jKHBhdGguam9pbihvdXRwdXRQYXRoLCAnY3NzLXZhcnMuanMnKSkpIHtcbiAgICAgICAgLy8gICAgIGNvbnN0IGNzc1ZhckNodW5rID0gY29tcGlsYXRpb24uYWRkQ2h1bmsoYCR7dGhpcy5vdXRwdXR9LWNzcy12YXJzYCk7XG4gICAgICAgIC8vICAgICBjc3NWYXJDaHVuay5oYXNSdW50aW1lID0gY3NzVmFyQ2h1bmsuaXNJbml0aWFsID0gKCkgPT4gdHJ1ZTtcbiAgICAgICAgLy8gICAgIGNzc1ZhckNodW5rLmZpbGVzLnB1c2goY3NzVmFyUGF0aCk7XG4gICAgICAgIC8vICAgICBjc3NWYXJDaHVuay5pZCA9IC0xO1xuICAgICAgICAvLyB9XG4gICAgICAgIC8vIXRoaXMuYXN5bmNocm9ub3VzICYmIGNhbGxiYWNrKCk7XG4vLyAgICAgICAgY29uc29sZS5sb2coY2FsbGJhY2spXG4gICAgICAgIGlmIChjYWxsYmFjayAhPSBudWxsKSBcbiAgICAgICAgICB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuYXN5bmNocm9ub3VzKSBcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLmNhdGNoKGUgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZyhlKVxuICAgICAgICBjb21waWxhdGlvbi5lcnJvcnMucHVzaChuZXcgRXJyb3IoJ1tAZXh0anMvcmVhY3Rvci13ZWJwYWNrLXBsdWdpbl06ICcgKyBlLnRvU3RyaW5nKCkpKTtcbiAgICAgICAgLy8hdGhpcy5hc3luY2hyb25vdXMgJiYgY2FsbGJhY2soKTtcbi8vICAgICAgICBjb25zb2xlLmxvZyhjYWxsYmFjaylcbiAgICAgICAgaWYgKGNhbGxiYWNrICE9IG51bGwpIFxuICAgICAgICB7XG4gICAgICAgICAgaWYgKCF0aGlzLmFzeW5jaHJvbm91cykgXG4gICAgICAgICAge1xuICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pXG4gIH1cblxuXG4gIGFwcGx5KGNvbXBpbGVyKSB7XG5cbiAgICBpZiAodGhpcy53ZWJwYWNrVmVyc2lvbiA9PSB1bmRlZmluZWQpIHtcbiAgICAgIGNvbnN0IGlzV2VicGFjazQgPSBjb21waWxlci5ob29rcztcbiAgICAgIGlmIChpc1dlYnBhY2s0KSB7dGhpcy53ZWJwYWNrVmVyc2lvbiA9ICdJUyB3ZWJwYWNrIDQnfVxuICAgICAgZWxzZSB7dGhpcy53ZWJwYWNrVmVyc2lvbiA9ICdOT1Qgd2VicGFjayA0J31cbiAgICAgIHJlYWRsaW5lLmN1cnNvclRvKHByb2Nlc3Muc3Rkb3V0LCAwKTtjb25zb2xlLmxvZyhhcHAgKyAncmVhY3RWZXJzaW9uOiAnICsgdGhpcy5yZWFjdFZlcnNpb24gKyAnLCAnICsgdGhpcy53ZWJwYWNrVmVyc2lvbilcbiAgICB9XG5cbiAgICBjb25zdCBtZSA9IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBBZGRzIHRoZSBjb2RlIGZvciB0aGUgc3BlY2lmaWVkIGZ1bmN0aW9uIGNhbGwgdG8gdGhlIG1hbmlmZXN0LmpzIGZpbGVcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gY2FsbCBBIGZ1bmN0aW9uIGNhbGwgQVNUIG5vZGUuXG4gICAgICovXG4gICAgY29uc3QgYWRkVG9NYW5pZmVzdCA9IGZ1bmN0aW9uKGNhbGwpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGZpbGUgPSB0aGlzLnN0YXRlLm1vZHVsZS5yZXNvdXJjZTtcbiAgICAgICAgbWUuZGVwZW5kZW5jaWVzW2ZpbGVdID0gWyAuLi4obWUuZGVwZW5kZW5jaWVzW2ZpbGVdIHx8IFtdKSwgZ2VuZXJhdGUoY2FsbCkgXTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihgRXJyb3IgcHJvY2Vzc2luZyAke2ZpbGV9YCk7XG4gICAgICB9XG4gICAgfTtcblxuXG5cblxuICAgIGlmIChjb21waWxlci5ob29rcykge1xuICAgICAgaWYgKHRoaXMuYXN5bmNocm9ub3VzKSB7XG4gICAgICAgIGNvbXBpbGVyLmhvb2tzLndhdGNoUnVuLnRhcEFzeW5jKCdleHRyZWFjdC13YXRjaC1ydW4gKGFzeW5jKScsICh3YXRjaGluZywgY2IpID0+IHtcbiAgICAgICAgICByZWFkbGluZS5jdXJzb3JUbyhwcm9jZXNzLnN0ZG91dCwgMCk7Y29uc29sZS5sb2coYXBwICsgJ2V4dHJlYWN0LXdhdGNoLXJ1biAoYXN5bmMpJylcbiAgICAgICAgICB0aGlzLndhdGNoUnVuKClcbiAgICAgICAgICBjYigpXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgY29tcGlsZXIuaG9va3Mud2F0Y2hSdW4udGFwKCdleHRyZWFjdC13YXRjaC1ydW4nLCAod2F0Y2hpbmcpID0+IHtcbiAgICAgICAgICByZWFkbGluZS5jdXJzb3JUbyhwcm9jZXNzLnN0ZG91dCwgMCk7Y29uc29sZS5sb2coYXBwICsgJ2V4dHJlYWN0LXdhdGNoLXJ1bicpXG4gICAgICAgICAgdGhpcy53YXRjaFJ1bigpXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgY29tcGlsZXIucGx1Z2luKCd3YXRjaC1ydW4nLCAod2F0Y2hpbmcsIGNiKSA9PiB7XG4gICAgICAgIHJlYWRsaW5lLmN1cnNvclRvKHByb2Nlc3Muc3Rkb3V0LCAwKTtjb25zb2xlLmxvZyhhcHAgKyAnd2F0Y2gtcnVuJylcbiAgICAgICAgdGhpcy53YXRjaFJ1bigpXG4gICAgICAgIGNiKClcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIGV4dHJhY3QgeHR5cGVzIGZyb20gSlNYIHRhZ3NcbiAgICBpZiAoY29tcGlsZXIuaG9va3MpIHtcbiAgICAgIGNvbXBpbGVyLmhvb2tzLmNvbXBpbGF0aW9uLnRhcCgnZXh0cmVhY3QtY29tcGlsYXRpb24nLCAoY29tcGlsYXRpb24pID0+IHtcbiAgICAgICAgcmVhZGxpbmUuY3Vyc29yVG8ocHJvY2Vzcy5zdGRvdXQsIDApO2NvbnNvbGUubG9nKGFwcCArICdleHRyZWFjdC1jb21waWxhdGlvbicpXG4gICAgICAgIGNvbXBpbGF0aW9uLmhvb2tzLnN1Y2NlZWRNb2R1bGUudGFwKCdleHRyZWFjdC1zdWNjZWVkLW1vZHVsZScsIChtb2R1bGUpID0+IHtcbiAgICAgICAgICB0aGlzLnN1Y2NlZWRNb2R1bGUoY29tcGlsYXRpb24sIG1vZHVsZSlcbiAgICAgICAgfSlcblxuICAgICAgICAvLyBkYXRhLm5vcm1hbE1vZHVsZUZhY3RvcnkucGx1Z2luKFwicGFyc2VyXCIsIGZ1bmN0aW9uKHBhcnNlciwgb3B0aW9ucykge1xuICAgICAgICAvLyAgIC8vIGV4dHJhY3QgeHR5cGVzIGFuZCBjbGFzc2VzIGZyb20gRXh0LmNyZWF0ZSBjYWxsc1xuICAgICAgICAvLyAgIHBhcnNlci5wbHVnaW4oJ2NhbGwgRXh0LmNyZWF0ZScsIGFkZFRvTWFuaWZlc3QpO1xuICAgICAgICAvLyAgIC8vIGNvcHkgRXh0LnJlcXVpcmUgY2FsbHMgdG8gdGhlIG1hbmlmZXN0LiAgVGhpcyBhbGxvd3MgdGhlIHVzZXJzIHRvIGV4cGxpY2l0bHkgcmVxdWlyZSBhIGNsYXNzIGlmIHRoZSBwbHVnaW4gZmFpbHMgdG8gZGV0ZWN0IGl0LlxuICAgICAgICAvLyAgIHBhcnNlci5wbHVnaW4oJ2NhbGwgRXh0LnJlcXVpcmUnLCBhZGRUb01hbmlmZXN0KTtcbiAgICAgICAgLy8gICAvLyBjb3B5IEV4dC5kZWZpbmUgY2FsbHMgdG8gdGhlIG1hbmlmZXN0LiAgVGhpcyBhbGxvd3MgdXNlcnMgdG8gd3JpdGUgc3RhbmRhcmQgRXh0UmVhY3QgY2xhc3Nlcy5cbiAgICAgICAgLy8gICBwYXJzZXIucGx1Z2luKCdjYWxsIEV4dC5kZWZpbmUnLCBhZGRUb01hbmlmZXN0KTtcbiAgICAgICAgLy8gfSlcblxuICAgICAgfSlcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBjb21waWxlci5wbHVnaW4oJ2NvbXBpbGF0aW9uJywgKGNvbXBpbGF0aW9uLCBkYXRhKSA9PiB7XG4gICAgICAgIHJlYWRsaW5lLmN1cnNvclRvKHByb2Nlc3Muc3Rkb3V0LCAwKTtjb25zb2xlLmxvZyhhcHAgKyAnY29tcGlsYXRpb24nKVxuICAgICAgICBjb21waWxhdGlvbi5wbHVnaW4oJ3N1Y2NlZWQtbW9kdWxlJywgKG1vZHVsZSkgPT4ge1xuICAgICAgICAgIHRoaXMuc3VjY2VlZE1vZHVsZShjb21waWxhdGlvbiwgbW9kdWxlKVxuICAgICAgICB9KVxuXG4gICAgICAgIGRhdGEubm9ybWFsTW9kdWxlRmFjdG9yeS5wbHVnaW4oXCJwYXJzZXJcIiwgZnVuY3Rpb24ocGFyc2VyLCBvcHRpb25zKSB7XG4gICAgICAgICAgLy8gZXh0cmFjdCB4dHlwZXMgYW5kIGNsYXNzZXMgZnJvbSBFeHQuY3JlYXRlIGNhbGxzXG4gICAgICAgICAgcGFyc2VyLnBsdWdpbignY2FsbCBFeHQuY3JlYXRlJywgYWRkVG9NYW5pZmVzdCk7XG4gICAgICAgICAgLy8gY29weSBFeHQucmVxdWlyZSBjYWxscyB0byB0aGUgbWFuaWZlc3QuICBUaGlzIGFsbG93cyB0aGUgdXNlcnMgdG8gZXhwbGljaXRseSByZXF1aXJlIGEgY2xhc3MgaWYgdGhlIHBsdWdpbiBmYWlscyB0byBkZXRlY3QgaXQuXG4gICAgICAgICAgcGFyc2VyLnBsdWdpbignY2FsbCBFeHQucmVxdWlyZScsIGFkZFRvTWFuaWZlc3QpO1xuICAgICAgICAgIC8vIGNvcHkgRXh0LmRlZmluZSBjYWxscyB0byB0aGUgbWFuaWZlc3QuICBUaGlzIGFsbG93cyB1c2VycyB0byB3cml0ZSBzdGFuZGFyZCBFeHRSZWFjdCBjbGFzc2VzLlxuICAgICAgICAgIHBhcnNlci5wbHVnaW4oJ2NhbGwgRXh0LmRlZmluZScsIGFkZFRvTWFuaWZlc3QpO1xuICAgICAgICB9KVxuXG4gICAgICB9KVxuICAgIH1cblxuICAgIC8vIG9uY2UgYWxsIG1vZHVsZXMgYXJlIHByb2Nlc3NlZCwgY3JlYXRlIHRoZSBvcHRpbWl6ZWQgRXh0UmVhY3QgYnVpbGQuXG4gICAgaWYgKGNvbXBpbGVyLmhvb2tzKSB7XG4gICAgICBpZiAodGhpcy5hc3luY2hyb25vdXMpIHtcbiAgICAgICAgY29tcGlsZXIuaG9va3MuZW1pdC50YXBBc3luYygnZXh0cmVhY3QtZW1pdCAoYXN5bmMpJywgKGNvbXBpbGF0aW9uLCBjYikgPT4ge1xuICAgICAgICAgIHJlYWRsaW5lLmN1cnNvclRvKHByb2Nlc3Muc3Rkb3V0LCAwKTtjb25zb2xlLmxvZyhhcHAgKyAnZXh0cmVhY3QtZW1pdCcpXG4gICAgICAgICAgdGhpcy5lbWl0KGNvbXBpbGVyLCBjb21waWxhdGlvbiwgY2IpXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgY29tcGlsZXIuaG9va3MuZW1pdC50YXAoJ2V4dHJlYWN0LWVtaXQnLCAoY29tcGlsYXRpb24pID0+IHtcbiAgICAgICAgICByZWFkbGluZS5jdXJzb3JUbyhwcm9jZXNzLnN0ZG91dCwgMCk7Y29uc29sZS5sb2coYXBwICsgJ2V4dHJlYWN0LWVtaXQnKVxuICAgICAgICAgIHRoaXMuZW1pdChjb21waWxlciwgY29tcGlsYXRpb24sIG51bGwpXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgY29tcGlsZXIucGx1Z2luKCdlbWl0JywgKGNvbXBpbGF0aW9uLCBjYWxsYmFjaykgPT4ge1xuICAgICAgICByZWFkbGluZS5jdXJzb3JUbyhwcm9jZXNzLnN0ZG91dCwgMCk7Y29uc29sZS5sb2coYXBwICsgJ2VtaXQnKVxuICAgICAgICB0aGlzLmVtaXQoY29tcGlsZXIsIGNvbXBpbGF0aW9uLCBjYWxsYmFjaylcbiAgICAgIH0pXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrcyBlYWNoIGJ1aWxkIGNvbmZpZyBmb3IgbWlzc2luZy9pbnZhbGlkIHByb3BlcnRpZXNcbiAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgVGhlIG5hbWUgb2YgdGhlIGJ1aWxkXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBidWlsZCBUaGUgYnVpbGQgY29uZmlnXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfdmFsaWRhdGVCdWlsZENvbmZpZyhuYW1lLCBidWlsZCkge1xuICAgIGxldCB7IHNkaywgcHJvZHVjdGlvbiB9ID0gYnVpbGQ7XG5cbiAgICBpZiAocHJvZHVjdGlvbikge1xuICAgICAgYnVpbGQudHJlZVNoYWtpbmcgPSB0cnVlO1xuICAgIH1cbiAgICBpZiAoc2RrKSB7XG4gICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoc2RrKSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgTm8gU0RLIGZvdW5kIGF0ICR7cGF0aC5yZXNvbHZlKHNkayl9LiAgRGlkIHlvdSBmb3IgZ2V0IHRvIGxpbmsvY29weSB5b3VyIEV4dCBKUyBTREsgdG8gdGhhdCBsb2NhdGlvbj9gKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5fYWRkUmVhY3RvclBhY2thZ2UoYnVpbGQpXG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGJ1aWxkLnNkayA9IHBhdGguZGlybmFtZShyZXNvbHZlKCdAZXh0anMvZXh0LXJlYWN0JywgeyBiYXNlZGlyOiBwcm9jZXNzLmN3ZCgpIH0pKVxuICAgICAgICBidWlsZC5wYWNrYWdlRGlycyA9IFsuLi4oYnVpbGQucGFja2FnZURpcnMgfHwgW10pLCBwYXRoLmRpcm5hbWUoYnVpbGQuc2RrKV07XG4gICAgICAgIGJ1aWxkLnBhY2thZ2VzID0gYnVpbGQucGFja2FnZXMgfHwgdGhpcy5fZmluZFBhY2thZ2VzKGJ1aWxkLnNkayk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgQGV4dGpzL2V4dC1yZWFjdCBub3QgZm91bmQuICBZb3UgY2FuIGluc3RhbGwgaXQgd2l0aCBcIm5wbSBpbnN0YWxsIC0tc2F2ZSBAZXh0anMvZXh0LXJlYWN0XCIgb3IsIGlmIHlvdSBoYXZlIGEgbG9jYWwgY29weSBvZiB0aGUgU0RLLCBzcGVjaWZ5IHRoZSBwYXRoIHRvIGl0IHVzaW5nIHRoZSBcInNka1wiIG9wdGlvbiBpbiBidWlsZCBcIiR7bmFtZX0uXCJgKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQWRkcyB0aGUgcmVhY3RvciBwYWNrYWdlIGlmIHByZXNlbnQgYW5kIHRoZSB0b29sa2l0IGlzIG1vZGVyblxuICAgKiBAcGFyYW0ge09iamVjdH0gYnVpbGQgXG4gICAqL1xuICBfYWRkUmVhY3RvclBhY2thZ2UoYnVpbGQpIHtcbiAgICBpZiAoYnVpbGQudG9vbGtpdCA9PT0gJ2NsYXNzaWMnKSByZXR1cm47XG4gICAgaWYgKGZzLmV4aXN0c1N5bmMocGF0aC5qb2luKGJ1aWxkLnNkaywgJ2V4dCcsICdtb2Rlcm4nLCAncmVhY3RvcicpKSB8fCAgLy8gcmVwb1xuICAgICAgZnMuZXhpc3RzU3luYyhwYXRoLmpvaW4oYnVpbGQuc2RrLCAnbW9kZXJuJywgJ3JlYWN0b3InKSkpIHsgLy8gcHJvZHVjdGlvbiBidWlsZFxuICAgICAgaWYgKCFidWlsZC5wYWNrYWdlcykge1xuICAgICAgICBidWlsZC5wYWNrYWdlcyA9IFtdO1xuICAgICAgfVxuICAgICAgYnVpbGQucGFja2FnZXMucHVzaCgncmVhY3RvcicpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm4gdGhlIG5hbWVzIG9mIGFsbCBFeHRSZWFjdCBwYWNrYWdlcyBpbiB0aGUgc2FtZSBwYXJlbnQgZGlyZWN0b3J5IGFzIGV4dC1yZWFjdCAodHlwaWNhbGx5IG5vZGVfbW9kdWxlcy9AZXh0anMpXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBzZGsgUGF0aCB0byBleHQtcmVhY3RcbiAgICogQHJldHVybiB7U3RyaW5nW119XG4gICAqL1xuICBfZmluZFBhY2thZ2VzKHNkaykge1xuICAgIGNvbnN0IG1vZHVsZXNEaXIgPSBwYXRoLmpvaW4oc2RrLCAnLi4nKTtcbiAgICByZXR1cm4gZnMucmVhZGRpclN5bmMobW9kdWxlc0RpcilcbiAgICAgIC8vIEZpbHRlciBvdXQgZGlyZWN0b3JpZXMgd2l0aG91dCAncGFja2FnZS5qc29uJ1xuICAgICAgLmZpbHRlcihkaXIgPT4gZnMuZXhpc3RzU3luYyhwYXRoLmpvaW4obW9kdWxlc0RpciwgZGlyLCAncGFja2FnZS5qc29uJykpKVxuICAgICAgLy8gR2VuZXJhdGUgYXJyYXkgb2YgcGFja2FnZSBuYW1lc1xuICAgICAgLm1hcChkaXIgPT4ge1xuICAgICAgICAgIGNvbnN0IHBhY2thZ2VJbmZvID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMocGF0aC5qb2luKG1vZHVsZXNEaXIsIGRpciwgJ3BhY2thZ2UuanNvbicpKSk7XG4gICAgICAgICAgLy8gRG9uJ3QgaW5jbHVkZSB0aGVtZSB0eXBlIHBhY2thZ2VzLlxuICAgICAgICAgIGlmKHBhY2thZ2VJbmZvLnNlbmNoYSAmJiBwYWNrYWdlSW5mby5zZW5jaGEudHlwZSAhPT0gJ3RoZW1lJykge1xuICAgICAgICAgICAgICByZXR1cm4gcGFja2FnZUluZm8uc2VuY2hhLm5hbWU7XG4gICAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC8vIFJlbW92ZSBhbnkgdW5kZWZpbmVkcyBmcm9tIG1hcFxuICAgICAgLmZpbHRlcihuYW1lID0+IG5hbWUpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIHBhdGggdG8gdGhlIHNlbmNoYSBjbWQgZXhlY3V0YWJsZVxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcmV0dXJuIHtTdHJpbmd9XG4gICAqL1xuICBfZ2V0U2VuY2hDbWRQYXRoKCkge1xuICAgIHRyeSB7XG4gICAgICAvLyB1c2UgQGV4dGpzL3NlbmNoYS1jbWQgZnJvbSBub2RlX21vZHVsZXNcbiAgICAgIHJldHVybiByZXF1aXJlKCdAZXh0anMvc2VuY2hhLWNtZCcpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIC8vIGF0dGVtcHQgdG8gdXNlIGdsb2JhbGx5IGluc3RhbGxlZCBTZW5jaGEgQ21kXG4gICAgICByZXR1cm4gJ3NlbmNoYSc7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAvKipcbiAgICAqIEJ1aWxkcyBhIG1pbmltYWwgdmVyc2lvbiBvZiB0aGUgRXh0UmVhY3QgZnJhbWV3b3JrIGJhc2VkIG9uIHRoZSBjbGFzc2VzIHVzZWRcbiAgICAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIFRoZSBuYW1lIG9mIHRoZSBidWlsZFxuICAgICogQHBhcmFtIHtNb2R1bGVbXX0gbW9kdWxlcyB3ZWJwYWNrIG1vZHVsZXNcbiAgICAqIEBwYXJhbSB7U3RyaW5nfSBvdXRwdXQgVGhlIHBhdGggdG8gd2hlcmUgdGhlIGZyYW1ld29yayBidWlsZCBzaG91bGQgYmUgd3JpdHRlblxuICAgICogQHBhcmFtIHtTdHJpbmd9IFt0b29sa2l0PSdtb2Rlcm4nXSBcIm1vZGVyblwiIG9yIFwiY2xhc3NpY1wiXG4gICAgKiBAcGFyYW0ge1N0cmluZ30gb3V0cHV0IFRoZSBwYXRoIHRvIHRoZSBkaXJlY3RvcnkgdG8gY3JlYXRlIHdoaWNoIHdpbGwgY29udGFpbiB0aGUganMgYW5kIGNzcyBidW5kbGVzXG4gICAgKiBAcGFyYW0ge1N0cmluZ30gdGhlbWUgVGhlIG5hbWUgb2YgdGhlIEV4dFJlYWN0IHRoZW1lIHBhY2thZ2UgdG8gdXNlLCBmb3IgZXhhbXBsZSBcInRoZW1lLW1hdGVyaWFsXCJcbiAgICAqIEBwYXJhbSB7U3RyaW5nW119IHBhY2thZ2VzIEFuIGFycmF5IG9mIEV4dFJlYWN0IHBhY2thZ2VzIHRvIGluY2x1ZGVcbiAgICAqIEBwYXJhbSB7U3RyaW5nW119IHBhY2thZ2VEaXJzIERpcmVjdG9yaWVzIGNvbnRhaW5pbmcgcGFja2FnZXNcbiAgICAqIEBwYXJhbSB7U3RyaW5nW119IG92ZXJyaWRlcyBBbiBhcnJheSBvZiBsb2NhdGlvbnMgZm9yIG92ZXJyaWRlc1xuICAgICogQHBhcmFtIHtTdHJpbmd9IHNkayBUaGUgZnVsbCBwYXRoIHRvIHRoZSBFeHRSZWFjdCBTREtcbiAgICAqIEBwcml2YXRlXG4gICAgKi9cbiAgX2J1aWxkRXh0QnVuZGxlKGlzV2VicGFjazQsIG5hbWUsIG1vZHVsZXMsIG91dHB1dCwgeyB0b29sa2l0PSdtb2Rlcm4nLCB0aGVtZSwgcGFja2FnZXM9W10sIHBhY2thZ2VEaXJzPVtdLCBzZGssIG92ZXJyaWRlc30pIHtcbi8vICAgICBjb25zb2xlLmxvZyhtb2R1bGVzKVxuICAgICBjb25zb2xlLmxvZygnKioqKionKVxuICAgICBjb25zb2xlLmxvZyhpc1dlYnBhY2s0KVxuICAgICBjb25zb2xlLmxvZygnKioqKionKVxuXG4gICAgbGV0IHNlbmNoYSA9IHRoaXMuX2dldFNlbmNoQ21kUGF0aCgpO1xuICAgIHRoZW1lID0gdGhlbWUgfHwgKHRvb2xraXQgPT09ICdjbGFzc2ljJyA/ICd0aGVtZS10cml0b24nIDogJ3RoZW1lLW1hdGVyaWFsJyk7XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgdGhpcy5vbkJ1aWxkRmFpbCA9IHJlamVjdDtcbiAgICAgIHRoaXMub25CdWlsZFN1Y2Nlc3MgPSByZXNvbHZlO1xuXG4gICAgICBjbWRFcnJvcnMgPSBbXTtcbiAgICAgIFxuICAgICAgY29uc3Qgb25CdWlsZERvbmUgPSAoKSA9PiB7XG4gICAgICAgIGlmIChjbWRFcnJvcnMubGVuZ3RoKSB7XG4gICAgICAgICAgdGhpcy5vbkJ1aWxkRmFpbChuZXcgRXJyb3IoY21kRXJyb3JzLmpvaW4oXCJcIikpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLm9uQnVpbGRTdWNjZXNzKCk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIGlmICghd2F0Y2hpbmcpIHtcbiAgICAgICAgcmltcmFmKG91dHB1dCk7XG4gICAgICAgIG1rZGlycChvdXRwdXQpO1xuICAgICAgfVxuXG4gICAgICBsZXQganM7XG5cbiAgICAgIGlmICh0aGlzLnRyZWVTaGFraW5nKSB7XG4gICAgICAgIGxldCBzdGF0ZW1lbnRzID0gWydFeHQucmVxdWlyZShbXCJFeHQuYXBwLkFwcGxpY2F0aW9uXCIsIFwiRXh0LkNvbXBvbmVudFwiLCBcIkV4dC5XaWRnZXRcIiwgXCJFeHQubGF5b3V0LkZpdFwiXSknXTsgLy8gZm9yIHNvbWUgcmVhc29uIGNvbW1hbmQgZG9lc24ndCBsb2FkIGNvbXBvbmVudCB3aGVuIG9ubHkgcGFuZWwgaXMgcmVxdWlyZWRcbiAgICAgICAgaWYgKHBhY2thZ2VzLmluZGV4T2YoJ3JlYWN0b3InKSAhPT0gLTEpIHtcbiAgICAgICAgICBzdGF0ZW1lbnRzLnB1c2goJ0V4dC5yZXF1aXJlKFwiRXh0LnJlYWN0b3IuUmVuZGVyZXJDZWxsXCIpJyk7XG4gICAgICAgIH1cbiAgICAgICAgLy9tamdcbiAgICAgICAgZm9yIChsZXQgbW9kdWxlIG9mIG1vZHVsZXMpIHtcbiAgICAgICAgICBjb25zdCBkZXBzID0gdGhpcy5kZXBlbmRlbmNpZXNbbW9kdWxlLnJlc291cmNlXTtcbiAgICAgICAgICBpZiAoZGVwcykgc3RhdGVtZW50cyA9IHN0YXRlbWVudHMuY29uY2F0KGRlcHMpO1xuICAgICAgICB9XG4gICAgICAgIGpzID0gc3RhdGVtZW50cy5qb2luKCc7XFxuJyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBqcyA9ICdFeHQucmVxdWlyZShcIkV4dC4qXCIpJztcbiAgICAgIH1cbiAgICAgIGNvbnN0IG1hbmlmZXN0ID0gcGF0aC5qb2luKG91dHB1dCwgJ21hbmlmZXN0LmpzJyk7XG4gICAgICAvLyBhZGQgZXh0LXJlYWN0L3BhY2thZ2VzIGF1dG9tYXRpY2FsbHkgaWYgcHJlc2VudFxuICAgICAgY29uc3QgdXNlclBhY2thZ2VzID0gcGF0aC5qb2luKCcuJywgJ2V4dC1yZWFjdCcsICdwYWNrYWdlcycpO1xuICAgICAgaWYgKGZzLmV4aXN0c1N5bmModXNlclBhY2thZ2VzKSkge1xuICAgICAgICBwYWNrYWdlRGlycy5wdXNoKHVzZXJQYWNrYWdlcylcbiAgICAgIH1cblxuICAgICAgaWYgKGZzLmV4aXN0c1N5bmMocGF0aC5qb2luKHNkaywgJ2V4dCcpKSkge1xuICAgICAgICAvLyBsb2NhbCBjaGVja291dCBvZiB0aGUgU0RLIHJlcG9cbiAgICAgICAgcGFja2FnZURpcnMucHVzaChwYXRoLmpvaW4oJ2V4dCcsICdwYWNrYWdlcycpKTtcbiAgICAgICAgc2RrID0gcGF0aC5qb2luKHNkaywgJ2V4dCcpO1xuICAgICAgfVxuICAgICAgaWYgKCF3YXRjaGluZykge1xuICAgICAgICBmcy53cml0ZUZpbGVTeW5jKHBhdGguam9pbihvdXRwdXQsICdidWlsZC54bWwnKSwgYnVpbGRYTUwoeyBjb21wcmVzczogdGhpcy5wcm9kdWN0aW9uIH0pLCAndXRmOCcpO1xuICAgICAgICBmcy53cml0ZUZpbGVTeW5jKHBhdGguam9pbihvdXRwdXQsICdqc2RvbS1lbnZpcm9ubWVudC5qcycpLCBjcmVhdGVKU0RPTUVudmlyb25tZW50KCksICd1dGY4Jyk7XG4gICAgICAgIGZzLndyaXRlRmlsZVN5bmMocGF0aC5qb2luKG91dHB1dCwgJ2FwcC5qc29uJyksIGNyZWF0ZUFwcEpzb24oeyB0aGVtZSwgcGFja2FnZXMsIHRvb2xraXQsIG92ZXJyaWRlcywgcGFja2FnZURpcnMgfSksICd1dGY4Jyk7XG4gICAgICAgIGZzLndyaXRlRmlsZVN5bmMocGF0aC5qb2luKG91dHB1dCwgJ3dvcmtzcGFjZS5qc29uJyksIGNyZWF0ZVdvcmtzcGFjZUpzb24oc2RrLCBwYWNrYWdlRGlycywgb3V0cHV0KSwgJ3V0ZjgnKTtcbiAgICAgIH1cblxuICAgICAgbGV0IGNtZFJlYnVpbGROZWVkZWQgPSBmYWxzZTtcblxuICAgICAgaWYgKHRoaXMubWFuaWZlc3QgPT09IG51bGwgfHwganMgIT09IHRoaXMubWFuaWZlc3QpIHtcbiAgICAgICAgLy8gT25seSB3cml0ZSBtYW5pZmVzdCBpZiBpdCBkaWZmZXJzIGZyb20gdGhlIGxhc3QgcnVuLiAgVGhpcyBwcmV2ZW50cyB1bm5lY2Vzc2FyeSBjbWQgcmVidWlsZHMuXG4gICAgICAgIHRoaXMubWFuaWZlc3QgPSBqcztcbiAgICAgICAgZnMud3JpdGVGaWxlU3luYyhtYW5pZmVzdCwganMsICd1dGY4Jyk7XG4gICAgICAgIGNtZFJlYnVpbGROZWVkZWQgPSB0cnVlO1xuICAgICAgICByZWFkbGluZS5jdXJzb3JUbyhwcm9jZXNzLnN0ZG91dCwgMCk7Y29uc29sZS5sb2coYXBwICsgYGJ1aWxkaW5nIEV4dFJlYWN0IGJ1bmRsZTogJHtuYW1lfSA9PiAke291dHB1dH1gKVxuICAgICAgfVxuXG5cbiAgICAgIGlmIChpc1dlYnBhY2s0KSB7XG4gICAgICAgIC8vZXhlY1N5bmMoc2VuY2hhLCBbJ2FudCcsICd3YXRjaCddLCB7IGN3ZDogb3V0cHV0LCBzaWxlbnQ6IGZhbHNlIH0pXG4gICAgICAgIGNvbnN0IHNwYXduU3luYyA9IHJlcXVpcmUoJ2NoaWxkX3Byb2Nlc3MnKS5zcGF3blN5bmNcbiAgICAgICAgc3Bhd25TeW5jKHNlbmNoYSwgWydhbnQnLCAnYnVpbGQnXSwgeyBjd2Q6IG91dHB1dCwgc3RkaW86ICdpbmhlcml0JywgZW5jb2Rpbmc6ICd1dGYtOCd9KVxuICAgICAgICBjb25zb2xlLmxvZygnYWZ0ZXIgc3Bhd25TeW5jJylcbiAgICAgICAgb25CdWlsZERvbmUoKVxuICAgICAgfVxuXG4gICAgICBpZiAoIWlzV2VicGFjazQpIHtcbiAgICAgICAgaWYgKHRoaXMud2F0Y2gpIHtcbiAgICAgICAgICBpZiAoIXdhdGNoaW5nKSB7XG4gICAgICAgICAgICB3YXRjaGluZyA9IGdhdGhlckVycm9ycyhmb3JrKHNlbmNoYSwgWydhbnQnLCAnd2F0Y2gnXSwgeyBjd2Q6IG91dHB1dCwgc2lsZW50OiB0cnVlIH0pKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdhZnRlciBmb3JrJylcbiAgICAgICAgICAgIHdhdGNoaW5nLnN0ZGVyci5waXBlKHByb2Nlc3Muc3RkZXJyKTtcbiAgICAgICAgICAgIHdhdGNoaW5nLnN0ZG91dC5waXBlKHByb2Nlc3Muc3Rkb3V0KTtcbiAgICAgICAgICAgIHdhdGNoaW5nLnN0ZG91dC5vbignZGF0YScsIGRhdGEgPT4ge1xuICAgICAgICAgICAgICBpZiAoZGF0YSAmJiBkYXRhLnRvU3RyaW5nKCkubWF0Y2goL1dhaXRpbmcgZm9yIGNoYW5nZXNcXC5cXC5cXC4vKSkge1xuICAgICAgICAgICAgICAgIG9uQnVpbGREb25lKClcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIHdhdGNoaW5nLm9uKCdleGl0Jywgb25CdWlsZERvbmUpXG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghY21kUmVidWlsZE5lZWRlZCkgb25CdWlsZERvbmUoKTtcbiAgICAgICAgfSBcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgY29uc3QgYnVpbGQgPSBnYXRoZXJFcnJvcnMoZm9yayhzZW5jaGEsIFsnYW50JywgJ2J1aWxkJ10sIHsgc3RkaW86ICdpbmhlcml0JywgZW5jb2Rpbmc6ICd1dGYtOCcsIGN3ZDogb3V0cHV0LCBzaWxlbnQ6IGZhbHNlIH0pKTtcbiAgICAgICAgICBjb25zb2xlLmxvZygnYWZ0ZXIgZm9yaycpXG4gICAgICAgICAgaWYoYnVpbGQuc3Rkb3V0KSB7IGJ1aWxkLnN0ZG91dC5waXBlKHByb2Nlc3Muc3Rkb3V0KSB9XG4gICAgICAgICAgaWYoYnVpbGQuc3RkZXJyKSB7IGJ1aWxkLnN0ZGVyci5waXBlKHByb2Nlc3Muc3RkZXJyKSB9XG4gICAgICAgICAgYnVpbGQub24oJ2V4aXQnLCBvbkJ1aWxkRG9uZSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuXG4gICAgfSk7XG4gIH1cbn07XG4iXX0=