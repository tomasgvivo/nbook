import React from 'react';
import { ResponsiveContainer, ComposedChart, Area, CartesianGrid, XAxis, YAxis } from 'recharts';

module.exports = ({ stats, width, height, maxMemory = 0 }) => (
    <ResponsiveContainer width={width} height={height}>
        <ComposedChart data={stats.evolutive} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <defs>
                <linearGradient id="color-cpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="color-memory" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                </linearGradient>
            </defs>
            <Area
                type="step"
                dataKey="cpu"
                stroke="#82ca9d"
                yAxisId={0}
                isAnimationActive={false}
                animationEasing={'linear'}
                animationDuration={100}
                dot={false}
                fill="url(#color-cpu)"
            />
            <Area
                type="step"
                dataKey="memory"
                stroke="#8884d8"
                yAxisId={1}
                isAnimationActive={false}
                fill="url(#color-memory)"
            />
            <CartesianGrid strokeDasharray="3 3" horizontalPoints={[0, 20, 40, 60, 80]} />
            <XAxis dataKey="date" tick={false} hide={true} />
            <YAxis hide={true} yAxisId={0} domain={[0, 110]} />
            <YAxis hide={true} yAxisId={1} domain={[0, max => max > maxMemory ? max * 1.1 : maxMemory]}/>
        </ComposedChart>
    </ResponsiveContainer>
)


/**

arr = [0]
for(i = 0; i < 12; i++) {
  arr = arr.concat(arr);
}

arr.length

 */