import React from 'react';
import ReactDom from 'react-dom';
import Table from './renderers/table.jsx';

import table from '../index';

const { value } = table.from_csv(`
country_name,country_code
Argentina,54
Argentina,54
USA,1
USA,1
Argentina,54
Argentina,54
USA,1
USA,1
Argentina,54
Argentina,54
USA,1
USA,1
Argentina,54
Argentina,54
USA,1
USA,1
Argentina,54
Argentina,54
USA,1
USA,1
Argentina,54
Argentina,54
USA,1
USA,1
Argentina,54
Argentina,54
USA,1
USA,1
Argentina,54
Argentina,54
USA,1
USA,1
Argentina,54
Argentina,54
USA,1
USA,1
Argentina,54
Argentina,54
USA,1
USA,1
Argentina,54
Argentina,54
USA,1
USA,1
Argentina,54
Argentina,54
USA,1
USA,1
Argentina,54
Argentina,54
USA,1
USA,1
Argentina,54
Argentina,54
USA,1
USA,1
`);
console.log(value);

ReactDom.render(<Table value={value} />, document.getElementById('root'));