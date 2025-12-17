// Copyright IBM Corp. 2013,2019. All Rights Reserved.
// Node module: loopback-connector-mssql
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

const g = require('strong-globalize')();
const mssql = require('mssql');
const { SqlConnector, ParameterizedSQL } = require('loopback-connector');
const debug = require('debug')('loopback:connector:mssql');

const name = 'mssql';

class MsSQL extends SqlConnector {
  constructor(settings) {
    super(name, settings);
    this.settings = settings || {};
    this.settings.server = this.settings.host || this.settings.hostname;
    this.settings.user = this.settings.user || this.settings.username;
    // use url to override settings if url provided
    this.connConfig = this.settings.url || this.settings;
    this._models = {};
    this._idxNames = {};
  }

  static newline = '\r\n';

  connect(callback) {
    const self = this;
    if (self.client) {
      return process.nextTick(callback);
    }
    const connection = new mssql.ConnectionPool(this.connConfig);
    
    connection.connect().then(pool => {
      debug('Connection established: ', self.settings.server);
      self.client = pool;
      callback(null, pool);
    }).catch(err => {
      debug('Connection error: ', err);
      callback(err);
    });
  }

  executeSQL(sql, params, options, callback) {
    debug('SQL: %s Parameters: %j', sql, params);

    // Convert (?) to @paramX
    sql = parameterizedSQL(sql);

    let connection = this.client;

    const transaction = options.transaction;
    if (transaction && transaction.connector === this && transaction.connection) {
      debug('Execute SQL in a transaction');
      connection = transaction.connection;
    }

    const innerCB = function (err, data) {
      debug('Result: %j %j', err, data);
      if (data) {
        data = data.recordset;
      }
      callback && callback(err, data);
    };

    // Check if connection is a pool or a transaction/request
    // If it's a transaction, we need to create a request from it?
    // Usually transaction object has .request() method in mssql driver
    
    let request;
    if (connection instanceof mssql.Transaction) {
       request = new mssql.Request(connection);
    } else {
       // connection is pool
       request = new mssql.Request(connection);
    }

    // Allow multiple result sets
    if (options.multipleResultSets) {
      request.multiple = true;
    }

    if (Array.isArray(params) && params.length > 0) {
      for (let i = 0, n = params.length; i < n; i++) {
        const paramName = 'param' + (i + 1);
        const paramValue = params[i];
        
        if (typeof paramValue === 'number' && paramValue % 1 !== 0) {
          // Float number
          request.input(paramName, mssql.Real, paramValue);
        } else if (typeof paramValue === 'number' && isBigInt(paramValue)) {
          request.input(paramName, mssql.BigInt, paramValue);
        } else {
          request.input(paramName, paramValue);
        }
      }
    }

    // request.verbose = true;
    request.query(sql).then(result => {
       innerCB(null, result);
    }).catch(err => {
       innerCB(err);
    });
  }

  disconnect(cb) {
    if (this.client) {
        this.client.close().then(() => {
            if (cb) cb();
        }).catch(err => {
            if (cb) cb(err);
        });
    } else {
        if (cb) process.nextTick(cb);
    }
  }

  define(modelDefinition) {
    if (!modelDefinition.settings) {
      modelDefinition.settings = {};
    }

    this._models[modelDefinition.model.modelName] = modelDefinition;

    // track database index names for this model
    this._idxNames[modelDefinition.model.modelName] = [];
  }

  getPlaceholderForValue(key) {
    return '@param' + key;
  }

  buildInsertDefaultValues(model, data, options) {
    return 'DEFAULT VALUES';
  }

  buildInsertInto(model, fields, options) {
    const stmt = super.buildInsertInto(model, fields, options);
    const idName = this.idName(model);

    stmt.sql = idName
      ? MsSQL.newline +
        'DECLARE @insertedIds TABLE (id ' +
        this.columnDataType(model, idName) +
        ')' +
        MsSQL.newline +
        stmt.sql
      : stmt.sql;

    if (idName) {
      stmt.merge(
        'OUTPUT INSERTED.' +
          this.columnEscaped(model, idName) +
          ' into @insertedIds'
      );
    }
    return stmt;
  }

  buildInsert(model, data, options) {
    const idName = this.idName(model);
    const prop = this.getPropertyDefinition(model, idName);
    const isIdentity = prop && prop.type === Number && prop.generated !== false;
    if (isIdentity && data[idName] == null) {
      // remove the pkid column if it's in the data, since we're going to insert a
      // new record, not update an existing one.
      delete data[idName];
    }

    const stmt = super.buildInsert(model, data, options);
    const tblName = this.tableEscaped(model);

    if (isIdentity && data[idName] != null) {
      stmt.sql =
        'SET IDENTITY_INSERT ' + tblName + ' ON;' + MsSQL.newline + stmt.sql;
    }
    if (isIdentity && data[idName] != null) {
      stmt.sql +=
        MsSQL.newline +
        'SET IDENTITY_INSERT ' +
        tblName +
        ' OFF;' +
        MsSQL.newline;
    }
    if (idName) {
      stmt.sql +=
        MsSQL.newline + 'SELECT id AS insertId from @insertedIds' + MsSQL.newline;
    }

    return stmt;
  }

  getInsertedId(model, info) {
    return info && info.length > 0 && info[0].insertId;
  }

  buildDelete(model, where, options) {
    const stmt = super.buildDelete(model, where, options);
    stmt.merge(';SELECT @@ROWCOUNT as count', '');
    return stmt;
  }

  buildReplace(model, where, data, options) {
    const stmt = super.buildReplace(model, where, data, options);
    stmt.merge(';SELECT @@ROWCOUNT as count', '');
    return stmt;
  }

  getCountForAffectedRows(model, info) {
    const affectedCountQueryResult = info && info[0];
    if (!affectedCountQueryResult) {
      return undefined;
    }
    const affectedCount =
      typeof affectedCountQueryResult.count === 'number'
        ? affectedCountQueryResult.count
        : undefined;
    return affectedCount;
  }

  buildUpdate(model, where, data, options) {
    const stmt = super.buildUpdate(model, where, data, options);
    stmt.merge(';SELECT @@ROWCOUNT as count', '');
    return stmt;
  }

  toColumnValue(prop, val) {
    if (val == null) {
      return null;
    }
    if (prop.type === String) {
      return String(val);
    }
    if (prop.type === Number) {
      if (isNaN(val)) {
        // Map NaN to NULL
        return val;
      }
      return val;
    }

    if (prop.type === Date || prop.type.name === 'Timestamp') {
      if (!val.toUTCString) {
        val = new Date(val);
      }
      val = dateToMsSql(val);
      return val;
    }

    if (prop.type === Boolean) {
      return !!val;
    }

    return this.serializeObject(val);
  }

  fromColumnValue(prop, val) {
    if (val == null) {
      return val;
    }
    const type = prop && prop.type;
    if (type === Boolean) {
      val = !!val; // convert to a boolean type from number
    }
    if (type === Date) {
      if (!(val instanceof Date)) {
        val = new Date(val.toString());
      }
    }
    return val;
  }

  escapeName(name) {
    return '[' + name.replace(/\./g, '_') + ']';
  }

  getDefaultSchemaName() {
    return 'dbo';
  }

  tableEscaped(model) {
    return (
      this.escapeName(this.schema(model)) +
      '.' +
      this.escapeName(this.table(model))
    );
  }

  applySqlChanges(model, pendingChanges, cb) {
    const self = this;
    if (pendingChanges.length) {
      const alterTable =
        pendingChanges[0].substring(0, 10) !== 'DROP INDEX' &&
        pendingChanges[0].substring(0, 6) !== 'CREATE';
      let thisQuery = alterTable
        ? 'ALTER TABLE ' + self.tableEscaped(model)
        : '';
      let ranOnce = false;
      pendingChanges.forEach(function (change) {
        if (ranOnce) {
          thisQuery = thisQuery + ' ';
        }
        thisQuery = thisQuery + ' ' + change;
        ranOnce = true;
      });
      self.execute(thisQuery, cb);
    }
  }

  buildColumnNames(model, filter, options) {
    let columnNames = super.buildColumnNames(model, filter);
    if (filter.limit || filter.offset || filter.skip) {
      const orderBy = this.buildOrderBy(model, filter.order);
      let orderClause = '';
      let partitionByClause = '';
      if (options && options.partitionBy) {
        partitionByClause =
          'PARTITION BY ' + this.columnEscaped(model, options.partitionBy);
      }
      if (orderBy) {
        orderClause = 'OVER (' + partitionByClause + ' ' + orderBy + ') ';
      } else {
        orderClause =
          'OVER (' + partitionByClause + ' ' + 'ORDER BY (SELECT 1)) ';
      }
      columnNames += ',ROW_NUMBER() ' + orderClause + 'AS RowNum';
    }
    return columnNames;
  }

  buildSelect(model, filter, options) {
    if (!filter.order) {
      const idNames = this.idNames(model);
      if (idNames && idNames.length) {
        filter.order = idNames;
      }
    }

    let selectStmt = new ParameterizedSQL(
      'SELECT ' +
        this.buildColumnNames(model, filter, options) +
        ' FROM ' +
        this.tableEscaped(model)
    );

    if (filter) {
      if (filter.where) {
        const whereStmt = this.buildWhere(model, filter.where);
        selectStmt.merge(whereStmt);
      }

      if (filter.limit || filter.skip || filter.offset) {
        selectStmt = this.applyPagination(model, selectStmt, filter);
      } else {
        if (filter.order) {
          selectStmt.merge(this.buildOrderBy(model, filter.order));
        }
      }
    }
    return this.parameterize(selectStmt);
  }

  applyPagination(model, stmt, filter) {
    const offset = filter.offset || filter.skip || 0;
    if (this.settings.supportsOffsetFetch) {
      // SQL 2012 or later
      const limitClause = buildLimit(
        filter.limit,
        filter.offset || filter.skip
      );
      return stmt.merge(limitClause);
    } else {
      // SQL 2005/2008
      let paginatedSQL =
        'SELECT * FROM (' +
        stmt.sql +
        MsSQL.newline +
        ') AS S' +
        MsSQL.newline +
        ' WHERE S.RowNum > ' +
        offset;

      if (filter.limit !== -1) {
        paginatedSQL += ' AND S.RowNum <= ' + (offset + filter.limit);
      }

      stmt.sql = paginatedSQL + MsSQL.newline;
      return stmt;
    }
  }

  buildExpression(columnName, operator, operatorValue, propertyDefinition) {
    switch (operator) {
      case 'like':
        return new ParameterizedSQL(
          columnName + " LIKE ? ESCAPE '\\'",
          [operatorValue]
        );
      case 'nlike':
        return new ParameterizedSQL(
          columnName + " NOT LIKE ? ESCAPE '\\'",
          [operatorValue]
        );
      case 'regexp':
        g.warn(
          '{{Microsoft SQL Server}} does not support the regular ' +
            'expression operator'
        );
        // fall through
      default:
        // invoke the base implementation of `buildExpression`
        return super.buildExpression(
          columnName,
          operator,
          operatorValue,
          propertyDefinition
        );
    }
  }

  ping(cb) {
    this.execute('SELECT 1 AS result', cb);
  }
}

mssql.map.register(Number, mssql.BigInt);

exports.name = name;
exports.initialize = function initializeSchema(dataSource, callback) {
  const settings = dataSource.settings || {};
  debug('Settings: %j', settings);
  const driver = new MsSQL(settings);
  dataSource.connector = driver;
  dataSource.connector.dataSource = dataSource;
  dataSource.connector.tableNameID = dataSource.settings.tableNameID;

  if (settings.lazyConnect) {
    process.nextTick(function () {
      callback();
    });
  } else {
    driver.connect(function (err, connection) {
      dataSource.client = connection;
      callback && callback(err, connection);
    });
  }
};

exports.MsSQL = MsSQL;

// Helpers

function isBigInt(num) {
  if (num > 2147483647 && num <= 9223372036854775807) return true;
  if (num < -2147483648 && num >= -9223372036854775808) return true;
  return false;
}

function parameterizedSQL(sql) {
  let count = 0;
  let index = -1;
  while (true) {
    index = sql.indexOf('(?)');
    if (index === -1) {
      break;
    }
    count++;
    sql =
      sql.substring(0, index) +
      ('@param' + count) +
      sql.substring(index + 3);
  }
  return sql;
}

function dateToMsSql(val) {
  const dateStr =
    val.getUTCFullYear() +
    '-' +
    fillZeros(val.getUTCMonth() + 1) +
    '-' +
    fillZeros(val.getUTCDate()) +
    'T' +
    fillZeros(val.getUTCHours()) +
    ':' +
    fillZeros(val.getUTCMinutes()) +
    ':' +
    fillZeros(val.getUTCSeconds()) +
    '.';

  let ms = val.getUTCMilliseconds();
  if (ms < 10) {
    ms = '00' + ms;
  } else if (ms < 100) {
    ms = '0' + ms;
  } else {
    ms = '' + ms;
  }
  return dateStr + ms;

  function fillZeros(v) {
    return v < 10 ? '0' + v : v;
  }
}

function buildLimit(limit, offset) {
  if (isNaN(offset)) {
    offset = 0;
  }
  let sql = 'ORDER BY RowNum OFFSET ' + offset + ' ROWS';
  if (limit >= 0) {
    sql += ' FETCH NEXT ' + limit + ' ROWS ONLY';
  }
  return sql;
}

require('./discovery')(MsSQL, mssql);
require('./migration')(MsSQL, mssql);
require('./transaction')(MsSQL, mssql);
