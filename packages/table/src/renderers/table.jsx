import React, { Component } from 'react';
import DataTable, { createTheme } from 'react-data-table-component';
import isEqual from 'lodash.isequal';

export default class TableRenderer extends Component {
  
  constructor(props) {
    super(props);
    this.state = this.parseValue(props.value);
  }

  parseValue({ data = [], options = {} }) {
    const { customStyles, columns, from_csv, ...tableOptions } = options;

    if(customStyles) {
      tableOptions.customStyles = createTheme('custom', customStyles);
    }

    tableOptions.noHeader = !tableOptions.title;

    if(Array.isArray(data) && data.length) {
      if(columns) {
        tableOptions.columns = columns.map(col => {
          if(typeof col === 'string') {
            return { name: col, selector: col, sortable: true };
          } else {
            return col;
          }
        });
      } else if(from_csv) {
        tableOptions.columns = from_csv.meta.fields.map(key => (
          { name: key, selector: key, sortable: true }
        ));
      } else {
        tableOptions.columns = Object.keys(data[0]).map(key => (
          { name: key, selector: key, sortable: true }
        ));
      }

      tableOptions.data = data;
    }

    return tableOptions;
  }

  componentWillReceiveProps(newProps) {
    if(!isEqual(newProps.value, this.props.value)) {
      this.setState(this.parseValue(newProps.value));
    }
  }

  render() {
    return <DataTable {...this.state} />;
  }

}