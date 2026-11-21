import { padSchema, type PadSchema } from './pad-schema'

export const secondVersionPadSchema: PadSchema = {
  ...padSchema,
  version: 2,
  migrations: [{ version: 2, sql: 'ALTER TABLE threads ADD COLUMN reviewer TEXT;' }],
}
