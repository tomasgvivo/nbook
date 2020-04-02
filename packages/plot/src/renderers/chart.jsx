import React, { Component } from 'react';
import ChartComponent from 'react-chartjs-2';
import isEqual from 'lodash.isequal';

export default class Chart extends Component {
  constructor(props) {
    super(props);
    this.state = {
      value: props.value,
      redraw: false
    };
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      value: nextProps.value,
      redraw: !isEqual(this.state.value, nextProps.value)
    });
  }

  getChartProps() {
    const { type, data, options: rawOptions } = this.state.value;
    const { width, height, ...options } = rawOptions || {};
    const redraw = this.state.redraw;
    return { type, data, options, width, height, redraw };
  }

  render() {
    return <ChartComponent {...this.getChartProps()} />;
  }
}
