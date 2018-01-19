var emojiList = [{
            code:'smile',
            title:'笑脸',
            unicode:'1f604'
        },{
            code:'mask',
            title:'生病',
            unicode:'1f637'
        },{
            code:'joy',
            title:'破涕为笑',
            unicode:'1f602'
        },{
            code:'stuck_out_tongue_closed_eyes',
            title:'吐舌',
            unicode:'1f61d'}];

var disq = new iDisqus('comments', {
            forum: 'jimmyxu',
            site: 'xujimmy.com',
            api: 'https://api.xujimmy.com/disqus/api',
            mode: 2,
            badge: '博主',
            timeout: 3000,
            init: true,
            emoji_list: emojiList
        });
        disq.count();

