import React, { Component } from 'react';
import { Container, Paper, Card, CardContent, Typography, Button } from '@material-ui/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFolder, faBook, faFileAlt, faDownload } from '@fortawesome/free-solid-svg-icons';
import { faNodeJs } from '@fortawesome/free-brands-svg-icons';
import { withRouter } from 'react-router-dom';
import Path from 'path';
import FileViewer from 'react-file-viewer';
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/mode-text";
import "ace-builds/src-noconflict/theme-dracula";

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
            <Card style={{ width: 200, margin: 10, cursor: item.access ? 'pointer' : 'default', userSelect: 'none' }} key={item.name} onClick={() => this.navigateToItem(item)}>
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

        if(mimetype.startsWith('image/')) {
            viewer = <img src={path} />;
        } else if(mimetype.startsWith('video/')) {
            viewer = <video src={path} />;
        } else if(mimetype.startsWith('audio/')) {
            viewer = <audio src={path} />;
        } else if(mimetype === 'application/pdf') {
            viewer = <FileViewer fileType="pdf" filePath={path} />;
        } else if(mimetype === 'text/csv') {
            viewer = <FileViewer fileType="csv" filePath={path} />;
        } else if(mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
            viewer = <FileViewer fileType="xlsx" filePath={path} />;
        } else if(mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            viewer = <FileViewer fileType="docx" filePath={path} />;
        } else if(mimetype === 'application/json') {
            if(this.state.isFileLoading) {
                viewer = <div>loading</div>;
            } else if(this.state.file) {
                viewer = <AceEditor value={ (new TextDecoder("utf-8")).decode(this.state.file) } { ...aceEditorProps } mode="json" />;
            }
        } else if(mimetype.startsWith('text/')) {
            if(this.state.isFileLoading) {
                viewer = <div>loading</div>;
            } else if(this.state.file) {
                viewer = <AceEditor value={ (new TextDecoder("utf-8")).decode(this.state.file) || '' } { ...aceEditorProps } mode="text" />;
            }
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
                    <div style={{ display: 'flex', padding: "10px 10px" }}>
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
