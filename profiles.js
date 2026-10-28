'use strict';

const state = { profiles: [] };
const elements = {
  loading: document.getElementById('profiles-loading'),
  error: document.getElementById('profiles-error'),
  errorMessage: document.getElementById('profiles-error-message'),
  content: document.getElementById('profiles-content'),
  grid: document.getElementById('profile-grid'),
  search: document.getElementById('profile-search'),
  filter: document.getElementById('profile-filter'),
  results: document.getElementById('profile-results')
};

async function fetchProfiles() {
  const response = await fetch('userProfiles.json');
  if (!response.ok) {
    throw new Error(`Fetch error: ${response.status} ${response.statusText}`);
  }

  const profiles = await response.json();
  if (!Array.isArray(profiles)) {
    throw new Error('Expected the JSON document to contain an array of profiles.');
  }
  return profiles;
}

function updateStatistics() {
  document.getElementById('profile-count').textContent = state.profiles.length;
  document.getElementById('subscription-count').textContent = state.profiles.filter(
    (profile) => profile.preferences.subscription
  ).length;
  document.getElementById('notification-count').textContent = state.profiles.filter(
    (profile) => profile.preferences.notifications
  ).length;
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function formatDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
}

function createDetail(label, value) {
  const detail = createElement('div', 'profile-detail');
  detail.append(
    createElement('span', 'detail-label', label),
    createElement('span', 'detail-value', value)
  );
  return detail;
}

function createPreference(label, value, active) {
  const preference = createElement('div', 'preference-item');
  const labelElement = createElement('span', 'preference-label', label);
  const valueElement = createElement('span', `preference-value ${active ? 'is-active' : ''}`, value);
  preference.append(labelElement, valueElement);
  return preference;
}

function createProfileCard(profile, index) {
  const card = createElement('article', 'profile-card');
  card.style.setProperty('--card-index', index);

  const header = createElement('div', 'profile-card-header');
  const avatar = createElement(
    'div',
    `avatar avatar-${(index % 4) + 1}`,
    `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`
  );
  avatar.setAttribute('aria-hidden', 'true');
  const identity = createElement('div', 'profile-identity');
  identity.append(
    createElement('h3', '', `${profile.firstName} ${profile.lastName}`),
    createElement('a', 'profile-email', profile.email)
  );
  identity.querySelector('a').href = `mailto:${profile.email}`;
  header.append(avatar, identity);

  const details = createElement('div', 'profile-details');
  details.append(
    createDetail('DATE OF BIRTH', formatDate(profile.dateOfBirth)),
    createDetail('LOCATION', `${profile.address.city}, ${profile.address.state}`),
    createDetail('STREET', profile.address.street),
    createDetail('ZIP CODE', profile.address.zipCode)
  );

  const preferences = createElement('div', 'preferences');
  preferences.append(createElement('h4', '', 'Preferences'));
  const preferenceGrid = createElement('div', 'preference-grid');
  preferenceGrid.append(
    createPreference('Theme', profile.preferences.theme, true),
    createPreference('Language', profile.preferences.language, true),
    createPreference('Notifications', profile.preferences.notifications ? 'On' : 'Off', profile.preferences.notifications),
    createPreference('Newsletter', profile.preferences.subscription ? 'Subscribed' : 'Not subscribed', profile.preferences.subscription)
  );
  preferences.appendChild(preferenceGrid);

  card.append(header, details, preferences);
  return card;
}

function renderProfiles() {
  const query = elements.search.value.trim().toLowerCase();
  const filter = elements.filter.value;
  const visibleProfiles = state.profiles.filter((profile) => {
    const matchesQuery = `${profile.firstName} ${profile.lastName} ${profile.email} ${profile.address.city}`
      .toLowerCase()
      .includes(query);
    const matchesFilter = filter === 'all'
      || (filter === 'subscribed' && profile.preferences.subscription)
      || (filter === 'notifications' && profile.preferences.notifications);
    return matchesQuery && matchesFilter;
  });

  elements.grid.replaceChildren();
  visibleProfiles.forEach((profile, index) => {
    elements.grid.appendChild(createProfileCard(profile, index));
  });

  if (visibleProfiles.length === 0) {
    elements.grid.appendChild(createElement('p', 'empty-state', 'No profiles match your search and filter.'));
  }
  elements.results.textContent = `Showing ${visibleProfiles.length} of ${state.profiles.length} profiles`;
}

async function loadProfiles() {
  elements.loading.hidden = false;
  elements.error.hidden = true;
  elements.content.hidden = true;
  elements.search.disabled = true;
  elements.filter.disabled = true;

  try {
    state.profiles = await fetchProfiles();
    if (state.profiles.length === 0) throw new Error('The JSON document contains no profiles.');
    updateStatistics();
    renderProfiles();
    elements.content.hidden = false;
    elements.search.disabled = false;
    elements.filter.disabled = false;
  } catch (error) {
    elements.errorMessage.textContent = error.message;
    elements.error.hidden = false;
  } finally {
    elements.loading.hidden = true;
  }
}

elements.search.addEventListener('input', renderProfiles);
elements.filter.addEventListener('change', renderProfiles);
document.getElementById('profiles-retry').addEventListener('click', loadProfiles);
loadProfiles();
