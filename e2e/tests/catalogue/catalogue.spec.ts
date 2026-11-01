import { expect, test } from '../../src/fixtures';
import { newBookData } from '../../src/support/data';

test.describe('Book catalogue', () => {
  test('BOOK-02: search finds books by title, ignoring letter case', async ({ app, arrange, session }) => {
    await session.signInAs(await arrange.member());
    const { token, books } = await arrange.catalogue(3);
    await app.books.open();

    await app.books.search(token.toUpperCase());

    expect((await app.books.getBookTitles()).sort()).toEqual(books.map((b) => b.title).sort());
  });

  test('BOOK-04: an administrator adds a book that appears with all copies available', async ({ app, seedAdmin, session }) => {
    const data = newBookData({ year: 2012, copiesTotal: 5 });
    await session.signInAs(seedAdmin);
    await app.books.open();

    const dialog = await app.books.openAddBookDialog();
    await dialog.fill(data);
    const toast = await dialog.save();
    await dialog.waitUntilClosed();
    await app.books.search(data.isbn);
    const card = app.books.getBookCard(data.title);

    expect(toast).toEqual({ type: 'success', text: 'Book added' });
    expect(await card.getAuthor()).toBe(data.author);
    expect(await card.getCategory()).toBe(data.category);
    expect(await card.getYear()).toBe(2012);
    expect(await card.getAvailability()).toEqual({ available: 5, total: 5 });
  });
});
