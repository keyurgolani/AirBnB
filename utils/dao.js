var mysql = require("mysql");
var logger = require("../utils/logger");
var properties = require('properties-reader')('properties.properties');

// Transactions will be useful for Cart Checkout Query Execution: https://github.com/mysqljs/mysql#transactions

function getConnection() {
	var connection = mysql.createConnection({
		host : properties.get('mysql.host'),
		user : properties.get('mysql.user'),
		password : properties.get('mysql.password'),
		database : properties.get('mysql.db'),
		port : properties.get('mysql.port')
	}); // TODO: Load the database details and other parameters from properties file on load.
	return connection;
}

function Pool(connection_no) {
	this.pool = [];
	this.isAvailable = [];
	for (var i = 0; i < connection_no; i++) {
		this.pool.push(getConnection());
	}
	for (var j = 0; j < connection_no; j++) {
		this.isAvailable.push(true);
	}
}

Pool.prototype.get = function(useConnection)  {
	var cli;
	var connectionNumber;
	for (var i = 0; i < this.pool.length; i++) {
		if (this.isAvailable[i]) {
			cli = this.pool[i];
			// Enable Connection Pooling
			this.isAvailable[i] = false;
			// Disable Connection Pooling
			//			this.isAvailable[i] = true;
			connectionNumber = i;
			break;
		}
		if (i === this.pool.length - 1) {
			i = 0;
		}
	}

	// Enable Connection Pooling
	useConnection(connectionNumber, cli);
// Disable Connection Pooling
//	useConnection(connectionNumber, getConnection());
};

Pool.prototype.release = function(connectionNumber, connection)  {
	// Enable Connection Pooling
	this.isAvailable[connectionNumber] = true;
// Disable Connection Pooling
//	connection.end();
};

var connectionPool;

module.exports = {
	initializeConnectionPool : function(poolSize)  {
		connectionPool = new Pool(poolSize);
	},
	
	// Humble try to add caching to SQL queries. Seems right at the moment. But not exactly sure.
	
	fetchCacheData : function(selectFields, tableName, queryParameters, processResult)  {
		connectionPool.get(function(connectionNumber, connection)  {
			var queryString = "SELECT " + selectFields + " FROM " + tableName;
			if (queryParameters !== null) {
				queryString = "SELECT " + selectFields + " FROM " + tableName + " WHERE ?";
			}
			memoryCache.wrap(queryString + "_" + queryParameters, function(cacheCallback)  {
				var query = connection.query(queryString, queryParameters, function(error, rows)  {
					if (error) {
						throw error;
					} else {
						cacheCallback(rows);
					}
				});
		    }, processResult);
			connectionPool.release(connectionNumber, connection);
			logger.logQuery(query.sql);
		});
	},
	
	fetchData : function(selectFields, tableName, queryParameters, processResult)  {
		connectionPool.get(function(connectionNumber, connection)  {
			var queryString = "SELECT " + selectFields + " FROM " + tableName;
			if (queryParameters !== null) {
				queryString = "SELECT " + selectFields + " FROM " + tableName + " WHERE ?";
			}
			var query = connection.query(queryString, queryParameters, function(error, rows)  {
				if (error) {
					throw error;
				} else {
					processResult(rows);
				}
			});
			connectionPool.release(connectionNumber, connection);
			logger.logQuery(query.sql);
		});
	},

	executeQuery : function(sqlQuery, parameters, processResult)  {
		connectionPool.get(function(connectionNumber, connection)  {
			var query = connection.query(sqlQuery, parameters, function(error, rows)  {
				if (error) {
					throw error;
				} else {
					processResult(rows);
				}
			});
			connectionPool.release(connectionNumber, connection);
			logger.logQuery(query.sql);
		});
	},

	insertData : function(tableName, insertParameters, processInsertStatus)  {
		connectionPool.get(function(connectionNumber, connection)  {
			var queryString = "INSERT INTO " + tableName + " SET ?";
			var query = connection.query(queryString, insertParameters, function(error, rows)  {
				if (error) {
					throw error;
				} else {
					processInsertStatus(rows);
				}
			});
			connectionPool.release(connectionNumber, connection);
			logger.logQuery(query.sql);
		});
	},

	updateData : function(tableName, insertParameters, queryParameters, processUpdateStatus)  {
		connectionPool.get(function(connectionNumber, connection)  {
			var queryString = "UPDATE " + tableName + " SET ? WHERE ?";
			var query = connection.query(queryString, [ insertParameters, queryParameters ], function(error, rows)  {
				if (error) {
					throw error;
				} else {
					processUpdateStatus(rows);
				}
			});
			connectionPool.release(connectionNumber, connection);
			logger.logQuery(query.sql);
		});
	}
};