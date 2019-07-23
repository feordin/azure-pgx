'use strict';

const express = require('express');
const fetch = require('node-fetch');
const redirectToHTTPS = require('express-http-to-https').redirectToHTTPS;

const AUTH_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6InU0T2ZORlBId0VCb3NIanRyYXVPYlY4NExuWSIsImtpZCI6InU0T2ZORlBId0VCb3NIanRyYXVPYlY4NExuWSJ9.eyJhdWQiOiJodHRwczovL2hhY2thdGhvbnNydnIuYXp1cmV3ZWJzaXRlcy5uZXQiLCJpc3MiOiJodHRwczovL3N0cy53aW5kb3dzLm5ldC80YTI0NjA3MS0wN2MzLTQ0ZDQtYTBlNi0wNjU3MDI0N2FjMGEvIiwiaWF0IjoxNTYzOTAwOTk0LCJuYmYiOjE1NjM5MDA5OTQsImV4cCI6MTU2MzkwNDg5NCwiYWNyIjoiMSIsImFpbyI6IjQyRmdZRkRyTDNoM1ZDcjV4VytwU05OWHR6bXJyZVBtOU12azc3em1uUzNJZkM1Q2F6SUEiLCJhbXIiOlsicHdkIl0sImFwcGlkIjoiOTJjNTgxYmEtMWM5Zi00YTMzLTgwZDYtNmFlYmMyYTBkYzc3IiwiYXBwaWRhY3IiOiIxIiwiaXBhZGRyIjoiMTkyLjkyLjIxNC4yMDYiLCJuYW1lIjoiaGFja2F0aG9uLWFkbWluIiwib2lkIjoiODZmNGY5YTEtMjZmMy00YzhmLTkxZjctNTg4MTBjNDBiZTYyIiwicm9sZXMiOlsiYWRtaW4iXSwic2NwIjoidXNlcl9pbXBlcnNvbmF0aW9uIiwic3ViIjoiWmIzQk5fUEFxN0FQNFNaUmxJU29ISzVnYk1KamtkRjNEeTlXTWsteWJ2cyIsInRpZCI6IjRhMjQ2MDcxLTA3YzMtNDRkNC1hMGU2LTA2NTcwMjQ3YWMwYSIsInVuaXF1ZV9uYW1lIjoiaGFja2F0aG9uLWFkbWluQHJlc29sdXRlb3BlbnNvdXJjZS5vbm1pY3Jvc29mdC5jb20iLCJ1cG4iOiJoYWNrYXRob24tYWRtaW5AcmVzb2x1dGVvcGVuc291cmNlLm9ubWljcm9zb2Z0LmNvbSIsInV0aSI6IkEtYk15ZEJ1cWttT2t6YjV2a1FnQUEiLCJ2ZXIiOiIxLjAifQ.KSFAB9us4i4v-tj4Cn-t3sYU2jwCSYPOzZ0R6_Lh7492WVoJxLsLia8CFPaicsetkaY8S5IkAwtxr8uZxpgLCjNZy50MipnxjNPYh2z7rocn7DP0LuF26ILXAvVjAZE4zuBlmhe79jVfaZDitaE2-tejcq8mCjWvEsIN-d-BRH8uVC2NjCwUbAeqS0v-afmEkBnwFzwrp7UwQ7uXFzRtu-goywvrnq4ulfF-JLS7Sdxl5FfhcnH1RWroMlhtg4i68rH_kdl0gVw8m-uEUQprGKHSqpirOAcq38UIBTYYTsNdObr4gag3TpFjbNrPXOFm-VHkxS3U5erTbJqHBhGUMQ.RNN2uQ25koIKoNnK6O4H31GEXDQLJT-FXaP9ZPgOfnRgzcoy1_5wOIXiqYEOyrhWg13qb-d_y9KQ0g60LVu1r_WaTJnZLVITc_sa85rAR_UO1keKd0QmIJYAKj0s8lQEWEFCi_WO5tmwx-L73wu7PXKLrKsdTEKmyUWOAfle4ev8B1TdV1cST36En9HYIg7LZ2GlxpJy3T-AaKprpgbCtMlL9TpgghqycZ-Nye5Pt7CGH3r0PsPBt0BbqUSCmHXLNPmd7mkpL4lD0R9_y-wyYZzaYEb9keWwoRHOm8sgym950LAqVVWGWDdIIUlj1xBOemtoZuZPQ2jvIDkusgCGvg';
const BASE_URL = 'https://hackathonsrvr.azurewebsites.net/';

/**
 * Gets the weather forecast from the Dark Sky API for the given location.
 *
 * @param {Request} req request object from Express.
 * @param {Response} resp response object from Express.
 */
function getPatients(req, resp) {
    const url = `${BASE_URL}Patients?given=${req.params.given}&family=${req.params.family}`;
    fetch(url, { headers: new Headers({ 'Authorization': 'Bearer ' + AUTH_TOKEN }) })
        .then((data) => {
            resp.json(data.json());
        }).catch((err) => {
            console.error('Error:', err.message);
            resp.json({
                error: {
                    message: 'There was an error',
                    error: err
                }
            });
        });
}

/**
 * Starts the Express server.
 *
 * @return {ExpressServer} instance of the Express server.
 */
function startServer() {
    const app = express();

    // Redirect HTTP to HTTPS,
    app.use(redirectToHTTPS([/localhost:(\d{4})/], [], 301));

    // Logging for each request
    app.use((req, resp, next) => {
        const now = new Date();
        const time = `${now.toLocaleDateString()} - ${now.toLocaleTimeString()}`;
        const path = `"${req.method} ${req.path}"`;
        const m = `${req.ip} - ${time} - ${path}`;
        // eslint-disable-next-line no-console
        console.log(m);
        next();
    });

    // Handle requests for the data
    //app.get('/forecast/:location', getForecast);
    //app.get('/forecast/', getForecast);
    app.get('/patient', getPatients);

    // Handle requests for static files
    app.use(express.static('public'));

    // Start the server
    return app.listen('8000', () => {
        // eslint-disable-next-line no-console
        console.log('Local DevServer Started on port 8000...');
    });
}

startServer();
