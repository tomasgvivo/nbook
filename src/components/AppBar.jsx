import React from 'react';
import { AppBar, Toolbar, Typography, Menu, MenuItem, ListItemText, Button, Divider, IconButton, Grid } from '@material-ui/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCode, faSquare } from '@fortawesome/free-solid-svg-icons'
import { faMarkdown } from '@fortawesome/free-brands-svg-icons'

import { ResponsiveContainer, ComposedChart, Area, CartesianGrid, XAxis, YAxis } from 'recharts';
const prettyBytes = require('pretty-bytes');

const MenuButton = ({ name }) => {
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
                    horizontal: 'center',
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
                <MenuItem>
                    <ListItemText primary="Sent mail" />
                </MenuItem>
                <MenuItem>
                    <ListItemText primary="Drafts" />
                </MenuItem>
                <MenuItem>
                    <ListItemText primary="Inbox" />
                </MenuItem>
            </Menu>
        </>
    );
}

export default ({ stats }) => {
    return (
        <AppBar color="inherit" elevation={4}>
            <Grid container direction="row" justify="center">
                <Grid item xs={10}>
                    <Toolbar variant="dense">
                        <Typography variant="h6" noWrap>
                            Untitled Book
                        </Typography>
                    </Toolbar>
                    <Toolbar variant="dense">
                        <MenuButton name="File"></MenuButton>
                        <MenuButton name="Edit"></MenuButton>
                    </Toolbar>
                </Grid>
                <Grid item xs={2}>
                    <ResponsiveContainer width="100%" height={96}>
                        <ComposedChart data={stats.evolutive} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                            <defs>
                                <linearGradient id="color-cpu" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="color-memory" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <Area
                                type="monotone"
                                dataKey="cpu"
                                stroke="#82ca9d"
                                yAxisId={0}
                                isAnimationActive={false}
                                animationEasing={'linear'}
                                animationDuration={100}
                                dot={false}
                                fill="url(#color-cpu)"
                            />
                            <Area
                                type="monotone"
                                dataKey="memory"
                                stroke="#8884d8"
                                yAxisId={1}
                                isAnimationActive={false}
                                fill="url(#color-memory)"
                            />
                            <CartesianGrid strokeDasharray="3 3" horizontalPoints={[0, 20, 40, 60, 80]} />
                            <XAxis dataKey="date" tick={false} hide={true} />
                            <YAxis hide={true} yAxisId={0} domain={[0, 110]} />
                            <YAxis hide={true} yAxisId={1} domain={[0, max => max * 1.1]}/>
                        </ComposedChart>
                    </ResponsiveContainer>
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
                    <Typography noWrap>
                        <FontAwesomeIcon icon={faSquare} style={{ color: '#82ca9d' }} /> cpu: {(stats.current.cpu || 0).toFixed()}%
                    </Typography>
                    <Typography noWrap>
                        <FontAwesomeIcon icon={faSquare} style={{ color: '#8884d8' }} /> memory: { prettyBytes(stats.current.memory || 0) }
                    </Typography>
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