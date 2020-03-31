import React, { Component, Suspense } from 'react';
import MuiAlert from '@material-ui/lab/Alert';
import JSONRenderer from './renderers/json';
import HTMLRenderer from './renderers/html';
import csstree from 'css-tree';
const Url = require('url');

const { v4: uuid } = require('uuid')

export default class Result extends Component {
    componentDidMount() {
        this.loadRenderer();
    }

    componentDidUpdate(prevProps) {
        if(prevProps.renderer !== this.props.renderer) {
            this.loadRenderer();
        }
    }

    getDefaultRenderer() {
        return () => null;
    }

    loadRenderer() {
        this.uuid = uuid();
        this.Renderer = this.getDefaultRenderer();

        if(typeof this.props.renderer === 'string') {
            switch(this.props.renderer) {
                case 'json': {
                    this.Renderer = JSONRenderer;
                    break;
                }

                case 'html': {
                    this.Renderer = HTMLRenderer;
                    break;
                }
            }
        } else if(typeof this.props.renderer === 'object' && this.props.renderer.path) {
            const basePath = `/workspace/${this.props.notebookPath}`;
            const url = `${basePath}/${this.props.renderer.path}`;

            this.Renderer = React.lazy(async () => {
                let externalModule = {};
                const response = await fetch(url);
                const script = await response.text();

                try {
                    const module = { exports: null };
                    const parcelLoader = eval(script);
                    externalModule = module.exports;
                    const key = Object.keys(parcelLoader.modules).find(key => parcelLoader.modules[key][0] === module.exports);

                    console.log(module);
                } catch(error) {
                    console.log(error);
                    externalModule.default = () => (
                        <Alert severity="warning">
                            { error.message }
                            <pre style={{ color: 'white', margin: 0 }}>
                                {error.stack.split('\n').slice(1).join('\n')}
                            </pre>
                        </Alert>
                    );
                }

                let styles = [];

                if(this.props.renderer.css) {
                    const cssUrl = `${basePath}/${this.props.renderer.css}`;
                    let css = '';
                    let error = null;
                    try {
                        const response = await fetch(cssUrl);
                        const rawStyle = await response.text();
                        const ast = csstree.parse(rawStyle);

                        csstree.walk(ast, node => {
                            switch(node.type) {
                                case 'Url': {
                                    if(!Url.parse(node.value.value).host) {
                                        node.value.value = Url.resolve(url, node.value.value.replace(/^\//, ''))
                                    }
                                    break;
                                }
                        
                                case 'Selector': {
                                    node.children.prependData({ type: 'WhiteSpace', loc: null, value: ' ' });
                                    node.children.prependData({ type: 'ClassSelector', loc: null, name: '_' + this.uuid });
                                    break;
                                }
                            }
                        });

                        css = csstree.generate(ast);
                    } catch(err) {
                        console.log(err);
                        error = err;
                    }

                    styles.push({ url: cssUrl, css, error })
                }
    
                const ExternalRenderer = externalModule.default;

                externalModule.default = ({ value }) => (
                    <>
                        <ExternalRenderer value={value} />
                        {
                            styles.map((style, index) => {
                                if(style.error) {
                                    return (
                                        <Alert severity="warning">
                                            Couldn't load css {style.url}
                                            <pre style={{ color: 'white', margin: 0 }}>
                                                {style.error.stack}
                                            </pre>
                                        </Alert>
                                    )
                                } else {
                                    return (
                                        <style key={index}>
                                            {style.css}
                                        </style>
                                    )
                                }
                            })
                        }
                    </>
                );

                return externalModule;
            });
        }
    }

    render() {
        const Renderer = this.Renderer || this.getDefaultRenderer();

        if(Renderer) {
            return (
                <div className={ "result " + (this.uuid ? '_' + this.uuid : '')}>
                    <ErrorBoundary>
                        <Suspense fallback={<div>loading...</div>}>
                            <Renderer value={this.props.value} />
                        </Suspense>
                    </ErrorBoundary>
                </div>
            );
        } else {
            return null;
        }
    }
}

function Alert(props) {
    return <MuiAlert variant="filled" {...props} />;
}

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { error: null };
    }

    componentDidUpdate(prevProps, prevState) {
        if(this.state.hasError && prevState.hasError) {
            this.setState({ hasError: false, message: null });
        }
    }

    static getDerivedStateFromError(error) {
        return { error };
    }

    render() {
        if (this.state.hasError) {
            return <Alert severity="error">{ this.state.message }</Alert>;
        } else {
            return this.props.children;
        }
    }
}
