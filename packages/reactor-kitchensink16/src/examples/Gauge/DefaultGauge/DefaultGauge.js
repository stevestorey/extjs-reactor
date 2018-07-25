
import React, { Component } from 'react';
import { SliderField, Gauge, FormPanel, ToggleField, Container } from '@extjs/ext-react';

export default class DefaultGaugeExample extends Component {

    constructor() {
        super();
        this.state = {
            value: 40
        }
        this.liveUpdate=false;
    }

    updateGauges(slider, value) {
            this.setState({ value })
    }

    changeInfo(slider, info1, info2, newVal, oldVal) {
        if(this.liveUpdate){
            var val = newVal[newVal.length-1];
            this.setState({ value: val });
        }
    }

    updateToggle(toggle, value) {
        this.liveUpdate=value;
    }

    render() {
        const { value } = this.state,
        { liveUpdate } = this.liveUpdate;

        return (
            <FormPanel shadow layout="vbox" width={700} height={'100%'}>
                <Container flex={1} width={'100%'} layout="hbox" maxHeight={30}>
                    <SliderField onDrag={this.changeInfo.bind(this)} width={"70%"} onChange={this.updateGauges.bind(this)} value={value} liveUpdate={liveUpdate}/>
                    <ToggleField onChange={this.updateToggle.bind(this)} label="Live" padding="0 0 0 20" value={liveUpdate} layout={{align:'center'}} labelAlign="right" width={"25%"} tooltip="Live Update Value Change"/>
                </Container>
                <Gauge flex={1} value={value}/>
                <Gauge flex={1} value={value} ui="green" trackStart={180} trackLength={360}/>
            </FormPanel>
        )
    }

}
