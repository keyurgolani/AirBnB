var cacheManager = require('cache-manager');
var properties = require('properties-reader')('properties.properties');

var memoryCache = cacheManager.caching({
	store : 'memory',
	max : properties.get('memcache.limit'),
	ttl : properties.get('memcache.ttl')	//Seconds
});

module.exports.fetchItem = (item_cache_key, item_id, cacheMissFetchLogic, processResult) => {
    var cacheKey = 'item_cache_key' + item_id;
    memoryCache.wrap(cacheKey, (cacheCallback) => {
        cacheMissFetchLogic(item_id, cacheCallback);
    }, processResult);
}