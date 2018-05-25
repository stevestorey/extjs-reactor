var chalk = require('chalk');
exports.infoText = `
2 ways to invoke:
${chalk.green('*')} ext-build
${chalk.green('*')} ExtBuild

Examples (replace --sdk with your path to the Ext JS sdk):
${chalk.green('*')} ExtBuild generate app --sdk '/Sencha/ext-6.5.3' --template 'universalmodern' MyApp ./MyApp
${chalk.green('*')} ExtBuild generate app --template 'moderndesktop' --sdk '/Sencha/ext-6.5.3' ModernDesktop ./ModernDesktop
${chalk.green('*')} ExtBuild generate app --template 'classicdesktop' --sdk '/Sencha/ext-6.5.3' ClassicDesktop ./ClassicDesktop
${chalk.green('*')} ExtBuild generate app --template 'universalmodernclassic' --sdk '/Sencha/ext-6.5.3' UMC ./UMC
${chalk.green('*')} ExtBuild gen app -s '/Sencha/ext-6.5.3' -t 'universalmodern' MyApp ./MyApp
${chalk.green('*')} ExtBuild g a -s '/Sencha/ext-6.5.3' -t 'universalmodern' MyApp ./MyApp
${chalk.green('*')} ExtBuild generate viewpackage settings
${chalk.green('*')} ExtBuild generate storepackage employee

Commands Available
${chalk.green('*')} ExtBuild generate app (name) (path)
${chalk.green('*')} ExtBuild generate viewpackage (view)
${chalk.green('*')} ExtBuild generate storepackage (store)

Commands Options
${chalk.green('*')} generate, gen, g
${chalk.green('*')} application, app, a
${chalk.green('*')} viewpackage, vp
${chalk.green('*')} storepackage, sp

Options Available
${chalk.green('*')} --debug -d (shows debug messages)
${chalk.green('*')} --sdk -s (path to Ext JS sdk - currently required for gen app, no running from sdk folder...)
${chalk.green('*')} --template -t (name of app template to use - only one currently - universalmodern)
`
//${chalk.green('*')} --force (deletes application, if present, before generate app (BE CAREFUL WITH THIS!))
//${chalk.green('*')} --builds -b (--builds "desktop:modern,theme-material;phone:modern,theme-material;" is default)
exports.finishText = function finishText(ApplicationDir, viewpackage, watch) { 
	return`
${chalk.green('********************************************')}

To add a View Package to the moderndesktop build:

${viewpackage}

To test the application, type the following: 
(note: you can change port number and 'moderndesktop' to 'modernphone')

${watch}

${chalk.green('********************************************')}
`
}

//${menuPath}menu.json:
exports.menuText = function menuText(menuPath, item, itemphone) { 
	return`
${chalk.green('********************************************')}

For Desktop, Add the following line to src/view/main/MainViewModel.js

${item}

For Phone, add to src/view/main/MenuView.js

${itemphone}

${chalk.green('********************************************')}
`
}