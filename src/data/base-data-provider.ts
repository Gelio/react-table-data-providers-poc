import { Subject, combineLatest, BehaviorSubject } from 'rxjs';
import { distinctUntilChanged, switchMap, map } from 'rxjs/operators';
import { v4 as uuid } from 'uuid';

import {
  TableDataProvider,
  TableData$,
  TableDataParams,
  TableDataGetter,
} from './types';

export class BaseDataProvider<RowData> implements TableDataProvider<RowData> {
  public tableData$: TableData$<RowData>;

  private pageSizeSubject = new BehaviorSubject<number>(15);
  private pageSubject = new BehaviorSubject<number>(1);
  private searchPhraseSubject = new BehaviorSubject<string>('');

  private requestIdSubject = new Subject<string>();
  private tableDataParams$ = combineLatest(
    this.pageSizeSubject.pipe(distinctUntilChanged()),
    this.pageSubject.pipe(distinctUntilChanged()),
    this.searchPhraseSubject.pipe(distinctUntilChanged()),
    this.requestIdSubject
  ).pipe(
    map(
      ([pageSize, page, searchPhrase, requestId]): TableDataParams => ({
        pageSize,
        page,
        searchPhrase,
        requestId,
      })
    )
  );

  public constructor(private getData: TableDataGetter<RowData>) {
    this.tableData$ = this.tableDataParams$.pipe(
      map(this.getData),
      // NOTE: prevents unsubscribing from the previous observable and subscribing to the next one when the same
      // Observable instance was returned.
      // This should prevent canceling requests in clientside pagination, when there is only 1 request needed,
      // no matter what the parameters are.
      distinctUntilChanged(),
      switchMap((getData$) => getData$)
    );
  }

  public setPageSize(pageSize: number) {
    this.pageSizeSubject.next(pageSize);
  }

  public setPage(page: number) {
    this.pageSubject.next(page);
  }

  public setSearchPhrase(searchPhrase: string) {
    this.searchPhraseSubject.next(searchPhrase);
  }

  public refresh() {
    const nextRequestId = uuid();
    this.requestIdSubject.next(nextRequestId);
  }
}
