import 'react-native-gesture-handler'
import 'react-native-reanimated'
import React from 'react'
import { StyleSheet } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { Whiteboard } from './components/whiteboard'

export default function App() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <Whiteboard />
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})
