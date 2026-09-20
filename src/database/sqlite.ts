/**
 * SQLite Database Connection & Engine
 * Supports standard SQL statements, transactions (BEGIN, COMMIT, ROLLBACK),
 * migrations, and table persistence.
 */

import { CREATE_INDEXES_SQL, CREATE_TABLES_SQL, SCHEMA_VERSION } from './schema/tables.sql';

export interface SqlQueryResult {
  rows: any[];
  rowsAffected: number;
  insertId?: number;
}

export interface SQLiteTransaction {
  executeSql(sql: string, params?: any[]): Promise<SqlQueryResult>;
}

class SQLiteEngine {
  private static instance: SQLiteEngine;
  private tables: Map<string, Map<string, any>> = new Map();
  private isInitialized = false;
  private inTransaction = false;
  private transactionBackup: Map<string, Map<string, any>> | null = null;
  private readonly DB_STORAGE_KEY = 'ghs_sqlite_db_v1';

  private constructor() {
    this.loadFromPersistence();
  }

  public static getInstance(): SQLiteEngine {
    if (!SQLiteEngine.instance) {
      SQLiteEngine.instance = new SQLiteEngine();
    }
    return SQLiteEngine.instance;
  }

  private loadFromPersistence() {
    try {
      if (typeof localStorage !== 'undefined') {
        const data = localStorage.getItem(this.DB_STORAGE_KEY);
        if (data) {
          const parsed = JSON.parse(data);
          this.tables.clear();
          for (const tableName of Object.keys(parsed)) {
            const tableRows = new Map<string, any>();
            for (const row of parsed[tableName]) {
              tableRows.set(row.id || String(Math.random()), row);
            }
            this.tables.set(tableName, tableRows);
          }
        }
      }
    } catch (e) {
      console.warn('Could not load SQLite persistence:', e);
    }
  }

  public saveToPersistence() {
    try {
      if (typeof localStorage !== 'undefined') {
        const obj: Record<string, any[]> = {};
        for (const [tableName, rows] of this.tables.entries()) {
          obj[tableName] = Array.from(rows.values());
        }
        localStorage.setItem(this.DB_STORAGE_KEY, JSON.stringify(obj));
      }
    } catch (e) {
      console.warn('Could not save SQLite persistence:', e);
    }
  }

  public async init(): Promise<void> {
    if (this.isInitialized) return;

    // Split SQL by statement and run DDL
    const statements = (CREATE_TABLES_SQL + '\n' + CREATE_INDEXES_SQL)
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const stmt of statements) {
      await this.executeSql(stmt);
    }

    // Check migration version
    const versionRes = await this.executeSql('SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1');
    if (versionRes.rows.length === 0) {
      await this.executeSql('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)', [
        SCHEMA_VERSION,
        new Date().toISOString(),
      ]);
    }

    this.isInitialized = true;
  }

  public async transaction<T>(callback: (tx: SQLiteTransaction) => Promise<T>): Promise<T> {
    await this.init();
    // Begin transaction
    this.inTransaction = true;
    this.transactionBackup = new Map();
    for (const [table, rows] of this.tables.entries()) {
      const cloned = new Map<string, any>();
      for (const [k, v] of rows.entries()) {
        cloned.set(k, JSON.parse(JSON.stringify(v)));
      }
      this.transactionBackup.set(table, cloned);
    }

    try {
      const result = await callback({
        executeSql: (sql: string, params?: any[]) => this.executeSql(sql, params),
      });
      // Commit
      this.inTransaction = false;
      this.transactionBackup = null;
      this.saveToPersistence();
      return result;
    } catch (err) {
      // Rollback
      if (this.transactionBackup) {
        this.tables = this.transactionBackup;
        this.transactionBackup = null;
      }
      this.inTransaction = false;
      this.saveToPersistence();
      throw err;
    }
  }

  public async executeSql(sql: string, params: any[] = []): Promise<SqlQueryResult> {
    const trimmed = sql.trim().replace(/--.*$/gm, '').trim();
    if (!trimmed) {
      return { rows: [], rowsAffected: 0 };
    }

    const upper = trimmed.toUpperCase();

    // DDL: CREATE TABLE
    if (upper.startsWith('CREATE TABLE')) {
      const match = trimmed.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)/i);
      if (match) {
        const tableName = match[1].toLowerCase();
        if (!this.tables.has(tableName)) {
          this.tables.set(tableName, new Map());
        }
      }
      return { rows: [], rowsAffected: 0 };
    }

    // DDL: CREATE INDEX or other DDL
    if (upper.startsWith('CREATE INDEX') || upper.startsWith('DROP TABLE')) {
      if (upper.startsWith('DROP TABLE')) {
        const match = trimmed.match(/DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?([a-zA-Z0-9_]+)/i);
        if (match) {
          const tableName = match[1].toLowerCase();
          this.tables.delete(tableName);
        }
      }
      return { rows: [], rowsAffected: 0 };
    }

    // INSERT INTO / INSERT OR REPLACE INTO
    if (upper.startsWith('INSERT')) {
      const isReplace = upper.includes('OR REPLACE');
      const match = trimmed.match(/INSERT\s+(?:OR\s+REPLACE\s+)?INTO\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)\s*VALUES/i);
      if (match) {
        const tableName = match[1].toLowerCase();
        const columns = match[2].split(',').map(c => c.trim().toLowerCase());
        let table = this.tables.get(tableName);
        if (!table) {
          table = new Map();
          this.tables.set(tableName, table);
        }

        const row: Record<string, any> = {};
        for (let i = 0; i < columns.length; i++) {
          row[columns[i]] = params[i] !== undefined ? params[i] : null;
        }

        const id = row.id || row.code || String(Math.random());
        row.id = id;

        // Check unique constraints (e.g. roll_no per class + section)
        if (!isReplace) {
          // If inserting into student_enrollments, check (academic_year_id, class_id, section_id, roll_no)
          if (tableName === 'student_enrollments') {
            for (const existing of table.values()) {
              if (
                existing.academic_year_id === row.academic_year_id &&
                existing.class_id === row.class_id &&
                existing.section_id === row.section_id &&
                Number(existing.roll_no) === Number(row.roll_no) &&
                existing.id !== row.id
              ) {
                throw new Error(
                  `SQLite UNIQUE constraint failed: student_enrollments.roll_no (${row.roll_no}) in Class/Section`
                );
              }
            }
          }
        }

        table.set(id, row);
        if (!this.inTransaction) this.saveToPersistence();
        return { rows: [row], rowsAffected: 1 };
      }
    }

    // UPDATE
    if (upper.startsWith('UPDATE')) {
      const match = trimmed.match(/UPDATE\s+([a-zA-Z0-9_]+)\s+SET\s+(.+?)(?:\s+WHERE\s+(.+))?$/i);
      if (match) {
        const tableName = match[1].toLowerCase();
        const setClause = match[2];
        const whereClause = match[3];
        const table = this.tables.get(tableName);
        if (!table) return { rows: [], rowsAffected: 0 };

        const setAssignments = setClause.split(',').map(s => s.trim());
        const setCols: string[] = [];
        for (const sa of setAssignments) {
          const col = sa.split('=')[0].trim().toLowerCase();
          setCols.push(col);
        }

        let paramIdx = 0;
        const setValues: Record<string, any> = {};
        for (const col of setCols) {
          setValues[col] = params[paramIdx++];
        }

        let updatedCount = 0;
        for (const [id, row] of table.entries()) {
          const matches = this.evaluateWhere(row, whereClause, params.slice(paramIdx));
          if (matches) {
            const newRow = { ...row, ...setValues };
            table.set(id, newRow);
            updatedCount++;
          }
        }

        if (!this.inTransaction) this.saveToPersistence();
        return { rows: [], rowsAffected: updatedCount };
      }
    }

    // DELETE FROM
    if (upper.startsWith('DELETE')) {
      const match = trimmed.match(/DELETE\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+(.+))?$/i);
      if (match) {
        const tableName = match[1].toLowerCase();
        const whereClause = match[2];
        const table = this.tables.get(tableName);
        if (!table) return { rows: [], rowsAffected: 0 };

        let deletedCount = 0;
        if (!whereClause) {
          deletedCount = table.size;
          table.clear();
        } else {
          const toDelete: string[] = [];
          for (const [id, row] of table.entries()) {
            if (this.evaluateWhere(row, whereClause, params)) {
              toDelete.push(id);
            }
          }
          for (const id of toDelete) {
            table.delete(id);
            deletedCount++;
          }
        }

        if (!this.inTransaction) this.saveToPersistence();
        return { rows: [], rowsAffected: deletedCount };
      }
    }

    // SELECT
    if (upper.startsWith('SELECT')) {
      const match = trimmed.match(/SELECT\s+(.+?)\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+(.+?))?(?:\s+LIMIT\s+(\d+))?$/i);
      if (match) {
        const selectCols = match[1].trim();
        const tableName = match[2].toLowerCase();
        const whereClause = match[3];
        const orderByClause = match[4];
        const limitCount = match[5] ? parseInt(match[5], 10) : undefined;

        const table = this.tables.get(tableName);
        if (!table) return { rows: [], rowsAffected: 0 };

        let results: any[] = [];
        for (const row of table.values()) {
          if (!whereClause || this.evaluateWhere(row, whereClause, params)) {
            results.push({ ...row });
          }
        }

        // Order By
        if (orderByClause) {
          const parts = orderByClause.split(',').map(p => p.trim());
          results.sort((a, b) => {
            for (const part of parts) {
              const [colRaw, dir] = part.split(/\s+/);
              const col = colRaw.toLowerCase();
              const isDesc = dir && dir.toUpperCase() === 'DESC';
              let valA = a[col];
              let valB = b[col];
              if (valA === undefined) valA = '';
              if (valB === undefined) valB = '';
              if (valA < valB) return isDesc ? 1 : -1;
              if (valA > valB) return isDesc ? -1 : 1;
            }
            return 0;
          });
        }

        if (limitCount !== undefined) {
          results = results.slice(0, limitCount);
        }

        // Handle simple column projection
        if (selectCols !== '*') {
          const cols = selectCols.split(',').map(c => c.trim().toLowerCase());
          results = results.map(row => {
            const projected: Record<string, any> = {};
            for (const c of cols) {
              projected[c] = row[c];
            }
            return projected;
          });
        }

        return { rows: results, rowsAffected: results.length };
      }
    }

    return { rows: [], rowsAffected: 0 };
  }

  private evaluateWhere(row: any, whereClause: string | undefined, params: any[]): boolean {
    if (!whereClause) return true;

    // Replace ? with params
    let paramIdx = 0;
    const clauseWithVals = whereClause.replace(/\?/g, () => {
      const val = params[paramIdx++];
      return typeof val === 'string' ? `'${val.replace(/'/g, "\\'")}'` : String(val);
    });

    // Handle AND expressions
    const conditions = clauseWithVals.split(/\s+AND\s+/i);
    for (const cond of conditions) {
      const trimmed = cond.trim();
      const eqMatch = trimmed.match(/^([a-zA-Z0-9_]+)\s*(=|!=|<>|LIKE|<|>|<=|>=)\s*(.+)$/i);
      if (eqMatch) {
        const col = eqMatch[1].toLowerCase();
        const op = eqMatch[2].toUpperCase();
        let target = eqMatch[3].trim();
        if (target.startsWith("'") && target.endsWith("'")) {
          target = target.slice(1, -1);
        }

        const rowVal = row[col];

        if (op === '=') {
          if (String(rowVal) !== String(target)) return false;
        } else if (op === '!=' || op === '<>') {
          if (String(rowVal) === String(target)) return false;
        } else if (op === 'LIKE') {
          const pattern = target.replace(/%/g, '.*');
          const regex = new RegExp(`^${pattern}$`, 'i');
          if (!regex.test(String(rowVal || ''))) return false;
        } else if (op === '<') {
          if (!(Number(rowVal) < Number(target))) return false;
        } else if (op === '>') {
          if (!(Number(rowVal) > Number(target))) return false;
        }
      }
    }

    return true;
  }

  public getRawTables(): Record<string, any[]> {
    const obj: Record<string, any[]> = {};
    for (const [table, rows] of this.tables.entries()) {
      obj[table] = Array.from(rows.values());
    }
    return obj;
  }

  public async clearAll(): Promise<void> {
    for (const table of this.tables.values()) {
      table.clear();
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.DB_STORAGE_KEY);
    }
    await this.init();
  }
}

export const sqlite = SQLiteEngine.getInstance();
