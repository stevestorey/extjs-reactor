#!/usr/bin/env node

const { spawn } = require('child_process');

const chalk = require('chalk');
const fs = require('fs-extra')
const path = require('path')
const util = require('../util.js')
const help = require('../help.js')

const json = require('comment-json');
const PackageJson = require('../package.json');
const commandLineArgs = require('command-line-args')
const optionDefinitions = [
  { name: 'builds', type: String },
  { name: 'debug', alias: 'd', type: Boolean },
  { name: 'force', type: Boolean },
  { name: 'sdk', alias: 's', type: String },
  { name: 'template', alias: 't', type: String },
  { name: 'parms', type: String, multiple: true, defaultOption: true },
]

//try {

//   child.stdout.on('data', (data) => {
// //    var substrings = ['[ERR]', '[WRN]', '[INF] Processing', "[INF] Server", "[INF] Writing content", "[INF] Loading Build", "[INF] Waiting", "[LOG] Fashion waiting"]
// //    if (substrings.some(function(v) { return data.indexOf(v) >= 0; })) { 
//       var str = data.toString()
//       var s = str.replace(/\r?\n|\r/g, " ")
//       console.log(`${s}`) 
// //    }
//   });






  debug = false
  console.log(chalk.green('sencha-build v' + PackageJson.version))

  var CurrWorkingDir = process.cwd()
  var SenchaCmdDir = util.getSenchaCmdPath()
  var NodeAppBinDir = path.resolve(__dirname)
  var TemplatesDir = '/SenchaNodeTemplates' 
  var NodeAppTemplatesDir = path.join(NodeAppBinDir + '/..' + TemplatesDir) 

  const options = commandLineArgs(optionDefinitions)
  if(options.debug) { debug = true } else { debug = false }

  //var SenchaCmdTemplatesDir = '/plugins/ext/current'
  //var ApplicationTemplatesDir = TemplatesDir + '/Application'
  var NodeDir = process.argv[0]
  var AppExe = process.argv[1]

  var Category = ''
  try { Category = options.parms[0] }
  catch(e) { Category = 'info' }

  var Command = ''
  try { Command = options.parms[1] }
  catch(e) { Command = '' }

  util.dbgLog('NodeDir: ' + NodeDir);
  util.dbgLog('AppExe: ' + AppExe);
  util.dbgLog('Category: ' + Category);
  util.dbgLog('Command: ' + Command);
  util.dbgLog('CurrWorkingDir: ' + CurrWorkingDir);
  util.dbgLog('NodeAppBinDir: ' + NodeAppBinDir);
  util.dbgLog('SenchaCmdDir: ' + SenchaCmdDir);
  util.dbgLog('TemplatesDir: ' + TemplatesDir);
  util.dbgLog('NodeAppTemplatesDir: ' + NodeAppTemplatesDir);

  switch(Category) {
    case 'app': case 'a':
      switch(Command) {
        case 'watch': case 'w':
          var watch = require('../app/watch.js')
          new watch(options)
          break;
        case 'build': case 'b':
          var build = require('../app/build.js')
          new build(options)
          break;
        case 'refresh': case 'r':
          var refresh = require('../app/refresh.js')
          new refresh(options)
          break;
        default:
          throw util.err('Unknown command: "' + command + '" for category "' + category + '"')
      }
      break;
    case 'info': case 'help':
      console.log(help.infoText)
      break;
    case 'generate': case 'gen': case 'g':
      switch(Command) {
        case 'storepackage': case 'sp':
          require('../generate/storepackage.js').init(CurrWorkingDir, SenchaCmdDir, options, NodeAppTemplatesDir)
          break;
        case 'viewpackage': case 'vp':
          require('../generate/viewpackage.js').init(CurrWorkingDir, SenchaCmdDir, options, NodeAppTemplatesDir)
          break;
        case 'application': case 'app':  case 'a':
          //require('../generate/application.js').init(CurrWorkingDir, SenchaCmdDir, options, NodeAppTemplatesDir)
          var app = require('../generate/app.js')
          new app(options)
          break;
        default:
          throw util.err('Unknown command: "' + command + '" for category "' + category + '"')
      }
      break;
    default:
      throw util.err('Unknown Category: "' + Category + '"')
  }
// }
// catch(e) {
// 	console.log(util.err(e))
// 	//if (debug) {util.dbgLog(e)}
// 	if (debug) {console.log(e)}
	
// }