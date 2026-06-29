declare module "bun:sqlite" {
  export class Database {
    constructor(
      filename: string,
      options?: {
        create?: boolean
        readonly?: boolean
      }
    )

    close(): void
    exec(sql: string): void
    query<Row = unknown, Params extends unknown[] = unknown[]>(
      sql: string
    ): Statement<Row, Params>
  }

  export type Statement<Row, Params extends unknown[]> = {
    all(...params: Params): Row[]
    get(...params: Params): Row | null
    run(...params: Params): { changes: number; lastInsertRowid: number | bigint }
  }
}
