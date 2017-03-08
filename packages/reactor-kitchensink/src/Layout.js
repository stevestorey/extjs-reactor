import React, { Component } from 'react';
import { TitleBar, TabPanel, Panel, Container, Button, List } from '@extjs/reactor/modern';
import hljs, { highlightBlock } from 'highlightjs';
import code from './code';
import examples from './examples';
import NavTree from './NavTree';

// JSX syntax highlighting
import 'highlightjs/styles/atom-one-dark.css';
import H_js from './H_js';
hljs.registerLanguage('js', H_js);

function codeClassFor(file)  {
    if (file.endsWith('.css')) {
        return 'css';
    } else {
        return 'js xml'
    }
}

export default class Layout extends Component {
    
    constructor() {
        super();
        this.codePanels = [];

        this.navTreeStore = Ext.create('Ext.data.TreeStore', {
            rootVisible: true,
            root: examples
        });
    }

    componentDidMount() {
        this.highlightCode();
    }

    componentDidUpdate() {
        this.highlightCode();
    }
    
    highlightCode() {
        if (this.refs.examples) for (let el of this.refs.examples.el.query('.code')) {
            highlightBlock(el);
        }
    }

    onNavChange(node) {
        if (!node.isLeaf()) return;
        const { router, location } = this.props;
        const path = `/${node.getId()}`;
        
        if (location.pathname !== path) {
            router.push(path)
        }
    }

    render() {
        const { router, children, location } = this.props;
        const key = location.pathname.slice(1);
        const files = code[key];
        const docsMode = location.query.mode === 'docs';
        const selectedNode = this.navTreeStore.getNodeById(key);
        
        if (selectedNode) selectedNode.parentNode.expand();
        const component = selectedNode && selectedNode.get('component');

        return (
            <Container layout={{type: 'hbox', align: 'stretch'}} cls="main-background">
                { !docsMode && (
                    <Container layout="fit" flex={4}>
                        <TitleBar docked="top">
                            <div className="ext ext-sencha" style={{marginRight: '7px', fontSize: '20px'}}/>
                            ExtReact Kitchen Sink
                        </TitleBar>
                        <Container layout={{type: 'hbox', align: 'stretch'}} flex={1}>
                            <NavTree 
                                width={250} 
                                store={this.navTreeStore} 
                                selection={selectedNode}
                                onSelectionChange={(tree, record) => this.onNavChange(record)}
                            /> 
                            <Container layout="fit" flex={1} margin={30}>{ component && React.createElement(component) }</Container>
                        </Container>
                    </Container>
                )}
                { files && (
                    <TabPanel 
                        tabBar={{hidden: docsMode && files.length === 1 }}
                        title="Code"
                        flex={2}
                        bodyPadding="0"
                        shadow
                        ref="examples"
                        style={{backgroundColor: '#282c34'}}
                    >
                        { files.map((file, i) => (
                            <Container 
                                key={i}
                                scrollable={true}
                                title={file.file}
                                layout="fit"
                                style={{backgroundColor: '#282c34'}}
                                html={`<pre><code class="code ${codeClassFor(file.file)}">${file.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`}
                            />
                        ))}
                    </TabPanel>
                )}
            </Container>
        );
    }
}

