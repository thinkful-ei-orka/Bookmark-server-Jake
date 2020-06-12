const { expect } = require('chai');
const knex = require('knex');
const app = require('../src/app');
const { makeBookmarksArray, makeMaliciousBookmark } = require('./bookmarks.fixtures');
describe('Bookmarks Endpoints', function() {
    let db;

    before('make knex instance', () => {
        db = knex({
            client: 'pg',
            connection: process.env.TEST_DB_URL,
        });
        app.set('db', db);
    });


    after('disconnect from db', () => db.destroy());

    before('clean the table', () => db('bookmarks').truncate());

    afterEach('cleanup', () => db('bookmarks').truncate());


    describe('GET /bookmarks', () => {
        context('Given there are bookmarks in the database', () => {
            const testArticles = makeBookmarksArray();

            beforeEach('insert bookmarks', () => {
                return db
                    .into('bookmarks')
                    .insert(testArticles);
            });

            context('Given an XSS attack bookmark', () => {
                const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark();

                beforeEach('insert malicious bookmark', () => {
                    return db
                        .into('bookmarks')
                        .insert([ maliciousBookmark ]);
                });

                it('removes XSS attack content', () => {
                    return supertest(app)
                        .get('/bookmarks')
                        .expect(200)
                        .expect(res => {
                            expect(res.body[res.body.length - 1].title).to.eql(expectedBookmark.title);
                            expect(res.body[res.body.length - 1].about).to.eql(expectedBookmark.about);    
                        });
                });
            });
            it('responds with 200 and all of the bookmarks', () => {
                return supertest(app)
                    .get('/bookmarks')
                    .expect(200, testArticles);
            });
        });
    });

    describe('GET /bookmark/:id', () => {
        context('Given there are bookmarks in the database', () => {
            const testBookmarks = makeBookmarksArray();

            beforeEach('insert bookmarks', () => {
                return db
                    .into('bookmarks')
                    .insert(testBookmarks);
            });
            context('Given an XSS attack bookmark', () => {
                const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark(); 
                
                beforeEach('insert malicious bookmark', () => {
                    return db
                        .into('bookmarks')
                        .insert([ maliciousBookmark ]);
                });
                
                it('removes XSS attack content', () => {
                    return supertest(app)
                        .get(`/bookmark/${maliciousBookmark.id}`)
                        .expect(200)
                        .expect(res => {
                            expect(res.body.title).to.eql(expectedBookmark.title);
                            expect(res.body.about).to.eql(expectedBookmark.about);
                        });
                });
            });
            it('responds with 200 and the specified bookmark', () => {
                const bookmarkId = 1;
                const expectedBookmark = testBookmarks[bookmarkId - 1];
                return supertest(app)
                    .get(`/bookmark/${bookmarkId}`)
                    .expect(200, expectedBookmark);
            });
        });
    });
    describe('POST /bookmarks',() => {
        it('creates a bookmark, responding with 201 and the new bookmark', () => {
            const newBookmark = {
                title: 'test new title',
                url: 'http://test.com',
                about: 'Test new bookmark content',
                rating: '3'
            };
            return supertest(app)
                .post('/bookmarks')
                .send(newBookmark)
                .expect(res => {
                    expect(201);
                    expect(res.body.title).to.eql(newBookmark.title);
                    expect(res.body.url).to.eql(newBookmark.url);
                    expect(res.body.about).to.eql(newBookmark.about);
                    expect(res.body.rating).to.eql(newBookmark.rating);
                    expect(res.headers.location).to.eql(`/bookmark/${res.body.id}`);
                })
                .then(postRes =>
                    supertest(app)
                        .get(`/bookmark/${postRes.body.id}`)
                        .expect(postRes.body)
                );

        });

        const requiredFields = ['title', 'url', 'about','rating'];

        requiredFields.forEach(field => {
            const newBookmark = {
                title: 'Test new article',
                url: 'http://google.com',
                about: 'Test new article content...',
                rating: '3'
            };

            it(`responds with 400 and an error message when the '${field}' is missing`, () => {
                delete newBookmark[field];

                return supertest(app)
                    .post('/bookmarks')
                    .send(newBookmark)
                    .expect(400, {
                        error: { message: `Missing '${field}' in request body` }
                    });
            });   
        });
        it('removes XSS attack content from response', () => {
            const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark();
            return supertest(app)
                .post('/bookmarks')
                .send(maliciousBookmark)
                .expect(201)
                .expect(res => {
                    expect(res.body.title).to.eql(expectedBookmark.title);
                    expect(res.body.about).to.eql(expectedBookmark.about);
                });
        });
    });

    describe('DELETE /bookmark/:bookmark_id', () => {
        context('Given no articles', () => {
            it('responds with a 404', () => {
                const id = 123456;
                return supertest(app)
                    .delete(`/bookmark/${id}`)
                    .expect(404, { error: {message: `Bookmark not found`}})
            });
        });
        context('Given there are bookmarks in the database', () => {
            const testBookmarks = makeBookmarksArray();
            beforeEach('insert bookmarks', () => {
                return db 
                    .into('bookmarks')
                    .insert(testBookmarks);
            });
            it('responds with 204 and removes the bookmark', () => {
                const idToRemove = 2;
                const expectedBookmarks = testBookmarks.filter(bookmark => bookmark.id !== idToRemove);
                return supertest(app)
                    .delete(`/bookmark/${idToRemove}`)
                    .expect(204)
                    .then(res => {
                        supertest(app)
                            .get('/bookmarks')
                            .expect(expectedBookmarks);
                    });
            });
        });
    });

});