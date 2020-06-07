import { Subject, Observable, combineLatest } from 'rxjs';
import { scan, map } from 'rxjs/operators';
import { v4 as uuid } from 'uuid';

import { TableDataGetter, TableDataParams, DataFetchingState } from './types';

const initialTableDataParams: TableDataParams = {
  page: 1,
  pageSize: 15,
  requestId: '',
  searchPhrase: '',
};

interface Entity {
  id: number;
}

interface TableData {
  rows: Entity[];
  totalCount: number;
}

interface TableUIOnlyState {
  expandedRowsKeys: Set<string>;
  selectedRowsKeys: Set<string>;
}

const initialTableUIOnlyState: TableUIOnlyState = {
  selectedRowsKeys: new Set(),
  expandedRowsKeys: new Set(),
};

type TableState<Data, Error> = TableDataParams &
  DataFetchingState<Data, Error> &
  TableUIOnlyState;

interface UpdatableStream<T> {
  stream$: Observable<T>;
  // TODO: updater function instead of patch
  update(patch: Partial<T>): void;
}
const getUpdatableStream = <T>(initialValue: T): UpdatableStream<T> => {
  const updatesSubject = new Subject<Partial<T>>();
  const stream$ = updatesSubject.pipe(
    scan((data, updates) => ({ ...data, ...updates }), initialValue)
  );

  return {
    stream$,
    update: (patch) => updatesSubject.next(patch),
  };
};

export class TableStateProvider<Data extends TableData, Error> {
  public tableState$: Observable<TableState<Data, Error>>;
  private dataParams = getUpdatableStream(initialTableDataParams);
  private tableUIOnlyState = getUpdatableStream(initialTableUIOnlyState);

  public constructor(getData: TableDataGetter<Data, Error>) {
    const dataParams$ = this.dataParams.stream$;
    const data$ = getData(dataParams$);

    this.tableState$ = combineLatest([
      data$,
      dataParams$,
      this.tableUIOnlyState.stream$,
    ]).pipe(
      map(
        ([data, dataParams, tableUIOnlyState]): TableState<Data, Error> => ({
          ...data,
          ...dataParams,
          ...tableUIOnlyState,
        })
      )
    );
  }

  public setPageSize(pageSize: number) {
    this.dataParams.update({ pageSize });
  }

  setPage(page: number) {
    this.dataParams.update({ page });
  }

  setSearchPhrase(searchPhrase: string) {
    this.dataParams.update({ searchPhrase });
  }

  refresh() {
    this.dataParams.update({ requestId: uuid() });
  }
}
