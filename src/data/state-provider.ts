import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

import {
  TableDataParamsOperations,
  TableDataWithParamsProvider,
  TableDataWithParams,
} from './data-with-params-provider';
import {
  TableUIOnlyStateOperations,
  TableUIOnlyStateProvider,
  TableUIOnlyState,
} from './table-ui-only-state-provider';
import { TableDataGetter } from './types';

export type TableState<Data, Error> = TableDataWithParams<Data, Error> &
  TableUIOnlyState;

export class TableStateProvider<Data, Error>
  implements TableDataParamsOperations, TableUIOnlyStateOperations {
  public tableState$: Observable<TableState<Data, Error>>;

  public constructor(
    private dataWithParamsProvider: TableDataWithParamsProvider<Data, Error>,
    private uiOnlyStateProvider: TableUIOnlyStateProvider
  ) {
    this.tableState$ = combineLatest([
      this.dataWithParamsProvider.tableDataWithParams$,
      this.uiOnlyStateProvider.tableUIOnlyState$,
    ]).pipe(
      map(
        ([dataWithParams, uiOnlyState]): TableState<Data, Error> => ({
          ...dataWithParams,
          ...uiOnlyState,
        })
      )
    );
  }
  setPageSize(pageSize: number) {
    this.dataWithParamsProvider.setPageSize(pageSize);
  }

  setPage(page: number) {
    this.dataWithParamsProvider.setPage(page);
  }

  setSearchPhrase(searchPhrase: string) {
    this.dataWithParamsProvider.setSearchPhrase(searchPhrase);
  }

  refresh() {
    this.dataWithParamsProvider.refresh();
  }

  toggleExpandedRow(rowUuid: string) {
    this.uiOnlyStateProvider.toggleExpandedRow(rowUuid);
  }

  toggleRowSelection(rowUuid: string) {
    this.uiOnlyStateProvider.toggleRowSelection(rowUuid);
  }
}

export const createTableStateProvider = <Data, Error>(
  getData: TableDataGetter<Data, Error>
) => {
  const dataWithParamsProvider = new TableDataWithParamsProvider(getData);
  const uiOnlyStateProvider = new TableUIOnlyStateProvider();

  return new TableStateProvider(dataWithParamsProvider, uiOnlyStateProvider);
};
