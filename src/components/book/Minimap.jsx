import React, { useRef } from 'react';
import Minimap from 'react-minimap';
import './minimap.scss';

export default ({ children }) => {
    const minimapEl = useRef(null);

    return (
        <Minimap
            ref={minimapEl}
            height={minimapEl.current && minimapEl.current.source.clientHeight}
            selector=".book, .editor, .result, .view-line > span"
            childComponent={
                ({ width, height, left, top, node }) => {
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
                }
            }
        >
            <div className="minimap-content">
                { children }
            </div>
        </Minimap>
    );
}
