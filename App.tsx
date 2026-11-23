import React from 'react'
import { StyleSheet, View, StatusBar } from 'react-native'
import { Whiteboard } from './components/whiteboard'

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <Whiteboard />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
})
