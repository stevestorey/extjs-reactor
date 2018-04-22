//declare class ExtReact extends React.Component { }
//@extjs/ext-react/index.d.ts
// declare class ExtReact extends React.Component<ExtReactProps, any> { }
// export interface ExtReactProps {
// }

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import App from './App'; // app components
import { launch } from '@extjs/reactor16';
import { ExtReact } from '@extjs/ext-react';


launch(<ExtReact><App/></ExtReact>);



