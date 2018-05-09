#!/usr/bin/env node
const Generator = require('yeoman-generator')
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');
const { kebabCase, pick } = require('lodash')
require('./XTemplate/js/Ext.js');
require('./XTemplate/js/String.js');
require('./XTemplate/js/Format.js');
require('./XTemplate/js/Template.js');
require('./XTemplate/js/XTemplateParser.js');
require('./XTemplate/js/XTemplateCompiler.js');
require('./XTemplate/js/XTemplate.js');
var config = {}

module.exports = class extends Generator {

  constructor(args, opts) {
    super(args, opts)
    var data = fs.readFileSync(path.resolve(__dirname) + '/config.json')
    config = JSON.parse(data);
    this.log(`\n${chalk.bold.green.underline('Welcome to the Ext JS Project Generator for NPM')}\n`)
  }

  prompting_defaults() {
    console.log('\n' + chalk.green.bold.underline('app defaults (cannot easily be changed)'))
    console.log(chalk.green('appName: ') + config.appName)
    console.log(chalk.green('templateType: ') + config.templateType)
    console.log(chalk.green('template: ') + config.template)
    console.log(chalk.green('templateFolderName: ') + config.templateFolderName)
    console.log('\n' + chalk.green.bold.underline('package.json defaults (can be changed later)'))
    console.log(chalk.green('packageName: ') + config.packageName)
    console.log(chalk.green('version: ') + config.version)
    console.log(chalk.green('description: ') + config.description)
    console.log(chalk.green('gitRepositoryURL: ') + config.gitRepositoryURL)
    console.log(chalk.green('keywords: ') + config.keywords)
    console.log(chalk.green('author: ') + config.author)
    console.log(chalk.green('license: ') + config.license)
    console.log(chalk.green('bugsURL: ') + config.bugsURL)
    console.log(chalk.green('homepageURL: ') + config.homepageURL)
    console.log('\n')

    return this.prompt([
      {
        type: 'confirm',
        name: 'usedefaults',
        message: 'Would you like to use defaults from config.json?',
        default: config.usedefaults
      }
    ]).then(props => Object.assign(this, props));
  }

  prompting_name() {
    if (this.usedefaults == true ) { 
      this.skip = true 
    }
    else {
      this.skip = false
    }
    if (this.skip == true ) { return }
    return this.prompt([{
      type: 'input',
      name: 'appName',
      message: 'What would you like to name your Ext JS app?',
      default: config.appName
    }]).then(props => Object.assign(this, props));
  }

  prompting_templateType() {
    if (this.skip == true ) { return }
    const prompts = [
      {
        type: 'list',
        message: 'What type of Template do want?',
        name: 'templateType',
        choices: ['make a selection from a list','type a folder name']
      }
    ] 
    return this.prompt(prompts).then(props => Object.assign(this, props))
  }

  prompting_template() {
    if (this.skip == true ) { return }
    var prompts = []
    if (this.templateType === 'type a folder name') {
      prompts = [ 
        {
          type: 'input',
          message: 'What is the Template folder name?',
          name: 'templateFolderName',
          default: config.templateFolderName
        }
      ]
    }
    else {
      prompts = [ 
        {
          type: 'list',
          name: 'template',
          message: 'What Template would you like to use?',
          choices: ['universalmodern', 'moderndesktop', 'classicdesktop']
        }
      ]
    }
    return this.prompt(prompts).then(props => Object.assign(this, props))
  }

  prompting_choices() {
    if (this.skip == true ) { return }
    const prompts = [
      {
        type: 'input',
        name: 'packageName',
        message: 'What would you like to name the NPM Package?',
        default: kebabCase(this.appName)
      },
      {
        type: 'input',
        message: 'What NPM version is this?',
        name: 'version',
        default: config.version
      }, 
      {
        type: 'input',
        message: 'What is the GIT repository URL?',
        name: 'gitRepositoryURL',
        default: config.gitRepositoryURL
      }, 
      {
        type: 'input',
        message: 'What are the NPM keywords?',
        name: 'keywords',
        default: config.keywords
      }, 
      {
        type: 'input',
        message: `What is the Author's Name?`,
        name: 'author',
        default: config.author
      }, 
      {
        type: 'input',
        message: 'What type of License does this project need?',
        name: 'license',
        default: config.license
      },
      {
        type: 'input',
        message: 'What is the URL to submit bugsURL?',
        name: 'bugsURL',
        default: config.bugsURL
      },
      {
        type: 'input',
        message: 'What is the Home Page URL?',
        name: 'homepageURL',
        default: config.homepageURL
      }
    ];
    return this.prompt(prompts).then(props => Object.assign(this, props));
  }

  prompting_desc() {
    if (this.skip == true ) { return }
    const prompts = [
      {
        type: 'input',
        message: 'What is the NPM Package Description?',
        name: 'description',
        default: this.packageName + ' description for Ext JS app ' + this.appName,
      }
    ] 
    return this.prompt(prompts).then(props => Object.assign(this, props))
  }

  prompting_create() {
    if(this.skip == true) {
      this.templateType = config.templateType
      this.templateFolderName = ''
      this.template = config.template
      this.appName = config.appName
      this.packageName = config.packageName
      this.version = config.version
      this.gitRepositoryURL = config.gitRepositoryURL
      this.keywords = config.keywords
      this.author = config.author
      this.license = config.license
      this.bugsURL = config.bugsURL
      this.homepageURL = config.homepageURL
      this.description = config.description
    }
    this.bad = false
    if (this.template == undefined) {
      if (!fs.existsSync(this.templateFolderName)){
        this.bad = true
        this.template = 'folder'
        console.log('Error, Template folder does not exist')
        return
      }
    }
    const prompts = [
      {
        type: 'confirm',
        name: 'createnow',
        message: 'Would you like to generate the Ext JS NPM project now?',
        default: config.createnow
      }
    ] 
    return this.prompt(prompts).then(props => Object.assign(this, props))
  }

  writing() {
    if (this.createnow == false ) { 
      this.log(`\n${chalk.red('Create has been cancelled')}\n`)
      this.bad = true 
    }
    if (this.bad == true ) { return }
    if (this.template == undefined) {this.template = 'folder'}
    var destDir = process.cwd() + '/' + this.packageName
    if (fs.existsSync(destDir)){
      console.log(`${chalk.red('Error: folder ' + destDir + ' exists')}`)
      this.bad = true 
      return
    }
    this.destinationRoot(this.packageName)
    var CurrWorkingDir = process.cwd()
    var values = {
      appName: this.appName,
      packageName: this.packageName,
      version: this.version,
      gitRepositoryURL: this.gitRepositoryURL,
      keywords: this.keywords,
      author: this.author,
      license: this.license,
      bugsURL: this.bugsURL,
      homepageURL: this.homepageURL,
      description: this.description
    }
    var file = path.resolve(__dirname) + '/templates/package.json.tpl.default'
    var content = fs.readFileSync(file).toString()
    var tpl = new Ext.XTemplate(content)
    var t = tpl.apply(values)
    tpl = null
    fs.writeFileSync(CurrWorkingDir + '/package.json', t);
    var file = path.resolve(__dirname) + '/templates/webpack.config.js.tpl.default'
    var content = fs.readFileSync(file).toString()
    var tpl = new Ext.XTemplate(content)
    var t = tpl.apply(values)
    tpl = null
    fs.writeFileSync(CurrWorkingDir + '/webpack.config.js', t);
  }

  install() {
    if (this.bad == true) { return }
    var app = require('@extjs/ext-build/generate/app.js')
    var options = { 
      parms: [ 'gen', 'app', this.appName, './' ],
      sdk: path.resolve(__dirname) + '/../node_modules/@extjs/ext',
      template: this.template,
      templateFull: this.templateFolderName,
      force: false 
    }
    new app(options)

    // console.log(chalk.green('\n[INF]')+ ' NPM Install started')
    // this.installDependencies({
    //   bower: false,
    //   npm: true,
    //   skipMessage: true
    // }).then(() => 
    //   {
    //     console.log(chalk.green('[INF]')+ ' NPM Install completed')
    //   }
    // )
  }

  end() {
    if (this.bad == true) { return }
    this.log(chalk.green.underline('\nYour new Ext JS NPM project is ready!\n'))
    this.log(chalk.bold(`cd ${this.packageName}  then "npm install / npm start" to run the development build and open your new application in a web browser.\n`))
//    this.log(chalk.bold(`cd ${this.packageName}  then "npm start" to run the development build and open your new application in a web browser.\n`))
  }
}
