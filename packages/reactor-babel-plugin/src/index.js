const OLD_MODULE_PATTERN = /^@extjs\/reactor\/modern$/;
const MODULE_PATTERN = /^@extjs\/(ext-react.*|reactor\/classic)$/;

module.exports = function(babel) {
    const t = babel.types;
    var prevFile = ''
    var importWritten = false
    var shouldWrite = false

    return {
        visitor: {
            ImportDeclaration: function(path) {
                const { node } = path;
                var currFile = path.hub.file.opts.sourceFileName
                // console.log("prevFile: " + prevFile)
                // console.log("currFile: " + currFile)
                if(prevFile != currFile) {
                  importWritten = false
                  shouldWrite = false
                }

                if (node.source && node.source.type === 'StringLiteral' && (node.source.value.match(MODULE_PATTERN) || node.source.value.match(OLD_MODULE_PATTERN))) {
                    const declarations = [];
                    let transform = false;

                    node.specifiers.forEach(spec => {
                        const imported = spec.imported.name;
                        const local = spec.local.name;
                        if (local == 'reactify') {
                          importWritten = false
                          shouldWrite = false
                        }
                        if (local != 'launch' && local != 'reactify' && local != 'Template' && local != 'renderWhenReady' && local != 'render') {
                            //readline.cursorTo(process.stdout, 0);console.log(`${app}generated-> const ${local} = reactify('${imported}')`)
                            shouldWrite = true
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
                        }
                    });

                    if (declarations.length) {
                        // console.log("Checking import write: ", !path.scope.hasBinding('reactify'), shouldWrite, !importWritten)
                        if (!path.scope.hasBinding('reactify') && shouldWrite && !importWritten) {
                            path.insertBefore(
                                t.importDeclaration(
                                    [t.importSpecifier(t.identifier('reactify'), t.identifier('reactify'))],
                                    t.stringLiteral('@extjs/reactor')
                                )
                            )
                            importWritten = true;
                        }

                        path.replaceWithMultiple(declarations);
                    }
                }
                prevFile = path.hub.file.opts.sourceFileName
            }
        }
    }
}
