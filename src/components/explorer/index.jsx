import React, { Component } from 'react';
import Container from '@material-ui/core/Container';
import Paper from '@material-ui/core/Paper';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFolder } from '@fortawesome/free-solid-svg-icons/faFolder';
import { faBook } from '@fortawesome/free-solid-svg-icons/faBook';
import { faFileAlt } from '@fortawesome/free-solid-svg-icons/faFileAlt';
import { faDownload } from '@fortawesome/free-solid-svg-icons/faDownload';
import { faNodeJs } from '@fortawesome/free-brands-svg-icons/faNode';
import { withRouter } from 'react-router-dom';
import Path from 'path';

const icons = {
    notebook: faBook,
    directory: faFolder,
    file: faFileAlt,
    node_modules: faNodeJs,
    node_module: faNodeJs
}

export default withRouter(class Explorer extends Component {

    constructor(props) {
        super(props);
        this.state = {
            path: '/',
            result: {},
            isLoading: true
        };
    }

    componentDidMount() {
        const pathname = this.props.location.pathname;
        this.navigateTo(pathname.substring(pathname.indexOf('explore') + 'explore'.length));
    }

    componentDidUpdate(oldProps) {
        const pathname = this.props.location.pathname;
        if(pathname !== oldProps.location.pathname) {
            this.navigateTo(pathname.substring(pathname.indexOf('explore') + 'explore'.length));
        }
    }

    navigateToItem(item) {
        if(!item.access) {
            return;
        }

        this.navigateToPath(this.state.path, item.name);
    }

    navigateToPath(...path) {
        this.props.history.push(Path.join('/explore', ...path));
    }

    async navigateTo(path) {
        path = path || "/";
        this.setState({ path, isLoading: true });

        const response = await fetch(`/api/explore${path}`);
        const result = await response.json();
        this.setState({ result, isLoading: false, isFileLoading: false, file: null });

        if(result.type === 'file') {
            this.setState({ isFileLoading: true });
            const fileResponse = await fetch(`/api/explore${path}?open`);
            const reader = fileResponse.body.getReader();
            let readed = null;
            let file = new Uint8Array;

            do {
                readed = await reader.read();
                if(readed.value) {
                    file = new Uint8Array([ ...file, ...readed.value ]);
                }
            } while (!readed.done);

            if(this.state.result === result) {
                this.setState({ isFileLoading: false, file });
            }
        }
    }

    navigateToSelf() {
        if(this.state.result.type === 'notebook') {
            this.props.history.push(Path.join('/book', this.state.path));
        } if(this.state.result.notebook) {
            this.props.history.push(Path.join('/book', this.state.result.notebook.path, '..'));
        }
    }

    renderItem(item) {
        return (
            <Card
                style={{ display: 'inline-block', width: 200, margin: 10, cursor: item.access ? 'pointer' : 'default', userSelect: 'none' }}
                key={item.name}
                onClick={() => item.access && this.navigateToItem(item)}
            >
                <CardContent>
                    <Typography style={{ fontSize: 14 }} color="textSecondary" gutterBottom>
                        <FontAwesomeIcon icon={icons[item.type]} /> { item.type }
                    </Typography>
                    <Typography variant="h5" component="h2">
                        { item.name }
                    </Typography>
                </CardContent>
            </Card>
        )
    }

    renderFile() {
        let viewer = <div>Preview not abailable.</div>;
        const path = Path.join('/api/explore', this.state.result.path) + '?open';
        const mimetype = this.state.result.mime;

        const aceEditorProps = {
            readOnly: true,
            theme: "dracula",
            fontSize: 16,
            minLines: 5,
            maxLines: Infinity,
            setOptions: {
                useWorker: false,
                tabSize: 2,
                navigateWithinSoftTabs: true
            }
        }

        if(mimetype === 'application/json' || mimetype.startsWith('text/')) {
            if(this.state.isFileLoading) {
                viewer = <div>loading</div>;
            } else if(this.state.file) {
                viewer = <pre children={ (new TextDecoder("utf-8")).decode(this.state.file) } />;
            }
        } else {
            viewer = <span>No preview available...</span>
        }

        return (
            <div style={{ padding: '0px 10px 10px', width: '100%' }}>
                { viewer }
            </div>
        );
    }

    render() {
        const pathString = this.state.path.replace(/^\//, '');
        const path = pathString.split('/');

        return (
            <Container className="explorer">
                <Paper>
                    <div style={{ display: 'flex', padding: "20px 20px", alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <Typography style={{ fontSize: 14 }} color="textSecondary">
                                { this.state.result.type }
                            </Typography>
                            <Typography style={{ fontSize: 14 }}>
                                <FontAwesomeIcon
                                    style={{ cursor: 'pointer' }}
                                    onClick={ () => this.navigateToPath('/') }
                                    icon={faFolder}
                                />
                                &nbsp;
                                {
                                    path.map((item, index) => (
                                        <>
                                            <span>/</span>
                                            &nbsp;
                                            <span
                                                style={{ cursor: 'pointer' }}
                                                onClick={ () => this.navigateToPath(`/${path.slice(0, index + 1).join('/')}`) }
                                            >
                                                { item }
                                            </span>
                                            &nbsp;
                                        </>
                                    ))
                                }
                            </Typography>
                        </div>
                        <div>
                            {
                                (this.state.result.type === 'notebook' || this.state.result.notebook) && (
                                    <Button onClick={() => this.navigateToSelf()}>
                                        <FontAwesomeIcon icon={faBook} />
                                        &nbsp;
                                        Open notebook
                                    </Button>
                                )
                            }
                            {
                                this.state.result.type === 'file' && (
                                    <Button href={Path.join('/api/explore', this.state.result.path) + '?open'} download={this.state.result.name}>
                                        <FontAwesomeIcon icon={faDownload} />
                                        &nbsp;
                                        Download
                                    </Button>
                                )
                            }
                        </div>
                    </div>
                    <div style={{ padding: "10px 10px" }}>
                        {
                            this.state.result.type !== 'file' && this.state.result.content && this.state.result.content.map(item => this.renderItem(item))
                        }
                        {
                            this.state.result.type === 'file' && this.renderFile()
                        }
                    </div>
                </Paper>
            </Container>
        );
    }
});
