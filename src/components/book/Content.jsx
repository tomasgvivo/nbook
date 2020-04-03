import React, { Component } from 'react';
import Block from './Block';
import { Paper } from '@material-ui/core';
import Minimap from 'react-minimap';
import Container from '@material-ui/core/Container';

import './minimap.scss';

const minimap_child = ({ width, height, left, top, node }) => {
    let className = node.className.split(' ').filter(v => v).map(className => `minimap-node minimap-node-${className}`).join(' ');
    if(node.parentNode.className.includes('view-line')) {
        className = 'minimap-node minimap-node-code-line';
        height = 1;
    }

    const style = { position: 'absolute', width, height, left, top };

    const props = { className, style };

    if(className.includes('editor') || className.includes('result')) {
        props.className += ' scrollable';
        props.onClick = () => node.scrollIntoView({ behavior: "smooth", block: 'center' });
        props.onMouseEnter = () => node.classList.add('highlight');
        props.onMouseLeave = () => node.classList.remove('highlight');
    }

    return <div {...props} />
};

export default class BookContent extends Component {
    
    constructor(props) {
        super(props);
        this.state = { minimapHeight: 200 };
    }

    componentDidMount() {
      const minimapHeight = this.bookContainer.clientHeight;
      this.setState({ minimapHeight });
    }
  
    render() {
        const { focus, blocks, actions, isCodeHidden, notebookPath, onKeyDown } = this.props;

        return (
            <div class="book-container" ref={bookContainer => { this.bookContainer = bookContainer; }} >
                <Minimap
                    selector=".book, .editor, .result, .view-line > span"
                    childComponent={minimap_child}
                    height={this.state.minimapHeight}
                >
                    <Container>
                        <Paper className="book">
                            {
                                blocks.map(
                                    (block, index) => (
                                        <Block
                                            key={block.id}
                                            block={block}
                                            index={index}
                                            inFocus={focus === index}
                                            actions={actions}
                                            isCodeHidden={isCodeHidden}
                                            notebookPath={notebookPath}
                                            onKeyDown={onKeyDown}
                                        />
                                    )
                                )
                            }
                        </Paper>
                    </Container>
                </Minimap>
            </div>
        );
    }

}
