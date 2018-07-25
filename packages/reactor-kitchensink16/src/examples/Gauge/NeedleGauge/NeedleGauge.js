
import React, { Component } from 'react';
import { SliderField, Gauge, FormPanel, ToggleField, Container} from '@extjs/ext-react';

Ext.require('Ext.ux.gauge.needle.Diamond');
Ext.require('Ext.ux.gauge.needle.Arrow');
Ext.require('Ext.ux.gauge.needle.Wedge');
Ext.require('Ext.ux.gauge.needle.Spike');

export default class NeedleGaugeExample extends Component {

    constructor() {
        super();
        this.state = {
            value: 30
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
            <FormPanel shadow layout="vbox" width={850}>
                <Container margin={'10 0 10 0'} flex={1} width={'100%'} layout="hbox">
                    <SliderField onDrag={this.changeInfo.bind(this)} width={"80%"} onChange={this.updateGauges.bind(this)} value={value} liveUpdate={liveUpdate}/>
                    <ToggleField onChange={this.updateToggle.bind(this)} label="Live" padding="0 0 0 20" value={liveUpdate} layout={{align:'center'}} labelAlign="right" width={"20%"} tooltip="Live Update Value Change"/>
                </Container>
                <Container 
                    layout={{
                        type: 'hbox',
                        align: 'stretch'
                    }} 
                    margin={'10 0 10 0'} flex={1} 
                    width={'100%'}
                    minHeight={200}
                >
                    <Gauge flex={1} value={value} 
                        needle={{
                            outerRadius: '100%'
                        }} 
                        valueStyle={{
                            display: 'none'
                        }}
                    />
                    <Gauge flex={1} value={value} needle={'wedge'}/>
                </Container>
                <Container 
                    layout={{
                        type: 'hbox',
                        align: 'stretch'
                    }} 
                    margin={'10 0 10 0'} flex={1} 
                    width={'100%'} 
                    minHeight={200}
                >
                    <Gauge flex={1} value={value} needle={'spike'}/>
                    <Gauge flex={1} value={value} 
                        needle={{
                            type: 'arrow',
                            innerRadius: 0
                        }} 
                        textOffset={ {
                            dy: 45
                        }}
                    />
                </Container>
            </FormPanel>
        )
    }

}
