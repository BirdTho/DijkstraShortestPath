const ghpages = require('gh-pages');

ghpages.publish('dist', {
    dest: 'dijkstra'
}, function(err) { console.error(err); });