import React from 'react';
import unified from 'unified';
import parse from 'remark-parse';
import remark2react from 'remark-react';

import './md.css';

export default ({ value }) => (
    <div className="markdown-body">
        { unified().use(parse).use(remark2react).processSync(value.md).result }
    </div>
);
