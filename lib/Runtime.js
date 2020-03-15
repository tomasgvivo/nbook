const { isMainThread, parentPort, workerData } = require('worker_threads');
const { createHash } = require('crypto');
const { createContext, runInContext } = require('vm');
const { cloneDeep } = require('lodash');
const defaultContext = require('./context');

let isRunning = false;

const getBaseContext = () => {
    return {
        ...defaultContext
    };
}

const contexts = new Map();

const hashBlock = (block, parentBlockHash) => {
    const hash = createHash('sha256');
    hash.update(parentBlockHash);
    hash.update(block.script.trim());
    return hash.digest('hex');
}

const run = async ({ book, index = book.blocks.length }) => {
    let rollingContext = getBaseContext();
    let failed = false;
    let hash = '';

    for(let i in book.blocks) {
        const block = book.blocks[i];
        hash = hashBlock(block, hash);

        createContext(rollingContext);

        const output = await runBlock(block, rollingContext, hash, i, index, failed);
        const payload = JSON.stringify({ action: 'block_output', index: i, ...output });
        process.send(payload);

        failed = !!output.error;

        rollingContext = output.context;
        contexts.set(hash, cloneDeep(rollingContext));    
    }

    console.log('Finalized')
}

const runBlock = async (block, rollingContext, hash, index, targetIndex, failed) => {
    let result = null;
    let error = null;
    let hasRun = false;
    let context = rollingContext;

    if(failed || index > targetIndex) {
        console.log(`Parent failed, deleting context for block ${index} (${hash})`);
        contexts.delete(hash);
    } else if(block.hasRun && contexts.has(hash) && index != targetIndex) {
        console.log(`Cached block ${index} (${hash})`);
        context = cloneDeep(contexts.get(hash));
        result = block.result;
        error = block.error;
        hasRun = true;
    } else if(block.script) {
        console.log(`Running block ${index} (${hash})`);
        hasRun = true;

        try {
            result = runInContext(block.script, context);
        } catch (_error) {
            error = _error;
        }

        if(typeof result === 'function') {
            context['partialResult'] = result;
            
            try {
                result = runInContext('partialResult();', context);
            } catch (_error) {
                error = _error;
            }
        }

        if(result && typeof result.then === 'function') {
            try {
                result = await result;
            } catch (_error) {
                error = _error;
            }
        }

        context['result'] = result;

        if(error) {
            failed = true;
            result = null;

            const parsedStack = (
                error.stack.match(/evalmachine.*:(\d{1,}):(\d{1,})/) ||
                error.stack.match(/evalmachine.*:(\d{1,})/) ||
                []
            );

            const line = parsedStack[1] ? parseInt(parsedStack[1], 0) : null;
            const column = parsedStack[2] ? parseInt(parsedStack[2], 0) : null;

            error = {
                message: error.message,
                line,
                column,
                stack: error.stack.replace(/\n    at Script.runInContext(.*?\n){1,}.*/m, '').replace(/evalmachine\.\<anonymous\>/g, '(current block)')
            }
        }
    }

    result = typeof result === 'undefined' ? null : result;

    console.log(`Result block ${index} (${hash})`);
    console.log(result);

    return { result, error, hasRun, context };
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
    }
});

console.log('Runtime loaded.');
