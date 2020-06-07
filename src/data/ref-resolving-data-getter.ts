import { Observable, combineLatest } from 'rxjs';

import { TableDataGetter, DataFetchingState } from './types';
import {
  map,
  distinctUntilChanged,
  switchMapTo,
  startWith,
  pluck,
} from 'rxjs/operators';

/**
 * Resolves additional references
 *
 * When refreshing, all references refresh too
 *
 * TODO: consider fetching references based on the main entity data
 */
export const getRefResolvingDataGetter = <
  Data,
  ResolvedData extends Data,
  Error
>(
  getMainEntityData: TableDataGetter<Data, Error>,
  // TODO: add types for references
  references: Record<string, Observable<unknown>>,
  resolveReferences: (
    mainEntityData: Data,
    referencesData: Record<string, unknown | null>
  ) => ResolvedData
): TableDataGetter<ResolvedData, Error> => (params$) => {
  const referencesKeys = Object.keys(references);

  const requestId$ = params$.pipe(pluck('requestId'), distinctUntilChanged());

  const referencesResults$ = requestId$.pipe(
    switchMapTo(
      combineLatest(
        // NOTE: start with null so the resolver runs and data is returned before all references emit a
        // value
        referencesKeys.map((refKey) => references[refKey].pipe(startWith(null)))
      ).pipe(
        map((referencesArray) => {
          // NOTE: construct the object with references data back
          const referencesData: Record<string, unknown | null> = {};

          referencesArray.forEach((referenceData, index) => {
            referencesData[referencesKeys[index]] = referenceData;
          });

          return referencesData;
        })
      )
    )
  );

  return combineLatest(getMainEntityData(params$), referencesResults$).pipe(
    map(
      ([dataFetchingState, referencesResults]): DataFetchingState<
        ResolvedData,
        Error
      > => {
        if (dataFetchingState.result.type === 'error') {
          // NOTE: in error state there is no data. Thus, it is safe to change the type.
          return dataFetchingState as DataFetchingState<ResolvedData, Error>;
        }

        return {
          ...dataFetchingState,
          result: {
            ...dataFetchingState.result,
            data: resolveReferences(
              dataFetchingState.result.data,
              referencesResults
            ),
          },
        };
      }
    )
  );
};
