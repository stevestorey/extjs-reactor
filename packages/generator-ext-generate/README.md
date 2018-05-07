# generator-ext-js 
A Yeoman generator for Ext JS apps.

## Installation

First, install [Yeoman](http://yeoman.io) and `@extjs/generator-ext-js` using [npm](https://www.npmjs.com/) (we assume you have pre-installed [node.js](https://nodejs.org/)).

```bash
npm install -g yo @extjs/generator-ext-js
```

## Creating a new Ext JS App

If you haven't already, log into Sencha's private registry using the credentials you received in your Ext JS trial or subscription activation email.  If you don't have credentials, you can get them by [signing up for a trial of Ext JS](https://www.sencha.com/products/extjs/evaluate/).

```
npm login --registry=http://npm.sencha.com --scope=@extjs
```

Then, to create a new Ext JS app, run:

```bash
yo @extjs/ext-js
```

## Development

To make changes to the generator, run:

```
git clone git@github.com:sencha/extjs-reactor.git
cd extjs-reactor
npm install
cd packages/generator-ext-js
npm link
```

Now `yo @extjs/ext-js` will use your local copy of the generator.

## License

MIT © [Sencha, Inc.]()
