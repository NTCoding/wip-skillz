import { type DatabaseSync } from 'node:sqlite'
import { readSavedValues } from './saved-values'

export class PadDbWatch {
  private version: number

  constructor(
    private readonly db: DatabaseSync,
    private readonly padName: string,
  ) {
    this.version = this.dataVersion()
  }

  hasChanged(): boolean {
    const version = this.dataVersion()
    const changed = version !== this.version
    this.version = version
    return changed
  }

  close(): void {
    this.db.close()
  }

  private dataVersion(): number {
    const versions = readSavedValues(
      this.db,
      this.padName,
      'pragma_data_version',
      'SELECT data_version FROM pragma_data_version()',
    ).map((saved) => saved.wholeNumber('data_version'))
    return Math.max(0, ...versions)
  }
}
