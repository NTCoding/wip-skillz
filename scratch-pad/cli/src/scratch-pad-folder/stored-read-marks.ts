import { type DatabaseSync } from 'node:sqlite'
import { type ReadMarks, type SectionHash } from '../read-marks/read-marks'
import { readSavedValues } from './saved-values'

export class StoredReadMarks {
  constructor(
    private readonly db: DatabaseSync,
    private readonly padName: string,
  ) {}

  read(): ReadMarks {
    return {
      pages: readSavedValues(
        this.db,
        this.padName,
        'read_pages',
        'SELECT page FROM read_pages ORDER BY page',
      ).map((row) => row.text('page')),
      sections: readSavedValues(
        this.db,
        this.padName,
        'read_sections',
        'SELECT page, section, hash FROM read_sections ORDER BY page, section',
      ).map((row) => ({
        page: row.text('page'),
        section: row.text('section'),
        hash: row.text('hash'),
      })),
    }
  }

  markPageRead(page: string, sections: readonly SectionHash[]): void {
    this.markPageUnread(page)
    this.db.prepare('INSERT INTO read_pages (page) VALUES (?)').run(page)
    sections.forEach((section) => this.markSectionRead(page, section))
  }

  markPageUnread(page: string): void {
    this.db.prepare('DELETE FROM read_sections WHERE page = ?').run(page)
    this.db.prepare('DELETE FROM read_pages WHERE page = ?').run(page)
  }

  markSectionRead(page: string, section: SectionHash): void {
    this.db
      .prepare('INSERT OR REPLACE INTO read_sections (page, section, hash) VALUES (?, ?, ?)')
      .run(page, section.id, section.hash)
  }
}
