import "expo-router/entry";
import { LogBox } from 'react-native';

// Ignore specific warning message
LogBox.ignoreLogs([
  'VirtualizedLists should never be nested', // partial match works
]);