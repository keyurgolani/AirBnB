var cacheManager = require('cache-manager');

var memoryCache = cacheManager.caching({
	store : 'memory',
	max : 100,
	ttl : 10	//Seconds
});

module.exports.fetchItem = (item_cache_key, item_id, cacheMissFetchLogic, processResult) => {
    var cacheKey = 'user_' + id;
    memoryCache.wrap(cacheKey, (cacheCallback) => {
        cacheMissFetchLogic(item_id, cacheCallback);
    }, processResult);
}