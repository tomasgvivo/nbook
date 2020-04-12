const { v4: uuid } = require('uuid');
const Block = require('./Block');
const isEqual = require('lodash.isequal');

module.exports = class Notebook {
    constructor(id) {
        this.id = id || uuid();
        this.saved = false;
        this.title = "untitled notebook";
        this.blocks = [ new Block() ];
        this.commitedNotebook = null;
    }

    setTitle(title) {
        if(typeof title === 'string') {
            this.title = title;
        } else {
            throw new Error("Title must be a string.");
        }
    }

    setBlocks(blocks) {
        if(Array.isArray(blocks)) {
            this.blocks = blocks;
        } else {
            throw new Error("Blocks must be an array.");
        }
    }

    updateBlockScript(index, script) {
        this.blocks[index].updateScript(script);
    }

    updateBlockOptions(index, options = {}) {
        this.blocks[index].updateOptions(options);
    }

    createBlock(index = this.blocks.length) {
        const newBlock = new Block;

        if(index === this.blocks.length) {
            this.blocks = [ ...this.blocks, newBlock ];
        } else {
            this.blocks = this.blocks.reduce((res, block, i) => {
                if(i === index) {
                    return [ ...res, newBlock, block ];
                } else {
                    return [ ...res, block ];
                }
            }, []);
        }

        return this.blocks;
    }

    deleteBlock(index) {
        this.blocks = this.blocks.filter((b, i) => i !== index);

        if(this.blocks.length === 0) {
            this.createBlock();
        }

        return this.blocks;
    }

    clearBlock(index) {
        this.blocks[index].updateScript('');
        this.blocks[index].updateOptions(Block.getDefaultOptions());
    }

    hasChanged() {
        return isEqual(this, this.committedNotebook);
    }

    commit() {
        for(let block of this.blocks) {
            block.commit();
        }
        this.committedNotebook = Notebook.clone(this);
    }

    toJSON() {
        return Notebook.serialize(this);
    }

    static clone(notebook) {
        return Notebook.deserialize(Notebook.serialize(notebook), false);
    }

    static serialize(notebook) {
        if(notebook instanceof Notebook) {
            return {
                id: notebook.id,
                title: notebook.title,
                blocks: notebook.blocks
            };
        } else {
            throw new Error('Argument must be instance of Notebook.');
        }
    }

    static deserialize({ id, title, blocks }, commit) {
        const notebook = new Notebook(id);

        notebook.setTitle(title);

        if(Array.isArray(blocks)) {
            notebook.setBlocks(blocks.map(block => Block.deserialize(block)));
        }

        if(commit) {
            notebook.commit();
        }

        return notebook;
    }
}
