import { getUpdatableStream } from '../utils/updatable-stream';

export interface TableUIOnlyState {
  expandedRowsKeys: Set<string>;
  selectedRowsKeys: Set<string>;
}

const initialTableUIOnlyState: TableUIOnlyState = {
  selectedRowsKeys: new Set(),
  expandedRowsKeys: new Set(),
};

export interface TableUIOnlyStateOperations {
  toggleExpandedRow(rowUuid: string): void;
  toggleRowSelection(rowUuid: string): void;
}

export class TableUIOnlyStateProvider implements TableUIOnlyStateOperations {
  private uiOnlyState = getUpdatableStream(initialTableUIOnlyState);
  public tableUIOnlyState$ = this.uiOnlyState.stream$;

  toggleExpandedRow(rowUuid: string) {
    // TODO:
    throw new Error('Method not implemented.');
  }
  toggleRowSelection(rowUuid: string) {
    // TODO:
    throw new Error('Method not implemented.');
  }
}
