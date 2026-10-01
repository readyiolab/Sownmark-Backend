const mysql = require("mysql");
const { dbHost, dbName, dbPass, dbUser } = require("../config/dotenvconfg");

class Database {
  constructor() {
    this.host = dbHost;
    this.username = dbUser;
    this.password = dbPass;
    this.database = dbName;

    // Use a high-performance connection pool instead of a single fragile connection
    this.pool = mysql.createPool({
      connectionLimit: 15,
      host: this.host,
      user: this.username,
      password: this.password,
      database: this.database,
      charset: 'utf8mb4',
      acquireTimeout: 10000,
      connectTimeout: 10000,
      waitForConnections: true,
      queueLimit: 0,
    });

    // Test initial connectivity
    this.pool.getConnection((err, connection) => {
      if (err) {
        console.error("Database Pool Connectivity Error:", err.message);
        return;
      }
      if (connection) {
        connection.release();
        console.log("Database connection pool established successfully!");
      }
    });

    // Handle pool errors gracefully without crashing
    this.pool.on('error', (err) => {
      console.error('Unexpected database pool error:', err.message);
    });
  }

  select(tbl_name, column = "*", where = "", params = [], print = false) {
    let wr = "";
    if (where !== "") {
      wr = `WHERE ${where}`;
    }
    const sql = `SELECT ${column} FROM ${tbl_name} ${wr}`;
    if (print) {
      console.log(sql, params);
    }
    return new Promise((resolve, reject) => {
      this.pool.query(sql, params, (err, results) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(results ? results[0] : undefined);
      });
    });
  }

  selectAll(
    tbl_name,
    column = "*",
    where = "",
    params = [],
    orderby = "",
    print = false
  ) {
    let wr = "";
    if (where !== "") {
      wr = `WHERE ${where}`;
    }
    const sql = `SELECT ${column} FROM ${tbl_name} ${wr} ${orderby}`;
    if (print) {
      console.log(sql, params);
    }
    return new Promise((resolve, reject) => {
      this.pool.query(sql, params, (err, results) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(results || []);
      });
    });
  }

  insert(tbl_name, data, print = false) {
    const sql = `INSERT INTO ${tbl_name} SET ?`;
    if (print) {
      console.log(sql, data);
    }
    return new Promise((resolve, reject) => {
      this.pool.query(sql, data, (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        resolve({
          status: true,
          insert_id: result.insertId,
          affected_rows: result.affectedRows,
          info: result.info,
        });
      });
    });
  }

  update(table_name, form_data, where = "", params = [], print = false) {
    let whereSQL = "";
    if (where !== "") {
      whereSQL = ` WHERE ${where}`;
    }
    const sql = `UPDATE ${table_name} SET ? ${whereSQL}`;
    if (print) {
      console.log(sql, [form_data, ...params]);
    }
    return new Promise((resolve, reject) => {
      this.pool.query(sql, [form_data, ...params], (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        resolve({
          status: true,
          affected_rows: result.affectedRows,
          info: result.info,
        });
      });
    });
  }

  delete(tbl_name, where = "", params = [], print = false) {
    let whereSQL = "";
    if (where !== "") {
      whereSQL = ` WHERE ${where}`;
    }
    const sql = `DELETE FROM ${tbl_name} ${whereSQL}`;
    if (print) {
      console.log(sql, params);
    }
    return new Promise((resolve, reject) => {
      this.pool.query(sql, params, (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        resolve({
          status: true,
          affectedRows: result.affectedRows,
          info: result.info,
        });
      });
    });
  }

  query(sql, params = [], print = false) {
    if (print) {
      console.log(sql, params);
    }
    return new Promise((resolve, reject) => {
      this.pool.query(sql, params, (err, results) => {
        if (err) {
          reject(err);
          return;
        }
        resolve({
          status: true,
          affectedRows: results ? results.affectedRows : 0,
          info: results ? results.info : ''
        });
      });
    });
  }

  queryAll(sql, params = [], print = false) {
    if (print) {
      console.log(sql, params);
    }
    return new Promise((resolve, reject) => {
      this.pool.query(sql, params, (err, results) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(results || []);
      });
    });
  }

  insertAll(sql, params = [], print = false) {
    if (print) {
      console.log(sql, params);
    }
    return new Promise((resolve, reject) => {
      this.pool.query(sql, params, (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        resolve({
          status: true,
          insert_id: result.insertId,
          affected_rows: result.affectedRows,
          info: result.info,
        });
      });
    });
  }
}

const db = new Database();

module.exports = db;