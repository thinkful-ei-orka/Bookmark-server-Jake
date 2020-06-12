function makeBookmarksArray() {
    const bookmarks =   [
        {
            'id': 1,
            'title': 'Google',
            'url': 'http://google.com',
            'about': 'An indie search engine startup',
            'rating': '4'
        },
        {
            'id': 2,
            'title': 'Fluffiest Cats in the World',
            'url': 'http://medium.com/bloggerx/fluffiest-cats-334',
            'about': 'The only list of fluffy cats online',
            'rating': '5'
        }
    ];
    return bookmarks;
}

function makeMaliciousBookmark() {
    const maliciousBookmark = {
      id: 911,
      url: 'How-to',
      rating: '3',
      title: 'Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;',
      about: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`
    }
    const expectedBookmark = {
      ...maliciousBookmark,
      title: 'Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;',
      about: `Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`
    }
    return {
      maliciousBookmark,
      expectedBookmark,
    }
  }
module.exports =  {
    makeBookmarksArray, 
    makeMaliciousBookmark
};

