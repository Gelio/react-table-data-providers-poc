import { Observable } from 'rxjs';
import { useEffect, useState } from 'react';

export function useObservable<T>(observable: Observable<T>): [T | null, any] {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    const subscription = observable.subscribe(
      (newData) => {
        setData(newData);
      },
      (newError) => {
        setData(null);
        setError(newError);
      }
    );

    return () => subscription.unsubscribe();
  }, [observable]);

  return [data, error];
}
