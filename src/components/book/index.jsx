import React from 'react';
import { withRouter } from 'react-router-dom';
import NotebookService from './NotebookService';
import Content from './Content';

export default withRouter(({ location: { pathname } }) => (
  <NotebookService path={pathname.substring(pathname.indexOf('explore') + 'explore'.length)}>
    <Content />
  </NotebookService>
));
