import React, { Component } from 'react';
import Container from '@material-ui/core/Container';
import AppBar from './components/AppBar'
import BookComponent from './components/book';
import Book from '../lib/Book';

export default class App extends Component {

  constructor(props) {
    super(props);
    this.book = Book.load('./books/test');
    this.state = {
      stats: { current: {}, evolutive: [] }
    }
    this.book.on('update', () => {
      this.forceUpdate();
    });
    this.book.on('stats', stats => {
      this.setState({
        stats: stats
      });
    });
  }

  render() {
    return (
      <>
        <AppBar book={this.book} />
        <Container>
          <BookComponent book={this.book} />
        </Container>
      </>
    );
  }
}
