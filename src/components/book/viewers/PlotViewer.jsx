import React, { useMemo, useRef, useEffect } from 'react';
import ChartComponent from 'react-chartjs-2';
import { isEqual } from 'lodash';

function usePrevious(value) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}


export default ({ result }) => {
  const props = useMemo(() => {
    const { type, data, options: rawOptions } = result.plot;
    const { width, height, ...options } = rawOptions || {};
    return { type, data, options, width, height };
  }, [result.plot]);

  const prevPorps = usePrevious(props);
  const redraw = !isEqual(prevPorps, props);

  return <ChartComponent { ...{ ...props, redraw } } />
};
