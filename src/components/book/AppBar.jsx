import React from 'react';
import { AppBar, Toolbar, Typography, Hidden, Divider, IconButton, Grid, Tooltip, LinearProgress } from '@material-ui/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCode, faSquare, faTrash, faSync, faSave, faPlay, faForward, faBook, faEye, faEyeSlash, faPrint, faStop } from '@fortawesome/free-solid-svg-icons'
import { faMarkdown } from '@fortawesome/free-brands-svg-icons'
import ResourceGraph from './ResourceGraph';
const prettyBytes = require('pretty-bytes');

const Action = ({ title, icon, disabled, onRun, hide }) => hide ? null : (
    <Tooltip title={title}>
        <IconButton size="small" style={{ margin: '0.2em' }} disabled={disabled} onClick={() => onRun()}>
            <FontAwesomeIcon icon={icon} />
        </IconButton>
    </Tooltip>
);

export default ({ title, stats, status, blocks, actions, focus, saved, isCodeHidden, progress }) => {
    return (
        <AppBar color="inherit" elevation={4}>
            <Grid container direction="row" justify="center">
                <Grid item xs={12} sm={8} md={9} lg={10}>
                    <Typography style={{ fontSize: 20, padding: '0em 1em', lineHeight: '64px' }}>
                        <FontAwesomeIcon icon={faBook} /> {title} ({ saved ? 'saved' : 'unsaved' })
                    </Typography>
                    <Divider />
                    <Grid  style={{ display: 'flex', padding: '0em 1em' }}>
                        <Action title="Save" icon={faSave} onRun={() => actions.save()} />
                        <Divider orientation="vertical" style={{ margin: '0.2em' }} flexItem />
                        <Action title="Run" icon={faPlay} onRun={() => actions.run(focus)} disabled={status === 'running'} />
                        <Action title="Run all" icon={faForward} onRun={() => actions.run()} disabled={status === 'running'} />
                        <Action title="Stop" icon={faStop} onRun={() => actions.stop()} disabled={status !== 'running'} />
                        <Divider orientation="vertical" style={{ margin: '0.2em' }} flexItem />
                        <Action title="Print" icon={faPrint} onRun={() => window.print()} disabled={status === 'running'} />
                        <Divider orientation="vertical" style={{ margin: '0.2em' }} flexItem />
                        <Action title="Show Code" icon={faEye} onRun={() => actions.showCode()} hide={!isCodeHidden} />
                        <Action title="Hide Code" icon={faEyeSlash} onRun={() => actions.hideCode()} hide={isCodeHidden} />
                    </Grid>
                </Grid>
                <Hidden only="xs">
                    <Grid item sm={4} md={3} lg={2}>
                        <ResourceGraph stats={stats} width="100%" height={96} maxMemory={(1024 ** 2) * 512} />
                    </Grid>
                </Hidden>
                <Grid item xs={12} sm={8} md={9} lg={10} >
                    <Divider />
                    <Typography style={{ fontSize: 16, padding: '0em 1em', lineHeight: '48px' }}>
                        Status: { status }
                    </Typography>
                </Grid>
                <Hidden only="xs">
                    <Grid item sm={4} md={3} lg={2}>
                        <Divider />
                        <Toolbar variant="dense" disableGutters>
                            <Tooltip title={`pid: ${stats.current.pid}`}>
                                <div>
                                    <Typography noWrap>
                                        <FontAwesomeIcon icon={faSquare} style={{ color: '#82ca9d' }} /> cpu: {(stats.current.cpu || 0).toFixed()}%
                                    </Typography>
                                    <Typography noWrap>
                                        <FontAwesomeIcon icon={faSquare} style={{ color: '#8884d8' }} /> memory: { prettyBytes(stats.current.memory || 0) }
                                    </Typography>
                                </div>
                            </Tooltip>
                            <div style={{ flexGrow: 1 }} role="listitem" aria-labelledby="shopping cart items" />
                            <Tooltip title="collect garbage">
                                <IconButton size="small" style={{ margin: '0.2em' }} onClick={() => actions.forceRuntimeGC()}><FontAwesomeIcon icon={faTrash} /></IconButton>
                            </Tooltip>
                            <Tooltip title="re-create runtime">
                                <IconButton size="small" style={{ margin: '0.2em' }} onClick={() => actions.recreateRuntime()}><FontAwesomeIcon icon={faSync} /></IconButton>
                            </Tooltip>
                            &nbsp;
                        </Toolbar>
                    </Grid>
                </Hidden>
                <Grid item xs={12}>
                    {
                        progress && progress.message !== 'done' && (
                            <LinearProgress
                                className={`progressbar book-state-${status}`}
                                variant="determinate"
                                value={ progress.value }
                            />
                        )
                    }
                </Grid>
            </Grid>
        </AppBar>
    );
};
 