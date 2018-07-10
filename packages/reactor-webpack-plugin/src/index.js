'use strict';
import 'babel-polyfill';
var reactVersion = 0
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import cjson from 'cjson';
import { sync as mkdirp } from 'mkdirp';
import extractFromJSX from './extractFromJSX';
import { sync as rimraf } from 'rimraf';
import { buildXML, createAppJson, createWorkspaceJson, createJSDOMEnvironment } from './artifacts';
import { execSync, spawn, fork } from 'child_process';
import { generate } from 'astring';
import { sync as resolve } from 'resolve';
let watching = false;
let cmdErrors;
const app = `${chalk.green('ℹ ｢ext｣:')} reactor-webpack-plugin: `;
import * as readline from 'readline'
//const util = require('./util.js')

const gatherErrors = (cmd) => {
  if (cmd.stdout) {
    cmd.stdout.on('data', data => {
      const message = data.toString();
      if (message.match(/^\[ERR\]/)) {
        cmdErrors.push(message.replace(/^\[ERR\] /gi, ''));
      }
    })
  }
  return cmd;
}

module.exports = class ReactExtJSWebpackPlugin {
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
  constructor(options) {
    this.count = 0
    //can be in devdependencies - account for this: react: "15.16.0"
    var pkg = (fs.existsSync('package.json') && JSON.parse(fs.readFileSync('package.json', 'utf-8')) || {});
    var reactEntry = pkg.dependencies.react
    var is16 = reactEntry.includes("16");
    if (is16) { reactVersion = 16 }
    else { reactVersion = 15 }
    this.reactVersion = reactVersion
    const extReactRc = (fs.existsSync('.ext-reactrc') && JSON.parse(fs.readFileSync('.ext-reactrc', 'utf-8')) || {});
    options = { ...this.getDefaultOptions(), ...options, ...extReactRc };
    const { builds } = options;
    if (Object.keys(builds).length === 0) {
      const { builds, ...buildOptions } = options;
      builds.ext = buildOptions;
    }
    for (let name in builds)
      this._validateBuildConfig(name, builds[name]);
    Object.assign(this, {
      ...options,
      currentFile: null,
      manifest: null,
      dependencies: []
    });
  }

  watchRun() {
    this.watch = true
  }

  apply(compiler) {
    if (this.webpackVersion == undefined) {
      const isWebpack4 = compiler.hooks;
      if (isWebpack4) {this.webpackVersion = 'IS webpack 4'}
      else {this.webpackVersion = 'NOT webpack 4'}
      readline.cursorTo(process.stdout, 0);console.log(app + 'reactVersion: ' + this.reactVersion + ', ' + this.webpackVersion)
    }
    const me = this;

    if (compiler.hooks) {
      if (this.asynchronous) {
        compiler.hooks.watchRun.tapAsync('extreact-watch-run (async)', (watching, cb) => {
          readline.cursorTo(process.stdout, 0);console.log(app + 'extreact-watch-run (async)')
          this.watchRun()
          cb()
        })
      }
      else {
        compiler.hooks.watchRun.tap('extreact-watch-run', (watching) => {
          readline.cursorTo(process.stdout, 0);console.log(app + 'extreact-watch-run')
          this.watchRun()
        })
      }
    }
    else {
      compiler.plugin('watch-run', (watching, cb) => {
        readline.cursorTo(process.stdout, 0);console.log(app + 'watch-run')
        this.watchRun()
        cb()
      })
    }

    /**
     * Adds the code for the specified function call to the manifest.js file
     * @param {Object} call A function call AST node.
     */
    const addToManifest = function(call) {
      try {
        const file = this.state.module.resource;
        me.dependencies[file] = [ ...(me.dependencies[file] || []), generate(call) ];
      } catch (e) {
        console.error(`Error processing ${file}`);
      }
    };

    if (compiler.hooks) {
      compiler.hooks.compilation.tap('extreact-compilation', (compilation,data) => {
        readline.cursorTo(process.stdout, 0);console.log(app + 'extreact-compilation')
        compilation.hooks.succeedModule.tap('extreact-succeed-module', (module) => {
          this.succeedModule(compilation, module)
        })

        data.normalModuleFactory.plugin("parser", function(parser, options) {
          // extract xtypes and classes from Ext.create calls
          parser.plugin('call Ext.create', addToManifest);
          // copy Ext.require calls to the manifest.  This allows the users to explicitly require a class if the plugin fails to detect it.
          parser.plugin('call Ext.require', addToManifest);
          // copy Ext.define calls to the manifest.  This allows users to write standard ExtReact classes.
          parser.plugin('call Ext.define', addToManifest);
        })
      })
    }
    else {
      compiler.plugin('compilation', (compilation, data) => {
        readline.cursorTo(process.stdout, 0);console.log(app + 'compilation')
        compilation.plugin('succeed-module', (module) => {
          this.succeedModule(compilation, module)
        })
        data.normalModuleFactory.plugin("parser", function(parser, options) {
          // extract xtypes and classes from Ext.create calls
          parser.plugin('call Ext.create', addToManifest);
          // copy Ext.require calls to the manifest.  This allows the users to explicitly require a class if the plugin fails to detect it.
          parser.plugin('call Ext.require', addToManifest);
          // copy Ext.define calls to the manifest.  This allows users to write standard ExtReact classes.
          parser.plugin('call Ext.define', addToManifest);
        })

      })
    }

//*emit - once all modules are processed, create the optimized ExtReact build.
    if (compiler.hooks) {
      if (this.asynchronous) {
        compiler.hooks.emit.tapAsync('extreact-emit (async)', (compilation, callback) => {
          readline.cursorTo(process.stdout, 0);console.log(app + 'extreact-emit  (async)')
          this.emit(compiler, compilation, callback)
          console.log(app + 'after extreact-emit  (async)')
          if (callback != null) {
            if (this.asynchronous) {
              console.log('calling callback')
              callback()
            }
          }
        })
      }
      else {
        compiler.hooks.emit.tap('extreact-emit', (compilation) => {
          readline.cursorTo(process.stdout, 0);console.log(app + 'extreact-emit')
          this.emit(compiler, compilation)

          // if (this.count == 0) {
          //   this.count++
          //   const opn = require('opn')
          //   opn('http://localhost:' + this.port)
          // }

          console.log(app + 'after extreact-emit')
        })
      }
    }
    else {
      compiler.plugin('emit', (compilation, callback) => {
        readline.cursorTo(process.stdout, 0);console.log(app + 'emit')
        this.emit(compiler, compilation, callback)
        callback()
      })
    }

    if (compiler.hooks) {
      if (this.asynchronous) {
        compiler.hooks.done.tapAsync('extreact-done (async)', (compilation, callback) => {
          readline.cursorTo(process.stdout, 0);console.log(app + 'extreact-done (async)')
          if (callback != null) 
          {
            if (this.asynchronous) 
            {
              console.log('calling callback for extreact-emit  (async)')
              callback()
            }
          }
        })
      }
      else {
        compiler.hooks.done.tap('extreact-done', () => {
          readline.cursorTo(process.stdout, 0);console.log(app + 'extreact-done')
        })
      }
    }
  }

  emit(compiler, compilation, callback) {
    var isWebpack4 = compilation.hooks;
    var modules = []
    if (isWebpack4) {
      isWebpack4 = true
      //modules = compilation.chunks.reduce((a, b) => a.concat(b._modules), []);
    }
    else {
      isWebpack4 = false
      //modules = compilation.chunks.reduce((a, b) => a.concat(b.modules), []);
    }
    const build = this.builds[Object.keys(this.builds)[0]];
    let outputPath = path.join(compiler.outputPath, this.output);
    // webpack-dev-server overwrites the outputPath to "/", so we need to prepend contentBase
    if (compiler.outputPath === '/' && compiler.options.devServer) {
      outputPath = path.join(compiler.options.devServer.contentBase, outputPath);
    }
    //console.log('\n*****outputPath: ' + outputPath)

    var isNew = false
    if(isNew == true) {
      var buildAsync = require(`./buildAsync.js`)
      var buildOptions = {
      isWebpack4:isWebpack4, 
      modules:modules, 
      outputPath:outputPath, 
      build:build, 
      callback:callback, 
      watching:watching,
      treeShaking:this.treeShaking,
      dependencies:this.dependencies
    }
      new buildAsync(buildOptions).executeAsync().then(function() {
        console.log('buildAsync then')
        if (this.watch) {
          if (this.count == 0) {
            var url = 'http://localhost:' + this.port
            readline.cursorTo(process.stdout, 0);console.log(app + 'extreact-emit - open browser at ' + url)
            this.count++
            const opn = require('opn')
            opn(url)
          }
        }
        if (callback != null){if (this.asynchronous){callback()}}
      }, function(reason){
        var prefixErr = '✖ [ext]:';
        var err = chalk.red(prefixErr) + ' ext-webpack-plugin: '
        var errorString = `${err} ${chalk.red(reason.error)}`
        compilation.errors.push(new Error(errorString))
        if (callback != null){if (this.asynchronous){callback()}}
      })
    }

    else {
    this._buildExtBundle(isWebpack4, 'not', modules, outputPath, build, callback)
      .then(() => {
        if (this.watch) {
          if (this.count == 0) {
            var url = 'http://localhost:' + this.port
            readline.cursorTo(process.stdout, 0);console.log(app + 'extreact-emit - open browser at ' + url)
            this.count++
            const opn = require('opn')
            opn(url)
          }
        }
        if (callback != null){if (this.asynchronous){callback()}}
      })
      .catch(e => {
        compilation.errors.push(new Error('[@extjs/reactor-webpack-plugin]: ' + e.toString()));
        if (callback != null){if (this.asynchronous){callback()}}
      })
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
  _buildExtBundle(isWebpack4, name, modules, output, { toolkit='modern', theme, packages=[], packageDirs=[], sdk, overrides, callback}) {
    let sencha = this._getSenchCmdPath();
    theme = theme || (toolkit === 'classic' ? 'theme-triton' : 'theme-material');

    return new Promise((resolve, reject) => {
      this.onBuildFail = reject;
      this.onBuildSuccess = resolve;
      cmdErrors = [];
      
      const onBuildDone = () => {
        if (cmdErrors.length) {
          this.onBuildFail(new Error(cmdErrors.join("")));
        } else {
          this.onBuildSuccess();
        }
      }

      if (!watching) {
        rimraf(output);
        mkdirp(output);
      }

      let js;
      if (this.treeShaking) {
        let statements = ['Ext.require(["Ext.app.Application", "Ext.Component", "Ext.Widget", "Ext.layout.Fit"])']; // for some reason command doesn't load component when only panel is required
        if (packages.indexOf('reactor') !== -1) {
          statements.push('Ext.require("Ext.reactor.RendererCell")');
        }
        //mjg
        for (let module of modules) {
          const deps = this.dependencies[module.resource];
          if (deps) statements = statements.concat(deps);
        }
        js = statements.join(';\n');
      } else {
        js = 'Ext.require("Ext.*")';
      }
      const manifest = path.join(output, 'manifest.js');
      // add ext-react/packages automatically if present
      const userPackages = path.join('.', 'ext-react', 'packages');
      if (fs.existsSync(userPackages)) {
        packageDirs.push(userPackages)
      }

      if (fs.existsSync(path.join(sdk, 'ext'))) {
        // local checkout of the SDK repo
        packageDirs.push(path.join('ext', 'packages'));
        sdk = path.join(sdk, 'ext');
      }
      if (!watching) {
        fs.writeFileSync(path.join(output, 'build.xml'), buildXML({ compress: this.production }), 'utf8');
        fs.writeFileSync(path.join(output, 'jsdom-environment.js'), createJSDOMEnvironment(), 'utf8');
        fs.writeFileSync(path.join(output, 'app.json'), createAppJson({ theme, packages, toolkit, overrides, packageDirs }), 'utf8');
        fs.writeFileSync(path.join(output, 'workspace.json'), createWorkspaceJson(sdk, packageDirs, output), 'utf8');
      }
      let cmdRebuildNeeded = false;
      if (this.manifest === null || js !== this.manifest) {
        // Only write manifest if it differs from the last run.  This prevents unnecessary cmd rebuilds.
        this.manifest = js;
        //readline.cursorTo(process.stdout, 0);console.log(app + js)
        readline.cursorTo(process.stdout, 0);console.log(app + 'tree shaking: ' + this.treeShaking)
        fs.writeFileSync(manifest, js, 'utf8');
        cmdRebuildNeeded = true;
        readline.cursorTo(process.stdout, 0);console.log(app + `building ExtReact bundle at: ${output}`)
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
        if (this.watch) {
          if (!watching) {
            watching = gatherErrors(fork(sencha, ['ant', 'watch'], { cwd: output, silent: true }));
            readline.cursorTo(process.stdout, 0);console.log(app + 'sencha ant watch')
            watching.stderr.pipe(process.stderr);
            watching.stdout.pipe(process.stdout);
            watching.stdout.on('data', data => {
              if (data && data.toString().match(/Waiting for changes\.\.\./)) {
                onBuildDone()
              }
            })
            watching.on('exit', onBuildDone)
          }
          if (!cmdRebuildNeeded) {
            readline.cursorTo(process.stdout, 0);console.log(app + 'Ext rebuild NOT needed')
            onBuildDone()
          }
          else {
            readline.cursorTo(process.stdout, 0);console.log(app + 'Ext rebuild IS needed')
          }
        } 
        else {
          const build = gatherErrors(fork(sencha, ['ant', 'build'], { stdio: 'inherit', encoding: 'utf-8', cwd: output, silent: false }));
          readline.cursorTo(process.stdout, 0);console.log(app + 'sencha ant build')
          if(build.stdout) { build.stdout.pipe(process.stdout) }
          if(build.stderr) { build.stderr.pipe(process.stderr) }
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
  getDefaultOptions() {
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
      manifestExtractor: extractFromJSX,
      treeShaking: false
      /* end single build only */
    }
  }



  succeedModule(compilation, module) {
    this.currentFile = module.resource;
    if (module.resource && module.resource.match(this.test) && !module.resource.match(/node_modules/) && !module.resource.match(`/reactor${reactVersion}/`)) {
      const doParse = () => {
        this.dependencies[this.currentFile] = [
          ...(this.dependencies[this.currentFile] || []),
          ...this.manifestExtractor(module._source._value, compilation, module, reactVersion)
        ]
      }
      if (this.debug) {
        doParse();
      } else {
        try { doParse(); } catch (e) 
        { 
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
  _validateBuildConfig(name, build) {
    let { sdk, production } = build;

    if (production) {
      build.treeShaking = false;
    }
    if (sdk) {
      if (!fs.existsSync(sdk)) {
          throw new Error(`No SDK found at ${path.resolve(sdk)}.  Did you for get to link/copy your Ext JS SDK to that location?`);
      } else {
          this._addReactorPackage(build)
      }
    } else {
      try {
        build.sdk = path.dirname(resolve('@extjs/ext-react', { basedir: process.cwd() }))
        build.packageDirs = [...(build.packageDirs || []), path.dirname(build.sdk)];
        build.packages = build.packages || this._findPackages(build.sdk);
      } catch (e) {
        throw new Error(`@extjs/ext-react not found.  You can install it with "npm install --save @extjs/ext-react" or, if you have a local copy of the SDK, specify the path to it using the "sdk" option in build "${name}."`);
      }
    }
  }

  /**
   * Adds the reactor package if present and the toolkit is modern
   * @param {Object} build 
   */
  _addReactorPackage(build) {
    if (build.toolkit === 'classic') return;
    if (fs.existsSync(path.join(build.sdk, 'ext', 'modern', 'reactor')) ||  // repo
      fs.existsSync(path.join(build.sdk, 'modern', 'reactor'))) { // production build
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
  _findPackages(sdk) {
    const modulesDir = path.join(sdk, '..');
    return fs.readdirSync(modulesDir)
      // Filter out directories without 'package.json'
      .filter(dir => fs.existsSync(path.join(modulesDir, dir, 'package.json')))
      // Generate array of package names
      .map(dir => {
          const packageInfo = JSON.parse(fs.readFileSync(path.join(modulesDir, dir, 'package.json')));
          // Don't include theme type packages.
          if(packageInfo.sencha && packageInfo.sencha.type !== 'theme') {
              return packageInfo.sencha.name;
          }
      })
      // Remove any undefineds from map
      .filter(name => name);
  }

  /**
   * Returns the path to the sencha cmd executable
   * @private
   * @return {String}
   */
  _getSenchCmdPath() {
    try {
      // use @extjs/sencha-cmd from node_modules
      return require('@extjs/sencha-cmd');
    } catch (e) {
      // attempt to use globally installed Sencha Cmd
      return 'sencha';
    }
  }




  



}


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