import React from 'react';
import ReactJson from 'react-json-view';

export default ({ result, error, failed, hasRun }) => !hasRun ? null : (
  !failed && (
    <ReactJsonerror
      name="success"
      src={ typeof result === 'object' ? result : { value: result } }
    />
  ) || (
    <ReactJson
      name="error"
      src={ error }
    />
  )
);
