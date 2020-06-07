import {
  Entity,
  FilterFunction,
  SortingFunction,
  TableDataWithCount,
  getClientsidePaginatedDataGetter,
} from './clientside-paginated-data-getter';
import { TableDataGetter } from './types';
import { Observable } from 'rxjs';
import {
  ReferencesResolver,
  getRefResolvingDataGetter,
} from './ref-resolving-data-getter';

// NOTE: just an idea. In the final implementation those functions would be implemented below, not
// reuse some other function with a different signature

export const composableClientsidePaginatedDataGetter = <RowData extends Entity>(
  filterData?: FilterFunction<RowData>,
  sortData?: SortingFunction<RowData>
) => <Error>(getData: TableDataGetter<TableDataWithCount<RowData>, Error>) =>
  getClientsidePaginatedDataGetter(getData, filterData, sortData);

export const composableRefResolvingDataGetter = <Data, ResolvedData>(
  references: Record<string, Observable<unknown>>,
  resolveReferences: ReferencesResolver<Data, ResolvedData>
) => <Error>(getMainEntityData: TableDataGetter<Data, Error>) =>
  getRefResolvingDataGetter(getMainEntityData, references, resolveReferences);
