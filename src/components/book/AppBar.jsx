import React from 'react';
import prettyBytes from 'pretty-bytes';
import AppBar from '@material-ui/core/AppBar';
import Typography from '@material-ui/core/Typography';
import Hidden from '@material-ui/core/Hidden';
import Divider from '@material-ui/core/Divider';
import IconButton from '@material-ui/core/IconButton';
import Grid from '@material-ui/core/Grid';
import Tooltip from '@material-ui/core/Tooltip';
import LinearProgress from '@material-ui/core/LinearProgress';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSquare } from '@fortawesome/free-solid-svg-icons/faSquare';
import { faTrash } from '@fortawesome/free-solid-svg-icons/faTrash';
import { faSync } from '@fortawesome/free-solid-svg-icons/faSync';
import { faSave } from '@fortawesome/free-solid-svg-icons/faSave';
import { faPlay } from '@fortawesome/free-solid-svg-icons/faPlay';
import { faForward } from '@fortawesome/free-solid-svg-icons/faForward';
import { faBook } from '@fortawesome/free-solid-svg-icons/faBook';
import { faEye } from '@fortawesome/free-solid-svg-icons/faEye';
import { faEyeSlash } from '@fortawesome/free-solid-svg-icons/faEyeSlash';
import { faPrint } from '@fortawesome/free-solid-svg-icons/faPrint';
import { faStop } from '@fortawesome/free-solid-svg-icons/faStop';
import ResourceGraph from './ResourceGraph';
import Action from './Action';
import { withNotebook } from './NotebookService';

export default withNotebook([ 'notebook.title', 'stats', 'status', 'runtime', 'mode', 'progress' ], props => {
    return (
        <div className="appbar">
            <AppBar color="inherit" elevation={4}>
                <Grid container direction="row" justify="center">
                    <Grid item xs={12} sm={8} md={9} lg={10}>
                        <Typography style={{ fontSize: 20, padding: '0em 1em', lineHeight: '64px' }}>
                            <FontAwesomeIcon style={{ color: '#888', marginRight: '0.5em' }} icon={faBook} /> {props.notebook.title} <span style={{ color: '#888' }}>({ props.status.notebook.isSaved ? 'saved' : 'unsaved' })</span>
                        </Typography>
                        <Divider />
                        <Grid style={{ display: 'flex', padding: '0em 1em' }}>
                            <Action
                                title="Save"
                                icon={faSave}
                                onRun={() => props.save()}
                                disabled={props.status.notebook.isSaved}
                            />
                            <Divider orientation="vertical" style={{ margin: '0.2em' }} flexItem />
                            <Action
                                title="Run"
                                icon={faPlay}
                                onRun={() => props.runtime.run({ targetIndex: props.currentBlockIndex })}
                                disabled={props.status.runtime.isRunning}
                            />
                            <Action
                                title="Run all"
                                icon={faForward}
                                onRun={() => props.runtime.run()}
                                disabled={props.status.runtime.isRunning}
                            />
                            <Action
                                title="Stop"
                                icon={faStop}
                                onRun={() => props.runtime.stop()}
                                disabled={!props.status.runtime.isRunning}
                            />
                            <Divider orientation="vertical" style={{ margin: '0.2em' }} flexItem />
                            <Action
                                title="Print"
                                icon={faPrint}
                                onRun={() => window.print()}
                                disabled={props.status.runtime.isRunning}
                            />
                            <Divider orientation="vertical" style={{ margin: '0.2em' }} flexItem />
                            <Action
                                title="Show Code"
                                icon={faEye}
                                onRun={() => props.setMode('pre-visualize')}
                                hide={props.mode === 'pre-visualize'}
                            />
                            <Action
                                title="Hide Code"
                                icon={faEyeSlash}
                                onRun={() => props.setMode('edit')}
                                hide={props.mode === 'edit'}
                            />
                        </Grid>
                    </Grid>
                    <Hidden only="xs">
                        <Grid item sm={4} md={3} lg={2}>
                            <ResourceGraph stats={props.stats} width="100%" height={96} maxMemory={(1024 ** 2) * 512} />
                        </Grid>
                    </Hidden>
                    <Grid item xs={12} sm={8} md={9} lg={10} >
                        <Divider />
                        <Grid style={{ display: 'flex', padding: '0em 1em' }}>
                            <Typography style={{ fontSize: 16, lineHeight: '36px' }}>
                                Status: { props.status.runtime.isRunning ? 'running' : 'idle' }
                            </Typography>
                        </Grid>
                    </Grid>
                    <Hidden only="xs">
                        <Grid item sm={4} md={3} lg={2}>
                            <Divider />
                            <Grid style={{ display: 'flex', padding: '0em 0em' }}>
                                <Tooltip title={`pid: ${props.stats.current.pid}`}>
                                    <div>
                                        <Typography style={{ fontSize: 12, lineHeight: '18px', color: '#888' }} noWrap>
                                            <FontAwesomeIcon icon={faSquare} style={{ color: '#82ca9d' }} /> cpu: {(props.stats.current.cpu || 0).toFixed()}%
                                        </Typography>
                                        <Typography style={{ fontSize: 12, lineHeight: '18px', color: '#888' }} noWrap>
                                            <FontAwesomeIcon icon={faSquare} style={{ color: '#8884d8' }} /> memory: { prettyBytes(props.stats.current.memory || 0) }
                                        </Typography>
                                    </div>
                                </Tooltip>
                                <div style={{ flexGrow: 1 }} role="listitem" aria-labelledby="shopping cart items" />
                                <Tooltip title="collect garbage">
                                    <IconButton size="small" style={{ margin: '0.2em' }} onClick={() => props.runtime.collectGarbage()}><FontAwesomeIcon icon={faTrash} /></IconButton>
                                </Tooltip>
                                <Tooltip title="re-create runtime">
                                    <IconButton size="small" style={{ margin: '0.2em' }} onClick={() => props.runtime.restart()}><FontAwesomeIcon icon={faSync} /></IconButton>
                                </Tooltip>
                                &nbsp;
                            </Grid>
                        </Grid>
                    </Hidden>
                    <Grid item xs={12}>
                        {
                            props.progress && props.progress.message !== 'done' && (
                                <LinearProgress
                                    className={`progressbar book-state-${props.status.runtime.isRunning ? 'running' : 'idle'}`}
                                    variant="determinate"
                                    value={ props.progress.value }
                                />
                            )
                        }
                    </Grid>
                </Grid>
            </AppBar>
        </div>
    );
});
