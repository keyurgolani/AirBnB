var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var autoLogger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var responseTime = require('response-time')
var mongo = require('mongodb');
//Reference for monk usage and documentation: https://automattic.github.io/monk/
var monk = require('monk');

var properties = require('properties-reader')('properties.properties');


// Config Logger
var logger = require(properties.get('paths.loggerPath'));

// MongoDB Config
var db = monk(properties.get('paths.mongoDBHosting')); // TODO: Fetch Properties like URL from Properties File on load!

// MySQL Config
var mySQL = require(properties.get('paths.daoPath'));

// Routing
var routes = require(properties.get('paths.routerPath'));

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(autoLogger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended : false
}));
app.use(cookieParser());
app.use(responseTime((req, res, time) => {
	logger.logResponseTime(req.url, time);
}));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/modules', express.static(path.join(__dirname, 'node_modules')));
app.use('/css', express.static(path.join(__dirname, 'public/stylesheets')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use('/images', express.static(path.join(__dirname, 'public/images')));
app.use('/ngjs', express.static(path.join(__dirname, 'public/angularjs')));

app.use(function(req, res, next) {
	mySQL.initializeConnectionPool(properties.get('mysql.poolSize')); // TODO: Load the pool size from properties file on load.
	req.db = db;
	next();
});

app.use('/', routes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
	var err = new Error('Not Found');
	err.status = 404;
	next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
	app.use(function(err, req, res, next) {
		res.status(err.status || 500);
		res.render('error', {
			message : err.message,
			error : err
		});
	});
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
	res.status(err.status || 500);
	res.render('error', {
		message : err.message,
		error : {}
	});
});


module.exports = app;