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

        //if (this.manifest === null || js !== this.manifest) {
        // Only write manifest if it differs from the last run.  This prevents unnecessary cmd rebuilds.
        _this4.manifest = js;
        console.log('\njs:');
        console.log(js);
        // console.log('\n\n')
        _fs2.default.writeFileSync(manifest, js, 'utf8');
        cmdRebuildNeeded = true;
        readline.cursorTo(process.stdout, 0);console.log(app + ('building ExtReact bundle: ' + name + ' => ' + output));
        //}


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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9pbmRleC5qcyJdLCJuYW1lcyI6WyJyZWFkbGluZSIsInJlYWN0VmVyc2lvbiIsIndhdGNoaW5nIiwiY21kRXJyb3JzIiwiYXBwIiwiY2hhbGsiLCJncmVlbiIsImdhdGhlckVycm9ycyIsImNtZCIsInN0ZG91dCIsIm9uIiwibWVzc2FnZSIsImRhdGEiLCJ0b1N0cmluZyIsIm1hdGNoIiwicHVzaCIsInJlcGxhY2UiLCJtb2R1bGUiLCJleHBvcnRzIiwib3B0aW9ucyIsInBrZyIsImZzIiwiZXhpc3RzU3luYyIsIkpTT04iLCJwYXJzZSIsInJlYWRGaWxlU3luYyIsInJlYWN0RW50cnkiLCJkZXBlbmRlbmNpZXMiLCJyZWFjdCIsImlzMTYiLCJpbmNsdWRlcyIsImV4dFJlYWN0UmMiLCJnZXREZWZhdWx0T3B0aW9ucyIsImJ1aWxkcyIsIk9iamVjdCIsImtleXMiLCJsZW5ndGgiLCJidWlsZE9wdGlvbnMiLCJleHQiLCJuYW1lIiwiX3ZhbGlkYXRlQnVpbGRDb25maWciLCJhc3NpZ24iLCJjdXJyZW50RmlsZSIsIm1hbmlmZXN0IiwiZGVidWciLCJ3YXRjaCIsInRlc3QiLCJvdXRwdXQiLCJ0b29sa2l0IiwicGFja2FnZXMiLCJwYWNrYWdlRGlycyIsIm92ZXJyaWRlcyIsImFzeW5jaHJvbm91cyIsInByb2R1Y3Rpb24iLCJtYW5pZmVzdEV4dHJhY3RvciIsImV4dHJhY3RGcm9tSlNYIiwidHJlZVNoYWtpbmciLCJjb21waWxhdGlvbiIsInJlc291cmNlIiwiZG9QYXJzZSIsIl9zb3VyY2UiLCJfdmFsdWUiLCJlIiwiY29uc29sZSIsImVycm9yIiwiY29tcGlsZXIiLCJjYWxsYmFjayIsImlzV2VicGFjazQiLCJob29rcyIsIm1vZHVsZXMiLCJjaHVua3MiLCJyZWR1Y2UiLCJhIiwiYiIsImNvbmNhdCIsIl9tb2R1bGVzIiwiYnVpbGQiLCJvdXRwdXRQYXRoIiwicGF0aCIsImpvaW4iLCJkZXZTZXJ2ZXIiLCJjb250ZW50QmFzZSIsIl9idWlsZEV4dEJ1bmRsZSIsInRoZW4iLCJjYXRjaCIsImVycm9ycyIsIkVycm9yIiwid2VicGFja1ZlcnNpb24iLCJ1bmRlZmluZWQiLCJjdXJzb3JUbyIsInByb2Nlc3MiLCJsb2ciLCJtZSIsImFkZFRvTWFuaWZlc3QiLCJjYWxsIiwiZmlsZSIsInN0YXRlIiwid2F0Y2hSdW4iLCJ0YXBBc3luYyIsImNiIiwidGFwIiwicGx1Z2luIiwic3VjY2VlZE1vZHVsZSIsIm5vcm1hbE1vZHVsZUZhY3RvcnkiLCJwYXJzZXIiLCJlbWl0Iiwic2RrIiwicmVzb2x2ZSIsIl9hZGRSZWFjdG9yUGFja2FnZSIsImRpcm5hbWUiLCJiYXNlZGlyIiwiY3dkIiwiX2ZpbmRQYWNrYWdlcyIsIm1vZHVsZXNEaXIiLCJyZWFkZGlyU3luYyIsImZpbHRlciIsImRpciIsIm1hcCIsInBhY2thZ2VJbmZvIiwic2VuY2hhIiwidHlwZSIsInJlcXVpcmUiLCJ0aGVtZSIsIl9nZXRTZW5jaENtZFBhdGgiLCJQcm9taXNlIiwicmVqZWN0Iiwib25CdWlsZEZhaWwiLCJvbkJ1aWxkU3VjY2VzcyIsIm9uQnVpbGREb25lIiwianMiLCJzdGF0ZW1lbnRzIiwiaW5kZXhPZiIsImRlcHMiLCJ1c2VyUGFja2FnZXMiLCJ3cml0ZUZpbGVTeW5jIiwiY29tcHJlc3MiLCJjbWRSZWJ1aWxkTmVlZGVkIiwic3Bhd25TeW5jIiwic3RkaW8iLCJlbmNvZGluZyIsInNpbGVudCIsInN0ZGVyciIsInBpcGUiXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7QUFFQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOztBQUNBOzs7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBSUE7O0lBQVlBLFE7Ozs7Ozs7Ozs7OztBQWZaLElBQUlDLGVBQWUsQ0FBbkI7O0FBWUEsSUFBSUMsV0FBVyxLQUFmO0FBQ0EsSUFBSUMsa0JBQUo7QUFDQSxJQUFNQyxNQUFTQyxnQkFBTUMsS0FBTixDQUFZLFVBQVosQ0FBVCw4QkFBTjs7O0FBR0E7Ozs7QUFJQSxJ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QWhCLENBQXFCcEQsUUFBUW1ELE1BQTdCO0FBQ0EzSSx1QkFBU08sTUFBVCxDQUFnQnFJLElBQWhCLENBQXFCcEQsUUFBUWpGLE1BQTdCO0FBQ0FQLHVCQUFTTyxNQUFULENBQWdCQyxFQUFoQixDQUFtQixNQUFuQixFQUEyQixnQkFBUTtBQUNqQyxvQkFBSUUsUUFBUUEsS0FBS0MsUUFBTCxHQUFnQkMsS0FBaEIsQ0FBc0IsMkJBQXRCLENBQVosRUFBZ0U7QUFDOURrSDtBQUNEO0FBQ0YsZUFKRDtBQUtBOUgsdUJBQVNRLEVBQVQsQ0FBWSxNQUFaLEVBQW9Cc0gsV0FBcEI7QUFDRDtBQUNELGdCQUFJLENBQUNRLGdCQUFMLEVBQXVCUjtBQUN4QixXQWRELE1BZUs7QUFDSCxnQkFBTXBELFFBQVFyRSxhQUFhLHlCQUFLZ0gsTUFBTCxFQUFhLENBQUMsS0FBRCxFQUFRLE9BQVIsQ0FBYixFQUErQixFQUFFbUIsT0FBTyxTQUFULEVBQW9CQyxVQUFVLE9BQTlCLEVBQXVDNUIsS0FBS2hFLE1BQTVDLEVBQW9ENkYsUUFBUSxLQUE1RCxFQUEvQixDQUFiLENBQWQ7QUFDQTdFLG9CQUFRNEIsR0FBUixDQUFZLFlBQVo7QUFDQSxnQkFBR2YsTUFBTW5FLE1BQVQsRUFBaUI7QUFBRW1FLG9CQUFNbkUsTUFBTixDQUFhcUksSUFBYixDQUFrQnBELFFBQVFqRixNQUExQjtBQUFtQztBQUN0RCxnQkFBR21FLE1BQU1pRSxNQUFULEVBQWlCO0FBQUVqRSxvQkFBTWlFLE1BQU4sQ0FBYUMsSUFBYixDQUFrQnBELFFBQVFtRCxNQUExQjtBQUFtQztBQUN0RGpFLGtCQUFNbEUsRUFBTixDQUFTLE1BQVQsRUFBaUJzSCxXQUFqQjtBQUNEO0FBQ0Y7QUFHRixPQXZHTSxDQUFQO0FBd0dEO0FBbGpCSDs7QUFBQTtBQUFBIiwiZmlsZSI6ImluZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xudmFyIHJlYWN0VmVyc2lvbiA9IDBcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgY2pzb24gZnJvbSAnY2pzb24nO1xuaW1wb3J0IHsgc3luYyBhcyBta2RpcnAgfSBmcm9tICdta2RpcnAnO1xuaW1wb3J0IGV4dHJhY3RGcm9tSlNYIGZyb20gJy4vZXh0cmFjdEZyb21KU1gnO1xuaW1wb3J0IHsgc3luYyBhcyByaW1yYWYgfSBmcm9tICdyaW1yYWYnO1xuaW1wb3J0IHsgYnVpbGRYTUwsIGNyZWF0ZUFwcEpzb24sIGNyZWF0ZVdvcmtzcGFjZUpzb24sIGNyZWF0ZUpTRE9NRW52aXJvbm1lbnQgfSBmcm9tICcuL2FydGlmYWN0cyc7XG5pbXBvcnQgeyBleGVjU3luYywgc3Bhd24sIGZvcmsgfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCB7IGdlbmVyYXRlIH0gZnJvbSAnYXN0cmluZyc7XG5pbXBvcnQgeyBzeW5jIGFzIHJlc29sdmUgfSBmcm9tICdyZXNvbHZlJztcbmxldCB3YXRjaGluZyA9IGZhbHNlO1xubGV0IGNtZEVycm9ycztcbmNvbnN0IGFwcCA9IGAke2NoYWxrLmdyZWVuKCfihLkg772iZXh0772jOicpfSByZWFjdG9yLXdlYnBhY2stcGx1Z2luOiBgO1xuaW1wb3J0ICogYXMgcmVhZGxpbmUgZnJvbSAncmVhZGxpbmUnXG5cbi8qKlxuICogU2NyYXBlcyBTZW5jaGEgQ21kIG91dHB1dCwgYWRkaW5nIGVycm9yIG1lc3NhZ2VzIHRvIGNtZEVycm9ycztcbiAqIEBwYXJhbSB7UHJvY2Vzc30gYnVpbGQgQSBzZW5jaGEgQ21kIHByb2Nlc3NcbiAqL1xuY29uc3QgZ2F0aGVyRXJyb3JzID0gKGNtZCkgPT4ge1xuXG4gIGlmIChjbWQuc3Rkb3V0KSB7XG4gICAgY21kLnN0ZG91dC5vbignZGF0YScsIGRhdGEgPT4ge1xuICAgICAgY29uc3QgbWVzc2FnZSA9IGRhdGEudG9TdHJpbmcoKTtcbiAgICAgIGlmIChtZXNzYWdlLm1hdGNoKC9eXFxbRVJSXFxdLykpIHtcbiAgICAgICAgY21kRXJyb3JzLnB1c2gobWVzc2FnZS5yZXBsYWNlKC9eXFxbRVJSXFxdIC9naSwgJycpKTtcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgLy8gY21kLnN0ZGVyci5vbignZGF0YScsIChkYXRhKSA9PiB7XG4gIC8vICAgY29uc29sZS5lcnJvcihgRToke2RhdGF9YCk7XG4gIC8vIH0pXG5cbiAgcmV0dXJuIGNtZDtcbn1cblxuLyoqXG4gKiBQcm9kdWNlcyBhIG1pbmltYWwgYnVpbGQgb2YgRXh0UmVhY3QgYnkgY3Jhd2xpbmcgeW91ciBSZWFjdCBzb3VyY2UgY29kZSBhbmQgZXh0cmFjdGluZyB0aGUgeHR5cGVzIHVzZWRcbiAqIGluIEpTWCB0YWdzXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgUmVhY3RFeHRKU1dlYnBhY2tQbHVnaW4ge1xuXG4gIC8qKlxuICAgKiBAcGFyYW0ge09iamVjdFtdfSBidWlsZHNcbiAgICogQHBhcmFtIHtCb29sZWFufSBbZGVidWc9ZmFsc2VdIFNldCB0byB0cnVlIHRvIHByZXZlbnQgY2xlYW51cCBvZiBidWlsZCB0ZW1wb3JhcnkgYnVpbGQgYXJ0aWZhY3RzIHRoYXQgbWlnaHQgYmUgaGVscGZ1bCBpbiB0cm91Ymxlc2hvb3RpbmcgaXNzdWVzLlxuICAgKiBAcGFyYW0ge1N0cmluZ30gc2RrIFRoZSBmdWxsIHBhdGggdG8gdGhlIEV4dFJlYWN0IFNES1xuICAgKiBAcGFyYW0ge1N0cmluZ30gW3Rvb2xraXQ9J21vZGVybiddIFwibW9kZXJuXCIgb3IgXCJjbGFzc2ljXCJcbiAgICogQHBhcmFtIHtTdHJpbmd9IHRoZW1lIFRoZSBuYW1lIG9mIHRoZSBFeHRSZWFjdCB0aGVtZSBwYWNrYWdlIHRvIHVzZSwgZm9yIGV4YW1wbGUgXCJ0aGVtZS1tYXRlcmlhbFwiXG4gICAqIEBwYXJhbSB7U3RyaW5nW119IHBhY2thZ2VzIEFuIGFycmF5IG9mIEV4dFJlYWN0IHBhY2thZ2VzIHRvIGluY2x1ZGVcbiAgICogQHBhcmFtIHtTdHJpbmdbXX0gb3ZlcnJpZGVzIEFuIGFycmF5IHdpdGggdGhlIHBhdGhzIG9mIGRpcmVjdG9yaWVzIG9yIGZpbGVzIHRvIHNlYXJjaC4gQW55IGNsYXNzZXNcbiAgICogZGVjbGFyZWQgaW4gdGhlc2UgbG9jYXRpb25zIHdpbGwgYmUgYXV0b21hdGljYWxseSByZXF1aXJlZCBhbmQgaW5jbHVkZWQgaW4gdGhlIGJ1aWxkLlxuICAgKiBJZiBhbnkgZmlsZSBkZWZpbmVzIGFuIEV4dFJlYWN0IG92ZXJyaWRlICh1c2luZyBFeHQuZGVmaW5lIHdpdGggYW4gXCJvdmVycmlkZVwiIHByb3BlcnR5KSxcbiAgICogdGhhdCBvdmVycmlkZSB3aWxsIGluIGZhY3Qgb25seSBiZSBpbmNsdWRlZCBpbiB0aGUgYnVpbGQgaWYgdGhlIHRhcmdldCBjbGFzcyBzcGVjaWZpZWRcbiAgICogaW4gdGhlIFwib3ZlcnJpZGVcIiBwcm9wZXJ0eSBpcyBhbHNvIGluY2x1ZGVkLlxuICAgKiBAcGFyYW0ge1N0cmluZ30gb3V0cHV0IFRoZSBwYXRoIHRvIGRpcmVjdG9yeSB3aGVyZSB0aGUgRXh0UmVhY3QgYnVuZGxlIHNob3VsZCBiZSB3cml0dGVuXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gYXN5bmNocm9ub3VzIFNldCB0byB0cnVlIHRvIHJ1biBTZW5jaGEgQ21kIGJ1aWxkcyBhc3luY2hyb25vdXNseS4gVGhpcyBtYWtlcyB0aGUgd2VicGFjayBidWlsZCBmaW5pc2ggbXVjaCBmYXN0ZXIsIGJ1dCB0aGUgYXBwIG1heSBub3QgbG9hZCBjb3JyZWN0bHkgaW4geW91ciBicm93c2VyIHVudGlsIFNlbmNoYSBDbWQgaXMgZmluaXNoZWQgYnVpbGRpbmcgdGhlIEV4dFJlYWN0IGJ1bmRsZVxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IHByb2R1Y3Rpb24gU2V0IHRvIHRydWUgZm9yIHByb2R1Y3Rpb24gYnVpbGRzLiAgVGhpcyB0ZWxsIFNlbmNoYSBDbWQgdG8gY29tcHJlc3MgdGhlIGdlbmVyYXRlZCBKUyBidW5kbGUuXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gdHJlZVNoYWtpbmcgU2V0IHRvIGZhbHNlIHRvIGRpc2FibGUgdHJlZSBzaGFraW5nIGluIGRldmVsb3BtZW50IGJ1aWxkcy4gIFRoaXMgbWFrZXMgaW5jcmVtZW50YWwgcmVidWlsZHMgZmFzdGVyIGFzIGFsbCBFeHRSZWFjdCBjb21wb25lbnRzIGFyZSBpbmNsdWRlZCBpbiB0aGUgZXh0LmpzIGJ1bmRsZSBpbiB0aGUgaW5pdGlhbCBidWlsZCBhbmQgdGh1cyB0aGUgYnVuZGxlIGRvZXMgbm90IG5lZWQgdG8gYmUgcmVidWlsdCBhZnRlciBlYWNoIGNoYW5nZS4gRGVmYXVsdHMgdG8gdHJ1ZS5cbiAgICovXG4gIGNvbnN0cnVjdG9yKG9wdGlvbnMpIHtcbiAgICAvL2NhbiBiZSBpbiBkZXZkZXBlbmRlbmNpZXNcbiAgICAvL2FjY291bnQgZm9yIHRoaXM6IHJlYWN0OiBcIjE1LjE2LjBcIlxuICAgIHZhciBwa2cgPSAoZnMuZXhpc3RzU3luYygncGFja2FnZS5qc29uJykgJiYgSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMoJ3BhY2thZ2UuanNvbicsICd1dGYtOCcpKSB8fCB7fSk7XG4gICAgdmFyIHJlYWN0RW50cnkgPSBwa2cuZGVwZW5kZW5jaWVzLnJlYWN0XG4gICAgdmFyIGlzMTYgPSByZWFjdEVudHJ5LmluY2x1ZGVzKFwiMTZcIik7XG4gICAgaWYgKGlzMTYpIHsgcmVhY3RWZXJzaW9uID0gMTYgfVxuICAgIGVsc2UgeyByZWFjdFZlcnNpb24gPSAxNSB9XG4gICAgdGhpcy5yZWFjdFZlcnNpb24gPSByZWFjdFZlcnNpb25cblxuICAgIC8vIGlmIC5leHQtcmVhY3RyYyBmaWxlIGV4aXN0cywgY29uc3VtZSBpdCBhbmQgYXBwbHkgaXQgdG8gY29uZmlnIG9wdGlvbnMuXG4gICAgY29uc3QgZXh0UmVhY3RSYyA9IChmcy5leGlzdHNTeW5jKCcuZXh0LXJlYWN0cmMnKSAmJiBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYygnLmV4dC1yZWFjdHJjJywgJ3V0Zi04JykpIHx8IHt9KTtcblxuICAgIG9wdGlvbnMgPSB7IC4uLnRoaXMuZ2V0RGVmYXVsdE9wdGlvbnMoKSwgLi4ub3B0aW9ucywgLi4uZXh0UmVhY3RSYyB9O1xuICAgIGNvbnN0IHsgYnVpbGRzIH0gPSBvcHRpb25zO1xuXG4gICAgaWYgKE9iamVjdC5rZXlzKGJ1aWxkcykubGVuZ3RoID09PSAwKSB7XG4gICAgICBjb25zdCB7IGJ1aWxkcywgLi4uYnVpbGRPcHRpb25zIH0gPSBvcHRpb25zO1xuICAgICAgYnVpbGRzLmV4dCA9IGJ1aWxkT3B0aW9ucztcbiAgICB9XG5cbiAgICBmb3IgKGxldCBuYW1lIGluIGJ1aWxkcylcbiAgICAgIHRoaXMuX3ZhbGlkYXRlQnVpbGRDb25maWcobmFtZSwgYnVpbGRzW25hbWVdKTtcblxuICAgIE9iamVjdC5hc3NpZ24odGhpcywge1xuICAgICAgLi4ub3B0aW9ucyxcbiAgICAgIGN1cnJlbnRGaWxlOiBudWxsLFxuICAgICAgbWFuaWZlc3Q6IG51bGwsXG4gICAgICBkZXBlbmRlbmNpZXM6IFtdXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogRGVmYXVsdCBjb25maWcgb3B0aW9uc1xuICAgKiBAcHJvdGVjdGVkXG4gICAqIEByZXR1cm4ge09iamVjdH1cbiAgICovXG4gIGdldERlZmF1bHRPcHRpb25zKCkge1xuICAgIHJldHVybiB7XG4gICAgICBidWlsZHM6IHt9LFxuICAgICAgZGVidWc6IGZhbHNlLFxuICAgICAgd2F0Y2g6IGZhbHNlLFxuICAgICAgdGVzdDogL1xcLihqfHQpc3g/JC8sXG5cbiAgICAgIC8qIGJlZ2luIHNpbmdsZSBidWlsZCBvbmx5ICovXG4gICAgICBvdXRwdXQ6ICdleHQtcmVhY3QnLFxuICAgICAgdG9vbGtpdDogJ21vZGVybicsXG4gICAgICBwYWNrYWdlczogbnVsbCxcbiAgICAgIHBhY2thZ2VEaXJzOiBbXSxcbiAgICAgIG92ZXJyaWRlczogW10sXG4gICAgICBhc3luY2hyb25vdXM6IGZhbHNlLFxuICAgICAgcHJvZHVjdGlvbjogZmFsc2UsXG4gICAgICBtYW5pZmVzdEV4dHJhY3RvcjogZXh0cmFjdEZyb21KU1gsXG4gICAgICB0cmVlU2hha2luZzogZmFsc2VcbiAgICAgIC8qIGVuZCBzaW5nbGUgYnVpbGQgb25seSAqL1xuICAgIH1cbiAgfVxuXG4gIHdhdGNoUnVuKCkge1xuICAgIHRoaXMud2F0Y2ggPSB0cnVlXG4gIH1cblxuICBzdWNjZWVkTW9kdWxlKGNvbXBpbGF0aW9uLCBtb2R1bGUpIHtcbiAgICB0aGlzLmN1cnJlbnRGaWxlID0gbW9kdWxlLnJlc291cmNlO1xuICAgIGlmIChtb2R1bGUucmVzb3VyY2UgJiYgbW9kdWxlLnJlc291cmNlLm1hdGNoKHRoaXMudGVzdCkgJiYgIW1vZHVsZS5yZXNvdXJjZS5tYXRjaCgvbm9kZV9tb2R1bGVzLykgJiYgIW1vZHVsZS5yZXNvdXJjZS5tYXRjaChgL3JlYWN0b3Ike3JlYWN0VmVyc2lvbn0vYCkpIHtcbiAgICAgIGNvbnN0IGRvUGFyc2UgPSAoKSA9PiB7XG4gICAgICAgIHRoaXMuZGVwZW5kZW5jaWVzW3RoaXMuY3VycmVudEZpbGVdID0gW1xuICAgICAgICAgIC4uLih0aGlzLmRlcGVuZGVuY2llc1t0aGlzLmN1cnJlbnRGaWxlXSB8fCBbXSksXG4gICAgICAgICAgLi4udGhpcy5tYW5pZmVzdEV4dHJhY3Rvcihtb2R1bGUuX3NvdXJjZS5fdmFsdWUsIGNvbXBpbGF0aW9uLCBtb2R1bGUsIHJlYWN0VmVyc2lvbilcbiAgICAgICAgXVxuICAgICAgfVxuICAgICAgaWYgKHRoaXMuZGVidWcpIHtcbiAgICAgICAgZG9QYXJzZSgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdHJ5IHsgZG9QYXJzZSgpOyB9IGNhdGNoIChlKSBcbiAgICAgICAgeyBcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCdcXG5lcnJvciBwYXJzaW5nICcgKyB0aGlzLmN1cnJlbnRGaWxlKTsgXG4gICAgICAgICAgY29uc29sZS5lcnJvcihlKTsgXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy9jb25zb2xlLmxvZygndGhpcy5kZXBlbmRlbmNpZXNbdGhpcy5jdXJyZW50RmlsZV0nKVxuICAgICAgLy9jb25zb2xlLmxvZyh0aGlzLmRlcGVuZGVuY2llc1t0aGlzLmN1cnJlbnRGaWxlXSlcblxuICAgIH1cbiAgfVxuXG4gIGVtaXQoY29tcGlsZXIsIGNvbXBpbGF0aW9uLCBjYWxsYmFjaykge1xuICAgIHZhciBpc1dlYnBhY2s0ID0gY29tcGlsYXRpb24uaG9va3M7XG4gICAgdmFyIG1vZHVsZXMgPSBbXVxuICAgIGlmIChpc1dlYnBhY2s0KSB7XG4gICAgICBpc1dlYnBhY2s0ID0gdHJ1ZVxuICAgICAgbW9kdWxlcyA9IGNvbXBpbGF0aW9uLmNodW5rcy5yZWR1Y2UoKGEsIGIpID0+IGEuY29uY2F0KGIuX21vZHVsZXMpLCBbXSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgaXNXZWJwYWNrNCA9IGZhbHNlXG4gICAgICBtb2R1bGVzID0gY29tcGlsYXRpb24uY2h1bmtzLnJlZHVjZSgoYSwgYikgPT4gYS5jb25jYXQoYi5tb2R1bGVzKSwgW10pO1xuICAgIH1cbiAgICAvL2NvbnNvbGUubG9nKGlzV2VicGFjazQpXG4gICAgLy9jb25zdCBtb2R1bGVzID0gY29tcGlsYXRpb24uY2h1bmtzLnJlZHVjZSgoYSwgYikgPT4gYS5jb25jYXQoYi5tb2R1bGVzKSwgW10pO1xuICAgIC8vY29uc29sZS5sb2cobW9kdWxlc1swXSlcbiAgICBjb25zdCBidWlsZCA9IHRoaXMuYnVpbGRzW09iamVjdC5rZXlzKHRoaXMuYnVpbGRzKVswXV07XG4gICAgbGV0IG91dHB1dFBhdGggPSBwYXRoLmpvaW4oY29tcGlsZXIub3V0cHV0UGF0aCwgdGhpcy5vdXRwdXQpO1xuICAgIC8vY29uc29sZS5sb2coJ1xcbioqKioqb3V0cHV0UGF0aDogJyArIG91dHB1dFBhdGgpXG4gICAgLy9jb25zb2xlLmxvZygnXFxuKioqKip0aGlzLm91dHB1dDogJyArIHRoaXMub3V0cHV0KVxuICAgIC8vIHdlYnBhY2stZGV2LXNlcnZlciBvdmVyd3JpdGVzIHRoZSBvdXRwdXRQYXRoIHRvIFwiL1wiLCBzbyB3ZSBuZWVkIHRvIHByZXBlbmQgY29udGVudEJhc2VcbiAgICBpZiAoY29tcGlsZXIub3V0cHV0UGF0aCA9PT0gJy8nICYmIGNvbXBpbGVyLm9wdGlvbnMuZGV2U2VydmVyKSB7XG4gICAgICBvdXRwdXRQYXRoID0gcGF0aC5qb2luKGNvbXBpbGVyLm9wdGlvbnMuZGV2U2VydmVyLmNvbnRlbnRCYXNlLCBvdXRwdXRQYXRoKTtcbiAgICB9XG4gICAgLy8gdGhlIGZvbGxvd2luZyBpcyBuZWVkZWQgZm9yIGh0bWwtd2VicGFjay1wbHVnaW4gdG8gaW5jbHVkZSA8c2NyaXB0PiBhbmQgPGxpbms+IHRhZ3MgZm9yIEV4dFJlYWN0XG5cbiAgICAvLyBjb25zb2xlLmxvZygnY29tcGlsYXRpb24nKVxuICAgIC8vIGNvbnNvbGUubG9nKCcqKioqKioqKmNvbXBpbGF0aW9uLmNodW5rc1swXScpXG4gICAgLy8gY29uc29sZS5sb2coY29tcGlsYXRpb24uY2h1bmtzWzBdLmlkKVxuICAgIC8vIGNvbnNvbGUubG9nKHBhdGguam9pbih0aGlzLm91dHB1dCwgJ2V4dC5qcycpKVxuICAgIC8vIGNvbnN0IGpzQ2h1bmsgPSBjb21waWxhdGlvbi5hZGRDaHVuayhgJHt0aGlzLm91dHB1dH0tanNgKTtcbiAgICAvLyBqc0NodW5rLmhhc1J1bnRpbWUgPSBqc0NodW5rLmlzSW5pdGlhbCA9ICgpID0+IHRydWU7XG4gICAgLy8ganNDaHVuay5maWxlcy5wdXNoKHBhdGguam9pbih0aGlzLm91dHB1dCwgJ2V4dC5qcycpKTtcbiAgICAvLyBqc0NodW5rLmZpbGVzLnB1c2gocGF0aC5qb2luKHRoaXMub3V0cHV0LCAnZXh0LmNzcycpKTtcbiAgICAvLyBqc0NodW5rLmlkID0gJ2FhYWFwJzsgLy8gdGhpcyBmb3JjZXMgaHRtbC13ZWJwYWNrLXBsdWdpbiB0byBpbmNsdWRlIGV4dC5qcyBmaXJzdFxuICAgIC8vIGNvbnNvbGUubG9nKCcqKioqKioqKmNvbXBpbGF0aW9uLmNodW5rc1sxXScpXG4gICAgLy8gY29uc29sZS5sb2coY29tcGlsYXRpb24uY2h1bmtzWzFdLmlkKVxuXG4gICAgLy9pZiAodGhpcy5hc3luY2hyb25vdXMpIGNhbGxiYWNrKCk7XG4vLyAgICBjb25zb2xlLmxvZyhjYWxsYmFjaylcblxuLy8gaWYgKGlzV2VicGFjazQpIHtcbi8vICAgY29uc29sZS5sb2cocGF0aC5qb2luKHRoaXMub3V0cHV0LCAnZXh0LmpzJykpXG4vLyAgIGNvbnN0IHN0YXRzID0gZnMuc3RhdFN5bmMocGF0aC5qb2luKG91dHB1dFBhdGgsICdleHQuanMnKSlcbi8vICAgY29uc3QgZmlsZVNpemVJbkJ5dGVzID0gc3RhdHMuc2l6ZVxuLy8gICBjb21waWxhdGlvbi5hc3NldHNbJ2V4dC5qcyddID0ge1xuLy8gICAgIHNvdXJjZTogZnVuY3Rpb24oKSB7cmV0dXJuIGZzLnJlYWRGaWxlU3luYyhwYXRoLmpvaW4ob3V0cHV0UGF0aCwgJ2V4dC5qcycpKX0sXG4vLyAgICAgc2l6ZTogZnVuY3Rpb24oKSB7cmV0dXJuIGZpbGVTaXplSW5CeXRlc31cbi8vICAgfVxuLy8gICBjb25zb2xlLmxvZyhjb21waWxhdGlvbi5lbnRyeXBvaW50cylcblxuLy8gICB2YXIgZmlsZWxpc3QgPSAnSW4gdGhpcyBidWlsZDpcXG5cXG4nO1xuXG4vLyAgIC8vIExvb3AgdGhyb3VnaCBhbGwgY29tcGlsZWQgYXNzZXRzLFxuLy8gICAvLyBhZGRpbmcgYSBuZXcgbGluZSBpdGVtIGZvciBlYWNoIGZpbGVuYW1lLlxuLy8gICBmb3IgKHZhciBmaWxlbmFtZSBpbiBjb21waWxhdGlvbi5hc3NldHMpIHtcbi8vICAgICBmaWxlbGlzdCArPSAoJy0gJysgZmlsZW5hbWUgKydcXG4nKTtcbi8vICAgfVxuXG4vLyAgIC8vIEluc2VydCB0aGlzIGxpc3QgaW50byB0aGUgd2VicGFjayBidWlsZCBhcyBhIG5ldyBmaWxlIGFzc2V0OlxuLy8gICBjb21waWxhdGlvbi5hc3NldHNbJ2ZpbGVsaXN0Lm1kJ10gPSB7XG4vLyAgICAgc291cmNlKCkge1xuLy8gICAgICAgcmV0dXJuIGZpbGVsaXN0O1xuLy8gICAgIH0sXG4vLyAgICAgc2l6ZSgpIHtcbi8vICAgICAgIHJldHVybiBmaWxlbGlzdC5sZW5ndGg7XG4vLyAgICAgfVxuLy8gICB9XG4vLyB9XG5cblxuICAgIGlmIChjYWxsYmFjayAhPSBudWxsKSBcbiAgICAgIHtcbiAgICAgICAgaWYgKHRoaXMuYXN5bmNocm9ub3VzKSBcbiAgICAgICAge2NhbGxiYWNrKCl9XG4gICAgICB9XG5cbi8vICAgIGNvbnNvbGUubG9nKG1vZHVsZXMpXG4vLyAgICBjb25zb2xlLmxvZyhvdXRwdXRQYXRoKVxuLy8gICAgY29uc29sZS5sb2coYnVpbGQpXG5cbiAgdGhpcy5fYnVpbGRFeHRCdW5kbGUoaXNXZWJwYWNrNCwgJ2V4dCcsIG1vZHVsZXMsIG91dHB1dFBhdGgsIGJ1aWxkKVxuICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICAvL2NvbnNvbGUubG9nKCdpbiB0aGVuJylcbiAgICAgICAgLy8gY29uc3QgY3NzVmFyUGF0aCA9IHBhdGguam9pbih0aGlzLm91dHB1dCwgJ2Nzcy12YXJzLmpzJyk7XG5cbiAgICAgICAgLy8gaWYgKGZzLmV4aXN0c1N5bmMocGF0aC5qb2luKG91dHB1dFBhdGgsICdjc3MtdmFycy5qcycpKSkge1xuICAgICAgICAvLyAgICAgY29uc3QgY3NzVmFyQ2h1bmsgPSBjb21waWxhdGlvbi5hZGRDaHVuayhgJHt0aGlzLm91dHB1dH0tY3NzLXZhcnNgKTtcbiAgICAgICAgLy8gICAgIGNzc1ZhckNodW5rLmhhc1J1bnRpbWUgPSBjc3NWYXJDaHVuay5pc0luaXRpYWwgPSAoKSA9PiB0cnVlO1xuICAgICAgICAvLyAgICAgY3NzVmFyQ2h1bmsuZmlsZXMucHVzaChjc3NWYXJQYXRoKTtcbiAgICAgICAgLy8gICAgIGNzc1ZhckNodW5rLmlkID0gLTE7XG4gICAgICAgIC8vIH1cbiAgICAgICAgLy8hdGhpcy5hc3luY2hyb25vdXMgJiYgY2FsbGJhY2soKTtcbi8vICAgICAgICBjb25zb2xlLmxvZyhjYWxsYmFjaylcbiAgICAgICAgaWYgKGNhbGxiYWNrICE9IG51bGwpIFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGlmICghdGhpcy5hc3luY2hyb25vdXMpIFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAuY2F0Y2goZSA9PiB7XG4gICAgICAgIC8vY29uc29sZS5sb2coZSlcbiAgICAgICAgY29tcGlsYXRpb24uZXJyb3JzLnB1c2gobmV3IEVycm9yKCdbQGV4dGpzL3JlYWN0b3Itd2VicGFjay1wbHVnaW5dOiAnICsgZS50b1N0cmluZygpKSk7XG4gICAgICAgIC8vIXRoaXMuYXN5bmNocm9ub3VzICYmIGNhbGxiYWNrKCk7XG4vLyAgICAgICAgY29uc29sZS5sb2coY2FsbGJhY2spXG4gICAgICAgIGlmIChjYWxsYmFjayAhPSBudWxsKSBcbiAgICAgICAge1xuICAgICAgICAgIGlmICghdGhpcy5hc3luY2hyb25vdXMpIFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KVxuICB9XG5cblxuICBhcHBseShjb21waWxlcikge1xuXG4gICAgaWYgKHRoaXMud2VicGFja1ZlcnNpb24gPT0gdW5kZWZpbmVkKSB7XG4gICAgICBjb25zdCBpc1dlYnBhY2s0ID0gY29tcGlsZXIuaG9va3M7XG4gICAgICBpZiAoaXNXZWJwYWNrNCkge3RoaXMud2VicGFja1ZlcnNpb24gPSAnSVMgd2VicGFjayA0J31cbiAgICAgIGVsc2Uge3RoaXMud2VicGFja1ZlcnNpb24gPSAnTk9UIHdlYnBhY2sgNCd9XG4gICAgICByZWFkbGluZS5jdXJzb3JUbyhwcm9jZXNzLnN0ZG91dCwgMCk7Y29uc29sZS5sb2coYXBwICsgJ3JlYWN0VmVyc2lvbjogJyArIHRoaXMucmVhY3RWZXJzaW9uICsgJywgJyArIHRoaXMud2VicGFja1ZlcnNpb24pXG4gICAgfVxuXG4gICAgY29uc3QgbWUgPSB0aGlzO1xuXG4gICAgLyoqXG4gICAgICogQWRkcyB0aGUgY29kZSBmb3IgdGhlIHNwZWNpZmllZCBmdW5jdGlvbiBjYWxsIHRvIHRoZSBtYW5pZmVzdC5qcyBmaWxlXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGNhbGwgQSBmdW5jdGlvbiBjYWxsIEFTVCBub2RlLlxuICAgICAqL1xuICAgIGNvbnN0IGFkZFRvTWFuaWZlc3QgPSBmdW5jdGlvbihjYWxsKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBmaWxlID0gdGhpcy5zdGF0ZS5tb2R1bGUucmVzb3VyY2U7XG4gICAgICAgIG1lLmRlcGVuZGVuY2llc1tmaWxlXSA9IFsgLi4uKG1lLmRlcGVuZGVuY2llc1tmaWxlXSB8fCBbXSksIGdlbmVyYXRlKGNhbGwpIF07XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIHByb2Nlc3NpbmcgJHtmaWxlfWApO1xuICAgICAgfVxuICAgIH07XG5cblxuXG5cbiAgICBpZiAoY29tcGlsZXIuaG9va3MpIHtcbiAgICAgIGlmICh0aGlzLmFzeW5jaHJvbm91cykge1xuICAgICAgICBjb21waWxlci5ob29rcy53YXRjaFJ1bi50YXBBc3luYygnZXh0cmVhY3Qtd2F0Y2gtcnVuIChhc3luYyknLCAod2F0Y2hpbmcsIGNiKSA9PiB7XG4gICAgICAgICAgcmVhZGxpbmUuY3Vyc29yVG8ocHJvY2Vzcy5zdGRvdXQsIDApO2NvbnNvbGUubG9nKGFwcCArICdleHRyZWFjdC13YXRjaC1ydW4gKGFzeW5jKScpXG4gICAgICAgICAgdGhpcy53YXRjaFJ1bigpXG4gICAgICAgICAgY2IoKVxuICAgICAgICB9KVxuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIGNvbXBpbGVyLmhvb2tzLndhdGNoUnVuLnRhcCgnZXh0cmVhY3Qtd2F0Y2gtcnVuJywgKHdhdGNoaW5nKSA9PiB7XG4gICAgICAgICAgcmVhZGxpbmUuY3Vyc29yVG8ocHJvY2Vzcy5zdGRvdXQsIDApO2NvbnNvbGUubG9nKGFwcCArICdleHRyZWFjdC13YXRjaC1ydW4nKVxuICAgICAgICAgIHRoaXMud2F0Y2hSdW4oKVxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGNvbXBpbGVyLnBsdWdpbignd2F0Y2gtcnVuJywgKHdhdGNoaW5nLCBjYikgPT4ge1xuICAgICAgICByZWFkbGluZS5jdXJzb3JUbyhwcm9jZXNzLnN0ZG91dCwgMCk7Y29uc29sZS5sb2coYXBwICsgJ3dhdGNoLXJ1bicpXG4gICAgICAgIHRoaXMud2F0Y2hSdW4oKVxuICAgICAgICBjYigpXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBleHRyYWN0IHh0eXBlcyBmcm9tIEpTWCB0YWdzXG4gICAgaWYgKGNvbXBpbGVyLmhvb2tzKSB7XG4gICAgICBjb21waWxlci5ob29rcy5jb21waWxhdGlvbi50YXAoJ2V4dHJlYWN0LWNvbXBpbGF0aW9uJywgKGNvbXBpbGF0aW9uLGRhdGEpID0+IHtcbiAgICAgICAgcmVhZGxpbmUuY3Vyc29yVG8ocHJvY2Vzcy5zdGRvdXQsIDApO2NvbnNvbGUubG9nKGFwcCArICdleHRyZWFjdC1jb21waWxhdGlvbicpXG5cbiAgICAgICAgLy8gLy9tamcgZWFybHlcbiAgICAgICAgLy8gdGhpcy5vdXRwdXQgPSAnZXh0LXJlYWN0L2V4dGpzJ1xuICAgICAgICAvLyBjb25zdCBqc0NodW5rID0gY29tcGlsYXRpb24uYWRkQ2h1bmsoYCR7dGhpcy5vdXRwdXR9LWpzYCk7XG4gICAgICAgIC8vIC8vY29uc3QganNDaHVuayA9IGNvbXBpbGF0aW9uLmFkZENodW5rKGBleHRgKTtcbiAgICAgICAgLy8ganNDaHVuay5oYXNSdW50aW1lID0ganNDaHVuay5pc0luaXRpYWwgPSAoKSA9PiB0cnVlO1xuICAgICAgICAvLyBqc0NodW5rLmZpbGVzLnB1c2gocGF0aC5qb2luKHRoaXMub3V0cHV0LCAnZXh0LmpzJykpO1xuICAgICAgICAvLyBqc0NodW5rLmZpbGVzLnB1c2gocGF0aC5qb2luKHRoaXMub3V0cHV0LCAnZXh0LmNzcycpKTtcbiAgICAgICAgLy8ganNDaHVuay5pZCA9IC0yOyAvLyB0aGlzIGZvcmNlcyBodG1sLXdlYnBhY2stcGx1Z2luIHRvIGluY2x1ZGUgZXh0LmpzIGZpcnN0XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCcqKioqKioqKmNvbXBpbGF0aW9uLmNodW5rc1swXScpXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGNvbXBpbGF0aW9uLmNodW5rc1swXS5pZClcblxuXG5cblxuICAgICAgICBjb21waWxhdGlvbi5ob29rcy5zdWNjZWVkTW9kdWxlLnRhcCgnZXh0cmVhY3Qtc3VjY2VlZC1tb2R1bGUnLCAobW9kdWxlKSA9PiB7XG4gICAgICAgICAgdGhpcy5zdWNjZWVkTW9kdWxlKGNvbXBpbGF0aW9uLCBtb2R1bGUpXG4gICAgICAgIH0pXG5cbiAgICAgICAgZGF0YS5ub3JtYWxNb2R1bGVGYWN0b3J5LnBsdWdpbihcInBhcnNlclwiLCBmdW5jdGlvbihwYXJzZXIsIG9wdGlvbnMpIHtcbiAgICAgICAgICAvLyBleHRyYWN0IHh0eXBlcyBhbmQgY2xhc3NlcyBmcm9tIEV4dC5jcmVhdGUgY2FsbHNcbiAgICAgICAgICBwYXJzZXIucGx1Z2luKCdjYWxsIEV4dC5jcmVhdGUnLCBhZGRUb01hbmlmZXN0KTtcbiAgICAgICAgICAvLyBjb3B5IEV4dC5yZXF1aXJlIGNhbGxzIHRvIHRoZSBtYW5pZmVzdC4gIFRoaXMgYWxsb3dzIHRoZSB1c2VycyB0byBleHBsaWNpdGx5IHJlcXVpcmUgYSBjbGFzcyBpZiB0aGUgcGx1Z2luIGZhaWxzIHRvIGRldGVjdCBpdC5cbiAgICAgICAgICBwYXJzZXIucGx1Z2luKCdjYWxsIEV4dC5yZXF1aXJlJywgYWRkVG9NYW5pZmVzdCk7XG4gICAgICAgICAgLy8gY29weSBFeHQuZGVmaW5lIGNhbGxzIHRvIHRoZSBtYW5pZmVzdC4gIFRoaXMgYWxsb3dzIHVzZXJzIHRvIHdyaXRlIHN0YW5kYXJkIEV4dFJlYWN0IGNsYXNzZXMuXG4gICAgICAgICAgcGFyc2VyLnBsdWdpbignY2FsbCBFeHQuZGVmaW5lJywgYWRkVG9NYW5pZmVzdCk7XG4gICAgICAgIH0pXG5cbiAgICAgIH0pXG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgY29tcGlsZXIucGx1Z2luKCdjb21waWxhdGlvbicsIChjb21waWxhdGlvbiwgZGF0YSkgPT4ge1xuICAgICAgICByZWFkbGluZS5jdXJzb3JUbyhwcm9jZXNzLnN0ZG91dCwgMCk7Y29uc29sZS5sb2coYXBwICsgJ2NvbXBpbGF0aW9uJylcbiAgICAgICAgY29tcGlsYXRpb24ucGx1Z2luKCdzdWNjZWVkLW1vZHVsZScsIChtb2R1bGUpID0+IHtcbiAgICAgICAgICB0aGlzLnN1Y2NlZWRNb2R1bGUoY29tcGlsYXRpb24sIG1vZHVsZSlcbiAgICAgICAgfSlcblxuICAgICAgICBkYXRhLm5vcm1hbE1vZHVsZUZhY3RvcnkucGx1Z2luKFwicGFyc2VyXCIsIGZ1bmN0aW9uKHBhcnNlciwgb3B0aW9ucykge1xuICAgICAgICAgIC8vIGV4dHJhY3QgeHR5cGVzIGFuZCBjbGFzc2VzIGZyb20gRXh0LmNyZWF0ZSBjYWxsc1xuICAgICAgICAgIHBhcnNlci5wbHVnaW4oJ2NhbGwgRXh0LmNyZWF0ZScsIGFkZFRvTWFuaWZlc3QpO1xuICAgICAgICAgIC8vIGNvcHkgRXh0LnJlcXVpcmUgY2FsbHMgdG8gdGhlIG1hbmlmZXN0LiAgVGhpcyBhbGxvd3MgdGhlIHVzZXJzIHRvIGV4cGxpY2l0bHkgcmVxdWlyZSBhIGNsYXNzIGlmIHRoZSBwbHVnaW4gZmFpbHMgdG8gZGV0ZWN0IGl0LlxuLy9jb25zb2xlLmxvZygncGFyc2VyLnBsdWdpbicpXG4gICAgICAgICAgcGFyc2VyLnBsdWdpbignY2FsbCBFeHQucmVxdWlyZScsIGFkZFRvTWFuaWZlc3QpO1xuICAgICAgICAgIC8vIGNvcHkgRXh0LmRlZmluZSBjYWxscyB0byB0aGUgbWFuaWZlc3QuICBUaGlzIGFsbG93cyB1c2VycyB0byB3cml0ZSBzdGFuZGFyZCBFeHRSZWFjdCBjbGFzc2VzLlxuICAgICAgICAgIHBhcnNlci5wbHVnaW4oJ2NhbGwgRXh0LmRlZmluZScsIGFkZFRvTWFuaWZlc3QpO1xuICAgICAgICB9KVxuXG4gICAgICB9KVxuICAgIH1cblxuXG5cblxuICAgIC8vIG9uY2UgYWxsIG1vZHVsZXMgYXJlIHByb2Nlc3NlZCwgY3JlYXRlIHRoZSBvcHRpbWl6ZWQgRXh0UmVhY3QgYnVpbGQuXG4gICAgaWYgKGNvbXBpbGVyLmhvb2tzKSB7XG4gICAgICBpZiAodGhpcy5hc3luY2hyb25vdXMpIHtcbiAgICAgICAgY29tcGlsZXIuaG9va3MuZW1pdC50YXBBc3luYygnZXh0cmVhY3QtZW1pdCAoYXN5bmMpJywgKGNvbXBpbGF0aW9uLCBjYikgPT4ge1xuICAgICAgICAgIHJlYWRsaW5lLmN1cnNvclRvKHByb2Nlc3Muc3Rkb3V0LCAwKTtjb25zb2xlLmxvZyhhcHAgKyAnZXh0cmVhY3QtZW1pdCcpXG4gICAgICAgICAgdGhpcy5lbWl0KGNvbXBpbGVyLCBjb21waWxhdGlvbiwgY2IpXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgY29tcGlsZXIuaG9va3MuZW1pdC50YXAoJ2V4dHJlYWN0LWVtaXQnLCAoY29tcGlsYXRpb24pID0+IHtcbiAgICAgICAgICByZWFkbGluZS5jdXJzb3JUbyhwcm9jZXNzLnN0ZG91dCwgMCk7Y29uc29sZS5sb2coYXBwICsgJ2V4dHJlYWN0LWVtaXQnKVxuICAgICAgICAgIHRoaXMuZW1pdChjb21waWxlciwgY29tcGlsYXRpb24sIG51bGwpXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgY29tcGlsZXIucGx1Z2luKCdlbWl0JywgKGNvbXBpbGF0aW9uLCBjYWxsYmFjaykgPT4ge1xuICAgICAgICByZWFkbGluZS5jdXJzb3JUbyhwcm9jZXNzLnN0ZG91dCwgMCk7Y29uc29sZS5sb2coYXBwICsgJ2VtaXQnKVxuICAgICAgICB0aGlzLmVtaXQoY29tcGlsZXIsIGNvbXBpbGF0aW9uLCBjYWxsYmFjaylcbiAgICAgIH0pXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrcyBlYWNoIGJ1aWxkIGNvbmZpZyBmb3IgbWlzc2luZy9pbnZhbGlkIHByb3BlcnRpZXNcbiAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgVGhlIG5hbWUgb2YgdGhlIGJ1aWxkXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBidWlsZCBUaGUgYnVpbGQgY29uZmlnXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfdmFsaWRhdGVCdWlsZENvbmZpZyhuYW1lLCBidWlsZCkge1xuICAgIGxldCB7IHNkaywgcHJvZHVjdGlvbiB9ID0gYnVpbGQ7XG5cbiAgICBpZiAocHJvZHVjdGlvbikge1xuICAgICAgYnVpbGQudHJlZVNoYWtpbmcgPSBmYWxzZTtcbiAgICB9XG4gICAgaWYgKHNkaykge1xuICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKHNkaykpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vIFNESyBmb3VuZCBhdCAke3BhdGgucmVzb2x2ZShzZGspfS4gIERpZCB5b3UgZm9yIGdldCB0byBsaW5rL2NvcHkgeW91ciBFeHQgSlMgU0RLIHRvIHRoYXQgbG9jYXRpb24/YCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuX2FkZFJlYWN0b3JQYWNrYWdlKGJ1aWxkKVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0cnkge1xuICAgICAgICBidWlsZC5zZGsgPSBwYXRoLmRpcm5hbWUocmVzb2x2ZSgnQGV4dGpzL2V4dC1yZWFjdCcsIHsgYmFzZWRpcjogcHJvY2Vzcy5jd2QoKSB9KSlcbiAgICAgICAgYnVpbGQucGFja2FnZURpcnMgPSBbLi4uKGJ1aWxkLnBhY2thZ2VEaXJzIHx8IFtdKSwgcGF0aC5kaXJuYW1lKGJ1aWxkLnNkayldO1xuICAgICAgICBidWlsZC5wYWNrYWdlcyA9IGJ1aWxkLnBhY2thZ2VzIHx8IHRoaXMuX2ZpbmRQYWNrYWdlcyhidWlsZC5zZGspO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEBleHRqcy9leHQtcmVhY3Qgbm90IGZvdW5kLiAgWW91IGNhbiBpbnN0YWxsIGl0IHdpdGggXCJucG0gaW5zdGFsbCAtLXNhdmUgQGV4dGpzL2V4dC1yZWFjdFwiIG9yLCBpZiB5b3UgaGF2ZSBhIGxvY2FsIGNvcHkgb2YgdGhlIFNESywgc3BlY2lmeSB0aGUgcGF0aCB0byBpdCB1c2luZyB0aGUgXCJzZGtcIiBvcHRpb24gaW4gYnVpbGQgXCIke25hbWV9LlwiYCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgdGhlIHJlYWN0b3IgcGFja2FnZSBpZiBwcmVzZW50IGFuZCB0aGUgdG9vbGtpdCBpcyBtb2Rlcm5cbiAgICogQHBhcmFtIHtPYmplY3R9IGJ1aWxkIFxuICAgKi9cbiAgX2FkZFJlYWN0b3JQYWNrYWdlKGJ1aWxkKSB7XG4gICAgaWYgKGJ1aWxkLnRvb2xraXQgPT09ICdjbGFzc2ljJykgcmV0dXJuO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKHBhdGguam9pbihidWlsZC5zZGssICdleHQnLCAnbW9kZXJuJywgJ3JlYWN0b3InKSkgfHwgIC8vIHJlcG9cbiAgICAgIGZzLmV4aXN0c1N5bmMocGF0aC5qb2luKGJ1aWxkLnNkaywgJ21vZGVybicsICdyZWFjdG9yJykpKSB7IC8vIHByb2R1Y3Rpb24gYnVpbGRcbiAgICAgIGlmICghYnVpbGQucGFja2FnZXMpIHtcbiAgICAgICAgYnVpbGQucGFja2FnZXMgPSBbXTtcbiAgICAgIH1cbiAgICAgIGJ1aWxkLnBhY2thZ2VzLnB1c2goJ3JlYWN0b3InKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJuIHRoZSBuYW1lcyBvZiBhbGwgRXh0UmVhY3QgcGFja2FnZXMgaW4gdGhlIHNhbWUgcGFyZW50IGRpcmVjdG9yeSBhcyBleHQtcmVhY3QgKHR5cGljYWxseSBub2RlX21vZHVsZXMvQGV4dGpzKVxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge1N0cmluZ30gc2RrIFBhdGggdG8gZXh0LXJlYWN0XG4gICAqIEByZXR1cm4ge1N0cmluZ1tdfVxuICAgKi9cbiAgX2ZpbmRQYWNrYWdlcyhzZGspIHtcbiAgICBjb25zdCBtb2R1bGVzRGlyID0gcGF0aC5qb2luKHNkaywgJy4uJyk7XG4gICAgcmV0dXJuIGZzLnJlYWRkaXJTeW5jKG1vZHVsZXNEaXIpXG4gICAgICAvLyBGaWx0ZXIgb3V0IGRpcmVjdG9yaWVzIHdpdGhvdXQgJ3BhY2thZ2UuanNvbidcbiAgICAgIC5maWx0ZXIoZGlyID0+IGZzLmV4aXN0c1N5bmMocGF0aC5qb2luKG1vZHVsZXNEaXIsIGRpciwgJ3BhY2thZ2UuanNvbicpKSlcbiAgICAgIC8vIEdlbmVyYXRlIGFycmF5IG9mIHBhY2thZ2UgbmFtZXNcbiAgICAgIC5tYXAoZGlyID0+IHtcbiAgICAgICAgICBjb25zdCBwYWNrYWdlSW5mbyA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKHBhdGguam9pbihtb2R1bGVzRGlyLCBkaXIsICdwYWNrYWdlLmpzb24nKSkpO1xuICAgICAgICAgIC8vIERvbid0IGluY2x1ZGUgdGhlbWUgdHlwZSBwYWNrYWdlcy5cbiAgICAgICAgICBpZihwYWNrYWdlSW5mby5zZW5jaGEgJiYgcGFja2FnZUluZm8uc2VuY2hhLnR5cGUgIT09ICd0aGVtZScpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHBhY2thZ2VJbmZvLnNlbmNoYS5uYW1lO1xuICAgICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAvLyBSZW1vdmUgYW55IHVuZGVmaW5lZHMgZnJvbSBtYXBcbiAgICAgIC5maWx0ZXIobmFtZSA9PiBuYW1lKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBwYXRoIHRvIHRoZSBzZW5jaGEgY21kIGV4ZWN1dGFibGVcbiAgICogQHByaXZhdGVcbiAgICogQHJldHVybiB7U3RyaW5nfVxuICAgKi9cbiAgX2dldFNlbmNoQ21kUGF0aCgpIHtcbiAgICB0cnkge1xuICAgICAgLy8gdXNlIEBleHRqcy9zZW5jaGEtY21kIGZyb20gbm9kZV9tb2R1bGVzXG4gICAgICByZXR1cm4gcmVxdWlyZSgnQGV4dGpzL3NlbmNoYS1jbWQnKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAvLyBhdHRlbXB0IHRvIHVzZSBnbG9iYWxseSBpbnN0YWxsZWQgU2VuY2hhIENtZFxuICAgICAgcmV0dXJuICdzZW5jaGEnO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgLyoqXG4gICAgKiBCdWlsZHMgYSBtaW5pbWFsIHZlcnNpb24gb2YgdGhlIEV4dFJlYWN0IGZyYW1ld29yayBiYXNlZCBvbiB0aGUgY2xhc3NlcyB1c2VkXG4gICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBUaGUgbmFtZSBvZiB0aGUgYnVpbGRcbiAgICAqIEBwYXJhbSB7TW9kdWxlW119IG1vZHVsZXMgd2VicGFjayBtb2R1bGVzXG4gICAgKiBAcGFyYW0ge1N0cmluZ30gb3V0cHV0IFRoZSBwYXRoIHRvIHdoZXJlIHRoZSBmcmFtZXdvcmsgYnVpbGQgc2hvdWxkIGJlIHdyaXR0ZW5cbiAgICAqIEBwYXJhbSB7U3RyaW5nfSBbdG9vbGtpdD0nbW9kZXJuJ10gXCJtb2Rlcm5cIiBvciBcImNsYXNzaWNcIlxuICAgICogQHBhcmFtIHtTdHJpbmd9IG91dHB1dCBUaGUgcGF0aCB0byB0aGUgZGlyZWN0b3J5IHRvIGNyZWF0ZSB3aGljaCB3aWxsIGNvbnRhaW4gdGhlIGpzIGFuZCBjc3MgYnVuZGxlc1xuICAgICogQHBhcmFtIHtTdHJpbmd9IHRoZW1lIFRoZSBuYW1lIG9mIHRoZSBFeHRSZWFjdCB0aGVtZSBwYWNrYWdlIHRvIHVzZSwgZm9yIGV4YW1wbGUgXCJ0aGVtZS1tYXRlcmlhbFwiXG4gICAgKiBAcGFyYW0ge1N0cmluZ1tdfSBwYWNrYWdlcyBBbiBhcnJheSBvZiBFeHRSZWFjdCBwYWNrYWdlcyB0byBpbmNsdWRlXG4gICAgKiBAcGFyYW0ge1N0cmluZ1tdfSBwYWNrYWdlRGlycyBEaXJlY3RvcmllcyBjb250YWluaW5nIHBhY2thZ2VzXG4gICAgKiBAcGFyYW0ge1N0cmluZ1tdfSBvdmVycmlkZXMgQW4gYXJyYXkgb2YgbG9jYXRpb25zIGZvciBvdmVycmlkZXNcbiAgICAqIEBwYXJhbSB7U3RyaW5nfSBzZGsgVGhlIGZ1bGwgcGF0aCB0byB0aGUgRXh0UmVhY3QgU0RLXG4gICAgKiBAcHJpdmF0ZVxuICAgICovXG4gIF9idWlsZEV4dEJ1bmRsZShpc1dlYnBhY2s0LCBuYW1lLCBtb2R1bGVzLCBvdXRwdXQsIHsgdG9vbGtpdD0nbW9kZXJuJywgdGhlbWUsIHBhY2thZ2VzPVtdLCBwYWNrYWdlRGlycz1bXSwgc2RrLCBvdmVycmlkZXN9KSB7XG4vLyAgICAgY29uc29sZS5sb2cobW9kdWxlcylcbiAgICAvLyAgY29uc29sZS5sb2coJyoqKioqJylcbiAgICAvLyAgY29uc29sZS5sb2coaXNXZWJwYWNrNClcbiAgICAvLyAgY29uc29sZS5sb2coJyoqKioqJylcblxuICAgIGxldCBzZW5jaGEgPSB0aGlzLl9nZXRTZW5jaENtZFBhdGgoKTtcbiAgICB0aGVtZSA9IHRoZW1lIHx8ICh0b29sa2l0ID09PSAnY2xhc3NpYycgPyAndGhlbWUtdHJpdG9uJyA6ICd0aGVtZS1tYXRlcmlhbCcpO1xuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIHRoaXMub25CdWlsZEZhaWwgPSByZWplY3Q7XG4gICAgICB0aGlzLm9uQnVpbGRTdWNjZXNzID0gcmVzb2x2ZTtcblxuICAgICAgY21kRXJyb3JzID0gW107XG4gICAgICBcbiAgICAgIGNvbnN0IG9uQnVpbGREb25lID0gKCkgPT4ge1xuXG4gICAgICAgIGlmIChjbWRFcnJvcnMubGVuZ3RoKSB7XG4gICAgICAgICAgdGhpcy5vbkJ1aWxkRmFpbChuZXcgRXJyb3IoY21kRXJyb3JzLmpvaW4oXCJcIikpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLm9uQnVpbGRTdWNjZXNzKCk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIGlmICghd2F0Y2hpbmcpIHtcbiAgICAgICAgcmltcmFmKG91dHB1dCk7XG4gICAgICAgIG1rZGlycChvdXRwdXQpO1xuICAgICAgfVxuXG4gICAgICBsZXQganM7XG5cbiAgICAgIGlmICh0aGlzLnRyZWVTaGFraW5nKSB7XG4gICAgICAgIGxldCBzdGF0ZW1lbnRzID0gWydFeHQucmVxdWlyZShbXCJFeHQuYXBwLkFwcGxpY2F0aW9uXCIsIFwiRXh0LkNvbXBvbmVudFwiLCBcIkV4dC5XaWRnZXRcIiwgXCJFeHQubGF5b3V0LkZpdFwiXSknXTsgLy8gZm9yIHNvbWUgcmVhc29uIGNvbW1hbmQgZG9lc24ndCBsb2FkIGNvbXBvbmVudCB3aGVuIG9ubHkgcGFuZWwgaXMgcmVxdWlyZWRcbiAgICAgICAgaWYgKHBhY2thZ2VzLmluZGV4T2YoJ3JlYWN0b3InKSAhPT0gLTEpIHtcbiAgICAgICAgICBzdGF0ZW1lbnRzLnB1c2goJ0V4dC5yZXF1aXJlKFwiRXh0LnJlYWN0b3IuUmVuZGVyZXJDZWxsXCIpJyk7XG4gICAgICAgIH1cbiAgICAgICAgLy9tamdcbiAgICAgICAgZm9yIChsZXQgbW9kdWxlIG9mIG1vZHVsZXMpIHtcbiAgICAgICAgICBjb25zdCBkZXBzID0gdGhpcy5kZXBlbmRlbmNpZXNbbW9kdWxlLnJlc291cmNlXTtcbiAgICAgICAgICBpZiAoZGVwcykgc3RhdGVtZW50cyA9IHN0YXRlbWVudHMuY29uY2F0KGRlcHMpO1xuICAgICAgICB9XG4gICAgICAgIGpzID0gc3RhdGVtZW50cy5qb2luKCc7XFxuJyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBqcyA9ICdFeHQucmVxdWlyZShcIkV4dC4qXCIpJztcbiAgICAgIH1cbiAgICAgIGNvbnN0IG1hbmlmZXN0ID0gcGF0aC5qb2luKG91dHB1dCwgJ21hbmlmZXN0LmpzJyk7XG4gICAgICAvLyBhZGQgZXh0LXJlYWN0L3BhY2thZ2VzIGF1dG9tYXRpY2FsbHkgaWYgcHJlc2VudFxuICAgICAgY29uc3QgdXNlclBhY2thZ2VzID0gcGF0aC5qb2luKCcuJywgJ2V4dC1yZWFjdCcsICdwYWNrYWdlcycpO1xuICAgICAgaWYgKGZzLmV4aXN0c1N5bmModXNlclBhY2thZ2VzKSkge1xuICAgICAgICBwYWNrYWdlRGlycy5wdXNoKHVzZXJQYWNrYWdlcylcbiAgICAgIH1cblxuICAgICAgaWYgKGZzLmV4aXN0c1N5bmMocGF0aC5qb2luKHNkaywgJ2V4dCcpKSkge1xuICAgICAgICAvLyBsb2NhbCBjaGVja291dCBvZiB0aGUgU0RLIHJlcG9cbiAgICAgICAgcGFja2FnZURpcnMucHVzaChwYXRoLmpvaW4oJ2V4dCcsICdwYWNrYWdlcycpKTtcbiAgICAgICAgc2RrID0gcGF0aC5qb2luKHNkaywgJ2V4dCcpO1xuICAgICAgfVxuICAgICAgaWYgKCF3YXRjaGluZykge1xuICAgICAgICBmcy53cml0ZUZpbGVTeW5jKHBhdGguam9pbihvdXRwdXQsICdidWlsZC54bWwnKSwgYnVpbGRYTUwoeyBjb21wcmVzczogdGhpcy5wcm9kdWN0aW9uIH0pLCAndXRmOCcpO1xuICAgICAgICBmcy53cml0ZUZpbGVTeW5jKHBhdGguam9pbihvdXRwdXQsICdqc2RvbS1lbnZpcm9ubWVudC5qcycpLCBjcmVhdGVKU0RPTUVudmlyb25tZW50KCksICd1dGY4Jyk7XG4gICAgICAgIGZzLndyaXRlRmlsZVN5bmMocGF0aC5qb2luKG91dHB1dCwgJ2FwcC5qc29uJyksIGNyZWF0ZUFwcEpzb24oeyB0aGVtZSwgcGFja2FnZXMsIHRvb2xraXQsIG92ZXJyaWRlcywgcGFja2FnZURpcnMgfSksICd1dGY4Jyk7XG4gICAgICAgIGZzLndyaXRlRmlsZVN5bmMocGF0aC5qb2luKG91dHB1dCwgJ3dvcmtzcGFjZS5qc29uJyksIGNyZWF0ZVdvcmtzcGFjZUpzb24oc2RrLCBwYWNrYWdlRGlycywgb3V0cHV0KSwgJ3V0ZjgnKTtcbiAgICAgIH1cblxuICAgICAgbGV0IGNtZFJlYnVpbGROZWVkZWQgPSBmYWxzZTtcblxuICAgICAgLy9pZiAodGhpcy5tYW5pZmVzdCA9PT0gbnVsbCB8fCBqcyAhPT0gdGhpcy5tYW5pZmVzdCkge1xuICAgICAgICAvLyBPbmx5IHdyaXRlIG1hbmlmZXN0IGlmIGl0IGRpZmZlcnMgZnJvbSB0aGUgbGFzdCBydW4uICBUaGlzIHByZXZlbnRzIHVubmVjZXNzYXJ5IGNtZCByZWJ1aWxkcy5cbiAgICAgICAgdGhpcy5tYW5pZmVzdCA9IGpzO1xuICAgICAgICAgY29uc29sZS5sb2coJ1xcbmpzOicpXG4gICAgICAgICBjb25zb2xlLmxvZyhqcylcbiAgICAgICAgLy8gY29uc29sZS5sb2coJ1xcblxcbicpXG4gICAgICAgIGZzLndyaXRlRmlsZVN5bmMobWFuaWZlc3QsIGpzLCAndXRmOCcpO1xuICAgICAgICBjbWRSZWJ1aWxkTmVlZGVkID0gdHJ1ZTtcbiAgICAgICAgcmVhZGxpbmUuY3Vyc29yVG8ocHJvY2Vzcy5zdGRvdXQsIDApO2NvbnNvbGUubG9nKGFwcCArIGBidWlsZGluZyBFeHRSZWFjdCBidW5kbGU6ICR7bmFtZX0gPT4gJHtvdXRwdXR9YClcbiAgICAgIC8vfVxuXG5cbiAgICAgIGlmIChpc1dlYnBhY2s0KSB7XG4gICAgICAgIC8vZXhlY1N5bmMoc2VuY2hhLCBbJ2FudCcsICd3YXRjaCddLCB7IGN3ZDogb3V0cHV0LCBzaWxlbnQ6IGZhbHNlIH0pXG4gICAgICAgIGNvbnN0IHNwYXduU3luYyA9IHJlcXVpcmUoJ2NoaWxkX3Byb2Nlc3MnKS5zcGF3blN5bmNcbiAgICAgICAgc3Bhd25TeW5jKHNlbmNoYSwgWydhbnQnLCAnYnVpbGQnXSwgeyBjd2Q6IG91dHB1dCwgc3RkaW86ICdpbmhlcml0JywgZW5jb2Rpbmc6ICd1dGYtOCd9KVxuXG4gICAgICAgIG9uQnVpbGREb25lKClcbiAgICAgIH1cblxuICAgICAgaWYgKCFpc1dlYnBhY2s0KSB7XG4gICAgICAgIGlmICh0aGlzLndhdGNoKSB7XG4gICAgICAgICAgaWYgKCF3YXRjaGluZykge1xuICAgICAgICAgICAgd2F0Y2hpbmcgPSBnYXRoZXJFcnJvcnMoZm9yayhzZW5jaGEsIFsnYW50JywgJ3dhdGNoJ10sIHsgY3dkOiBvdXRwdXQsIHNpbGVudDogdHJ1ZSB9KSk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnYWZ0ZXIgZm9yaycpXG4gICAgICAgICAgICB3YXRjaGluZy5zdGRlcnIucGlwZShwcm9jZXNzLnN0ZGVycik7XG4gICAgICAgICAgICB3YXRjaGluZy5zdGRvdXQucGlwZShwcm9jZXNzLnN0ZG91dCk7XG4gICAgICAgICAgICB3YXRjaGluZy5zdGRvdXQub24oJ2RhdGEnLCBkYXRhID0+IHtcbiAgICAgICAgICAgICAgaWYgKGRhdGEgJiYgZGF0YS50b1N0cmluZygpLm1hdGNoKC9XYWl0aW5nIGZvciBjaGFuZ2VzXFwuXFwuXFwuLykpIHtcbiAgICAgICAgICAgICAgICBvbkJ1aWxkRG9uZSgpXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB3YXRjaGluZy5vbignZXhpdCcsIG9uQnVpbGREb25lKVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIWNtZFJlYnVpbGROZWVkZWQpIG9uQnVpbGREb25lKCk7XG4gICAgICAgIH0gXG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGNvbnN0IGJ1aWxkID0gZ2F0aGVyRXJyb3JzKGZvcmsoc2VuY2hhLCBbJ2FudCcsICdidWlsZCddLCB7IHN0ZGlvOiAnaW5oZXJpdCcsIGVuY29kaW5nOiAndXRmLTgnLCBjd2Q6IG91dHB1dCwgc2lsZW50OiBmYWxzZSB9KSk7XG4gICAgICAgICAgY29uc29sZS5sb2coJ2FmdGVyIGZvcmsnKVxuICAgICAgICAgIGlmKGJ1aWxkLnN0ZG91dCkgeyBidWlsZC5zdGRvdXQucGlwZShwcm9jZXNzLnN0ZG91dCkgfVxuICAgICAgICAgIGlmKGJ1aWxkLnN0ZGVycikgeyBidWlsZC5zdGRlcnIucGlwZShwcm9jZXNzLnN0ZGVycikgfVxuICAgICAgICAgIGJ1aWxkLm9uKCdleGl0Jywgb25CdWlsZERvbmUpO1xuICAgICAgICB9XG4gICAgICB9XG5cblxuICAgIH0pO1xuICB9XG59O1xuIl19