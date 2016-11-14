var mysql = require('mysql');
var logger = require("../utils/logger");
var properties = require('properties-reader')('properties.properties');

// Transactions will be useful for Cart Checkout Query Execution: https://github.com/mysqljs/mysql#transactions

/*function getConnection() {
	var connection = mysql.createConnection({
		host : properties.get('mysql.host'),
		user : properties.get('mysql.user'),
		password : properties.get('mysql.password'),
		database : properties.get('mysql.db'),
		port : properties.get('mysql.port')
	}); // TODO: Load the database details and other parameters from properties file on load.
	return connection;
}*/

function getConnection(){
	var connection = mysql.createConnection({
	    host     : 'localhost',
	    user     : 'root',
	    password : 'welcome123#',
	    database : 'airbnb',
	    port	 : 3306
	});
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

Pool.prototype.get = (useConnection) => {
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

Pool.prototype.release = (connectionNumber, connection) => {
	// Enable Connection Pooling
	this.isAvailable[connectionNumber] = true;
// Disable Connection Pooling
//	connection.end();
};

var connectionPool;

module.exports = {
	initializeConnectionPool : (poolSize) => {
		connectionPool = new Pool(poolSize);
	},
	
	// Humble try to add caching to SQL queries. Seems right at the moment. But not exactly sure.
	
	fetchCacheData : (selectFields, tableName, queryParameters, processResult) => {
		connectionPool.get((connectionNumber, connection) => {
			var queryString = "SELECT " + selectFields + " FROM " + tableName;
			if (queryParameters !== null) {
				queryString = "SELECT " + selectFields + " FROM " + tableName + " WHERE ?";
			}
			memoryCache.wrap(queryString + "_" + queryParameters, (cacheCallback) => {
				var query = connection.query(queryString, queryParameters, (error, rows) => {
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
	
	fetchData : (selectFields, tableName, queryParameters, processResult) => {
		connectionPool.get((connectionNumber, connection) => {
			var queryString = "SELECT " + selectFields + " FROM " + tableName;
			if (queryParameters !== null) {
				queryString = "SELECT " + selectFields + " FROM " + tableName + " WHERE ?";
			}
			var query = connection.query(queryString, queryParameters, (error, rows) => {
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

	executeQuery : (sqlQuery, parameters, processResult) => {
		connectionPool.get((connectionNumber, connection) => {
			var query = connection.query(sqlQuery, parameters, (error, rows) => {
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

	insertData : (tableName, insertParameters, processInsertStatus) => {
		connectionPool.get((connectionNumber, connection) => {
			var queryString = "INSERT INTO " + tableName + " SET ?";
			var query = connection.query(queryString, insertParameters, (error, rows) => {
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

	updateData : (tableName, insertParameters, queryParameters, processUpdateStatus) => {
		connectionPool.get((connectionNumber, connection) => {
			var queryString = "UPDATE " + tableName + " SET ? WHERE ?";
			var query = connection.query(queryString, [ insertParameters, queryParameters ], (error, rows) => {
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

//normal mysql connection
function fetchData1(callback, sqlQuery,JSON_args) {
	
	console.log("here in fecth!!");
	var connection = getConnection();
	connection.query(sqlQuery,JSON_args, function(err, rows, fields) {
		if (err) {
			console.log("ERROR: " + err.message);
		} else { // return err or result
			console.log("DB Results:" + rows);
			callback(err, rows);
		}
	});
//	logger.log('info',query+JSON_args);
	console.log("\nConnection closed..");
	connection.end();
}

module.exports.fetchData1=fetchData1;