import React, { Component, Suspense } from 'react';
import MuiAlert from '@material-ui/lab/Alert';
import JSONRenderer from './renderers/json';
import HTMLRenderer from './renderers/html';
import csstree from 'css-tree';
import isEqual from 'lodash.isequal';
import { v4 as uuid } from 'uuid';
import Url from 'url';

const cache = new Map();

export default class Result extends Component {
    constructor(props) {
        super(props);
        this.loadRenderer();
    }

    componentDidUpdate(prevProps) {
        if(prevProps.renderer !== this.props.renderer) {
            this.loadRenderer();
        }
    }

    shouldComponentUpdate(newProps) {
        return !isEqual(newProps, this.props);
    }

    getDefaultRenderer() {
        return () => null;
    }

    async fetchRenderer(basePath, url) {
        let externalModule = {};
        const response = await fetch(url);

        if(response.status >= 400) {
            return {
                default: () => (
                    <Alert severity="error">
                        Couldn't load renderer {url}, got status {response.status}.
                    </Alert>
                )
            };
        }

        const script = await response.text();

        {
            /**
             * Fix react hooks collition by overriding local react into externalModule's react.
             */
            function fixReactHooks_script(script) {
                const head = script.substr(
                    script.indexOf('parcelRequire'),
                    script.indexOf('{') - script.indexOf('parcelRequire') + 1
                );

                const [ args ] = head.match(/(\w{1,},(| )\w{1,},(| )\w{1,},(| )\w{1,})/);
                return script.replace(head, head + `fixReactHooks(${args});`);
            }

            function fixReactHooks(modules, cache, entry, globalName) {
                const mmap = Object.keys(modules).reduce((mmap, key) => {
                    return { ...mmap, ...modules[key][1] }
                }, {});

                if(mmap['react']) {
                    cache[mmap['react']] = { exports: React };
                }
            }

            const module = { exports: null };
            const parcelLoader = eval(fixReactHooks_script(script));

            if(parcelLoader.isParcelRequire) {
                externalModule = module.exports;
            } else {
                throw new Error('Module not supported.');
            }
        }

        let styles = [];

        if(this.props.renderer.css) {
            const cssUrl = `${basePath}/${this.props.renderer.css}`;
            try {
                const response = await fetch(cssUrl);
                const rawStyle = await response.text();
                const ast = csstree.parse(rawStyle);

                csstree.walk(ast, node => {
                    if(node.type === 'Url' && !Url.parse(node.value.value).host) {
                        node.value.value = Url.resolve(url, node.value.value.replace(/^\//, ''));
                    } else if(node.type === 'Selector') {
                        node.children.prependData({ type: 'WhiteSpace', loc: null, value: ' ' });
                        node.children.prependData({ type: 'ClassSelector', loc: null, name: '_' + this.uuid });
                    }
                });

                styles.push({ url: cssUrl, css: csstree.generate(ast) });
            } catch(error) {
                styles.push({ url: cssUrl, error });
            }
        }

        const ExternalRenderer = externalModule.default;

        const StyleAlert = ({ error, url }) => {
            <Alert severity="warning">
                Couldn't load css {style.url}
                <pre style={{ color: 'white', margin: 0 }}>
                    {style.error.stack}
                </pre>
            </Alert>
        };

        externalModule.default = ({ value }) => (
            <>
                <ExternalRenderer value={value} />
                { styles.map((style, index) => (
                        style.error ? <StyleAlert key={index} {...style} /> : <style key={index} children={style.css} />
                )) }
            </>
        );

        return externalModule;
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
            const basePath = `${process.env.NBOOK_PUBLIC_URL}/workspace/${this.props.notebookPath}`;
            const url = `${basePath}/${this.props.renderer.path}`;

            if(cache.has(url)) {
                this.Renderer = cache.get(url);
            } else {
                this.Renderer = React.lazy(() => this.fetchRenderer(basePath, url));
                cache.set(url, this.Renderer);
            }
        }
    }

    render() {
        const Renderer = this.Renderer || this.getDefaultRenderer();

        if(Renderer) {
            return (
                <div className={ "result " + (this.uuid ? '_' + this.uuid : '')}>
                    <ErrorBoundary>
                        <Suspense fallback={<div>loading...</div>} >
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
