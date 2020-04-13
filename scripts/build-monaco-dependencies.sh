#!/bin/bash

ROOT=$PWD/node_modules/monaco-editor/esm/vs
OPTS="--no-minify --out-dir ./build/editor --cache-dir ./cache"

parcel build $ROOT/language/typescript/ts.worker.js $OPTS
parcel build $ROOT/editor/editor.worker.js $OPTS
