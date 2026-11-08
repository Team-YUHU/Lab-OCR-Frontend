// Vials with no category (category_id is NULL) are shown as this. It isn't a row in
// the categories table, so it can't be deleted, and the name is reserved.
export const UNCATEGORIZED_NAME = 'Uncategorized';

/** Stands in for a category id in URLs, e.g. /api/v1/vials?categoryId=uncategorized */
export const UNCATEGORIZED_ID = 'uncategorized';
