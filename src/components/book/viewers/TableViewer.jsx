import React from 'react';

export default ({ result }) => (
    <table>
        <thead>
            <tr>
                {
                    result.table.header.map((name, index) => <th key={index}>{name}</th>)
                }
            </tr>
        </thead>
        <tbody>
            {
                result.table.rows.map(
                    (row, index) => (
                        <tr key={index}>
                            { row.map((value, index) => <td key={index}>{value}</td>) }
                        </tr>
                    )
                )
            }
        </tbody>
    </table>
);
