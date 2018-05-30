import React from 'react'
import ReactDOM from 'react-dom'
import { AppContainer } from 'react-hot-loader'
import { launch } from '@extjs/reactor';
import App from './AppRenderer'

let viewport;

import {ExtReact} from '@extjs/ext-react';
const render = (Component, target) => {
  ReactDOM.render(
    <ExtReact>
      <AppContainer>
        <Component/>
      </AppContainer>
    </ExtReact>,
    target
  )
}

launch(target => render(App, viewport = target));

if (module.hot) {
  module.hot.accept('./AppRenderer', () => render(App, viewport));
}
