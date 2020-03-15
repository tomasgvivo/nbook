const {
    Worker, isMainThread, parentPort, workerData
  } = require('worker_threads');
  
  if (isMainThread) {
    const worker = new Worker(__filename, {
        workerData: { test: 2 }
    });
    worker.on('message', data => console.log(data));
    worker.on('error', error => console.error(error));
  } else {
    const { test, fn } = workerData;
    parentPort.postMessage(() => test * test);
  }