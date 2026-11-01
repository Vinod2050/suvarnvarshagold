// Builds a simple model for one table: list (search, filters, pagination), get, create, update, remove.
// Table and column names come only from the code below, never from user input; values always use placeholders.
const db = require('../config/db');

function makeModel({ table, columns, searchColumns = [], filterColumns = [], orderBy = 'id DESC', hasCreatedBy = true, hasUpdatedBy = true }) {
  const writable = new Set(columns);

  function pick(data) {
    const out = {};
    for (const [k, v] of Object.entries(data)) if (writable.has(k)) out[k] = v;
    return out;
  }

  function where({ q, filters = {} }) {
    const parts = [];
    const params = [];
    for (const col of filterColumns) {
      const value = filters[col];
      if (value !== undefined && value !== null && value !== '') {
        parts.push(`${col} = ?`);
        params.push(value);
      }
    }
    if (q && searchColumns.length) {
      parts.push(`(${searchColumns.map((c) => `${c} LIKE ?`).join(' OR ')})`);
      const like = `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
      for (let i = 0; i < searchColumns.length; i += 1) params.push(like);
    }
    return { sql: parts.length ? `WHERE ${parts.join(' AND ')}` : '', params };
  }

  return {
    table,

    async list({ page = 1, pageSize = 20, q = '', filters = {} } = {}) {
      const w = where({ q, filters });
      const totalRow = await db.one(`SELECT COUNT(*) AS n FROM ${table} ${w.sql}`, w.params);
      // page and pageSize are already validated integers (see listOptions)
      const limit = Number(pageSize);
      const offset = (Number(page) - 1) * limit;
      const items = await db.query(`SELECT * FROM ${table} ${w.sql} ORDER BY ${orderBy} LIMIT ${limit} OFFSET ${offset}`, w.params);
      return { items, total: totalRow.n, page: Number(page), pageSize: limit, pages: Math.max(1, Math.ceil(totalRow.n / limit)) };
    },

    async all({ filters = {} } = {}) {
      const w = where({ filters });
      return db.query(`SELECT * FROM ${table} ${w.sql} ORDER BY ${orderBy}`, w.params);
    },

    get(id) {
      return db.one(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    },

    async create(data, adminId = null) {
      const row = pick(data);
      if (hasCreatedBy) row.created_by = adminId;
      if (hasUpdatedBy) row.updated_by = adminId;
      const cols = Object.keys(row);
      const result = await db.query(
        `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
        cols.map((c) => row[c]),
      );
      return this.get(result.insertId);
    },

    async update(id, data, adminId = null) {
      const row = pick(data);
      if (hasUpdatedBy) row.updated_by = adminId;
      const cols = Object.keys(row);
      if (!cols.length) return this.get(id);
      const result = await db.query(
        `UPDATE ${table} SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`,
        [...cols.map((c) => row[c]), id],
      );
      return result.affectedRows ? this.get(id) : null;
    },

    async remove(id) {
      const result = await db.query(`DELETE FROM ${table} WHERE id = ?`, [id]);
      return result.affectedRows > 0;
    },

    count(filters = {}) {
      const w = where({ filters });
      return db.one(`SELECT COUNT(*) AS n FROM ${table} ${w.sql}`, w.params).then((r) => r.n);
    },
  };
}

module.exports = { makeModel };
