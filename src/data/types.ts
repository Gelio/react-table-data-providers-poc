import { Observable } from 'rxjs';

export interface TableData<RowData> {
  loading: boolean;
  error?: any;
  // NOTE: it's probalbly better to allow consumers to use any kind of data, not an array.
  rows?: RowData[];
}

export type TableData$<RowData> = Observable<TableData<RowData>>;

export interface TableDataParams {
  pageSize: number;
  page: number;
  searchPhrase: string;

  // NOTE: used to trigger refetches. If requestId changed, force sending the request
  // Used in clientside pagination
  requestId: string;
}

export interface TableDataProvider<RowData> {
  setPageSize(pageSize: number): void;
  setPage(page: number): void;
  setSearchPhrase(searchPhrase: string): void;
  refresh(): void;

  tableData$: TableData$<RowData>;
}

export type TableDataGetter<RowData> = (
  params: TableDataParams
) => TableData$<RowData>;
