import React, { useRef, useState } from 'react';
import { View, PanResponder } from 'react-native';
import Svg, { Path } from 'react-native-svg';

type Point = { x: number; y: number };
type Stroke = Point[];

export const Whiteboard = () => {
    
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const currentStroke = useRef<Stroke>([]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        currentStroke.current = [{ x: locationX, y: locationY }];
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        currentStroke.current.push({ x: locationX, y: locationY });
        setStrokes((prev) => [...prev.slice(0, -1), [...currentStroke.current]]);
      },
      onPanResponderRelease: () => {
        setStrokes((prev) => [...prev, [...currentStroke.current]]);
        currentStroke.current = [];
      },
    })
  ).current;

  const renderPath = (stroke: Stroke) => {
    const d = stroke.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    return <Path key={Math.random()} d={d} stroke="black" strokeWidth={2} fill="none" />;
  };

  return (
    <View {...panResponder.panHandlers} style={{ flex: 1, backgroundColor: '#fff' }}>
      <Svg style={{ flex: 1 }}>{strokes.map(renderPath)}</Svg>
    </View>
  );
};
