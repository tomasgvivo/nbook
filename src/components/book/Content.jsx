import React from 'react';
import Container from '@material-ui/core/Container';
import Paper from '@material-ui/core/Paper';
import ReactHotkeys from 'react-hot-keys';
import { withNotebook } from './NotebookService';
import Minimap from './Minimap';
import AppBar from './AppBar';
import Block from './Block';

const handleHotkeys = ({ save, status }) => (keyName, event) => {
    if(keyName === 'ctrl+s' && !status.notebook.isSaved) {
        save();
    }

    event.preventDefault();
    event.stopPropagation();
    return false;
}

export default withNotebook([ 'notebook.blocks', 'status' ], ({ notebook, save, status }) => !notebook ? null : (
    <div className="book-container">
        <ReactHotkeys
            keyName="ctrl+s"
            onKeyDown={handleHotkeys({ save, status })}
        >
            <AppBar />
            <div className="book-content">
                <Minimap>
                    <Container>
                        <Paper className="book">
                            { notebook.blocks.map((block, index) => <Block key={block.id} block={block} index={index} />) }
                        </Paper>
                    </Container>
                </Minimap>
            </div>
        </ReactHotkeys>
    </div>
));
