import React from 'react';
import { AppBar, Toolbar, Typography, Menu, MenuItem, ListItemText, Button, Divider, IconButton, Grid, Tooltip, LinearProgress } from '@material-ui/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCode, faSquare, faTrash, faSync } from '@fortawesome/free-solid-svg-icons'
import { faMarkdown } from '@fortawesome/free-brands-svg-icons'
import ResourceGraph from './ResourceGraph';
const prettyBytes = require('pretty-bytes');

const MenuButton = ({ name, children }) => {
    const [anchorEl, setAnchorEl] = React.useState(null);
    const handleClick = event => {
        setAnchorEl(event.currentTarget);
    };
    
    const handleClose = () => {
        setAnchorEl(null);
    };
    return (
        <>
            <Button
                aria-controls="customized-menu"
                aria-haspopup="true"
                onClick={handleClick}
                size="small"
                style={{
                    background: 'white',
                    outline: 'none'
                }}
            >
                { name }
            </Button>
            <Menu
                elevation={0}
                getContentAnchorEl={null}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'center',
                }}
                id="customized-menu"
                anchorEl={anchorEl}
                keepMounted
                open={Boolean(anchorEl)}
                onClose={handleClose}
            >
                { children }
            </Menu>
        </>
    );
}

export default ({ book }) => {
    return (
        <AppBar color="inherit" elevation={4}>
            <Grid container direction="row" justify="center">
                <Grid item xs={10}>
                    <Toolbar variant="dense">
                        <Typography variant="h6" noWrap>
                            {book.name}
                        </Typography>
                    </Toolbar>
                    <Toolbar variant="dense">
                        <MenuButton name="File">
                            <MenuItem>
                                <ListItemText primary="Open..." />
                            </MenuItem>
                            <MenuItem onClick={() => book.save()}>
                                <ListItemText primary="Save"  />
                            </MenuItem>
                            <MenuItem>
                                <ListItemText primary="Save as..." />
                            </MenuItem>
                        </MenuButton>
                        <MenuButton name="Edit">

                        </MenuButton>
                    </Toolbar>
                </Grid>
                <Grid item xs={2}>
                    <ResourceGraph stats={book.stats} width="100%" height={96} maxMemory={(1024 ** 2) * 512} />
                </Grid>
                <Grid item xs={10}>
                    <Divider />
                    <Toolbar variant="dense">
                        <IconButton size="small" ><FontAwesomeIcon icon={faCode} /></IconButton>
                        <IconButton size="small"><FontAwesomeIcon icon={faMarkdown} /></IconButton>
                    </Toolbar>
                </Grid>
                <Grid item xs={2}>
                    <Divider />
                    <Toolbar variant="dense" disableGutters>
                        <Tooltip title={`pid: ${book.runtime.pid}`}>
                            <div>
                                <Typography noWrap>
                                    <FontAwesomeIcon icon={faSquare} style={{ color: '#82ca9d' }} /> cpu: {(book.stats.current.cpu || 0).toFixed()}%
                                </Typography>
                                <Typography noWrap>
                                    <FontAwesomeIcon icon={faSquare} style={{ color: '#8884d8' }} /> memory: { prettyBytes(book.stats.current.memory || 0) }
                                </Typography>
                            </div>
                        </Tooltip>
                        <div style={{ flexGrow: 1 }} role="listitem" aria-labelledby="shopping cart items" />
                            <Tooltip title="collect garbage">
                                <IconButton size="small" onClick={() => book.forceRuntimeGC()}><FontAwesomeIcon icon={faTrash} /></IconButton>
                            </Tooltip>
                            <Tooltip title="re-create runtime">
                                <IconButton size="small" onClick={() => book.recreateRuntime()}><FontAwesomeIcon icon={faSync} /></IconButton>
                            </Tooltip>
                        &nbsp;
                    </Toolbar>
                </Grid>
                <Grid item xs={12}>
                    <LinearProgress
                        className={`progressbar book-state-${book.status}`}
                        variant="determinate"
                        value={ (book.blocks.filter(block => block.hasRun).length / book.blocks.length) * 100 }
                    />
                </Grid>
            </Grid>
        </AppBar>
    );
}

/*

var arr = [];
while(true) {
  arr.push(Math.random())
}

*/