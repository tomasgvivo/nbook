import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution';
import 'monaco-editor/esm/vs/language/typescript/monaco.contribution';
import 'monaco-editor/esm/vs/language/typescript/languageFeatures';
import 'monaco-editor/esm/vs/editor/contrib/suggest/suggestController.js';
import 'monaco-editor/esm/vs/editor/contrib/contextmenu/contextmenu.js';
import 'monaco-editor/esm/vs/editor/contrib/cursorUndo/cursorUndo.js';
import 'monaco-editor/esm/vs/editor/contrib/multicursor/multicursor.js';
import 'monaco-editor/esm/vs/editor/contrib/smartSelect/smartSelect.js';
import 'monaco-editor/esm/vs/editor/contrib/wordHighlighter/wordHighlighter.js';
import 'monaco-editor/esm/vs/editor/contrib/bracketMatching/bracketMatching.js';
import 'monaco-editor/esm/vs/editor/contrib/caretOperations/caretOperations.js';
import 'monaco-editor/esm/vs/editor/contrib/comment/comment.js';
import { MonacoToProtocolConverter, ProtocolToMonacoConverter } from 'monaco-languageclient/lib/monaco-converter';

const m2p = new MonacoToProtocolConverter();
const p2m = new ProtocolToMonacoConverter();

import { readFileSync } from 'fs';
{
    // readFileSync will be transpiled to a call to Buffer("...data...", 'base64').
    // And for some reason, Buffer is not defined in the browser.
    // Maybe report this to parcel as a bug?
    const Buffer = (encodedData, encoding) => {
        if(encoding !== 'base64') {
            throw new Error(`Mocked Buffer can't handle "${encoding}" encoding.`);
        }

        return atob(encodedData);
    }

    monaco.languages.typescript.javascriptDefaults.addExtraLib(
        readFileSync('src/dynamic/runtime.d.ts').toString()
    );
}

// validation settings
monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
	noSemanticValidation: true,
	noSyntaxValidation: false
});

// compiler options
monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ES2020,
    noLib: true,
	allowNonTsExtensions: true
});

monaco.languages.registerCompletionItemProvider('javascript', {
    provideCompletionItems(model, position, context) {
        return model.languageService.doComplete(m2p.asPosition(position.lineNumber, position.column), context).then((list) => {
            const wordUntil = model.getWordUntilPosition(position);
            const defaultRange = new monaco.Range(position.lineNumber, wordUntil.startColumn, position.lineNumber, wordUntil.endColumn);
            return p2m.asCompletionResult(list, defaultRange);
        });
    },

    resolveCompletionItem(model, position, item, token) {
        return model.languageService.doResolve(m2p.asCompletionItem(item)).then(result => p2m.asCompletionItem(result, item.range));
    }
});

self.MonacoEnvironment = {
	getWorkerUrl: function (moduleId, label) {
        switch(label) {
            case 'typescript':
            case 'javascript':
                return './editor/ts.worker.js';
            default:
                return './editor/editor.worker.js';
        }
	}
};

export default monaco;
