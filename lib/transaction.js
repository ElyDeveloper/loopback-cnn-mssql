// Copyright IBM Corp. 2015,2019. All Rights Reserved.
// Node module: loopback-connector-mssql
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';
const debug = require('debug')('loopback:connector:mssql:transaction');

module.exports = mixinTransaction;

/*!
 * @param {MsSQL} MsSQL connector class
 * @param {Object} mssql mssql driver
 */
function mixinTransaction(MsSQL, mssql) {
  /**
   * Begin a new transaction
   * @param {String} isolationLevel
   * @param {Function} cb
   */
  MsSQL.prototype.beginTransaction = function (isolationLevel, cb) {
    debug('Begin a transaction with isolation level: %s', isolationLevel);
    const isoLevel =
      mssql.ISOLATION_LEVEL[isolationLevel.replace(' ', '_')];
    const transaction = new mssql.Transaction(this.client);
    
    transaction.begin(isoLevel).then(() => {
        cb(null, transaction);
    }).catch(err => {
        cb(err);
    });
  };

  /**
   * Commit a transaction
   * @param {Object} connection
   * @param {Function} cb
   */
  MsSQL.prototype.commit = function (connection, cb) {
    debug('Commit a transaction');
    connection.commit().then(() => {
        cb(null);
    }).catch(err => {
        cb(err);
    });
  };

  /**
   * Rollback a transaction
   * @param {Object} connection
   * @param {Function} cb
   */
  MsSQL.prototype.rollback = function (connection, cb) {
    debug('Rollback a transaction');
    connection.rollback().then(() => {
        cb(null);
    }).catch(err => {
        cb(err);
    });
  };
}
