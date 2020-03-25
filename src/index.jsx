import React from 'react';
import { render } from 'react-dom';
import { HashRouter as Router, Route, Switch, Redirect } from 'react-router-dom';

import Book from './components/book';
import Explorer from './components/explorer';

const Root = () => (
    <Router>
        <Switch>
            <Route path="/book" component={Book} />
            <Route path="/explore" component={Explorer} />
            <Redirect to="/explore" />
        </Switch>
    </Router>
);

render(<Root />, document.getElementById('root'));