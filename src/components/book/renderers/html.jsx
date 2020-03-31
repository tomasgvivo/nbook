import React from 'react';

export default ({ value }) => (
  <div dangerouslySetInnerHTML={{ __html: value }} />
);
