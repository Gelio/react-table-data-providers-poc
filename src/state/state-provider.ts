import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

import { TableData, TableDataProvider } from '../data/types';

interface TableState {
  searchPhrase: string;
  currentPage: number;
  pageSize: number;

  expandedRowsTypes: Map<string, string>;
  selectedRowsKeys: Set<string>;
  searchInExpandedRows: boolean;
}

interface TableStateWithData<RowType> extends TableState {
  data: TableData<RowType>;
}

type TableStateWithData$<RowType> = Observable<TableStateWithData<RowType>>;

const getInitialTableState = (): TableState => ({
  currentPage: 1,
  pageSize: 15,
  searchPhrase: '',
  expandedRowsTypes: new Map(),
  selectedRowsKeys: new Set(),
  searchInExpandedRows: false,
});

export class TableStateProvider<RowType> {
  private tableStateSubject = new BehaviorSubject<TableState>(
    getInitialTableState()
  );
  public tableStateWithData$: TableStateWithData$<RowType>;

  public constructor(private dataProvider: TableDataProvider<RowType>) {
    this.tableStateWithData$ = combineLatest(
      this.tableStateSubject,
      this.dataProvider.tableData$
    ).pipe(
      map(
        ([tableState, data]): TableStateWithData<RowType> => ({
          ...tableState,
          data,
        })
      )
    );
  }

  public setSearchPhrase(searchPhrase: string) {
    this.tableStateSubject.next({
      ...this.tableStateSubject.value,
      searchPhrase,
    });
    this.dataProvider.setSearchPhrase(searchPhrase);
  }

  public setPage(page: number) {
    this.tableStateSubject.next({
      ...this.tableStateSubject.value,
      currentPage: page,
    });
    this.dataProvider.setPage(page);
  }

  public refresh() {
    this.dataProvider.refresh();
  }
}
