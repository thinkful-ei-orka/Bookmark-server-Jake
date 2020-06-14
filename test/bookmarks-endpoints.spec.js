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


    describe('GET /api/bookmarks', () => {
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
                        .get('/api/bookmarks')
                        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                        .expect(200)
                        .expect(res => {
                            expect(res.body[res.body.length - 1].title).to.eql(expectedBookmark.title);
                            expect(res.body[res.body.length - 1].about).to.eql(expectedBookmark.about);    
                        });
                });
            });
            it('responds with 200 and all of the bookmarks', () => {
                return supertest(app)
                    .get('/api/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, testArticles);
            });
        });
    });

    describe('GET /api/bookmarks/:id', () => {
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
                        .get(`/api/bookmarks/${maliciousBookmark.id}`)
                        .expect(200)
                        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
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
                    .get(`/api/bookmarks/${bookmarkId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, expectedBookmark);
            });
        });
    });
    describe('POST /api/bookmarks',() => {
        it('creates a bookmark, responding with 201 and the new bookmark', () => {
            const newBookmark = {
                title: 'test new title',
                url: 'http://test.com',
                about: 'Test new bookmark content',
                rating: '3'
            };
            return supertest(app)
                .post('/api/bookmarks')
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .send(newBookmark)
                .expect(res => {
                    expect(201);
                    expect(res.body.title).to.eql(newBookmark.title);
                    expect(res.body.url).to.eql(newBookmark.url);
                    expect(res.body.about).to.eql(newBookmark.about);
                    expect(res.body.rating).to.eql(newBookmark.rating);
                    expect(res.headers.location).to.eql(`/api/bookmarks/${res.body.id}`);
                })
                .then(postRes =>
                    supertest(app)
                        .get(`/api/bookmarks/${postRes.body.id}`)
                        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
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
                    .post('/api/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .send(newBookmark)
                    .expect(400, {
                        error: { message: `Missing '${field}' in request body` }
                    });
            });   
        });
        it('removes XSS attack content from response', () => {
            const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark();
            return supertest(app)
                .post('/api/bookmarks')
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .send(maliciousBookmark)
                .expect(201)
                .expect(res => {
                    expect(res.body.title).to.eql(expectedBookmark.title);
                    expect(res.body.about).to.eql(expectedBookmark.about);
                });
        });
    });

    describe('DELETE /api/bookmarks/:bookmark_id', () => {
        context('Given no articles', () => {
            it('responds with a 404', () => {
                const id = 123456;
                return supertest(app)
                    .delete(`/api/bookmarks/${id}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
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
                    .delete(`/api/bookmarks/${idToRemove}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(204)
                    .then(res => {
                        supertest(app)
                            .get('/api/bookmarks')
                            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                            .expect(expectedBookmarks);
                    });
            });
        });
    });
    describe(`PATCH /api/bookmarks/:id`, () => {
        context('Given no bookmarks', () => {
            it('responds with 404', () => {
                const bookmarkId = 123456;
                return supertest(app)
                    .patch(`/api/bookmarks/${bookmarkId}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(404, {error: {message: `Bookmark not found`}})
            });
        });
        context('Given there are bookmarks in the database', () => {
            const testBookmarks = makeBookmarksArray();

            beforeEach('insert bookmarks', () => {
                return db
                    .into('bookmarks')
                    .insert(testBookmarks);
            });

            it('responds with 204 and updates the bookmark', () => {
                const idToUpdate = 2;
                const updateBookmark = {
                    title: 'updated title',
                    url: 'http://new-url.com',
                    about: 'updated title about',
                    rating: '1'
                };
                const expectedBookmark = {
                    ...testBookmarks[idToUpdate - 1],
                    ...updateBookmark
                };
                return supertest(app)
                    .patch(`/api/bookmarks/${idToUpdate}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .send(updateBookmark)
                    .expect(204)
                    .then(res => {
                        supertest(app)
                        .get(`/api/bookmarks/${idToUpdate}`)
                        .expect(expectedBookmark);
                    });
            });
            it(`responds with 400 when no required fields supplied`, () => {
                const idToUpdate = 2
                return supertest(app)
                    .patch(`/api/bookmarks/${idToUpdate}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .send({irrelevantField: 'foo' })
                    .expect(400, {
                        error: {
                            message: `Request body must contain either title, url, about, or rating`
                        }
                    })
            });
            it('responds with 204 when updating only a subset of fields', () => {
                const idToUpdate = 2;
                const updateBookmark = {
                    title: 'updated title'
                }
                const expectedBookmark = {
                    ...testBookmarks[idToUpdate - 1],
                    ...updateBookmark
                }

                return supertest(app)
                    .patch(`/api/bookmarks/${idToUpdate}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .send({
                        ...updateBookmark,
                        fieldToIgnore: 'should not be in GET response'
                    })
                    .expect(204)
                    .then(res => {
                        supertest(app)
                            .get(`/api/bookmarks/${idToUpdate}`)
                            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                            .expect(expectedBookmark)
                    })
            })
        });
    });

});