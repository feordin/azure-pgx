/*
 * @license
 * Your First PWA Codelab (https://g.co/codelabs/pwa)
 * Copyright 2019 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License
 */
'use strict';

const genscriptApp = {
    selectedPatients: {},
    addDialogContainer: document.getElementById('addDialogContainer'),
};

const AUTH_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6InU0T2ZORlBId0VCb3NIanRyYXVPYlY4NExuWSIsImtpZCI6InU0T2ZORlBId0VCb3NIanRyYXVPYlY4NExuWSJ9.eyJhdWQiOiJodHRwczovL2hhY2thdGhvbnNydnIuYXp1cmV3ZWJzaXRlcy5uZXQiLCJpc3MiOiJodHRwczovL3N0cy53aW5kb3dzLm5ldC80YTI0NjA3MS0wN2MzLTQ0ZDQtYTBlNi0wNjU3MDI0N2FjMGEvIiwiaWF0IjoxNTYzODMyNTU3LCJuYmYiOjE1NjM4MzI1NTcsImV4cCI6MTU2MzgzNjQ1NywiYWNyIjoiMSIsImFpbyI6IjQyRmdZREEvOStGZlA4OHBzVVZLRzlUampWdGVLN3g3M3FHOGROSEpGWFpsQmY4TS9Kc0EiLCJhbXIiOlsicHdkIl0sImFwcGlkIjoiOTJjNTgxYmEtMWM5Zi00YTMzLTgwZDYtNmFlYmMyYTBkYzc3IiwiYXBwaWRhY3IiOiIxIiwiaXBhZGRyIjoiMTkyLjkyLjIxNC4yMDYiLCJuYW1lIjoiaGFja2F0aG9uLWFkbWluIiwib2lkIjoiODZmNGY5YTEtMjZmMy00YzhmLTkxZjctNTg4MTBjNDBiZTYyIiwicm9sZXMiOlsiYWRtaW4iXSwic2NwIjoidXNlcl9pbXBlcnNvbmF0aW9uIiwic3ViIjoiWmIzQk5fUEFxN0FQNFNaUmxJU29ISzVnYk1KamtkRjNEeTlXTWsteWJ2cyIsInRpZCI6IjRhMjQ2MDcxLTA3YzMtNDRkNC1hMGU2LTA2NTcwMjQ3YWMwYSIsInVuaXF1ZV9uYW1lIjoiaGFja2F0aG9uLWFkbWluQHJlc29sdXRlb3BlbnNvdXJjZS5vbm1pY3Jvc29mdC5jb20iLCJ1cG4iOiJoYWNrYXRob24tYWRtaW5AcmVzb2x1dGVvcGVuc291cmNlLm9ubWljcm9zb2Z0LmNvbSIsInV0aSI6Ilo5Zm1MdE9GakUyUGdPOGJDUVlBQUEiLCJ2ZXIiOiIxLjAifQ.Kd2hWqwGMFeLuKtu9VgmntmC7ITK4k-fNvPlmSUBGfr2wImpM13qkDWaZQkPDmBGHmJf_qeyHj-7PTTYokTRaUGaG5DvIrFzfJOiMvSeElinFmOfDC6xtaEnu-V9ijGQ0ZaczFe5TYMrJ0mZ-njVS4KYh7wQpn4HduRZS5RNf8tY-SBHyjzyueYihjrJQ2dJco3fXOHvwqjp_8QxUvYGKkjh12iuVQLMr_HwnttE7e5TJWT32ffAn6qrgHd1vyA6U7Sxno-TReuYqXJ4BPSl3J2IbDijHHZKAEeJG7zmrIRvdLz7Ib7WLPx24b9pdmyQgjaBnvzxGfG8hwagf4zR8A.RNN2uQ25koIKoNnK6O4H31GEXDQLJT-FXaP9ZPgOfnRgzcoy1_5wOIXiqYEOyrhWg13qb-d_y9KQ0g60LVu1r_WaTJnZLVITc_sa85rAR_UO1keKd0QmIJYAKj0s8lQEWEFCi_WO5tmwx-L73wu7PXKLrKsdTEKmyUWOAfle4ev8B1TdV1cST36En9HYIg7LZ2GlxpJy3T-AaKprpgbCtMlL9TpgghqycZ-Nye5Pt7CGH3r0PsPBt0BbqUSCmHXLNPmd7mkpL4lD0R9_y-wyYZzaYEb9keWwoRHOm8sgym950LAqVVWGWDdIIUlj1xBOemtoZuZPQ2jvIDkusgCGvg';
const BASE_URL = 'https://hackathonsrvr.azurewebsites.net';

/**
 * Toggles the visibility of the add location dialog box.
 */
function toggleAddDialog() {
    genscriptApp.addDialogContainer.classList.toggle('visible');
}

/**
 * Event handler for .remove-city, removes a location from the list.
 *
 * @param {Event} evt
 */
function removePatient(evt) {
    const parent = evt.srcElement.parentElement;
    parent.setAttribute('hidden', true);
    if (genscriptApp.selectedPatients[parent.id]) {
        delete genscriptApp.selectedPatients[parent.id];
        saveLocationList(genscriptApp.selectedPatients);
    }

    evt.stopPropagation();
}

function selectPatient(id) {
    if (genscriptApp.selectedPatients[id]) {
        document.getElementById('patientName').textContent = genscriptApp.selectedPatients[id].name;
        hideMenu();
        return true;
    }
    return false;
}

function clickPatient(evt) {
    if (!selectPatient(evt.srcElement.id)) {
        selectPatient(evt.srcElement.parent.id);
    }
}

/**
 * Get's the latest forecast data from the network.
 *
 * @param {string} coords Location object to.
 * @return {Object} The weather forecast, if the request fails, return null.
 */
function getPatientFromNetwork(name) {
    return new Promise((resolve) => {
        resolve({
            'id': Math.floor(Math.random() * 1000000),
            'name': name
        });
    });
    /*
    const nameParts = name.split(' ');
    return fetch(`/patient?family=${nameParts[1]}&given=${nameParts[0]}`)
        .then((response) => {
            return response.json();
        })
        .then((data) => {
            return data.entry[0].resource;
        })
        .catch(() => {
            return null;
        });
        */
}

/**
 * Get's the HTML element for the weather forecast, or clones the template
 * and adds it to the DOM if we're adding a new item.
 *
 * @param {Object} location Location object
 * @return {Element} The element for the weather forecast.
 */
function getPatientCard(id, name) {
    const card = document.getElementById(id);
    if (card) {
        return card;
    }
    const newCard = document.getElementById('patientTemplate').cloneNode(true);
    newCard.querySelector('.menu-patient-name').textContent = name;
    newCard.setAttribute('id', id);
    newCard.addEventListener('click', clickPatient);
    newCard.querySelector('.menu-remove-patient')
        .addEventListener('click', removePatient);
    document.getElementById('patientList').appendChild(newCard);
    newCard.removeAttribute('hidden');
    return newCard;
}

/**
 * Event handler for butDialogAdd, adds the selected location to the list.
 */
function addPatient() {
    const input = document.getElementById('inputAddPatient');
    const fullName = input.value;

    getPatientFromNetwork(fullName).then((data) => {
        if (data) {
            const patientId = data.id;
            getPatientCard(patientId, fullName);
            // Save the updated list of selected cities.
            genscriptApp.selectedPatients[patientId] = data;
            savePatientList(genscriptApp.selectedPatients);
            setTimeout(() => {
                selectPatient(patientId);
            }, 500);
        }
    });
}

function searchPGKB() {
    const searchString = document.getElementById('inputSearch').value;
    // add call to PharmGKB api

}

/**
 * Saves the list of locations.
 *
 * @param {Object} locations The list of locations to save.
 */
function savePatientList(patientList) {
    const data = JSON.stringify(patientList);
    localStorage.setItem('patientList', data);
}

/**
 * Loads the list of saved location.
 *
 * @return {Array}
 */
function loadPatientList() {
    let patientList = localStorage.getItem('patientList');
    if (patientList) {
        try {
            patientList = JSON.parse(patientList);
        } catch (ex) {
            patientList = {};
        }
    }

    return patientList;
}

function showMenu() {
    document.getElementById('menu').classList.add('slide-left');
}

function hideMenu() {
    document.getElementById('menu').classList.remove('slide-left');
}

function hideAbout() {
    document.getElementById('main').classList.add('slide-up');
}

/**
 * Initialize the app, gets the list of locations from local storage, then
 * renders the initial data.
 */
function init() {

    document.getElementById('butShowMenu').addEventListener('click', showMenu);
    document.getElementById('butAddPatient').addEventListener('click', addPatient);
    document.getElementById('inputSearch').addEventListener('click', hideAbout);
    document.getElementById('btnSearch').addEventListener('click', searchPGKB);
}

init();
