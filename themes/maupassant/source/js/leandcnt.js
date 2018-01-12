var visitorCount = function(app_id, app_key, obj_id) {
	AV.init({appId:app_id, appKey: app_key});
	var cnt=AV.Object.createWithoutData('total_pv',obj_id);
	cnt.increment('pv',1);
	cnt.save();
	cnt.fetch().then(function() {
		var pv = cnt.get('pv');
		$('.visitors').html(' | ' + pv);
	}, function(error) {console.log(error);});
}
