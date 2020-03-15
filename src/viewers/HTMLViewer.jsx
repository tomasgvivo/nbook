import React from 'react';

export default ({ result }) => (
  <div dangerouslySetInnerHTML={{ __html: result.html }} />
);
