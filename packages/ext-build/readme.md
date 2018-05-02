# sencha-build

Sencha Cmd functionality in Node

## Command line help
* sencha-build
* sn

## Examples
* sencha-node generate app --sdk 'Ext/ext-6.5.2' --template 'universalmodern' MyApp ./MyApp
* sencha-node gen app -s 'Ext/ext-6.5.2' -t 'universalmodern' MyApp ./MyApp
* sn g a -s 'Ext/ext-6.5.2' -t 'universalmodern' MyApp ./MyApp
* sencha-node generate viewpackage settings

## Commands Available
* sencha-node generate app (name) (path)
* sencha-node generate viewpackage (view)

## Commands Options
* generate, gen, g
* application, app, a
* viewpackage, vp

## Options Available
* --builds -b (--builds "desktop:modern,theme-material;phone:modern,theme-material;" is default)
* --debug -d (shows debug messages)
* --force (deletes application, if present, before generate app (BE CAREFUL WITH THIS!))
* --sdk -s (path to Ext JS sdk - currently required for gen app, no running from sdk folder...)
* --template -t (name of app template to use - only one currently - universalmodern)

## Comments
* Tested with Ext JS Version 6.5.2 modern toolkit
