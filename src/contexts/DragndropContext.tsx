import React, { createContext, useCallback, useRef, useState, ReactNode } from 'react';
import { Animated } from 'react-native';

// You can extend this type to include card data, listId, etc.
export type DragData = {
  cardId: string;
  fromListId: string;
  card?: any; // Optionally include the full card object
};

interface DragndropContextType {
  data?: DragData;
  pos: { x: number; y: number };
  dropPos?: { x: number; y: number };
  dragging: boolean;
  onDragStart: (data: DragData) => void;
  onDragMove: (pos: { x: number; y: number }) => void;
  onDragEnd: (pos: { x: number; y: number }) => void;
}

export const DragndropContext = createContext<DragndropContextType>({} as DragndropContextType);

export const DragndropContextProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<DragData>();
  const [dragging, setDragging] = useState(false);
  const [dropPos, setDropPos] = useState<DragndropContextType['dropPos']>();
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const posRef = useRef({
    x: new Animated.Value(0),
    y: new Animated.Value(0),
  }).current;

  const onDragStart = useCallback<DragndropContextType['onDragStart']>((data) => {
    setData(data);
    setDragging(true);
  }, []);

  const onDragMove = useCallback<DragndropContextType['onDragMove']>((pos) => {
    setPos(pos);
  }, []);

  const onDragEnd = useCallback<DragndropContextType['onDragEnd']>((pos) => {
    setDropPos(pos);
    setDragging(false);
  }, []);

  const value = {
    data,
    pos,
    dropPos,
    dragging,
    onDragStart,
    onDragMove,
    onDragEnd,
  };

  return (
    <DragndropContext.Provider value={value}>
      {children}
    </DragndropContext.Provider>
  );
}; 
