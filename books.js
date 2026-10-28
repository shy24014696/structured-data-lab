'use strict';

const state = { books: [] };
const elements = {
  loading: document.getElementById('books-loading'),
  error: document.getElementById('books-error'),
  errorMessage: document.getElementById('books-error-message'),
  content: document.getElementById('books-content'),
  tableBody: document.getElementById('book-table-body'),
  search: document.getElementById('book-search'),
  sort: document.getElementById('book-sort'),
  results: document.getElementById('book-results')
};

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
});

function readText(parent, tagName) {
  const element = parent.getElementsByTagName(tagName)[0];
  if (!element || !element.textContent.trim()) {
    throw new Error(`Missing required <${tagName}> element.`);
  }
  return element.textContent.trim();
}

async function fetchBooks() {
  const response = await fetch('book.xml');
  if (!response.ok) {
    throw new Error(`Fetch error: ${response.status} ${response.statusText}`);
  }

  const xmlText = await response.text();
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
  if (xmlDoc.querySelector('parsererror')) {
    throw new Error('The XML document is not well-formed.');
  }

  return Array.from(xmlDoc.getElementsByTagName('book')).map((book) => {
    const priceElement = book.getElementsByTagName('price')[0];
    return {
      id: book.getAttribute('id') || 'Unknown ID',
      title: readText(book, 'title'),
      author: readText(book, 'author'),
      price: Number(readText(book, 'price')),
      currency: priceElement.getAttribute('currency') || 'USD'
    };
  });
}

function updateStatistics() {
  const authors = new Set(state.books.map((book) => book.author));
  const average = state.books.reduce((sum, book) => sum + book.price, 0) / state.books.length;
  document.getElementById('book-count').textContent = state.books.length;
  document.getElementById('author-count').textContent = authors.size;
  document.getElementById('average-price').textContent = currency.format(average);
}

function appendCell(row, text, className = '') {
  const cell = document.createElement('td');
  cell.textContent = text;
  if (className) cell.className = className;
  row.appendChild(cell);
}

function renderBooks() {
  const query = elements.search.value.trim().toLowerCase();
  const sortBy = elements.sort.value;
  const visibleBooks = state.books
    .filter((book) => `${book.id} ${book.title} ${book.author}`.toLowerCase().includes(query))
    .sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'author') return a.author.localeCompare(b.author);
      if (sortBy === 'price-low') return a.price - b.price;
      if (sortBy === 'price-high') return b.price - a.price;
      return a.id.localeCompare(b.id);
    });

  elements.tableBody.replaceChildren();

  visibleBooks.forEach((book) => {
    const row = document.createElement('tr');
    appendCell(row, book.id, 'book-id');
    appendCell(row, book.title, 'book-title');
    appendCell(row, book.author, 'book-author');
    appendCell(row, currency.format(book.price), 'book-price');
    elements.tableBody.appendChild(row);
  });

  if (visibleBooks.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 4;
    cell.className = 'empty-state';
    cell.textContent = 'No books match your search.';
    row.appendChild(cell);
    elements.tableBody.appendChild(row);
  }

  elements.results.textContent = `Showing ${visibleBooks.length} of ${state.books.length} books`;
}

async function loadBooks() {
  elements.loading.hidden = false;
  elements.error.hidden = true;
  elements.content.hidden = true;
  elements.search.disabled = true;
  elements.sort.disabled = true;

  try {
    state.books = await fetchBooks();
    if (state.books.length === 0) throw new Error('The catalogue contains no books.');
    updateStatistics();
    renderBooks();
    elements.content.hidden = false;
    elements.search.disabled = false;
    elements.sort.disabled = false;
  } catch (error) {
    elements.errorMessage.textContent = error.message;
    elements.error.hidden = false;
  } finally {
    elements.loading.hidden = true;
  }
}

elements.search.addEventListener('input', renderBooks);
elements.sort.addEventListener('change', renderBooks);
document.getElementById('books-retry').addEventListener('click', loadBooks);
loadBooks();
