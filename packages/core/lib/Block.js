const isEqual = require('lodash.isequal');
const { v4: uuid } = require('uuid');

module.exports = class Block {
    constructor(id = uuid(), script = '') {
        this.id = id;
        this.script = script;

        this.hasRun = false;
        this.results = [];
        this.error = null;
        this.options = Block.getDefaultOptions();
        this.executionCount = 0;
        this.committedBlock = null;
        this.stratergy = null;
        this.time = null;
    }

    updateScript(script = '') {
        if(typeof script === 'string') {
            this.hasRun = this.script !== script;
            this.script = script;
        } else {
            throw new Error('Script must be a string.');
        }
    }

    updateOptions(options = {}) {
        if(typeof options === 'object') {
            this.hasRun = false;
            Object.assign(this.options, options);
        } else {
            throw new Error('Options must be an object.');
        }
    }

    setStratergy(stratergy) {
        if(typeof stratergy === 'string' || stratergy === null) {
            this.stratergy = stratergy;
        } else {
            throw new Error('Stratergy be a string or null.');
        }
    }

    setTime(time) {
        if(typeof time === 'number' || time === null) {
            this.time = time;
        } else {
            throw new Error('Time be a number or null.');
        }
    }

    setHasRun(bool = false) {
        if(typeof bool === 'boolean') {
            this.hasRun = bool;
        } else {
            throw new Error('Has run must be a boolean.');
        }
    }

    setResults(results = null) {
        if(results === null) {
            this.results = [];
        } else if(Array.isArray(results)) {
            this.results = results;
        } else {
            throw new Error('Result must be an array or null.');
        }
    }

    setError(error = null) {
        if(typeof error === 'object' || error === null) {
            this.error = error;
        } else {
            throw new Error('Error must be an object or null.');
        }
    }

    setExecutionCount(executionCount = 0) {
        if(isNaN(executionCount) || !isFinite(executionCount) || executionCount < 0) {
            throw new Error('Execution count must be a finite number greater or equal to 0.');
        } else {
            this.executionCount = parseInt(executionCount, 10);
        }
    }

    hasChanged() {
        return isEqual(this, this.committedBlock);
    }

    commit() {
        this.committedBlock = Block.clone(this);
    }

    toJSON() {
        return Block.serialize(this);
    }

    static clone(block) {
        return Block.deserialize(Block.serialize(block), false);
    }

    static getDefaultOptions() {
        return {
            noCache: false,
            noContext: false,
            canFail: false,
            isLocked: false,
            showSource: false
        };
    }

    static serialize(block) {
        if(block instanceof Block) {
            return {
                id: block.id,
                script: block.script,
                hasRun: block.hasRun,
                results: block.results,
                error: block.error,
                executionCount: block.executionCount,
                options: block.options,
                stratergy: block.stratergy,
                time: block.time
            };
        } else {
            throw new Error('Argument must be instance of Block.');
        }
    }

    static deserialize({ id, script, hasRun, results, error, executionCount, options }, commit = true) {
        const block = new Block(id, script);

        block.setHasRun(hasRun);
        block.setResults(results);
        block.setError(error);
        block.setExecutionCount(executionCount);
        block.updateOptions(options);
        
        if(commit) {
            block.commit();
        }

        return block;
    }
}
