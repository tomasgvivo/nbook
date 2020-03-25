import React, { Component, memo } from 'react';
import MuiAlert from '@material-ui/lab/Alert';

import JSONViewer from './JSONViewer';
import HTMLViewer from './HTMLViewer';
import PlotViewer from './PlotViewer';
import TableViewer from './TableViewer';

function Alert(props) {
    return <MuiAlert variant="filled" {...props} />;
}

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, message: null };
    }

    componentDidUpdate(prevProps, prevState) {
        if(this.state.hasError && prevState.hasError) {
            this.setState({ hasError: false, message: null });
        }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, message: error.message };
    }

    render() {
        if (this.state.hasError) {
            return <Alert severity="error">{ this.state.message }</Alert>;
        } else {
            return this.props.children;
        }
    }
}

const ViewResolver = memo(({ result, key }) => {
    let output;

    if(result === null || typeof result === 'undefined') {
        output = null;
    } else if(result.outputs) {
        output = result.outputs.map((output, index) => <ViewResolver result={output} key={index} />);
    } else if(result.html) {
        output = <HTMLViewer result={result} key={key} />;
    } else if(result.plot) {
        output = <PlotViewer result={result} key={key} />;
    } else if(result.table) {
        output = <TableViewer result={result} key={key} />;
    } else {
        output = <JSONViewer result={result} key={key} />;
    }

    return (
        <ErrorBoundary>
            { output }
        </ErrorBoundary>
    );
});

export default ViewResolver;