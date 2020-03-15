import React from 'react';
import ReactJson from 'react-json-view';

export default ({ result }) => (
  <ReactJson
    name="result"
    src={ typeof result === 'object' ? result : { value: result } }
  />
);
