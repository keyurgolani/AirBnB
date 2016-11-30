var winston = require('winston');

var commonLogger = new winston.Logger({
	transports: [
		new winston.transports.File({
			level: 'silly',
			colorize: true,
			timestamp: true,
			filename: './logs/commonLogs.log',
			maxsize: 100000,
			maxFiles: 1000,
			logstash: true,
			tailable: true,
			zippedArchive: false,
			json: true,
			stringify: false,
			prettyPrint: true,
			depth: 5,
			humanReadableUnhandledException: true,
			showLevel: true,
			stderrLevels: ['error', 'debug']

		})
//		,
//		new winston.transports.Console({
//			level: 'debug',
//			handleExceptions: true,
//			json: true,
//			timestamp: true,
//			prettyPrint: true,
//			colorize: true
//		})		
	],
	exitOnError: false
});

//this is for logging of clicks on logging
var pageClickLog = new winston.Logger({
	transports: [
		new winston.transports.File({
			level: 'silly',
			colorize: true,
			timestamp: true,
			filename: './logs/pageClickLog.log',
			maxsize: 100000,
			maxFiles: 1000,
			logstash: true,
			tailable: true,
			zippedArchive: false,
			json: true,
			stringify: false,
			prettyPrint: true,
			depth: 5,
			humanReadableUnhandledException: true,
			showLevel: true,
			stderrLevels: ['error', 'debug']

		})
		,
		new winston.transports.Console({
			level: 'debug',
			handleExceptions: true,
			json: true,
			timestamp: true,
			prettyPrint: true,
			colorize: true
		})		
	],
	exitOnError: false
});

var areaLog = new winston.Logger({
	transports: [
		new winston.transports.File({
			level: 'silly',
			colorize: true,
			timestamp: true,
			filename: './logs/areaLog.log',
			maxsize: 100000,
			maxFiles: 1000,
			logstash: true,
			tailable: true,
			zippedArchive: false,
			json: true,
			stringify: false,
			prettyPrint: true,
			depth: 5,
			humanReadableUnhandledException: true,
			showLevel: true,
			stderrLevels: ['error', 'debug']

		})
		,
		new winston.transports.Console({
			level: 'debug',
			handleExceptions: true,
			json: true,
			timestamp: true,
			prettyPrint: true,
			colorize: true
		})		
	],
	exitOnError: false
});

var bidLog = new winston.Logger({
	transports: [
		new winston.transports.File({
			level: 'silly',
			colorize: true,
			timestamp: true,
			filename: './logs/bidLog.log',
			maxsize: 100000,
			maxFiles: 1000,
			logstash: true,
			tailable: true,
			zippedArchive: false,
			json: true,
			stringify: false,
			prettyPrint: true,
			depth: 5,
			humanReadableUnhandledException: true,
			showLevel: true,
			stderrLevels: ['error', 'debug']

		})
		,
		new winston.transports.Console({
			level: 'debug',
			handleExceptions: true,
			json: true,
			timestamp: true,
			prettyPrint: true,
			colorize: true
		})		
	],
	exitOnError: false
});

var responseTimeLogger = new winston.Logger({
	transports: [
		new winston.transports.File({
			level: 'silly',
			colorize: true,
			timestamp: true,
			filename: './logs/responseTimeLogs.log',
			maxsize: 100000,
			maxFiles: 1000,
			logstash: true,
			tailable: true,
			zippedArchive: false,
			json: true,
			stringify: false,
			prettyPrint: true,
			depth: 5,
			humanReadableUnhandledException: true,
			showLevel: true,
			stderrLevels: ['error', 'debug']

		})
//		,
//		new winston.transports.Console({
//			level: 'debug',
//			handleExceptions: true,
//			json: true,
//			timestamp: true,
//			prettyPrint: true,
//			colorize: true
//		})
	],
	exitOnError: false
});

var searchHistoryLogger = new winston.Logger({
	transports: [
		new winston.transports.File({
			level: 'silly',
			colorize: true,
			timestamp: true,
			filename: './logs/searchHistoryLogs.log',
			maxsize: 100000,
			maxFiles: 1000,
			logstash: true,
			tailable: true,
			zippedArchive: false,
			json: true,
			stringify: false,
			prettyPrint: true,
			depth: 5,
			humanReadableUnhandledException: true,
			showLevel: true,
			stderrLevels: ['error', 'debug']

		})
//		,
//		new winston.transports.Console({
//			level: 'debug',
//			handleExceptions: true,
//			json: true,
//			timestamp: true,
//			prettyPrint: true,
//			colorize: true
//		})
	],
	exitOnError: false
});

var placePreferencesLogger = new winston.Logger({
	transports: [
		new winston.transports.File({
			level: 'silly',
			colorize: true,
			timestamp: true,
			filename: './logs/placePreferenceLogs.log',
			maxsize: 100000,
			maxFiles: 1000,
			logstash: true,
			tailable: true,
			zippedArchive: false,
			json: true,
			stringify: false,
			prettyPrint: true,
			depth: 5,
			humanReadableUnhandledException: true,
			showLevel: true,
			stderrLevels: ['error', 'debug']

		})
//		,
//		new winston.transports.Console({
//			level: 'debug',
//			handleExceptions: true,
//			json: true,
//			timestamp: true,
//			prettyPrint: true,
//			colorize: true
//		})
	],
	exitOnError: false
});

var travellingTimeLogger = new winston.Logger({
	transports: [
		new winston.transports.File({
			level: 'silly',
			colorize: true,
			timestamp: true,
			filename: './logs/travellingTimeLogs.log',
			maxsize: 100000,
			maxFiles: 1000,
			logstash: true,
			tailable: true,
			zippedArchive: false,
			json: true,
			stringify: false,
			prettyPrint: true,
			depth: 5,
			humanReadableUnhandledException: true,
			showLevel: true,
			stderrLevels: ['error', 'debug']

		})
//		,
//		new winston.transports.Console({
//			level: 'debug',
//			handleExceptions: true,
//			json: true,
//			timestamp: true,
//			prettyPrint: true,
//			colorize: true
//		})
	],
	exitOnError: false
});

var hostingTimeLogger = new winston.Logger({
	transports: [
		new winston.transports.File({
			level: 'silly',
			colorize: true,
			timestamp: true,
			filename: './logs/hostingTimeLogs.log',
			maxsize: 100000,
			maxFiles: 1000,
			logstash: true,
			tailable: true,
			zippedArchive: false,
			json: true,
			stringify: false,
			prettyPrint: true,
			depth: 5,
			humanReadableUnhandledException: true,
			showLevel: true,
			stderrLevels: ['error', 'debug']

		})
//		,
//		new winston.transports.Console({
//			level: 'debug',
//			handleExceptions: true,
//			json: true,
//			timestamp: true,
//			prettyPrint: true,
//			colorize: true
//		})
//	
	],
	exitOnError: false
});

var biddingLogger = new winston.Logger({
	transports: [
		new winston.transports.File({
			level: 'silly',
			colorize: true,
			timestamp: true,
			filename: './logs/biddingLogs.log',
			maxsize: 100000,
			maxFiles: 1000,
			logstash: true,
			tailable: true,
			zippedArchive: false,
			json: true,
			stringify: false,
			prettyPrint: true,
			depth: 5,
			humanReadableUnhandledException: true,
			showLevel: true,
			stderrLevels: ['error', 'debug']

		})
//		,
//		new winston.transports.Console({
//			level: 'debug',
//			handleExceptions: true,
//			json: true,
//			timestamp: true,
//			prettyPrint: true,
//			colorize: true
//		})
	],
	exitOnError: false
});

var dataAccessLogger = new winston.Logger({
	transports: [
		new winston.transports.File({
			level: 'silly',
			colorize: true,
			timestamp: true,
			filename: './logs/dataAccessLogs.log',
			maxsize: 100000,
			maxFiles: 1000,
			logstash: true,
			tailable: true,
			zippedArchive: false,
			json: true,
			stringify: false,
			prettyPrint: true,
			depth: 5,
			humanReadableUnhandledException: true,
			showLevel: true,
			stderrLevels: ['error', 'debug']

		})
//		,
//		new winston.transports.Console({
//			level: 'debug',
//			handleExceptions: true,
//			json: true,
//			timestamp: true,
//			prettyPrint: true,
//			colorize: true
//		})
	],
	exitOnError: false
});

module.exports = {
	log : (logString) => {
		commonLogger.info('Common Log: ' + logString);
	},
	logResponseTime : (path, time, message) => {
		responseTimeLogger.info({
			'path' : path,
			'time' : time,
			'message' : message
		});
	},

	pageClickLogger : (listing_id, user_id) => {
	pageClickLog.log('info',{
		'listing_id' : listing_id,
		'user_id' : user_id
	});	
	// pageClickLog.info("listing_id: " + listing_id + " - " + "user_id: " + user_id);
	},

	areaLogger : (address,user_id) => {
	areaLog.log('info',{
		'address' : address,
		'user_id,' : user_id
	});	
	
	},

	bidLogger : (listing_id,user_id,bid_amount) => {
	bidLog.log('info',{		
		'listing_id' : listing_id,
		'user_id,' : user_id,
		'bid_amount':bid_amount
	});	
	
	},

	logQuery : (querySQL) => {
		dataAccessLogger.info('SQL: ' + querySQL);
	},
	//TODO: Pending
	stream: {
		write: (message, encoding) => {
			logger.info(message);
		}
	}, 
};