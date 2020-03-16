const { createHash } = require('crypto');
const { createContext, runInContext } = require('vm');
const { cloneDeep } = require('lodash');
const defaultContext = require('./context');1

let isRunning = false;
let cachedContexts = new Map();

const getBaseContext = () => {
    return {
        ...defaultContext
    };
}

const hashBlock = (block, parentBlockHash) => {
    const hash = createHash('sha256');
    hash.update(parentBlockHash);
    hash.update(block.script.trim());
    return hash.digest('hex');
}

const run = async ({ book, targetIndex = book.blocks.length }) => {
    const contexts = new Map();
    let rollingContext = getBaseContext();
    let failed = false;
    let hash = '';

    for(let index in book.blocks) {
        const block = book.blocks[index];
        hash = hashBlock(block, hash);
        createContext(rollingContext);
        const output = {
            stratergy: 'skip',
            result: null,
            error: null,
            hasRun: null,
            context: null
        };

        if(cachedContexts.has(hash) && index < targetIndex) {
            // Use cache if necessary
            Object.assign(output, {
                stratergy: 'cache',
                context: cloneDeep(cachedContexts.get(hash)),
                result: block.result,
                error: block.error,
                hasRun: true
            });
        } else if(!failed && index <= targetIndex && block.script) {
            await runBlock(block, rollingContext, output);    
        }

        if(output.context) {
            rollingContext = output.context;
            contexts.set(hash, cloneDeep(output.context));
        }

        failed = !!output.error;
        sendBlockOutput(index, output);
    }

    cachedContexts.clear();
    cachedContexts = contexts;

    console.log('Finalized');
}

const runBlock = async (block, rollingContext, output) => {
    try {
        output.hasRun = true;
        output.stratergy = 'run';
        let result = runInContext(block.script, rollingContext);
        rollingContext['result'] = result;

        if(typeof result === 'function') {
            result = runInContext('result();', rollingContext);
            rollingContext['result'] = result;
        }

        if(result && typeof result.then === 'function') {
            result = await result;
            rollingContext['result'] = result;
        }

        output.result = typeof result === 'undefined' ? null : result;
        output.context = cloneDeep(rollingContext);
    } catch (error) {
        failed = true;
        result = null;

        const parsedStack = (
            error.stack.match(/evalmachine.*:(\d{1,}):(\d{1,})/) ||
            error.stack.match(/evalmachine.*:(\d{1,})/) ||
            []
        );

        const line = parsedStack[1] ? parseInt(parsedStack[1], 0) : null;
        const column = parsedStack[2] ? parseInt(parsedStack[2], 0) : null;

        output.error = {
            message: error.message,
            line,
            column,
            stack: error.stack.replace(/\n    at Script.runInContext(.*?\n){1,}.*/m, '').replace(/evalmachine\.\<anonymous\>/g, '(current block)')
        };
    }
}

process.on('message', async payload => {
    const { action, ...data } = JSON.parse(payload);

    if(action === 'run') {
        if(isRunning) {
            throw new Error('already running');
        }

        isRunning = true;
        await run(data);
        process.send(JSON.stringify({ action: 'finalized' }));
        isRunning = false;
    } else if(action === 'gc') {
        global.gc();
    }
});

const sendBlockOutput = (index, output) => {
    const payload = JSON.stringify({ action: 'block_output', index, ...output });
    process.send(payload);
}

console.log('Runtime loaded.');
