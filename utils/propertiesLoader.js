var properties = require("properties");

module.exports = () => {
	properties.parse("properties.properties", {
		path : true
	}, (error, propertiesObject) => {
		if (error) return console.error(error);
		if(!propertiesObject.path) {
			propertiesObject.paths = {
					'loggerPath' : './utils/logger',
					'mongoDBHosting' : 'localhost:27017/AirBnB_Media',
					'daoPath' : './utils/dao',
					'routerPath' : './routes/index'
			};
		} else {
			if(!propertiesObject.paths.loggerPath) {
				propertiesObject.paths.loggerPath = './utils/logger';
			}
			if(!propertiesObject.paths.mongoDBHosting) {
				propertiesObject.paths.mongoDBHosting = 'localhost:27017/AirBnB_Media';
			}
			if(!propertiesObject.paths.daoPath) {
				propertiesObject.paths.daoPath = './utils/dao';
			}
			if(!propertiesObject.paths.routerPath) {
				propertiesObject.paths.routerPath = './routes/index';
			}
		}
		if(!propertiesObject.mysql) {
			propertiesObject.mysql = {
					'host' : 'localhost',
					'port' : 3306,
					'user' : 'root',
					'password' : 'admin',
					'db' : 'simple_market_place',
					'poolSize' : 50
			};
		} else {
			if(!propertiesObject.mysql.host) {
				propertiesObject.mysql.host = 'localhost';
			}
			if(!propertiesObject.mysql.port) {
				propertiesObject.mysql.port = 3306;
			}
			if(!propertiesObject.mysql.user) {
				propertiesObject.mysql.user = 'root';
			}
			if(!propertiesObject.mysql.password) {
				propertiesObject.mysql.password = 'admin';
			}
			if(!propertiesObject.mysql.db) {
				propertiesObject.mysql.db = 'simple_market_place';
			}
			if(!propertiesObject.mysql.poolSize) {
				propertiesObject.mysql.poolSize = 50;
			}
		}
		if(!propertiesObject.memcache) {
			propertiesObject.memcache = {
					'limit' : 100,
					'ttl' : 10
			};
		} else {
			if(!propertiesObject.memcache.limit) {
				propertiesObject.memcache.limit = 100;
			}
			if(!propertiesObject.memcache.ttl) {
				propertiesObject.memcache.ttl = 10;
			}
		}
		GLOBAL.properties = propertiesObject;
	});
}