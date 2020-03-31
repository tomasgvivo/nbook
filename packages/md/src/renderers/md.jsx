import React from 'react';
import ReactMarkdown from 'react-markdown';

export default ({ value }) => (
    <ReactMarkdown source={value} />
);
