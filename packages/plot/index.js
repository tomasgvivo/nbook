const { Result } = require('@nbook/core');

const validTypes = [
    'line',
    'bar',
    'radar',
    'pie',
    'doughnut',
    'polarArea',
    'bubble',
    'scatter'
];

module.exports = {

    line(data = {}, options = {}) {
        return this.plot('line', data, options);
    },

    bar(data = {}, options = {}) {
        return this.plot('bar', data, options);
    },

    radar(data = {}, options = {}) {
        return this.plot('radar', data, options);
    },

    pie(data = {}, options = {}) {
        return this.plot('pie', data, options);
    },

    doughnut(data = {}, options = {}) {
        return this.plot('doughnut', data, options);
    },

    polarArea(data = {}, options = {}) {
        return this.plot('polarArea', data, options);
    },

    bubble(data = {}, options = {}) {
        return this.plot('bubble', data, options);
    },

    scatter(data = {}, options = {}) {
        return this.plot('scatter', data, options);
    },

    plot(type, data = {}, options = {}) {
        if(!type) {
            throw new Error('You must specify a plot type.');
        }

        if(!validTypes.includes(type)) {
            throw new Error(`You must specify a valid type (${validTypes.join(', ')}).`)
        }

        class PlotResult extends Result {
            getRenderer() {
                return {
                    path: this.relative(__dirname, './dist/chart.js')
                };
            }
    
            valueOf() {
                return { type, data, options };
            }
        }

        return new PlotResult;
    }

};
