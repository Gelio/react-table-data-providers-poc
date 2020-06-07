import { Observable, combineLatest } from 'rxjs';

import { TableDataGetter, DataFetchingState, isFetchingError } from './types';
import {
  map,
  distinctUntilChanged,
  switchMapTo,
  startWith,
  pluck,
} from 'rxjs/operators';
import { isDefined } from '../utils/is-defined';

export type ReferencesResolver<Data, ResolvedData = Data> = (
  mainEntityData: Data,
  // TODO: add types for references
  referencesData: Record<string, unknown | null>
) => ResolvedData;

/**
 * Resolves additional references
 *
 * When refreshing, all references refresh too
 *
 * TODO: consider fetching references based on the main entity data
 */
export const getRefResolvingDataGetter = <Data, ResolvedData, Error>(
  getMainEntityData: TableDataGetter<Data, Error>,
  // TODO: add types for references
  references: Record<string, Observable<unknown>>,
  resolveReferences: ReferencesResolver<Data, ResolvedData>
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
        if (
          !isDefined(dataFetchingState.result) ||
          isFetchingError(dataFetchingState.result)
        ) {
          // NOTE: in error state there is no data. Thus, it is safe to change the type.
          return (dataFetchingState as unknown) as DataFetchingState<
            ResolvedData,
            Error
          >;
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
