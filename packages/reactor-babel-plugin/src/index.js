
var reactVersion = 0; 
import chalk from 'chalk';


import path from 'path';
const MODULE_PATTERN_GENERIC = /^@extjs\/reactor$/;
const OLD_MODULE_PATTERN = /^@extjs\/reactor\/modern$/;
const MODULE_PATTERN = /^@extjs\/(ext-react.*|reactor\/classic)$/;
const app = `${chalk.green('ℹ ｢ext｣:')} reactor-babel-plugin: `;
import * as readline from 'readline'
var fs
try {
fs = require('fs')
}
catch(ex) {
  console.log('\n' + app + 'fs not found')
}



module.exports = function(babel) {
  if (fs != undefined) {
    var pkg = (fs.existsSync('package.json') && JSON.parse(fs.readFileSync('package.json', 'utf-8')) || {});
    var reactEntry = pkg.dependencies.react
    var is16 = reactEntry.includes("16");
    if (is16) { reactVersion = 16 } else { reactVersion = 15 }
  //  var reactVersion = ''
    readline.cursorTo(process.stdout, 0);console.log('\n' + app + 'reactVersion: ' + reactVersion + '')
  }
  else {
    reactVersion = 16
  }

  const t = babel.types;

  var showIt = true
  var showItNum = 0
  var prevFile = ''
  return {
    visitor: {
      ImportDeclaration: function(path) {
//        console.log(path.hub.file.opts.sourceFileName)
        const { node } = path
        // if (showIt) {
        //   //console.log(path)
        //   showIt = false
        // }

//from
//import { launch } from '@extjs/reactor';
//to
//import { launch } from '@extjs/reactor16';

        /*
        //added mjg
        //make sure we cover all cases here
        changes 
        import { launch } from '@extjs/reactor';
        to 
        { launch } from '@extjs/reactor16';
        */
        if (node.source && node.source.type === 'StringLiteral' 
        && node.source.value.match(MODULE_PATTERN_GENERIC)) {
          const local = node.specifiers[0].local.name;
          //do we need this if??  are we handling multiple defines?
          if(local === 'launch' 
          || local === 'reactify'
          || local === 'Template') {
            path.replaceWith(
              t.importDeclaration(
                [t.importSpecifier(t.identifier(local), t.identifier(local))],
                t.stringLiteral(`@extjs/reactor${reactVersion}`)
              )
            );
          }
        }

        if (node.source && node.source.type === 'StringLiteral' 
        && (node.source.value.match(MODULE_PATTERN) 
        || node.source.value.match(OLD_MODULE_PATTERN))) {
          //console.log('\n')
          //console.log(path.hub.file.opts.filename)
          //console.log(path.hub.file.code)
          const declarations = [];
          let transform = false;

          //var count = 0
          node.specifiers.forEach(spec => {
            const imported = spec.imported.name;
            const local = spec.local.name;

            //count++
            //console.log(count + ' ' + imported + ' ' + local)

            declarations.push(
              t.variableDeclaration('const', [
                t.variableDeclarator(
                  t.identifier(local),
                  t.callExpression(
                    t.identifier('reactify'),
                    [t.stringLiteral(imported)]
                  )
                )
              ])
            );
          })
 
//from
//import { Grid, Toolbar } from '@extjs/ext-react';
//to
//import { reactify } from '@extjs/reactor16'
//const { Grid, Toolbar } = reactify('Grid', 'Toolbar');

          if (declarations.length) {
            if(prevFile != path.hub.file.opts.sourceFileName) {
            //if (!path.scope.hasBinding('reactify')) {
               path.insertBefore(
                t.importDeclaration(
                  [t.importSpecifier(t.identifier('reactify'), t.identifier('reactify'))],
                  t.stringLiteral(`@extjs/reactor${reactVersion}`)
                )
              )
            }
            prevFile = path.hub.file.opts.sourceFileName
            path.replaceWithMultiple(declarations);
          }
        }
      }
    }
  }
}

//https://github.com/jamiebuilds/babel-handbook/blob/master/translations/en/plugin-handbook.md