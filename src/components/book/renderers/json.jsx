import React from 'react';
import ReactJson from 'react-json-view';

export default ({ value }) => (
  <ReactJson
    name="result"
    src={ typeof value === 'object' ? value : { value } }
  />
);
