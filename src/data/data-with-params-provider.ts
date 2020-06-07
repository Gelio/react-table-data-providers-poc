import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { v4 as uuid } from 'uuid';

import { TableDataGetter, TableDataParams, DataFetchingState } from './types';
import { getUpdatableStream } from '../utils/updatable-stream';

const initialTableDataParams: TableDataParams = {
  page: 1,
  pageSize: 15,
  requestId: '',
  searchPhrase: '',
};

export interface TableDataParamsOperations {
  setPageSize(pageSize: number): void;
  setPage(page: number): void;
  setSearchPhrase(searchPhrase: string): void;
  refresh(): void;
}

export type TableDataWithParams<Data, Error> = TableDataParams &
  DataFetchingState<Data, Error>;

// TODO: add running side effects based on the response
// E.g. set `page` = `maxPage - 1` when there are no entities on the last page

export class TableDataWithParamsProvider<Data, Error>
  implements TableDataParamsOperations {
  public tableDataWithParams$: Observable<TableDataWithParams<Data, Error>>;
  private dataParams = getUpdatableStream(initialTableDataParams);

  public constructor(getData: TableDataGetter<Data, Error>) {
    const dataParams$ = this.dataParams.stream$;
    const data$ = getData(dataParams$);

    this.tableDataWithParams$ = combineLatest([data$, dataParams$]).pipe(
      map(
        ([data, dataParams]): TableDataWithParams<Data, Error> => ({
          ...data,
          ...dataParams,
        })
      )
    );
  }

  public setPageSize(pageSize: number) {
    this.dataParams.update({ pageSize });
  }

  public setPage(page: number) {
    this.dataParams.update({ page });
  }

  public setSearchPhrase(searchPhrase: string) {
    this.dataParams.update({ searchPhrase });
  }

  public refresh() {
    this.dataParams.update({ requestId: uuid() });
  }
}
