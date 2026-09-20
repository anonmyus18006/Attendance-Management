import { useState, useEffect } from 'react';
import { db } from '../database/db';

export function useDatabase() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsubscribe = db.subscribe(() => {
      setTick(prev => prev + 1);
    });
    return unsubscribe;
  }, []);

  return db;
}
