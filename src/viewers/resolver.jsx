import React from 'react';

import JSONViewer from './JSONViewer';
import HTMLViewer from './HTMLViewer';

const resolver = (block, key) => {
    if(block.result === null) {
        return null;
    } else if(block.result.outputs) {
        return block.result.outputs.map((output) =>
            resolver({ ...block, result: output }, key)
        );
    }

    let Viewer = JSONViewer;

    if(block.result.html) {
        Viewer = HTMLViewer;
    }

    return <Viewer key={key} {...block} />;
};

export default resolver;