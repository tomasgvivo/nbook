import React, { Component, useMemo, useRef, useEffect } from 'react';
import ChartComponent from 'react-chartjs-2';
import isEqual from 'lodash.isequal';

function usePrevious(value) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

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

 ({ value }) => {
  const props = useMemo(() => {
    const { type, data, options: rawOptions } = value;
    const { width, height, ...options } = rawOptions || {};
    return { type, data, options, width, height };
  }, [value]);

  const prevPorps = usePrevious(props);
  const redraw = !isEqual(prevPorps, props);

  return <ChartComponent { ...{ ...props, redraw } } />;
};
