const BookmarkService = {
    getAllBookmarks(knex) {
        return knex.select('*').from('bookmarks');
    },
    insertBookmark(knex, newBookmark) {
        return knex
            .insert(newBookmark)
            .into('bookmarks')
            .returning('*')
            .then(rows => {
                return rows[0];
            });
    },
    getById(knex, id) {
        return knex.from('bookmarks').select('*').where('id', id).first();
    },
    deleteBookmark(knex, id) {
        return knex('bookmarks')
            .where({ id })
            .delete();
    },
    updateBookmark(knex, id, updateBookmark) {
        return knex('bookmarks')
            .where({ id })
            .update(updateBookmark);
    },
};

module.exports = BookmarkService;