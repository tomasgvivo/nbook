import React from 'react';
import { BlockMath } from 'react-katex';
import 'katex/dist/katex.css';

export default ({ value }) => (
    <BlockMath>{value}</BlockMath>
);
