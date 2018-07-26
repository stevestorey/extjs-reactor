import React, { Component } from 'react';
import { Container, TimePanel } from '@extjs/ext-react';

export default class TimePanelExample extends Component {

    render() {
        return (
            <Container padding={Ext.os.is.Phone ? 0 : 10} layout="fit">
                <TimePanel shadow/>
            </Container>
        )
    }
}
