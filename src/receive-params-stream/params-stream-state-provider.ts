import { Observable, Subject, combineLatest, BehaviorSubject } from 'rxjs';
import { v4 as uuid } from 'uuid';

import {
  TableDataParamsWithRequestId,
  TableData$,
  FunctionalTableDataProviderFactory,
  TableDataGetter,
} from '../data/types';
import {
  map,
  distinctUntilChanged,
  switchMapTo,
  startWith,
  pluck,
  switchMap,
} from 'rxjs/operators';

/**
 * NOTE: a simpler pattern as consumers do not have to redeclare `paramsSubject` each time
 */
export type TableDataGetter$<RowData> = (
  params$: Observable<TableDataParamsWithRequestId>
) => TableData$<RowData>;

export const functionalParamsTableDataProviderFactory = <RowData>(
  getData: TableDataGetter$<RowData>
): FunctionalTableDataProviderFactory<RowData> => {
  const requestIdSubject = new Subject<string>();
  const refresh = () => requestIdSubject.next(uuid());

  return (params$) => {
    const tableDataParams$ = combineLatest(params$, requestIdSubject).pipe(
      map(([params, requestId]) => ({ ...params, requestId }))
    );

    return {
      tableData$: getData(tableDataParams$),
      refresh,
    };
  };
};

/**
 * Allows using simpler `getData` handlers in the new API that provides the observable
 */
export const liftPreviousGetDataHandler = <RowData>(
  getData: TableDataGetter<RowData>
): TableDataGetter$<RowData> => (params$) => params$.pipe(switchMap(getData));

/**
 * Resolves additional references
 *
 * When refreshing, all references refresh too
 *
 * TODO: consider fetching references based on the main entity data
 */
export const getRefResolvingDataFactoryWithStreams = <RowData, ResolvedRowData>(
  getMainEntityData: TableDataGetter$<RowData>,
  // TODO: add types for references
  references: Record<string, Observable<unknown>>,
  resolveReferences: (
    mainEntityData: RowData[],
    referencesData: Record<string, unknown | null>
  ) => ResolvedRowData[]
): TableDataGetter$<ResolvedRowData> => (params$) => {
  const referencesKeys = Object.keys(references);

  const requestId$ = params$.pipe(pluck('requestId'), distinctUntilChanged());

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
    )
  );

  return combineLatest(getMainEntityData(params$), references$).pipe(
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
