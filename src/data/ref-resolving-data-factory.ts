import { TableDataGetter, TableDataParamsWithRequestId } from './types';
import {
  startWith,
  map,
  shareReplay,
  filter,
  distinctUntilChanged,
  switchMapTo,
} from 'rxjs/operators';
import { Observable, combineLatest, BehaviorSubject } from 'rxjs';

/**
 * Resolves additional references
 *
 * When refreshing, all references refresh too
 */
export const getRefResolvingDataFactory = <RowData, ResolvedRowData>(
  getMainEntityData: TableDataGetter<RowData>,
  // TODO: add types for references
  references: Record<string, Observable<unknown>>,
  resolveReferences: (
    mainEntityData: RowData[],
    referencesData: Record<string, unknown | null>
  ) => ResolvedRowData[]
): TableDataGetter<ResolvedRowData> => {
  const referencesKeys = Object.keys(references);

  const paramsSubject = new BehaviorSubject<TableDataParamsWithRequestId | null>(
    null
  );
  const requestId$ = paramsSubject.pipe(
    filter((params) => !!params),
    map((params) => params!.requestId),
    distinctUntilChanged()
  );

  const references$ = requestId$.pipe(
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
    ),
    shareReplay(1)
  );

  return (params) => {
    paramsSubject.next(params);

    return combineLatest(getMainEntityData(params), references$).pipe(
      map(([tableData, referencesData]) => {
        if (!tableData.rows || !Array.isArray(tableData.rows)) {
          return { ...tableData, rows: undefined };
        }

        return {
          ...tableData,
          rows: resolveReferences(tableData.rows, referencesData),
        };
      })
    );
  };
};
