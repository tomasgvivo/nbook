import React, { Component } from 'react';
import Block from './Block';
import { Paper } from '@material-ui/core';

export default ({ focus, blocks, actions, isCodeHidden }) => (
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
                    />
                )
            )
        }
    </Paper>
);
