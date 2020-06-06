import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

import {
  TableData,
  FunctionalTableDataProviderFactory,
  TableDataParams,
} from '../data/types';

interface TableUIOnlyState {
  expandedRowsTypes: Map<string, string>;
  selectedRowsKeys: Set<string>;
  searchInExpandedRows: boolean;
}

interface TableStateWithData<RowType>
  extends TableUIOnlyState,
    TableDataParams {
  data: TableData<RowType>;
}

type TableStateWithData$<RowType> = Observable<TableStateWithData<RowType>>;

export class FunctionalTableStateProvider<RowType> {
  private dataParamsSubject = new BehaviorSubject<TableDataParams>({
    page: 1,
    pageSize: 15,
    searchPhrase: '',
  });
  private tableUIOnlyStateSubject = new BehaviorSubject<TableUIOnlyState>({
    expandedRowsTypes: new Map(),
    selectedRowsKeys: new Set(),
    searchInExpandedRows: false,
  });
  public tableStateWithData$: TableStateWithData$<RowType>;
  public refresh: () => void;

  public constructor(
    dataProviderFactory: FunctionalTableDataProviderFactory<RowType>
  ) {
    const functionalTableDataProvider = dataProviderFactory(
      this.dataParamsSubject
    );

    this.tableStateWithData$ = combineLatest(
      functionalTableDataProvider.tableData$,
      this.dataParamsSubject,
      this.tableUIOnlyStateSubject
    ).pipe(
      map(
        ([tableData, dataParams, uiOnlyState]): TableStateWithData<
          RowType
        > => ({
          data: tableData,
          ...dataParams,
          ...uiOnlyState,
        })
      )
    );

    this.refresh = functionalTableDataProvider.refresh;
  }

  public setSearchPhrase(searchPhrase: string) {
    this.dataParamsSubject.next({
      ...this.dataParamsSubject.value,
      searchPhrase,
    });
  }

  public setPage(page: number) {
    this.dataParamsSubject.next({
      ...this.dataParamsSubject.value,
      page,
    });
  }
}
