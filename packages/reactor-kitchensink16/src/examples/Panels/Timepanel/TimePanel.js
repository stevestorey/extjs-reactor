import React, { Component } from 'react';
import { Container, TimePanel } from '@extjs/ext-react';
import { mediumText } from '../../dummy';

Ext.require('Ext.panel.Time');

export default class TimePanelExample extends Component {

    render() {
        return (
            <Container padding={Ext.os.is.Phone ? 0 : 10} layout={Ext.os.is.Phone ? 'fit' : 'auto'}>
                <TimePanel shadow/>
            </Container>
        )
    }
}