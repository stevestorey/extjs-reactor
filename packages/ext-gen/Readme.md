# ext-gen
A generator for Ext JS apps in NPM.

## Installation

Install [npm](https://www.npmjs.com/) (we assume you have pre-installed [node.js](https://nodejs.org/)).

```bash
npm install -g @extjs/ext-gen
```

## Creating a new ExtGen App

If you haven't already, log into Sencha's private registry using the credentials you received in your ExtReact trial or subscription activation email.  If you don't have credentials, you can get them by [signing up for a trial of ExtReact](https://www.sencha.com/products/extreact/evaluate/).

```
npm login --registry=http://npm.sencha.com --scope=@extjs
```

Then, to create a new ExtGen app, run:

```bash
@extjs/ext-gen
```

## Development

To make changes to the generator, run:

```
git clone git@github.com:sencha/extjs-reactor.git
cd extjs-reactor
npm install
cd packages/ext-gen
npm link
```

Now `@extjs/ext-gen` will use your local copy of the generator.

## License

MIT © [Sencha, Inc.]()
