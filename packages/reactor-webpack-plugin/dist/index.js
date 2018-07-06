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
        treeShaking: false
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

        //console.log('this.dependencies[this.currentFile]')
        //console.log(this.dependencies[this.currentFile])
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
      //console.log(isWebpack4)
      //const modules = compilation.chunks.reduce((a, b) => a.concat(b.modules), []);
      //console.log(modules[0])
      var build = this.builds[Object.keys(this.builds)[0]];
      var outputPath = _path2.default.join(compiler.outputPath, this.output);
      //console.log('\n*****outputPath: ' + outputPath)
      //console.log('\n*****this.output: ' + this.output)
      // webpack-dev-server overwrites the outputPath to "/", so we need to prepend contentBase
      if (compiler.outputPath === '/' && compiler.options.devServer) {
        outputPath = _path2.default.join(compiler.options.devServer.contentBase, outputPath);
      }
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


      if (callback != null) {
        if (this.asynchronous) {
          callback();
        }
      }

      //    console.log(modules)
      //    console.log(outputPath)
      //    console.log(build)

      this._buildExtBundle(isWebpack4, 'ext', modules, outputPath, build).then(function () {
        //console.log('in then')
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
        compiler.hooks.compilation.tap('extreact-compilation', function (compilation, data) {
          readline.cursorTo(process.stdout, 0);console.log(app + 'extreact-compilation');

          // //mjg early
          // this.output = 'ext-react/extjs'
          // const jsChunk = compilation.addChunk(`${this.output}-js`);
          // //const jsChunk = compilation.addChunk(`ext`);
          // jsChunk.hasRuntime = jsChunk.isInitial = () => true;
          // jsChunk.files.push(path.join(this.output, 'ext.js'));
          // jsChunk.files.push(path.join(this.output, 'ext.css'));
          // jsChunk.id = -2; // this forces html-webpack-plugin to include ext.js first
          // console.log('********compilation.chunks[0]')
          // console.log(compilation.chunks[0].id)


          compilation.hooks.succeedModule.tap('extreact-succeed-module', function (module) {
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
            //console.log('parser.plugin')
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
      //  console.log('*****')
      //  console.log(isWebpack4)
      //  console.log('*****')

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
          console.log('\n\njs:');
          console.log(js);
          console.log('\n\n');
          _fs2.default.writeFileSync(manifest, js, 'utf8');
          cmdRebuildNeeded = true;
          readline.cursorTo(process.stdout, 0);console.log(app + ('building ExtReact bundle: ' + name + ' => ' + output));
        }

        if (isWebpack4) {
          //execSync(sencha, ['ant', 'watch'], { cwd: output, silent: false })
          var spawnSync = require('child_process').spawnSync;
          spawnSync(sencha, ['ant', 'build'], { cwd: output, stdio: 'inherit', encoding: 'utf-8' });

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9pbmRleC5qcyJdLCJuYW1lcyI6WyJyZWFkbGluZSIsInJlYWN0VmVyc2lvbiIsIndhdGNoaW5nIiwiY21kRXJyb3JzIiwiYXBwIiwiY2hhbGsiLCJncmVlbiIsImdhdGhlckVycm9ycyIsImNtZCIsInN0ZG91dCIsIm9uIiwibWVzc2FnZSIsImRhdGEiLCJ0b1N0cmluZyIsIm1hdGNoIiwicHVzaCIsInJlcGxhY2UiLCJtb2R1bGUiLCJleHBvcnRzIiwib3B0aW9ucyIsInBrZyIsImZzIiwiZXhpc3RzU3luYyIsIkpTT04iLCJwYXJzZSIsInJlYWRGaWxlU3luYyIsInJlYWN0RW50cnkiLCJkZXBlbmRlbmNpZXMiLCJyZWFjdCIsImlzMTYiLCJpbmNsdWRlcyIsImV4dFJlYWN0UmMiLCJnZXREZWZhdWx0T3B0aW9ucyIsImJ1aWxkcyIsIk9iamVjdCIsImtleXMiLCJsZW5ndGgiLCJidWlsZE9wdGlvbnMiLCJleHQiLCJuYW1lIiwiX3ZhbGlkYXRlQnVpbGRDb25maWciLCJhc3NpZ24iLCJjdXJyZW50RmlsZSIsIm1hbmlmZXN0IiwiZGVidWciLCJ3YXRjaCIsInRlc3QiLCJvdXRwdXQiLCJ0b29sa2l0IiwicGFja2FnZXMiLCJwYWNrYWdlRGlycyIsIm92ZXJyaWRlcyIsImFzeW5jaHJvbm91cyIsInByb2R1Y3Rpb24iLCJtYW5pZmVzdEV4dHJhY3RvciIsImV4dHJhY3RGcm9tSlNYIiwidHJlZVNoYWtpbmciLCJjb21waWxhdGlvbiIsInJlc291cmNlIiwiZG9QYXJzZSIsIl9zb3VyY2UiLCJfdmFsdWUiLCJlIiwiY29uc29sZSIsImVycm9yIiwiY29tcGlsZXIiLCJjYWxsYmFjayIsImlzV2VicGFjazQiLCJob29rcyIsIm1vZHVsZXMiLCJjaHVua3MiLCJyZWR1Y2UiLCJhIiwiYiIsImNvbmNhdCIsIl9tb2R1bGVzIiwiYnVpbGQiLCJvdXRwdXRQYXRoIiwicGF0aCIsImpvaW4iLCJkZXZTZXJ2ZXIiLCJjb250ZW50QmFzZSIsIl9idWlsZEV4dEJ1bmRsZSIsInRoZW4iLCJjYXRjaCIsImVycm9ycyIsIkVycm9yIiwid2VicGFja1ZlcnNpb24iLCJ1bmRlZmluZWQiLCJjdXJzb3JUbyIsInByb2Nlc3MiLCJsb2ciLCJtZSIsImFkZFRvTWFuaWZlc3QiLCJjYWxsIiwiZmlsZSIsInN0YXRlIiwid2F0Y2hSdW4iLCJ0YXBBc3luYyIsImNiIiwidGFwIiwicGx1Z2luIiwic3VjY2VlZE1vZHVsZSIsIm5vcm1hbE1vZHVsZUZhY3RvcnkiLCJwYXJzZXIiLCJlbWl0Iiwic2RrIiwicmVzb2x2ZSIsIl9hZGRSZWFjdG9yUGFja2FnZSIsImRpcm5hbWUiLCJiYXNlZGlyIiwiY3dkIiwiX2ZpbmRQYWNrYWdlcyIsIm1vZHVsZXNEaXIiLCJyZWFkZGlyU3luYyIsImZpbHRlciIsImRpciIsIm1hcCIsInBhY2thZ2VJbmZvIiwic2VuY2hhIiwidHlwZSIsInJlcXVpcmUiLCJ0aGVtZSIsIl9nZXRTZW5jaENtZFBhdGgiLCJQcm9taXNlIiwicmVqZWN0Iiwib25CdWlsZEZhaWwiLCJvbkJ1aWxkU3VjY2VzcyIsIm9uQnVpbGREb25lIiwianMiLCJzdGF0ZW1lbnRzIiwiaW5kZXhPZiIsImRlcHMiLCJ1c2VyUGFja2FnZXMiLCJ3cml0ZUZpbGVTeW5jIiwiY29tcHJlc3MiLCJjbWRSZWJ1aWxkTmVlZGVkIiwic3Bhd25TeW5jIiwic3RkaW8iLCJlbmNvZGluZyIsInNpbGVudCIsInN0ZGVyciIsInBpcGUiXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7QUFFQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOztBQUNBOzs7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBSUE7O0lBQVlBLFE7Ozs7Ozs7Ozs7OztBQWZaLElBQUlDLGVBQWUsQ0FBbkI7O0FBWUEsSUFBSUMsV0FBVyxLQUFmO0FBQ0EsSUFBSUMsa0JBQUo7QUFDQSxJQUFNQyxNQUFTQyxnQkFBTUMsS0FBTixDQUFZLFVBQVosQ0FBVCw4QkFBTjs7O0FBR0E7Ozs7QUFJQSxJ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Q29udGVudCI6WyIndXNlIHN0cmljdCc7XG52YXIgcmVhY3RWZXJzaW9uID0gMFxuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBjanNvbiBmcm9tICdjanNvbic7XG5pbXBvcnQgeyBzeW5jIGFzIG1rZGlycCB9IGZyb20gJ21rZGlycCc7XG5pbXBvcnQgZXh0cmFjdEZyb21KU1ggZnJvbSAnLi9leHRyYWN0RnJvbUpTWCc7XG5pbXBvcnQgeyBzeW5jIGFzIHJpbXJhZiB9IGZyb20gJ3JpbXJhZic7XG5pbXBvcnQgeyBidWlsZFhNTCwgY3JlYXRlQXBwSnNvbiwgY3JlYXRlV29ya3NwYWNlSnNvbiwgY3JlYXRlSlNET01FbnZpcm9ubWVudCB9IGZyb20gJy4vYXJ0aWZhY3RzJztcbmltcG9ydCB7IGV4ZWNTeW5jLCBzcGF3biwgZm9yayB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0IHsgZ2VuZXJhdGUgfSBmcm9tICdhc3RyaW5nJztcbmltcG9ydCB7IHN5bmMgYXMgcmVzb2x2ZSB9IGZyb20gJ3Jlc29sdmUnO1xubGV0IHdhdGNoaW5nID0gZmFsc2U7XG5sZXQgY21kRXJyb3JzO1xuY29uc3QgYXBwID0gYCR7Y2hhbGsuZ3JlZW4oJ+KEuSDvvaJleHTvvaM6Jyl9IHJlYWN0b3Itd2VicGFjay1wbHVnaW46IGA7XG5pbXBvcnQgKiBhcyByZWFkbGluZSBmcm9tICdyZWFkbGluZSdcblxuLyoqXG4gKiBTY3JhcGVzIFNlbmNoYSBDbWQgb3V0cHV0LCBhZGRpbmcgZXJyb3IgbWVzc2FnZXMgdG8gY21kRXJyb3JzO1xuICogQHBhcmFtIHtQcm9jZXNzfSBidWlsZCBBIHNlbmNoYSBDbWQgcHJvY2Vzc1xuICovXG5jb25zdCBnYXRoZXJFcnJvcnMgPSAoY21kKSA9PiB7XG5cbiAgaWYgKGNtZC5zdGRvdXQpIHtcbiAgICBjbWQuc3Rkb3V0Lm9uKCdkYXRhJywgZGF0YSA9PiB7XG4gICAgICBjb25zdCBtZXNzYWdlID0gZGF0YS50b1N0cmluZygpO1xuICAgICAgaWYgKG1lc3NhZ2UubWF0Y2goL15cXFtFUlJcXF0vKSkge1xuICAgICAgICBjbWRFcnJvcnMucHVzaChtZXNzYWdlLnJlcGxhY2UoL15cXFtFUlJcXF0gL2dpLCAnJykpO1xuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICAvLyBjbWQuc3RkZXJyLm9uKCdkYXRhJywgKGRhdGEpID0+IHtcbiAgLy8gICBjb25zb2xlLmVycm9yKGBFOiR7ZGF0YX1gKTtcbiAgLy8gfSlcblxuICByZXR1cm4gY21kO1xufVxuXG4vKipcbiAqIFByb2R1Y2VzIGEgbWluaW1hbCBidWlsZCBvZiBFeHRSZWFjdCBieSBjcmF3bGluZyB5b3VyIFJlYWN0IHNvdXJjZSBjb2RlIGFuZCBleHRyYWN0aW5nIHRoZSB4dHlwZXMgdXNlZFxuICogaW4gSlNYIHRhZ3NcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBSZWFjdEV4dEpTV2VicGFja1BsdWdpbiB7XG5cbiAgLyoqXG4gICAqIEBwYXJhbSB7T2JqZWN0W119IGJ1aWxkc1xuICAgKiBAcGFyYW0ge0Jvb2xlYW59IFtkZWJ1Zz1mYWxzZV0gU2V0IHRvIHRydWUgdG8gcHJldmVudCBjbGVhbnVwIG9mIGJ1aWxkIHRlbXBvcmFyeSBidWlsZCBhcnRpZmFjdHMgdGhhdCBtaWdodCBiZSBoZWxwZnVsIGluIHRyb3VibGVzaG9vdGluZyBpc3N1ZXMuXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBzZGsgVGhlIGZ1bGwgcGF0aCB0byB0aGUgRXh0UmVhY3QgU0RLXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBbdG9vbGtpdD0nbW9kZXJuJ10gXCJtb2Rlcm5cIiBvciBcImNsYXNzaWNcIlxuICAgKiBAcGFyYW0ge1N0cmluZ30gdGhlbWUgVGhlIG5hbWUgb2YgdGhlIEV4dFJlYWN0IHRoZW1lIHBhY2thZ2UgdG8gdXNlLCBmb3IgZXhhbXBsZSBcInRoZW1lLW1hdGVyaWFsXCJcbiAgICogQHBhcmFtIHtTdHJpbmdbXX0gcGFja2FnZXMgQW4gYXJyYXkgb2YgRXh0UmVhY3QgcGFja2FnZXMgdG8gaW5jbHVkZVxuICAgKiBAcGFyYW0ge1N0cmluZ1tdfSBvdmVycmlkZXMgQW4gYXJyYXkgd2l0aCB0aGUgcGF0aHMgb2YgZGlyZWN0b3JpZXMgb3IgZmlsZXMgdG8gc2VhcmNoLiBBbnkgY2xhc3Nlc1xuICAgKiBkZWNsYXJlZCBpbiB0aGVzZSBsb2NhdGlvbnMgd2lsbCBiZSBhdXRvbWF0aWNhbGx5IHJlcXVpcmVkIGFuZCBpbmNsdWRlZCBpbiB0aGUgYnVpbGQuXG4gICAqIElmIGFueSBmaWxlIGRlZmluZXMgYW4gRXh0UmVhY3Qgb3ZlcnJpZGUgKHVzaW5nIEV4dC5kZWZpbmUgd2l0aCBhbiBcIm92ZXJyaWRlXCIgcHJvcGVydHkpLFxuICAgKiB0aGF0IG92ZXJyaWRlIHdpbGwgaW4gZmFjdCBvbmx5IGJlIGluY2x1ZGVkIGluIHRoZSBidWlsZCBpZiB0aGUgdGFyZ2V0IGNsYXNzIHNwZWNpZmllZFxuICAgKiBpbiB0aGUgXCJvdmVycmlkZVwiIHByb3BlcnR5IGlzIGFsc28gaW5jbHVkZWQuXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBvdXRwdXQgVGhlIHBhdGggdG8gZGlyZWN0b3J5IHdoZXJlIHRoZSBFeHRSZWFjdCBidW5kbGUgc2hvdWxkIGJlIHdyaXR0ZW5cbiAgICogQHBhcmFtIHtCb29sZWFufSBhc3luY2hyb25vdXMgU2V0IHRvIHRydWUgdG8gcnVuIFNlbmNoYSBDbWQgYnVpbGRzIGFzeW5jaHJvbm91c2x5LiBUaGlzIG1ha2VzIHRoZSB3ZWJwYWNrIGJ1aWxkIGZpbmlzaCBtdWNoIGZhc3RlciwgYnV0IHRoZSBhcHAgbWF5IG5vdCBsb2FkIGNvcnJlY3RseSBpbiB5b3VyIGJyb3dzZXIgdW50aWwgU2VuY2hhIENtZCBpcyBmaW5pc2hlZCBidWlsZGluZyB0aGUgRXh0UmVhY3QgYnVuZGxlXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gcHJvZHVjdGlvbiBTZXQgdG8gdHJ1ZSBmb3IgcHJvZHVjdGlvbiBidWlsZHMuICBUaGlzIHRlbGwgU2VuY2hhIENtZCB0byBjb21wcmVzcyB0aGUgZ2VuZXJhdGVkIEpTIGJ1bmRsZS5cbiAgICogQHBhcmFtIHtCb29sZWFufSB0cmVlU2hha2luZyBTZXQgdG8gZmFsc2UgdG8gZGlzYWJsZSB0cmVlIHNoYWtpbmcgaW4gZGV2ZWxvcG1lbnQgYnVpbGRzLiAgVGhpcyBtYWtlcyBpbmNyZW1lbnRhbCByZWJ1aWxkcyBmYXN0ZXIgYXMgYWxsIEV4dFJlYWN0IGNvbXBvbmVudHMgYXJlIGluY2x1ZGVkIGluIHRoZSBleHQuanMgYnVuZGxlIGluIHRoZSBpbml0aWFsIGJ1aWxkIGFuZCB0aHVzIHRoZSBidW5kbGUgZG9lcyBub3QgbmVlZCB0byBiZSByZWJ1aWx0IGFmdGVyIGVhY2ggY2hhbmdlLiBEZWZhdWx0cyB0byB0cnVlLlxuICAgKi9cbiAgY29uc3RydWN0b3Iob3B0aW9ucykge1xuICAgIC8vY2FuIGJlIGluIGRldmRlcGVuZGVuY2llc1xuICAgIC8vYWNjb3VudCBmb3IgdGhpczogcmVhY3Q6IFwiMTUuMTYuMFwiXG4gICAgdmFyIHBrZyA9IChmcy5leGlzdHNTeW5jKCdwYWNrYWdlLmpzb24nKSAmJiBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYygncGFja2FnZS5qc29uJywgJ3V0Zi04JykpIHx8IHt9KTtcbiAgICB2YXIgcmVhY3RFbnRyeSA9IHBrZy5kZXBlbmRlbmNpZXMucmVhY3RcbiAgICB2YXIgaXMxNiA9IHJlYWN0RW50cnkuaW5jbHVkZXMoXCIxNlwiKTtcbiAgICBpZiAoaXMxNikgeyByZWFjdFZlcnNpb24gPSAxNiB9XG4gICAgZWxzZSB7IHJlYWN0VmVyc2lvbiA9IDE1IH1cbiAgICB0aGlzLnJlYWN0VmVyc2lvbiA9IHJlYWN0VmVyc2lvblxuXG4gICAgLy8gaWYgLmV4dC1yZWFjdHJjIGZpbGUgZXhpc3RzLCBjb25zdW1lIGl0IGFuZCBhcHBseSBpdCB0byBjb25maWcgb3B0aW9ucy5cbiAgICBjb25zdCBleHRSZWFjdFJjID0gKGZzLmV4aXN0c1N5bmMoJy5leHQtcmVhY3RyYycpICYmIEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKCcuZXh0LXJlYWN0cmMnLCAndXRmLTgnKSkgfHwge30pO1xuXG4gICAgb3B0aW9ucyA9IHsgLi4udGhpcy5nZXREZWZhdWx0T3B0aW9ucygpLCAuLi5vcHRpb25zLCAuLi5leHRSZWFjdFJjIH07XG4gICAgY29uc3QgeyBidWlsZHMgfSA9IG9wdGlvbnM7XG5cbiAgICBpZiAoT2JqZWN0LmtleXMoYnVpbGRzKS5sZW5ndGggPT09IDApIHtcbiAgICAgIGNvbnN0IHsgYnVpbGRzLCAuLi5idWlsZE9wdGlvbnMgfSA9IG9wdGlvbnM7XG4gICAgICBidWlsZHMuZXh0ID0gYnVpbGRPcHRpb25zO1xuICAgIH1cblxuICAgIGZvciAobGV0IG5hbWUgaW4gYnVpbGRzKVxuICAgICAgdGhpcy5fdmFsaWRhdGVCdWlsZENvbmZpZyhuYW1lLCBidWlsZHNbbmFtZV0pO1xuXG4gICAgT2JqZWN0LmFzc2lnbih0aGlzLCB7XG4gICAgICAuLi5vcHRpb25zLFxuICAgICAgY3VycmVudEZpbGU6IG51bGwsXG4gICAgICBtYW5pZmVzdDogbnVsbCxcbiAgICAgIGRlcGVuZGVuY2llczogW11cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZWZhdWx0IGNvbmZpZyBvcHRpb25zXG4gICAqIEBwcm90ZWN0ZWRcbiAgICogQHJldHVybiB7T2JqZWN0fVxuICAgKi9cbiAgZ2V0RGVmYXVsdE9wdGlvbnMoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGJ1aWxkczoge30sXG4gICAgICBkZWJ1ZzogZmFsc2UsXG4gICAgICB3YXRjaDogZmFsc2UsXG4gICAgICB0ZXN0OiAvXFwuKGp8dClzeD8kLyxcblxuICAgICAgLyogYmVnaW4gc2luZ2xlIGJ1aWxkIG9ubHkgKi9cbiAgICAgIG91dHB1dDogJ2V4dC1yZWFjdCcsXG4gICAgICB0b29sa2l0OiAnbW9kZXJuJyxcbiAgICAgIHBhY2thZ2VzOiBudWxsLFxuICAgICAgcGFja2FnZURpcnM6IFtdLFxuICAgICAgb3ZlcnJpZGVzOiBbXSxcbiAgICAgIGFzeW5jaHJvbm91czogZmFsc2UsXG4gICAgICBwcm9kdWN0aW9uOiBmYWxzZSxcbiAgICAgIG1hbmlmZXN0RXh0cmFjdG9yOiBleHRyYWN0RnJvbUpTWCxcbiAgICAgIHRyZWVTaGFraW5nOiBmYWxzZVxuICAgICAgLyogZW5kIHNpbmdsZSBidWlsZCBvbmx5ICovXG4gICAgfVxuICB9XG5cbiAgd2F0Y2hSdW4oKSB7XG4gICAgdGhpcy53YXRjaCA9IHRydWVcbiAgfVxuXG4gIHN1Y2NlZWRNb2R1bGUoY29tcGlsYXRpb24sIG1vZHVsZSkge1xuICAgIHRoaXMuY3VycmVudEZpbGUgPSBtb2R1bGUucmVzb3VyY2U7XG4gICAgaWYgKG1vZHVsZS5yZXNvdXJjZSAmJiBtb2R1bGUucmVzb3VyY2UubWF0Y2godGhpcy50ZXN0KSAmJiAhbW9kdWxlLnJlc291cmNlLm1hdGNoKC9ub2RlX21vZHVsZXMvKSAmJiAhbW9kdWxlLnJlc291cmNlLm1hdGNoKGAvcmVhY3RvciR7cmVhY3RWZXJzaW9ufS9gKSkge1xuICAgICAgY29uc3QgZG9QYXJzZSA9ICgpID0+IHtcbiAgICAgICAgdGhpcy5kZXBlbmRlbmNpZXNbdGhpcy5jdXJyZW50RmlsZV0gPSBbXG4gICAgICAgICAgLi4uKHRoaXMuZGVwZW5kZW5jaWVzW3RoaXMuY3VycmVudEZpbGVdIHx8IFtdKSxcbiAgICAgICAgICAuLi50aGlzLm1hbmlmZXN0RXh0cmFjdG9yKG1vZHVsZS5fc291cmNlLl92YWx1ZSwgY29tcGlsYXRpb24sIG1vZHVsZSwgcmVhY3RWZXJzaW9uKVxuICAgICAgICBdXG4gICAgICB9XG4gICAgICBpZiAodGhpcy5kZWJ1Zykge1xuICAgICAgICBkb1BhcnNlKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0cnkgeyBkb1BhcnNlKCk7IH0gY2F0Y2ggKGUpIFxuICAgICAgICB7IFxuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1xcbmVycm9yIHBhcnNpbmcgJyArIHRoaXMuY3VycmVudEZpbGUpOyBcbiAgICAgICAgICBjb25zb2xlLmVycm9yKGUpOyBcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvL2NvbnNvbGUubG9nKCd0aGlzLmRlcGVuZGVuY2llc1t0aGlzLmN1cnJlbnRGaWxlXScpXG4gICAgICAvL2NvbnNvbGUubG9nKHRoaXMuZGVwZW5kZW5jaWVzW3RoaXMuY3VycmVudEZpbGVdKVxuXG4gICAgfVxuICB9XG5cbiAgZW1pdChjb21waWxlciwgY29tcGlsYXRpb24sIGNhbGxiYWNrKSB7XG4gICAgdmFyIGlzV2VicGFjazQgPSBjb21waWxhdGlvbi5ob29rcztcbiAgICB2YXIgbW9kdWxlcyA9IFtdXG4gICAgaWYgKGlzV2VicGFjazQpIHtcbiAgICAgIGlzV2VicGFjazQgPSB0cnVlXG4gICAgICBtb2R1bGVzID0gY29tcGlsYXRpb24uY2h1bmtzLnJlZHVjZSgoYSwgYikgPT4gYS5jb25jYXQoYi5fbW9kdWxlcyksIFtdKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBpc1dlYnBhY2s0ID0gZmFsc2VcbiAgICAgIG1vZHVsZXMgPSBjb21waWxhdGlvbi5jaHVua3MucmVkdWNlKChhLCBiKSA9PiBhLmNvbmNhdChiLm1vZHVsZXMpLCBbXSk7XG4gICAgfVxuICAgIC8vY29uc29sZS5sb2coaXNXZWJwYWNrNClcbiAgICAvL2NvbnN0IG1vZHVsZXMgPSBjb21waWxhdGlvbi5jaHVua3MucmVkdWNlKChhLCBiKSA9PiBhLmNvbmNhdChiLm1vZHVsZXMpLCBbXSk7XG4gICAgLy9jb25zb2xlLmxvZyhtb2R1bGVzWzBdKVxuICAgIGNvbnN0IGJ1aWxkID0gdGhpcy5idWlsZHNbT2JqZWN0LmtleXModGhpcy5idWlsZHMpWzBdXTtcbiAgICBsZXQgb3V0cHV0UGF0aCA9IHBhdGguam9pbihjb21waWxlci5vdXRwdXRQYXRoLCB0aGlzLm91dHB1dCk7XG4gICAgLy9jb25zb2xlLmxvZygnXFxuKioqKipvdXRwdXRQYXRoOiAnICsgb3V0cHV0UGF0aClcbiAgICAvL2NvbnNvbGUubG9nKCdcXG4qKioqKnRoaXMub3V0cHV0OiAnICsgdGhpcy5vdXRwdXQpXG4gICAgLy8gd2VicGFjay1kZXYtc2VydmVyIG92ZXJ3cml0ZXMgdGhlIG91dHB1dFBhdGggdG8gXCIvXCIsIHNvIHdlIG5lZWQgdG8gcHJlcGVuZCBjb250ZW50QmFzZVxuICAgIGlmIChjb21waWxlci5vdXRwdXRQYXRoID09PSAnLycgJiYgY29tcGlsZXIub3B0aW9ucy5kZXZTZXJ2ZXIpIHtcbiAgICAgIG91dHB1dFBhdGggPSBwYXRoLmpvaW4oY29tcGlsZXIub3B0aW9ucy5kZXZTZXJ2ZXIuY29udGVudEJhc2UsIG91dHB1dFBhdGgpO1xuICAgIH1cbiAgICAvLyB0aGUgZm9sbG93aW5nIGlzIG5lZWRlZCBmb3IgaHRtbC13ZWJwYWNrLXBsdWdpbiB0byBpbmNsdWRlIDxzY3JpcHQ+IGFuZCA8bGluaz4gdGFncyBmb3IgRXh0UmVhY3RcblxuICAgIC8vIGNvbnNvbGUubG9nKCdjb21waWxhdGlvbicpXG4gICAgLy8gY29uc29sZS5sb2coJyoqKioqKioqY29tcGlsYXRpb24uY2h1bmtzWzBdJylcbiAgICAvLyBjb25zb2xlLmxvZyhjb21waWxhdGlvbi5jaHVua3NbMF0uaWQpXG4gICAgLy8gY29uc29sZS5sb2cocGF0aC5qb2luKHRoaXMub3V0cHV0LCAnZXh0LmpzJykpXG4gICAgLy8gY29uc3QganNDaHVuayA9IGNvbXBpbGF0aW9uLmFkZENodW5rKGAke3RoaXMub3V0cHV0fS1qc2ApO1xuICAgIC8vIGpzQ2h1bmsuaGFzUnVudGltZSA9IGpzQ2h1bmsuaXNJbml0aWFsID0gKCkgPT4gdHJ1ZTtcbiAgICAvLyBqc0NodW5rLmZpbGVzLnB1c2gocGF0aC5qb2luKHRoaXMub3V0cHV0LCAnZXh0LmpzJykpO1xuICAgIC8vIGpzQ2h1bmsuZmlsZXMucHVzaChwYXRoLmpvaW4odGhpcy5vdXRwdXQsICdleHQuY3NzJykpO1xuICAgIC8vIGpzQ2h1bmsuaWQgPSAnYWFhYXAnOyAvLyB0aGlzIGZvcmNlcyBodG1sLXdlYnBhY2stcGx1Z2luIHRvIGluY2x1ZGUgZXh0LmpzIGZpcnN0XG4gICAgLy8gY29uc29sZS5sb2coJyoqKioqKioqY29tcGlsYXRpb24uY2h1bmtzWzFdJylcbiAgICAvLyBjb25zb2xlLmxvZyhjb21waWxhdGlvbi5jaHVua3NbMV0uaWQpXG5cbiAgICAvL2lmICh0aGlzLmFzeW5jaHJvbm91cykgY2FsbGJhY2soKTtcbi8vICAgIGNvbnNvbGUubG9nKGNhbGxiYWNrKVxuXG4vLyBpZiAoaXNXZWJwYWNrNCkge1xuLy8gICBjb25zb2xlLmxvZyhwYXRoLmpvaW4odGhpcy5vdXRwdXQsICdleHQuanMnKSlcbi8vICAgY29uc3Qgc3RhdHMgPSBmcy5zdGF0U3luYyhwYXRoLmpvaW4ob3V0cHV0UGF0aCwgJ2V4dC5qcycpKVxuLy8gICBjb25zdCBmaWxlU2l6ZUluQnl0ZXMgPSBzdGF0cy5zaXplXG4vLyAgIGNvbXBpbGF0aW9uLmFzc2V0c1snZXh0LmpzJ10gPSB7XG4vLyAgICAgc291cmNlOiBmdW5jdGlvbigpIHtyZXR1cm4gZnMucmVhZEZpbGVTeW5jKHBhdGguam9pbihvdXRwdXRQYXRoLCAnZXh0LmpzJykpfSxcbi8vICAgICBzaXplOiBmdW5jdGlvbigpIHtyZXR1cm4gZmlsZVNpemVJbkJ5dGVzfVxuLy8gICB9XG4vLyAgIGNvbnNvbGUubG9nKGNvbXBpbGF0aW9uLmVudHJ5cG9pbnRzKVxuXG4vLyAgIHZhciBmaWxlbGlzdCA9ICdJbiB0aGlzIGJ1aWxkOlxcblxcbic7XG5cbi8vICAgLy8gTG9vcCB0aHJvdWdoIGFsbCBjb21waWxlZCBhc3NldHMsXG4vLyAgIC8vIGFkZGluZyBhIG5ldyBsaW5lIGl0ZW0gZm9yIGVhY2ggZmlsZW5hbWUuXG4vLyAgIGZvciAodmFyIGZpbGVuYW1lIGluIGNvbXBpbGF0aW9uLmFzc2V0cykge1xuLy8gICAgIGZpbGVsaXN0ICs9ICgnLSAnKyBmaWxlbmFtZSArJ1xcbicpO1xuLy8gICB9XG5cbi8vICAgLy8gSW5zZXJ0IHRoaXMgbGlzdCBpbnRvIHRoZSB3ZWJwYWNrIGJ1aWxkIGFzIGEgbmV3IGZpbGUgYXNzZXQ6XG4vLyAgIGNvbXBpbGF0aW9uLmFzc2V0c1snZmlsZWxpc3QubWQnXSA9IHtcbi8vICAgICBzb3VyY2UoKSB7XG4vLyAgICAgICByZXR1cm4gZmlsZWxpc3Q7XG4vLyAgICAgfSxcbi8vICAgICBzaXplKCkge1xuLy8gICAgICAgcmV0dXJuIGZpbGVsaXN0Lmxlbmd0aDtcbi8vICAgICB9XG4vLyAgIH1cbi8vIH1cblxuXG4gICAgaWYgKGNhbGxiYWNrICE9IG51bGwpIFxuICAgICAge1xuICAgICAgICBpZiAodGhpcy5hc3luY2hyb25vdXMpIFxuICAgICAgICB7Y2FsbGJhY2soKX1cbiAgICAgIH1cblxuLy8gICAgY29uc29sZS5sb2cobW9kdWxlcylcbi8vICAgIGNvbnNvbGUubG9nKG91dHB1dFBhdGgpXG4vLyAgICBjb25zb2xlLmxvZyhidWlsZClcblxuICB0aGlzLl9idWlsZEV4dEJ1bmRsZShpc1dlYnBhY2s0LCAnZXh0JywgbW9kdWxlcywgb3V0cHV0UGF0aCwgYnVpbGQpXG4gICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgIC8vY29uc29sZS5sb2coJ2luIHRoZW4nKVxuICAgICAgICAvLyBjb25zdCBjc3NWYXJQYXRoID0gcGF0aC5qb2luKHRoaXMub3V0cHV0LCAnY3NzLXZhcnMuanMnKTtcblxuICAgICAgICAvLyBpZiAoZnMuZXhpc3RzU3luYyhwYXRoLmpvaW4ob3V0cHV0UGF0aCwgJ2Nzcy12YXJzLmpzJykpKSB7XG4gICAgICAgIC8vICAgICBjb25zdCBjc3NWYXJDaHVuayA9IGNvbXBpbGF0aW9uLmFkZENodW5rKGAke3RoaXMub3V0cHV0fS1jc3MtdmFyc2ApO1xuICAgICAgICAvLyAgICAgY3NzVmFyQ2h1bmsuaGFzUnVudGltZSA9IGNzc1ZhckNodW5rLmlzSW5pdGlhbCA9ICgpID0+IHRydWU7XG4gICAgICAgIC8vICAgICBjc3NWYXJDaHVuay5maWxlcy5wdXNoKGNzc1ZhclBhdGgpO1xuICAgICAgICAvLyAgICAgY3NzVmFyQ2h1bmsuaWQgPSAtMTtcbiAgICAgICAgLy8gfVxuICAgICAgICAvLyF0aGlzLmFzeW5jaHJvbm91cyAmJiBjYWxsYmFjaygpO1xuLy8gICAgICAgIGNvbnNvbGUubG9nKGNhbGxiYWNrKVxuICAgICAgICBpZiAoY2FsbGJhY2sgIT0gbnVsbCkgXG4gICAgICAgICAge1xuICAgICAgICAgICAgaWYgKCF0aGlzLmFzeW5jaHJvbm91cykgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC5jYXRjaChlID0+IHtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhlKVxuICAgICAgICBjb21waWxhdGlvbi5lcnJvcnMucHVzaChuZXcgRXJyb3IoJ1tAZXh0anMvcmVhY3Rvci13ZWJwYWNrLXBsdWdpbl06ICcgKyBlLnRvU3RyaW5nKCkpKTtcbiAgICAgICAgLy8hdGhpcy5hc3luY2hyb25vdXMgJiYgY2FsbGJhY2soKTtcbi8vICAgICAgICBjb25zb2xlLmxvZyhjYWxsYmFjaylcbiAgICAgICAgaWYgKGNhbGxiYWNrICE9IG51bGwpIFxuICAgICAgICB7XG4gICAgICAgICAgaWYgKCF0aGlzLmFzeW5jaHJvbm91cykgXG4gICAgICAgICAge1xuICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pXG4gIH1cblxuXG4gIGFwcGx5KGNvbXBpbGVyKSB7XG5cbiAgICBpZiAodGhpcy53ZWJwYWNrVmVyc2lvbiA9PSB1bmRlZmluZWQpIHtcbiAgICAgIGNvbnN0IGlzV2VicGFjazQgPSBjb21waWxlci5ob29rcztcbiAgICAgIGlmIChpc1dlYnBhY2s0KSB7dGhpcy53ZWJwYWNrVmVyc2lvbiA9ICdJUyB3ZWJwYWNrIDQnfVxuICAgICAgZWxzZSB7dGhpcy53ZWJwYWNrVmVyc2lvbiA9ICdOT1Qgd2VicGFjayA0J31cbiAgICAgIHJlYWRsaW5lLmN1cnNvclRvKHByb2Nlc3Muc3Rkb3V0LCAwKTtjb25zb2xlLmxvZyhhcHAgKyAncmVhY3RWZXJzaW9uOiAnICsgdGhpcy5yZWFjdFZlcnNpb24gKyAnLCAnICsgdGhpcy53ZWJwYWNrVmVyc2lvbilcbiAgICB9XG5cbiAgICBjb25zdCBtZSA9IHRoaXM7XG5cbiAgICAvKipcbiAgICAgKiBBZGRzIHRoZSBjb2RlIGZvciB0aGUgc3BlY2lmaWVkIGZ1bmN0aW9uIGNhbGwgdG8gdGhlIG1hbmlmZXN0LmpzIGZpbGVcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gY2FsbCBBIGZ1bmN0aW9uIGNhbGwgQVNUIG5vZGUuXG4gICAgICovXG4gICAgY29uc3QgYWRkVG9NYW5pZmVzdCA9IGZ1bmN0aW9uKGNhbGwpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGZpbGUgPSB0aGlzLnN0YXRlLm1vZHVsZS5yZXNvdXJjZTtcbiAgICAgICAgbWUuZGVwZW5kZW5jaWVzW2ZpbGVdID0gWyAuLi4obWUuZGVwZW5kZW5jaWVzW2ZpbGVdIHx8IFtdKSwgZ2VuZXJhdGUoY2FsbCkgXTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihgRXJyb3IgcHJvY2Vzc2luZyAke2ZpbGV9YCk7XG4gICAgICB9XG4gICAgfTtcblxuXG5cblxuICAgIGlmIChjb21waWxlci5ob29rcykge1xuICAgICAgaWYgKHRoaXMuYXN5bmNocm9ub3VzKSB7XG4gICAgICAgIGNvbXBpbGVyLmhvb2tzLndhdGNoUnVuLnRhcEFzeW5jKCdleHRyZWFjdC13YXRjaC1ydW4gKGFzeW5jKScsICh3YXRjaGluZywgY2IpID0+IHtcbiAgICAgICAgICByZWFkbGluZS5jdXJzb3JUbyhwcm9jZXNzLnN0ZG91dCwgMCk7Y29uc29sZS5sb2coYXBwICsgJ2V4dHJlYWN0LXdhdGNoLXJ1biAoYXN5bmMpJylcbiAgICAgICAgICB0aGlzLndhdGNoUnVuKClcbiAgICAgICAgICBjYigpXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgY29tcGlsZXIuaG9va3Mud2F0Y2hSdW4udGFwKCdleHRyZWFjdC13YXRjaC1ydW4nLCAod2F0Y2hpbmcpID0+IHtcbiAgICAgICAgICByZWFkbGluZS5jdXJzb3JUbyhwcm9jZXNzLnN0ZG91dCwgMCk7Y29uc29sZS5sb2coYXBwICsgJ2V4dHJlYWN0LXdhdGNoLXJ1bicpXG4gICAgICAgICAgdGhpcy53YXRjaFJ1bigpXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgY29tcGlsZXIucGx1Z2luKCd3YXRjaC1ydW4nLCAod2F0Y2hpbmcsIGNiKSA9PiB7XG4gICAgICAgIHJlYWRsaW5lLmN1cnNvclRvKHByb2Nlc3Muc3Rkb3V0LCAwKTtjb25zb2xlLmxvZyhhcHAgKyAnd2F0Y2gtcnVuJylcbiAgICAgICAgdGhpcy53YXRjaFJ1bigpXG4gICAgICAgIGNiKClcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIGV4dHJhY3QgeHR5cGVzIGZyb20gSlNYIHRhZ3NcbiAgICBpZiAoY29tcGlsZXIuaG9va3MpIHtcbiAgICAgIGNvbXBpbGVyLmhvb2tzLmNvbXBpbGF0aW9uLnRhcCgnZXh0cmVhY3QtY29tcGlsYXRpb24nLCAoY29tcGlsYXRpb24sZGF0YSkgPT4ge1xuICAgICAgICByZWFkbGluZS5jdXJzb3JUbyhwcm9jZXNzLnN0ZG91dCwgMCk7Y29uc29sZS5sb2coYXBwICsgJ2V4dHJlYWN0LWNvbXBpbGF0aW9uJylcblxuICAgICAgICAvLyAvL21qZyBlYXJseVxuICAgICAgICAvLyB0aGlzLm91dHB1dCA9ICdleHQtcmVhY3QvZXh0anMnXG4gICAgICAgIC8vIGNvbnN0IGpzQ2h1bmsgPSBjb21waWxhdGlvbi5hZGRDaHVuayhgJHt0aGlzLm91dHB1dH0tanNgKTtcbiAgICAgICAgLy8gLy9jb25zdCBqc0NodW5rID0gY29tcGlsYXRpb24uYWRkQ2h1bmsoYGV4dGApO1xuICAgICAgICAvLyBqc0NodW5rLmhhc1J1bnRpbWUgPSBqc0NodW5rLmlzSW5pdGlhbCA9ICgpID0+IHRydWU7XG4gICAgICAgIC8vIGpzQ2h1bmsuZmlsZXMucHVzaChwYXRoLmpvaW4odGhpcy5vdXRwdXQsICdleHQuanMnKSk7XG4gICAgICAgIC8vIGpzQ2h1bmsuZmlsZXMucHVzaChwYXRoLmpvaW4odGhpcy5vdXRwdXQsICdleHQuY3NzJykpO1xuICAgICAgICAvLyBqc0NodW5rLmlkID0gLTI7IC8vIHRoaXMgZm9yY2VzIGh0bWwtd2VicGFjay1wbHVnaW4gdG8gaW5jbHVkZSBleHQuanMgZmlyc3RcbiAgICAgICAgLy8gY29uc29sZS5sb2coJyoqKioqKioqY29tcGlsYXRpb24uY2h1bmtzWzBdJylcbiAgICAgICAgLy8gY29uc29sZS5sb2coY29tcGlsYXRpb24uY2h1bmtzWzBdLmlkKVxuXG5cblxuXG4gICAgICAgIGNvbXBpbGF0aW9uLmhvb2tzLnN1Y2NlZWRNb2R1bGUudGFwKCdleHRyZWFjdC1zdWNjZWVkLW1vZHVsZScsIChtb2R1bGUpID0+IHtcbiAgICAgICAgICB0aGlzLnN1Y2NlZWRNb2R1bGUoY29tcGlsYXRpb24sIG1vZHVsZSlcbiAgICAgICAgfSlcblxuICAgICAgICBkYXRhLm5vcm1hbE1vZHVsZUZhY3RvcnkucGx1Z2luKFwicGFyc2VyXCIsIGZ1bmN0aW9uKHBhcnNlciwgb3B0aW9ucykge1xuICAgICAgICAgIC8vIGV4dHJhY3QgeHR5cGVzIGFuZCBjbGFzc2VzIGZyb20gRXh0LmNyZWF0ZSBjYWxsc1xuICAgICAgICAgIHBhcnNlci5wbHVnaW4oJ2NhbGwgRXh0LmNyZWF0ZScsIGFkZFRvTWFuaWZlc3QpO1xuICAgICAgICAgIC8vIGNvcHkgRXh0LnJlcXVpcmUgY2FsbHMgdG8gdGhlIG1hbmlmZXN0LiAgVGhpcyBhbGxvd3MgdGhlIHVzZXJzIHRvIGV4cGxpY2l0bHkgcmVxdWlyZSBhIGNsYXNzIGlmIHRoZSBwbHVnaW4gZmFpbHMgdG8gZGV0ZWN0IGl0LlxuICAgICAgICAgIHBhcnNlci5wbHVnaW4oJ2NhbGwgRXh0LnJlcXVpcmUnLCBhZGRUb01hbmlmZXN0KTtcbiAgICAgICAgICAvLyBjb3B5IEV4dC5kZWZpbmUgY2FsbHMgdG8gdGhlIG1hbmlmZXN0LiAgVGhpcyBhbGxvd3MgdXNlcnMgdG8gd3JpdGUgc3RhbmRhcmQgRXh0UmVhY3QgY2xhc3Nlcy5cbiAgICAgICAgICBwYXJzZXIucGx1Z2luKCdjYWxsIEV4dC5kZWZpbmUnLCBhZGRUb01hbmlmZXN0KTtcbiAgICAgICAgfSlcblxuICAgICAgfSlcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBjb21waWxlci5wbHVnaW4oJ2NvbXBpbGF0aW9uJywgKGNvbXBpbGF0aW9uLCBkYXRhKSA9PiB7XG4gICAgICAgIHJlYWRsaW5lLmN1cnNvclRvKHByb2Nlc3Muc3Rkb3V0LCAwKTtjb25zb2xlLmxvZyhhcHAgKyAnY29tcGlsYXRpb24nKVxuICAgICAgICBjb21waWxhdGlvbi5wbHVnaW4oJ3N1Y2NlZWQtbW9kdWxlJywgKG1vZHVsZSkgPT4ge1xuICAgICAgICAgIHRoaXMuc3VjY2VlZE1vZHVsZShjb21waWxhdGlvbiwgbW9kdWxlKVxuICAgICAgICB9KVxuXG4gICAgICAgIGRhdGEubm9ybWFsTW9kdWxlRmFjdG9yeS5wbHVnaW4oXCJwYXJzZXJcIiwgZnVuY3Rpb24ocGFyc2VyLCBvcHRpb25zKSB7XG4gICAgICAgICAgLy8gZXh0cmFjdCB4dHlwZXMgYW5kIGNsYXNzZXMgZnJvbSBFeHQuY3JlYXRlIGNhbGxzXG4gICAgICAgICAgcGFyc2VyLnBsdWdpbignY2FsbCBFeHQuY3JlYXRlJywgYWRkVG9NYW5pZmVzdCk7XG4gICAgICAgICAgLy8gY29weSBFeHQucmVxdWlyZSBjYWxscyB0byB0aGUgbWFuaWZlc3QuICBUaGlzIGFsbG93cyB0aGUgdXNlcnMgdG8gZXhwbGljaXRseSByZXF1aXJlIGEgY2xhc3MgaWYgdGhlIHBsdWdpbiBmYWlscyB0byBkZXRlY3QgaXQuXG4vL2NvbnNvbGUubG9nKCdwYXJzZXIucGx1Z2luJylcbiAgICAgICAgICBwYXJzZXIucGx1Z2luKCdjYWxsIEV4dC5yZXF1aXJlJywgYWRkVG9NYW5pZmVzdCk7XG4gICAgICAgICAgLy8gY29weSBFeHQuZGVmaW5lIGNhbGxzIHRvIHRoZSBtYW5pZmVzdC4gIFRoaXMgYWxsb3dzIHVzZXJzIHRvIHdyaXRlIHN0YW5kYXJkIEV4dFJlYWN0IGNsYXNzZXMuXG4gICAgICAgICAgcGFyc2VyLnBsdWdpbignY2FsbCBFeHQuZGVmaW5lJywgYWRkVG9NYW5pZmVzdCk7XG4gICAgICAgIH0pXG5cbiAgICAgIH0pXG4gICAgfVxuXG5cblxuXG4gICAgLy8gb25jZSBhbGwgbW9kdWxlcyBhcmUgcHJvY2Vzc2VkLCBjcmVhdGUgdGhlIG9wdGltaXplZCBFeHRSZWFjdCBidWlsZC5cbiAgICBpZiAoY29tcGlsZXIuaG9va3MpIHtcbiAgICAgIGlmICh0aGlzLmFzeW5jaHJvbm91cykge1xuICAgICAgICBjb21waWxlci5ob29rcy5lbWl0LnRhcEFzeW5jKCdleHRyZWFjdC1lbWl0IChhc3luYyknLCAoY29tcGlsYXRpb24sIGNiKSA9PiB7XG4gICAgICAgICAgcmVhZGxpbmUuY3Vyc29yVG8ocHJvY2Vzcy5zdGRvdXQsIDApO2NvbnNvbGUubG9nKGFwcCArICdleHRyZWFjdC1lbWl0JylcbiAgICAgICAgICB0aGlzLmVtaXQoY29tcGlsZXIsIGNvbXBpbGF0aW9uLCBjYilcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBjb21waWxlci5ob29rcy5lbWl0LnRhcCgnZXh0cmVhY3QtZW1pdCcsIChjb21waWxhdGlvbikgPT4ge1xuICAgICAgICAgIHJlYWRsaW5lLmN1cnNvclRvKHByb2Nlc3Muc3Rkb3V0LCAwKTtjb25zb2xlLmxvZyhhcHAgKyAnZXh0cmVhY3QtZW1pdCcpXG4gICAgICAgICAgdGhpcy5lbWl0KGNvbXBpbGVyLCBjb21waWxhdGlvbiwgbnVsbClcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBjb21waWxlci5wbHVnaW4oJ2VtaXQnLCAoY29tcGlsYXRpb24sIGNhbGxiYWNrKSA9PiB7XG4gICAgICAgIHJlYWRsaW5lLmN1cnNvclRvKHByb2Nlc3Muc3Rkb3V0LCAwKTtjb25zb2xlLmxvZyhhcHAgKyAnZW1pdCcpXG4gICAgICAgIHRoaXMuZW1pdChjb21waWxlciwgY29tcGlsYXRpb24sIGNhbGxiYWNrKVxuICAgICAgfSlcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2tzIGVhY2ggYnVpbGQgY29uZmlnIGZvciBtaXNzaW5nL2ludmFsaWQgcHJvcGVydGllc1xuICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBUaGUgbmFtZSBvZiB0aGUgYnVpbGRcbiAgICogQHBhcmFtIHtTdHJpbmd9IGJ1aWxkIFRoZSBidWlsZCBjb25maWdcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF92YWxpZGF0ZUJ1aWxkQ29uZmlnKG5hbWUsIGJ1aWxkKSB7XG4gICAgbGV0IHsgc2RrLCBwcm9kdWN0aW9uIH0gPSBidWlsZDtcblxuICAgIGlmIChwcm9kdWN0aW9uKSB7XG4gICAgICBidWlsZC50cmVlU2hha2luZyA9IGZhbHNlO1xuICAgIH1cbiAgICBpZiAoc2RrKSB7XG4gICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoc2RrKSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgTm8gU0RLIGZvdW5kIGF0ICR7cGF0aC5yZXNvbHZlKHNkayl9LiAgRGlkIHlvdSBmb3IgZ2V0IHRvIGxpbmsvY29weSB5b3VyIEV4dCBKUyBTREsgdG8gdGhhdCBsb2NhdGlvbj9gKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5fYWRkUmVhY3RvclBhY2thZ2UoYnVpbGQpXG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGJ1aWxkLnNkayA9IHBhdGguZGlybmFtZShyZXNvbHZlKCdAZXh0anMvZXh0LXJlYWN0JywgeyBiYXNlZGlyOiBwcm9jZXNzLmN3ZCgpIH0pKVxuICAgICAgICBidWlsZC5wYWNrYWdlRGlycyA9IFsuLi4oYnVpbGQucGFja2FnZURpcnMgfHwgW10pLCBwYXRoLmRpcm5hbWUoYnVpbGQuc2RrKV07XG4gICAgICAgIGJ1aWxkLnBhY2thZ2VzID0gYnVpbGQucGFja2FnZXMgfHwgdGhpcy5fZmluZFBhY2thZ2VzKGJ1aWxkLnNkayk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgQGV4dGpzL2V4dC1yZWFjdCBub3QgZm91bmQuICBZb3UgY2FuIGluc3RhbGwgaXQgd2l0aCBcIm5wbSBpbnN0YWxsIC0tc2F2ZSBAZXh0anMvZXh0LXJlYWN0XCIgb3IsIGlmIHlvdSBoYXZlIGEgbG9jYWwgY29weSBvZiB0aGUgU0RLLCBzcGVjaWZ5IHRoZSBwYXRoIHRvIGl0IHVzaW5nIHRoZSBcInNka1wiIG9wdGlvbiBpbiBidWlsZCBcIiR7bmFtZX0uXCJgKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQWRkcyB0aGUgcmVhY3RvciBwYWNrYWdlIGlmIHByZXNlbnQgYW5kIHRoZSB0b29sa2l0IGlzIG1vZGVyblxuICAgKiBAcGFyYW0ge09iamVjdH0gYnVpbGQgXG4gICAqL1xuICBfYWRkUmVhY3RvclBhY2thZ2UoYnVpbGQpIHtcbiAgICBpZiAoYnVpbGQudG9vbGtpdCA9PT0gJ2NsYXNzaWMnKSByZXR1cm47XG4gICAgaWYgKGZzLmV4aXN0c1N5bmMocGF0aC5qb2luKGJ1aWxkLnNkaywgJ2V4dCcsICdtb2Rlcm4nLCAncmVhY3RvcicpKSB8fCAgLy8gcmVwb1xuICAgICAgZnMuZXhpc3RzU3luYyhwYXRoLmpvaW4oYnVpbGQuc2RrLCAnbW9kZXJuJywgJ3JlYWN0b3InKSkpIHsgLy8gcHJvZHVjdGlvbiBidWlsZFxuICAgICAgaWYgKCFidWlsZC5wYWNrYWdlcykge1xuICAgICAgICBidWlsZC5wYWNrYWdlcyA9IFtdO1xuICAgICAgfVxuICAgICAgYnVpbGQucGFja2FnZXMucHVzaCgncmVhY3RvcicpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm4gdGhlIG5hbWVzIG9mIGFsbCBFeHRSZWFjdCBwYWNrYWdlcyBpbiB0aGUgc2FtZSBwYXJlbnQgZGlyZWN0b3J5IGFzIGV4dC1yZWFjdCAodHlwaWNhbGx5IG5vZGVfbW9kdWxlcy9AZXh0anMpXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBzZGsgUGF0aCB0byBleHQtcmVhY3RcbiAgICogQHJldHVybiB7U3RyaW5nW119XG4gICAqL1xuICBfZmluZFBhY2thZ2VzKHNkaykge1xuICAgIGNvbnN0IG1vZHVsZXNEaXIgPSBwYXRoLmpvaW4oc2RrLCAnLi4nKTtcbiAgICByZXR1cm4gZnMucmVhZGRpclN5bmMobW9kdWxlc0RpcilcbiAgICAgIC8vIEZpbHRlciBvdXQgZGlyZWN0b3JpZXMgd2l0aG91dCAncGFja2FnZS5qc29uJ1xuICAgICAgLmZpbHRlcihkaXIgPT4gZnMuZXhpc3RzU3luYyhwYXRoLmpvaW4obW9kdWxlc0RpciwgZGlyLCAncGFja2FnZS5qc29uJykpKVxuICAgICAgLy8gR2VuZXJhdGUgYXJyYXkgb2YgcGFja2FnZSBuYW1lc1xuICAgICAgLm1hcChkaXIgPT4ge1xuICAgICAgICAgIGNvbnN0IHBhY2thZ2VJbmZvID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMocGF0aC5qb2luKG1vZHVsZXNEaXIsIGRpciwgJ3BhY2thZ2UuanNvbicpKSk7XG4gICAgICAgICAgLy8gRG9uJ3QgaW5jbHVkZSB0aGVtZSB0eXBlIHBhY2thZ2VzLlxuICAgICAgICAgIGlmKHBhY2thZ2VJbmZvLnNlbmNoYSAmJiBwYWNrYWdlSW5mby5zZW5jaGEudHlwZSAhPT0gJ3RoZW1lJykge1xuICAgICAgICAgICAgICByZXR1cm4gcGFja2FnZUluZm8uc2VuY2hhLm5hbWU7XG4gICAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC8vIFJlbW92ZSBhbnkgdW5kZWZpbmVkcyBmcm9tIG1hcFxuICAgICAgLmZpbHRlcihuYW1lID0+IG5hbWUpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIHBhdGggdG8gdGhlIHNlbmNoYSBjbWQgZXhlY3V0YWJsZVxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcmV0dXJuIHtTdHJpbmd9XG4gICAqL1xuICBfZ2V0U2VuY2hDbWRQYXRoKCkge1xuICAgIHRyeSB7XG4gICAgICAvLyB1c2UgQGV4dGpzL3NlbmNoYS1jbWQgZnJvbSBub2RlX21vZHVsZXNcbiAgICAgIHJldHVybiByZXF1aXJlKCdAZXh0anMvc2VuY2hhLWNtZCcpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIC8vIGF0dGVtcHQgdG8gdXNlIGdsb2JhbGx5IGluc3RhbGxlZCBTZW5jaGEgQ21kXG4gICAgICByZXR1cm4gJ3NlbmNoYSc7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAvKipcbiAgICAqIEJ1aWxkcyBhIG1pbmltYWwgdmVyc2lvbiBvZiB0aGUgRXh0UmVhY3QgZnJhbWV3b3JrIGJhc2VkIG9uIHRoZSBjbGFzc2VzIHVzZWRcbiAgICAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIFRoZSBuYW1lIG9mIHRoZSBidWlsZFxuICAgICogQHBhcmFtIHtNb2R1bGVbXX0gbW9kdWxlcyB3ZWJwYWNrIG1vZHVsZXNcbiAgICAqIEBwYXJhbSB7U3RyaW5nfSBvdXRwdXQgVGhlIHBhdGggdG8gd2hlcmUgdGhlIGZyYW1ld29yayBidWlsZCBzaG91bGQgYmUgd3JpdHRlblxuICAgICogQHBhcmFtIHtTdHJpbmd9IFt0b29sa2l0PSdtb2Rlcm4nXSBcIm1vZGVyblwiIG9yIFwiY2xhc3NpY1wiXG4gICAgKiBAcGFyYW0ge1N0cmluZ30gb3V0cHV0IFRoZSBwYXRoIHRvIHRoZSBkaXJlY3RvcnkgdG8gY3JlYXRlIHdoaWNoIHdpbGwgY29udGFpbiB0aGUganMgYW5kIGNzcyBidW5kbGVzXG4gICAgKiBAcGFyYW0ge1N0cmluZ30gdGhlbWUgVGhlIG5hbWUgb2YgdGhlIEV4dFJlYWN0IHRoZW1lIHBhY2thZ2UgdG8gdXNlLCBmb3IgZXhhbXBsZSBcInRoZW1lLW1hdGVyaWFsXCJcbiAgICAqIEBwYXJhbSB7U3RyaW5nW119IHBhY2thZ2VzIEFuIGFycmF5IG9mIEV4dFJlYWN0IHBhY2thZ2VzIHRvIGluY2x1ZGVcbiAgICAqIEBwYXJhbSB7U3RyaW5nW119IHBhY2thZ2VEaXJzIERpcmVjdG9yaWVzIGNvbnRhaW5pbmcgcGFja2FnZXNcbiAgICAqIEBwYXJhbSB7U3RyaW5nW119IG92ZXJyaWRlcyBBbiBhcnJheSBvZiBsb2NhdGlvbnMgZm9yIG92ZXJyaWRlc1xuICAgICogQHBhcmFtIHtTdHJpbmd9IHNkayBUaGUgZnVsbCBwYXRoIHRvIHRoZSBFeHRSZWFjdCBTREtcbiAgICAqIEBwcml2YXRlXG4gICAgKi9cbiAgX2J1aWxkRXh0QnVuZGxlKGlzV2VicGFjazQsIG5hbWUsIG1vZHVsZXMsIG91dHB1dCwgeyB0b29sa2l0PSdtb2Rlcm4nLCB0aGVtZSwgcGFja2FnZXM9W10sIHBhY2thZ2VEaXJzPVtdLCBzZGssIG92ZXJyaWRlc30pIHtcbi8vICAgICBjb25zb2xlLmxvZyhtb2R1bGVzKVxuICAgIC8vICBjb25zb2xlLmxvZygnKioqKionKVxuICAgIC8vICBjb25zb2xlLmxvZyhpc1dlYnBhY2s0KVxuICAgIC8vICBjb25zb2xlLmxvZygnKioqKionKVxuXG4gICAgbGV0IHNlbmNoYSA9IHRoaXMuX2dldFNlbmNoQ21kUGF0aCgpO1xuICAgIHRoZW1lID0gdGhlbWUgfHwgKHRvb2xraXQgPT09ICdjbGFzc2ljJyA/ICd0aGVtZS10cml0b24nIDogJ3RoZW1lLW1hdGVyaWFsJyk7XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgdGhpcy5vbkJ1aWxkRmFpbCA9IHJlamVjdDtcbiAgICAgIHRoaXMub25CdWlsZFN1Y2Nlc3MgPSByZXNvbHZlO1xuXG4gICAgICBjbWRFcnJvcnMgPSBbXTtcbiAgICAgIFxuICAgICAgY29uc3Qgb25CdWlsZERvbmUgPSAoKSA9PiB7XG5cbiAgICAgICAgaWYgKGNtZEVycm9ycy5sZW5ndGgpIHtcbiAgICAgICAgICB0aGlzLm9uQnVpbGRGYWlsKG5ldyBFcnJvcihjbWRFcnJvcnMuam9pbihcIlwiKSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMub25CdWlsZFN1Y2Nlc3MoKTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgaWYgKCF3YXRjaGluZykge1xuICAgICAgICByaW1yYWYob3V0cHV0KTtcbiAgICAgICAgbWtkaXJwKG91dHB1dCk7XG4gICAgICB9XG5cbiAgICAgIGxldCBqcztcblxuICAgICAgaWYgKHRoaXMudHJlZVNoYWtpbmcpIHtcbiAgICAgICAgbGV0IHN0YXRlbWVudHMgPSBbJ0V4dC5yZXF1aXJlKFtcIkV4dC5hcHAuQXBwbGljYXRpb25cIiwgXCJFeHQuQ29tcG9uZW50XCIsIFwiRXh0LldpZGdldFwiLCBcIkV4dC5sYXlvdXQuRml0XCJdKSddOyAvLyBmb3Igc29tZSByZWFzb24gY29tbWFuZCBkb2Vzbid0IGxvYWQgY29tcG9uZW50IHdoZW4gb25seSBwYW5lbCBpcyByZXF1aXJlZFxuICAgICAgICBpZiAocGFja2FnZXMuaW5kZXhPZigncmVhY3RvcicpICE9PSAtMSkge1xuICAgICAgICAgIHN0YXRlbWVudHMucHVzaCgnRXh0LnJlcXVpcmUoXCJFeHQucmVhY3Rvci5SZW5kZXJlckNlbGxcIiknKTtcbiAgICAgICAgfVxuICAgICAgICAvL21qZ1xuICAgICAgICBmb3IgKGxldCBtb2R1bGUgb2YgbW9kdWxlcykge1xuICAgICAgICAgIGNvbnN0IGRlcHMgPSB0aGlzLmRlcGVuZGVuY2llc1ttb2R1bGUucmVzb3VyY2VdO1xuICAgICAgICAgIGlmIChkZXBzKSBzdGF0ZW1lbnRzID0gc3RhdGVtZW50cy5jb25jYXQoZGVwcyk7XG4gICAgICAgIH1cbiAgICAgICAganMgPSBzdGF0ZW1lbnRzLmpvaW4oJztcXG4nKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGpzID0gJ0V4dC5yZXF1aXJlKFwiRXh0LipcIiknO1xuICAgICAgfVxuICAgICAgY29uc3QgbWFuaWZlc3QgPSBwYXRoLmpvaW4ob3V0cHV0LCAnbWFuaWZlc3QuanMnKTtcbiAgICAgIC8vIGFkZCBleHQtcmVhY3QvcGFja2FnZXMgYXV0b21hdGljYWxseSBpZiBwcmVzZW50XG4gICAgICBjb25zdCB1c2VyUGFja2FnZXMgPSBwYXRoLmpvaW4oJy4nLCAnZXh0LXJlYWN0JywgJ3BhY2thZ2VzJyk7XG4gICAgICBpZiAoZnMuZXhpc3RzU3luYyh1c2VyUGFja2FnZXMpKSB7XG4gICAgICAgIHBhY2thZ2VEaXJzLnB1c2godXNlclBhY2thZ2VzKVxuICAgICAgfVxuXG4gICAgICBpZiAoZnMuZXhpc3RzU3luYyhwYXRoLmpvaW4oc2RrLCAnZXh0JykpKSB7XG4gICAgICAgIC8vIGxvY2FsIGNoZWNrb3V0IG9mIHRoZSBTREsgcmVwb1xuICAgICAgICBwYWNrYWdlRGlycy5wdXNoKHBhdGguam9pbignZXh0JywgJ3BhY2thZ2VzJykpO1xuICAgICAgICBzZGsgPSBwYXRoLmpvaW4oc2RrLCAnZXh0Jyk7XG4gICAgICB9XG4gICAgICBpZiAoIXdhdGNoaW5nKSB7XG4gICAgICAgIGZzLndyaXRlRmlsZVN5bmMocGF0aC5qb2luKG91dHB1dCwgJ2J1aWxkLnhtbCcpLCBidWlsZFhNTCh7IGNvbXByZXNzOiB0aGlzLnByb2R1Y3Rpb24gfSksICd1dGY4Jyk7XG4gICAgICAgIGZzLndyaXRlRmlsZVN5bmMocGF0aC5qb2luKG91dHB1dCwgJ2pzZG9tLWVudmlyb25tZW50LmpzJyksIGNyZWF0ZUpTRE9NRW52aXJvbm1lbnQoKSwgJ3V0ZjgnKTtcbiAgICAgICAgZnMud3JpdGVGaWxlU3luYyhwYXRoLmpvaW4ob3V0cHV0LCAnYXBwLmpzb24nKSwgY3JlYXRlQXBwSnNvbih7IHRoZW1lLCBwYWNrYWdlcywgdG9vbGtpdCwgb3ZlcnJpZGVzLCBwYWNrYWdlRGlycyB9KSwgJ3V0ZjgnKTtcbiAgICAgICAgZnMud3JpdGVGaWxlU3luYyhwYXRoLmpvaW4ob3V0cHV0LCAnd29ya3NwYWNlLmpzb24nKSwgY3JlYXRlV29ya3NwYWNlSnNvbihzZGssIHBhY2thZ2VEaXJzLCBvdXRwdXQpLCAndXRmOCcpO1xuICAgICAgfVxuXG4gICAgICBsZXQgY21kUmVidWlsZE5lZWRlZCA9IGZhbHNlO1xuXG4gICAgICBpZiAodGhpcy5tYW5pZmVzdCA9PT0gbnVsbCB8fCBqcyAhPT0gdGhpcy5tYW5pZmVzdCkge1xuICAgICAgICAvLyBPbmx5IHdyaXRlIG1hbmlmZXN0IGlmIGl0IGRpZmZlcnMgZnJvbSB0aGUgbGFzdCBydW4uICBUaGlzIHByZXZlbnRzIHVubmVjZXNzYXJ5IGNtZCByZWJ1aWxkcy5cbiAgICAgICAgdGhpcy5tYW5pZmVzdCA9IGpzO1xuICAgICAgICBjb25zb2xlLmxvZygnXFxuXFxuanM6JylcbiAgICAgICAgY29uc29sZS5sb2coanMpXG4gICAgICAgIGNvbnNvbGUubG9nKCdcXG5cXG4nKVxuICAgICAgICBmcy53cml0ZUZpbGVTeW5jKG1hbmlmZXN0LCBqcywgJ3V0ZjgnKTtcbiAgICAgICAgY21kUmVidWlsZE5lZWRlZCA9IHRydWU7XG4gICAgICAgIHJlYWRsaW5lLmN1cnNvclRvKHByb2Nlc3Muc3Rkb3V0LCAwKTtjb25zb2xlLmxvZyhhcHAgKyBgYnVpbGRpbmcgRXh0UmVhY3QgYnVuZGxlOiAke25hbWV9ID0+ICR7b3V0cHV0fWApXG4gICAgICB9XG5cblxuICAgICAgaWYgKGlzV2VicGFjazQpIHtcbiAgICAgICAgLy9leGVjU3luYyhzZW5jaGEsIFsnYW50JywgJ3dhdGNoJ10sIHsgY3dkOiBvdXRwdXQsIHNpbGVudDogZmFsc2UgfSlcbiAgICAgICAgY29uc3Qgc3Bhd25TeW5jID0gcmVxdWlyZSgnY2hpbGRfcHJvY2VzcycpLnNwYXduU3luY1xuICAgICAgICBzcGF3blN5bmMoc2VuY2hhLCBbJ2FudCcsICdidWlsZCddLCB7IGN3ZDogb3V0cHV0LCBzdGRpbzogJ2luaGVyaXQnLCBlbmNvZGluZzogJ3V0Zi04J30pXG5cbiAgICAgICAgb25CdWlsZERvbmUoKVxuICAgICAgfVxuXG4gICAgICBpZiAoIWlzV2VicGFjazQpIHtcbiAgICAgICAgaWYgKHRoaXMud2F0Y2gpIHtcbiAgICAgICAgICBpZiAoIXdhdGNoaW5nKSB7XG4gICAgICAgICAgICB3YXRjaGluZyA9IGdhdGhlckVycm9ycyhmb3JrKHNlbmNoYSwgWydhbnQnLCAnd2F0Y2gnXSwgeyBjd2Q6IG91dHB1dCwgc2lsZW50OiB0cnVlIH0pKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdhZnRlciBmb3JrJylcbiAgICAgICAgICAgIHdhdGNoaW5nLnN0ZGVyci5waXBlKHByb2Nlc3Muc3RkZXJyKTtcbiAgICAgICAgICAgIHdhdGNoaW5nLnN0ZG91dC5waXBlKHByb2Nlc3Muc3Rkb3V0KTtcbiAgICAgICAgICAgIHdhdGNoaW5nLnN0ZG91dC5vbignZGF0YScsIGRhdGEgPT4ge1xuICAgICAgICAgICAgICBpZiAoZGF0YSAmJiBkYXRhLnRvU3RyaW5nKCkubWF0Y2goL1dhaXRpbmcgZm9yIGNoYW5nZXNcXC5cXC5cXC4vKSkge1xuICAgICAgICAgICAgICAgIG9uQnVpbGREb25lKClcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIHdhdGNoaW5nLm9uKCdleGl0Jywgb25CdWlsZERvbmUpXG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghY21kUmVidWlsZE5lZWRlZCkgb25CdWlsZERvbmUoKTtcbiAgICAgICAgfSBcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgY29uc3QgYnVpbGQgPSBnYXRoZXJFcnJvcnMoZm9yayhzZW5jaGEsIFsnYW50JywgJ2J1aWxkJ10sIHsgc3RkaW86ICdpbmhlcml0JywgZW5jb2Rpbmc6ICd1dGYtOCcsIGN3ZDogb3V0cHV0LCBzaWxlbnQ6IGZhbHNlIH0pKTtcbiAgICAgICAgICBjb25zb2xlLmxvZygnYWZ0ZXIgZm9yaycpXG4gICAgICAgICAgaWYoYnVpbGQuc3Rkb3V0KSB7IGJ1aWxkLnN0ZG91dC5waXBlKHByb2Nlc3Muc3Rkb3V0KSB9XG4gICAgICAgICAgaWYoYnVpbGQuc3RkZXJyKSB7IGJ1aWxkLnN0ZGVyci5waXBlKHByb2Nlc3Muc3RkZXJyKSB9XG4gICAgICAgICAgYnVpbGQub24oJ2V4aXQnLCBvbkJ1aWxkRG9uZSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuXG4gICAgfSk7XG4gIH1cbn07XG4iXX0=