import React from 'react';
import { SafeAreaView } from 'react-native';
import { Whiteboard } from './components/whiteboard';

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Whiteboard />
    </SafeAreaView>
  );
}