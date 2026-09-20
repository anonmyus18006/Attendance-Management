import { AppRegistry } from 'react-native';
import App from './App';
import appConfig from '../app.json';

// Native React Native Application Entry Point
AppRegistry.registerComponent(appConfig.name, () => App);

export default App;
