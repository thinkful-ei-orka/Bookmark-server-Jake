const path = require('path');
const express = require('express');
const xss = require('xss');
const { v4: uuid } = require('uuid');
const logger = require('../logger');
const bookmarkRouter = express.Router();
const jsonParser = express.json();
const { bookmarks } = require('../store');
const BookmarkService = require('../bookmark-service');

const serializeBookmark = bookmark => ({
    id: bookmark.id,
    title: xss(bookmark.title),
    url: xss(bookmark.url),
    about: xss(bookmark.about),
    rating: bookmark.rating,
});


bookmarkRouter
    .route('/api/bookmarks')
    .get((req,res) => {
        const knexInstance = req.app.get('db');
        BookmarkService.getAllBookmarks(knexInstance)
            .then(myBookmarks => {
                res.json(myBookmarks.map(serializeBookmark));
            });
    })
    .post(jsonParser, (req, res, next) => {
        const { title, url, about, rating } = req.body;
        const newBookmark = { title, url, about, rating };
        for (const [key, value] of Object.entries(newBookmark)) {
            if (value == null) {
                return res.status(400).json({
                    error: { message: `Missing '${key}' in request body` }
                });
            }
        }
        BookmarkService.insertBookmark(
            req.app.get('db'),
            newBookmark
        )
            .then(bookmark => {
                res
                    .status(201)
                    .location(path.posix.join(req.originalUrl, `/${bookmark.id}`))
                    .json(serializeBookmark(bookmark));
            })
            .catch(next);
    });

bookmarkRouter
    .route('/api/bookmarks/:id')
    .all((req, res, next) => {
        BookmarkService.getById(
            req.app.get('db'),
            req.params.id
        )
            .then(bookmark => {
                if (!bookmark) {
                    return res.status(404).json({
                        error: { message: `Bookmark not found` }
                    });
                }
                res.bookmark = bookmark; // save the article for the next middleware
                next(); // don't forget to call next so the next middleware happens!
            })
            .catch(next);
    })
    .get((req, res, next) => {
        const { id } = req.params;
        BookmarkService.getById(req.app.get('db'), id)
            .then(bookmark => {
                if(!bookmark) {
                    logger.error(`Bookmark with id ${id} not found`);
                    return res.status(404).json({error: {message: 'Bookmark Not Found'}});
                }
                res.json({
                    id: res.bookmark.id,
                    title: xss(res.bookmark.title),
                    url: xss(res.bookmark.url), // sanitize title
                    about: xss(res.bookmark.about), // sanitize content
                    rating: xss(res.bookmark.rating),
                });
            });
    })
    .delete(jsonParser, (req, res, next) => {

        BookmarkService.deleteBookmark(req.app.get('db'), req.params.id)
            .then(() => {
                res.status(204).end();
            })
            .catch(next);
    })
    .patch(jsonParser, (req, res, next) => {
        const { title, url, about, rating } = req.body;
        const bookmarkToUpdate = { title, url, about, rating };
        const numberOfValues = Object.values(bookmarkToUpdate).filter(Boolean).length;
        if (numberOfValues === 0) {
            return res.status(400).json({
                error: {
                    message: 'Request body must contain either title, url, about, or rating'
                }
            });
        }
        BookmarkService.updateBookmark(
            req.app.get('db'), 
            req.params.id, 
            bookmarkToUpdate
        )
            .then(numRowsAffected => {
                res.status(204).end()
            })
            .catch(next);
    });
   
    
module.exports = bookmarkRouter;