import React from 'react';
import { IconButton, Tooltip } from '@material-ui/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export default ({ className, title, icon, disabled, onRun, hide, active }) => hide ? null : (
    <Tooltip title={title}>
        <IconButton className={`action ${active !== false ? 'active' : ''} ${className}`} size="small" disabled={disabled} onClick={onRun}>
            <FontAwesomeIcon icon={icon} />
        </IconButton>
    </Tooltip>
);
