var cacheManager = require('cache-manager');
var redisStore = require('cache-manager-redis');

var properties = require('properties-reader')('properties.properties');

var redisCache = cacheManager.caching({
	store : redisStore,
	host : properties.get('rediscache.host'),
	port : properties.get('rediscache.port'),
//	auth_pass : properties.get('rediscache.password'),
	db : properties.get('rediscache.db'),
	ttl : properties.get('rediscache.ttl') //Seconds
});
var memoryCache = cacheManager.caching({
	store : 'memory',
	max : properties.get('memcache.limit'),
	ttl : properties.get('memcache.ttl') //Seconds
});

var multiCache = cacheManager.multiCaching([ memoryCache, redisCache ]);

module.exports.fetchItem = (item_cache_key, item_id, cacheMissFetchLogic, processResult) => {
	var cacheKey = item_cache_key + "_" + item_id;
	multiCache.wrap(cacheKey, (cacheCallback) => {
		cacheMissFetchLogic(item_id, cacheCallback);
	}, processResult);
}