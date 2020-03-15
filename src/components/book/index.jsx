import React, { Component } from 'react';
import Block from './Block';
import { Paper } from '@material-ui/core';

export default ({ book }) => (
  <Paper className="book">
    {
      book.blocks.map(
        (block, index) => <Block key={index} block={block} index={index} book={book} />
      )
    }
  </Paper>
);
