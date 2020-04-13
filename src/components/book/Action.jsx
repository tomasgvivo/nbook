import React from 'react';
import IconButton from '@material-ui/core/IconButton';
import Tooltip from '@material-ui/core/Tooltip';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export default ({ className, title, icon, disabled, onRun, hide, active }) => hide ? null : (
    <Tooltip title={title}>
        <span>
            <IconButton className={`action ${active !== false ? 'active' : ''} ${className}`} size="small" disabled={disabled} onClick={onRun}>
                <FontAwesomeIcon icon={icon} />
            </IconButton>
        </span>
    </Tooltip>
);
